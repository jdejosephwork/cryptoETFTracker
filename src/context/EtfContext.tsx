import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { CryptoEtfRow } from '../types/etf'
import { useAuth } from './AuthContext'
import { useSubscription } from './SubscriptionContext'
import {
  fetchWatchlist,
  fetchExportSelection,
  addToWatchlist as sbAddWatchlist,
  removeFromWatchlist as sbRemoveWatchlist,
  addToExportSelection as sbAddExport,
  removeFromExportSelection as sbRemoveExport,
  clearExportSelection as sbClearExport
} from '../lib/supabaseData'

const WATCHLIST_KEY = 'crypto-etf-watchlist'
const EXPORT_SEL_KEY = 'crypto-etf-export-selection'

interface EtfContextValue {
  watchlist: Set<string>
  watchlistLimitReached: boolean
  exportSelection: Set<string>
  /** Filtered/sorted rows for export (set by EtfTable). Used by header Export. */
  rowsToExport: CryptoEtfRow[]
  setRowsToExport: (rows: CryptoEtfRow[]) => void
  toggleWatchlist: (ticker: string) => void
  toggleExportSelection: (ticker: string) => void
  isInWatchlist: (ticker: string) => boolean
  isInExportSelection: (ticker: string) => boolean
  getWatchlistRows: (rows: CryptoEtfRow[]) => CryptoEtfRow[]
  getExportSelectionRows: (rows: CryptoEtfRow[]) => CryptoEtfRow[]
  clearExportSelection: () => void
}

const EtfContext = createContext<EtfContextValue | null>(null)

function loadSetFromStorage(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const arr = JSON.parse(raw) as string[]
      return new Set(Array.isArray(arr) ? arr : [])
    }
  } catch {
    // ignore
  }
  return new Set()
}

function saveSetToStorage(key: string, set: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify([...set]))
  } catch {
    // ignore
  }
}

export function EtfProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { canAddWatchlist } = useSubscription()
  const [watchlist, setWatchlist] = useState<Set<string>>(() => loadSetFromStorage(WATCHLIST_KEY))
  const [exportSelection, setExportSelection] = useState<Set<string>>(() => loadSetFromStorage(EXPORT_SEL_KEY))
  const [rowsToExport, setRowsToExport] = useState<CryptoEtfRow[]>([])

  // Load from Supabase when user logs in
  useEffect(() => {
    if (user?.id) {
      Promise.all([
        fetchWatchlist(user.id),
        fetchExportSelection(user.id)
      ]).then(([wl, es]) => {
        setWatchlist(wl)
        setExportSelection(es)
      })
    } else {
      setWatchlist(loadSetFromStorage(WATCHLIST_KEY))
      setExportSelection(loadSetFromStorage(EXPORT_SEL_KEY))
    }
  }, [user?.id])

  // Save to localStorage when guest (no user)
  useEffect(() => {
    if (!user) {
      saveSetToStorage(WATCHLIST_KEY, watchlist)
      saveSetToStorage(EXPORT_SEL_KEY, exportSelection)
    }
  }, [user, watchlist, exportSelection])

  const toggleWatchlist = useCallback((ticker: string) => {
    const upper = ticker.toUpperCase()
    setWatchlist((prev) => {
      const adding = !prev.has(upper)
      if (adding && !canAddWatchlist(prev.size)) return prev
      const next = new Set(prev)
      if (adding) next.add(upper)
      else next.delete(upper)
      if (user?.id) {
        if (adding) sbAddWatchlist(user.id, ticker).catch(() => {})
        else sbRemoveWatchlist(user.id, ticker).catch(() => {})
      }
      return next
    })
  }, [user?.id, canAddWatchlist])

  const toggleExportSelection = useCallback((ticker: string) => {
    const upper = ticker.toUpperCase()
    setExportSelection((prev) => {
      const next = new Set(prev)
      const adding = !next.has(upper)
      if (adding) next.add(upper)
      else next.delete(upper)
      if (user?.id) {
        if (adding) sbAddExport(user.id, ticker).catch(() => {})
        else sbRemoveExport(user.id, ticker).catch(() => {})
      }
      return next
    })
  }, [user?.id])

  const clearExportSelection = useCallback(() => {
    setExportSelection(new Set())
    if (user?.id) sbClearExport(user.id).catch(() => {})
  }, [user?.id])

  const isInWatchlist = useCallback((ticker: string) => watchlist.has(ticker.toUpperCase()), [watchlist])
  const watchlistLimitReached = !canAddWatchlist(watchlist.size)
  const isInExportSelection = useCallback((ticker: string) => exportSelection.has(ticker.toUpperCase()), [exportSelection])

  const getWatchlistRows = useCallback(
    (rows: CryptoEtfRow[]) => rows.filter((r) => watchlist.has(r.ticker.toUpperCase())),
    [watchlist]
  )

  const getExportSelectionRows = useCallback(
    (rows: CryptoEtfRow[]) => {
      if (exportSelection.size === 0) return rows
      return rows.filter((r) => exportSelection.has(r.ticker.toUpperCase()))
    },
    [exportSelection]
  )

  const value: EtfContextValue = {
    watchlist,
    watchlistLimitReached,
    exportSelection,
    rowsToExport,
    setRowsToExport,
    toggleWatchlist,
    toggleExportSelection,
    isInWatchlist,
    isInExportSelection,
    getWatchlistRows,
    getExportSelectionRows,
    clearExportSelection,
  }

  return <EtfContext.Provider value={value}>{children}</EtfContext.Provider>
}

export function useEtfContext() {
  const ctx = useContext(EtfContext)
  if (!ctx) throw new Error('useEtfContext must be used within EtfProvider')
  return ctx
}
