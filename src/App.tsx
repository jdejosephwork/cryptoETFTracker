import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { EtfDetailPage } from './pages/EtfDetailPage'
import { WatchlistPage } from './pages/WatchlistPage'
import { AdminRoute } from './components/AdminRoute'
import { useCryptoEtfData } from './hooks/useCryptoEtfData'
import { AuthProvider } from './context/AuthContext'
import { EtfProvider } from './context/EtfContext'
import { SubscriptionProvider, useSubscription } from './context/SubscriptionContext'
import './App.css'

function AppContent() {
  const { rows } = useCryptoEtfData()
  const { refresh: refreshSubscription } = useSubscription()
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('upgraded') === '1') {
      refreshSubscription()
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [refreshSubscription])
  return (
    <Routes>
      <Route element={<Layout rows={rows} />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/watchlist" element={<WatchlistPage />} />
        <Route path="/etf/:symbol" element={<EtfDetailPage />} />
        <Route path="/admin" element={<AdminRoute />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <EtfProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </EtfProvider>
      </SubscriptionProvider>
    </AuthProvider>
  )
}

export default App
