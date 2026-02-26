/**
 * Sync job: fetch ETF data from FMP + btcetfdata, merge, and save to data/etfs.json.
 * Prioritizes: crypto weight, exposure, CUSIP, digital asset indicator.
 * Runs hourly via cron or: npx tsx sync.ts  or  POST /api/sync
 */
import 'dotenv/config'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import type { CryptoEtfRow } from '../src/types/etf'
import { CRYPTO_ASSET_INDICATORS } from '../src/types/etf'
import {
  getCryptoEtfList,
  getEtfInfo,
  getEtfHoldings,
  getEtfCountryWeightings,
  getCusipBySymbol
} from './fmp'
import { getBtcEtfHoldings } from './btcetfdata'
import { CRYPTO_ETF_KNOWLEDGE } from '../src/data/cryptoEtfKnowledge'
import { CUSIP_OVERRIDES } from '../src/data/cusipOverrides'
import { SPONSORED_ETFS } from '../src/data/sponsoredEtfs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, 'data')
const OUTPUT_PATH = join(DATA_DIR, 'etfs.json')

// FMP Starter: 300 calls/min. Throttle: delay between each ETF batch (4 parallel calls). 900ms ≈ 220/min.
const REQUEST_DELAY_MS = 900
const MAX_ETFS = 50

export function inferCryptoExposure(name: string): string {
  const n = (name || '').toLowerCase()
  const exposures: string[] = []
  if (n.includes('bitcoin') || n.includes('btc')) exposures.push('BTC')
  if (n.includes('ethereum') || n.includes('eth')) exposures.push('ETH')
  if (n.includes('crypto') || n.includes('digital asset')) exposures.push('Various')
  if (n.includes('blockchain') && !exposures.length) exposures.push('Blockchain equities')
  return exposures.length ? exposures.join(', ') : '—'
}

function isCryptoHolding(name: string, symbol?: string): boolean {
  const text = `${(name || '').toLowerCase()} ${(symbol || '').toLowerCase()}`
  return CRYPTO_ASSET_INDICATORS.some((ind: string) => text.includes(ind))
}

function calcCryptoWeight(holdings: { name?: string; symbol?: string; weightPercentage?: number; asset?: string }[]): number {
  return holdings
    .filter((h) => isCryptoHolding(h.name ?? h.asset ?? '', h.symbol))
    .reduce((sum, h) => sum + (h.weightPercentage ?? 0), 0)
}

