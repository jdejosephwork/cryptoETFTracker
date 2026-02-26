import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { EtfDetailPage } from './pages/EtfDetailPage'
import { WatchlistPage } from './pages/WatchlistPage'
import { useCryptoEtfData } from './hooks/useCryptoEtfData'
import { AuthProvider } from './context/AuthContext'
import { EtfProvider } from './context/EtfContext'
import './App.css'

function AppContent() {
  const { rows } = useCryptoEtfData()
  return (
    <Routes>
      <Route element={<Layout rows={rows} />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/watchlist" element={<WatchlistPage />} />
        <Route path="/etf/:symbol" element={<EtfDetailPage />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <EtfProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </EtfProvider>
    </AuthProvider>
  )
}

export default App
