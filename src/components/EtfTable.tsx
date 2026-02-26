import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { CryptoEtfRow } from '../types/etf'
import { EtfFilters, type EtfFiltersState } from './EtfFilters'
import { SearchBar } from './SearchBar'
import { Tooltip } from './Tooltip'
import { useEtfContext } from '../context/EtfContext'
import './EtfTable.css'

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50] as const

const COLUMN_CONFIG: { key: keyof CryptoEtfRow | 'btcHoldings' | 'actions'; label: string; tooltip: string; className?: string }[] = [
  { key: 'ticker', label: 'Ticker', tooltip: 'Stock exchange symbol for the ETF' },
  { key: 'name', label: 'Name', tooltip: 'Full official name of the fund' },
  { key: 'region', label: 'Region / Country', tooltip: 'Primary country or region where the ETF allocates assets' },
  { key: 'cryptoWeight', label: 'Crypto Weight %', tooltip: "Percentage of the ETF's holdings exposed to crypto assets (Bitcoin, Ethereum, etc.)", className: 'num' },
  { key: 'btcHoldings', label: 'BTC Held', tooltip: 'Number of Bitcoin held (spot BTC ETFs from btcetfdata.com)' },
  { key: 'cryptoExposure', label: 'Crypto Exposure', tooltip: 'Which cryptocurrencies or digital assets the ETF holds (e.g., BTC, ETH, blockchain equities)' },
  { key: 'cusip', label: 'CUSIP', tooltip: '9-character identifier for North American securities; used for clearing and regulatory filings' },
  { key: 'digitalAssetIndicator', label: 'Digital Asset', tooltip: 'Whether the fund has meaningful exposure to digital assets (crypto or blockchain)', className: 'center' },
  { key: 'actions', label: 'Actions', tooltip: 'Add to watchlist or export selection', className: 'center' },
]

function getWeightClass(pct: number): 'high' | 'mid' | 'low' | 'none' {
  if (pct <= 0) return 'none'
  if (pct >= 80) return 'high'
  if (pct >= 20) return 'mid'
  return 'low'
}

type SortKey = keyof CryptoEtfRow | 'btcHoldings' | 'actions'
type SortDir = 'asc' | 'desc'

interface EtfTableProps {
  rows: CryptoEtfRow[]
  loading: boolean
  error: string | null
  onRefresh: () => void
}

function applyFilters(rows: CryptoEtfRow[], filters: EtfFiltersState): CryptoEtfRow[] {
  return rows.filter((row) => {
    if (filters.region.length > 0 && !filters.region.includes(row.region)) return false
    const min = filters.minWeight ? parseFloat(filters.minWeight) : null
    const max = filters.maxWeight ? parseFloat(filters.maxWeight) : null
    if (min != null && !isNaN(min) && row.cryptoWeight < min) return false
    if (max != null && !isNaN(max) && row.cryptoWeight > max) return false
    if (filters.cryptoExposure.length > 0) {
      const exp = (row.cryptoExposure || '').toLowerCase()
      const hasMatch = filters.cryptoExposure.some(
        (sel) => exp.includes(sel.toLowerCase())
      )
      if (!hasMatch) return false
    }
    return true
  })
}

function applySearch(rows: CryptoEtfRow[], query: string): CryptoEtfRow[] {
  if (!query.trim()) return rows
  const q = query.trim().toLowerCase()
  return rows.filter(
    (r) =>
      r.ticker.toLowerCase().includes(q) ||
      (r.name || '').toLowerCase().includes(q)
  )
}

