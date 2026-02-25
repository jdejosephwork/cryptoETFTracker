import { supabase } from './supabase'

const WATCHLIST_TABLE = 'user_watchlist'
const EXPORT_SEL_TABLE = 'user_export_selection'

export async function fetchWatchlist(userId: string): Promise<Set<string>> {
  if (!supabase) return new Set()
  const { data, error } = await supabase
    .from(WATCHLIST_TABLE)
    .select('ticker')
    .eq('user_id', userId)
  if (error) return new Set()
  return new Set((data ?? []).map((r) => r.ticker.toUpperCase()))
}

export async function fetchExportSelection(userId: string): Promise<Set<string>> {
  if (!supabase) return new Set()
  const { data, error } = await supabase
    .from(EXPORT_SEL_TABLE)
    .select('ticker')
    .eq('user_id', userId)
  if (error) return new Set()
  return new Set((data ?? []).map((r) => r.ticker.toUpperCase()))
}

export async function addToWatchlist(userId: string, ticker: string): Promise<void> {
  if (!supabase) return
  await supabase.from(WATCHLIST_TABLE).upsert(
    { user_id: userId, ticker: ticker.toUpperCase() },
    { onConflict: 'user_id,ticker' }
  )
}

export async function removeFromWatchlist(userId: string, ticker: string): Promise<void> {
  if (!supabase) return
  await supabase
    .from(WATCHLIST_TABLE)
    .delete()
    .eq('user_id', userId)
    .eq('ticker', ticker.toUpperCase())
}

export async function addToExportSelection(userId: string, ticker: string): Promise<void> {
  if (!supabase) return
  await supabase.from(EXPORT_SEL_TABLE).upsert(
    { user_id: userId, ticker: ticker.toUpperCase() },
    { onConflict: 'user_id,ticker' }
  )
}

export async function removeFromExportSelection(userId: string, ticker: string): Promise<void> {
  if (!supabase) return
  await supabase
    .from(EXPORT_SEL_TABLE)
    .delete()
    .eq('user_id', userId)
    .eq('ticker', ticker.toUpperCase())
}

export async function clearExportSelection(userId: string): Promise<void> {
  if (!supabase) return
  await supabase
    .from(EXPORT_SEL_TABLE)
    .delete()
    .eq('user_id', userId)
}
