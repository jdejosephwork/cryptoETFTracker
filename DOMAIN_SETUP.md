# Domain Setup: cryptoetftracker.net

Step-by-step guide to connect your domain and go live.

---

## Overview

| Component | URL | Host |
|-----------|-----|------|
| **Your app** | https://cryptoetftracker.net | Vercel |
| **Auth (Supabase)** | https://auth.cryptoetftracker.net | Supabase custom domain |
| **Backend API** | Your backend host (see below) | Railway / Render |

---

## Step 1: Deploy the App

### 1a. Deploy frontend to Vercel (free)

1. Go to [vercel.com](https://vercel.com) and sign in (use GitHub).
2. Click **Add New** → **Project**.
3. Import your `cryptoETFTracker` repo from GitHub (push your code first if needed).
4. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `./` (leave default)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Add **Environment Variables:**
   - `VITE_SUPABASE_URL` = `https://yygtxhxklqdakpwdkfkj.supabase.co` (update after custom domain)
   - `VITE_SUPABASE_ANON_KEY` = your publishable key
   - `VITE_API_URL` = your backend URL (add after Step 2)
6. Click **Deploy**.

You'll get a URL like `cryptoetftracker.vercel.app`.

### 1b. Deploy backend to Railway or Render

**Railway** (recommended):

1. Go to [railway.app](https://railway.app) and sign in.
2. **New Project** → **Deploy from GitHub** → select your repo.
3. Configure to use the `server/` folder or set **Root Directory** to `server`.
4. Add env vars: `FMP_API_KEY`, `PORT=3001`, etc.
5. Deploy. Copy the public URL (e.g. `https://cryptoetftracker-production.up.railway.app`).

**Render** works similarly: create a Web Service, point to your repo, set root to `server/`, add env vars.

---

## Step 2: Connect Domain in Vercel

1. In Vercel: **Project** → **Settings** → **Domains**.
2. Add `cryptoetftracker.net` and `www.cryptoetftracker.net`.
3. Vercel shows DNS records to add.

---

## Step 3: DNS in Squarespace

1. Log in to [Squarespace](https://www.squarespace.com) → **Domains** → **cryptoetftracker.net**.
2. Go to **DNS Settings** / **Advanced Settings**.
3. Add records:

**For main site (Vercel):** Use the exact records shown in your Vercel Domains dashboard:

| Type | Host | Value |
|------|------|-------|
| A | @ | 216.198.79.1 |
| CNAME | www | 699c6a30dcd4efe8.vercel-dns-017.com |

> Note: Vercel has expanded their IP ranges. Older values (76.76.21.21, cname.vercel-dns.com) still work but the new ones above are recommended.

**For auth subdomain (add after Step 4):**

| Type | Host | Value |
|------|------|-------|
| CNAME | auth | (from Supabase) |

4. Save. DNS can take 5–60 minutes to update.

---

## Step 4: Supabase Custom Domain (auth.cryptoetftracker.net)

> **Note:** Custom domains are a paid add-on. In Supabase → **Settings** → **Add-ons**, enable **Custom Domain** if needed.

### 4a. Add domain in Supabase

1. Supabase Dashboard → **Project Settings** → **General** → **Custom Domains** (or **Settings** → **Add-ons** → Custom Domain).
2. Click **Add custom domain** / **Configure custom domain**.
3. Enter: `auth.cryptoetftracker.net`
4. Supabase will show:
   - **CNAME target:** `yygtxhxklqdakpwdkfkj.supabase.co`
   - **TXT record** (for verification): `_acme-challenge.auth` → a value like `ca3-xxxxx`

### 4b. Add DNS records in Squarespace

In **Domains** → **cryptoetftracker.net** → **DNS Settings** → **Custom Records**:

| Type | Host | Value |
|------|------|-------|
| CNAME | auth | yygtxhxklqdakpwdkfkj.supabase.co |
| TXT | _acme-challenge.auth | (copy exact value from Supabase) |

> Some DNS providers auto-append the domain. If `auth` creates `auth.cryptoetftracker.net` correctly, use `auth`. For the TXT host, Supabase may show `_acme-challenge.auth.cryptoetftracker.net` — in Squarespace you might enter just `_acme-challenge.auth`.

### 4c. Verify and activate

1. Save DNS. Wait 5–15 minutes for propagation.
2. In Supabase, click **Verify** / **Reverify**. SSL and activation can take up to ~30 minutes.
3. After activation, Supabase will serve Auth from `https://auth.cryptoetftracker.net`.

---

## Step 5: Update Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services** → **Credentials**.
2. Open your OAuth 2.0 Client ID.
3. Under **Authorized redirect URIs**, add:
   ```
   https://auth.cryptoetftracker.net/auth/v1/callback
   ```
4. Save. (Keep the Supabase one until auth works.)

---

## Step 6: Update Supabase Auth URLs

1. Supabase → **Authentication** → **URL Configuration**.
2. **Site URL:** `https://cryptoetftracker.net`
3. **Redirect URLs:** add `https://cryptoetftracker.net` and `https://www.cryptoetftracker.net`.
4. Save.

---

## Step 7: Update App Environment Variables

**In Vercel** (Frontend):

- `VITE_SUPABASE_URL` = `https://auth.cryptoetftracker.net`
- `VITE_API_URL` = your Railway/Render backend URL (e.g. `https://xxx.railway.app`)

Redeploy the frontend so it picks up the new variables.

---

## Step 8: Test

1. Visit https://cryptoetftracker.net
2. Click **Profile** → **Account** → **Sign in with Google**
3. Confirm Google redirect uses `auth.cryptoetftracker.net` (not the Supabase default URL).

---

## Checklist

- [ ] Code pushed to GitHub
- [ ] Frontend deployed to Vercel
- [ ] Backend deployed to Railway/Render
- [ ] Domain `cryptoetftracker.net` added in Vercel
- [ ] DNS records added in Squarespace
- [ ] Supabase custom domain `auth.cryptoetftracker.net` configured
- [ ] CNAME for `auth` added in Squarespace
- [ ] Google OAuth redirect URI updated
- [ ] Supabase Site URL and Redirect URLs updated
- [ ] Vercel env vars updated and redeployed
- [ ] End-to-end flow tested
