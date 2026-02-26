/** FMP API client for Node (server-side only, no CORS) */
import type {
  FMPEtfListItem,
  FMPEtfInfo,
  FMPEtfHolding,
  FMPCountryWeighting
} from '../src/types/etf'

const FMP_BASE = 'https://financialmodelingprep.com'

let _warnedNoKey = false
function getApiKey(): string {
  const key = process.env.FMP_API_KEY
  if (!key && !_warnedNoKey) {
    _warnedNoKey = true
    console.warn('FMP_API_KEY not set. Sync will use knowledge-base fallbacks only.')
  }
  return key || ''
}

const FMP_TIMEOUT_MS = 8_000 // 8s per call to avoid Railway/Vercel proxy 502

async function fetchFMP<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const apiKey = getApiKey()
  const url = new URL(path, FMP_BASE)
  if (apiKey) url.searchParams.set('apikey', apiKey)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FMP_TIMEOUT_MS)
  try {
    const res = await fetch(url.toString(), { signal: controller.signal })
    clearTimeout(timeout)
    const text = await res.text()
    if (!res.ok) {
      throw new Error(`FMP API error: ${res.status} ${res.statusText}${text ? ` - ${text.slice(0, 200)}` : ''}`)
    }
    try {
      return JSON.parse(text) as T
    } catch {
      throw new Error(`FMP returned invalid JSON: ${text.slice(0, 100)}`)
    }
  } catch (e) {
    clearTimeout(timeout)
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('FMP request timeout')
    }
    throw e
  }
}

const KNOWN_CRYPTO_ETFS = [
  'IBIT', 'BITB', 'FBTC', 'ARKB', 'BRRR', 'BTCW', 'HODL', 'GBTC', 'BTC', 'BTCC',
  'BITO', 'BITS', 'DEFI', 'BLOK', 'BITQ', 'CRYP', 'BTF', 'BTEK', 'DAPP', 'BLCN',
  'ETCG', 'ETHB', 'BCHG', 'GDLC', 'OBTC', 'SATO', 'BKCH', 'FINX', 'KOIN'
]
const CRYPTO_KEYWORDS = ['bitcoin', 'btc', 'crypto', 'ethereum', 'eth', 'digital', 'blockchain']

function filterCryptoEtfs(list: FMPEtfListItem[]): FMPEtfListItem[] {
  return list.filter((e) => {
    const text = `${(e.name || '')} ${(e.symbol || '')}`.toLowerCase()
    return CRYPTO_KEYWORDS.some((k) => text.includes(k))
  })
}

export async function getCryptoEtfList(): Promise<FMPEtfListItem[]> {
  try {
    const data = await fetchFMP<FMPEtfListItem[] | { data?: FMPEtfListItem[] }>('/stable/etf-list', { query: 'bitcoin' })
    const list = Array.isArray(data) ? data : data?.data ?? []
    const filtered = filterCryptoEtfs(list)
    const result = filtered.length > 0 ? filtered : list.slice(0, 50)
    const symbols = new Set(result.map((e) => (e.symbol || '').toUpperCase()))
    for (const ticker of KNOWN_CRYPTO_ETFS) {
      if (!symbols.has(ticker)) result.push({ symbol: ticker, name: ticker })
    }
    return result
  } catch {
    return KNOWN_CRYPTO_ETFS.map((s) => ({ symbol: s, name: s }))
  }
}

export async function getEtfInfo(symbol: string): Promise<FMPEtfInfo | null> {
  const endpoints = [
    `/stable/etf/info?symbol=${encodeURIComponent(symbol)}`,
    `/api/v3/profile/${encodeURIComponent(symbol)}`
  ]
  for (const path of endpoints) {
    try {
      const data = await fetchFMP<FMPEtfInfo[] | { data?: FMPEtfInfo[] }>(path)
      const arr = Array.isArray(data) ? data : data?.data ?? []
      if (arr.length > 0) return arr[0]
    } catch {
      continue
    }
  }
  return null
}

/** ETF holdings = constituents (what the ETF holds). Use /stable/etf/holdings.
 *  etf-holder = institutional holders (who holds the ETF) - wrong for our use. */
