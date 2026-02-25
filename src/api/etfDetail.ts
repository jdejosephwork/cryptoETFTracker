/** Fetch ETF detail (quote + holdings) from backend for modal */

const API_BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL ?? '')

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

export async function fetchEtfDetail(symbol: string): Promise<EtfDetailResponse> {
  const res = await fetch(`${API_BASE}/api/etf/${encodeURIComponent(symbol)}`)
  if (!res.ok) throw new Error('Failed to load ETF details')
  return res.json()
}
