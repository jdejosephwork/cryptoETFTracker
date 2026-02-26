import { useRef, useEffect, useState } from 'react'
import './SearchBar.css'

export interface SearchSuggestion {
  ticker: string
  name: string
}

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  /** Close matches to show in dropdown (e.g. top 8). Omit to hide suggestions. */
  suggestions?: SearchSuggestion[]
  onSelectSuggestion?: (ticker: string) => void
  placeholder?: string
}

const MAX_SUGGESTIONS = 8

export function SearchBar({
  value,
  onChange,
  suggestions = [],
  onSelectSuggestion,
  placeholder = 'Search by ticker or name...',
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const showDropdown = !!(isFocused && value.trim() && suggestions.length > 0)
  const displaySuggestions = suggestions.slice(0, MAX_SUGGESTIONS)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setIsFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (ticker: string) => {
    onChange(ticker)
    onSelectSuggestion?.(ticker)
    setIsFocused(false)
  }

  return (
    <div className="search-bar-wrap" ref={wrapRef}>
      <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="search"
        className="search-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        placeholder={placeholder}
        aria-label="Search ETFs by ticker or name"
        aria-autocomplete="list"
        aria-expanded={!!showDropdown}
      />
      {value && (
        <button
          type="button"
          className="search-clear"
          onClick={() => onChange('')}
          aria-label="Clear search"
        >
          ×
        </button>
      )}
      {showDropdown && (
        <ul className="search-suggestions" role="listbox" aria-label="Search suggestions">
          {displaySuggestions.map((s) => (
            <li key={s.ticker} role="option">
              <button
                type="button"
                className="search-suggestion-item"
                onClick={() => handleSelect(s.ticker)}
              >
                <span className="suggestion-ticker">{s.ticker}</span>
                <span className="suggestion-name">{s.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