/** Get crypto weight % for an ETF: from holdings, or knowledge fallback. Used by ETF detail API. */
export function getCryptoWeightForSymbol(
  symbol: string,
  holdings: { name?: string; symbol?: string; asset?: string; weightPercentage?: number }[]
): number {
  const fromHoldings = calcCryptoWeight(holdings)
  if (fromHoldings > 0) return Math.round(fromHoldings * 100) / 100
  const knowledge = CRYPTO_ETF_KNOWLEDGE[symbol as keyof typeof CRYPTO_ETF_KNOWLEDGE]
  return knowledge?.cryptoWeight ?? 0
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/** Treat '—' as missing so fallbacks (CUSIP_OVERRIDES, etc.) can apply */
export function validCusip(c: string | undefined): string | null {
  return c && c !== '—' ? c : null
}

async function getExternalCusipMap(): Promise<Record<string, string>> {
  const url = process.env.CUSIP_DATA_URL
  if (!url) return {}
  try {
    const res = await fetch(url)
    if (!res.ok) return {}
    const data = (await res.json()) as Record<string, unknown>
    if (!data || typeof data !== 'object') return {}
    return Object.fromEntries(
      Object.entries(data).filter(
        (([k, v]) => typeof k === 'string' && typeof v === 'string' && v.length === 9)
      ) as [string, string][]
    )
  } catch {
    return {}
  }
}

export interface SyncPayload {
  etfs: CryptoEtfRow[]
  syncedAt: string
  count: number
}

export async function runSync(): Promise<SyncPayload> {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })

  const [list, btcData, externalCusips] = await Promise.all([
    getCryptoEtfList(),
    getBtcEtfHoldings(),
    getExternalCusipMap()
  ])
  const btcEtfMap = btcData?.data ?? {}
  const results: CryptoEtfRow[] = []

  for (let i = 0; i < Math.min(list.length, MAX_ETFS); i++) {
    const etf = list[i]
    const symbol = (etf.symbol || '').toUpperCase()
    const btcEntry = btcEtfMap[symbol]

    if (btcEntry && !btcEntry.error) {
      try {
        const [info, cusipLookup] = await Promise.all([
          getEtfInfo(symbol),
          getCusipBySymbol(symbol)
        ])
        const knowledge = CRYPTO_ETF_KNOWLEDGE[symbol as keyof typeof CRYPTO_ETF_KNOWLEDGE]
        const fullName = info?.name || knowledge?.name || etf.name || symbol
        const cusip = validCusip(info?.cusip) || validCusip(knowledge?.cusip) || cusipLookup || CUSIP_OVERRIDES[symbol as keyof typeof CUSIP_OVERRIDES] || externalCusips[symbol] || '—'
        const sponsored = SPONSORED_ETFS[symbol]
        results.push({
          ticker: symbol,
          name: fullName,
          region: knowledge?.region ?? 'United States',
          cryptoWeight: 99.5,
          cryptoExposure: 'BTC',
          cusip,
          digitalAssetIndicator: true,
          ...(sponsored && { sponsoredBy: sponsored.sponsoredBy, sponsoredBadge: sponsored.badge })
        })
      } catch {
        const knowledge = CRYPTO_ETF_KNOWLEDGE[symbol as keyof typeof CRYPTO_ETF_KNOWLEDGE]
        const sponsored = SPONSORED_ETFS[symbol]
        results.push({
          ticker: symbol,
          name: knowledge?.name ?? etf.name ?? symbol,
          region: knowledge?.region ?? 'United States',
          cryptoWeight: 99.5,
          cryptoExposure: 'BTC',
          cusip: validCusip(knowledge?.cusip) ?? CUSIP_OVERRIDES[symbol as keyof typeof CUSIP_OVERRIDES] ?? externalCusips[symbol] ?? '—',
          digitalAssetIndicator: true,
          ...(sponsored && { sponsoredBy: sponsored.sponsoredBy, sponsoredBadge: sponsored.badge })
        })
      }
    } else {
      try {
        const [info, holdings, countries, cusipLookup] = await Promise.all([
          getEtfInfo(symbol),
          getEtfHoldings(symbol),
          getEtfCountryWeightings(symbol),
          getCusipBySymbol(symbol)
        ])
        const apiCryptoWeight = calcCryptoWeight(holdings)
        const topCountry = (countries || []).sort(
          (a: { weightPercentage?: number }, b: { weightPercentage?: number }) => (b.weightPercentage ?? 0) - (a.weightPercentage ?? 0)
        )[0]
        const knowledge = CRYPTO_ETF_KNOWLEDGE[symbol as keyof typeof CRYPTO_ETF_KNOWLEDGE]
        const cryptoWeight = apiCryptoWeight > 0 ? apiCryptoWeight : (knowledge?.cryptoWeight ?? 0)
        const region = topCountry?.country || knowledge?.region || 'United States'
        const digitalAssetIndicator =
          cryptoWeight > 0.1 ||
          knowledge?.digitalAssetIndicator ||
          /bitcoin|btc|crypto|eth|ethereum/i.test(etf.name ?? '')
        const fullName = info?.name || knowledge?.name || etf.name || symbol
        const cryptoExposure = knowledge?.cryptoExposure ?? inferCryptoExposure(fullName)
        const cusip = validCusip(info?.cusip) || validCusip(knowledge?.cusip) || cusipLookup || CUSIP_OVERRIDES[symbol as keyof typeof CUSIP_OVERRIDES] || externalCusips[symbol] || '—'
        const sponsored = SPONSORED_ETFS[symbol]
        results.push({
          ticker: symbol,
          name: fullName,
          region,
          cryptoWeight: Math.round(cryptoWeight * 100) / 100,
          cryptoExposure,
          cusip,
          digitalAssetIndicator,
          ...(sponsored && { sponsoredBy: sponsored.sponsoredBy, sponsoredBadge: sponsored.badge })
        })
      } catch {
        const knowledge = CRYPTO_ETF_KNOWLEDGE[symbol as keyof typeof CRYPTO_ETF_KNOWLEDGE]
        const fullName = knowledge?.name ?? etf.name ?? symbol
        const sponsored = SPONSORED_ETFS[symbol]
        results.push({
          ticker: symbol,
          name: fullName,
          region: knowledge?.region ?? 'United States',
          cryptoWeight: knowledge?.cryptoWeight ?? 0,
          cryptoExposure: knowledge?.cryptoExposure ?? inferCryptoExposure(fullName),
          cusip: validCusip(knowledge?.cusip) ?? CUSIP_OVERRIDES[symbol as keyof typeof CUSIP_OVERRIDES] ?? externalCusips[symbol] ?? '—',
          digitalAssetIndicator: knowledge?.digitalAssetIndicator ?? /bitcoin|btc|crypto|eth|ethereum/i.test(etf.name ?? ''),
          ...(sponsored && { sponsoredBy: sponsored.sponsoredBy, sponsoredBadge: sponsored.badge })
        })
      }
    }

    if (i < Math.min(list.length, MAX_ETFS) - 1) await delay(REQUEST_DELAY_MS)
  }

  const sorted = results.sort((a, b) => b.cryptoWeight - a.cryptoWeight)
  const payload: SyncPayload = {
    etfs: sorted,
    syncedAt: new Date().toISOString(),
    count: sorted.length
  }
  writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2))
  return payload
}

// Run when executed directly: npx tsx sync.ts
const isMain = process.argv[1]?.replace(/\\/g, '/').endsWith('sync.ts')
if (isMain) {
  runSync()
    .then((p) => console.log(`Synced ${p.count} ETFs at ${p.syncedAt}`))
    .catch((e) => {
      console.error('Sync failed:', e)
      process.exit(1)
    })
}
