import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import type { CryptoEtfRow } from '../types/etf'
import { useEtfContext } from '../context/EtfContext'
import { useAuth } from '../context/AuthContext'
import { useSubscription } from '../context/SubscriptionContext'
import { exportToCsv, exportToJson, exportToExcel } from '../lib/exportUtils'
import './Profile.css'

interface ProfileProps {
  rows: CryptoEtfRow[]
}

export function Profile({ rows }: ProfileProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'watchlist' | 'export' | 'account'>('watchlist')
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [exportMenuRect, setExportMenuRect] = useState<DOMRect | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const exportBtnRef = useRef<HTMLButtonElement>(null)
  const exportMenuRef = useRef<HTMLDivElement>(null)
  const { watchlist, exportSelection, rowsToExport, getWatchlistRows, clearExportSelection } = useEtfContext()
  const { user, session, loading: authLoading, signInWithGoogle, signInWithApple, signOut, isConfigured } = useAuth()
  const { isPro, loading: subLoading, canExport, exportLimit } = useSubscription()
  const [upgradeLoading, setUpgradeLoading] = useState(false)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      const inDropdown = dropdownRef.current?.contains(target)
      const inExportMenu = exportMenuRef.current?.contains(target)
      if (!inDropdown && !inExportMenu) {
        setOpen(false)
        setExportMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useLayoutEffect(() => {
    if (exportMenuOpen && exportBtnRef.current) {
      setExportMenuRect(exportBtnRef.current.getBoundingClientRect())
    } else {
      setExportMenuRect(null)
    }
  }, [exportMenuOpen])

  function handleExport(format: 'csv' | 'json' | 'excel') {
    if (!canExport(rowsForExport.length)) {
      setExportMenuOpen(false)
      return
    }
    if (format === 'csv') exportToCsv(rowsForExport)
    else if (format === 'json') exportToJson(rowsForExport)
    else exportToExcel(rowsForExport)
    setExportMenuOpen(false)
  }

  async function handleUpgrade() {
    if (!session?.access_token) return
    setUpgradeLoading(true)
    try {
      const base = window.location.origin
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          successUrl: `${base}/?upgraded=1`,
          cancelUrl: base,
        }),
      })
      const data = (await res.json()) as { url?: string; error?: string }
      if (data.url) window.location.href = data.url
      else console.error(data.error)
    } catch (e) {
      console.error(e)
    } finally {
      setUpgradeLoading(false)
    }
  }

  const watchlistRows = getWatchlistRows(rows)
  const hasExportSelection = exportSelection.size > 0
  const rowsForExport =
    hasExportSelection
      ? rowsToExport.filter((r: CryptoEtfRow) => exportSelection.has(r.ticker.toUpperCase()))
      : rowsToExport

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
              onClick={() => { setActiveTab('export'); setExportMenuOpen(false); }}
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
            <div className="profile-panel profile-export-panel">
              {rowsForExport.length === 0 ? (
                <div className="profile-export-empty">
                  <span className="profile-export-empty-icon" aria-hidden>↓</span>
                  <p className="profile-empty">
                    {hasExportSelection
                      ? 'No matching rows in current view. Adjust filters or clear selection.'
                      : 'No data to export yet. Load ETFs first.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="profile-export-header">
                    <span className="profile-export-count">{rowsForExport.length}</span>
                    <span className="profile-export-label">row{rowsForExport.length !== 1 ? 's' : ''} ready to export</span>
                    {!canExport(rowsForExport.length) && (
                      <span className="profile-export-limit">(Pro required for &gt;{exportLimit})</span>
                    )}
                  </div>
                  <div className="profile-export-download">
                    <button
                      ref={exportBtnRef}
                      type="button"
                      className="profile-export-btn"
                      onClick={() => setExportMenuOpen((o) => !o)}
                      disabled={!canExport(rowsForExport.length)}
                      aria-expanded={exportMenuOpen}
                      aria-haspopup="true"
                      title={!canExport(rowsForExport.length) ? `Upgrade to Pro to export more than ${exportLimit} rows` : undefined}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Download
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="profile-export-chevron">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    {exportMenuOpen && exportMenuRect &&
                      createPortal(
                        <div
                          ref={exportMenuRef}
                          className="profile-export-menu profile-export-menu-popout"
                          role="menu"
                          style={{
                            position: 'fixed',
                            top: exportMenuRect.bottom + 4,
                            left: exportMenuRect.left,
                            minWidth: exportMenuRect.width,
                          }}
                        >
                          <button type="button" role="menuitem" onClick={() => handleExport('csv')}>CSV</button>
                          <button type="button" role="menuitem" onClick={() => handleExport('json')}>JSON</button>
                          <button type="button" role="menuitem" onClick={() => handleExport('excel')}>Excel</button>
                        </div>,
                        document.body
                      )}
                  </div>
                  {hasExportSelection && (
                    <button type="button" className="profile-clear-btn profile-export-clear" onClick={clearExportSelection}>
                      Clear selection
                    </button>
                  )}
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
                  {!isPro && (
                    <div className="profile-upgrade-block">
                      <p className="profile-upgrade-text">Free: 5 watchlist, 10 export rows. Upgrade for unlimited.</p>
                      <button
                        type="button"
                        className="profile-upgrade-btn"
                        onClick={handleUpgrade}
                        disabled={upgradeLoading || subLoading}
                      >
                        {upgradeLoading ? 'Redirecting…' : 'Upgrade to Pro'}
                      </button>
                    </div>
                  )}
                  {isPro && <p className="profile-pro-badge">Pro</p>}
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
