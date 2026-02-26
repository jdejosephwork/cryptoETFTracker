import { useState, useEffect, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchEtfDetail, fetchEtfDetailExtended } from '../api/etfDetail'
import type { EtfDetailExtendedResponse } from '../api/etfDetail'
import { BROKER_AFFILIATES } from '../data/brokerAffiliates'
import './EtfDetailPage.css'

type ChartPoint = { date?: string; close?: number; price?: number }

/** Parse weight % - handles number, "97.49%" string, or decimal 0.65 */
function toPercent(v: unknown): number {
  if (v == null) return 0
  const n = Number(v)
  if (!Number.isNaN(n)) return n > 0 && n <= 1 ? n * 100 : n
  if (typeof v === 'string') {
    const stripped = v.replace(/%/g, '').trim()
    const p = Number(stripped)
    return Number.isNaN(p) ? 0 : p > 0 && p <= 1 ? p * 100 : p
  }
  return 0
}

function getPrice(x: ChartPoint): number {
  return x.close ?? (x as { price?: number }).price ?? 0
}

function PriceLineChart({ chart, currentPrice }: { chart: ChartPoint[]; currentPrice?: number }) {
  const [hovered, setHovered] = useState<{ date: string; price: number; x: number; y: number } | null>(null)
  const chartWidth = 600
  const chartHeight = 180
  const padding = { top: 12, right: 12, bottom: 24, left: 48 }
  const innerW = chartWidth - padding.left - padding.right
  const innerH = chartHeight - padding.top - padding.bottom

  const valid = chart.filter((p) => getPrice(p) > 0)
  const min = valid.length ? Math.min(...valid.map(getPrice)) : 0
  const max = valid.length ? Math.max(...valid.map(getPrice)) : 0
  const range = max - min || 1
  const n = chart.length || 1
  const stepX = n > 1 ? innerW / (n - 1) : innerW

  const points = chart.map((p, i) => {
    const price = getPrice(p)
    const x = padding.left + i * stepX
    const y = padding.top + innerH - (price > 0 ? ((price - min) / range) * innerH : 0)
    return { ...p, price, x, y }
  })

  const validPoints = points.filter((p) => p.price > 0)
  const linePath = validPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ')

  const areaPath = validPoints.length
    ? `${linePath} L ${validPoints[validPoints.length - 1].x} ${padding.top + innerH} L ${validPoints[0].x} ${padding.top + innerH} Z`
    : ''

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    // Map pixel position to viewBox X (SVG may be scaled)
    const viewX = (mouseX / rect.width) * chartWidth
    const idx = Math.round((viewX - padding.left) / stepX)
    const clamped = Math.max(0, Math.min(n - 1, idx))
    const pt = points[clamped]
    if (pt && pt.price > 0) {
      setHovered({
        date: pt.date ?? '',
        price: pt.price,
        x: pt.x,
        y: pt.y
      })
    } else {
      setHovered(null)
    }
  }

  const handleMouseLeave = () => setHovered(null)

  const closes = valid.map(getPrice)
  const subtitle = currentPrice != null && closes.length
    ? `Current: $${currentPrice.toFixed(2)} • Range: $${Math.min(...closes).toFixed(2)} – $${Math.max(...closes).toFixed(2)}`
    : null

  return (
    <section className="etf-detail-card etf-detail-card-chart">
      <h3>Price (60 days)</h3>
      {subtitle && <p className="etf-detail-chart-subtitle">{subtitle}</p>}
      <div className="etf-detail-chart-wrap">
        <svg
          className="etf-detail-line-chart"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="xMidYMid meet"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="etf-line-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Area fill under line */}
          {areaPath && <path d={areaPath} fill="url(#etf-line-gradient)" />}
          {/* Line */}
          {linePath && <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
          {/* Hover dot */}
          {hovered && (
            <g>
              <circle cx={hovered.x} cy={hovered.y} r="6" fill="var(--accent)" opacity="0.9" />
              <circle cx={hovered.x} cy={hovered.y} r="10" fill="transparent" />
            </g>
          )}
        </svg>
        {hovered && (
          <div
            className="etf-detail-chart-tooltip"
            style={{
              left: `${(hovered.x / chartWidth) * 100}%`,
              top: `${((hovered.y - 28) / chartHeight) * 100}%`,
              transform: 'translate(-50%, -100%)'
            }}
          >
            <span className="etf-detail-tooltip-date">{hovered.date}</span>
            <span className="etf-detail-tooltip-price">${hovered.price.toFixed(2)}</span>
          </div>
        )}
      </div>
      <div className="etf-detail-chart-labels">
        <span>{chart[0]?.date ?? ''}</span>
        <span>{chart[chart.length - 1]?.date ?? ''}</span>
      </div>
    </section>
  )
}

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
          {data.sponsoredBy && (
            <span className="etf-detail-sponsored-badge">
              {data.sponsoredBadge || 'Sponsored'} · {data.sponsoredBy}
            </span>
          )}
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

      <section className="etf-detail-invest">
        <h3>Open an account to invest</h3>
        <div className="etf-detail-invest-brokers">
          {BROKER_AFFILIATES.map((broker) => (
            <a
              key={broker.name}
              href={broker.url}
              target="_blank"
              rel="noopener noreferrer"
              className="etf-detail-invest-btn"
            >
              {broker.name}
            </a>
          ))}
        </div>
        <p className="etf-detail-invest-hint">Broker links may be affiliate links.</p>
      </section>

      <div className="etf-detail-grid">
        {/* Market data */}
        <section className="etf-detail-card">
          <h3>Market Data</h3>
          <dl className="etf-detail-dl">
            <dt>Crypto Weight</dt>
            <dd>{data.cryptoWeight != null && data.cryptoWeight > 0 ? `${data.cryptoWeight}%` : '—'}</dd>
            <dt>Exposure</dt>
            <dd>{data.cryptoExposure || '—'}</dd>
            <dt>CUSIP</dt>
            <dd>{data.cusip || '—'}</dd>
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

        {/* Price chart - always shown below Market Data / Fund Info */}
        {chart.length > 0 ? (
          <PriceLineChart chart={chart} currentPrice={q?.price} />
        ) : (
          <section className="etf-detail-card etf-detail-card-wide etf-detail-card-chart">
            <h3>Price (60 days)</h3>
            <p className="etf-detail-chart-subtitle">Chart data not available for this ETF.</p>
          </section>
        )}

        {/* Sector weightings */}
        {sectors.length > 0 && (
          <section className="etf-detail-card etf-detail-card-wide">
            <h3>Sector Allocation</h3>
            <div className="etf-detail-bars">
              {sectors.slice(0, 10).map((s, i) => {
                const pct = toPercent(s.weightPercentage)
                return (
                  <div key={i} className="etf-detail-bar-row">
                    <span className="etf-detail-bar-label">{s.sector || '—'}</span>
                    <div className="etf-detail-bar-track">
                      <div
                        className="etf-detail-bar-fill"
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <span className="etf-detail-bar-pct">{pct.toFixed(1)}%</span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Country weightings */}
        {countries.length > 0 && (
          <section className="etf-detail-card etf-detail-card-wide">
            <h3>Country Allocation</h3>
            <div className="etf-detail-bars">
              {countries.slice(0, 10).map((c, i) => {
                const pct = toPercent(c.weightPercentage)
                return (
                  <div key={i} className="etf-detail-bar-row">
                    <span className="etf-detail-bar-label">{c.country || '—'}</span>
                    <div className="etf-detail-bar-track">
                      <div
                        className="etf-detail-bar-fill"
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <span className="etf-detail-bar-pct">{pct.toFixed(1)}%</span>
                  </div>
                )
              })}
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
                    <span className="holding-weight">{Number(h.weightPercentage).toFixed(2)}%</span>
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
