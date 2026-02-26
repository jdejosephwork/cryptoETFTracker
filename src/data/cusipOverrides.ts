/**
 * Additional CUSIP lookups for crypto ETFs when FMP and knowledge base lack them.
 * Sourced from SEC filings, Cboe new listings, prospectuses, and public financial databases.
 * Update this file as new CUSIPs are discovered.
 */
export const CUSIP_OVERRIDES: Record<string, string> = {
  // Bitwise
  BITQ: '09175C103', // Bitwise Crypto Industry Innovators ETF
  BITB: '09174C104', // Bitwise Bitcoin ETF
  ETHW: '091955104', // Bitwise Ethereum ETF
  // Spot Bitcoin ETFs
  IBIT: '46438F101', // iShares Bitcoin Trust
  FBTC: '31608A504', // Fidelity Wise Origin Bitcoin Fund
  ARKB: '040919102', // ARK 21Shares Bitcoin ETF (Cboe)
  BRRR: '91916J100', // Valkyrie Bitcoin Fund
  HODL: '92189K105', // VanEck Bitcoin Trust
  BTCW: '97789G109', // WisdomTree Bitcoin Fund
  BTCO: '46091J101', // Invesco Galaxy Bitcoin ETF (SEC 424B3)
  // Futures / Strategy
  BITO: '74347G440', // ProShares Bitcoin Strategy ETF
  BTF: '91917A108', // Valkyrie Bitcoin and Ether Strategy ETF
  // Ethereum
  ETHA: '46438R105', // iShares Ethereum Trust
  ETHE: '389638107', // Grayscale Ethereum Staking ETF
  ETHV: '92189L103', // VanEck Ethereum ETF
  CETH: '04071F102', // 21Shares Core Ethereum ETF (Cboe)
  TETH: '04071F102', // 21Shares Ethereum ETF
  // Grayscale
  GBTC: '389375104', // Grayscale Bitcoin Trust
  BTC: '389930207', // Grayscale Bitcoin Mini Trust
  // Blockchain / Fintech
  BLOK: '03208U303', // Amplify Transformational Data Sharing ETF
  FINX: '37954Y814', // Global X FinTech ETF
}
