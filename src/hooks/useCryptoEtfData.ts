import { useState, useEffect, useCallback, useRef } from 'react'
import type { CryptoEtfRow } from '../types/etf'
import { CRYPTO_ASSET_INDICATORS } from '../types/etf'
import { CRYPTO_ETF_KNOWLEDGE } from '../data/cryptoEtfKnowledge'
import { CUSIP_OVERRIDES } from '../data/cusipOverrides'
import { getEtfsFromBackend } from '../api/backend'
import {
  getCryptoEtfList,
  getEtfInfo,
  getEtfHoldings,
  getEtfCountryWeightings,
  getCusipBySymbol
} from '../api/fmp'
import { getBtcEtfHoldings } from '../api/btcetfdata'
import { getExternalCusipMap } from '../api/cusipLookup'

const FALLBACK_ROWS: CryptoEtfRow[] = [
  { ticker: 'IBIT', name: 'iShares Bitcoin Trust', region: 'United States', cryptoWeight: 99.5, cryptoExposure: 'BTC', cusip: '46438F101', digitalAssetIndicator: true },
  { ticker: 'BITB', name: 'Bitwise Bitcoin ETF', region: 'United States', cryptoWeight: 99.5, cryptoExposure: 'BTC', cusip: '09174C104', digitalAssetIndicator: true },
  { ticker: 'FBTC', name: 'Fidelity Wise Origin Bitcoin', region: 'United States', cryptoWeight: 99.5, cryptoExposure: 'BTC', cusip: '31608A504', digitalAssetIndicator: true },
  { ticker: 'ARKB', name: 'ARK 21Shares Bitcoin ETF', region: 'United States', cryptoWeight: 99.5, cryptoExposure: 'BTC', cusip: '00215Q207', digitalAssetIndicator: true },
  { ticker: 'BITO', name: 'ProShares Bitcoin Strategy', region: 'United States', cryptoWeight: 95, cryptoExposure: 'BTC (futures)', cusip: '74322R309', digitalAssetIndicator: true },
]

function inferCryptoExposure(name: string): string {
  const n = (name || '').toLowerCase()
  const exposures: string[] = []
  if (n.includes('bitcoin') || n.includes('btc')) exposures.push('BTC')
  if (n.includes('ethereum') || n.includes('eth')) exposures.push('ETH')
  if (n.includes('crypto') || n.includes('digital asset')) exposures.push('Various')
  if (n.includes('blockchain') && !exposures.length) exposures.push('Blockchain equities')
  return exposures.length ? exposures.join(', ') : '—'
}

const REQUEST_DELAY_MS = 300 // Space out requests to avoid FMP rate limits
const MAX_ETFS = 25 // Free tier ~250 calls/day; each ETF = 4 calls + 1 for list

function isCryptoHolding(name: string, symbol?: string): boolean {
  const text = `${(name || '').toLowerCase()} ${(symbol || '').toLowerCase()}`
  return CRYPTO_ASSET_INDICATORS.some((ind) => text.includes(ind))
}

