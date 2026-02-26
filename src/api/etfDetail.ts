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
  const url = `${API_BASE}/api/etf/${encodeURIComponent(symbol)}`
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
    return JSON.parse(text) as EtfDetailResponse
  } catch {
    throw new Error(`Invalid response (expected JSON)`)
  }
}
