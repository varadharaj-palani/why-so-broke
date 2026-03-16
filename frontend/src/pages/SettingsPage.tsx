import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Bank } from '../types'
import { formatDateTime } from '../utils/formatters'
import { PlusIcon, PencilIcon, TrashIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import api from '../api/client'
import axios from 'axios'
import { categoriesApi, CategoryItem } from '../api/categories'
import { modesApi, ModeItem } from '../api/modes'

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const [banks, setBanks] = useState<Bank[]>([])
  const [newBankName, setNewBankName] = useState('')
  const [newBankCode, setNewBankCode] = useState('')
  const [editBankId, setEditBankId] = useState<string | null>(null)
  const [editBankName, setEditBankName] = useState('')
  const [editBankCode, setEditBankCode] = useState('')
  const [activity, setActivity] = useState<{ id: string; action: string; created_at: string; details: Record<string, unknown> | null }[]>([])
  const [exporting, setExporting] = useState(false)

  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null)
  const [editCategoryName, setEditCategoryName] = useState('')

  const [modes, setModes] = useState<ModeItem[]>([])
  const [newModeName, setNewModeName] = useState('')
  const [editModeId, setEditModeId] = useState<string | null>(null)
  const [editModeName, setEditModeName] = useState('')

  useEffect(() => {
    api.get('/banks').then(r => setBanks(r.data))
    api.get('/activity').then(r => setActivity(r.data.items))
    categoriesApi.list().then(r => setCategories(r.data))
    modesApi.list().then(r => setModes(r.data))
  }, [])

  // ── Banks ─────────────────────────────────────────────────────────────────

  async function addBank() {
    if (!newBankName.trim()) return
    const res = await api.post('/banks', { name: newBankName, short_code: newBankCode || undefined })
    setBanks(b => [...b, res.data])
    setNewBankName('')
    setNewBankCode('')
  }

  async function toggleBank(bank: Bank) {
    const res = await api.put(`/banks/${bank.id}`, { is_active: !bank.is_active })
    setBanks(b => b.map(x => x.id === bank.id ? res.data : x))
  }

  async function saveEditBank(id: string) {
    const res = await api.put(`/banks/${id}`, { name: editBankName, short_code: editBankCode || undefined })
    setBanks(b => b.map(x => x.id === id ? res.data : x))
    setEditBankId(null)
  }

  async function deleteBank(id: string) {
    if (!confirm('Delete this bank? This cannot be undone.')) return
    try {
      await api.delete(`/banks/${id}`)
      setBanks(b => b.filter(x => x.id !== id))
    } catch (err: unknown) {
      alert((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Cannot delete bank')
    }
  }

  // ── Categories ────────────────────────────────────────────────────────────

  async function addCategory() {
    if (!newCategoryName.trim()) return
    try {
      const res = await categoriesApi.create(newCategoryName.trim())
      setCategories(c => [...c, res.data].sort((a, b) => a.name.localeCompare(b.name)))
      setNewCategoryName('')
    } catch (err: unknown) {
      alert((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to add category')
    }
  }

  async function saveEditCategory(id: string) {
    try {
      const res = await categoriesApi.update(id, editCategoryName.trim())
      setCategories(c => c.map(x => x.id === id ? res.data : x).sort((a, b) => a.name.localeCompare(b.name)))
      setEditCategoryId(null)
    } catch (err: unknown) {
      alert((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to update')
    }
  }

  async function deleteCategory(id: string, name: string) {
    if (!confirm(`Delete category "${name}"?`)) return
    try {
      await categoriesApi.delete(id)
      setCategories(c => c.filter(x => x.id !== id))
    } catch (err: unknown) {
      alert((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Cannot delete category')
    }
  }

  // ── Modes ─────────────────────────────────────────────────────────────────

  async function addMode() {
    if (!newModeName.trim()) return
    try {
      const res = await modesApi.create(newModeName.trim())
      setModes(m => [...m, res.data].sort((a, b) => a.name.localeCompare(b.name)))
      setNewModeName('')
    } catch (err: unknown) {
      alert((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to add mode')
    }
  }

  async function saveEditMode(id: string) {
    try {
      const res = await modesApi.update(id, editModeName.trim())
      setModes(m => m.map(x => x.id === id ? res.data : x).sort((a, b) => a.name.localeCompare(b.name)))
      setEditModeId(null)
    } catch (err: unknown) {
      alert((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to update')
    }
  }

  async function deleteMode(id: string, name: string) {
    if (!confirm(`Delete mode "${name}"?`)) return
    try {
      await modesApi.delete(id)
      setModes(m => m.filter(x => x.id !== id))
    } catch (err: unknown) {
      alert((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Cannot delete mode')
    }
  }

  // ── Export ────────────────────────────────────────────────────────────────

  async function handleExport() {
    setExporting(true)
    try {
      const res = await axios.get('/api/v1/export/csv', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        responseType: 'blob',
      })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = 'why-so-broke-export.csv'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  const cls = "border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
  const inlineCls = "border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Settings</h2>

      {/* Account */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Account</h3>
        <p className="text-sm text-gray-600">Signed in as <strong>{user?.display_name || user?.username}</strong></p>
        <button onClick={logout} className="mt-3 text-sm text-red-500 hover:underline">Sign out</button>
      </div>

      {/* Export */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">Export Data</h3>
        <p className="text-xs text-gray-500 mb-3">Download all your transactions as a CSV file.</p>
        <button onClick={handleExport} disabled={exporting} className="bg-green-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-green-700 disabled:opacity-50">
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      {/* Banks */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Manage Banks</h3>
        <div className="space-y-2 mb-4">
          {banks.map(bank => (
            <div key={bank.id} className="flex items-center gap-2">
              {editBankId === bank.id ? (
                <>
                  <input type="text" value={editBankName} onChange={e => setEditBankName(e.target.value)} className={`flex-1 ${inlineCls}`} />
                  <input type="text" value={editBankCode} onChange={e => setEditBankCode(e.target.value)} className={`w-20 ${inlineCls}`} placeholder="Code" />
                  <button onClick={() => saveEditBank(bank.id)} className="p-1 text-green-600 hover:bg-green-50 rounded"><CheckIcon className="w-4 h-4" /></button>
                  <button onClick={() => setEditBankId(null)} className="p-1 text-gray-400 hover:bg-gray-50 rounded"><XMarkIcon className="w-4 h-4" /></button>
                </>
              ) : (
                <>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${bank.is_active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{bank.name}</p>
                    {bank.short_code && <p className="text-xs text-gray-400">{bank.short_code}</p>}
                  </div>
                  <button
                    onClick={() => { setEditBankId(bank.id); setEditBankName(bank.name); setEditBankCode(bank.short_code || '') }}
                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <PencilIcon className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => toggleBank(bank)} className={`text-xs px-2 py-1 rounded ${bank.is_active ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
                    {bank.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => deleteBank(bank.id)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input type="text" value={newBankName} onChange={e => setNewBankName(e.target.value)} placeholder="Bank name" className={`flex-1 ${cls}`} />
          <input type="text" value={newBankCode} onChange={e => setNewBankCode(e.target.value)} placeholder="Code" className={`w-20 ${cls}`} />
          <button onClick={addBank} className="bg-green-600 text-white rounded-lg px-3 py-2 hover:bg-green-700">
            <PlusIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Categories</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center gap-1 bg-gray-100 rounded-full px-3 py-1">
              {editCategoryId === cat.id ? (
                <>
                  <input
                    type="text"
                    value={editCategoryName}
                    onChange={e => setEditCategoryName(e.target.value)}
                    className="text-xs border border-gray-300 rounded px-1 py-0.5 w-28 focus:outline-none focus:ring-1 focus:ring-green-500"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') saveEditCategory(cat.id); if (e.key === 'Escape') setEditCategoryId(null) }}
                  />
                  <button onClick={() => saveEditCategory(cat.id)} className="text-green-600 hover:text-green-700"><CheckIcon className="w-3 h-3" /></button>
                  <button onClick={() => setEditCategoryId(null)} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="w-3 h-3" /></button>
                </>
              ) : (
                <>
                  <span className="text-xs text-gray-700">{cat.name}</span>
                  <button onClick={() => { setEditCategoryId(cat.id); setEditCategoryName(cat.name) }} className="text-gray-400 hover:text-blue-600 ml-1"><PencilIcon className="w-3 h-3" /></button>
                  <button onClick={() => deleteCategory(cat.id, cat.name)} className="text-gray-400 hover:text-red-600"><XMarkIcon className="w-3 h-3" /></button>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newCategoryName}
            onChange={e => setNewCategoryName(e.target.value)}
            placeholder="New category"
            className={`flex-1 ${cls}`}
            onKeyDown={e => { if (e.key === 'Enter') addCategory() }}
          />
          <button onClick={addCategory} className="bg-green-600 text-white rounded-lg px-3 py-2 hover:bg-green-700">
            <PlusIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Payment Modes */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Payment Modes</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {modes.map(mode => (
            <div key={mode.id} className="flex items-center gap-1 bg-gray-100 rounded-full px-3 py-1">
              {editModeId === mode.id ? (
                <>
                  <input
                    type="text"
                    value={editModeName}
                    onChange={e => setEditModeName(e.target.value)}
                    className="text-xs border border-gray-300 rounded px-1 py-0.5 w-24 focus:outline-none focus:ring-1 focus:ring-green-500"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') saveEditMode(mode.id); if (e.key === 'Escape') setEditModeId(null) }}
                  />
                  <button onClick={() => saveEditMode(mode.id)} className="text-green-600 hover:text-green-700"><CheckIcon className="w-3 h-3" /></button>
                  <button onClick={() => setEditModeId(null)} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="w-3 h-3" /></button>
                </>
              ) : (
                <>
                  <span className="text-xs text-gray-700">{mode.name}</span>
                  <button onClick={() => { setEditModeId(mode.id); setEditModeName(mode.name) }} className="text-gray-400 hover:text-blue-600 ml-1"><PencilIcon className="w-3 h-3" /></button>
                  <button onClick={() => deleteMode(mode.id, mode.name)} className="text-gray-400 hover:text-red-600"><XMarkIcon className="w-3 h-3" /></button>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newModeName}
            onChange={e => setNewModeName(e.target.value)}
            placeholder="New mode"
            className={`flex-1 ${cls}`}
            onKeyDown={e => { if (e.key === 'Enter') addMode() }}
          />
          <button onClick={addMode} className="bg-green-600 text-white rounded-lg px-3 py-2 hover:bg-green-700">
            <PlusIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Activity log */}
      {activity.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Activity</h3>
          <div className="space-y-2">
            {activity.map(a => (
              <div key={a.id} className="flex items-center justify-between">
                <p className="text-sm text-gray-700">{a.action.replace(/_/g, ' ')}</p>
                <p className="text-xs text-gray-400">{formatDateTime(a.created_at)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
