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
  ARKB: { name: 'ARK 21Shares Bitcoin ETF', cryptoWeight: 99.5, cryptoExposure: 'BTC', region: 'United States', cusip: '040919102', digitalAssetIndicator: true },
  BRRR: { name: 'Valkyrie Bitcoin Fund', cryptoWeight: 99.5, cryptoExposure: 'BTC', region: 'United States', cusip: '91916J100', digitalAssetIndicator: true },
  BTCW: { name: 'WisdomTree Bitcoin Fund', cryptoWeight: 99.5, cryptoExposure: 'BTC', region: 'United States', cusip: '97789G109', digitalAssetIndicator: true },
  HODL: { name: 'VanEck Bitcoin Trust', cryptoWeight: 99.5, cryptoExposure: 'BTC', region: 'United States', cusip: '92189K105', digitalAssetIndicator: true },
  BITO: { name: 'ProShares Bitcoin Strategy ETF', cryptoWeight: 95, cryptoExposure: 'BTC (futures)', region: 'United States', cusip: '74347G440', digitalAssetIndicator: true },
  BITS: { name: 'Global X Blockchain & Bitcoin Strategy ETF', cryptoWeight: 95, cryptoExposure: 'BTC', region: 'United States', cusip: '—', digitalAssetIndicator: true },
  BTF: { name: 'Valkyrie Bitcoin Strategy ETF', cryptoWeight: 95, cryptoExposure: 'BTC (futures)', region: 'United States', cusip: '91917A108', digitalAssetIndicator: true },
  DEFI: { name: 'Simplify Definity Digital Economy ETF', cryptoWeight: 30, cryptoExposure: 'BTC, ETH, Various', region: 'United States', cusip: '—', digitalAssetIndicator: true },
  BLOK: { name: 'Amplify Transformational Data Sharing ETF', cryptoWeight: 25, cryptoExposure: 'Blockchain equities', region: 'United States', cusip: '03208U303', digitalAssetIndicator: true },
  BITQ: { name: 'Bitwise Crypto Industry Innovators ETF', cryptoWeight: 90, cryptoExposure: 'BTC', region: 'United States', cusip: '09175C103', digitalAssetIndicator: true },
  CRYP: { name: 'Simplify Cryptocurrency Strategy ETF', cryptoWeight: 85, cryptoExposure: 'BTC, ETH, Various', region: 'United States', cusip: '—', digitalAssetIndicator: true },
  BTEK: { name: 'Global X Blockchain ETF', cryptoWeight: 20, cryptoExposure: 'Blockchain equities', region: 'United States', cusip: '—', digitalAssetIndicator: true },
  DAPP: { name: 'VanEck Digital Transformation ETF', cryptoWeight: 15, cryptoExposure: 'Blockchain equities', region: 'United States', cusip: '—', digitalAssetIndicator: true },
  BLCN: { name: 'Siren Nasdaq NexGen Economy ETF', cryptoWeight: 15, cryptoExposure: 'Blockchain equities', region: 'United States', cusip: '—', digitalAssetIndicator: true },
  GBTC: { name: 'Grayscale Bitcoin Trust', cryptoWeight: 99.5, cryptoExposure: 'BTC', region: 'United States', cusip: '389375104', digitalAssetIndicator: true },
  BTC: { name: 'Grayscale Bitcoin Mini Trust', cryptoWeight: 99.5, cryptoExposure: 'BTC', region: 'United States', cusip: '389930207', digitalAssetIndicator: true },
  BTCC: { name: 'Purpose Bitcoin ETF', cryptoWeight: 99.5, cryptoExposure: 'BTC', region: 'Canada', cusip: '—', digitalAssetIndicator: true },
  ETCG: { name: 'Grayscale Ethereum Trust', cryptoWeight: 99, cryptoExposure: 'ETH', region: 'United States', cusip: '—', digitalAssetIndicator: true },
  ETHB: { name: 'Bitwise Ethereum ETF', cryptoWeight: 99, cryptoExposure: 'ETH', region: 'United States', cusip: '—', digitalAssetIndicator: true },
  BCHG: { name: 'Grayscale Bitcoin Cash Trust', cryptoWeight: 95, cryptoExposure: 'BCH', region: 'United States', cusip: '—', digitalAssetIndicator: true },
  GDLC: { name: 'Grayscale Digital Large Cap', cryptoWeight: 80, cryptoExposure: 'BTC, ETH, Various', region: 'United States', cusip: '—', digitalAssetIndicator: true },
  OBTC: { name: 'One River Bitcoin ETF', cryptoWeight: 99.5, cryptoExposure: 'BTC', region: 'United States', cusip: '—', digitalAssetIndicator: true },
  SATO: { name: 'Invesco Alerian Galaxy Blockchain ETF', cryptoWeight: 90, cryptoExposure: 'BTC, Blockchain', region: 'United States', cusip: '—', digitalAssetIndicator: true },
  BKCH: { name: 'Global X Blockchain ETF', cryptoWeight: 25, cryptoExposure: 'Blockchain equities', region: 'United States', cusip: '—', digitalAssetIndicator: true },
  FINX: { name: 'Global X FinTech ETF', cryptoWeight: 10, cryptoExposure: 'Fintech/blockchain', region: 'United States', cusip: '37954Y814', digitalAssetIndicator: true },
  KOIN: { name: 'Capital Group Global Blockchain ETF', cryptoWeight: 20, cryptoExposure: 'Blockchain equities', region: 'United States', cusip: '—', digitalAssetIndicator: true },
  CETH: { name: '21Shares Core Ethereum ETF', cryptoWeight: 99, cryptoExposure: 'ETH', region: 'United States', cusip: '04071F102', digitalAssetIndicator: true },
  EETH: { name: 'ProShares Ether ETF', cryptoWeight: 99, cryptoExposure: 'ETH', region: 'United States', cusip: '—', digitalAssetIndicator: true },
  ETHE: { name: 'Grayscale Ethereum Staking ETF', cryptoWeight: 99, cryptoExposure: 'ETH', region: 'United States', cusip: '389638107', digitalAssetIndicator: true },
  ETHV: { name: 'VanEck Ethereum ETF', cryptoWeight: 99, cryptoExposure: 'ETH', region: 'United States', cusip: '92189L103', digitalAssetIndicator: true },
  ETHA: { name: 'iShares Ethereum Trust ETF', cryptoWeight: 99, cryptoExposure: 'ETH', region: 'United States', cusip: '46438R105', digitalAssetIndicator: true },
  QETH: { name: 'Invesco Galaxy Ethereum ETF', cryptoWeight: 99, cryptoExposure: 'ETH', region: 'United States', cusip: '—', digitalAssetIndicator: true },
  TETH: { name: '21Shares Ethereum ETF', cryptoWeight: 99, cryptoExposure: 'ETH', region: 'United States', cusip: '04071F102', digitalAssetIndicator: true },
  WGMI: { name: 'CoinShares Bitcoin Mining ETF', cryptoWeight: 85, cryptoExposure: 'BTC', region: 'United States', cusip: '—', digitalAssetIndicator: true },
  BTCO: { name: 'Invesco Galaxy Bitcoin ETF', cryptoWeight: 99.5, cryptoExposure: 'BTC', region: 'United States', cusip: '46091J101', digitalAssetIndicator: true },
  BTGD: { name: 'STKd 100% Bitcoin & 100% Gold ETF', cryptoWeight: 50, cryptoExposure: 'BTC', region: 'United States', cusip: '—', digitalAssetIndicator: true },
  BPI: { name: 'Grayscale Bitcoin Premium Income ETF', cryptoWeight: 99, cryptoExposure: 'BTC', region: 'United States', cusip: '—', digitalAssetIndicator: true },
  BITX: { name: 'Volatility Shares 2x Bitcoin Strategy ETF', cryptoWeight: 95, cryptoExposure: 'BTC', region: 'United States', cusip: '—', digitalAssetIndicator: true },
  BITI: { name: 'ProShares Short Bitcoin ETF', cryptoWeight: 95, cryptoExposure: 'BTC', region: 'United States', cusip: '—', digitalAssetIndicator: true },
  KRYP: { name: 'ProShares CoinDesk 20 Crypto ETF', cryptoWeight: 90, cryptoExposure: 'Various', region: 'United States', cusip: '—', digitalAssetIndicator: true },
  BETE: { name: 'ProShares Bitcoin & Ether Equal Weight ETF', cryptoWeight: 95, cryptoExposure: 'BTC, ETH', region: 'United States', cusip: '—', digitalAssetIndicator: true },
  CRPT: { name: 'First Trust SkyBridge Crypto Industry ETF', cryptoWeight: 75, cryptoExposure: 'Various', region: 'United States', cusip: '—', digitalAssetIndicator: true },
  BLKC: { name: 'Invesco Alerian Galaxy Blockchain ETF', cryptoWeight: 90, cryptoExposure: 'Blockchain', region: 'United States', cusip: '—', digitalAssetIndicator: true },
  DECO: { name: 'SPDR Galaxy Digital Asset Ecosystem ETF', cryptoWeight: 60, cryptoExposure: 'Various', region: 'United States', cusip: '—', digitalAssetIndicator: true },
  ARKF: { name: 'ARK Blockchain & Fintech Innovation ETF', cryptoWeight: 25, cryptoExposure: 'Blockchain equities', region: 'United States', cusip: '—', digitalAssetIndicator: true },
  ETHW: { name: 'Bitwise Ethereum ETF', cryptoWeight: 99, cryptoExposure: 'ETH', region: 'United States', cusip: '091955104', digitalAssetIndicator: true },
  NEHI: { name: 'NEOS Ethereum High Income ETF', cryptoWeight: 95, cryptoExposure: 'ETH', region: 'United States', cusip: '—', digitalAssetIndicator: true },
  YETH: { name: 'Roundhill Ether Covered Call Strategy ETF', cryptoWeight: 95, cryptoExposure: 'ETH', region: 'United States', cusip: '—', digitalAssetIndicator: true },
  XBCI: { name: 'NEOS Boosted Bitcoin High Income ETF', cryptoWeight: 95, cryptoExposure: 'BTC', region: 'United States', cusip: '—', digitalAssetIndicator: true },
  YBIT: { name: 'YieldMax Bitcoin Option Income Strategy ETF', cryptoWeight: 95, cryptoExposure: 'BTC', region: 'United States', cusip: '—', digitalAssetIndicator: true },
  EZBC: { name: 'Franklin Bitcoin ETF', cryptoWeight: 99.5, cryptoExposure: 'BTC', region: 'United States', cusip: '—', digitalAssetIndicator: true },
}
