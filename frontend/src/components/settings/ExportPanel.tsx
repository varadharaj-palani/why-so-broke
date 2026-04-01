import { useState } from 'react'
import axios from 'axios'

export default function ExportPanel() {
  const [exportingCsv, setExportingCsv] = useState(false)
  const [exportingJson, setExportingJson] = useState(false)
  const [error, setError] = useState('')

  async function download(format: 'csv' | 'json') {
    const setter = format === 'csv' ? setExportingCsv : setExportingJson
    setter(true)
    setError('')
    try {
      const res = await axios.get(`/api/v1/export/${format}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        responseType: 'blob',
      })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `why-so-broke-export.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Export failed. Please try again.')
    } finally {
      setter(false)
    }
  }

  return (
    <div>
      <h3 className="text-[15px] font-medium mb-4" style={{ color: 'var(--text)' }}>Export data</h3>

      <div className="rounded-xl border p-5 space-y-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <p className="text-[13px]" style={{ color: 'var(--text3)' }}>
          Download all your transactions with full details.
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => download('csv')}
            disabled={exportingCsv}
            className="px-4 py-2 rounded-md text-[13px] text-white disabled:opacity-50"
            style={{ background: 'var(--green)' }}
          >
            {exportingCsv ? 'Exporting…' : 'Export as CSV'}
          </button>
          <button
            onClick={() => download('json')}
            disabled={exportingJson}
            className="px-4 py-2 rounded-md text-[13px] border disabled:opacity-50"
            style={{ borderColor: 'var(--border2)', color: 'var(--text2)', background: 'var(--surface)' }}
          >
            {exportingJson ? 'Exporting…' : 'Export as JSON'}
          </button>
        </div>

        {error && <p className="text-[12px] text-red-500">{error}</p>}
      </div>
    </div>
  )
}
