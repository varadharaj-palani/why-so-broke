import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { importsApi } from '../api/imports'
import { ImportJob } from '../types'
import { formatDateTime } from '../utils/formatters'
import { ArrowUpTrayIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import api from '../api/client'
import { useToast } from '../contexts/ToastContext'
import { useImportProgress } from '../contexts/ImportProgressContext'

const STATUS_DOT: Record<string, string> = {
  processing: 'bg-yellow-400',
  extracting: 'bg-yellow-400',
  mapping:    'bg-blue-400',
  completed:  'bg-green-500',
  failed:     'bg-red-500',
}

const STATUS_LABEL: Record<string, string> = {
  processing: 'Processing…',
  extracting: 'Extracting rows…',
  mapping:    'Mapping transactions…',
  completed:  'Completed',
  failed:     'Failed',
}

const IN_PROGRESS = ['processing', 'extracting', 'mapping']

function UploadForm({
  banks,
  onUploaded,
}: {
  banks: { id: string; name: string }[]
  onUploaded: (job: ImportJob) => void
}) {
  const [bankHint, setBankHint] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const { showToast } = useToast()
  const { setActiveJobId } = useImportProgress()

  const fi = "w-full border rounded-md px-3 py-2 text-[13px] outline-none focus:border-[var(--green)] transition-colors"
  const fiStyle = { background: 'var(--surface)', borderColor: 'var(--border2)', color: 'var(--text)' }

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
        fully_extracted: 0,
        pending_verification: 0,
      }
      onUploaded(newJob)
      setActiveJobId(res.data.import_job_id)
      showToast('Import is running in the background — usually ~1-2 min', 'info')
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch (err: unknown) {
      setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <form onSubmit={handleUpload} className="space-y-4">
      {/* Dropzone */}
      <div
        className="rounded-xl text-center cursor-pointer transition-all"
        style={{
          border: '1.5px dashed var(--border2)',
          padding: '32px 20px',
          background: file ? 'var(--gl)' : 'var(--surface)',
          borderColor: file ? 'var(--green)' : 'var(--border2)',
        }}
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--green)'; e.currentTarget.style.background = 'var(--gl)' }}
        onDragLeave={e => { if (!file) { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.background = 'var(--surface)' } }}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f?.type === 'application/pdf') setFile(f) }}
        onMouseEnter={e => { if (!file) { e.currentTarget.style.borderColor = 'var(--green)'; e.currentTarget.style.background = 'var(--gl)' } }}
        onMouseLeave={e => { if (!file) { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.background = 'var(--surface)' } }}
      >
        <ArrowUpTrayIcon className="w-7 h-7 mx-auto mb-2" style={{ color: 'var(--text3)' }} />
        <p className="text-[13px] font-medium mb-0.5" style={{ color: 'var(--text)' }}>
          {file ? file.name : 'Click to upload PDF'}
        </p>
        <p className="text-[11px]" style={{ color: 'var(--text3)' }}>Bank statement · max 10MB</p>
        <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f) }} />
      </div>

      <div>
        <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--text2)' }}>
          Bank <span className="font-normal" style={{ color: 'var(--text3)' }}>(optional)</span>
        </label>
        <select value={bankHint} onChange={e => setBankHint(e.target.value)} className={fi} style={fiStyle}>
          <option value="">Select bank…</option>
          {banks.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
        </select>
      </div>

      {error && <p className="text-[12px] text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={!file || uploading}
        className="w-full py-2.5 rounded-md text-[13px] text-white disabled:opacity-50"
        style={{ background: 'var(--green)' }}
      >
        {uploading ? 'Importing…' : 'Import statement'}
      </button>
    </form>
  )
}

