/**
 * Stripe checkout and webhook for Pro subscriptions.
 * Requires: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripeKey = process.env.STRIPE_SECRET_KEY
const priceId = process.env.STRIPE_PRICE_ID
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const stripe = stripeKey ? new Stripe(stripeKey) : null

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null

export function isStripeConfigured(): boolean {
  return !!(stripe && priceId && supabase)
}

export async function getUserFromToken(bearerToken: string): Promise<{ id: string; email?: string } | null> {
  if (!supabase || !bearerToken?.startsWith('Bearer ')) return null
  const token = bearerToken.slice(7)
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return null
    return { id: user.id, email: user.email }
  } catch {
    return null
  }
}

export async function createCheckoutSession(userId: string, email: string, successUrl: string, cancelUrl: string): Promise<string | null> {
  if (!stripe || !priceId) return null
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: userId,
    customer_email: email,
    metadata: { user_id: userId },
  })
  return session.url
}

export async function upsertSubscription(
  userId: string,
  stripeCustomerId: string | null,
  stripeSubscriptionId: string | null,
  status: string
): Promise<void> {
  if (!supabase) return
  await supabase.from('user_subscriptions').upsert(
    {
      user_id: userId,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
      status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )
}

export async function getSubscriptionStatus(userId: string): Promise<{ isPro: boolean }> {
  if (!supabase) return { isPro: false }
  const { data } = await supabase
    .from('user_subscriptions')
    .select('status')
    .eq('user_id', userId)
    .single()
  const active = data?.status === 'active'
  return { isPro: active }
}

export async function updateSubscriptionFromStripe(sub: import('stripe').Subscription): Promise<void> {
  if (!supabase) return
  const status = sub.status === 'active' ? 'active' : 'canceled'
  const { data: existing } = await supabase
    .from('user_subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', sub.id)
    .single()
  if (existing?.user_id) {
    await upsertSubscription(existing.user_id, sub.customer as string, sub.id, status)
  }
}