export function EtfTable({ rows, loading, error, onRefresh }: EtfTableProps) {
  const { toggleWatchlist, toggleExportSelection, isInWatchlist, isInExportSelection, exportSelection, setRowsToExport } = useEtfContext()
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey | null>('cryptoWeight')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [filters, setFilters] = useState<EtfFiltersState>({
    region: [],
    minWeight: '',
    maxWeight: '',
    cryptoExposure: [],
  })
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [filtersExpanded, setFiltersExpanded] = useState(true)

  const searchFilteredRows = useMemo(
    () => applySearch(rows, searchQuery),
    [rows, searchQuery]
  )
  const filteredRows = useMemo(
    () => applyFilters(searchFilteredRows, filters),
    [searchFilteredRows, filters]
  )

  const sortedRows = useMemo(() => {
    if (!sortKey || sortKey === 'actions') return filteredRows
    return [...filteredRows].sort((a, b) => {
      const av = sortKey === 'btcHoldings' ? a.btcHoldings : a[sortKey as keyof CryptoEtfRow]
      const bv = sortKey === 'btcHoldings' ? b.btcHoldings : b[sortKey as keyof CryptoEtfRow]
      let cmp: number
      if (typeof av === 'number' && typeof bv === 'number') {
        cmp = av - bv
      } else if (av == null || bv == null) {
        cmp = (av == null ? 0 : 1) - (bv == null ? 0 : 1)
      } else if (typeof av === 'boolean' && typeof bv === 'boolean') {
        cmp = (av ? 1 : 0) - (bv ? 1 : 0)
      } else {
        cmp = String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true })
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filteredRows, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize))
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedRows.slice(start, start + pageSize)
  }, [sortedRows, currentPage, pageSize])

  useEffect(() => setCurrentPage(1), [filters, searchQuery])
  useEffect(() => {
    setCurrentPage((p) => (p > totalPages ? 1 : Math.min(p, totalPages)))
  }, [totalPages])

  useEffect(() => {
    setRowsToExport(sortedRows)
  }, [sortedRows, setRowsToExport])

  const handleSort = (key: SortKey | null) => {
    if (!key || key === 'actions') return
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
        return key
      }
      setSortDir('desc')
      return key
    })
  }

  return (
    <div className="etf-table-container">
      {error && (
        <div className="etf-error-banner">
          <span>{error}</span>
          <button type="button" onClick={onRefresh}>
            Retry
          </button>
        </div>
      )}
      <div className="etf-table-search">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          suggestions={searchFilteredRows.slice(0, 8).map((r) => ({ ticker: r.ticker, name: r.name }))}
        />
      </div>
      <div className="etf-filters-wrap">
        <button
          type="button"
          className="etf-filters-toggle"
          onClick={() => setFiltersExpanded((e) => !e)}
          aria-expanded={filtersExpanded}
        >
          Filters
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={filtersExpanded ? 'chevron-open' : ''}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {filtersExpanded && (
          <EtfFilters
            rows={rows}
            exportRows={sortedRows}
            exportSelection={exportSelection}
            onApply={setFilters}
          />
        )}
      </div>
      <div className="etf-table-header">
        <h2>Crypto ETF Holdings</h2>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="refresh-btn"
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      <div className="etf-table-scroll">
        <table className="etf-table">
          <thead>
            <tr>
              {COLUMN_CONFIG.map(({ key, label, tooltip, className }) => (
                <th key={key} className={className}>
                  {key === 'actions' ? (
                    label
                  ) : (
                    <Tooltip content={tooltip}>
                      <button
                        type="button"
                        className="th-sort"
                        onClick={() => handleSort(key)}
                        title={tooltip}
                      >
                        {label}
                        {sortKey === key && (
                        <span className="sort-icon" aria-hidden>
                          {sortDir === 'asc' ? (
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M2 6l3-3 3 3" />
                            </svg>
                          ) : (
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M2 4l3 3 3-3" />
                            </svg>
                          )}
                        </span>
                      )}
                      </button>
                    </Tooltip>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading ? (
              <tr>
                <td colSpan={9} className="empty">
                  No data. Add your FMP API key in <code>.env</code> to load live data.
                </td>
              </tr>
            ) : sortedRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty">
                  No ETFs match your filters. Try adjusting or resetting filters.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row) => (
                <tr key={row.ticker}>
                  <td className="ticker">
                    <Link to={`/etf/${row.ticker}`} className="row-link" title="View details">
                      {row.ticker}
                    </Link>
                  </td>
                  <td className="name">
                    <Link to={`/etf/${row.ticker}`} className="row-link" title="View details">
                      {row.name}
                    </Link>
                  </td>
                  <td>{row.region}</td>
                  <td className="num">
                    <span className={`weight-value weight-${getWeightClass(row.cryptoWeight)}`}>
                      {row.cryptoWeight > 0 ? `${row.cryptoWeight}%` : '—'}
                    </span>
                  </td>
                  <td className="num">
                    {row.btcHoldings != null ? row.btcHoldings.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
                  </td>
                  <td className="crypto-exposure">{row.cryptoExposure}</td>
                  <td className="cusip">{row.cusip}</td>
                  <td className="center">
                    {row.digitalAssetIndicator ? (
                      <span className="badge yes">Yes</span>
                    ) : (
                      <span className="badge no">No</span>
                    )}
                  </td>
                  <td className="center actions-cell">
                    <button
                      type="button"
                      className={`action-btn ${isInWatchlist(row.ticker) ? 'active' : ''}`}
                      onClick={(e) => { e.stopPropagation(); toggleWatchlist(row.ticker) }}
                      title={isInWatchlist(row.ticker) ? 'Remove from watchlist' : 'Add to watchlist'}
                      aria-label={isInWatchlist(row.ticker) ? 'Remove from watchlist' : 'Add to watchlist'}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill={isInWatchlist(row.ticker) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" aria-hidden>
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className={`action-btn ${isInExportSelection(row.ticker) ? 'active' : ''}`}
                      onClick={(e) => { e.stopPropagation(); toggleExportSelection(row.ticker) }}
                      title={isInExportSelection(row.ticker) ? 'Remove from export' : 'Add to export'}
                      aria-label={isInExportSelection(row.ticker) ? 'Remove from export' : 'Add to export'}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {sortedRows.length > 0 && (
        <div className="etf-pagination">
          <div className="pagination-rows">
            <span className="pagination-label">Rows per page</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="pagination-select"
              aria-label="Rows per page"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="pagination-info">
            {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, sortedRows.length)} of {sortedRows.length}
          </div>
          <div className="pagination-nav">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="pagination-btn"
              aria-label="Previous page"
            >
              ← Prev
            </button>
            <span className="pagination-page">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="pagination-btn"
              aria-label="Next page"
            >
              Next →
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
