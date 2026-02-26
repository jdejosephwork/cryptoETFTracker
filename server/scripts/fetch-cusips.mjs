#!/usr/bin/env node
/**
 * One-time script to fetch CUSIPs from FMP API for crypto ETF symbols.
 * Run from server/: node scripts/fetch-cusips.mjs
 */
import 'dotenv/config'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SYMBOLS = [
  'IBIT', 'BITB', 'FBTC', 'ARKB', 'BRRR', 'BTCW', 'HODL', 'BITO', 'BITS', 'BTF',
  'DEFI', 'BLOK', 'BITQ', 'CRYP', 'BTEK', 'DAPP', 'BLCN', 'GBTC', 'BTC', 'BTCC',
  'ETCG', 'ETHB', 'BCHG', 'GDLC', 'OBTC', 'SATO', 'BKCH', 'FINX', 'KOIN', 'CETH',
  'EETH', 'ETHE', 'ETHV', 'ETHA', 'QETH', 'TETH', 'WGMI', 'BTCO', 'BTGD', 'BPI',
  'BITX', 'BITI', 'KRYP', 'BETE', 'CRPT', 'BLKC', 'DECO', 'ARKF', 'ETHW', 'NEHI',
  'YETH', 'XBCI', 'YBIT', 'EZBC'
]

const apiKey = process.env.FMP_API_KEY
if (!apiKey) {
  console.error('Missing FMP_API_KEY in .env')
  process.exit(1)
}

async function getCusip(symbol) {
  try {
    const url = `https://financialmodelingprep.com/stable/search-symbol?query=${symbol}&apikey=${apiKey}`
    const res = await fetch(url)
    const data = await res.json()
    const arr = Array.isArray(data) ? data : data?.data ?? []
    const match = arr.find((r) => (r.symbol || '').toUpperCase() === symbol.toUpperCase())
    if (!match) return null
    if (match.cusip) return match.cusip
    if (match.isin && match.isin.startsWith('US') && match.isin.length >= 11) {
      return match.isin.slice(2, 11)
    }
    return null
  } catch (e) {
    console.error(`Error fetching ${symbol}:`, e.message)
    return null
  }
}

async function main() {
  const results = {}
  for (const sym of SYMBOLS) {
    const cusip = await getCusip(sym)
    results[sym] = cusip || '—'
    console.log(`${sym}: ${results[sym]}`)
    await new Promise((r) => setTimeout(r, 250))
  }
  console.log('\n--- JSON for knowledge base ---')
  console.log(JSON.stringify(results, null, 2))
}

main()
