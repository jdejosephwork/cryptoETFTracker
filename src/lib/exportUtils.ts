import * as XLSX from 'xlsx'
import type { CryptoEtfRow } from '../types/etf'

function escapeCsvValue(val: unknown): string {
  const s = String(val ?? '')
  if (/[,"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportToCsv(rows: CryptoEtfRow[]) {
  const headers = ['Ticker', 'Name', 'Region', 'Crypto Weight %', 'Crypto Exposure', 'CUSIP', 'Digital Asset']
  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      [
        escapeCsvValue(r.ticker),
        escapeCsvValue(r.name),
        escapeCsvValue(r.region),
        escapeCsvValue(r.cryptoWeight),
        escapeCsvValue(r.cryptoExposure),
        escapeCsvValue(r.cusip),
        escapeCsvValue(r.digitalAssetIndicator ? 'Yes' : 'No')
      ].join(',')
    )
  ]
  const csv = lines.join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  downloadFile(blob, `crypto-etf-holdings-${new Date().toISOString().slice(0, 10)}.csv`)
}

export function exportToJson(rows: CryptoEtfRow[]) {
  const data = rows.map((r) => ({
    ticker: r.ticker,
    name: r.name,
    region: r.region,
    cryptoWeight: r.cryptoWeight,
    cryptoExposure: r.cryptoExposure,
    cusip: r.cusip,
    digitalAssetIndicator: r.digitalAssetIndicator,
  }))
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  downloadFile(blob, `crypto-etf-holdings-${new Date().toISOString().slice(0, 10)}.json`)
}

export function exportToExcel(rows: CryptoEtfRow[]) {
  const data = rows.map((r) => ({
    Ticker: r.ticker,
    Name: r.name,
    Region: r.region,
    'Crypto Weight %': r.cryptoWeight,
    'Crypto Exposure': r.cryptoExposure,
    CUSIP: r.cusip,
    'Digital Asset': r.digitalAssetIndicator ? 'Yes' : 'No',
  }))
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Crypto ETF Holdings')
  const filename = `crypto-etf-holdings-${new Date().toISOString().slice(0, 10)}.xlsx`
  XLSX.writeFile(workbook, filename, { bookType: 'xlsx', compression: true })
}
