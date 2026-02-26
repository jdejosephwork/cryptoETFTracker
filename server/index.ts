/**
 * Backend API for Crypto ETF Tracker.
 * List: from cache (hourly sync); detail: on-demand with 10min cache.
 * Sync prioritizes crypto weight, exposure, CUSIP, digital asset. FMP_API_KEY required.
 */
import 'dotenv/config'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import express, { Request, Response } from 'express'
import cors from 'cors'
import cron from 'node-cron'
import { runSync, getCryptoWeightForSymbol, inferCryptoExposure, validCusip } from './sync'
import {
  getEtfQuote,
  getEtfHoldings,
  getEtfInfo,
  getEtfCountryWeightings,
  getEtfSectorWeightings,
  getEtfNews,
  getHistoricalPrice,
  getCusipBySymbol
} from './fmp'
import type { CryptoEtfRow } from '../src/types/etf'
import { CRYPTO_ETF_KNOWLEDGE } from '../src/data/cryptoEtfKnowledge'
import { CUSIP_OVERRIDES } from '../src/data/cusipOverrides'
import {
  isStripeConfigured,
  getUserFromToken,
  createCheckoutSession,
  upsertSubscription,
  getSubscriptionStatus
} from './stripe'
import Stripe from 'stripe'

const __dirname = dirname(fileURLToPath(import.meta.url))

// In-memory cache for ETF detail to stay within FMP Starter 300 calls/min
const ETF_DETAIL_CACHE_TTL_MS = 10 * 60 * 1000 // 10 min
interface EtfDetailData {
  symbol: string
  quote: unknown
  holdings: unknown[]
  cryptoWeight?: number
  cryptoExposure?: string
  cusip?: string
  sponsoredBy?: string
  sponsoredBadge?: string
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

// Stripe webhook needs raw body (must be before express.json())
app.post(
  '/api/stripe-webhook',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    const stripe = (await import('./stripe')).stripe
    const secret = process.env.STRIPE_WEBHOOK_SECRET
    if (!stripe || !secret) {
      res.status(500).json({ error: 'Webhook not configured' })
      return
    }
    const sig = req.headers['stripe-signature'] as string
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(req.body as Buffer, sig, secret)
    } catch (e) {
      res.status(400).json({ error: `Webhook error: ${(e as Error).message}` })
      return
    }
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = (session.client_reference_id || session.metadata?.user_id) as string
      if (userId) {
        await upsertSubscription(
          userId,
          session.customer as string,
          session.subscription as string,
          'active'
        )
      }
    } else if (event.type === 'customer.subscription.deleted' || event.type === 'customer.subscription.updated') {
      const sub = event.data.object as Stripe.Subscription
      const { updateSubscriptionFromStripe } = await import('./stripe')
      await updateSubscriptionFromStripe(sub)
    }
    res.json({ received: true })
  }
)

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
// Uses cached list data first for crypto weight, exposure, CUSIP; live API for quote/holdings/sectors/etc.
app.get('/api/etf/:symbol', async (req: Request, res: Response) => {
  const symbol = (req.params.symbol || '').toUpperCase()
  if (!symbol) return res.status(400).json({ error: 'Symbol required' })
  const extended = req.query.extended === '1'
  const cached = getCachedEtfDetail(symbol, extended)
  if (cached) return res.json(cached)

  let quote: unknown = null
  let holdings: { name?: string; symbol?: string; asset?: string; weightPercentage?: number }[] = []
  let data: EtfDetailData = { symbol, quote: null, holdings: [] }

  try {
    // Cached list (hourly sync) supplies crypto weight, exposure, CUSIP when available
    const cachedEtfs = getCachedEtfs()
    const cachedRow = cachedEtfs.etfs.find((r) => r.ticker === symbol)
    // Live API: quote, holdings, info, cusip lookup
    const [quoteRes, holdingsRes, infoRes, cusipRes] = await Promise.all([
      getEtfQuote(symbol),
      getEtfHoldings(symbol),
      getEtfInfo(symbol),
      getCusipBySymbol(symbol)
    ])
    quote = quoteRes ?? null
    holdings = Array.isArray(holdingsRes) ? holdingsRes : []
    const info = infoRes ?? null
    const cusipLookup = cusipRes ?? null
    const fromHoldings = getCryptoWeightForSymbol(symbol, holdings)
    const knowledge = CRYPTO_ETF_KNOWLEDGE[symbol as keyof typeof CRYPTO_ETF_KNOWLEDGE]
    const displayName = (quote as { name?: string })?.name ?? (info as { name?: string })?.name ?? knowledge?.name ?? symbol
    // Priority data: crypto weight (cached > holdings calc > knowledge), exposure (cached > knowledge > infer), CUSIP (cached > FMP info > FMP search > knowledge > overrides)
    const cryptoWeight = cachedRow?.cryptoWeight ?? (fromHoldings > 0 ? fromHoldings : knowledge?.cryptoWeight ?? 0)
    const cryptoExposure = cachedRow?.cryptoExposure ?? knowledge?.cryptoExposure ?? inferCryptoExposure(displayName)
    const cusip = validCusip(cachedRow?.cusip) ?? validCusip((info as { cusip?: string })?.cusip) ?? cusipLookup ?? validCusip(knowledge?.cusip) ?? CUSIP_OVERRIDES[symbol as keyof typeof CUSIP_OVERRIDES] ?? '—'
    data = {
      symbol,
      quote,
      holdings,
      cryptoWeight,
      cryptoExposure,
      cusip,
      sponsoredBy: cachedRow?.sponsoredBy,
      sponsoredBadge: cachedRow?.sponsoredBadge
    }

    if (extended) {
      const [countriesRes, sectorsRes, chartRes, newsRes] = await Promise.allSettled([
        getEtfCountryWeightings(symbol),
        getEtfSectorWeightings(symbol),
        getHistoricalPrice(symbol, 60),
        getEtfNews(symbol, 5)
      ])
      data.info = info
      data.countryWeightings = countriesRes.status === 'fulfilled' ? (countriesRes.value ?? []) : []
      data.sectorWeightings = sectorsRes.status === 'fulfilled' ? (sectorsRes.value ?? []) : []
      data.chart = chartRes.status === 'fulfilled' ? (chartRes.value ?? []) : []
      data.news = newsRes.status === 'fulfilled' ? (newsRes.value ?? []) : []
      // Enrich CUSIP from FMP if still missing (already tried in basic request)
      if ((!data.cusip || data.cusip === '—') && (info as { cusip?: string })?.cusip) data.cusip = (info as { cusip?: string }).cusip
      if ((!data.cusip || data.cusip === '—') && cusipLookup) data.cusip = cusipLookup
    }

    setCachedEtfDetail(symbol, data, extended)
  } catch (e) {
    const err = e as Error
    console.warn(`ETF detail for ${symbol}:`, err.message)
    const cachedEtfs = getCachedEtfs()
    const cachedRow = cachedEtfs.etfs.find((r) => r.ticker === symbol)
    const knowledge = CRYPTO_ETF_KNOWLEDGE[symbol as keyof typeof CRYPTO_ETF_KNOWLEDGE]
    data = {
      symbol,
      quote: null,
      holdings: [],
      cryptoWeight: cachedRow?.cryptoWeight ?? knowledge?.cryptoWeight ?? getCryptoWeightForSymbol(symbol, []),
      cryptoExposure: cachedRow?.cryptoExposure ?? knowledge?.cryptoExposure ?? inferCryptoExposure(symbol),
      cusip: validCusip(cachedRow?.cusip) ?? validCusip(knowledge?.cusip) ?? CUSIP_OVERRIDES[symbol as keyof typeof CUSIP_OVERRIDES] ?? '—',
      sponsoredBy: cachedRow?.sponsoredBy,
      sponsoredBadge: cachedRow?.sponsoredBadge
    }
  }
  res.status(200).json(data)
})

