/**
 * Diagnostic endpoint - check deployment config and Railway health.
 * GET /api/diagnostic
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'

const RAILWAY_URL = 'https://cryptoetftracker-production.up.railway.app'

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
  const timestamp = new Date().toISOString()

  let railway: { reachable: boolean; health?: Record<string, unknown>; error?: string } = { reachable: false }
  try {
    const h = await fetch(`${RAILWAY_URL}/api/health`, { signal: AbortSignal.timeout(8000) })
    railway.reachable = h.ok
    if (h.ok) {
      railway.health = (await h.json()) as Record<string, unknown>
    } else {
      railway.error = `HTTP ${h.status}`
    }
  } catch (e) {
    railway.error = e instanceof Error ? e.message : 'Fetch failed'
  }

  return res.status(200).json({
    ok: true,
    timestamp,
    railway,
    summary: {
      backendReachable: railway.reachable,
      fmpKeySet: railway.health?.fmpKeySet ?? false,
    },
    endpoints: ['/api/etfs', '/api/etf/:symbol', '/api/etf/:symbol?extended=1', '/api/health'],
  })
}
