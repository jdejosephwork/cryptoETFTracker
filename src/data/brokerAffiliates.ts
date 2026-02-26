/**
 * Broker affiliate links for "Invest" / "Open account" CTAs.
 * Replace YOUR_REF with your actual affiliate/partner IDs once approved.
 * Leave empty string to use non-affiliate base URL.
 */
export interface BrokerLink {
  name: string
  url: string
  description: string
}

export const BROKER_AFFILIATES: BrokerLink[] = [
  {
    name: 'Fidelity',
    url: 'https://www.fidelity.com/customer-service/contact-us',
    description: 'Buy crypto ETFs',
  },
  {
    name: 'Schwab',
    url: 'https://www.schwab.com/open-an-account',
    description: 'Commission-free ETF trading',
  },
  {
    name: 'Coinbase',
    url: 'https://www.coinbase.com/join',
    description: 'Crypto & crypto ETFs',
  },
  {
    name: 'Robinhood',
    url: 'https://robinhood.com/referral',
    description: 'Commission-free investing',
  },
  {
    name: 'Public.com',
    url: 'https://public.com',
    description: 'Invest in ETFs',
  },
]
