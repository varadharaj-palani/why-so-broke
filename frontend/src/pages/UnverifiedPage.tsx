import { useState, useEffect, useCallback } from 'react'
import { unverifiedApi } from '../api/imports'
import { categoriesApi } from '../api/categories'
import { modesApi } from '../api/modes'
import { UnverifiedTransaction } from '../types'
import { formatAmount } from '../utils/formatters'
import { XMarkIcon } from '@heroicons/react/24/outline'
import api from '../api/client'

// ─── Review Modal ─────────────────────────────────────────────────────────────

function ReviewModal({
  item,
  categories,
  modes,
  banks,
  onClose,
  onDiscard,
  onConfirm,
}: {
  item: UnverifiedTransaction
  categories: string[]
  modes: string[]
  banks: { id: string; name: string }[]
  onClose: () => void
  onDiscard: () => void
  onConfirm: (data: Partial<UnverifiedTransaction>) => void
}) {
  const [form, setForm] = useState({
    date: item.date || '',
    description: item.description || '',
    amount: item.amount || '',
    category: item.category || (categories[0] ?? ''),
    mode: item.mode || (modes[0] ?? ''),
    bank_id: item.bank_id || '',
  })
  const [saving, setSaving] = useState(false)

  const fi = "w-full border rounded-md px-3 py-2 text-[13px] outline-none focus:border-[var(--green)] transition-colors"
  const fiStyle = { background: 'var(--surface)', borderColor: 'var(--border2)', color: 'var(--text)' }
  const field = (label: string, child: React.ReactNode) => (
    <div className="mb-3.5">
      <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--text2)' }}>{label}</label>
      {child}
    </div>
  )

  return (
    <div className="fixed inset-0 flex items-start sm:items-center justify-center z-50 p-4 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="rounded-xl border p-4 sm:p-6 w-[460px] max-w-full my-auto" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[16px] font-medium" style={{ color: 'var(--text)' }}>Review: {(item.description || item.raw_text || '').slice(0, 30)}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        {item.raw_text && (
          <p className="text-[11px] font-mono mb-4 truncate" style={{ color: 'var(--text3)' }}>{item.raw_text}</p>
        )}

        {field('Date', <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={fi} style={fiStyle} />)}
        {field('Name', <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={fi} style={fiStyle} />)}
        {field('Amount', <input type="text" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className={fi} style={fiStyle} />)}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {field('Category', (
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={fi} style={fiStyle}>
              <option value="">Select…</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          ))}
          {field('Payment mode', (
            <select value={form.mode} onChange={e => setForm({ ...form, mode: e.target.value })} className={fi} style={fiStyle}>
              {modes.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          ))}
        </div>
        {field('Bank', (
          <select value={form.bank_id} onChange={e => setForm({ ...form, bank_id: e.target.value })} className={fi} style={fiStyle}>
            <option value="">Select bank…</option>
            {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        ))}

        <div className="flex flex-col-reverse sm:flex-row gap-2 mt-2">
          <button onClick={onClose} className="sm:flex-1 py-2 rounded-md text-[13px] border" style={{ borderColor: 'var(--border2)', color: 'var(--text2)', background: 'var(--surface)' }}>
            Cancel
          </button>
          <button onClick={onDiscard} className="sm:flex-1 py-2 rounded-md text-[13px]" style={{ background: 'var(--al)', color: 'var(--amber)', border: '0.5px solid var(--amber)' }}>
            Discard
          </button>
          <button
            disabled={saving}
            onClick={async () => {
              setSaving(true)
              await onConfirm(form)
              setSaving(false)
            }}
            className="sm:flex-1 py-2.5 rounded-md text-[13px] text-white disabled:opacity-50"
            style={{ background: 'var(--green)' }}
          >
            {saving ? 'Saving…' : 'Confirm & save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Tag Chip ─────────────────────────────────────────────────────────────────

function Tag({ label }: { label: string }) {
  return (
    <span className="text-[11px] px-2.5 py-1 rounded-full border" style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text2)' }}>
      {label}
    </span>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UnverifiedPage() {
  const [items, setItems] = useState<UnverifiedTransaction[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [reviewItem, setReviewItem] = useState<UnverifiedTransaction | null>(null)
  const [working, setWorking] = useState(false)
  const [categories, setCategories] = useState<string[]>([])
  const [modes, setModes] = useState<string[]>([])
  const [banks, setBanks] = useState<{ id: string; name: string }[]>([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await unverifiedApi.list({ status: 'pending', per_page: 50 })
      setItems(res.data.items)
      setTotal(res.data.total)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    categoriesApi.list().then(r => setCategories(r.data.map(c => c.name)))
    modesApi.list().then(r => setModes(r.data.map(m => m.name)))
    api.get('/banks').then(r => setBanks(r.data))
  }, [])

  const handleVerify = async (id: string) => {
    await unverifiedApi.verify(id)
    setItems(i => i.filter(x => x.id !== id))
    setTotal(t => t - 1)
  }

  const handleReject = async (id: string) => {
    await unverifiedApi.reject(id)
    setItems(i => i.filter(x => x.id !== id))
    setTotal(t => t - 1)
  }

  const handleApproveAll = async () => {
    setWorking(true)
    try {
      await unverifiedApi.bulkVerify(items.map(i => i.id))
      await fetchData()
    } finally {
      setWorking(false)
    }
  }

  const handleConfirm = async (data: Partial<UnverifiedTransaction>) => {
    if (!reviewItem) return
    await unverifiedApi.update(reviewItem.id, data)
    await handleVerify(reviewItem.id)
    setReviewItem(null)
  }

  const handleDiscard = async () => {
    if (!reviewItem) return
    await handleReject(reviewItem.id)
    setReviewItem(null)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-medium" style={{ color: 'var(--text)' }}>Unverified</h2>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--text3)' }}>
            {total > 0 ? `${total} pending — click to review and confirm` : 'No pending transactions'}
          </p>
        </div>
        {items.length > 0 && (
          <button
            onClick={handleApproveAll}
            disabled={working}
            className="px-3 py-1.5 rounded-md text-[13px] text-white disabled:opacity-50"
            style={{ background: 'var(--green)' }}
          >
            {working ? 'Approving…' : 'Approve all'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: 'var(--border)' }} />)}
        </div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <p className="text-[13px]" style={{ color: 'var(--text3)' }}>No pending transactions. Import a PDF to get started.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map(item => (
            <div
              key={item.id}
              onClick={() => setReviewItem(item)}
              className="rounded-xl border p-4 cursor-pointer transition-all"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--green)'
                e.currentTarget.style.background = 'var(--gl)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.background = 'var(--surface)'
              }}
            >
              <div className="flex justify-between items-start mb-2 gap-3">
                <div className="min-w-0">
                  <p className="text-[14px] font-medium truncate" style={{ color: 'var(--text)' }}>{item.description || item.raw_text?.slice(0, 40) || '—'}</p>
                  {item.raw_text && (
                    <p className="text-[11px] font-mono mt-0.5 truncate" style={{ color: 'var(--text3)' }}>{item.raw_text}</p>
                  )}
                </div>
                <span className="text-[15px] font-medium flex-shrink-0" style={{ color: 'var(--text)' }}>
                  {item.amount ? formatAmount(item.amount) : '—'}
                </span>
              </div>
              <div className="flex gap-1.5 flex-wrap mt-2">
                <Tag label={item.category || 'Category not set'} />
                {item.mode && <Tag label={item.mode} />}
                {item.bank && <Tag label={item.bank.name} />}
              </div>
              <p className="text-[11px] mt-2 flex items-center gap-1" style={{ color: 'var(--text3)' }}>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M7 4.5v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  <circle cx="7" cy="9.5" r=".6" fill="currentColor" />
                </svg>
                Click to set category and confirm
              </p>
            </div>
          ))}
        </div>
      )}

      {reviewItem && (
        <ReviewModal
          item={reviewItem}
          categories={categories}
          modes={modes}
          banks={banks}
          onClose={() => setReviewItem(null)}
          onDiscard={handleDiscard}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  )
}
