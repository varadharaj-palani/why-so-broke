import { useState, useEffect, useCallback } from 'react'
import { budgetsApi } from '../api/budgets'
import { categoriesApi } from '../api/categories'
import { Budget, BudgetProgress } from '../types'
import { formatAmount, formatDate } from '../utils/formatters'
import { getCategoryChip } from '../utils/constants'
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'

const TODAY = new Date().toISOString().slice(0, 10)

const PRESETS = [
  { label: 'Monthly', days: 30 },
  { label: '2 months', days: 60 },
  { label: 'Quarterly', days: 90 },
  { label: 'Custom', days: 0 },
]

function daysToPreset(days: number | null | undefined): string {
  if (!days) return 'monthly'
  if (days === 30) return 'monthly'
  if (days === 60) return '2months'
  if (days === 90) return 'quarterly'
  return 'custom'
}

// ─── Budget Modal ──────────────────────────────────────────────────────────────

function BudgetModal({
  budget,
  categories,
  onClose,
  onSave,
}: {
  budget: Budget | null
  categories: string[]
  onClose: () => void
  onSave: (data: { category: string; amount: string; start_date: string; cycle_days: number }) => Promise<void>
}) {
  const existingCycleDays = budget?.cycle_days ?? null
  const preset = daysToPreset(existingCycleDays)

  const [form, setForm] = useState({
    category: budget?.category ?? (categories[0] ?? ''),
    amount: budget?.amount ?? '',
    start_date: budget?.start_date ?? '',
    preset,
    custom_days: existingCycleDays && !['monthly', '2months', 'quarterly'].includes(preset)
      ? String(existingCycleDays)
      : '1',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fi = "w-full border rounded-md px-3 py-2 text-[13px] outline-none focus:border-[var(--green)] transition-colors"
  const fiStyle = { background: 'var(--surface)', borderColor: 'var(--border2)', color: 'var(--text)' }

  const field = (label: string, child: React.ReactNode) => (
    <div>
      <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--text2)' }}>{label}</label>
      {child}
    </div>
  )

  function getCycleDays(): number {
    if (form.preset === 'monthly') return 30
    if (form.preset === '2months') return 60
    if (form.preset === 'quarterly') return 90
    return parseInt(form.custom_days) || 1
  }

  async function handleSave() {
    if (!form.category || !form.amount || !form.start_date) {
      setError('All fields are required')
      return
    }
    if (form.preset === 'custom' && (!form.custom_days || parseInt(form.custom_days) < 1)) {
      setError('Custom cycle must be at least 1 day')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({ category: form.category, amount: form.amount, start_date: form.start_date, cycle_days: getCycleDays() })
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
          <h3 className="text-[16px] font-medium" style={{ color: 'var(--text)' }}>{budget ? 'Edit budget' : 'Add budget'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        {budget ? (
          <div>
            <p className="text-[12px] font-medium mb-0.5" style={{ color: 'var(--text2)' }}>Category</p>
            <p className="text-[13px]" style={{ color: 'var(--text)' }}>{budget.category}</p>
          </div>
        ) : field('Category',
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={fi} style={fiStyle}>
            <option value="">Select…</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}

        {field('Budget amount (₹)',
          <input type="number" min="1" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className={fi} style={fiStyle} placeholder="e.g. 5000" />
        )}

        {field('First cycle starts on',
          <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className={fi} style={fiStyle} />
        )}

        {field('Repeats every',
          <div className="flex gap-2">
            <select
              value={form.preset}
              onChange={e => setForm({ ...form, preset: e.target.value })}
              className={fi}
              style={fiStyle}
            >
              {PRESETS.map(p => (
                <option key={p.label} value={p.label === 'Custom' ? 'custom' : p.label === 'Monthly' ? 'monthly' : p.label === '2 months' ? '2months' : 'quarterly'}>
                  {p.label}
                </option>
              ))}
            </select>
            {form.preset === 'custom' && (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <input
                  type="number" min="1" max="365"
                  value={form.custom_days}
                  onChange={e => setForm({ ...form, custom_days: e.target.value })}
                  className="w-20 border rounded-md px-2 py-2 text-[13px] outline-none focus:border-[var(--green)] transition-colors"
                  style={fiStyle}
                />
                <span className="text-[13px] whitespace-nowrap" style={{ color: 'var(--text3)' }}>days</span>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-[12px] text-red-500">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 rounded-md text-[13px] border" style={{ borderColor: 'var(--border2)', color: 'var(--text2)', background: 'var(--surface)' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2 rounded-md text-[13px] text-white disabled:opacity-50" style={{ background: 'var(--green)' }}>
            {saving ? 'Saving…' : 'Save budget'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Budget Card ───────────────────────────────────────────────────────────────

function BudgetCard({
  budget,
  progress,
  onEdit,
  onDelete,
}: {
  budget: Budget
  progress: BudgetProgress | null
  onEdit: () => void
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const chip = getCategoryChip(budget.category)
  const pct = progress ? Math.min(progress.percentage, 100) : 0
  const over = progress ? progress.percentage > 100 : false

  const cycleStart = progress?.current_cycle_start ?? budget.start_date
  const cycleEnd = progress?.current_cycle_end ?? budget.end_date

  return (
    <div
      className="rounded-xl border p-4 cursor-pointer transition-all"
      style={{ background: 'var(--surface)', borderColor: expanded ? 'var(--green)' : 'var(--border)' }}
      onClick={() => setExpanded(e => !e)}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-[12px] font-medium px-2.5 py-0.5 rounded-full border"
          style={{ background: chip.bg, borderColor: chip.border, color: chip.text }}
        >
          {budget.category}
        </span>
        <span className="text-[13px] font-semibold" style={{ color: over ? 'var(--amber)' : 'var(--green)' }}>
          {progress ? (over ? 'Over limit' : `${progress.percentage.toFixed(0)}%`) : '—'}
        </span>
      </div>

      <div className="h-1.5 rounded-full mb-3" style={{ background: 'var(--border)' }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: over ? 'var(--amber)' : 'var(--green)' }}
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[12px]" style={{ color: 'var(--text3)' }}>
          {progress
            ? `${formatAmount(progress.spent_amount)} spent · Limit ${formatAmount(progress.budget_amount)}`
            : `Limit ${formatAmount(budget.amount)}`}
        </p>
        {cycleStart && cycleEnd && (
          <p className="text-[11px]" style={{ color: 'var(--text3)' }}>
            {formatDate(cycleStart)} → {formatDate(cycleEnd)}
          </p>
        )}
      </div>

      {expanded && (
        <div className="flex gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={e => { e.stopPropagation(); onEdit() }}
            className="flex-1 py-1.5 rounded-md text-[13px] border"
            style={{ borderColor: 'var(--border2)', color: 'var(--text2)', background: 'var(--surface)' }}
          >
            Edit
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            className="flex-1 py-1.5 rounded-md text-[13px]"
            style={{ background: 'var(--al)', color: 'var(--amber)', border: '0.5px solid var(--amber)' }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function BudgetsPage() {
  const [tab, setTab] = useState<'active' | 'all'>('active')
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [progress, setProgress] = useState<BudgetProgress[]>([])
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<string[]>([])
  const [modalBudget, setModalBudget] = useState<Budget | 'new' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Budget | null>(null)

  useEffect(() => {
    categoriesApi.list().then(r => setCategories(r.data.map(c => c.name)))
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const listParams = tab === 'active' ? { active_on: TODAY } : undefined
      const [bRes, pRes] = await Promise.all([
        budgetsApi.list(listParams),
        budgetsApi.progress(),
      ])
      setBudgets(bRes.data)
      setProgress(pRes.data)
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleSave(data: { category: string; amount: string; start_date: string; cycle_days: number }) {
    if (modalBudget && modalBudget !== 'new') {
      await budgetsApi.update(modalBudget.id, { amount: data.amount, start_date: data.start_date, cycle_days: data.cycle_days })
    } else {
      await budgetsApi.create(data)
    }
    setModalBudget(null)
    fetchData()
  }

  async function handleDelete(budget: Budget) {
    await budgetsApi.delete(budget.id)
    setConfirmDelete(null)
    fetchData()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-medium" style={{ color: 'var(--text)' }}>Budgets</h2>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--text3)' }}>Recurring budgets — resets automatically each cycle</p>
        </div>
        <button
          onClick={() => setModalBudget('new')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] text-white"
          style={{ background: 'var(--green)' }}
        >
          <PlusIcon className="w-4 h-4" /> Add budget
        </button>
      </div>

      {/* Active / All toggle */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'var(--bg)', border: '0.5px solid var(--border)' }}>
        {(['active', 'all'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-3 py-1 rounded-md text-[13px] font-medium transition-all"
            style={{
              background: tab === t ? 'var(--surface)' : 'transparent',
              color: tab === t ? 'var(--text)' : 'var(--text3)',
              boxShadow: tab === t ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              border: tab === t ? '0.5px solid var(--border)' : '0.5px solid transparent',
            }}
          >
            {t === 'active' ? 'Active' : 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 rounded-xl animate-pulse" style={{ background: 'var(--border)' }} />
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <div className="py-12 text-center rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <p className="text-[13px] mb-2" style={{ color: 'var(--text3)' }}>
            {tab === 'active' ? 'No active budgets.' : 'No budgets yet.'}
          </p>
          <button
            onClick={() => setModalBudget('new')}
            className="text-[13px] font-medium"
            style={{ color: 'var(--green)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Create your first budget →
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {budgets.map(b => (
            <BudgetCard
              key={b.id}
              budget={b}
              progress={progress.find(p => p.category === b.category) ?? null}
              onEdit={() => setModalBudget(b)}
              onDelete={() => setConfirmDelete(b)}
            />
          ))}
        </div>
      )}

      {modalBudget !== null && (
        <BudgetModal
          budget={modalBudget === 'new' ? null : modalBudget}
          categories={categories}
          onClose={() => setModalBudget(null)}
          onSave={handleSave}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="rounded-xl border p-6 w-[360px] max-w-[94vw]" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h3 className="text-[15px] font-medium mb-2" style={{ color: 'var(--text)' }}>Delete budget?</h3>
            <p className="text-[13px] mb-5" style={{ color: 'var(--text3)' }}>
              Delete the budget for <strong style={{ color: 'var(--text)' }}>{confirmDelete.category}</strong>? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 rounded-md text-[13px] border"
                style={{ borderColor: 'var(--border2)', color: 'var(--text2)', background: 'var(--surface)' }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 py-2 rounded-md text-[13px] text-white"
                style={{ background: '#ef4444' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
