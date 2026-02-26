import { useState, useEffect, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchEtfDetail, fetchEtfDetailExtended } from '../api/etfDetail'
import type { EtfDetailExtendedResponse } from '../api/etfDetail'
import './EtfDetailPage.css'

export function EtfDetailPage() {
  const { symbol } = useParams<{ symbol: string }>()
  const [data, setData] = useState<EtfDetailExtendedResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [extendedLoading, setExtendedLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!symbol) return
    setLoading(true)
    setError(null)
    try {
      const basic = await fetchEtfDetail(symbol)
      setData(basic)
      setExtendedLoading(true)
      try {
        const ext = await fetchEtfDetailExtended(symbol)
        setData(ext)
      } catch {
        // Keep basic data; extended is optional
      } finally {
        setExtendedLoading(false)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [symbol])

  useEffect(() => {
    load()
  }, [load])

  if (!symbol) {
    return (
      <div className="etf-detail-page">
        <Link to="/" className="etf-detail-back">← Back to ETFs</Link>
        <p className="etf-detail-error">Invalid symbol</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="etf-detail-page">
        <Link to="/" className="etf-detail-back">← Back to ETFs</Link>
        <div className="etf-detail-skeleton">
          <div className="skeleton-header">
            <div className="skeleton-title" />
            <div className="skeleton-price" />
          </div>
          <div className="etf-detail-grid">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="etf-detail-card etf-detail-skeleton-card">
                <div className="skeleton-line" style={{ width: '40%' }} />
                <div className="skeleton-line" style={{ width: '80%' }} />
                <div className="skeleton-line" style={{ width: '60%' }} />
                <div className="skeleton-line" style={{ width: '70%' }} />
              </div>
            ))}
            <div className="etf-detail-card etf-detail-card-wide etf-detail-skeleton-card">
              <div className="skeleton-line" style={{ width: '30%' }} />
              <div className="skeleton-bars">
                {[65, 45, 80, 30, 55].map((w, j) => (
                  <div key={j} className="skeleton-bar" style={{ width: `${w}%` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="etf-detail-page">
        <Link to="/" className="etf-detail-back">← Back to ETFs</Link>
        <div className="etf-detail-error-box">
          <p className="etf-detail-error">{error || 'Failed to load'}</p>
          <a href="/api/diagnostic" target="_blank" rel="noopener noreferrer" className="etf-detail-diagnostic-link">
            Check API status
          </a>
          <button type="button" className="etf-detail-retry" onClick={load}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  const q = data.quote
  const holdings = data.holdings ?? []
  const info = data.info as { expenseRatio?: number; expense_ratio?: number; aum?: number; totalAssets?: number; name?: string } | undefined
  const expenseRatio = info?.expenseRatio ?? info?.expense_ratio
  const aum = info?.aum ?? (info as { totalAssets?: number })?.totalAssets
  const countries = data.countryWeightings ?? []
  const sectors = data.sectorWeightings ?? []
  const chart = data.chart ?? []
  const news = data.news ?? []
  const displayName = q?.name || info?.name || symbol

  return (
    <div className="etf-detail-page">
      <Link to="/" className="etf-detail-back">← Back to ETFs</Link>

      <header className="etf-detail-header">
        <div>
          <h1 className="etf-detail-title">{displayName}</h1>
          <span className="etf-detail-symbol">{symbol}</span>
        </div>
        {q?.price != null && (
          <div className="etf-detail-price-block">
            <span className="etf-detail-price">${q.price.toFixed(2)}</span>
            {q.change != null && q.changePercentage != null && (
              <span className={`etf-detail-change ${q.change >= 0 ? 'positive' : 'negative'}`}>
                {q.change >= 0 ? '+' : ''}{q.change.toFixed(2)} ({q.changePercentage >= 0 ? '+' : ''}{q.changePercentage.toFixed(2)}%)
              </span>
            )}
          </div>
        )}
      </header>

      <div className="etf-detail-grid">
        {/* Market data */}
        <section className="etf-detail-card">
          <h3>Market Data</h3>
          <dl className="etf-detail-dl">
            <dt>Price</dt>
            <dd>{q?.price != null ? `$${q.price.toFixed(2)}` : '—'}</dd>
            <dt>Day Change</dt>
            <dd>
              {q?.change != null && q.changePercentage != null ? (
                <span className={q.change >= 0 ? 'positive' : 'negative'}>
                  {q.change >= 0 ? '+' : ''}{q.change.toFixed(2)} ({q.changePercentage >= 0 ? '+' : ''}{q.changePercentage.toFixed(2)}%)
                </span>
              ) : '—'}
            </dd>
            <dt>Volume</dt>
            <dd>{q?.volume != null ? q.volume.toLocaleString() : '—'}</dd>
            <dt>52-Week Range</dt>
            <dd>
              {q?.yearLow != null && q?.yearHigh != null
                ? `$${q.yearLow.toFixed(2)} – $${q.yearHigh.toFixed(2)}`
                : '—'}
            </dd>
            <dt>Market Cap</dt>
            <dd>{q?.marketCap != null ? `$${(q.marketCap / 1e9).toFixed(2)}B` : '—'}</dd>
            <dt>Exchange</dt>
            <dd>{q?.exchange || '—'}</dd>
          </dl>
        </section>

        {/* Fund info */}
        {(expenseRatio != null || aum != null) && (
          <section className="etf-detail-card">
            <h3>Fund Info</h3>
            <dl className="etf-detail-dl">
              {expenseRatio != null && (
                <>
                  <dt>Expense Ratio</dt>
                  <dd>{expenseRatio.toFixed(2)}%</dd>
                </>
              )}
              {aum != null && (
                <>
                  <dt>AUM</dt>
                  <dd>${(aum / 1e9).toFixed(2)}B</dd>
                </>
              )}
            </dl>
          </section>
        )}

        {/* Sector weightings */}
        {sectors.length > 0 && (
          <section className="etf-detail-card etf-detail-card-wide">
            <h3>Sector Allocation</h3>
            <div className="etf-detail-bars">
              {sectors.slice(0, 10).map((s, i) => (
                <div key={i} className="etf-detail-bar-row">
                  <span className="etf-detail-bar-label">{s.sector || '—'}</span>
                  <div className="etf-detail-bar-track">
                    <div
                      className="etf-detail-bar-fill"
                      style={{ width: `${Math.min(100, s.weightPercentage ?? 0)}%` }}
                    />
                  </div>
                  <span className="etf-detail-bar-pct">{(s.weightPercentage ?? 0).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Country weightings */}
        {countries.length > 0 && (
          <section className="etf-detail-card etf-detail-card-wide">
            <h3>Country Allocation</h3>
            <div className="etf-detail-bars">
              {countries.slice(0, 10).map((c, i) => (
                <div key={i} className="etf-detail-bar-row">
                  <span className="etf-detail-bar-label">{c.country || '—'}</span>
                  <div className="etf-detail-bar-track">
                    <div
                      className="etf-detail-bar-fill"
                      style={{ width: `${Math.min(100, c.weightPercentage ?? 0)}%` }}
                    />
                  </div>
                  <span className="etf-detail-bar-pct">{(c.weightPercentage ?? 0).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Price chart */}
        {chart.length > 0 && (
          <section className="etf-detail-card etf-detail-card-wide">
            <h3>Price (60 days)</h3>
            <div className="etf-detail-chart">
              {chart.map((p, i) => {
                const vals = chart.map((x) => x.close ?? 0).filter(Boolean)
                const min = Math.min(...vals)
                const max = Math.max(...vals)
                const range = max - min || 1
                const h = ((p.close ?? 0) - min) / range * 100
                return (
                  <div
                    key={i}
                    className="etf-detail-chart-bar"
                    style={{ height: `${h}%` }}
                    title={`${p.date}: $${(p.close ?? 0).toFixed(2)}`}
                  />
                )
              })}
            </div>
            <div className="etf-detail-chart-labels">
              <span>{chart[0]?.date ?? ''}</span>
              <span>{chart[chart.length - 1]?.date ?? ''}</span>
            </div>
          </section>
        )}

        {/* Holdings */}
        {holdings.length > 0 && (
          <section className="etf-detail-card etf-detail-card-wide">
            <h3>Top Holdings</h3>
            <ul className="etf-detail-holdings">
              {holdings.slice(0, 15).map((h, i) => (
                <li key={i}>
                  <span className="holding-name">{h.name || h.asset || '—'}</span>
                  {h.weightPercentage != null && (
                    <span className="holding-weight">{h.weightPercentage.toFixed(2)}%</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* News */}
        {news.length > 0 && (
          <section className="etf-detail-card etf-detail-card-wide">
            <h3>Recent News</h3>
            <ul className="etf-detail-news">
              {news.map((n, i) => (
                <li key={i}>
                  <a href={n.url} target="_blank" rel="noopener noreferrer">
                    {n.title || 'Untitled'}
                  </a>
                  {n.publishedDate && (
                    <span className="etf-detail-news-date">
                      {new Date(n.publishedDate).toLocaleDateString()}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {extendedLoading && (
          <div className="etf-detail-loading-more">Loading sectors, chart, news…</div>
        )}

        <footer className="etf-detail-footer">
          <p>Data: FMP API (quote, holdings, sectors, countries, chart, news). Basic data loads first; extended may take a few seconds.</p>
        </footer>
      </div>
    </div>
  )
}
