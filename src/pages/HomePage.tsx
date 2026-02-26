import { EtfTable } from '../components/EtfTable'
import { useCryptoEtfData } from '../hooks/useCryptoEtfData'

export function HomePage() {
  const { rows, loading, error, refresh } = useCryptoEtfData()
  return (
    <EtfTable rows={rows} loading={loading} error={error} onRefresh={refresh} />
  )
}
