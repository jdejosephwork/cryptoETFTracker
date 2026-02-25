/**
 * Curated data for known crypto ETFs.
 * Used when FMP API returns empty (free tier lacks holdings/country endpoints).
 * CUSIPs from SEC filings / fund prospectuses (public).
 */
export interface CryptoEtfKnowledge {
  name: string
  cryptoWeight: number
  cryptoExposure: string
  region: string
  cusip: string
  digitalAssetIndicator: boolean
}

export const CRYPTO_ETF_KNOWLEDGE: Record<string, CryptoEtfKnowledge> = {
  IBIT: { name: 'iShares Bitcoin Trust', cryptoWeight: 99.5, cryptoExposure: 'BTC', region: 'United States', cusip: '46438F101', digitalAssetIndicator: true },
  BITB: { name: 'Bitwise Bitcoin ETF', cryptoWeight: 99.5, cryptoExposure: 'BTC', region: 'United States', cusip: '09174C104', digitalAssetIndicator: true },
  FBTC: { name: 'Fidelity Wise Origin Bitcoin Fund', cryptoWeight: 99.5, cryptoExposure: 'BTC', region: 'United States', cusip: '31608A504', digitalAssetIndicator: true },
  ARKB: { name: 'ARK 21Shares Bitcoin ETF', cryptoWeight: 99.5, cryptoExposure: 'BTC', region: 'United States', cusip: '00215Q207', digitalAssetIndicator: true },
  BRRR: { name: 'Valkyrie Bitcoin Fund', cryptoWeight: 99.5, cryptoExposure: 'BTC', region: 'United States', cusip: '91911A501', digitalAssetIndicator: true },
  BTCW: { name: 'BME Bitcoin Suisse ETF', cryptoWeight: 99.5, cryptoExposure: 'BTC', region: 'United States', cusip: '—', digitalAssetIndicator: true },
  HODL: { name: 'Vaneck Bitcoin Strategy ETF', cryptoWeight: 99.5, cryptoExposure: 'BTC', region: 'United States', cusip: '—', digitalAssetIndicator: true },
  BITO: { name: 'ProShares Bitcoin Strategy ETF', cryptoWeight: 95, cryptoExposure: 'BTC (futures)', region: 'United States', cusip: '74322R309', digitalAssetIndicator: true },
  BITS: { name: 'Global X Blockchain & Bitcoin Strategy ETF', cryptoWeight: 95, cryptoExposure: 'BTC', region: 'United States', cusip: '—', digitalAssetIndicator: true },
  BTF: { name: 'Valkyrie Bitcoin Strategy ETF', cryptoWeight: 95, cryptoExposure: 'BTC (futures)', region: 'United States', cusip: '—', digitalAssetIndicator: true },
  DEFI: { name: 'Simplify Definity Digital Economy ETF', cryptoWeight: 30, cryptoExposure: 'BTC, ETH, Various', region: 'United States', cusip: '—', digitalAssetIndicator: true },
  BLOK: { name: 'Amplify Transformational Data Sharing ETF', cryptoWeight: 25, cryptoExposure: 'Blockchain equities', region: 'United States', cusip: '03208U303', digitalAssetIndicator: true },
  BITQ: { name: 'Bitwise Crypto Industry Innovators ETF', cryptoWeight: 90, cryptoExposure: 'BTC', region: 'United States', cusip: '09175C103', digitalAssetIndicator: true },
  CRYP: { name: 'Simplify Cryptocurrency Strategy ETF', cryptoWeight: 85, cryptoExposure: 'BTC, ETH, Various', region: 'United States', cusip: '—', digitalAssetIndicator: true },
  BTEK: { name: 'Global X Blockchain ETF', cryptoWeight: 20, cryptoExposure: 'Blockchain equities', region: 'United States', cusip: '—', digitalAssetIndicator: true },
  DAPP: { name: 'VanEck Digital Transformation ETF', cryptoWeight: 15, cryptoExposure: 'Blockchain equities', region: 'United States', cusip: '—', digitalAssetIndicator: true },
  BLCN: { name: 'Siren Nasdaq NexGen Economy ETF', cryptoWeight: 15, cryptoExposure: 'Blockchain equities', region: 'United States', cusip: '—', digitalAssetIndicator: true },
  GBTC: { name: 'Grayscale Bitcoin Trust', cryptoWeight: 99.5, cryptoExposure: 'BTC', region: 'United States', cusip: '389375104', digitalAssetIndicator: true },
  BTC: { name: 'Grayscale Bitcoin Mini Trust', cryptoWeight: 99.5, cryptoExposure: 'BTC', region: 'United States', cusip: '—', digitalAssetIndicator: true },
  BTCC: { name: 'Purpose Bitcoin ETF', cryptoWeight: 99.5, cryptoExposure: 'BTC', region: 'Canada', cusip: '—', digitalAssetIndicator: true },
}