function JobDetail({ job }: { job: ImportJob }) {
  const navigate = useNavigate()
  const inProgress = IN_PROGRESS.includes(job.status)

  return (
    <div className="flex-1 min-w-0 p-5 sm:p-6">
      {/* Header */}
      <div className="flex items-start gap-3 mb-5">
        <DocumentTextIcon className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--text3)' }} />
        <div className="min-w-0">
          <p className="text-[14px] font-medium truncate" style={{ color: 'var(--text)' }}>{job.filename}</p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text3)' }}>
            {formatDateTime(job.created_at)}{job.bank_hint ? ` · ${job.bank_hint}` : ''}
            {job.llm_provider ? ` · ${job.llm_provider}` : ''}
          </p>
        </div>
      </div>

      {/* Failed state */}
      {job.status === 'failed' && (
        <div className="rounded-lg px-4 py-3 mb-4 text-[12px]" style={{ background: 'var(--rl, #fff1f2)', border: '0.5px solid var(--red, #ef4444)', color: 'var(--red, #dc2626)' }}>
          <p className="font-medium mb-0.5">Import failed</p>
          <p style={{ color: 'var(--text2)' }}>{job.error_message || 'An unexpected error occurred.'}</p>
        </div>
      )}

      {/* In-progress state */}
      {inProgress && (
        <div className="flex items-center gap-2.5 py-3 text-[12px]" style={{ color: 'var(--text3)' }}>
          <svg className="animate-spin w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          {STATUS_LABEL[job.status]}
        </div>
      )}

      {/* Completed stats */}
      {job.status === 'completed' && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate(`/transactions?import_job_id=${job.id}`)}
            className="rounded-lg border p-3.5 text-left transition-all"
            style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--green)'; e.currentTarget.style.background = 'var(--gl)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg)' }}
          >
            <p className="text-[22px] font-semibold" style={{ color: 'var(--green)' }}>{job.fully_extracted}</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text2)' }}>Fully Extracted</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text3)' }}>View in Transactions →</p>
          </button>

          <button
            onClick={() => navigate(`/unverified?import_job_id=${job.id}`)}
            className="rounded-lg border p-3.5 text-left transition-all"
            style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--amber)'; e.currentTarget.style.background = 'var(--al)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg)' }}
          >
            <p className="text-[22px] font-semibold" style={{ color: 'var(--amber)' }}>{job.pending_verification}</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text2)' }}>Pending Verification</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text3)' }}>Review in Unverified →</p>
          </button>
        </div>
      )}
    </div>
  )
}

export default function ImportPage() {
  const [jobs, setJobs] = useState<ImportJob[]>([])
  const [banks, setBanks] = useState<{ id: string; name: string }[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { activeJobStatus } = useImportProgress()

  useEffect(() => {
    importsApi.list().then(r => {
      setJobs(r.data)
      if (r.data.length > 0) setSelectedId(r.data[0].id)
    })
    api.get('/banks').then(r => setBanks(r.data))
  }, [])

  // Refresh job list when active job completes
  useEffect(() => {
    if (activeJobStatus && !IN_PROGRESS.includes(activeJobStatus)) {
      importsApi.list().then(r => {
        setJobs(r.data)
      })
    }
  }, [activeJobStatus])

  function handleUploaded(newJob: ImportJob) {
    setJobs(j => [newJob, ...j])
    setSelectedId(newJob.id)
  }

  const selectedJob = jobs.find(j => j.id === selectedId) ?? null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[20px] font-medium" style={{ color: 'var(--text)' }}>Import statement</h2>
        <p className="text-[12px] mt-0.5" style={{ color: 'var(--text3)' }}>Upload a bank PDF · AI extracts and categorises transactions</p>
      </div>

      {/* Upload form */}
      <div style={{ maxWidth: 480 }}>
        <UploadForm banks={banks} onUploaded={handleUploaded} />
      </div>

      {/* Import history */}
      {jobs.length > 0 && (
        <div>
          <p className="text-[13px] font-medium mb-3" style={{ color: 'var(--text2)' }}>Import history</p>
          <div className="rounded-xl border overflow-hidden flex flex-col sm:flex-row" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>

            {/* Left: job list */}
            <div className="sm:w-64 flex-shrink-0 border-b sm:border-b-0 sm:border-r overflow-y-auto" style={{ borderColor: 'var(--border)', maxHeight: 380 }}>
              {jobs.map(job => (
                <button
                  key={job.id}
                  onClick={() => setSelectedId(job.id)}
                  className="w-full text-left px-4 py-3 flex items-start gap-2.5 transition-colors border-b"
                  style={{
                    borderColor: 'var(--border)',
                    background: job.id === selectedId ? 'var(--gl)' : 'transparent',
                  }}
                  onMouseEnter={e => { if (job.id !== selectedId) e.currentTarget.style.background = 'var(--bg)' }}
                  onMouseLeave={e => { if (job.id !== selectedId) e.currentTarget.style.background = 'transparent' }}
                >
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${STATUS_DOT[job.status] || 'bg-gray-400'}`}
                  />
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium truncate" style={{ color: job.id === selectedId ? 'var(--green)' : 'var(--text)' }}>
                      {job.filename}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text3)' }}>{formatDateTime(job.created_at)}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Right: detail */}
            {selectedJob
              ? <JobDetail job={selectedJob} />
              : (
                <div className="flex-1 flex items-center justify-center p-8">
                  <p className="text-[12px]" style={{ color: 'var(--text3)' }}>Select an import to view details</p>
                </div>
              )
            }
          </div>
        </div>
      )}
    </div>
  )
}
