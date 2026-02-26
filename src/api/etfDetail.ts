/** Fetch ETF detail (quote + holdings) from backend for modal */

function getApiBase(): string {
  // Always use same-origin to avoid CORS: Vercel serverless handles /api/etf/* when frontend is on Vercel
  if (import.meta.env.DEV) return ''
  return ''
}

export interface EtfQuote {
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

export interface EtfHolding {
  asset?: string
  name?: string
  symbol?: string
  weightPercentage?: number
}

export interface EtfDetailResponse {
  symbol: string
  quote: EtfQuote | null
  holdings: EtfHolding[]
}

export interface EtfInfo {
  symbol?: string
  name?: string
  expenseRatio?: number
  aum?: number
  [key: string]: unknown
}

export interface CountryWeighting {
  country?: string
  weightPercentage?: number
}

export interface SectorWeighting {
  sector?: string
  weightPercentage?: number
}

export interface ChartPoint {
  date?: string
  close?: number
  volume?: number
}

export interface NewsItem {
  title?: string
  publishedDate?: string
  url?: string
  site?: string
  text?: string
}

export interface EtfDetailExtendedResponse extends EtfDetailResponse {
  info?: EtfInfo | null
  countryWeightings?: CountryWeighting[]
  sectorWeightings?: SectorWeighting[]
  chart?: ChartPoint[]
  news?: NewsItem[]
}

async function fetchEtfDetailInner(symbol: string, extended: boolean): Promise<EtfDetailResponse | EtfDetailExtendedResponse> {
  const base = getApiBase()
  const url = `${base}/api/etf/${encodeURIComponent(symbol)}${extended ? '?extended=1' : ''}`
  let res: Response
  try {
    res = await fetch(url)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error'
    throw new Error(`Could not reach API: ${msg}`)
  }
  const text = await res.text()
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const err = JSON.parse(text) as { error?: string }
      if (err?.error) detail = err.error
    } catch {
      if (text?.slice(0, 100)) detail = `${res.status}: ${text.slice(0, 100)}`
    }
    throw new Error(`ETF detail failed: ${detail}`)
  }
  try {
    return JSON.parse(text) as EtfDetailResponse | EtfDetailExtendedResponse
  } catch {
    throw new Error(`Invalid response (expected JSON)`)
  }
}

export async function fetchEtfDetail(symbol: string): Promise<EtfDetailResponse> {
  return fetchEtfDetailInner(symbol, false) as Promise<EtfDetailResponse>
}

/** Fetch extended detail; on 502/timeout, fallback to basic (quote+holdings) */
export async function fetchEtfDetailExtended(symbol: string): Promise<EtfDetailExtendedResponse> {
  try {
    return (await fetchEtfDetailInner(symbol, true)) as EtfDetailExtendedResponse
  } catch {
    const basic = await fetchEtfDetailInner(symbol, false)
    return { ...basic }
  }
}
