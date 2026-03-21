import { useState, useEffect, useRef } from 'react'
import { importsApi } from '../api/imports'
import { ImportJob } from '../types'
import { formatDateTime } from '../utils/formatters'
import { ArrowUpTrayIcon } from '@heroicons/react/24/outline'
import api from '../api/client'

const STATUS_COLORS: Record<string, string> = {
  processing: 'text-yellow-600 bg-yellow-50',
  extracting: 'text-yellow-600 bg-yellow-50',
  mapping: 'text-blue-600 bg-blue-50',
  completed: 'text-green-600 bg-green-50',
  failed: 'text-red-600 bg-red-50',
}

const STATUS_LABELS: Record<string, string> = {
  processing: '⏳ Processing...',
  extracting: '⏳ Extracting rows...',
  mapping: '🔍 Mapping transactions...',
  completed: 'completed',
  failed: 'failed',
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
      if (!['processing', 'extracting', 'mapping'].includes(res.data.status)) {
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

  const fi = "w-full border rounded-md px-3 py-2 text-[13px] outline-none focus:border-[var(--green)] transition-colors"
  const fiStyle = { background: 'var(--surface)', borderColor: 'var(--border2)', color: 'var(--text)' }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[20px] font-medium" style={{ color: 'var(--text)' }}>Import statement</h2>
        <p className="text-[12px] mt-0.5" style={{ color: 'var(--text3)' }}>Upload a bank PDF · AI extracts and categorises transactions</p>
      </div>

      <div style={{ maxWidth: 540 }}>
        <form onSubmit={handleUpload} className="space-y-4">
          {/* Dropzone */}
          <div
            className="rounded-xl text-center cursor-pointer transition-all"
            style={{
              border: '1.5px dashed var(--border2)',
              padding: '38px 20px',
              background: file ? 'var(--gl)' : 'var(--surface)',
              borderColor: file ? 'var(--green)' : 'var(--border2)',
            }}
            onClick={() => fileRef.current?.click()}
            onMouseEnter={e => {
              if (!file) {
                e.currentTarget.style.borderColor = 'var(--green)'
                e.currentTarget.style.background = 'var(--gl)'
              }
            }}
            onMouseLeave={e => {
              if (!file) {
                e.currentTarget.style.borderColor = 'var(--border2)'
                e.currentTarget.style.background = 'var(--surface)'
              }
            }}
          >
            <ArrowUpTrayIcon className="w-8 h-8 mx-auto mb-2.5" style={{ color: 'var(--text3)' }} />
            <p className="text-[14px] font-medium mb-1" style={{ color: 'var(--text)' }}>
              {file ? file.name : 'Click to upload PDF'}
            </p>
            <p className="text-[12px]" style={{ color: 'var(--text3)' }}>Bank statement · max 10MB</p>
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
          </div>

          {/* Bank selector */}
          <div>
            <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--text2)' }}>
              Bank <span className="font-normal" style={{ color: 'var(--text3)' }}>(optional — helps AI parsing)</span>
            </label>
            <select value={bankHint} onChange={e => setBankHint(e.target.value)} className={fi} style={fiStyle}>
              <option value="">Select bank…</option>
              {banks.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
            </select>
          </div>

          {/* Info box */}
          <div className="rounded-md p-3 text-[12px] leading-relaxed" style={{ background: 'var(--bg)', color: 'var(--text3)' }}>
            <strong style={{ color: 'var(--text2)', fontWeight: 500 }}>How it works:</strong> Your PDF is parsed by AI to extract transactions. You'll review each one in Unverified before anything is saved.
          </div>

          {error && <p className="text-[13px] text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={!file || uploading}
            className="w-full py-2.5 rounded-md text-[13px] text-white disabled:opacity-50 flex items-center justify-center"
            style={{ background: 'var(--green)' }}
          >
            {uploading ? 'Importing…' : 'Import statement'}
          </button>
        </form>
      </div>

      {jobs.length > 0 && (
        <div>
          <h3 className="text-[13px] font-medium mb-2" style={{ color: 'var(--text2)' }}>Import history</h3>
          <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            {jobs.map((job, i) => (
              <div key={job.id} className="p-4 flex items-center gap-3" style={{ borderBottom: i < jobs.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text)' }}>{job.filename}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text3)' }}>
                    {formatDateTime(job.created_at)}{job.bank_hint ? ` · ${job.bank_hint}` : ''}
                  </p>
                  {job.error_message && <p className="text-[11px] mt-0.5 text-red-500">{job.error_message}</p>}
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[job.status] || 'text-gray-600 bg-gray-50'}`}>
                    {STATUS_LABELS[job.status] || job.status}
                  </span>
                  {job.status === 'completed' && (
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text3)' }}>{job.parsed_rows} transactions</p>
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
