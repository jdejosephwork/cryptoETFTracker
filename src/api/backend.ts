/**
 * Backend API client. Fetches cached ETF data from our server.
 * Used when app is deployed as multi-user; falls back to direct FMP/btcetfdata when backend unavailable.
 */

const API_BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL ?? '')
const ETF_ENDPOINT = `${API_BASE}/api/etfs`

export interface BackendEtfResponse {
  etfs: Array<{
    ticker: string
    name: string
    region: string
    cryptoWeight: number
    cryptoExposure: string
    cusip: string
    digitalAssetIndicator: boolean
    btcHoldings?: number
  }>
  syncedAt: string | null
  count: number
}

/** Fetch ETF data from backend. Returns null if backend unavailable. */
export async function getEtfsFromBackend(): Promise<BackendEtfResponse | null> {
  try {
    const res = await fetch(ETF_ENDPOINT)
    if (!res.ok) return null
    const data = (await res.json()) as BackendEtfResponse
    if (data?.etfs && Array.isArray(data.etfs) && data.etfs.length > 0) {
      return data
    }
  } catch {
    // Backend unreachable (dev without server, network error)
  }
  return null
}
