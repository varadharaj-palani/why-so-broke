import { useState, useEffect } from 'react'
import { Bank } from '../../types'
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import DropdownMenu from '../ui/DropdownMenu'
import api from '../../api/client'

export default function BanksPanel() {
  const [banks, setBanks] = useState<Bank[]>([])
  const [newName, setNewName] = useState('')
  const [newCode, setNewCode] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCode, setEditCode] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/banks').then(r => setBanks(r.data))
  }, [])

  async function addBank() {
    if (!newName.trim()) return
    try {
      const res = await api.post('/banks', { name: newName.trim(), short_code: newCode.trim() || undefined })
      setBanks(b => [...b, res.data])
      setNewName('')
      setNewCode('')
      setError('')
    } catch (err: unknown) {
      setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to add bank')
    }
  }

  async function saveEdit(id: string) {
    try {
      const res = await api.put(`/banks/${id}`, { name: editName.trim(), short_code: editCode.trim() || undefined })
      setBanks(b => b.map(x => x.id === id ? res.data : x))
      setEditId(null)
      setError('')
    } catch (err: unknown) {
      setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to update bank')
    }
  }

  async function archiveBank(id: string) {
    if (!window.confirm('Archive this bank? It will be hidden from dropdowns but your transaction history is preserved.')) return
    try {
      await api.delete(`/banks/${id}`)
      setBanks(b => b.filter(x => x.id !== id))
    } catch (err: unknown) {
      setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Cannot archive bank')
    }
  }

  const fi = "border rounded-md px-3 py-2 text-[13px] outline-none focus:border-[var(--green)] transition-colors"
  const fiStyle = { background: 'var(--surface)', borderColor: 'var(--border2)', color: 'var(--text)' }

  return (
    <div>
      <h3 className="text-[15px] font-medium mb-4" style={{ color: 'var(--text)' }}>Banks</h3>

      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        {banks.length === 0 && (
          <p className="p-4 text-[13px]" style={{ color: 'var(--text3)' }}>No banks added yet.</p>
        )}

        {banks.map((bank, i) => (
          <div
            key={bank.id}
            className="p-4 flex items-center gap-3"
            style={{ borderBottom: i < banks.length - 1 ? '0.5px solid var(--border)' : 'none' }}
          >
            {/* Initials avatar */}
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-[13px] font-semibold shrink-0"
              style={{ background: 'var(--gl)', color: 'var(--green)' }}
            >
              {bank.name.slice(0, 2).toUpperCase()}
            </div>

            {editId === bank.id ? (
              <>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className={`flex-1 ${fi}`}
                  style={fiStyle}
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(bank.id); if (e.key === 'Escape') setEditId(null) }}
                />
                <input
                  type="text"
                  value={editCode}
                  onChange={e => setEditCode(e.target.value)}
                  placeholder="Code"
                  className={`w-20 ${fi}`}
                  style={fiStyle}
                />
                <button onClick={() => saveEdit(bank.id)} className="p-1.5 rounded-md" style={{ color: 'var(--green)', background: 'var(--gl)', border: 'none', cursor: 'pointer' }}>
                  <CheckIcon className="w-4 h-4" />
                </button>
                <button onClick={() => setEditId(null)} className="p-1.5 rounded-md" style={{ color: 'var(--text3)', background: 'var(--bg)', border: 'none', cursor: 'pointer' }}>
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>{bank.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {bank.short_code && (
                      <span className="text-[11px]" style={{ color: 'var(--text3)' }}>{bank.short_code}</span>
                    )}
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{
                        background: bank.is_active ? 'var(--gl)' : 'var(--bg)',
                        color: bank.is_active ? 'var(--green)' : 'var(--text3)',
                      }}
                    >
                      {bank.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <DropdownMenu
                  items={[
                    {
                      label: 'Edit',
                      onClick: () => { setEditId(bank.id); setEditName(bank.name); setEditCode(bank.short_code || '') },
                    },
                    {
                      label: 'Archive',
                      onClick: () => archiveBank(bank.id),
                      variant: 'danger',
                    },
                  ]}
                />
              </>
            )}
          </div>
        ))}

        {/* Add bank row */}
        <div className="p-4 flex items-center gap-2" style={{ borderTop: banks.length > 0 ? '0.5px solid var(--border)' : 'none' }}>
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Bank name"
            className={`flex-1 ${fi}`}
            style={fiStyle}
            onKeyDown={e => { if (e.key === 'Enter') addBank() }}
          />
          <input
            type="text"
            value={newCode}
            onChange={e => setNewCode(e.target.value)}
            placeholder="Code"
            className={`w-20 ${fi}`}
            style={fiStyle}
          />
          <button
            onClick={addBank}
            className="px-3 py-2 rounded-md text-[13px] text-white"
            style={{ background: 'var(--green)', border: 'none', cursor: 'pointer' }}
          >
            Add
          </button>
        </div>
      </div>

      {error && <p className="mt-2 text-[12px] text-red-500">{error}</p>}
    </div>
  )
}
