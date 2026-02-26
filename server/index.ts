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
import {
  getEtfQuote,
  getEtfHoldings,
  getEtfInfo,
  getEtfCountryWeightings,
  getEtfSectorWeightings,
  getEtfNews,
  getHistoricalPrice
} from './fmp'
import type { CryptoEtfRow } from '../src/types/etf'

const __dirname = dirname(fileURLToPath(import.meta.url))

// In-memory cache for ETF detail to stay within FMP Starter 300 calls/min
const ETF_DETAIL_CACHE_TTL_MS = 10 * 60 * 1000 // 10 min
interface EtfDetailData {
  symbol: string
  quote: unknown
  holdings: unknown[]
  info?: unknown
  countryWeightings?: unknown[]
  sectorWeightings?: unknown[]
  chart?: unknown[]
  news?: unknown[]
}
const etfDetailCache = new Map<string, { data: EtfDetailData; expiry: number }>()
const etfDetailExtendedCache = new Map<string, { data: EtfDetailData; expiry: number }>()

function getCachedEtfDetail(symbol: string, extended: boolean): EtfDetailData | null {
  const cache = extended ? etfDetailExtendedCache : etfDetailCache
  const entry = cache.get(symbol)
  if (!entry || Date.now() > entry.expiry) return null
  return entry.data
}

function setCachedEtfDetail(symbol: string, data: EtfDetailData, extended: boolean): void {
  const cache = extended ? etfDetailExtendedCache : etfDetailCache
  cache.set(symbol, { data, expiry: Date.now() + ETF_DETAIL_CACHE_TTL_MS })
}
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

// GET /api/etf/:symbol - ETF detail; ?extended=1 adds info, sectors, countries, chart, news (10min cache)
app.get('/api/etf/:symbol', async (req: Request, res: Response) => {
  const symbol = (req.params.symbol || '').toUpperCase()
  if (!symbol) return res.status(400).json({ error: 'Symbol required' })
  const extended = req.query.extended === '1'
  const cached = getCachedEtfDetail(symbol, extended)
  if (cached) return res.json(cached)
  try {
    const [quote, holdings] = await Promise.all([
      getEtfQuote(symbol),
      getEtfHoldings(symbol)
    ])
    const data: EtfDetailData = { symbol, quote: quote ?? null, holdings: holdings || [] }

    if (extended) {
      const [info, countries, sectors, chart, news] = await Promise.all([
        getEtfInfo(symbol),
        getEtfCountryWeightings(symbol),
        getEtfSectorWeightings(symbol),
        getHistoricalPrice(symbol, 90),
        getEtfNews(symbol, 5)
      ])
      data.info = info ?? null
      data.countryWeightings = countries ?? []
      data.sectorWeightings = sectors ?? []
      data.chart = chart ?? []
      data.news = news ?? []
    }

    setCachedEtfDetail(symbol, data, extended)
    res.json(data)
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
  console.log('  GET  /api/etf/:symbol - ETF detail (10min cache)')
  console.log('  POST /api/sync   - trigger sync (set SYNC_API_KEY to protect)')
  console.log('  GET  /api/health - health check')
  runInitialSyncInBackground()
})
