import { useState, useEffect, useCallback } from 'react'
import { budgetsApi } from '../api/budgets'
import { categoriesApi } from '../api/categories'
import { Budget, BudgetProgress } from '../types'
import { formatAmount, formatDate } from '../utils/formatters'
import { getCategoryChip } from '../utils/constants'
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'

const TODAY = new Date().toISOString().slice(0, 10)
const YEAR_START = TODAY.slice(0, 4) + '-01-01'
const YEAR_END = TODAY.slice(0, 4) + '-12-31'

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
  onSave: (data: { category: string; amount: string; start_date: string; end_date: string }) => Promise<void>
}) {
  const [form, setForm] = useState({
    category: budget?.category ?? (categories[0] ?? ''),
    amount: budget?.amount ?? '',
    start_date: budget?.start_date ?? '',
    end_date: budget?.end_date ?? '',
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

  async function handleSave() {
    if (!form.category || !form.amount || !form.start_date || !form.end_date) {
      setError('All fields are required')
      return
    }
    if (form.end_date < form.start_date) {
      setError('End date must be after start date')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave(form)
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

        <div className="grid grid-cols-2 gap-3">
          {field('Cycle start',
            <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className={fi} style={fiStyle} />
          )}
          {field('Cycle end',
            <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className={fi} style={fiStyle} />
          )}
        </div>

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
        {budget.start_date && budget.end_date && (
          <p className="text-[11px]" style={{ color: 'var(--text3)' }}>
            {formatDate(budget.start_date)} → {formatDate(budget.end_date)}
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
      const bRes = await budgetsApi.list({})
      const all = bRes.data
      setBudgets(all)

      const active = all.filter(b => b.start_date && b.end_date && b.start_date <= TODAY && TODAY <= b.end_date)
      const source = tab === 'active' ? active : all.filter(b => b.start_date && b.end_date)
      const pStart = source.length
        ? source.reduce((m, b) => (b.start_date! < m ? b.start_date! : m), source[0].start_date!)
        : YEAR_START
      const pEnd = source.length
        ? source.reduce((m, b) => (b.end_date! > m ? b.end_date! : m), source[0].end_date!)
        : YEAR_END

      const pRes = await budgetsApi.progress({ start_date: pStart, end_date: pEnd })
      setProgress(pRes.data)
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => { fetchData() }, [fetchData])

  const visible = tab === 'active'
    ? budgets.filter(b => b.start_date && b.end_date && b.start_date <= TODAY && TODAY <= b.end_date)
    : budgets

  async function handleSave(data: { category: string; amount: string; start_date: string; end_date: string }) {
    if (modalBudget && modalBudget !== 'new') {
      await budgetsApi.update(modalBudget.id, { amount: data.amount, start_date: data.start_date, end_date: data.end_date })
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
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--text3)' }}>Track spending against your budget cycles</p>
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
      ) : visible.length === 0 ? (
        <div className="py-12 text-center rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <p className="text-[13px] mb-2" style={{ color: 'var(--text3)' }}>
            {tab === 'active' ? 'No active budgets for today.' : 'No budgets yet.'}
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
          {visible.map(b => (
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
          <div className="rounded-xl border p-6 w-[360px]" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
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
