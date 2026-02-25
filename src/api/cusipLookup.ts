/**
 * Optional external CUSIP lookup.
 * Set VITE_CUSIP_DATA_URL in .env to a JSON URL returning { "TICKER": "CUSIP", ... }
 * E.g. a GitHub raw file or your own endpoint. Used when FMP and knowledge base lack CUSIP.
 */

const CUSIP_DATA_URL = import.meta.env.VITE_CUSIP_DATA_URL as string | undefined

let cachedMap: Record<string, string> | null = null

export async function getExternalCusipMap(): Promise<Record<string, string>> {
  if (!CUSIP_DATA_URL) return {}
  if (cachedMap) return cachedMap
  try {
    const res = await fetch(CUSIP_DATA_URL)
    if (!res.ok) return {}
    const data = (await res.json()) as Record<string, string>
    if (data && typeof data === 'object') {
      cachedMap = Object.fromEntries(
        Object.entries(data).filter(
          (([k, v]) => typeof k === 'string' && typeof v === 'string' && v.length === 9)
        )
      )
      return cachedMap
    }
  } catch {
    // Network or parse error
  }
  return {}
}
