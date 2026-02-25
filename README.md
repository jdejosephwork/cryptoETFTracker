# Crypto ETF Tracker

Track crypto weight exposure across exchange-traded funds (ETFs). Built with React + TypeScript and powered by the [Financial Modeling Prep (FMP)](https://financialmodelingprep.com/) API.

## Features

- **Ticker & Name** — ETF symbol and full name
- **Region / Country** — Top country allocation from FMP
- **Crypto Weight %** — Calculated from holdings exposure to crypto-related assets
- **CUSIP** — Fund identifier
- **Digital Asset Indicator** — Whether the ETF has meaningful crypto exposure

## Setup

1. **Clone and install**

   ```bash
   npm install
   ```

2. **FMP API key**

   Copy `.env.example` to `.env` and add your FMP API key:

   ```bash
   cp .env.example .env
   ```

   Edit `.env`:

   ```
   VITE_FMP_API_KEY=your_api_key_here
   ```

   Get a key at [financialmodelingprep.com](https://financialmodelingprep.com/register).

3. **Run the app**

   ```bash
   npm run dev
   ```

## CUSIP Data Sources

CUSIP is shown from:
1. **FMP API** (paid tier) – `etf/info` returns CUSIP when available
2. **Curated knowledge base** – Major crypto ETFs have CUSIPs from SEC filings/prospectuses
3. **Alternatives** – SEC EDGAR (prospectus/N-CEN filings) or other financial APIs (Polygon, etc.) can provide CUSIP; consider a backend scraper for production

## Tech Stack

- React 19 + TypeScript
- Vite 5
- FMP stable API
- Dark theme UI
