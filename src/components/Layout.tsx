import { Outlet, NavLink } from 'react-router-dom'
import { Profile } from './Profile'
import type { CryptoEtfRow } from '../types/etf'
import './Layout.css'

interface LayoutProps {
  rows: CryptoEtfRow[]
}

const NAV_ITEMS = [
  { to: '/', end: true, label: 'ETF Tracker' },
  { to: '/watchlist', end: false, label: 'Watchlist' },
]

export function Layout({ rows }: LayoutProps) {
  return (
    <div className="layout">
      <aside className="sidebar">
        <nav className="sidebar-nav">
          <NavLink to="/" className="sidebar-logo" end>
            <span className="logo-icon">₿</span>
            <span>Crypto ETF</span>
          </NavLink>
          <ul className="sidebar-links">
            {NAV_ITEMS.map(({ to, end, label }) => (
              <li key={to}>
                <NavLink to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>
                  {label}
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
