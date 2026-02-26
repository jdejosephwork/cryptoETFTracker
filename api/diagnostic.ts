/**
 * Diagnostic endpoint - check deployment config.
 * GET /api/diagnostic
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({
    ok: true,
    timestamp: new Date().toISOString(),
    backend: 'Railway (proxied via vercel.json rewrites)',
    endpoints: ['/api/etfs', '/api/etf/:symbol', '/api/sync', '/api/health'],
    env: {
      nodeEnv: process.env.NODE_ENV,
      vercel: !!process.env.VERCEL,
    },
  })
}
