import { useState, useEffect, useCallback } from 'react'
import { jarsApi } from '../api/jars'
import { banksApi } from '../api/banks'
import { Jar, JarContribution, Bank } from '../types'
import { formatAmount, formatDate } from '../utils/formatters'
import { PlusIcon, XMarkIcon, TrashIcon } from '@heroicons/react/24/outline'
import dayjs from 'dayjs'

const TODAY = dayjs().format('YYYY-MM-DD')

const JAR_COLORS = [
  '#22c55e', '#3b82f6', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
]

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
      await onSave({
        bank_id: form.bank_id || undefined,
        amount: signed,
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

function JarDrawer({
  jar,
  banks,
  onClose,
  onEdit,
  onArchive,
  onContributionAdded,
}: {
  jar: Jar
  banks: Bank[]
  onClose: () => void
  onEdit: () => void
  onArchive: () => void
  onContributionAdded: () => void
}) {
  const [contributions, setContributions] = useState<JarContribution[]>([])
  const [contribLoading, setContribLoading] = useState(true)
  const [contribModal, setContribModal] = useState<'add' | 'withdraw' | null>(null)

  const color = jar.color || '#22c55e'
  const balance = parseFloat(jar.balance)
  const target = jar.target_amount ? parseFloat(jar.target_amount) : null
  const pct = target ? Math.min((balance / target) * 100, 100) : 0

  const loadContributions = useCallback(async () => {
    setContribLoading(true)
    try {
      const r = await jarsApi.listContributions(jar.id)
      setContributions(r.data)
    } finally {
      setContribLoading(false)
    }
  }, [jar.id])

  useEffect(() => { loadContributions() }, [loadContributions])

  async function handleAddContribution(data: { bank_id?: string; amount: string; date: string; notes?: string }) {
    await jarsApi.addContribution(jar.id, data)
    setContribModal(null)
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
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.35)' }} onClick={onClose} />
      <div
        className="fixed top-0 right-0 h-full z-40 flex flex-col overflow-hidden shadow-2xl"
        style={{ width: 'min(420px, 100vw)', background: 'var(--surface)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ background: color }}>
          <h2 className="text-[17px] font-semibold" style={{ color: 'white' }}>{jar.name}</h2>
          <button onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', borderRadius: '6px', padding: '4px' }}>
            <XMarkIcon className="w-4 h-4" style={{ color: 'white' }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
            {jar.description && (
              <p className="text-[13px] mb-4" style={{ color: 'var(--text3)' }}>{jar.description}</p>
            )}
            <div className="flex items-end justify-between mb-1">
              <div>
                <p className="text-[11px] uppercase tracking-wide mb-0.5" style={{ color: 'var(--text4)' }}>Balance</p>
                <p className="text-[26px] font-bold leading-none" style={{ color }}>{formatAmount(jar.balance)}</p>
              </div>
              {target && (
                <div className="text-right">
                  <p className="text-[11px]" style={{ color: 'var(--text3)' }}>Target</p>
                  <p className="text-[14px] font-medium" style={{ color: 'var(--text2)' }}>{formatAmount(jar.target_amount!)}</p>
                </div>
              )}
            </div>
            {target && (
              <div className="mt-3">
                <div className="flex justify-between text-[11px] mb-1" style={{ color: 'var(--text4)' }}>
                  <span>{pct.toFixed(0)}% of goal</span>
                  <span>{formatAmount(String(Math.max(0, target - balance)))} remaining</span>
                </div>
                <div className="h-2 rounded-full" style={{ background: 'var(--border)' }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
            )}
          </div>

          {jar.bank_breakdown.length > 0 && (
            <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
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

          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
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

          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <p className="text-[11px] uppercase tracking-wide mb-3" style={{ color: 'var(--text4)' }}>History</p>
            {contribLoading ? (
              <p className="text-[12px] py-4 text-center" style={{ color: 'var(--text4)' }}>Loading…</p>
            ) : contributions.length === 0 ? (
              <p className="text-[12px] py-4 text-center" style={{ color: 'var(--text4)' }}>No contributions yet.</p>
            ) : (
              <div className="space-y-2.5">
                {contributions.map(c => {
                  const isPositive = parseFloat(c.amount) >= 0
                  return (
                    <div key={c.id} className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <span className="flex-shrink-0 mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={{
                            background: isPositive ? 'var(--gl)' : 'var(--al)',
                            color: isPositive ? 'var(--green)' : 'var(--amber)',
                          }}>
                          {isPositive ? 'Added' : 'Withdrawn'}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium" style={{ color: isPositive ? 'var(--green)' : 'var(--amber)' }}>
                            {isPositive ? '+' : ''}{formatAmount(c.amount)}
                          </p>
                          <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                            {c.bank_name && <span className="text-[11px]" style={{ color: 'var(--text3)' }}>{c.bank_name}</span>}
                            {c.notes && <span className="text-[11px]" style={{ color: 'var(--text4)' }}>· {c.notes}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[11px]" style={{ color: 'var(--text4)' }}>{formatDate(c.date)}</span>
                        <button onClick={() => handleDeleteContribution(c.id)}
                          className="p-1 rounded"
                          style={{ color: 'var(--text4)', background: 'none', border: 'none', cursor: 'pointer' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text4)')}>
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="px-5 py-4 flex gap-4">
            <button onClick={onEdit}
              className="text-[13px]"
              style={{ color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer' }}>
              Edit jar
            </button>
            <button onClick={onArchive}
              className="text-[13px]"
              style={{ color: 'var(--amber)', background: 'none', border: 'none', cursor: 'pointer' }}>
              Archive jar
            </button>
          </div>
        </div>
      </div>

      {contribModal && (
        <ContributionModal
          jarName={jar.name}
          type={contribModal}
          banks={banks}
          onClose={() => setContribModal(null)}
          onSave={handleAddContribution}
        />
      )}
    </>
  )
}

function JarCard({ jar, onClick }: { jar: Jar; onClick: () => void }) {
  const color = jar.color || '#22c55e'
  const balance = parseFloat(jar.balance)
  const target = jar.target_amount ? parseFloat(jar.target_amount) : null
  const pct = target ? Math.min((balance / target) * 100, 100) : 0
  const contribCount = (jar as Jar & { contribution_count?: number }).contribution_count ?? null

  return (
    <div
      onClick={onClick}
      className="rounded-xl border overflow-hidden transition-shadow duration-150"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)', cursor: 'pointer' }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
    >
      <div className="flex items-end px-4 pb-3" style={{ background: color, height: '52px' }}>
        <h4 className="text-[15px] font-semibold" style={{ color: 'white' }}>{jar.name}</h4>
      </div>

      <div className="px-4 pt-3 pb-4">
        <p className="text-[22px] font-bold leading-none mb-1" style={{ color }}>{formatAmount(jar.balance)}</p>
        {target && (
          <p className="text-[11px] mb-2.5" style={{ color: 'var(--text3)' }}>
            of {formatAmount(jar.target_amount!)} · {pct.toFixed(0)}%
          </p>
        )}
        {!target && jar.description && (
          <p className="text-[11px] mb-2.5 truncate" style={{ color: 'var(--text3)' }}>{jar.description}</p>
        )}
        {target && (
          <div className="h-1.5 rounded-full mb-3" style={{ background: 'var(--border)' }}>
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: color }} />
          </div>
        )}
        {contribCount !== null && (
          <p className="text-[11px]" style={{ color: 'var(--text4)' }}>
            {contribCount} contribution{contribCount !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  )
}

export default function JarsPage() {
  const [jars, setJars] = useState<Jar[]>([])
  const [banks, setBanks] = useState<Bank[]>([])
  const [loading, setLoading] = useState(false)
  const [modalJar, setModalJar] = useState<Jar | 'new' | null>(null)
  const [drawerJar, setDrawerJar] = useState<Jar | null>(null)
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
    setDrawerJar(null)
    fetchJars()
  }

  function openEdit(jar: Jar) {
    setDrawerJar(null)
    setModalJar(jar)
  }

  function openArchiveConfirm(jar: Jar) {
    setDrawerJar(null)
    setConfirmArchive(jar)
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
        <button onClick={() => setModalJar('new')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] text-white flex-shrink-0"
          style={{ background: 'var(--green)' }}>
          <PlusIcon className="w-4 h-4" /> New jar
        </button>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-3">
          {[1, 2, 3].map(i => <div key={i} className="h-36 rounded-xl animate-pulse" style={{ background: 'var(--border)' }} />)}
        </div>
      ) : jars.length === 0 ? (
        <div className="py-16 text-center rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <p className="text-[13px] mb-2" style={{ color: 'var(--text3)' }}>No jars yet.</p>
          <button onClick={() => setModalJar('new')} className="text-[13px] font-medium"
            style={{ color: 'var(--green)', background: 'none', border: 'none', cursor: 'pointer' }}>
            Create your first jar →
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {jars.map(jar => (
            <JarCard key={jar.id} jar={jar} onClick={() => setDrawerJar(jar)} />
          ))}
        </div>
      )}

      {drawerJar && (
        <JarDrawer
          jar={drawerJar}
          banks={banks}
          onClose={() => setDrawerJar(null)}
          onEdit={() => openEdit(drawerJar)}
          onArchive={() => openArchiveConfirm(drawerJar)}
          onContributionAdded={fetchJars}
        />
      )}

      {modalJar !== null && (
        <JarModal jar={modalJar === 'new' ? null : modalJar} onClose={() => setModalJar(null)} onSave={handleSave} />
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
              <button onClick={() => handleArchive(confirmArchive)} className="flex-1 py-2 rounded-md text-[13px]"
                style={{ background: 'var(--amber)', color: '#1a1a1a' }}>
                Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
