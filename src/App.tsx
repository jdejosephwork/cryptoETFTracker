import { EtfTable } from './components/EtfTable'
import { Profile } from './components/Profile'
import { useCryptoEtfData } from './hooks/useCryptoEtfData'
import { AuthProvider } from './context/AuthContext'
import { EtfProvider } from './context/EtfContext'
import './App.css'

function App() {
  const { rows, loading, error, refresh } = useCryptoEtfData()

  return (
    <AuthProvider>
    <EtfProvider>
      <div className="app">
        <header className="header">
          <div>
            <h1>Crypto ETF Tracker</h1>
            <p className="tagline">Track crypto weight exposure across exchange-traded funds</p>
          </div>
          <Profile rows={rows} />
        </header>
        <main className="main">
          <EtfTable rows={rows} loading={loading} error={error} onRefresh={refresh} />
        </main>
      </div>
    </EtfProvider>
    </AuthProvider>
  )
}

export default App
