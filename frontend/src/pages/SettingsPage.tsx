import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Bank } from '../types'
import { formatDateTime } from '../utils/formatters'
import { PlusIcon, PencilIcon, TrashIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import api from '../api/client'
import axios from 'axios'
import { categoriesApi, CategoryItem } from '../api/categories'
import { modesApi, ModeItem } from '../api/modes'
import { useToast, Toast } from '../components/ui/Toast'
import ConfirmModal from '../components/ui/ConfirmModal'

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const { toast, showToast, clearToast } = useToast()
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

  const [confirmDelete, setConfirmDelete] = useState<{
    type: 'bank' | 'category' | 'mode'
    id: string
    name: string
  } | null>(null)

  useEffect(() => {
    api.get('/banks').then(r => setBanks(r.data))
    api.get('/activity').then(r => setActivity(r.data.items))
    categoriesApi.list().then(r => setCategories(r.data))
    modesApi.list().then(r => setModes(r.data))
  }, [])

  // ── Banks ─────────────────────────────────────────────────────────────────

  async function addBank() {
    if (!newBankName.trim()) return
    try {
      const res = await api.post('/banks', { name: newBankName, short_code: newBankCode || undefined })
      setBanks(b => [...b, res.data])
      setNewBankName('')
      setNewBankCode('')
      showToast('Bank added', 'success')
    } catch (err: unknown) {
      showToast((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to add bank', 'error')
    }
  }

  async function toggleBank(bank: Bank) {
    const res = await api.put(`/banks/${bank.id}`, { is_active: !bank.is_active })
    setBanks(b => b.map(x => x.id === bank.id ? res.data : x))
  }

  async function saveEditBank(id: string) {
    try {
      const res = await api.put(`/banks/${id}`, { name: editBankName, short_code: editBankCode || undefined })
      setBanks(b => b.map(x => x.id === id ? res.data : x))
      setEditBankId(null)
      showToast('Bank updated', 'success')
    } catch (err: unknown) {
      showToast((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to update bank', 'error')
    }
  }

  async function deleteBank(id: string) {
    try {
      await api.delete(`/banks/${id}`)
      setBanks(b => b.filter(x => x.id !== id))
      showToast('Bank deleted', 'success')
    } catch (err: unknown) {
      showToast((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Cannot delete bank', 'error')
    }
  }

  // ── Categories ────────────────────────────────────────────────────────────

  async function addCategory() {
    if (!newCategoryName.trim()) return
    try {
      const res = await categoriesApi.create(newCategoryName.trim())
      setCategories(c => [...c, res.data].sort((a, b) => a.name.localeCompare(b.name)))
      setNewCategoryName('')
      showToast('Category added', 'success')
    } catch (err: unknown) {
      showToast((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to add category', 'error')
    }
  }

  async function saveEditCategory(id: string) {
    try {
      const res = await categoriesApi.update(id, editCategoryName.trim())
      setCategories(c => c.map(x => x.id === id ? res.data : x).sort((a, b) => a.name.localeCompare(b.name)))
      setEditCategoryId(null)
      showToast('Category updated', 'success')
    } catch (err: unknown) {
      showToast((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to update', 'error')
    }
  }

  async function deleteCategory(id: string) {
    try {
      await categoriesApi.delete(id)
      setCategories(c => c.filter(x => x.id !== id))
      showToast('Category deleted', 'success')
    } catch (err: unknown) {
      showToast((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Cannot delete category', 'error')
    }
  }

  // ── Modes ─────────────────────────────────────────────────────────────────

  async function addMode() {
    if (!newModeName.trim()) return
    try {
      const res = await modesApi.create(newModeName.trim())
      setModes(m => [...m, res.data].sort((a, b) => a.name.localeCompare(b.name)))
      setNewModeName('')
      showToast('Payment mode added', 'success')
    } catch (err: unknown) {
      showToast((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to add mode', 'error')
    }
  }

  async function saveEditMode(id: string) {
    try {
      const res = await modesApi.update(id, editModeName.trim())
      setModes(m => m.map(x => x.id === id ? res.data : x).sort((a, b) => a.name.localeCompare(b.name)))
      setEditModeId(null)
      showToast('Payment mode updated', 'success')
    } catch (err: unknown) {
      showToast((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to update', 'error')
    }
  }

  async function deleteMode(id: string) {
    try {
      await modesApi.delete(id)
      setModes(m => m.filter(x => x.id !== id))
      showToast('Payment mode deleted', 'success')
    } catch (err: unknown) {
      showToast((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Cannot delete mode', 'error')
    }
  }

  // ── Confirm delete handler ────────────────────────────────────────────────

  async function handleConfirmDelete() {
    if (!confirmDelete) return
    const { type, id } = confirmDelete
    setConfirmDelete(null)
    if (type === 'bank') await deleteBank(id)
    else if (type === 'category') await deleteCategory(id)
    else await deleteMode(id)
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
      showToast('Export downloaded', 'success')
    } catch {
      showToast('Export failed', 'error')
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
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Account</h3>
        <p className="text-sm text-gray-600">Signed in as <strong>{user?.display_name || user?.username}</strong></p>
        <button onClick={logout} className="mt-3 text-sm text-red-500 hover:underline">Sign out</button>
      </div>

      {/* Export */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800 mb-1">Export Data</h3>
        <p className="text-xs text-gray-500 mb-3">Download all your transactions as a CSV file.</p>
        <button onClick={handleExport} disabled={exporting} className="bg-green-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-green-700 disabled:opacity-50">
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      {/* Banks */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800 mb-0.5">Manage Banks</h3>
        <p className="text-xs text-gray-500 mb-3">Add and manage your bank accounts.</p>
        <div className="divide-y divide-gray-100 mb-4">
          {banks.length === 0 && (
            <p className="text-sm text-gray-400 italic py-2">No banks added yet.</p>
          )}
          {banks.map(bank => (
            <div key={bank.id} className="py-3 flex items-center gap-3">
              {editBankId === bank.id ? (
                <>
                  <input type="text" value={editBankName} onChange={e => setEditBankName(e.target.value)} className={`flex-1 ${inlineCls}`} />
                  <input type="text" value={editBankCode} onChange={e => setEditBankCode(e.target.value)} className={`w-20 ${inlineCls}`} placeholder="Code" />
                  <button onClick={() => saveEditBank(bank.id)} className="p-2 text-green-600 hover:bg-green-50 rounded"><CheckIcon className="w-4 h-4" /></button>
                  <button onClick={() => setEditBankId(null)} className="p-2 text-gray-400 hover:bg-gray-50 rounded"><XMarkIcon className="w-4 h-4" /></button>
                </>
              ) : (
                <>
                  <div className={`w-2 h-2 rounded-full shrink-0 ${bank.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${bank.is_active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{bank.name}</p>
                    {bank.short_code && <p className="text-xs text-gray-400">{bank.short_code}</p>}
                  </div>
                  <button
                    onClick={() => { setEditBankId(bank.id); setEditBankName(bank.name); setEditBankCode(bank.short_code || '') }}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <PencilIcon className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => toggleBank(bank)} className={`text-xs px-2 py-1 rounded ${bank.is_active ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
                    {bank.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => setConfirmDelete({ type: 'bank', id: bank.id, name: bank.name })} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input type="text" value={newBankName} onChange={e => setNewBankName(e.target.value)} placeholder="Bank name" className={`flex-1 ${cls}`} onKeyDown={e => { if (e.key === 'Enter') addBank() }} />
          <input type="text" value={newBankCode} onChange={e => setNewBankCode(e.target.value)} placeholder="Code" className={`w-20 ${cls}`} />
          <button onClick={addBank} className="bg-green-600 text-white rounded-lg px-3 py-2 hover:bg-green-700">
            <PlusIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800 mb-0.5">Categories</h3>
        <p className="text-xs text-gray-500 mb-3">Customize the categories used for your transactions.</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.length === 0 && (
            <p className="text-sm text-gray-400 italic py-2">No categories yet — add one below.</p>
          )}
          {categories.map(cat => (
            <div key={cat.id} className="group relative flex items-center gap-1 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-full px-3 py-1">
              {editCategoryId === cat.id ? (
                <>
                  <input
                    type="text"
                    value={editCategoryName}
                    onChange={e => setEditCategoryName(e.target.value)}
                    className="text-xs border border-indigo-300 rounded px-1 py-0.5 w-28 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') saveEditCategory(cat.id); if (e.key === 'Escape') setEditCategoryId(null) }}
                  />
                  <button onClick={() => saveEditCategory(cat.id)} className="text-green-600 hover:text-green-700"><CheckIcon className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setEditCategoryId(null)} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="w-3.5 h-3.5" /></button>
                </>
              ) : (
                <>
                  <span className="text-xs font-medium">{cat.name}</span>
                  <button onClick={() => { setEditCategoryId(cat.id); setEditCategoryName(cat.name) }} className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400 hover:text-blue-600 ml-1"><PencilIcon className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setConfirmDelete({ type: 'category', id: cat.id, name: cat.name })} className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400 hover:text-red-600"><XMarkIcon className="w-3.5 h-3.5" /></button>
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
        <h3 className="text-sm font-semibold text-gray-800 mb-0.5">Payment Modes</h3>
        <p className="text-xs text-gray-500 mb-3">Manage payment methods like cash, UPI, card, etc.</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {modes.length === 0 && (
            <p className="text-sm text-gray-400 italic py-2">No payment modes yet — add one below.</p>
          )}
          {modes.map(mode => (
            <div key={mode.id} className="group relative flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full px-3 py-1">
              {editModeId === mode.id ? (
                <>
                  <input
                    type="text"
                    value={editModeName}
                    onChange={e => setEditModeName(e.target.value)}
                    className="text-xs border border-amber-300 rounded px-1 py-0.5 w-24 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') saveEditMode(mode.id); if (e.key === 'Escape') setEditModeId(null) }}
                  />
                  <button onClick={() => saveEditMode(mode.id)} className="text-green-600 hover:text-green-700"><CheckIcon className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setEditModeId(null)} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="w-3.5 h-3.5" /></button>
                </>
              ) : (
                <>
                  <span className="text-xs font-medium">{mode.name}</span>
                  <button onClick={() => { setEditModeId(mode.id); setEditModeName(mode.name) }} className="opacity-0 group-hover:opacity-100 transition-opacity text-amber-400 hover:text-blue-600 ml-1"><PencilIcon className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setConfirmDelete({ type: 'mode', id: mode.id, name: mode.name })} className="opacity-0 group-hover:opacity-100 transition-opacity text-amber-400 hover:text-red-600"><XMarkIcon className="w-3.5 h-3.5" /></button>
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
          <h3 className="text-sm font-semibold text-gray-800 mb-0.5">Recent Activity</h3>
          <p className="text-xs text-gray-500 mb-3">A log of recent changes in your account.</p>
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

      {/* Confirm delete modal */}
      <ConfirmModal
        open={confirmDelete !== null}
        title={`Delete ${confirmDelete?.type ?? ''}?`}
        description={confirmDelete ? `Are you sure you want to delete "${confirmDelete.name}"? This cannot be undone.` : undefined}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
    </div>
  )
}
