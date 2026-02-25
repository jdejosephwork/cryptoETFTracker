/**
 * Bitcoin ETF holdings from btcetfdata.com
 * Free, no API key. Spot Bitcoin ETF holdings (BTC count) with daily updates.
 * https://www.btcetfdata.com/
 */

export interface BtcEtfDataEntry {
  ticker: string
  dt: string
  holdings: number
  change: number
  update_ts: string
  error: boolean
}

export interface BtcEtfDataResponse {
  data: Record<string, BtcEtfDataEntry>
  batch_ts: string
}

const URL = import.meta.env.DEV
  ? '/btcetf-api/v1/current.json'
  : 'https://www.btcetfdata.com/v1/current.json'

let cachedData: BtcEtfDataResponse | null = null

/** Fetch current Bitcoin ETF holdings. Cached until forceRefresh. */
export async function getBtcEtfHoldings(forceRefresh = false): Promise<BtcEtfDataResponse | null> {
  if (cachedData && !forceRefresh) return cachedData
  if (forceRefresh) cachedData = null
  try {
    const res = await fetch(URL)
    if (!res.ok) return null
    const data = (await res.json()) as BtcEtfDataResponse
    if (data?.data && typeof data.data === 'object') {
      cachedData = data
      return data
    }
  } catch {
    // Network error, CORS, etc.
  }
  return null
}

/** Tickers we get from btcetfdata (spot Bitcoin ETFs) */
export const BTC_ETF_TICKERS = ['IBIT', 'FBTC', 'GBTC', 'ARKB', 'BITB', 'BTC', 'BTCC'] as const
