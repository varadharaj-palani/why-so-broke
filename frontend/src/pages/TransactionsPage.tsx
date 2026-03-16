import { useState, useEffect, useCallback } from 'react'
import { transactionsApi } from '../api/transactions'
import { categoriesApi } from '../api/categories'
import { modesApi } from '../api/modes'
import { Transaction, TransactionListResponse } from '../types'
import { useFilterStore } from '../store/filterStore'
import { formatDate, formatAmount } from '../utils/formatters'
import { TYPES, TYPE_COLORS } from '../utils/constants'
import { PlusIcon, FunnelIcon, XMarkIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import api from '../api/client'

function TransactionForm({
  onClose,
  onSaved,
  initial,
}: {
  onClose: () => void
  onSaved: () => void
  initial?: Transaction
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
    api.get('/banks').then((r) => setBanks(r.data))
    categoriesApi.list().then((r) => {
      setCategories(r.data.map((c) => c.name))
      if (!initial?.category) setForm((f) => ({ ...f, category: r.data[0]?.name || '' }))
    })
    modesApi.list().then((r) => {
      setModes(r.data.map((m) => m.name))
      if (!initial?.mode) setForm((f) => ({ ...f, mode: r.data[0]?.name || '' }))
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        bank_id: form.bank_id || null,
        transfer_to_bank_id: form.transfer_to_bank_id || null,
        notes: form.notes || null,
      }
      if (initial) {
        await transactionsApi.update(initial.id, payload as Parameters<typeof transactionsApi.update>[1])
      } else {
        await transactionsApi.create(payload as Parameters<typeof transactionsApi.create>[0])
      }
      onSaved()
      onClose()
    } catch (err: unknown) {
      setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const field = (label: string, children: React.ReactNode) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  )
  const cls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">{initial ? 'Edit Transaction' : 'Add Transaction'}</h3>
          <button onClick={onClose}><XMarkIcon className="w-5 h-5 text-gray-500" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {field('Date', <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className={cls} required />)}
            {field('Type', <select value={form.type} onChange={e => setForm({...form, type: e.target.value as 'expense' | 'income' | 'transfer'})} className={cls} disabled={!!initial}>{TYPES.map(t => <option key={t}>{t}</option>)}</select>)}
          </div>
          {field('Description', <input type="text" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className={cls} required />)}
          <div className="grid grid-cols-2 gap-3">
            {field('Category', (
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className={cls}>
                {categories.map(c => <option key={c}>{c}</option>)}
              </select>
            ))}
            {field('Amount (₹)', <input type="number" step="0.01" min="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className={cls} required />)}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field('Bank', <select value={form.bank_id} onChange={e => setForm({...form, bank_id: e.target.value})} className={cls}><option value="">Select bank</option>{banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>)}
            {field('Mode', (
              <select value={form.mode} onChange={e => setForm({...form, mode: e.target.value})} className={cls}>
                {modes.map(m => <option key={m}>{m}</option>)}
              </select>
            ))}
          </div>
          {form.type === 'transfer' && !initial && field('To Bank', <select value={form.transfer_to_bank_id} onChange={e => setForm({...form, transfer_to_bank_id: e.target.value})} className={cls}><option value="">Select destination bank</option>{banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>)}
          {field('Notes (optional)', <input type="text" value={form.notes || ''} onChange={e => setForm({...form, notes: e.target.value})} className={cls} />)}
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-green-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function TransactionsPage() {
  const { filters, setFilter, clearFilters } = useFilterStore()
  const [data, setData] = useState<TransactionListResponse | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editTx, setEditTx] = useState<Transaction | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [categories, setCategories] = useState<string[]>([])
  const [modes, setModes] = useState<string[]>([])

  useEffect(() => {
    categoriesApi.list().then((r) => setCategories(r.data.map((c) => c.name)))
    modesApi.list().then((r) => setModes(r.data.map((m) => m.name)))
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await transactionsApi.list({ ...filters, page, per_page: 50 })
      setData(res.data)
    } finally {
      setLoading(false)
    }
  }, [filters, page])

  useEffect(() => { setPage(1) }, [filters])
  useEffect(() => { fetchData() }, [fetchData])

  async function handleDelete(tx: Transaction) {
    if (!confirm(`Delete "${tx.description}"?${tx.transfer_group_id ? ' Both transfer rows will be deleted.' : ''}`)) return
    await transactionsApi.delete(tx.id)
    fetchData()
  }

  const cls = "border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Transactions</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
            <FunnelIcon className="w-4 h-4" /> Filters
          </button>
          <button onClick={() => { setEditTx(null); setShowForm(true) }} className="flex items-center gap-1 bg-green-600 text-white rounded-lg px-3 py-2 text-sm font-semibold hover:bg-green-700">
            <PlusIcon className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div><label className="block text-xs text-gray-500 mb-1">From</label><input type="date" value={filters.date_from || ''} onChange={e => setFilter('date_from', e.target.value)} className={cls} /></div>
          <div><label className="block text-xs text-gray-500 mb-1">To</label><input type="date" value={filters.date_to || ''} onChange={e => setFilter('date_to', e.target.value)} className={cls} /></div>
          <div><label className="block text-xs text-gray-500 mb-1">Type</label><select value={filters.type || ''} onChange={e => setFilter('type', e.target.value)} className={cls}><option value="">All</option>{TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
          <div><label className="block text-xs text-gray-500 mb-1">Category</label><select value={filters.category || ''} onChange={e => setFilter('category', e.target.value)} className={cls}><option value="">All</option>{categories.map(c => <option key={c}>{c}</option>)}</select></div>
          <div><label className="block text-xs text-gray-500 mb-1">Mode</label><select value={filters.mode || ''} onChange={e => setFilter('mode', e.target.value)} className={cls}><option value="">All</option>{modes.map(m => <option key={m}>{m}</option>)}</select></div>
          <div><label className="block text-xs text-gray-500 mb-1">Min ₹</label><input type="number" value={filters.amount_min || ''} onChange={e => setFilter('amount_min', e.target.value)} className={cls} /></div>
          <div><label className="block text-xs text-gray-500 mb-1">Max ₹</label><input type="number" value={filters.amount_max || ''} onChange={e => setFilter('amount_max', e.target.value)} className={cls} /></div>
          <div className="flex items-end"><button onClick={clearFilters} className="w-full border border-gray-300 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Clear</button></div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="divide-y divide-gray-100">
            {[1,2,3,4,5].map(i => <div key={i} className="p-4 animate-pulse"><div className="h-4 bg-gray-100 rounded w-3/4" /></div>)}
          </div>
        ) : data?.items.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-sm">No transactions yet.</p>
            <button onClick={() => setShowForm(true)} className="mt-2 text-green-600 text-sm font-medium hover:underline">Add your first transaction →</button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {data?.items.map((tx) => (
              <div key={tx.id} className="flex items-center px-4 py-3 hover:bg-gray-50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{tx.description}</p>
                  <p className="text-xs text-gray-500">{formatDate(tx.date)} · {tx.category} · {tx.mode}</p>
                </div>
                <div className="text-right ml-3 flex items-center gap-2">
                  <div>
                    <p className={`text-sm font-semibold ${TYPE_COLORS[tx.type]}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatAmount(tx.amount)}
                    </p>
                    <p className="text-xs text-gray-400">{tx.bank?.short_code || tx.bank?.name || '—'}</p>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={() => { setEditTx(tx); setShowForm(true) }}
                      disabled={tx.type === 'transfer'}
                      title={tx.type === 'transfer' ? 'Transfers cannot be edited' : 'Edit'}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <PencilIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(tx)}
                      title="Delete"
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {data && data.pages > 1 && (
        <div className="flex justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">← Prev</button>
          <span className="px-3 py-1.5 text-sm text-gray-600">{page} / {data.pages}</span>
          <button disabled={page >= data.pages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">Next →</button>
        </div>
      )}

      {showForm && <TransactionForm onClose={() => { setShowForm(false); setEditTx(null) }} onSaved={fetchData} initial={editTx || undefined} />}
    </div>
  )
}