export async function getEtfHoldings(symbol: string): Promise<FMPEtfHolding[]> {
  try {
    const data = await fetchFMP<FMPEtfHolding[] | { holdings?: FMPEtfHolding[]; data?: FMPEtfHolding[] }>(
      `/stable/etf/holdings?symbol=${encodeURIComponent(symbol)}`
    )
    const mapHolding = (h: FMPEtfHolding & Record<string, unknown>) => ({
      asset: String(h.asset ?? h.title ?? h.name ?? ''),
      name: String(h.name ?? h.title ?? h.asset ?? ''),
      symbol: h.symbol,
      weightPercentage: Number(h.weightPercentage ?? h.pctVal ?? h.weight ?? 0),
    })
    if (Array.isArray(data) && data.length > 0) {
      return data.map(mapHolding)
    }
    const holdings = (data as { holdings?: FMPEtfHolding[] })?.holdings ?? (data as { data?: FMPEtfHolding[] })?.data ?? []
    return Array.isArray(holdings) ? holdings.map(mapHolding) : []
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`FMP holdings failed for ${symbol}:`, (e as Error).message)
    }
    return []
  }
}

/** Parse percentage value: FMP stable API returns weightPercentage as "97.49%" (string with %). */
function parsePercentValue(v: unknown): number {
  if (v == null) return NaN
  const n = Number(v)
  if (!Number.isNaN(n)) return n
  if (typeof v === 'string') {
    const stripped = v.replace(/%/g, '').trim()
    const parsed = Number(stripped)
    if (!Number.isNaN(parsed)) return parsed
  }
  return NaN
}

/** Extract weight from FMP country object. Per FMP docs: country, weightPercentage (can be "97.49%" string). */
function extractCountryWeight(raw: Record<string, unknown>): number {
  const candidates = [
    raw.weight,
    raw.weightPercentage,
    raw.weighting,
    raw.allocation,
    raw.value,
    raw.percent,
    raw.pct,
    raw.countryWeight,
    raw.weightingPercentage
  ]
  for (const v of candidates) {
    const n = parsePercentValue(v)
    if (!Number.isNaN(n) && n >= 0) {
      if (n > 0 && n <= 1) return n * 100
      return n
    }
  }
  return 0
}

/** Normalize country weighting. FMP docs: country, weight (float %). OpenBB: country, weight. */
function mapCountryWeighting(raw: Record<string, unknown>): FMPCountryWeighting {
  return {
    country: String(raw.country ?? raw.Country ?? raw.name ?? raw.region ?? ''),
    weightPercentage: extractCountryWeight(raw)
  }
}

/** Extract array from FMP response. FMP may return: [...], { countryWeightings: [...] }, { data: [...] } */
function extractCountryArray(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data) && data.length > 0) return data as Record<string, unknown>[]
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    const cw = obj.countryWeightings ?? obj.country_weightings ?? obj.data
    if (Array.isArray(cw) && cw.length > 0) return cw as Record<string, unknown>[]
  }
  return []
}

export async function getEtfCountryWeightings(symbol: string): Promise<FMPCountryWeighting[]> {
  try {
    const data = await fetchFMP<unknown>('/stable/etf/country-weightings', { symbol })
    const arr = extractCountryArray(data)
    if (arr.length > 0) return arr.map(mapCountryWeighting).filter((c) => !!c.country)
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`Country weightings failed for ${symbol}:`, (e as Error).message)
    }
  }
  return []
}

/** FMP Quote - price, volume, change, etc. for ETF detail view */
export interface FMPQuote {
  symbol: string
  name?: string
  price?: number
  change?: number
  changePercentage?: number
  volume?: number
  dayLow?: number
  dayHigh?: number
  yearLow?: number
  yearHigh?: number
  marketCap?: number
  priceAvg50?: number
  priceAvg200?: number
  open?: number
  previousClose?: number
  exchange?: string
  timestamp?: number
}

/** ETF quote: try batch-etf-quotes (ETF-specific) then stable/quote (works for ETFs too). */
export async function getEtfQuote(symbol: string): Promise<FMPQuote | null> {
  const endpoints: string[] = [
    `/stable/batch-etf-quotes?symbols=${encodeURIComponent(symbol)}`,
    `/stable/quote?symbol=${encodeURIComponent(symbol)}`,
  ]
  for (const path of endpoints) {
    try {
      const data = await fetchFMP<FMPQuote[] | { data?: FMPQuote[] }>(path)
      const arr = Array.isArray(data) ? data : (data as { data?: FMPQuote[] })?.data ?? []
      if (arr.length > 0) return arr[0]
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`FMP quote ${path.split('?')[0]} failed for ${symbol}:`, (e as Error).message)
      }
      continue
    }
  }
  return null
}

/** ETF sector weightings for detail page. FMP stable may return weightPercentage as "97.49%" string. */
function mapSectorWeighting(raw: Record<string, unknown>): { sector: string; weightPercentage?: number } {
  const candidates = [raw.weight, raw.weightPercentage, raw.weighting, raw.allocation, raw.value, raw.percent]
  let weight = 0
  for (const v of candidates) {
    const n = parsePercentValue(v)
    if (!Number.isNaN(n) && n >= 0) {
      weight = n > 0 && n <= 1 ? n * 100 : n
      break
    }
  }
  return {
    sector: String(raw.sector ?? raw.Sector ?? raw.name ?? ''),
    weightPercentage: weight
  }
}

