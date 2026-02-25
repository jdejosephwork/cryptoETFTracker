import { useState, useEffect } from 'react'
import type { CryptoEtfRow } from '../types/etf'
import { fetchEtfDetail } from '../api/etfDetail'
import './EtfDetailModal.css'

interface EtfDetailModalProps {
  row: CryptoEtfRow | null
  onClose: () => void
}

export function EtfDetailModal({ row, onClose }: EtfDetailModalProps) {
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof fetchEtfDetail>> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!row) return
    setDetail(null)
    setError(null)
    setLoading(true)
    fetchEtfDetail(row.ticker)
      .then(setDetail)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [row?.ticker])

  if (!row) return null

  const q = detail?.quote
  const holdings = detail?.holdings ?? []

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{row.name}</h3>
          <span className="modal-ticker">{row.ticker}</span>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {loading && (
          <div className="modal-loading">Loading details…</div>
        )}

        {error && (
          <div className="modal-error">{error}</div>
        )}

        {!loading && !error && (
          <div className="modal-body">
            <div className="detail-section">
              <h4>Crypto Info</h4>
              <dl className="detail-grid">
                <dt>Crypto Weight</dt>
                <dd>{row.cryptoWeight > 0 ? `${row.cryptoWeight}%` : '—'}</dd>
                <dt>Crypto Exposure</dt>
                <dd>{row.cryptoExposure || '—'}</dd>
                <dt>BTC Held</dt>
                <dd>{row.btcHoldings != null ? row.btcHoldings.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}</dd>
                <dt>CUSIP</dt>
                <dd>{row.cusip || '—'}</dd>
                <dt>Region</dt>
                <dd>{row.region || '—'}</dd>
              </dl>
            </div>

            {q && (
              <div className="detail-section">
                <h4>Market Data</h4>
                <dl className="detail-grid">
                  <dt>Price</dt>
                  <dd>{q.price != null ? `$${q.price.toFixed(2)}` : '—'}</dd>
                  <dt>Day Change</dt>
                  <dd>
                    {q.change != null && q.changePercentage != null ? (
                      <span className={q.change >= 0 ? 'positive' : 'negative'}>
                        {q.change >= 0 ? '+' : ''}{q.change.toFixed(2)} ({q.changePercentage >= 0 ? '+' : ''}{q.changePercentage.toFixed(2)}%)
                      </span>
                    ) : '—'}
                  </dd>
                  <dt>Daily Volume</dt>
                  <dd>{q.volume != null ? q.volume.toLocaleString() : '—'}</dd>
                  <dt>52-Week Range</dt>
                  <dd>
                    {q.yearLow != null && q.yearHigh != null
                      ? `$${q.yearLow.toFixed(2)} – $${q.yearHigh.toFixed(2)}`
                      : '—'}
                  </dd>
                  <dt>Day Low / High</dt>
                  <dd>
                    {q.dayLow != null && q.dayHigh != null
                      ? `$${q.dayLow.toFixed(2)} / $${q.dayHigh.toFixed(2)}`
                      : '—'}
                  </dd>
                  <dt>Market Cap</dt>
                  <dd>{q.marketCap != null ? `$${(q.marketCap / 1e9).toFixed(2)}B` : '—'}</dd>
                  <dt>Exchange</dt>
                  <dd>{q.exchange || '—'}</dd>
                </dl>
              </div>
            )}

            {holdings.length > 0 && (
              <div className="detail-section">
                <h4>Top Holdings</h4>
                <ul className="holdings-list">
                  {holdings.slice(0, 10).map((h, i) => (
                    <li key={i}>
                      <span className="holding-name">{h.name || h.asset || '—'}</span>
                      {h.weightPercentage != null && (
                        <span className="holding-weight">{h.weightPercentage.toFixed(2)}%</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
