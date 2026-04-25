import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { jarsApi } from '../api/jars'
import { banksApi } from '../api/banks'
import { Jar, JarContribution, Bank } from '../types'
import { formatAmount, formatDate } from '../utils/formatters'
import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  TrashIcon,
  XMarkIcon,
  PencilIcon,
  ArchiveBoxIcon,
} from '@heroicons/react/24/outline'
import dayjs from 'dayjs'

const TODAY = dayjs().format('YYYY-MM-DD')

const JAR_COLORS = [
  '#22c55e', '#3b82f6', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
]

const JAR_EMOJIS = ['🏦', '💰', '🏠', '✈️', '🎓', '🏥', '🚗', '💍', '🌴', '📱', '🎮', '🍕', '💻', '🎁', '⚽', '🎵']

// ── Confirm Modal ─────────────────────────────────────────────────────────────

function ConfirmModal({
  title,
  body,
  confirmLabel,
  confirmStyle,
  onCancel,
  onConfirm,
}: {
  title: string
  body: string
  confirmLabel: string
  confirmStyle?: React.CSSProperties
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-[70]" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="rounded-xl border p-6 w-[360px] max-w-[94vw]" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <h3 className="text-[15px] font-medium mb-2" style={{ color: 'var(--text)' }}>{title}</h3>
        <p className="text-[13px] mb-5" style={{ color: 'var(--text3)' }}>{body}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2 rounded-md text-[13px] border"
            style={{ borderColor: 'var(--border2)', color: 'var(--text2)', background: 'var(--surface)' }}>
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 py-2 rounded-md text-[13px]"
            style={{ background: 'var(--amber)', color: '#1a1a1a', ...confirmStyle }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Contribution Modal ────────────────────────────────────────────────────────

function ContributionModal({
  jarName,
  type,
  banks,
  onClose,
  onSave,
}: {
  jarName: string
  type: 'add' | 'withdraw'
  banks: Bank[]
  onClose: () => void
  onSave: (data: { bank_id?: string; amount: string; date: string; notes?: string }) => Promise<void>
}) {
  const [form, setForm] = useState({ bank_id: '', amount: '', date: TODAY, notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isAdd = type === 'add'
  const accentBg = isAdd ? 'var(--green)' : 'var(--amber)'
  const fi = "w-full border rounded-md px-3 py-2 text-[13px] outline-none transition-colors"
  const fiStyle = { background: 'var(--surface)', borderColor: 'var(--border2)', color: 'var(--text)' }

  async function handleSave() {
    const raw = parseFloat(form.amount)
    if (!form.amount || isNaN(raw) || raw <= 0) { setError('Enter a positive amount'); return }
    if (!form.date) { setError('Date is required'); return }
    setSaving(true)
    setError('')
    try {
      const signed = isAdd ? String(raw) : String(-raw)
      await onSave({ bank_id: form.bank_id || undefined, amount: signed, date: form.date, notes: form.notes || undefined })
    } catch (err: unknown) {
      setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[60]" style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="rounded-xl border p-6 w-[380px] max-w-[94vw] space-y-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-[16px] font-medium" style={{ color: 'var(--text)' }}>
            {isAdd ? `Add funds to ${jarName}` : `Withdraw from ${jarName}`}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
        <div>
          <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--text2)' }}>Amount (₹)</label>
          <input type="number" min="0.01" step="0.01" value={form.amount}
            onChange={e => setForm({ ...form, amount: e.target.value })}
            className={fi} style={fiStyle} placeholder="e.g. 5000" />
        </div>
        <div>
          <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--text2)' }}>Bank account (optional)</label>
          <select value={form.bank_id} onChange={e => setForm({ ...form, bank_id: e.target.value })}
            className={fi} style={fiStyle}>
            <option value="">No specific bank</option>
            {banks.map(b => <option key={b.id} value={b.id}>{b.name}{b.short_code ? ` (${b.short_code})` : ''}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--text2)' }}>Date</label>
          <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
            className={fi} style={fiStyle} />
        </div>
        <div>
          <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--text2)' }}>Notes (optional)</label>
          <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
            className={fi} style={fiStyle} placeholder="e.g. Monthly savings" />
        </div>
        {error && <p className="text-[12px] text-red-500">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 rounded-md text-[13px] border"
            style={{ borderColor: 'var(--border2)', color: 'var(--text2)', background: 'var(--surface)' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2 rounded-md text-[13px] disabled:opacity-50"
            style={{ background: accentBg, color: isAdd ? 'white' : '#1a1a1a' }}>
            {saving ? 'Saving…' : isAdd ? 'Add funds' : 'Withdraw'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Edit Jar Modal ────────────────────────────────────────────────────────────

function EditJarModal({
  jar,
  onClose,
  onSave,
}: {
  jar: Jar
  onClose: () => void
  onSave: (data: { name: string; description?: string; target_amount?: string; color?: string; emoji?: string }) => Promise<void>
}) {
  const [form, setForm] = useState({
    name: jar.name,
    description: jar.description ?? '',
    target_amount: jar.target_amount ?? '',
    color: jar.color ?? JAR_COLORS[0],
    emoji: jar.emoji ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fi = "w-full border rounded-md px-3 py-2 text-[13px] outline-none focus:border-[var(--green)] transition-colors"
  const fiStyle = { background: 'var(--surface)', borderColor: 'var(--border2)', color: 'var(--text)' }

  async function handleSave() {
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError('')
    try {
      await onSave({
        name: form.name.trim(),
        description: form.description || undefined,
        target_amount: form.target_amount ? String(form.target_amount) : undefined,
        color: form.color || undefined,
        emoji: form.emoji || undefined,
      })
    } catch (err: unknown) {
      setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="rounded-xl border p-6 w-[420px] max-w-[94vw] space-y-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-[16px] font-medium" style={{ color: 'var(--text)' }}>Edit jar</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
        <div>
          <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--text2)' }}>Name</label>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            className={fi} style={fiStyle} />
        </div>
        <div>
          <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--text2)' }}>Description (optional)</label>
          <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            className={fi} style={fiStyle} placeholder="What's this jar for?" />
        </div>
        <div>
          <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--text2)' }}>Target amount (optional)</label>
          <input type="number" min="1" step="0.01" value={form.target_amount}
            onChange={e => setForm({ ...form, target_amount: e.target.value })}
            className={fi} style={fiStyle} placeholder="e.g. 50000" />
        </div>
        <div>
          <label className="block text-[12px] font-medium mb-2" style={{ color: 'var(--text2)' }}>Color</label>
          <div className="flex gap-2 flex-wrap">
            {JAR_COLORS.map(c => (
              <button key={c} onClick={() => setForm({ ...form, color: c })}
                className="w-6 h-6 rounded-full border-2 transition-all"
                style={{ background: c, borderColor: form.color === c ? 'var(--text)' : 'transparent' }} />
            ))}
          </div>
        </div>
        <div>
          <label className="block text-[12px] font-medium mb-2" style={{ color: 'var(--text2)' }}>Icon (optional)</label>
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setForm({ ...form, emoji: '' })}
              className="w-8 h-8 rounded-md border text-[13px] transition-all flex items-center justify-center"
              style={{ borderColor: form.emoji === '' ? 'var(--text)' : 'var(--border2)', background: form.emoji === '' ? 'var(--border)' : 'var(--surface)', color: 'var(--text4)' }}
              title="No icon">✕</button>
            {JAR_EMOJIS.map(em => (
              <button key={em} onClick={() => setForm({ ...form, emoji: em })}
                className="w-8 h-8 rounded-md border text-[18px] transition-all"
                style={{ borderColor: form.emoji === em ? 'var(--text)' : 'var(--border2)', background: form.emoji === em ? 'var(--border)' : 'var(--surface)' }}>
                {em}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-[12px] text-red-500">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 rounded-md text-[13px] border"
            style={{ borderColor: 'var(--border2)', color: 'var(--text2)', background: 'var(--surface)' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2 rounded-md text-[13px] text-white disabled:opacity-50"
            style={{ background: 'var(--green)' }}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function JarDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  const [jar, setJar] = useState<Jar | null>(null)
  const [jars, setJars] = useState<Jar[]>((location.state as { jars?: Jar[] })?.jars ?? [])
  const [contributions, setContributions] = useState<JarContribution[]>([])
  const [banks, setBanks] = useState<Bank[]>([])
  const [loading, setLoading] = useState(true)
  const [contribLoading, setContribLoading] = useState(true)

  const [contribModal, setContribModal] = useState<'add' | 'withdraw' | null>(null)
  const [editModal, setEditModal] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [confirmDeleteContrib, setConfirmDeleteContrib] = useState<JarContribution | null>(null)

  const loadJar = useCallback(async () => {
    if (!id) return
    try {
      // fetch all jars to get current data; find ours
      const r = await jarsApi.list()
      const all = r.data
      if (jars.length === 0) setJars(all)
      const found = all.find(j => j.id === id)
      if (found) setJar(found)
    } finally {
      setLoading(false)
    }
  }, [id, jars.length])

  const loadContributions = useCallback(async () => {
    if (!id) return
    setContribLoading(true)
    try {
      const r = await jarsApi.listContributions(id)
      setContributions(r.data)
    } finally {
      setContribLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadJar()
    loadContributions()
    banksApi.list().then(r => setBanks(r.data.filter((b: Bank) => !b.is_archived))).catch(() => {})
  }, [loadJar, loadContributions])

  // Prev / Next navigation
  const currentIndex = jars.findIndex(j => j.id === id)
  const prevJar = currentIndex > 0 ? jars[currentIndex - 1] : null
  const nextJar = currentIndex !== -1 && currentIndex < jars.length - 1 ? jars[currentIndex + 1] : null

  function navToJar(j: Jar) {
    navigate(`/jars/${j.id}`, { state: { jars } })
  }

  async function handleContribution(data: { bank_id?: string; amount: string; date: string; notes?: string }) {
    if (!id) return
    await jarsApi.addContribution(id, data)
    setContribModal(null)
    loadContributions()
    loadJar()
  }

  async function handleDeleteContribution(c: JarContribution) {
    if (!id) return
    await jarsApi.deleteContribution(id, c.id)
    setConfirmDeleteContrib(null)
    loadContributions()
    loadJar()
  }

  async function handleArchive() {
    if (!jar) return
    await jarsApi.archive(jar.id)
    setConfirmArchive(false)
    navigate('/jars')
  }

  async function handleEditSave(data: { name: string; description?: string; target_amount?: string; color?: string; emoji?: string }) {
    if (!jar) return
    await jarsApi.update(jar.id, data)
    setEditModal(false)
    loadJar()
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-24 rounded animate-pulse" style={{ background: 'var(--border)' }} />
        <div className="h-14 rounded-xl animate-pulse" style={{ background: 'var(--border)' }} />
        <div className="h-32 rounded-xl animate-pulse" style={{ background: 'var(--border)' }} />
      </div>
    )
  }

  if (!jar) {
    return (
      <div className="py-24 text-center">
        <p className="text-[14px] mb-4" style={{ color: 'var(--text3)' }}>Jar not found.</p>
        <button onClick={() => navigate('/jars')} className="text-[13px]"
          style={{ color: 'var(--green)', background: 'none', border: 'none', cursor: 'pointer' }}>
          ← Back to jars
        </button>
      </div>
    )
  }

  const color = jar.color || '#22c55e'
  const emoji = jar.emoji || '🫙'
  const balance = parseFloat(jar.balance)
  const target = jar.target_amount ? parseFloat(jar.target_amount) : null
  const pct = target ? Math.min((balance / target) * 100, 100) : 0

  return (
    <div className="space-y-0 max-w-2xl mx-auto">
      {/* Top nav row */}
      <div className="flex items-center justify-between pb-4">
        <button
          onClick={() => navigate('/jars')}
          className="flex items-center gap-1.5 text-[13px] px-3 py-1.5 rounded-md border transition-colors"
          style={{ borderColor: 'var(--border2)', color: 'var(--text3)', background: 'var(--surface)' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text3)' }}
        >
          <ArrowLeftIcon className="w-3.5 h-3.5" /> Jars
        </button>

        <div className="flex items-center gap-2">
          {prevJar && (
            <button
              onClick={() => navToJar(prevJar)}
              className="flex items-center gap-1 text-[12px] px-2.5 py-1.5 rounded-md border transition-colors"
              style={{ borderColor: 'var(--border2)', color: 'var(--text3)', background: 'var(--surface)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text3)' }}
            >
              <ChevronLeftIcon className="w-3 h-3" />
              <span className="max-w-[100px] truncate">{prevJar.name}</span>
            </button>
          )}
          {nextJar && (
            <button
              onClick={() => navToJar(nextJar)}
              className="flex items-center gap-1 text-[12px] px-2.5 py-1.5 rounded-md border transition-colors"
              style={{ borderColor: 'var(--border2)', color: 'var(--text3)', background: 'var(--surface)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text3)' }}
            >
              <span className="max-w-[100px] truncate">{nextJar.name}</span>
              <ChevronRightIcon className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Header band */}
      <div
        className="rounded-t-xl flex items-center gap-3 px-6 py-4"
        style={{ background: color }}
      >
        <span className="text-[32px] leading-none">{emoji}</span>
        <h1 className="text-[22px] font-bold" style={{ color: 'white' }}>{jar.name}</h1>
      </div>

      {/* Main card body */}
      <div className="rounded-b-xl border border-t-0 overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>

        {/* Balance / target / progress */}
        <div className="px-6 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-end justify-between mb-1">
            <div>
              <p className="text-[11px] uppercase tracking-wide mb-0.5" style={{ color: 'var(--text4)' }}>Balance</p>
              <p className="text-[32px] font-bold leading-none" style={{ color }}>{formatAmount(jar.balance)}</p>
            </div>
            {target && (
              <div className="text-right">
                <p className="text-[11px]" style={{ color: 'var(--text3)' }}>Target</p>
                <p className="text-[16px] font-semibold" style={{ color: 'var(--text2)' }}>{formatAmount(jar.target_amount!)}</p>
              </div>
            )}
          </div>
          {target && (
            <div className="mt-4">
              <div className="h-2.5 rounded-full mb-2" style={{ background: 'var(--border)' }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
              </div>
              <div className="flex justify-between text-[11px]" style={{ color: 'var(--text4)' }}>
                <span>{pct.toFixed(0)}% of goal</span>
                <span>{formatAmount(String(Math.max(0, target - balance)))} remaining</span>
              </div>
            </div>
          )}
          {jar.description && (
            <p className="mt-3 text-[13px]" style={{ color: 'var(--text3)' }}>{jar.description}</p>
          )}
        </div>

        {/* By bank */}
        {jar.bank_breakdown.length > 0 && (
          <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <p className="text-[11px] uppercase tracking-wide mb-3" style={{ color: 'var(--text4)' }}>By bank</p>
            <div className="space-y-2">
              {jar.bank_breakdown.map((b, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-[13px]" style={{ color: 'var(--text2)' }}>{b.bank_name ?? 'No bank'}</span>
                  <span className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>{formatAmount(b.total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add / Withdraw */}
        <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex gap-3">
            <button
              onClick={() => setContribModal('add')}
              className="flex-1 py-2.5 rounded-lg text-[13px] font-medium text-white"
              style={{ background: 'var(--green)' }}>
              Add funds
            </button>
            <button
              onClick={() => setContribModal('withdraw')}
              className="flex-1 py-2.5 rounded-lg text-[13px] font-medium border"
              style={{ borderColor: 'var(--amber)', color: 'var(--amber)', background: 'var(--al)' }}>
              Withdraw
            </button>
          </div>
        </div>

        {/* History */}
        <div className="px-6 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <p className="text-[11px] uppercase tracking-wide mb-4" style={{ color: 'var(--text4)' }}>History</p>
          {contribLoading ? (
            <p className="text-[12px] py-6 text-center" style={{ color: 'var(--text4)' }}>Loading…</p>
          ) : contributions.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-[13px]" style={{ color: 'var(--text3)' }}>No contributions yet.</p>
              <p className="text-[12px] mt-1" style={{ color: 'var(--text4)' }}>Add funds to start tracking.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {contributions.map(c => {
                const isPositive = parseFloat(c.amount) >= 0
                const borderColor = isPositive ? 'var(--green)' : 'var(--amber)'
                return (
                  <div
                    key={c.id}
                    className="flex items-stretch gap-0 rounded-lg overflow-hidden border"
                    style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
                  >
                    {/* Colored left timeline border */}
                    <div className="w-[3px] flex-shrink-0" style={{ background: borderColor }} />

                    <div className="flex items-center justify-between flex-1 px-4 py-3 gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <span
                          className="flex-shrink-0 mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={{
                            background: isPositive ? 'var(--gl)' : 'var(--al)',
                            color: isPositive ? 'var(--green)' : 'var(--amber)',
                          }}
                        >
                          {isPositive ? 'Added' : 'Withdrawn'}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[14px] font-semibold leading-none" style={{ color: isPositive ? 'var(--green)' : 'var(--amber)' }}>
                            {isPositive ? '+' : ''}{formatAmount(c.amount)}
                          </p>
                          <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
                            {c.bank_name && <span className="text-[11px]" style={{ color: 'var(--text3)' }}>{c.bank_name}</span>}
                            {c.notes && <span className="text-[11px]" style={{ color: 'var(--text4)' }}>· {c.notes}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-[11px]" style={{ color: 'var(--text4)' }}>{formatDate(c.date)}</span>
                        <button
                          onClick={() => setConfirmDeleteContrib(c)}
                          className="p-1 rounded transition-colors"
                          style={{ color: 'var(--text4)', background: 'none', border: 'none', cursor: 'pointer' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text4)')}
                          title="Delete entry"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Edit / Archive */}
        <div className="px-6 py-4 flex items-center gap-3">
          <button
            onClick={() => setEditModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md border text-[13px] transition-colors"
            style={{ borderColor: 'var(--border2)', color: 'var(--text3)', background: 'var(--surface)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--text3)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.borderColor = 'var(--border2)' }}
          >
            <PencilIcon className="w-4 h-4" /> Edit jar
          </button>
          <button
            onClick={() => setConfirmArchive(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md border text-[13px] transition-colors"
            style={{ borderColor: 'var(--border2)', color: 'var(--text3)', background: 'var(--surface)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--amber)'; e.currentTarget.style.borderColor = 'var(--amber)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.borderColor = 'var(--border2)' }}
          >
            <ArchiveBoxIcon className="w-4 h-4" /> Archive jar
          </button>
        </div>
      </div>

      {/* Modals */}
      {contribModal && (
        <ContributionModal
          jarName={jar.name}
          type={contribModal}
          banks={banks}
          onClose={() => setContribModal(null)}
          onSave={handleContribution}
        />
      )}

      {editModal && (
        <EditJarModal jar={jar} onClose={() => setEditModal(false)} onSave={handleEditSave} />
      )}

      {confirmArchive && (
        <ConfirmModal
          title="Archive jar?"
          body={`Archive "${jar.name}"? It will be hidden but its contribution history is preserved.`}
          confirmLabel="Archive"
          onCancel={() => setConfirmArchive(false)}
          onConfirm={handleArchive}
        />
      )}

      {confirmDeleteContrib && (
        <ConfirmModal
          title="Delete this entry?"
          body={`Remove this ${parseFloat(confirmDeleteContrib.amount) >= 0 ? 'deposit' : 'withdrawal'} of ${formatAmount(confirmDeleteContrib.amount)} from ${formatDate(confirmDeleteContrib.date)}? This cannot be undone.`}
          confirmLabel="Delete"
          confirmStyle={{ background: '#ef4444', color: 'white' }}
          onCancel={() => setConfirmDeleteContrib(null)}
          onConfirm={() => handleDeleteContribution(confirmDeleteContrib)}
        />
      )}
    </div>
  )
}
