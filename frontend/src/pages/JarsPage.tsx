import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { jarsApi } from '../api/jars'
import { banksApi } from '../api/banks'
import { Jar } from '../types'
import { formatAmount } from '../utils/formatters'
import { PlusIcon, XMarkIcon, PencilIcon, ArchiveBoxIcon } from '@heroicons/react/24/outline'

const JAR_COLORS = [
  '#22c55e', '#3b82f6', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
]

const JAR_EMOJIS = ['🏦', '💰', '🏠', '✈️', '🎓', '🏥', '🚗', '💍', '🌴', '📱', '🎮', '🍕', '💻', '🎁', '⚽', '🎵']

function JarModal({
  jar,
  onClose,
  onSave,
}: {
  jar: Jar | null
  onClose: () => void
  onSave: (data: { name: string; description?: string; target_amount?: string; color?: string; emoji?: string }) => Promise<void>
}) {
  const [form, setForm] = useState({
    name: jar?.name ?? '',
    description: jar?.description ?? '',
    target_amount: jar?.target_amount ?? '',
    color: jar?.color ?? JAR_COLORS[0],
    emoji: jar?.emoji ?? '',
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

        <div>
          <label className="block text-[12px] font-medium mb-2" style={{ color: 'var(--text2)' }}>Icon (optional)</label>
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setForm({ ...form, emoji: '' })}
              className="w-8 h-8 rounded-md border text-[13px] transition-all flex items-center justify-center"
              style={{
                borderColor: form.emoji === '' ? 'var(--text)' : 'var(--border2)',
                background: form.emoji === '' ? 'var(--border)' : 'var(--surface)',
                color: 'var(--text4)',
              }}
              title="No icon"
            >
              ✕
            </button>
            {JAR_EMOJIS.map(em => (
              <button
                key={em}
                onClick={() => setForm({ ...form, emoji: em })}
                className="w-8 h-8 rounded-md border text-[18px] transition-all"
                style={{
                  borderColor: form.emoji === em ? 'var(--text)' : 'var(--border2)',
                  background: form.emoji === em ? 'var(--border)' : 'var(--surface)',
                }}
              >
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
            {saving ? 'Saving…' : jar ? 'Save changes' : 'Create jar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function JarCard({
  jar,
  onEdit,
  onArchive,
  onNavigate,
}: {
  jar: Jar
  onEdit: () => void
  onArchive: () => void
  onNavigate: () => void
}) {
  const color = jar.color || '#22c55e'
  const balance = parseFloat(jar.balance)
  const target = jar.target_amount ? parseFloat(jar.target_amount) : null
  const pct = target ? Math.min((balance / target) * 100, 100) : 0
  const emoji = jar.emoji || '🫙'

  return (
    <div
      onClick={onNavigate}
      className="rounded-xl border overflow-hidden transition-shadow duration-150"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)', cursor: 'pointer' }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
    >
      {/* Colored header */}
      <div className="flex items-center justify-between px-4" style={{ background: color, height: '52px' }}>
        <div className="flex items-center gap-2">
          <span className="text-2xl leading-none">{emoji}</span>
          <h4 className="text-[15px] font-semibold" style={{ color: 'white' }}>{jar.name}</h4>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pt-3 pb-3">
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
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 px-3 pb-3 border-t pt-2" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={e => { e.stopPropagation(); onEdit() }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] border transition-colors"
          style={{ borderColor: 'var(--border2)', color: 'var(--text3)', background: 'var(--surface)' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--text3)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.borderColor = 'var(--border2)' }}
        >
          <PencilIcon className="w-3 h-3" /> Edit
        </button>
        <button
          onClick={e => { e.stopPropagation(); onArchive() }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] border transition-colors"
          style={{ borderColor: 'var(--border2)', color: 'var(--text3)', background: 'var(--surface)' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--amber)'; e.currentTarget.style.borderColor = 'var(--amber)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.borderColor = 'var(--border2)' }}
        >
          <ArchiveBoxIcon className="w-3 h-3" /> Archive
        </button>
      </div>
    </div>
  )
}

export default function JarsPage() {
  const navigate = useNavigate()
  const [jars, setJars] = useState<Jar[]>([])
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
    banksApi.list().catch(() => {})
  }, [fetchJars])

  async function handleSave(data: { name: string; description?: string; target_amount?: string; color?: string; emoji?: string }) {
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
            {jars.length > 0 && ` · ${formatAmount(String(totalSaved))} total saved`}
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
            <JarCard
              key={jar.id}
              jar={jar}
              onEdit={() => setModalJar(jar)}
              onArchive={() => setConfirmArchive(jar)}
              onNavigate={() => navigate(`/jars/${jar.id}`, { state: { jars } })}
            />
          ))}
        </div>
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
