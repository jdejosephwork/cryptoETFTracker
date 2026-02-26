/**
 * ETF detail: try Railway first; on 502/timeout, fallback to FMP directly.
 * Add FMP_API_KEY to Vercel env for fallback to work.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'

const RAILWAY_URL = 'https://cryptoetftracker-production.up.railway.app'
const FMP_BASE = 'https://financialmodelingprep.com'

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
  const [quoteRes, holdingsRes] = await Promise.all([
    fetchFMP<unknown[] | { data?: unknown[] }>(`/stable/quote?symbol=${enc}`),
    fetchFMP<unknown>(`/api/v3/etf-holder/${enc}`).catch(() =>
      fetchFMP<{ holdings?: unknown[] }>(`/stable/etf/holdings?symbol=${enc}`)
    ),
  ])
  const quoteArr = Array.isArray(quoteRes) ? quoteRes : (quoteRes as { data?: unknown[] })?.data ?? []
  const quote = quoteArr.length > 0 ? quoteArr[0] : null
  let holdings: unknown[] = []
  if (Array.isArray(holdingsRes)) {
    holdings = (holdingsRes as Record<string, unknown>[]).map((h) => ({
      asset: String(h.asset ?? h.name ?? ''),
      name: String(h.name ?? h.asset ?? ''),
      symbol: h.symbol,
      weightPercentage: Number(h.weightPercentage ?? h.weight ?? 0),
    }))
  } else {
    const h = holdingsRes as { holdings?: unknown[] }
    holdings = Array.isArray(h?.holdings) ? h.holdings : []
  }
  return { symbol, quote, holdings }
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
    })
  }

  try {
    const data = await fetchFromFMP(symbol)
    return res.status(200).json(data)
  } catch (e) {
    console.error('FMP fallback error:', e)
    return res.status(500).json({ error: (e as Error).message, symbol, quote: null, holdings: [] })
  }
}
