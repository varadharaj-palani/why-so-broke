import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Bank } from '../types'
import { formatDateTime } from '../utils/formatters'
import { PlusIcon } from '@heroicons/react/24/outline'
import api from '../api/client'
import axios from 'axios'

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const [banks, setBanks] = useState<Bank[]>([])
  const [newBankName, setNewBankName] = useState('')
  const [newBankCode, setNewBankCode] = useState('')
  const [activity, setActivity] = useState<{ id: string; action: string; created_at: string; details: Record<string, unknown> | null }[]>([])
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    api.get('/banks').then(r => setBanks(r.data))
    api.get('/activity').then(r => setActivity(r.data.items))
  }, [])

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
            <div key={bank.id} className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${bank.is_active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{bank.name}</p>
                {bank.short_code && <p className="text-xs text-gray-400">{bank.short_code}</p>}
              </div>
              <button onClick={() => toggleBank(bank)} className={`text-xs px-2 py-1 rounded ${bank.is_active ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
                {bank.is_active ? 'Deactivate' : 'Activate'}
              </button>
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
