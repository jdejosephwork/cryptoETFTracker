/**
 * Diagnostic endpoint - check API health and config.
 * GET /api/diagnostic
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const hasFmpKey = !!(process.env.FMP_API_KEY || process.env.VITE_FMP_API_KEY)
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({
    ok: true,
    timestamp: new Date().toISOString(),
    etfApi: 'Vercel serverless',
    fmpConfigured: hasFmpKey,
    env: {
      nodeEnv: process.env.NODE_ENV,
      vercel: !!process.env.VERCEL,
    },
  })
}
