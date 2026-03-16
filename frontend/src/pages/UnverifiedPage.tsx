import { useState, useEffect, useCallback } from 'react'
import { unverifiedApi } from '../api/imports'
import { categoriesApi } from '../api/categories'
import { modesApi } from '../api/modes'
import { UnverifiedTransaction } from '../types'
import { formatAmount, formatDate } from '../utils/formatters'
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'

export default function UnverifiedPage() {
  const [items, setItems] = useState<UnverifiedTransaction[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editId, setEditId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<UnverifiedTransaction>>({})
  const [working, setWorking] = useState<string | null>(null)
  const [categories, setCategories] = useState<string[]>([])
  const [modes, setModes] = useState<string[]>([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await unverifiedApi.list({ status: 'pending', per_page: 50 })
      setItems(res.data.items)
      setTotal(res.data.total)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    categoriesApi.list().then(r => setCategories(r.data.map(c => c.name)))
    modesApi.list().then(r => setModes(r.data.map(m => m.name)))
  }, [])

  const toggle = (id: string) => setSelected(s => {
    const n = new Set(s)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })

  const handleVerify = async (id: string) => {
    setWorking(id)
    try {
      await unverifiedApi.verify(id)
      setItems(items => items.filter(i => i.id !== id))
    } finally {
      setWorking(null)
    }
  }

  const handleReject = async (id: string) => {
    setWorking(id)
    try {
      await unverifiedApi.reject(id)
      setItems(items => items.filter(i => i.id !== id))
    } finally {
      setWorking(null)
    }
  }

  const handleBulkVerify = async () => {
    setWorking('bulk')
    try {
      await unverifiedApi.bulkVerify(Array.from(selected))
      await fetchData()
      setSelected(new Set())
    } finally {
      setWorking(null)
    }
  }

  const handleBulkReject = async () => {
    setWorking('bulk-reject')
    try {
      await unverifiedApi.bulkReject(Array.from(selected))
      await fetchData()
      setSelected(new Set())
    } finally {
      setWorking(null)
    }
  }

  const saveEdit = async (id: string) => {
    await unverifiedApi.update(id, editData)
    setItems(items => items.map(i => i.id === id ? { ...i, ...editData } : i))
    setEditId(null)
    setEditData({})
  }

  const cls = "border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500 w-full"

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Unverified</h2>
          <p className="text-sm text-gray-500">{total} pending from imports</p>
        </div>
        {selected.size > 0 && (
          <div className="flex gap-2">
            <button onClick={handleBulkVerify} disabled={!!working} className="bg-green-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-green-700 disabled:opacity-50">
              Verify {selected.size}
            </button>
            <button onClick={handleBulkReject} disabled={!!working} className="bg-red-100 text-red-700 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-red-200 disabled:opacity-50">
              Reject {selected.size}
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <p className="text-gray-400">No pending transactions. Import a PDF to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {items.map((item) => {
            const isEditing = editId === item.id
            const confidence = parseFloat(item.confidence || '1')
            const lowConfidence = confidence < 0.7
            return (
              <div key={item.id} className={`border-b border-gray-100 last:border-0 p-4 ${lowConfidence ? 'bg-yellow-50' : ''}`}>
                <div className="flex items-start gap-3">
                  <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggle(item.id)} className="mt-1 w-4 h-4 accent-green-600" />
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                        <input type="date" defaultValue={item.date || ''} onChange={e => setEditData(d => ({...d, date: e.target.value}))} className={cls} />
                        <input type="text" defaultValue={item.description || ''} onChange={e => setEditData(d => ({...d, description: e.target.value}))} className={cls} placeholder="Description" />
                        <select defaultValue={item.category || ''} onChange={e => setEditData(d => ({...d, category: e.target.value}))} className={cls}>
                          {categories.map(c => <option key={c}>{c}</option>)}
                        </select>
                        <input type="number" step="0.01" defaultValue={item.amount || ''} onChange={e => setEditData(d => ({...d, amount: e.target.value}))} className={cls} placeholder="Amount" />
                        <select defaultValue={item.mode || ''} onChange={e => setEditData(d => ({...d, mode: e.target.value}))} className={cls}>
                          {modes.map(m => <option key={m}>{m}</option>)}
                        </select>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.description}</p>
                          {lowConfidence && <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">Low confidence</span>}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {item.date ? formatDate(item.date) : '?'} · {item.category} · {item.mode}
                        </p>
                        {item.raw_text && (
                          <p className="text-xs text-gray-400 mt-1 truncate font-mono">{item.raw_text}</p>
                        )}
                      </>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {!isEditing && (
                      <p className="text-sm font-semibold text-gray-900">{item.amount ? formatAmount(item.amount) : '—'}</p>
                    )}
                    <div className="flex gap-1 mt-1 justify-end">
                      {isEditing ? (
                        <>
                          <button onClick={() => saveEdit(item.id)} className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700">Save</button>
                          <button onClick={() => { setEditId(null); setEditData({}) }} className="text-xs border border-gray-300 px-2 py-1 rounded hover:bg-gray-50">Cancel</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditId(item.id); setEditData({}) }} className="text-xs text-blue-600 hover:underline">Edit</button>
                          <button onClick={() => handleVerify(item.id)} disabled={working === item.id} className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50">
                            <CheckIcon className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleReject(item.id)} disabled={working === item.id} className="p-1 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50">
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
