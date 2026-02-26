/**
 * Backend API for Crypto ETF Tracker.
 * Serves cached ETF data; sync runs on startup and daily via cron.
 * FMP_API_KEY must be set for full data. CUSIP_DATA_URL optional.
 */
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import express, { Request, Response } from 'express'
import cors from 'cors'
import cron from 'node-cron'
import { runSync } from './sync'
import { getEtfQuote, getEtfHoldings } from './fmp'
import type { CryptoEtfRow } from '../src/types/etf'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_PATH = join(__dirname, 'data', 'etfs.json')
const PORT = Number(process.env.PORT) || 3001

interface CachedPayload {
  etfs: CryptoEtfRow[]
  syncedAt: string | null
  count: number
}

const app = express()
app.use(cors())
app.use(express.json())

function getCachedEtfs(): CachedPayload {
  try {
    if (existsSync(DATA_PATH)) {
      return JSON.parse(readFileSync(DATA_PATH, 'utf-8')) as CachedPayload
    }
  } catch (e) {
    console.warn('Failed to read cache:', (e as Error).message)
  }
  return { etfs: [], syncedAt: null, count: 0 }
}

// GET /api/etfs - returns cached ETF data (multi-user safe, read-only)
app.get('/api/etfs', (_req: Request, res: Response) => {
  const data = getCachedEtfs()
  res.json(data)
})

// GET /api/etf/:symbol - ETF detail (quote + holdings) for modal
app.get('/api/etf/:symbol', async (req: Request, res: Response) => {
  const symbol = (req.params.symbol || '').toUpperCase()
  if (!symbol) return res.status(400).json({ error: 'Symbol required' })
  try {
    const [quote, holdings] = await Promise.all([
      getEtfQuote(symbol),
      getEtfHoldings(symbol)
    ])
    res.json({ symbol, quote, holdings: holdings || [] })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// POST /api/sync - trigger sync (e.g. from cron-job.org or internal)
app.post('/api/sync', async (req: Request, res: Response) => {
  const auth = req.headers.authorization
  const syncKey = process.env.SYNC_API_KEY
  if (syncKey && auth !== `Bearer ${syncKey}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  try {
    const payload = await runSync()
    res.json(payload)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  const { count, syncedAt } = getCachedEtfs()
  res.json({ ok: true, etfCount: count, lastSync: syncedAt })
})

function runInitialSyncInBackground(): void {
  const cached = getCachedEtfs()
  if (cached.count === 0) {
    console.log('No cached data; running initial sync in background...')
    runSync()
      .then((result) => console.log(`Initial sync complete: ${result.count} ETFs`))
      .catch((e) => console.warn('Initial sync failed:', (e as Error).message))
  }
}

// Daily sync at 6:00 UTC (adjust as needed)
cron.schedule('0 6 * * *', async () => {
  console.log('Running scheduled sync...')
  try {
    const result = await runSync()
    console.log(`Scheduled sync complete: ${result.count} ETFs`)
  } catch (e) {
    console.error('Scheduled sync failed:', e)
  }
})

// Start server immediately, then sync in background (avoids blocking Railway health checks)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Crypto ETF Tracker API running on port ${PORT}`)
  console.log('  GET  /api/etfs   - cached ETF data')
  console.log('  POST /api/sync   - trigger sync (set SYNC_API_KEY to protect)')
  console.log('  GET  /api/health - health check')
  runInitialSyncInBackground()
})
