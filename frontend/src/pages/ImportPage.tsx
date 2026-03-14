import { useState, useEffect, useRef } from 'react'
import { importsApi } from '../api/imports'
import { ImportJob } from '../types'
import { formatDateTime } from '../utils/formatters'
import { ArrowUpTrayIcon } from '@heroicons/react/24/outline'
import api from '../api/client'

const STATUS_COLORS: Record<string, string> = {
  processing: 'text-yellow-600 bg-yellow-50',
  completed: 'text-green-600 bg-green-50',
  failed: 'text-red-600 bg-red-50',
}

export default function ImportPage() {
  const [jobs, setJobs] = useState<ImportJob[]>([])
  const [banks, setBanks] = useState<{ id: string; name: string }[]>([])
  const [bankHint, setBankHint] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [pollingId, setPollingId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    importsApi.list().then(r => setJobs(r.data))
    api.get('/banks').then(r => setBanks(r.data))
  }, [])

  // Poll processing job
  useEffect(() => {
    if (!pollingId) return
    const interval = setInterval(async () => {
      const res = await importsApi.get(pollingId)
      setJobs(jobs => jobs.map(j => j.id === pollingId ? res.data : j))
      if (res.data.status !== 'processing') {
        setPollingId(null)
        clearInterval(interval)
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [pollingId])

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const res = await importsApi.upload(file, bankHint || undefined)
      const newJob: ImportJob = {
        id: res.data.import_job_id,
        filename: file.name,
        bank_hint: bankHint || null,
        llm_provider: null,
        status: 'processing',
        total_rows: null,
        parsed_rows: null,
        error_message: null,
        created_at: new Date().toISOString(),
        completed_at: null,
      }
      setJobs(j => [newJob, ...j])
      setPollingId(res.data.import_job_id)
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch (err: unknown) {
      setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Import Statement</h2>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <form onSubmit={handleUpload} className="space-y-4">
          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-green-400 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <ArrowUpTrayIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 font-medium">{file ? file.name : 'Click to upload PDF'}</p>
            <p className="text-xs text-gray-400 mt-1">Bank statement PDF, max 10MB</p>
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Bank (optional — helps AI parsing)</label>
            <select value={bankHint} onChange={e => setBankHint(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
              <option value="">Select bank...</option>
              {banks.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
            </select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={!file || uploading} className="w-full bg-green-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-green-700 disabled:opacity-50">
            {uploading ? 'Uploading...' : 'Import Statement'}
          </button>
        </form>
      </div>

      {jobs.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Import History</h3>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
            {jobs.map(job => (
              <div key={job.id} className="p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{job.filename}</p>
                  <p className="text-xs text-gray-500">{formatDateTime(job.created_at)} {job.bank_hint ? `· ${job.bank_hint}` : ''}</p>
                  {job.error_message && <p className="text-xs text-red-600 mt-0.5">{job.error_message}</p>}
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[job.status]}`}>
                    {job.status === 'processing' ? '⏳ Processing...' : job.status}
                  </span>
                  {job.status === 'completed' && (
                    <p className="text-xs text-gray-500 mt-1">{job.parsed_rows} transactions</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
