# Monetization Setup

This project includes three monetization features:

## 1. Affiliate links

**Location:** ETF detail page ("Open an account to invest"), footer disclaimer

**Setup:** Edit `src/data/brokerAffiliates.ts` to add your affiliate URLs. Replace placeholder URLs with your partner/referral links from broker programs (Fidelity, Schwab, Coinbase, Robinhood, etc.).

## 2. Sponsored / featured ETF listings

**Location:** `src/data/sponsoredEtfs.ts`, table + detail badges

**Setup:** Add entries for ETFs where issuers pay for placement:

```ts
export const SPONSORED_ETFS: Record<string, SponsoredEtf> = {
  IBIT: { ticker: 'IBIT', sponsoredBy: 'BlackRock', badge: 'Featured' },
}
```

## 3. Pro subscriptions (Stripe)

**Limits:**
- Free: 5 watchlist items, 10 export rows
- Pro: Unlimited

**Server env** (`server/.env`):
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
```

**Stripe setup:**
1. Create a product + recurring price in Stripe Dashboard
2. Copy the Price ID (`price_...`) to `STRIPE_PRICE_ID`
3. Add webhook endpoint: `https://your-domain.com/api/stripe-webhook`
4. Subscribe to events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
5. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

**Supabase:**
1. Run `supabase/schema.sql` (includes `user_subscriptions` table)
2. Get your project URL and service role key from Supabase Dashboard

**Flow:** User signs in → Profile → "Upgrade to Pro" → Stripe Checkout → Webhook updates `user_subscriptions` → User gets Pro status