export async function getEtfSectorWeightings(symbol: string): Promise<{ sector: string; weightPercentage?: number }[]> {
  try {
    const data = await fetchFMP<unknown>(
      `/stable/etf/sector-weightings?symbol=${encodeURIComponent(symbol)}`
    )
    let arr: Record<string, unknown>[] = []
    if (Array.isArray(data) && data.length > 0) arr = data as Record<string, unknown>[]
    else {
      const sw = (data as { sectorWeightings?: unknown[] })?.sectorWeightings
      if (Array.isArray(sw) && sw.length > 0) arr = sw as Record<string, unknown>[]
    }
    if (arr.length > 0) return arr.map(mapSectorWeighting).filter((s) => s.sector)
    return []
  } catch {
    return []
  }
}

/** Stock/news by symbol for ETF detail page */
export interface FMPNewsItem {
  title?: string
  publishedDate?: string
  url?: string
  site?: string
  text?: string
}
export async function getEtfNews(symbol: string, limit = 5): Promise<FMPNewsItem[]> {
  try {
    const data = await fetchFMP<FMPNewsItem[] | { data?: FMPNewsItem[] }>(
      `/stable/news/stock?symbols=${encodeURIComponent(symbol)}&page=0&limit=${limit}`
    )
    const arr = Array.isArray(data) ? data : (data as { data?: FMPNewsItem[] })?.data ?? []
    return arr
  } catch {
    return []
  }
}

/** Historical price for chart - last N days. FMP full has close; light may use price. */
export interface FMPHistoricalPoint {
  date?: string
  close?: number
  price?: number
  adjClose?: number
  volume?: number
}
function normalizeChartPoint(p: FMPHistoricalPoint & Record<string, unknown>): FMPHistoricalPoint {
  const closeVal = Number(p.close ?? p.Close ?? p.price ?? p.Price ?? p.adjClose ?? p.AdjClose ?? 0)
  return {
    ...p,
    date: String(p.date ?? p.Date ?? ''),
    close: closeVal,
    volume: Number(p.volume ?? p.Volume ?? 0)
  }
}
export async function getHistoricalPrice(symbol: string, days = 90): Promise<FMPHistoricalPoint[]> {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - days)
  const fromStr = from.toISOString().slice(0, 10)
  const toStr = to.toISOString().slice(0, 10)

  // Prefer full endpoint - guaranteed close, open, high, low
  const fullPath = `/stable/historical-price-eod/full?symbol=${encodeURIComponent(symbol)}&from=${fromStr}&to=${toStr}`
  try {
    const data = await fetchFMP<FMPHistoricalPoint[] | { data?: FMPHistoricalPoint[] }>(fullPath)
    const arr = Array.isArray(data) ? data : (data as { data?: FMPHistoricalPoint[] })?.data ?? []
    if (arr.length > 0) {
      const normalized = arr.map((p) => normalizeChartPoint(p as FMPHistoricalPoint & Record<string, unknown>))
      return normalized.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
    }
  } catch {
    // Fall through to light
  }

  // Fallback: light endpoint (may use "price" instead of "close")
  try {
    const data = await fetchFMP<FMPHistoricalPoint[] | { data?: FMPHistoricalPoint[] }>(
      `/stable/historical-price-eod/light?symbol=${encodeURIComponent(symbol)}&from=${fromStr}&to=${toStr}`
    )
    const arr = Array.isArray(data) ? data : (data as { data?: FMPHistoricalPoint[] })?.data ?? []
    const normalized = arr.map((p) => normalizeChartPoint(p as FMPHistoricalPoint & Record<string, unknown>))
    return normalized.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
  } catch {
    return []
  }
}

export async function getCusipBySymbol(symbol: string): Promise<string | null> {
  try {
    const data = await fetchFMP<Array<{ symbol?: string; cusip?: string; isin?: string }> | { data?: Array<{ symbol?: string; cusip?: string; isin?: string }> }>('/stable/search-symbol', { query: symbol })
    const arr = Array.isArray(data) ? data : (data as { data?: unknown })?.data
    if (!Array.isArray(arr) || arr.length === 0) return null
    const match = arr.find((r) => (r.symbol || '').toUpperCase() === symbol.toUpperCase())
    if (!match) return null
    if (match.cusip) return match.cusip
    if (match.isin && match.isin.startsWith('US') && match.isin.length >= 11) {
      return match.isin.slice(2, 11)
    }
    return null
  } catch {
    return null
  }
}
