import { useState, useRef, useEffect } from 'react'
import type { CryptoEtfRow } from '../types/etf'
import { useEtfContext } from '../context/EtfContext'
import { useAuth } from '../context/AuthContext'
import './Profile.css'

interface ProfileProps {
  rows: CryptoEtfRow[]
}

export function Profile({ rows }: ProfileProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'watchlist' | 'export' | 'account'>('watchlist')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { watchlist, exportSelection, getWatchlistRows, clearExportSelection } = useEtfContext()
  const { user, loading: authLoading, signInWithGoogle, signInWithApple, signOut, isConfigured } = useAuth()

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const watchlistRows = getWatchlistRows(rows)
  const hasExportSelection = exportSelection.size > 0

  return (
    <div className="profile-wrap" ref={dropdownRef}>
      <button
        type="button"
        className="profile-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        title="Profile & settings"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        {watchlist.size > 0 && (
          <span className="profile-badge">{watchlist.size}</span>
        )}
      </button>

      {open && (
        <div className="profile-dropdown">
          <div className="profile-tabs">
            <button
              type="button"
              className={activeTab === 'watchlist' ? 'active' : ''}
              onClick={() => setActiveTab('watchlist')}
            >
              Watchlist ({watchlist.size})
            </button>
            <button
              type="button"
              className={activeTab === 'export' ? 'active' : ''}
              onClick={() => setActiveTab('export')}
            >
              Export ({exportSelection.size})
            </button>
            <button
              type="button"
              className={activeTab === 'account' ? 'active' : ''}
              onClick={() => setActiveTab('account')}
            >
              Account
            </button>
          </div>

          {activeTab === 'watchlist' && (
            <div className="profile-panel">
              {watchlistRows.length === 0 ? (
                <p className="profile-empty">No ETFs in your watchlist. Click the star on any row to add one.</p>
              ) : (
                <ul className="profile-list">
                  {watchlistRows.map((r) => (
                    <li key={r.ticker}>
                      <span className="profile-ticker">{r.ticker}</span>
                      <span className="profile-name">{r.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {activeTab === 'export' && (
            <div className="profile-panel">
              {!hasExportSelection ? (
                <p className="profile-empty">No rows selected for export. Click the + icon on any row to add it to your export selection.</p>
              ) : (
                <>
                  <p className="profile-hint">{exportSelection.size} row(s) selected. Use the Export dropdown to download.</p>
                  <button type="button" className="profile-clear-btn" onClick={clearExportSelection}>
                    Clear selection
                  </button>
                </>
              )}
            </div>
          )}

          {activeTab === 'account' && (
            <div className="profile-panel">
              {user ? (
                <>
                  <p className="profile-email">{user.email}</p>
                  <p className="profile-synced">Your watchlist syncs across devices.</p>
                  <button type="button" className="profile-logout-btn" onClick={signOut}>
                    Sign out
                  </button>
                </>
              ) : isConfigured ? (
                <>
                  <p className="profile-empty">Sign in to sync your watchlist across devices.</p>
                  <button
                    type="button"
                    className="profile-login-btn"
                    onClick={signInWithGoogle}
                    disabled={authLoading}
                  >
                    Sign in with Google
                  </button>
                  <button
                    type="button"
                    className="profile-login-btn profile-login-apple"
                    onClick={signInWithApple}
                    disabled={authLoading}
                  >
                    Sign in with Apple
                  </button>
                </>
              ) : (
                <p className="profile-empty">
                  Add Supabase credentials to enable sign in. See <code>.env.example</code>.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
