import { useState, useEffect, useRef } from 'react'
import Select from 'react-select'
import type { CryptoEtfRow } from '../types/etf'
import { exportToCsv, exportToJson, exportToExcel } from '../lib/exportUtils'
import './EtfFilters.css'

export interface EtfFiltersState {
  region: string[]
  minWeight: string
  maxWeight: string
  cryptoExposure: string[]
}

type SelectOption = { value: string; label: string }

const CRYPTO_EXPOSURE_OPTIONS: SelectOption[] = [
  { value: 'BTC', label: 'BTC' },
  { value: 'ETH', label: 'ETH' },
  { value: 'Blockchain equities', label: 'Blockchain equities' },
  { value: 'Various', label: 'Various' },
]

const selectStyles = {
  control: (base: object) => ({
    ...base,
    minWidth: 160,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    '&:hover': { borderColor: 'rgba(255, 255, 255, 0.2)' },
  }),
  menu: (base: object) => ({
    ...base,
    backgroundColor: 'var(--bg-card)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    zIndex: 50,
  }),
  option: (base: object, state: { isFocused: boolean; isSelected: boolean }) => ({
    ...base,
    backgroundColor: state.isSelected
      ? 'var(--accent-muted)'
      : state.isFocused
        ? 'rgba(255, 255, 255, 0.08)'
        : 'transparent',
    color: 'rgba(255, 255, 255, 0.9)',
  }),
  multiValue: (base: object) => ({
    ...base,
    backgroundColor: 'var(--accent-muted)',
  }),
  multiValueLabel: (base: object) => ({
    ...base,
    color: 'rgba(255, 255, 255, 0.95)',
  }),
  input: (base: object) => ({ ...base, color: 'rgba(255, 255, 255, 0.9)' }),
  placeholder: (base: object) => ({ ...base, color: 'rgba(255, 255, 255, 0.4)' }),
}

export type ExportFormat = 'csv' | 'json' | 'excel'

interface EtfFiltersProps {
  rows: CryptoEtfRow[]
  /** Rows to export (filtered/sorted). If omitted, falls back to rows. */
  exportRows?: CryptoEtfRow[]
  /** When non-empty, export only these rows (user selection). */
  exportSelection?: Set<string>
  onApply: (filters: EtfFiltersState) => void
}

export function EtfFilters({ rows, exportRows, exportSelection, onApply }: EtfFiltersProps) {
  const exportMenuRef = useRef<HTMLDivElement>(null)
  const [region, setRegion] = useState<string[]>([])
  const [minWeight, setMinWeight] = useState('')
  const [maxWeight, setMaxWeight] = useState('')
  const [cryptoExposure, setCryptoExposure] = useState<string[]>([])
  const [exportMenuOpen, setExportMenuOpen] = useState(false)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false)
      }
    }
    if (exportMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [exportMenuOpen])

  // Only countries/regions that appear in ETF data
  const regionOptions: SelectOption[] = Array.from(
    new Set(rows.map((r) => r.region).filter(Boolean))
  )
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .map((r) => ({ value: r, label: r }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onApply({ region, minWeight, maxWeight, cryptoExposure })
  }

  const handleReset = () => {
    setRegion([])
    setMinWeight('')
    setMaxWeight('')
    setCryptoExposure([])
    onApply({ region: [], minWeight: '', maxWeight: '', cryptoExposure: [] })
  }

  const rowsToExport = (() => {
    const base = exportRows ?? rows
    if (exportSelection && exportSelection.size > 0) {
      return base.filter((r) => exportSelection.has(r.ticker.toUpperCase()))
    }
    return base
  })()

  const handleExport = (format: ExportFormat) => {
    if (format === 'csv') exportToCsv(rowsToExport)
    else if (format === 'json') exportToJson(rowsToExport)
    else exportToExcel(rowsToExport)
    setExportMenuOpen(false)
  }

  return (
    <form className="etf-filters" onSubmit={handleSubmit}>
      <div className="filter-group">
        <label htmlFor="filter-region">Region / Country</label>
        <Select
          inputId="filter-region"
          classNamePrefix="react-select"
          isMulti
          options={regionOptions}
          value={region.map((v) => ({ value: v, label: v }))}
          onChange={(selected) => setRegion(selected ? selected.map((o) => o.value) : [])}
          placeholder="Select regions..."
          styles={selectStyles}
          isClearable
          closeMenuOnSelect={false}
        />
      </div>

      <div className="filter-group">
        <label htmlFor="filter-min-weight">Crypto Weight Min (%)</label>
        <input
          id="filter-min-weight"
          type="number"
          min={0}
          max={100}
          step={0.1}
          placeholder="0"
          value={minWeight}
          onChange={(e) => setMinWeight(e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label htmlFor="filter-max-weight">Crypto Weight Max (%)</label>
        <input
          id="filter-max-weight"
          type="number"
          min={0}
          max={100}
          step={0.1}
          placeholder="100"
          value={maxWeight}
          onChange={(e) => setMaxWeight(e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label htmlFor="filter-exposure">Crypto Exposure</label>
        <Select
          inputId="filter-exposure"
          classNamePrefix="react-select"
          isMulti
          options={CRYPTO_EXPOSURE_OPTIONS}
          value={cryptoExposure.map((v) => ({ value: v, label: v }))}
          onChange={(selected) =>
            setCryptoExposure(selected ? selected.map((o) => o.value) : [])
          }
          placeholder="Select exposure..."
          styles={selectStyles}
          isClearable
          closeMenuOnSelect={false}
        />
      </div>

      <div className="filter-actions">
        <div className="filter-export-dropdown" ref={exportMenuRef}>
          <button
            type="button"
            onClick={() => setExportMenuOpen((o) => !o)}
            disabled={rowsToExport.length === 0}
            className="filter-export"
            title="Export data"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export
            <svg className="export-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {exportMenuOpen && (
            <div className="filter-export-menu">
              <button type="button" onClick={() => handleExport('csv')}>CSV</button>
              <button type="button" onClick={() => handleExport('json')}>JSON</button>
              <button type="button" onClick={() => handleExport('excel')}>Excel</button>
            </div>
          )}
        </div>
        <button type="submit" className="filter-submit">
          Apply Filters
        </button>
        <button type="button" onClick={handleReset} className="filter-reset">
          Reset
        </button>
      </div>
    </form>
  )
}
