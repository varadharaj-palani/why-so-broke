import { useState, useEffect, useCallback } from 'react'
import { budgetsApi } from '../api/budgets'
import { categoriesApi } from '../api/categories'
import { Budget, BudgetProgress } from '../types'
import { formatAmount, currentMonth, formatMonth } from '../utils/formatters'
import { PlusIcon } from '@heroicons/react/24/outline'

function BudgetCard({ progress, onEdit, onDelete }: { progress: BudgetProgress; onEdit: () => void; onDelete: () => void }) {
  const pct = Math.min(progress.percentage, 100)
  const overBudget = progress.percentage > 100
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-900">{progress.category}</p>
        <div className="flex gap-2">
          <button onClick={onEdit} className="text-xs text-blue-600 hover:underline">Edit</button>
          <button onClick={onDelete} className="text-xs text-red-500 hover:underline">Delete</button>
        </div>
      </div>
      <div className="flex justify-between text-xs text-gray-500 mb-1.5">
        <span>{formatAmount(progress.spent_amount)} spent</span>
        <span>{formatAmount(progress.budget_amount)} budget</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${overBudget ? 'bg-red-500' : pct > 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={`text-xs mt-1 font-medium ${overBudget ? 'text-red-600' : 'text-gray-500'}`}>
        {overBudget ? `Over by ${formatAmount(String(parseFloat(progress.spent_amount) - parseFloat(progress.budget_amount)))}` : `${progress.percentage.toFixed(0)}% used`}
      </p>
    </div>
  )
}

export default function BudgetsPage() {
  const [month, setMonth] = useState(currentMonth)
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [progress, setProgress] = useState<BudgetProgress[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editBudget, setEditBudget] = useState<Budget | null>(null)
  const [categories, setCategories] = useState<string[]>([])
  const [formCategory, setFormCategory] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [copying, setCopying] = useState(false)

  useEffect(() => {
    categoriesApi.list().then(r => {
      const names = r.data.map(c => c.name)
      setCategories(names)
      setFormCategory(names[0] || '')
    })
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [b, p] = await Promise.all([budgetsApi.list(month), budgetsApi.progress(month)])
      setBudgets(b.data)
      setProgress(p.data)
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleSave() {
    if (editBudget) {
      await budgetsApi.update(editBudget.id, formAmount)
    } else {
      await budgetsApi.create({ category: formCategory, month: `${month}-01`, amount: formAmount })
    }
    setShowForm(false)
    setEditBudget(null)
    setFormAmount('')
    fetchData()
  }

  async function handleDelete(id: string) {
    await budgetsApi.delete(id)
    fetchData()
  }

  async function handleCopyPrevious() {
    setCopying(true)
    try {
      await budgetsApi.copyPrevious(month)
      fetchData()
    } catch (err: unknown) {
      alert((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'No previous month budgets found')
    } finally {
      setCopying(false)
    }
  }

  const cls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Budgets</h2>
          <p className="text-sm text-gray-500">{formatMonth(month)}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          <button onClick={handleCopyPrevious} disabled={copying} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            {copying ? 'Copying...' : 'Copy from last month'}
          </button>
          <button onClick={() => { setShowForm(true); setEditBudget(null); setFormAmount('') }} className="flex items-center gap-1 bg-green-600 text-white rounded-lg px-3 py-1.5 text-sm font-semibold hover:bg-green-700">
            <PlusIcon className="w-4 h-4" /> Add Budget
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">{editBudget ? 'Edit Budget' : 'Set Budget'}</h3>
          {!editBudget && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Category</label>
              <select value={formCategory} onChange={e => setFormCategory(e.target.value)} className={cls}>
                {categories.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Budget Amount (₹)</label>
            <input type="number" min="1" step="0.01" value={formAmount} onChange={e => setFormAmount(e.target.value)} className={cls} placeholder="e.g. 5000" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setShowForm(false); setEditBudget(null) }} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} disabled={!formAmount} className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-green-700 disabled:opacity-50">Save</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid md:grid-cols-2 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : progress.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <p className="text-gray-400 text-sm">No budgets set for {formatMonth(month)}.</p>
          <button onClick={() => setShowForm(true)} className="mt-2 text-green-600 text-sm font-medium hover:underline">Set your first budget →</button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {progress.map(p => {
            const budget = budgets.find(b => b.category === p.category)
            return (
              <BudgetCard
                key={p.category}
                progress={p}
                onEdit={() => { if (budget) { setEditBudget(budget); setFormAmount(budget.amount); setShowForm(true) } }}
                onDelete={() => budget && handleDelete(budget.id)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
