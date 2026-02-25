// FMP API response types
export interface FMPEtfListItem {
  symbol: string
  name: string
  exchange?: string
  exchangeShortName?: string
  type?: string
}

export interface FMPEtfInfo {
  symbol: string
  name: string
  currency?: string
  exchange?: string
  exchangeShortName?: string
  cusip?: string
  isin?: string
  assetType?: string
  isEtf?: boolean
  isActivelyManaged?: boolean
}

export interface FMPEtfHolding {
  asset: string
  name: string
  symbol?: string
  weightPercentage?: number
  sharesNumber?: number
  marketValue?: number
  currency?: string
  cusip?: string
  isin?: string
}

export interface FMPEtfHoldingsResponse {
  symbol: string
  holdings: FMPEtfHolding[]
}

export interface FMPCountryWeighting {
  country: string
  weightPercentage?: number
}

// Crypto-related asset identifiers (symbols, keywords for name matching)
export const CRYPTO_ASSET_INDICATORS = [
  'bitcoin', 'btc', 'ethereum', 'eth', 'crypto',
  'coinbase', 'coin', 'grayscale', 'microstrategy', 'mstr',
  'block', 'sq', 'marathon', 'riot', 'cleanspark', 'clsk',
  'bitfarms', 'bitf', 'hut', 'hut8', 'cipher', 'cifr',
  'bitdeer', 'btdr', 'irm', 'iris', 'argo', 'arqb'
]

export interface CryptoEtfRow {
  ticker: string
  name: string
  region: string
  cryptoWeight: number
  cryptoExposure: string
  cusip: string
  digitalAssetIndicator: boolean
  /** BTC holdings count when from btcetfdata.com (spot Bitcoin ETFs) */
  btcHoldings?: number
}
