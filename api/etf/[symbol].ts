/**
 * Vercel serverless function - ETF detail (quote + holdings) from FMP.
 * Handles /api/etf/:symbol when Railway backend is unavailable.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'

const FMP_BASE = 'https://financialmodelingprep.com'

async function fetchFMP<T>(path: string): Promise<T> {
  const key = process.env.FMP_API_KEY || process.env.VITE_FMP_API_KEY
  const url = `${FMP_BASE}${path}${path.includes('?') ? '&' : '?'}apikey=${key || ''}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`FMP error: ${res.status}`)
  return res.json()
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const symbol = (req.query.symbol as string)?.toUpperCase()
  if (!symbol) {
    return res.status(400).json({ error: 'Symbol required' })
  }
  try {
    const [quoteRes, holdingsRes] = await Promise.all([
      fetchFMP<unknown[] | { data?: unknown[] }>(`/stable/quote?symbol=${encodeURIComponent(symbol)}`),
      fetchFMP<unknown[] | { holdings?: unknown[] }>(`/api/v3/etf-holder/${encodeURIComponent(symbol)}`)
        .catch(() => fetchFMP<{ holdings?: unknown[] }>(`/stable/etf/holdings?symbol=${encodeURIComponent(symbol)}`))
    ])
    const quoteArr = Array.isArray(quoteRes) ? quoteRes : (quoteRes as { data?: unknown[] })?.data ?? []
    const quote = quoteArr.length > 0 ? quoteArr[0] : null
    let holdings: unknown[] = []
    if (Array.isArray(holdingsRes)) {
      holdings = (holdingsRes as Record<string, unknown>[]).map((h) => ({
        asset: String(h.asset ?? h.name ?? ''),
        name: String(h.name ?? h.asset ?? ''),
        symbol: h.symbol,
        weightPercentage: Number(h.weightPercentage ?? h.weight ?? 0)
      }))
    } else {
      const h = holdingsRes as { holdings?: unknown[] }
      holdings = Array.isArray(h?.holdings) ? h.holdings : []
    }
    return res.status(200).json({ symbol, quote, holdings })
  } catch (e) {
    console.error('ETF detail error:', e)
    return res.status(500).json({ error: (e as Error).message })
  }
}
