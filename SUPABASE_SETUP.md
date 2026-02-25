# Supabase Setup Guide

Follow these steps to enable user accounts and watchlist sync.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New project**
3. Choose your org, name the project, set a database password, pick a region
4. Wait for the project to finish provisioning

## 2. Get your API keys

1. In the Supabase dashboard: **Settings** → **API**
2. Copy:
   - **Project URL**
   - **anon public** key (under "Project API keys")

## 3. Add to your app

Create or edit `.env` in the project root:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Restart the dev server (`npm run dev`) after changing `.env`.

## 4. Create the database tables

1. In Supabase: **SQL Editor** → **New query**
2. Copy the contents of `supabase/schema.sql` and paste it
3. Click **Run**

This creates `user_watchlist` and `user_export_selection` with Row Level Security.

## 5. Enable Google Sign-In

1. In Supabase: **Authentication** → **Providers** → **Google**
2. Enable it
3. You need Google OAuth credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**
   - Create **OAuth 2.0 Client ID** (Web application)
   - Add **Authorized redirect URIs**: `https://your-project-id.supabase.co/auth/v1/callback`
   - For local dev, also add: `http://localhost:5173` (or your dev URL)
4. Copy **Client ID** and **Client Secret** into Supabase Google provider

## 6. Enable Apple Sign-In (optional)

Apple Sign-In requires an Apple Developer account ($99/year).

1. In Supabase: **Authentication** → **Providers** → **Apple**
2. Enable and follow Supabase’s Apple setup docs
3. Configure Services ID, Key ID, Team ID, etc. in Apple Developer

---

## Redirect URLs for production

Before deploying, add your production URL to Supabase:

1. **Authentication** → **URL Configuration**
2. Set **Site URL** to your app URL (e.g. `https://your-app.vercel.app`)
3. Add the same URL to **Redirect URLs**
