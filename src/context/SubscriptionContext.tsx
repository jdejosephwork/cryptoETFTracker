import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { useAuth } from './AuthContext'

const WATCHLIST_LIMIT_FREE = 5
const EXPORT_LIMIT_FREE = 10

interface SubscriptionContextValue {
  isPro: boolean
  loading: boolean
  watchlistLimit: number
  exportLimit: number
  canAddWatchlist: (currentSize: number) => boolean
  canExport: (rowCount: number) => boolean
  refresh: () => Promise<void>
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null)

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const [isPro, setIsPro] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchStatus = useCallback(async () => {
    if (!session?.access_token) {
      setIsPro(false)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/subscription', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = (await res.json()) as { isPro?: boolean }
      setIsPro(data.isPro ?? false)
    } catch {
      setIsPro(false)
    } finally {
      setLoading(false)
    }
  }, [session?.access_token])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const watchlistLimit = isPro ? 999 : WATCHLIST_LIMIT_FREE
  const exportLimit = isPro ? 999 : EXPORT_LIMIT_FREE

  const canAddWatchlist = useCallback(
    (currentSize: number) => currentSize < watchlistLimit,
    [watchlistLimit]
  )

  const canExport = useCallback(
    (rowCount: number) => rowCount <= exportLimit,
    [exportLimit]
  )

  const value: SubscriptionContextValue = {
    isPro,
    loading,
    watchlistLimit,
    exportLimit,
    canAddWatchlist,
    canExport,
    refresh: fetchStatus,
  }

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  )
}

const DEFAULT_SUBSCRIPTION: SubscriptionContextValue = {
  isPro: false,
  loading: false,
  watchlistLimit: WATCHLIST_LIMIT_FREE,
  exportLimit: EXPORT_LIMIT_FREE,
  canAddWatchlist: (n) => n < WATCHLIST_LIMIT_FREE,
  canExport: (n) => n <= EXPORT_LIMIT_FREE,
  refresh: async () => {},
}

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext)
  return ctx ?? DEFAULT_SUBSCRIPTION
}
