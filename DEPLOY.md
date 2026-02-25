# Multi-User / Public Deployment

This guide covers deploying the Crypto ETF Tracker as a multi-user or public app with a backend API and daily data sync.

## Architecture

- **Frontend**: React + Vite (static build)
- **Backend**: Express API (`server/`) in TypeScript, runs via `tsx`, serving cached ETF data
- **Sync**: Daily job fetches from FMP + btcetfdata, merges, and saves to `server/data/etfs.json`
- **Flow**: Users hit `GET /api/etfs`; no FMP key exposed to the client

## Local Development

### 1. Install dependencies

```bash
npm install
cd server && npm install && cd ..
```

### 2. Configure environment

Create `server/.env` (copy from `server/.env.example`):

```
FMP_API_KEY=your_fmp_api_key_here
```

### 3. Run backend and frontend

**Terminal 1 – backend (runs sync on startup if cache empty):**
```bash
npm run dev:server
```

**Terminal 2 – frontend:**
```bash
npm run dev
```

Vite proxies `/api` to `http://localhost:3001`. The frontend will use the backend when available and fall back to direct FMP/btcetfdata otherwise.

## Production Deployment

### Option A: Single host (e.g. Railway, Render, Fly.io)

1. **Deploy** the whole repo (frontend + server).
2. **Build** frontend: `npm run build`
3. **Serve** static files from `dist/` and run the Express server; route `/api/*` to Express, everything else to `index.html`.
4. **Env vars** on the host: `FMP_API_KEY`, optionally `SYNC_API_KEY`, `CUSIP_DATA_URL`, `PORT`.

### Option B: Separate frontend and backend

1. **Backend** (Railway, Render, Fly.io, etc.):
   - Deploy `server/` (or run from repo root with `node server/index.js`).
   - Set `FMP_API_KEY`, `CUSIP_DATA_URL`, `SYNC_API_KEY`, `PORT`.
   - Enable CORS (already configured for `*`; restrict in production if needed).

2. **Frontend** (Vercel, Netlify, etc.):
   - Build with `VITE_API_URL=https://your-backend.railway.app` (or your backend URL).
   - Deploy the `dist/` output.

### Cron / External trigger for sync

The backend runs a daily sync at 6:00 UTC via `node-cron`. To trigger sync externally (e.g. from [cron-job.org](https://cron-job.org)):

```
POST https://your-backend.example.com/api/sync
Authorization: Bearer YOUR_SYNC_API_KEY
```

Set `SYNC_API_KEY` on the backend; omit it to allow unauthenticated sync (only for trusted setups).

## Environment Variables

| Variable        | Where        | Required | Description                                   |
|-----------------|--------------|----------|-----------------------------------------------|
| `FMP_API_KEY`   | server/.env  | Yes      | FMP API key for ETF/holdings data             |
| `CUSIP_DATA_URL`| server/.env  | No       | URL to JSON ticker→CUSIP map                  |
| `SYNC_API_KEY`  | server/.env  | No       | Secret to protect `POST /api/sync`            |
| `PORT`          | server/.env  | No       | Backend port (default 3001)                   |
| `VITE_API_URL`  | build-time   | No       | Backend base URL for production frontend      |

## API Endpoints

| Method | Path         | Description                    |
|--------|--------------|--------------------------------|
| GET    | /api/etfs    | Cached ETF data (read-only)   |
| POST   | /api/sync    | Trigger data sync             |
| GET    | /api/health  | Health check + last sync time  |
