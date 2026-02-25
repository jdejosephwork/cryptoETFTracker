/**
 * Additional CUSIP lookups for crypto ETFs when FMP and knowledge base lack them.
 * Sourced from SEC filings, prospectuses, and public financial databases.
 * Update this file as new CUSIPs are discovered.
 */
export const CUSIP_OVERRIDES: Record<string, string> = {
  BITQ: '09175C103', // Bitwise Crypto Industry Innovators ETF
  // Add more as discovered from SEC filings, prospectuses, etfdb.com, etc.
}
