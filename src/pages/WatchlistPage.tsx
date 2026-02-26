import { Link } from 'react-router-dom'
import { useCryptoEtfData } from '../hooks/useCryptoEtfData'
import { useEtfContext } from '../context/EtfContext'
import './WatchlistPage.css'

export function WatchlistPage() {
  const { rows, loading, error } = useCryptoEtfData()
  const { getWatchlistRows, toggleWatchlist, isInWatchlist } = useEtfContext()
  const watchlistRows = getWatchlistRows(rows)

  if (loading) {
    return <div className="watchlist-page"><p className="watchlist-muted">Loading…</p></div>
  }

  if (error) {
    return <div className="watchlist-page"><p className="watchlist-error">{error}</p></div>
  }

  return (
    <div className="watchlist-page">
      <h2 className="watchlist-title">Your Watchlist</h2>
      <p className="watchlist-desc">
        Star ETFs from the tracker to see them here. Click a ticker to view full details.
      </p>

      {watchlistRows.length === 0 ? (
        <div className="watchlist-empty">
          <p>Your watchlist is empty.</p>
          <p className="watchlist-muted">
            Go to <Link to="/">ETF Tracker</Link> and click the star icon to add ETFs.
          </p>
        </div>
      ) : (
        <div className="watchlist-grid">
          {watchlistRows.map((row) => (
            <div key={row.ticker} className="watchlist-card">
              <div className="watchlist-card-header">
                <Link to={`/etf/${row.ticker}`} className="watchlist-card-ticker">
                  {row.ticker}
                </Link>
                <button
                  type="button"
                  className={`watchlist-star ${isInWatchlist(row.ticker) ? 'active' : ''}`}
                  onClick={() => toggleWatchlist(row.ticker)}
                  title="Remove from watchlist"
                  aria-label="Remove from watchlist"
                >
                  ★
                </button>
              </div>
              <Link to={`/etf/${row.ticker}`} className="watchlist-card-name">
                {row.name}
              </Link>
              <div className="watchlist-card-meta">
                <span>Crypto: {row.cryptoWeight != null && row.cryptoWeight > 0 ? `${row.cryptoWeight}%` : '—'}</span>
                <span>Exposure: {row.cryptoExposure ?? '—'}</span>
                <span>CUSIP: {row.cusip ?? '—'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
