/** Bitcoin ETF holdings from btcetfdata.com - server-side fetch */

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

const URL = 'https://www.btcetfdata.com/v1/current.json'

export async function getBtcEtfHoldings(): Promise<BtcEtfDataResponse | null> {
  try {
    const res = await fetch(URL)
    if (!res.ok) return null
    const data = (await res.json()) as BtcEtfDataResponse
    if (data?.data && typeof data.data === 'object') return data
  } catch (e) {
    console.warn('btcetfdata fetch failed:', (e as Error).message)
  }
  return null
}
