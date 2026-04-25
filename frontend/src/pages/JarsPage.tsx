import { useState, useEffect, useCallback } from 'react'
import { jarsApi } from '../api/jars'
import { banksApi } from '../api/banks'
import { Jar, JarContribution, Bank } from '../types'
import { formatAmount, formatDate } from '../utils/formatters'
import { PlusIcon, XMarkIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import dayjs from 'dayjs'

const TODAY = dayjs().format('YYYY-MM-DD')

const JAR_COLORS = [
  '#22c55e', '#3b82f6', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
]

// ─── Jar Modal ─────────────────────────────────────────────────────────────────

function JarModal({
  jar,
  onClose,
  onSave,
}: {
  jar: Jar | null
  onClose: () => void
  onSave: (data: { name: string; description?: string; target_amount?: string; color?: string }) => Promise<void>
}) {
  const [form, setForm] = useState({
    name: jar?.name ?? '',
    description: jar?.description ?? '',
    target_amount: jar?.target_amount ?? '',
    color: jar?.color ?? JAR_COLORS[0],
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
      <div className="rounded-xl border p-6 w-[400px] max-w-[94vw] space-y-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-[16px] font-medium" style={{ color: 'var(--text)' }}>{jar ? 'Edit jar' : 'New jar'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        <div>
          <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--text2)' }}>Name</label>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            className={fi} style={fiStyle} placeholder="e.g. Emergency Fund" />
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
              <button
                key={c}
                onClick={() => setForm({ ...form, color: c })}
                className="w-6 h-6 rounded-full border-2 transition-all"
                style={{ background: c, borderColor: form.color === c ? 'var(--text)' : 'transparent' }}
              />
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
            {saving ? 'Saving…' : jar ? 'Save changes' : 'Create jar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Contribution Modal ────────────────────────────────────────────────────────

function ContributionModal({
  jarName,
  banks,
  onClose,
  onSave,
}: {
  jarName: string
  banks: Bank[]
  onClose: () => void
  onSave: (data: { bank_id?: string; amount: string; date: string; notes?: string }) => Promise<void>
}) {
  const [form, setForm] = useState({ bank_id: '', amount: '', date: TODAY, notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fi = "w-full border rounded-md px-3 py-2 text-[13px] outline-none focus:border-[var(--green)] transition-colors"
  const fiStyle = { background: 'var(--surface)', borderColor: 'var(--border2)', color: 'var(--text)' }

  async function handleSave() {
    if (!form.amount || parseFloat(form.amount) === 0) { setError('Amount cannot be zero'); return }
    if (!form.date) { setError('Date is required'); return }
    setSaving(true)
    setError('')
    try {
      await onSave({
        bank_id: form.bank_id || undefined,
        amount: form.amount,
        date: form.date,
        notes: form.notes || undefined,
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
      <div className="rounded-xl border p-6 w-[380px] max-w-[94vw] space-y-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-[16px] font-medium" style={{ color: 'var(--text)' }}>Add to {jarName}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        <div>
          <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--text2)' }}>Amount (₹)</label>
          <input type="number" step="0.01" value={form.amount}
            onChange={e => setForm({ ...form, amount: e.target.value })}
            className={fi} style={fiStyle} placeholder="Positive to add, negative to withdraw" />
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
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2 rounded-md text-[13px] text-white disabled:opacity-50"
            style={{ background: 'var(--green)' }}>
            {saving ? 'Saving…' : 'Add to jar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Jar Card ──────────────────────────────────────────────────────────────────

function JarCard({
  jar,
  banks,
  onEdit,
  onArchive,
  onContributionAdded,
}: {
  jar: Jar
  banks: Bank[]
  onEdit: () => void
  onArchive: () => void
  onContributionAdded: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [contributions, setContributions] = useState<JarContribution[]>([])
  const [contribLoading, setContribLoading] = useState(false)
  const [showAddContrib, setShowAddContrib] = useState(false)

  const balance = parseFloat(jar.balance)
  const target = jar.target_amount ? parseFloat(jar.target_amount) : null
  const pct = target ? Math.min((balance / target) * 100, 100) : 0
  const color = jar.color || '#22c55e'

  async function loadContributions() {
    setContribLoading(true)
    try {
      const r = await jarsApi.listContributions(jar.id)
      setContributions(r.data)
    } finally {
      setContribLoading(false)
    }
  }

  function handleExpand() {
    setExpanded(e => {
      if (!e) loadContributions()
      return !e
    })
  }

  async function handleAddContribution(data: { bank_id?: string; amount: string; date: string; notes?: string }) {
    await jarsApi.addContribution(jar.id, data)
    setShowAddContrib(false)
    loadContributions()
    onContributionAdded()
  }

  async function handleDeleteContribution(id: string) {
    await jarsApi.deleteContribution(jar.id, id)
    loadContributions()
    onContributionAdded()
  }

  return (
    <>
      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: expanded ? color : 'var(--border)' }}>
        {/* Color stripe */}
        <div className="h-1" style={{ background: color }} />

        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="text-[14px] font-medium" style={{ color: 'var(--text)' }}>{jar.name}</h4>
              {jar.description && (
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text3)' }}>{jar.description}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-[15px] font-semibold" style={{ color }}>{formatAmount(jar.balance)}</p>
              {target && (
                <p className="text-[11px]" style={{ color: 'var(--text3)' }}>of {formatAmount(jar.target_amount!)}</p>
              )}
            </div>
          </div>

          {target && (
            <div className="h-1.5 rounded-full mb-3" style={{ background: 'var(--border)' }}>
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: color }} />
            </div>
          )}

          {/* Bank breakdown chips */}
          {jar.bank_breakdown.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {jar.bank_breakdown.map((b, i) => (
                <span key={i} className="text-[11px] px-2 py-0.5 rounded-full border" style={{ borderColor: 'var(--border2)', color: 'var(--text3)', background: 'var(--bg)' }}>
                  {b.bank_name ?? 'No bank'}: {formatAmount(b.total)}
                </span>
              ))}
            </div>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <div className="flex gap-2">
              <button
                onClick={e => { e.stopPropagation(); setShowAddContrib(true) }}
                className="flex items-center gap-1 text-[12px] font-medium px-2.5 py-1 rounded-md"
                style={{ background: 'var(--gl)', color: 'var(--green)', border: '0.5px solid var(--green)' }}
              >
                <PlusIcon className="w-3 h-3" /> Add
              </button>
              <button
                onClick={e => { e.stopPropagation(); onEdit() }}
                className="text-[12px] px-2.5 py-1 rounded-md border"
                style={{ borderColor: 'var(--border2)', color: 'var(--text3)', background: 'var(--surface)' }}
              >
                Edit
              </button>
              <button
                onClick={e => { e.stopPropagation(); onArchive() }}
                className="text-[12px] px-2.5 py-1 rounded-md"
                style={{ background: 'var(--al)', color: 'var(--amber)', border: '0.5px solid var(--amber)' }}
              >
                Archive
              </button>
            </div>
            <button
              onClick={handleExpand}
              className="flex items-center gap-1 text-[11px]"
              style={{ color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              History {expanded ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="border-t px-4 pb-4 pt-3" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
            {contribLoading ? (
              <p className="text-[12px] py-3 text-center" style={{ color: 'var(--text4)' }}>Loading…</p>
            ) : contributions.length === 0 ? (
              <p className="text-[12px] py-3 text-center" style={{ color: 'var(--text4)' }}>No contributions yet.</p>
            ) : (
              <div className="space-y-2">
                {contributions.map(c => (
                  <div key={c.id} className="flex items-center justify-between">
                    <div>
                      <span className="text-[13px] font-medium" style={{ color: parseFloat(c.amount) < 0 ? 'var(--amber)' : 'var(--green)' }}>
                        {parseFloat(c.amount) > 0 ? '+' : ''}{formatAmount(c.amount)}
                      </span>
                      {c.bank_name && (
                        <span className="ml-1.5 text-[11px]" style={{ color: 'var(--text3)' }}>{c.bank_name}</span>
                      )}
                      {c.notes && (
                        <span className="ml-1.5 text-[11px]" style={{ color: 'var(--text4)' }}>· {c.notes}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px]" style={{ color: 'var(--text4)' }}>{formatDate(c.date)}</span>
                      <button
                        onClick={() => handleDeleteContribution(c.id)}
                        className="p-1 rounded"
                        style={{ color: 'var(--text4)', background: 'none', border: 'none', cursor: 'pointer' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text4)')}
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showAddContrib && (
        <ContributionModal
          jarName={jar.name}
          banks={banks}
          onClose={() => setShowAddContrib(false)}
          onSave={handleAddContribution}
        />
      )}
    </>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function JarsPage() {
  const [jars, setJars] = useState<Jar[]>([])
  const [banks, setBanks] = useState<Bank[]>([])
  const [loading, setLoading] = useState(false)
  const [modalJar, setModalJar] = useState<Jar | 'new' | null>(null)
  const [confirmArchive, setConfirmArchive] = useState<Jar | null>(null)

  const fetchJars = useCallback(async () => {
    setLoading(true)
    try {
      const r = await jarsApi.list()
      setJars(r.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchJars()
    banksApi.list().then(r => setBanks(r.data.filter(b => !b.is_archived))).catch(() => {})
  }, [fetchJars])

  async function handleSave(data: { name: string; description?: string; target_amount?: string; color?: string }) {
    if (modalJar && modalJar !== 'new') {
      await jarsApi.update(modalJar.id, data)
    } else {
      await jarsApi.create(data)
    }
    setModalJar(null)
    fetchJars()
  }

  async function handleArchive(jar: Jar) {
    await jarsApi.archive(jar.id)
    setConfirmArchive(null)
    fetchJars()
  }

  const totalSaved = jars.reduce((sum, j) => sum + parseFloat(j.balance), 0)

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-medium" style={{ color: 'var(--text)' }}>Jars</h2>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--text3)' }}>
            Virtual savings pockets — money stays in your bank, mentally allocated here
            {jars.length > 0 && ` · ${formatAmount(totalSaved)} total saved`}
          </p>
        </div>
        <button
          onClick={() => setModalJar('new')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] text-white flex-shrink-0"
          style={{ background: 'var(--green)' }}
        >
          <PlusIcon className="w-4 h-4" /> New jar
        </button>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-3">
          {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-xl animate-pulse" style={{ background: 'var(--border)' }} />)}
        </div>
      ) : jars.length === 0 ? (
        <div className="py-16 text-center rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <p className="text-[13px] mb-2" style={{ color: 'var(--text3)' }}>No jars yet.</p>
          <button
            onClick={() => setModalJar('new')}
            className="text-[13px] font-medium"
            style={{ color: 'var(--green)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Create your first jar →
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {jars.map(jar => (
            <JarCard
              key={jar.id}
              jar={jar}
              banks={banks}
              onEdit={() => setModalJar(jar)}
              onArchive={() => setConfirmArchive(jar)}
              onContributionAdded={fetchJars}
            />
          ))}
        </div>
      )}

      {modalJar !== null && (
        <JarModal
          jar={modalJar === 'new' ? null : modalJar}
          onClose={() => setModalJar(null)}
          onSave={handleSave}
        />
      )}

      {confirmArchive && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="rounded-xl border p-6 w-[360px] max-w-[94vw]" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h3 className="text-[15px] font-medium mb-2" style={{ color: 'var(--text)' }}>Archive jar?</h3>
            <p className="text-[13px] mb-5" style={{ color: 'var(--text3)' }}>
              Archive <strong style={{ color: 'var(--text)' }}>{confirmArchive.name}</strong>? It will be hidden but its contribution history is preserved.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmArchive(null)} className="flex-1 py-2 rounded-md text-[13px] border"
                style={{ borderColor: 'var(--border2)', color: 'var(--text2)', background: 'var(--surface)' }}>
                Cancel
              </button>
              <button onClick={() => handleArchive(confirmArchive)} className="flex-1 py-2 rounded-md text-[13px] text-white"
                style={{ background: 'var(--amber)' }}>
                Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
