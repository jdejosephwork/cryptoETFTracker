import { useState, useEffect, useCallback } from 'react'
import './AdminPage.css'

const ADMIN_SYNC_KEY = 'crypto-etf-admin-sync-key'
const LOG_MAX = 50

interface LogEntry {
  id: string
  ts: string
  action: 'health' | 'sync'
  success: boolean
  message: string
  data?: unknown
}

interface HealthResponse {
  ok?: boolean
  etfCount?: number
  lastSync?: string | null
  syncSchedule?: string
  fmpKeySet?: boolean
  endpoints?: Record<string, string>
}

export function AdminPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [healthLoading, setHealthLoading] = useState(false)
  const [syncKey, setSyncKey] = useState(() => {
    try {
      return sessionStorage.getItem(ADMIN_SYNC_KEY) ?? ''
    } catch {
      return ''
    }
  })
  const [syncLoading, setSyncLoading] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])

  const addLog = useCallback((entry: Omit<LogEntry, 'id'>) => {
    setLogs((prev) => [
      { ...entry, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` },
      ...prev.slice(0, LOG_MAX - 1),
    ])
  }, [])

  const fetchHealth = useCallback(async () => {
    setHealthLoading(true)
    try {
      const res = await fetch('/api/health')
      const data = (await res.json()) as HealthResponse
      setHealth(data)
      addLog({
        ts: new Date().toISOString(),
        action: 'health',
        success: res.ok,
        message: res.ok ? `Health OK (${data.etfCount ?? 0} ETFs)` : `Health failed: ${res.status}`,
        data: data,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Request failed'
      addLog({ ts: new Date().toISOString(), action: 'health', success: false, message: msg })
      setHealth(null)
    } finally {
      setHealthLoading(false)
    }
  }, [addLog])

  const runSync = useCallback(async () => {
    setSyncLoading(true)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (syncKey.trim()) headers['Authorization'] = `Bearer ${syncKey.trim()}`
      const res = await fetch('/api/sync', { method: 'POST', headers })
      const data = await res.json()
      const success = res.ok
      const payload = data as { etfs?: unknown[]; syncedAt?: string; count?: number; error?: string }
      const msg = success
        ? `Sync OK: ${payload.count ?? 0} ETFs at ${payload.syncedAt ?? '—'}`
        : `Sync failed: ${payload.error ?? res.status}`
      addLog({
        ts: new Date().toISOString(),
        action: 'sync',
        success,
        message: msg,
        data: success ? { count: payload.count, syncedAt: payload.syncedAt } : payload,
      })
      if (success) {
        window.dispatchEvent(new CustomEvent('etf-data-refresh'))
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Request failed'
      addLog({ ts: new Date().toISOString(), action: 'sync', success: false, message: msg })
    } finally {
      setSyncLoading(false)
    }
  }, [syncKey, addLog])

  useEffect(() => {
    fetchHealth()
  }, [fetchHealth])

  useEffect(() => {
    try {
      if (syncKey) sessionStorage.setItem(ADMIN_SYNC_KEY, syncKey)
      else sessionStorage.removeItem(ADMIN_SYNC_KEY)
    } catch {
      /* noop */
    }
  }, [syncKey])

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1>Admin</h1>
        <p>Health checks and manual data sync</p>
      </header>

      <section className="admin-section admin-health">
        <h2>Health</h2>
        <div className="admin-health-actions">
          <button type="button" onClick={fetchHealth} disabled={healthLoading}>
            {healthLoading ? 'Refreshing…' : 'Refresh health'}
          </button>
        </div>
        {health && (
          <pre className="admin-json">
            {JSON.stringify(health, null, 2)}
          </pre>
        )}
      </section>

      <section className="admin-section admin-sync">
        <h2>Manual sync</h2>
        <p className="admin-hint">
          Trigger a full data refresh (crypto weight, exposure, CUSIP, digital asset). Requires sync key if SYNC_API_KEY is set on the server.
        </p>
        <div className="admin-sync-form">
          <label>
            Sync key (optional)
            <input
              type="password"
              value={syncKey}
              onChange={(e) => setSyncKey(e.target.value)}
              placeholder="Bearer token if SYNC_API_KEY set"
            />
          </label>
          <button type="button" onClick={runSync} disabled={syncLoading}>
            {syncLoading ? 'Syncing…' : 'Sync data'}
          </button>
        </div>
      </section>

      <section className="admin-section admin-logs">
        <h2>Logs</h2>
        <div className="admin-logs-list">
          {logs.length === 0 ? (
            <p className="admin-logs-empty">No logs yet. Refresh health or run sync.</p>
          ) : (
            logs.map((entry) => (
              <div
                key={entry.id}
                className={`admin-log-entry admin-log-${entry.action} ${entry.success ? 'success' : 'error'}`}
              >
                <span className="admin-log-ts">{new Date(entry.ts).toLocaleTimeString()}</span>
                <span className="admin-log-action">{entry.action}</span>
                <span className="admin-log-msg">{entry.message}</span>
                {entry.data != null && (
                  <pre className="admin-log-data">{JSON.stringify(entry.data, null, 2)}</pre>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
