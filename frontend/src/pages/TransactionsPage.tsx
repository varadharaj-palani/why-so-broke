import { useState, useEffect, useCallback, useMemo } from 'react'
import { transactionsApi } from '../api/transactions'
import { categoriesApi } from '../api/categories'
import { modesApi } from '../api/modes'
import { Transaction } from '../types'
import { useFilterStore } from '../store/filterStore'
import { formatAmount } from '../utils/formatters'
import { getCategoryChip, TYPES } from '../utils/constants'
import { PlusIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline'
import DropdownMenu from '../components/ui/DropdownMenu'
import FilterPanel from '../components/transactions/FilterPanel'
import api from '../api/client'
import dayjs from 'dayjs'

type TxView = 'month' | '3months' | 'year'

function getViewDates(view: TxView): { date_from: string; date_to: string } {
  const today = dayjs()
  if (view === 'month') return {
    date_from: today.startOf('month').format('YYYY-MM-DD'),
    date_to: today.format('YYYY-MM-DD'),
  }
  if (view === '3months') return {
    date_from: today.subtract(90, 'day').format('YYYY-MM-DD'),
    date_to: today.format('YYYY-MM-DD'),
  }
  // year
  return {
    date_from: today.startOf('year').format('YYYY-MM-DD'),
    date_to: today.format('YYYY-MM-DD'),
  }
}

// ─── Transaction Form ────────────────────────────────────────────────────────

function TransactionForm({
  onClose, onSaved, initial,
}: {
  onClose: () => void; onSaved: () => void; initial?: Transaction
}) {
  const [banks, setBanks] = useState<{ id: string; name: string }[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [modes, setModes] = useState<string[]>([])
  const [form, setForm] = useState({
    date: initial?.date || '',
    type: initial?.type || 'expense',
    description: initial?.description || '',
    category: initial?.category || '',
    amount: initial?.amount || '',
    bank_id: initial?.bank_id || '',
    transfer_to_bank_id: initial?.transfer_to_bank_id || '',
    mode: initial?.mode || '',
    notes: initial?.notes || '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/banks').then(r => setBanks(r.data))
    categoriesApi.list().then(r => {
      setCategories(r.data.map(c => c.name))
      if (!initial?.category) setForm(f => ({ ...f, category: r.data[0]?.name || '' }))
    })
    modesApi.list().then(r => {
      setModes(r.data.map(m => m.name))
      if (!initial?.mode) setForm(f => ({ ...f, mode: r.data[0]?.name || '' }))
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = { ...form, bank_id: form.bank_id || null, transfer_to_bank_id: form.transfer_to_bank_id || null, notes: form.notes || null }
      if (initial) {
        await transactionsApi.update(initial.id, payload as Parameters<typeof transactionsApi.update>[1])
      } else {
        await transactionsApi.create(payload as Parameters<typeof transactionsApi.create>[0])
      }
      onSaved(); onClose()
    } catch (err: unknown) {
      setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const fi = "w-full border rounded-md px-3 py-2 text-[13px] outline-none focus:border-[var(--green)] transition-colors"
  const fiStyle = { background: 'var(--surface)', borderColor: 'var(--border2)', color: 'var(--text)' }
  const field = (label: string, child: React.ReactNode) => (
    <div>
      <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--text2)' }}>{label}</label>
      {child}
    </div>
  )

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="rounded-xl border p-6 w-[480px] max-w-[94vw]" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[16px] font-medium" style={{ color: 'var(--text)' }}>{initial ? 'Edit transaction' : 'Add transaction'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            {field('Date', <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={fi} style={fiStyle} required />)}
            {field('Type', <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as 'expense' | 'income' | 'transfer' })} className={fi} style={fiStyle} disabled={!!initial}>{TYPES.map(t => <option key={t}>{t}</option>)}</select>)}
          </div>
          {field('Description', <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={fi} style={fiStyle} placeholder="e.g. Swiggy order" required />)}
          <div className="grid grid-cols-2 gap-3">
            {field('Category', <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={fi} style={fiStyle}>{categories.map(c => <option key={c}>{c}</option>)}</select>)}
            {field('Amount (₹)', <input type="number" step="0.01" min="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className={fi} style={fiStyle} placeholder="0.00" required />)}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field('Bank', <select value={form.bank_id} onChange={e => setForm({ ...form, bank_id: e.target.value })} className={fi} style={fiStyle}><option value="">Select bank…</option>{banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>)}
            {field('Mode', <select value={form.mode} onChange={e => setForm({ ...form, mode: e.target.value })} className={fi} style={fiStyle}>{modes.map(m => <option key={m}>{m}</option>)}</select>)}
          </div>
          {form.type === 'transfer' && !initial && field('To Bank', <select value={form.transfer_to_bank_id} onChange={e => setForm({ ...form, transfer_to_bank_id: e.target.value })} className={fi} style={fiStyle}><option value="">Select destination bank…</option>{banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>)}
          {field('Notes (optional)', <input type="text" value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} className={fi} style={fiStyle} placeholder="Any extra details…" />)}
          {error && <p className="text-[12px] text-red-500">{error}</p>}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button type="button" onClick={onClose} className="py-2.5 rounded-md text-[13px] border" style={{ borderColor: 'var(--border2)', color: 'var(--text2)', background: 'var(--surface)' }}>Cancel</button>
            <button type="submit" disabled={saving} className="py-2.5 rounded-md text-[13px] text-white disabled:opacity-50" style={{ background: 'var(--green)' }}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Category Chip ───────────────────────────────────────────────────────────

function CategoryChip({ name }: { name: string }) {
  const chip = getCategoryChip(name)
  return (
    <span
      className="inline-block text-[10px] px-1.5 py-0.5 rounded-full ml-1.5"
      style={{ background: chip.bg, color: chip.text, border: `0.5px solid ${chip.border}` }}
    >
      {name}
    </span>
  )
}

// ─── Transaction Row ─────────────────────────────────────────────────────────

function TxRow({ tx, onEdit, onDelete }: { tx: Transaction; onEdit: () => void; onDelete: () => void }) {
  const bankLabel = tx.bank?.short_code || tx.bank?.name || ''
  const subtitle = [bankLabel, tx.mode].filter(Boolean).join(' · ')

  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5 border rounded-md mb-1.5 cursor-default transition-colors"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center flex-wrap">
          <span className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>{tx.description}</span>
          <CategoryChip name={tx.category} />
        </div>
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--text3)' }}>{subtitle}</p>
      </div>
      <span className="text-[14px] font-medium flex-shrink-0" style={{ color: tx.type === 'income' ? 'var(--green)' : 'var(--text)' }}>
        {tx.type === 'income' ? '+' : ''}{formatAmount(tx.amount)}
      </span>
      <DropdownMenu
        items={[
          { label: 'Edit', onClick: onEdit },
          { label: 'Delete', onClick: onDelete, variant: 'danger' },
        ]}
      />
    </div>
  )
}

// ─── Group Header ────────────────────────────────────────────────────────────

function GroupHeader({ label, total }: { label: string; total: number }) {
  return (
    <div className="flex justify-between text-[11px] font-medium uppercase tracking-[0.5px] pb-2 mb-1.5 border-b"
      style={{ color: 'var(--text3)', borderColor: 'var(--border)' }}>
      <span>{label}</span>
      <span>{formatAmount(total)}</span>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

const VIEW_LABELS: Record<TxView, string> = {
  month: 'This month',
  '3months': '3 months',
  year: 'This year',
}

export default function TransactionsPage() {
  const { filters, setFilters, clearFilters } = useFilterStore()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editTx, setEditTx] = useState<Transaction | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [activeFilterCount, setActiveFilterCount] = useState(0)
  const [view, setView] = useState<TxView>('month')
  const [drillMonth, setDrillMonth] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [modes, setModes] = useState<string[]>([])
  const [banks, setBanks] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    categoriesApi.list().then(r => setCategories(r.data.map(c => c.name)))
    modesApi.list().then(r => setModes(r.data.map(m => m.name)))
    api.get('/banks').then(r => setBanks(r.data))
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // Drilldown takes highest priority, then explicit panel date filters, then view pills
      const dates = drillMonth
        ? { date_from: `${drillMonth}-01`, date_to: dayjs(`${drillMonth}-01`).endOf('month').format('YYYY-MM-DD') }
        : (filters.date_from || filters.date_to)
          ? {}
          : getViewDates(view)
      const res = await transactionsApi.list({
        ...filters,
        ...dates,
        description: search || undefined,
        per_page: 500,
      })
      setTransactions(res.data.items)
    } finally {
      setLoading(false)
    }
  }, [view, drillMonth, filters, search])

  useEffect(() => { fetchData() }, [fetchData])

  function handleViewChange(v: TxView) {
    setView(v)
    setDrillMonth(null)
    clearFilters()
    setActiveFilterCount(0)
  }

  async function handleDelete(tx: Transaction) {
    if (!confirm(`Delete "${tx.description}"?${tx.transfer_group_id ? ' Both transfer rows will be deleted.' : ''}`)) return
    await transactionsApi.delete(tx.id)
    fetchData()
  }

  function handleApplyFilters(f: Partial<typeof filters>) {
    setFilters(f)
    // date_from + date_to together count as 1 filter row
    const count = [
      f.date_from || f.date_to,
      f.category,
      f.bank_id,
      f.mode,
      f.type,
    ].filter(Boolean).length
    setActiveFilterCount(count)
  }

  // ── Group transactions ─────────────────────────────────────────────────────

  const grouped = useMemo(() => {
    const effectiveView = drillMonth ? '3months' : view

    if (effectiveView === 'month') {
      // Group by exact date
      const map = new Map<string, Transaction[]>()
      for (const tx of transactions) {
        const key = tx.date
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(tx)
      }
      return Array.from(map.entries()).map(([date, txs]) => ({
        label: dayjs(date).format('ddd, DD MMM YYYY'),
        txs,
        total: txs.reduce((s, t) => s + (t.type === 'expense' ? +t.amount : 0), 0),
      }))
    }

    if (effectiveView === '3months') {
      // Group by YYYY-MM
      const map = new Map<string, Transaction[]>()
      for (const tx of transactions) {
        const key = tx.date.slice(0, 7)
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(tx)
      }
      return Array.from(map.entries()).map(([month, txs]) => ({
        label: dayjs(`${month}-01`).format('MMMM YYYY'),
        txs,
        total: txs.reduce((s, t) => s + (t.type === 'expense' ? +t.amount : 0), 0),
      }))
    }

    return []
  }, [transactions, view, drillMonth])

  // Year view: month summary rows
  const yearMonths = useMemo(() => {
    if ((drillMonth ? '3months' : view) !== 'year') return []
    const map = new Map<string, { count: number; total: number }>()
    for (const tx of transactions) {
      const key = tx.date.slice(0, 7)
      if (!map.has(key)) map.set(key, { count: 0, total: 0 })
      const entry = map.get(key)!
      entry.count++
      if (tx.type === 'expense') entry.total += +tx.amount
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([month, { count, total }]) => ({
        month,
        label: dayjs(`${month}-01`).format('MMMM YYYY'),
        count,
        total,
      }))
  }, [transactions, view, drillMonth])

  const isYearView = !drillMonth && view === 'year'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-medium" style={{ color: 'var(--text)' }}>Transactions</h2>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--text3)' }}>All recorded transactions</p>
        </div>
        <button
          onClick={() => { setEditTx(null); setShowForm(true) }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] text-white"
          style={{ background: 'var(--green)' }}
        >
          <PlusIcon className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="text"
          placeholder="Search transactions…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[160px] px-3 py-1.5 rounded-md border text-[13px] outline-none transition-colors focus:border-[var(--green)]"
          style={{ background: 'var(--surface)', borderColor: 'var(--border2)', color: 'var(--text)' }}
        />
        <div className="flex items-center gap-1">
          {(Object.keys(VIEW_LABELS) as TxView[]).map(v => (
            <button
              key={v}
              onClick={() => handleViewChange(v)}
              className="px-3 py-1.5 rounded-full text-[12px] border transition-all"
              style={view === v
                ? { background: 'var(--surface)', color: 'var(--green)', fontWeight: 500, borderColor: 'var(--border)' }
                : { background: 'transparent', color: 'var(--text2)', borderColor: 'transparent' }
              }
            >
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-[13px] transition-colors"
          style={{
            borderColor: activeFilterCount > 0 ? 'var(--green)' : 'var(--border2)',
            background: activeFilterCount > 0 ? 'var(--gl)' : 'var(--surface)',
            color: activeFilterCount > 0 ? 'var(--green)' : 'var(--text2)',
          }}
        >
          <FunnelIcon className="w-3.5 h-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center rounded-full text-[10px] font-medium text-white" style={{ background: 'var(--green)' }}>
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Compound filter panel */}
      {showFilters && (
        <FilterPanel
          categories={categories}
          modes={modes}
          banks={banks}
          initialFilters={filters}
          onApply={handleApplyFilters}
          onClose={() => setShowFilters(false)}
          activeCount={activeFilterCount}
        />
      )}

      {/* Drilldown breadcrumb */}
      {drillMonth && (
        <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--text3)' }}>
          <button onClick={() => setDrillMonth(null)} className="underline" style={{ color: 'var(--green)', background: 'none', border: 'none', cursor: 'pointer' }}>
            ← Back to year
          </button>
          <span>/ {dayjs(`${drillMonth}-01`).format('MMMM YYYY')}</span>
        </div>
      )}

      {/* Transaction list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 rounded-md animate-pulse" style={{ background: 'var(--border)' }} />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-[13px]" style={{ color: 'var(--text3)' }}>No transactions found.</p>
          <button onClick={() => { setEditTx(null); setShowForm(true) }} className="mt-1 text-[13px] underline" style={{ color: 'var(--green)', background: 'none', border: 'none', cursor: 'pointer' }}>
            Add your first transaction →
          </button>
        </div>
      ) : isYearView ? (
        // Year view: month summary rows
        <div className="space-y-1.5">
          {yearMonths.map(({ month, label, count, total }) => (
            <div
              key={month}
              onClick={() => { setDrillMonth(month); setView('3months') }}
              className="flex items-center gap-3 px-3.5 py-2.5 border rounded-md cursor-pointer transition-colors"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <div className="flex-1">
                <span className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>{label}</span>
                <span className="text-[11px] ml-2" style={{ color: 'var(--text3)' }}>{count} transaction{count !== 1 ? 's' : ''}</span>
              </div>
              <span className="text-[14px] font-medium" style={{ color: 'var(--text)' }}>{formatAmount(total)}</span>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ color: 'var(--text3)', flexShrink: 0 }}>
                <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          ))}
        </div>
      ) : (
        // Month / 3months view: grouped by day or month
        <div className="space-y-5">
          {grouped.map(({ label, txs, total }) => (
            <div key={label}>
              <GroupHeader label={label} total={total} />
              {txs.map(tx => (
                <TxRow
                  key={tx.id}
                  tx={tx}
                  onEdit={() => { setEditTx(tx); setShowForm(true) }}
                  onDelete={() => handleDelete(tx)}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <TransactionForm
          onClose={() => { setShowForm(false); setEditTx(null) }}
          onSaved={fetchData}
          initial={editTx || undefined}
        />
      )}
    </div>
  )
}
