/**
 * Sponsored / featured ETF listings.
 * ETF issuers can pay for placement. Add ticker + sponsor info here.
 */
export interface SponsoredEtf {
  ticker: string
  sponsoredBy: string
  badge?: string
}

export const SPONSORED_ETFS: Record<string, SponsoredEtf> = {
  // Example: IBIT: { ticker: 'IBIT', sponsoredBy: 'BlackRock', badge: 'Featured' },
}
