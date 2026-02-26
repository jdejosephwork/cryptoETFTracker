/**
 * ETF detail: try Railway first; on 502/timeout, fallback to FMP directly.
 * Add FMP_API_KEY to Vercel env for fallback to work.
 * Uses shared cryptoEtfKnowledge and cusipOverrides for exposure/CUSIP.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { CRYPTO_ETF_KNOWLEDGE } from '../../src/data/cryptoEtfKnowledge'
import { CUSIP_OVERRIDES } from '../../src/data/cusipOverrides'

const RAILWAY_URL = 'https://cryptoetftracker-production.up.railway.app'
const FMP_BASE = 'https://financialmodelingprep.com'

function getCryptoWeight(symbol: string): number {
  return CRYPTO_ETF_KNOWLEDGE[symbol]?.cryptoWeight ?? 0
}
function getCryptoExposure(symbol: string, displayName?: string): string {
  const k = CRYPTO_ETF_KNOWLEDGE[symbol]?.cryptoExposure
  if (k && k !== '—') return k
  if (displayName) return inferCryptoExposure(displayName)
  return '—'
}
function getCusip(symbol: string): string {
  const k = CRYPTO_ETF_KNOWLEDGE[symbol]?.cusip
  const o = CUSIP_OVERRIDES[symbol]
  if (k && k !== '—') return k
  if (o) return o
  return '—'
}

function inferCryptoExposure(name: string): string {
  const n = (name || '').toLowerCase()
  const exposures: string[] = []
  if (n.includes('bitcoin') || n.includes('btc')) exposures.push('BTC')
  if (n.includes('ethereum') || n.includes('ether') || n.includes('eth')) exposures.push('ETH')
  if (n.includes('crypto') || n.includes('digital asset')) exposures.push('Various')
  if (n.includes('blockchain') && !exposures.length) exposures.push('Blockchain equities')
  return exposures.length ? exposures.join(', ') : '—'
}

function getFmpKey(): string {
  return (process.env.FMP_API_KEY || process.env.VITE_FMP_API_KEY || '').trim()
}

async function fetchFromRailway(symbol: string, extended: boolean): Promise<{ ok: boolean; data?: unknown }> {
  const url = `${RAILWAY_URL}/api/etf/${symbol}${extended ? '?extended=1' : ''}`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return { ok: false }
    const data = await res.json()
    return { ok: true, data }
  } catch {
    return { ok: false }
  }
}

async function fetchFMP<T>(path: string): Promise<T> {
  const key = getFmpKey()
  const url = `${FMP_BASE}${path}${path.includes('?') ? '&' : '?'}apikey=${key}`
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`FMP ${res.status}`)
  return res.json()
}

async function fetchFromFMP(symbol: string): Promise<{ symbol: string; quote: unknown; holdings: unknown[] }> {
  const enc = encodeURIComponent(symbol)
  // Quote: try batch-etf-quotes (ETF-specific) then stable/quote
  let quote: unknown = null
  for (const path of [`/stable/batch-etf-quotes?symbols=${enc}`, `/stable/quote?symbol=${enc}`]) {
    try {
      const quoteRes = await fetchFMP<unknown[] | { data?: unknown[] }>(path)
      const quoteArr = Array.isArray(quoteRes) ? quoteRes : (quoteRes as { data?: unknown[] })?.data ?? []
      if (quoteArr.length > 0) {
        quote = quoteArr[0]
        break
      }
    } catch {
      continue
    }
  }
  // Holdings: use /stable/etf/holdings (constituents). etf-holder = institutional holders (wrong)
  let holdings: unknown[] = []
  try {
    const holdingsRes = await fetchFMP<unknown[] | { holdings?: unknown[]; data?: unknown[] }>(
      `/stable/etf/holdings?symbol=${enc}`
    )
    if (Array.isArray(holdingsRes) && holdingsRes.length > 0) {
      holdings = holdingsRes.map((h: Record<string, unknown>) => ({
        asset: String(h.asset ?? h.name ?? ''),
        name: String(h.name ?? h.asset ?? ''),
        symbol: h.symbol,
        weightPercentage: Number(h.weightPercentage ?? h.weight ?? 0),
      }))
    } else {
      const h = holdingsRes as { holdings?: unknown[] }
      holdings = Array.isArray(h?.holdings) ? h.holdings : []
    }
  } catch {
    holdings = []
  }
  const displayName = (quote as { name?: string })?.name ?? CRYPTO_ETF_KNOWLEDGE[symbol]?.name ?? symbol
  const cryptoWeight = calcCryptoWeightFromHoldings(holdings) || getCryptoWeight(symbol)
  const cryptoExposure = getCryptoExposure(symbol, displayName)
  const cusip = getCusip(symbol)
  return { symbol, quote, holdings, cryptoWeight, cryptoExposure, cusip }
}

function calcCryptoWeightFromHoldings(holdings: unknown[]): number {
  const keywords = ['bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'coinbase', 'grayscale', 'microstrategy']
  return (holdings as { name?: string; symbol?: string; weightPercentage?: number }[])
    .filter((h) => {
      const t = `${h.name ?? ''} ${h.symbol ?? ''}`.toLowerCase()
      return keywords.some((k) => t.includes(k))
    })
    .reduce((sum, h) => sum + (h.weightPercentage ?? 0), 0)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  let symbol = (req.query.symbol as string)?.toUpperCase()
  if (!symbol && req.url) {
    const m = req.url.match(/\/api\/etf\/([^/?]+)/i)
    symbol = m?.[1]?.toUpperCase() ?? ''
  }
  if (!symbol) return res.status(400).json({ error: 'Symbol required' })
  const extended = req.query.extended === '1'

  const railway = await fetchFromRailway(symbol, extended)
  if (railway.ok && railway.data) {
    return res.status(200).json(railway.data)
  }

  const key = getFmpKey()
  if (!key) {
    return res.status(503).json({
      error: 'Backend unavailable (502). Set FMP_API_KEY on Vercel for fallback.',
      symbol,
      quote: null,
      holdings: [],
      cryptoWeight: getCryptoWeight(symbol),
      cryptoExposure: getCryptoExposure(symbol),
      cusip: getCusip(symbol),
    })
  }

  try {
    const data = await fetchFromFMP(symbol)
    return res.status(200).json(data)
  } catch (e) {
    console.warn('FMP fallback error:', (e as Error).message)
    // Never 500 - return minimal data so frontend can render
    return res.status(200).json({
      symbol,
      quote: null,
      holdings: [],
      cryptoWeight: getCryptoWeight(symbol),
      cryptoExposure: getCryptoExposure(symbol),
      cusip: getCusip(symbol),
    })
  }
}
