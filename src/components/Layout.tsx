import { useState, useEffect } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { Profile } from './Profile'
import type { CryptoEtfRow } from '../types/etf'
import './Layout.css'

interface LayoutProps {
  rows: CryptoEtfRow[]
}

const NAV_ITEMS = [
  { to: '/', end: true, label: 'ETF Tracker', icon: '☰' },
  { to: '/watchlist', end: false, label: 'Watchlist', icon: '★' },
]

const SIDEBAR_COLLAPSED_KEY = 'crypto-etf-sidebar-collapsed'

export function Layout({ rows }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
    } catch {
      return false
    }
  })
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed ? '1' : '0')
    } catch {
      // ignore
    }
  }, [sidebarCollapsed])

  const closeMobileMenu = () => setMobileMenuOpen(false)

  return (
    <div className={`layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${mobileMenuOpen ? 'mobile-menu-open' : ''}`}>
      <button
        type="button"
        className="layout-mobile-menu-btn"
        onClick={() => setMobileMenuOpen((o) => !o)}
        aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {mobileMenuOpen ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </>
          ) : (
            <>
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </>
          )}
        </svg>
      </button>
      <div className="sidebar-backdrop" onClick={closeMobileMenu} aria-hidden />
      <aside className="sidebar">
        <nav className="sidebar-nav">
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed((c) => !c)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            )}
          </button>
          <NavLink to="/" className="sidebar-logo" end onClick={closeMobileMenu}>
            <span className="logo-icon">₿</span>
            <span className="sidebar-logo-text">Crypto ETF</span>
          </NavLink>
          <ul className="sidebar-links">
            {NAV_ITEMS.map(({ to, end, label, icon }) => (
              <li key={to}>
                <NavLink to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')} title={label} onClick={closeMobileMenu}>
                  <span className="nav-icon">{icon}</span>
                  <span className="nav-label">{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <div className="layout-main">
        <header className="layout-header">
          <div className="layout-header-title">
            <h1>Crypto ETF Tracker</h1>
            <p className="tagline">Track crypto weight exposure across exchange-traded funds</p>
          </div>
          <div className="layout-profile">
            <Profile rows={rows} />
          </div>
        </header>
        <main className="layout-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
