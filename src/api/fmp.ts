import type { FMPEtfListItem, FMPEtfInfo, FMPEtfHolding, FMPCountryWeighting } from '../types/etf'

// Use proxy in dev to avoid CORS; direct URL in production
const FMP_BASE = import.meta.env.DEV ? '' : 'https://financialmodelingprep.com'
const FMP_PREFIX = import.meta.env.DEV ? '/fmp-api' : ''

function getApiKey(): string {
  const key = import.meta.env.VITE_FMP_API_KEY
  if (!key) {
    console.warn(
      'VITE_FMP_API_KEY not set. Create a .env file with VITE_FMP_API_KEY=your_key'
    )
  }
  return key || ''
}

async function fetchFMP<T>(path: string, params?: Record<string, string>): Promise<T> {
  const apiKey = getApiKey()
  const fullPath = `${FMP_PREFIX}${path}`
  const url = new URL(fullPath, FMP_BASE || window.location.origin)
  if (apiKey) url.searchParams.set('apikey', apiKey)
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }

  const res = await fetch(url.toString())
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`FMP API error: ${res.status} ${res.statusText}${text ? ` - ${text.slice(0, 200)}` : ''}`)
  }
  return res.json()
}

// Known crypto-focused ETF tickers (spot Bitcoin, Bitcoin futures, crypto exposure)
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
    const data = await fetchFMP<FMPEtfListItem[] | { data?: FMPEtfListItem[] }>(
      '/stable/etf-list',
      { query: 'bitcoin' }
    )
    let list: FMPEtfListItem[] = []
    if (Array.isArray(data)) list = data
    else if (data && typeof data === 'object' && 'data' in data) {
      const d = (data as { data?: unknown }).data
      list = Array.isArray(d) ? (d as FMPEtfListItem[]) : []
    }

    const filtered = filterCryptoEtfs(list)
    const result = filtered.length > 0 ? filtered : list.slice(0, 50)

    const symbols = new Set(result.map((e) => (e.symbol || '').toUpperCase()))
    for (const ticker of KNOWN_CRYPTO_ETFS) {
      if (!symbols.has(ticker)) {
        result.push({ symbol: ticker, name: ticker })
      }
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
      const arr = Array.isArray(data) ? data : (data as { data?: FMPEtfInfo[] })?.data
      if (arr && arr.length > 0) return arr[0]
    } catch {
      continue
    }
  }
  return null
}

// v3 etf-holder returns holdings; field may be weight or weightPercentage
export async function getEtfHoldings(symbol: string): Promise<FMPEtfHolding[]> {
  try {
    const data = await fetchFMP<unknown>(
      `/api/v3/etf-holder/${encodeURIComponent(symbol)}`
    )
    if (!data || typeof data !== 'object') return []

    const arr = Array.isArray(data) ? data : []
    return arr.map((h: Record<string, unknown>) => ({
      asset: String(h.asset ?? h.name ?? ''),
      name: String(h.name ?? h.asset ?? ''),
      symbol: h.symbol as string | undefined,
      weightPercentage: Number(h.weightPercentage ?? h.weight ?? 0),
      sharesNumber: Number(h.sharesNumber ?? h.shares ?? 0),
      marketValue: Number(h.marketValue ?? h.assetValue ?? 0),
      cusip: h.cusip as string | undefined,
      isin: h.isin as string | undefined
    }))
  } catch {
    try {
      const data = await fetchFMP<FMPEtfHolding[] | { holdings?: FMPEtfHolding[] }>(
        `/stable/etf/holdings?symbol=${encodeURIComponent(symbol)}`
      )
      if (Array.isArray(data)) return data
      return (data as { holdings?: FMPEtfHolding[] })?.holdings ?? []
    } catch {
      return []
    }
  }
}

/** Fetch CUSIP via FMP search-symbol (ticker→symbol details). ISIN can be converted to CUSIP for US securities. */
export async function getCusipBySymbol(symbol: string): Promise<string | null> {
  try {
    const data = await fetchFMP<Array<{ symbol?: string; cusip?: string; isin?: string }> | { data?: Array<{ symbol?: string; cusip?: string; isin?: string }> }>(
      `/stable/search-symbol`,
      { query: symbol }
    )
    const arr = Array.isArray(data) ? data : (data as { data?: unknown })?.data
    if (!Array.isArray(arr) || arr.length === 0) return null
    const match = arr.find((r: { symbol?: string }) => (r.symbol || '').toUpperCase() === symbol.toUpperCase())
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
