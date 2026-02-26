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

async function fetchFMP<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const apiKey = getApiKey()
  const url = new URL(path, FMP_BASE)
  if (apiKey) url.searchParams.set('apikey', apiKey)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString())
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`FMP API error: ${res.status} ${res.statusText}${text ? ` - ${text.slice(0, 200)}` : ''}`)
  }
  return res.json()
}

const KNOWN_CRYPTO_ETFS = [
  'IBIT', 'BITB', 'FBTC', 'ARKB', 'BRRR', 'BTCW', 'HODL', 'GBTC', 'BTC', 'BTCC',
  'BITO', 'BITS', 'DEFI', 'BLOK', 'BITQ', 'CRYP', 'BTF', 'BTEK', 'DAPP', 'BLCN'
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

export async function getEtfHoldings(symbol: string): Promise<FMPEtfHolding[]> {
  try {
    const data = await fetchFMP<unknown>(`/api/v3/etf-holder/${encodeURIComponent(symbol)}`)
    if (!data || !Array.isArray(data)) {
      const d = await fetchFMP<FMPEtfHolding[] | { holdings?: FMPEtfHolding[] }>(`/stable/etf/holdings?symbol=${encodeURIComponent(symbol)}`)
      return Array.isArray(d) ? d : d?.holdings ?? []
    }
    return (data as Record<string, unknown>[]).map((h) => ({
      asset: String(h.asset ?? h.name ?? ''),
      name: String(h.name ?? h.asset ?? ''),
      symbol: h.symbol as string | undefined,
      weightPercentage: Number(h.weightPercentage ?? h.weight ?? 0),
    }))
  } catch {
    return []
  }
}

export async function getEtfCountryWeightings(symbol: string): Promise<FMPCountryWeighting[]> {
  const endpoints = [
    `/api/v4/etf-country-weightings?symbol=${encodeURIComponent(symbol)}`,
    `/stable/etf/country-weightings?symbol=${encodeURIComponent(symbol)}`
  ]
  for (const path of endpoints) {
    try {
      const data = await fetchFMP<FMPCountryWeighting[] | { countryWeightings?: FMPCountryWeighting[] }>(path)
      if (Array.isArray(data) && data.length > 0) return data
      const cw = (data as { countryWeightings?: FMPCountryWeighting[] })?.countryWeightings
      if (Array.isArray(cw) && cw.length > 0) return cw
    } catch {
      continue
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

export async function getEtfQuote(symbol: string): Promise<FMPQuote | null> {
  try {
    const data = await fetchFMP<FMPQuote[] | { data?: FMPQuote[] }>(
      `/stable/quote?symbol=${encodeURIComponent(symbol)}`
    )
    const arr = Array.isArray(data) ? data : (data as { data?: FMPQuote[] })?.data ?? []
    return arr.length > 0 ? arr[0] : null
  } catch {
    return null
  }
}

/** ETF sector weightings for detail page */
export async function getEtfSectorWeightings(symbol: string): Promise<{ sector: string; weightPercentage?: number }[]> {
  try {
    const data = await fetchFMP<{ sector?: string; weightPercentage?: number }[] | { sectorWeightings?: unknown[] }>(
      `/stable/etf/sector-weightings?symbol=${encodeURIComponent(symbol)}`
    )
    if (Array.isArray(data) && data.length > 0) return data
    const sw = (data as { sectorWeightings?: { sector?: string; weightPercentage?: number }[] })?.sectorWeightings
    return Array.isArray(sw) ? sw : []
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

/** Historical price (light) for chart - last 3 months */
export interface FMPHistoricalPoint {
  date?: string
  close?: number
  volume?: number
}
export async function getHistoricalPrice(symbol: string, days = 90): Promise<FMPHistoricalPoint[]> {
  try {
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - days)
    const fromStr = from.toISOString().slice(0, 10)
    const toStr = to.toISOString().slice(0, 10)
    const data = await fetchFMP<FMPHistoricalPoint[] | { data?: FMPHistoricalPoint[] }>(
      `/stable/historical-price-eod/light?symbol=${encodeURIComponent(symbol)}&from=${fromStr}&to=${toStr}`
    )
    const arr = Array.isArray(data) ? data : (data as { data?: FMPHistoricalPoint[] })?.data ?? []
    return arr.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
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