function calcCryptoWeight(holdings: { name?: string; symbol?: string; weightPercentage?: number }[]): number {
  return holdings
    .filter((h) => isCryptoHolding(h.name ?? '', h.symbol))
    .reduce((sum, h) => sum + (h.weightPercentage ?? 0), 0)
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export function useCryptoEtfData() {
  const [rows, setRows] = useState<CryptoEtfRow[]>(FALLBACK_ROWS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loadIdRef = useRef(0)

  const load = useCallback(async () => {
    const thisLoadId = ++loadIdRef.current
    const isStale = () => thisLoadId !== loadIdRef.current

    setLoading(true)
    setError(null)
    try {
      // Prefer backend (multi-user) when available
      const backend = await getEtfsFromBackend()
      if (backend?.etfs?.length && !isStale()) {
        setRows(backend.etfs)
        setLoading(false)
        return
      }
      if (isStale()) return

      const [list, btcData, externalCusips] = await Promise.all([
        getCryptoEtfList(),
        getBtcEtfHoldings(true),
        getExternalCusipMap()
      ])
      if (isStale()) return

      const results: CryptoEtfRow[] = []
      const maxEtfs = MAX_ETFS
      const btcEtfMap = btcData?.data ?? {}

      for (let i = 0; i < Math.min(list.length, maxEtfs); i++) {
        if (isStale()) return

        const etf = list[i]
        const symbol = etf.symbol?.toUpperCase() || ''
        const btcEntry = btcEtfMap[symbol]

        if (btcEntry && !btcEntry.error) {
          // Use btcetfdata.com for spot Bitcoin ETFs - no FMP holdings/countries needed
          try {
            const [info, cusipLookup] = await Promise.all([
              getEtfInfo(symbol),
              getCusipBySymbol(symbol)
            ])
            if (isStale()) return

            const knowledge = CRYPTO_ETF_KNOWLEDGE[symbol]
            const fullName = info?.name || knowledge?.name || etf.name || symbol
            const cusip = info?.cusip || knowledge?.cusip || cusipLookup || CUSIP_OVERRIDES[symbol] || externalCusips[symbol] || '—'
            results.push({
              ticker: symbol,
              name: fullName,
              region: knowledge?.region ?? 'United States',
              cryptoWeight: 99.5,
              cryptoExposure: 'BTC',
              cusip,
              digitalAssetIndicator: true,
              btcHoldings: Math.round(btcEntry.holdings * 100) / 100
            })
            if (!isStale()) setRows([...results].sort((a, b) => b.cryptoWeight - a.cryptoWeight))
          } catch {
            const knowledge = CRYPTO_ETF_KNOWLEDGE[symbol]
            results.push({
              ticker: symbol,
              name: knowledge?.name ?? etf.name ?? symbol,
              region: knowledge?.region ?? 'United States',
              cryptoWeight: 99.5,
              cryptoExposure: 'BTC',
              cusip: knowledge?.cusip ?? CUSIP_OVERRIDES[symbol] ?? externalCusips[symbol] ?? '—',
              digitalAssetIndicator: true,
              btcHoldings: Math.round(btcEntry.holdings * 100) / 100
            })
            if (!isStale()) setRows([...results].sort((a, b) => b.cryptoWeight - a.cryptoWeight))
          }
        } else {
          // FMP for non-Bitcoin ETFs or when btcetfdata unavailable
          try {
            const [info, holdings, countries, cusipLookup] = await Promise.all([
              getEtfInfo(symbol),
              getEtfHoldings(symbol),
              getEtfCountryWeightings(symbol),
              getCusipBySymbol(symbol)
            ])
            if (isStale()) return

            const apiCryptoWeight = calcCryptoWeight(holdings)
            const topCountry = countries.sort(
              (a, b) => (b.weightPercentage ?? 0) - (a.weightPercentage ?? 0)
            )[0]
            const knowledge = CRYPTO_ETF_KNOWLEDGE[symbol]

            const cryptoWeight = apiCryptoWeight > 0 ? apiCryptoWeight : (knowledge?.cryptoWeight ?? 0)
            const region = topCountry?.country || knowledge?.region || 'United States'
            const digitalAssetIndicator =
              cryptoWeight > 0.1 ||
              knowledge?.digitalAssetIndicator ||
              /bitcoin|btc|crypto|eth|ethereum/i.test(etf.name ?? '')

            const fullName = info?.name || knowledge?.name || etf.name || symbol
            const cryptoExposure = knowledge?.cryptoExposure ?? inferCryptoExposure(fullName)
            const cusip = info?.cusip || knowledge?.cusip || cusipLookup || CUSIP_OVERRIDES[symbol] || externalCusips[symbol] || '—'
            results.push({
              ticker: symbol,
              name: fullName,
              region,
              cryptoWeight: Math.round(cryptoWeight * 100) / 100,
              cryptoExposure,
              cusip,
              digitalAssetIndicator
            })

            if (!isStale()) setRows([...results].sort((a, b) => b.cryptoWeight - a.cryptoWeight))
          } catch {
            const knowledge = CRYPTO_ETF_KNOWLEDGE[symbol]
            const fullName = knowledge?.name ?? etf.name ?? symbol
            results.push({
              ticker: symbol,
              name: fullName,
              region: knowledge?.region ?? 'United States',
              cryptoWeight: knowledge?.cryptoWeight ?? 0,
              cryptoExposure: knowledge?.cryptoExposure ?? inferCryptoExposure(fullName),
              cusip: knowledge?.cusip ?? CUSIP_OVERRIDES[symbol] ?? externalCusips[symbol] ?? '—',
              digitalAssetIndicator: knowledge?.digitalAssetIndicator ?? /bitcoin|btc|crypto|eth|ethereum/i.test(etf.name ?? '')
            })
            if (!isStale()) setRows([...results].sort((a, b) => b.cryptoWeight - a.cryptoWeight))
          }
        }

        if (i < Math.min(list.length, maxEtfs) - 1) await delay(REQUEST_DELAY_MS)
      }

      if (!isStale()) {
        setRows(results.length > 0 ? results.sort((a, b) => b.cryptoWeight - a.cryptoWeight) : FALLBACK_ROWS)
      }
    } catch (e) {
      if (!isStale()) {
        setError(e instanceof Error ? e.message : 'Failed to load ETF data')
        setRows((prev) => (prev.length > 0 ? prev : FALLBACK_ROWS))
      }
    } finally {
      if (!isStale()) setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { rows, loading, error, refresh: load }
}