// POST /api/create-checkout-session - Stripe Pro subscription (requires Auth)
app.post('/api/create-checkout-session', async (req: Request, res: Response) => {
  if (!isStripeConfigured()) return res.status(503).json({ error: 'Stripe not configured' })
  const auth = req.headers.authorization
  const user = auth ? await getUserFromToken(auth) : null
  if (!user) return res.status(401).json({ error: 'Sign in required' })
  const { successUrl, cancelUrl } = req.body as { successUrl?: string; cancelUrl?: string }
  if (!successUrl || !cancelUrl) return res.status(400).json({ error: 'successUrl and cancelUrl required' })
  try {
    const url = await createCheckoutSession(user.id, user.email ?? '', successUrl, cancelUrl)
    if (!url) return res.status(500).json({ error: 'Failed to create session' })
    res.json({ url })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// GET /api/subscription - Pro status (requires Auth)
app.get('/api/subscription', async (req: Request, res: Response) => {
  const auth = req.headers.authorization
  const user = auth ? await getUserFromToken(auth) : null
  if (!user) return res.json({ isPro: false })
  try {
    const status = await getSubscriptionStatus(user.id)
    res.json(status)
  } catch {
    res.json({ isPro: false })
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

// Debug: raw FMP country-weightings response (to verify API structure)
app.get('/api/debug/country-weightings/:symbol', async (req: Request, res: Response) => {
  const symbol = (req.params.symbol || 'SPY').toUpperCase()
  const key = (process.env.FMP_API_KEY || '').trim()
  if (!key) return res.status(400).json({ error: 'FMP_API_KEY not set' })
  try {
    const url = `https://financialmodelingprep.com/stable/etf/country-weightings?symbol=${encodeURIComponent(symbol)}&apikey=${key}`
    const r = await fetch(url)
    const text = await r.text()
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
    res.json({ ok: r.ok, status: r.status, data, sampleKeys: Array.isArray(data) && data[0] && typeof data[0] === 'object' ? Object.keys(data[0] as object) : null })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// Health check - includes FMP key status, sync schedule
app.get('/api/health', (_req: Request, res: Response) => {
  const { count, syncedAt } = getCachedEtfs()
  const fmpKeySet = !!(process.env.FMP_API_KEY || '').trim()
  res.json({
    ok: true,
    etfCount: count,
    lastSync: syncedAt,
    syncSchedule: 'hourly',
    fmpKeySet,
    endpoints: {
      etfs: '/api/etfs',
      etfDetail: '/api/etf/:symbol',
      etfDetailExtended: '/api/etf/:symbol?extended=1',
    },
  })
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

// Hourly sync - prioritizes crypto weight, exposure, CUSIP, digital asset
cron.schedule('0 * * * *', async () => {
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
  console.log('  GET  /api/etfs   - cached ETF list (hourly sync)')
  console.log('  GET  /api/etf/:symbol - ETF detail on-demand (10min cache)')
  console.log('  POST /api/sync   - trigger sync manually (set SYNC_API_KEY to protect)')
  console.log('  GET  /api/health - health check')
  runInitialSyncInBackground()
})
