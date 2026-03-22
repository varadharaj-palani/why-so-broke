import { useState, useEffect } from 'react'
import { modesApi, ModeItem } from '../../api/modes'
import { getCategoryChip } from '../../utils/constants'
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import DropdownMenu from '../ui/DropdownMenu'
import { Toast, useToast } from '../ui/Toast'

export default function ModesPanel() {
  const [modes, setModes] = useState<ModeItem[]>([])
  const [newName, setNewName] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [error, setError] = useState('')
  const { toast, showToast, clearToast } = useToast()

  useEffect(() => {
    modesApi.list().then(r => setModes(r.data))
  }, [])

  async function addMode() {
    if (!newName.trim()) return
    try {
      const res = await modesApi.create(newName.trim())
      setModes(m => [...m, res.data].sort((a, b) => a.name.localeCompare(b.name)))
      setNewName('')
      setError('')
    } catch (err: unknown) {
      setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to add mode')
    }
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return
    try {
      const res = await modesApi.update(id, editName.trim())
      setModes(m => m.map(x => x.id === id ? res.data : x).sort((a, b) => a.name.localeCompare(b.name)))
      setEditId(null)
      setError('')
    } catch (err: unknown) {
      setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to update')
    }
  }

  async function deleteMode(id: string) {
    try {
      await modesApi.delete(id)
      setModes(m => m.filter(x => x.id !== id))
    } catch (err: unknown) {
      showToast((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Cannot delete mode', 'error')
    }
  }

  const fi = "border rounded-md px-3 py-2 text-[13px] outline-none focus:border-[var(--green)] transition-colors"
  const fiStyle = { background: 'var(--surface)', borderColor: 'var(--border2)', color: 'var(--text)' }

  return (
    <div>
      <h3 className="text-[15px] font-medium mb-4" style={{ color: 'var(--text)' }}>Payment modes</h3>

      <div className="rounded-xl border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        {modes.length === 0 && (
          <p className="text-[13px] mb-4" style={{ color: 'var(--text3)' }}>No payment modes yet — add one below.</p>
        )}

        <div className="grid grid-cols-2 gap-2 mb-4">
          {modes.map(mode => {
            const chip = getCategoryChip(mode.name)
            return (
              <div
                key={mode.id}
                className="flex items-center gap-2.5 rounded-lg border p-2.5"
                style={{ background: chip.bg, borderColor: chip.border }}
              >
                {/* Icon square with initials */}
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center text-[11px] font-semibold shrink-0"
                  style={{ background: chip.border, color: chip.text }}
                >
                  {mode.name.slice(0, 2).toUpperCase()}
                </div>

                {editId === mode.id ? (
                  <>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="flex-1 text-[12px] bg-transparent border-none outline-none min-w-0"
                      style={{ color: chip.text }}
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveEdit(mode.id)
                        if (e.key === 'Escape') setEditId(null)
                      }}
                    />
                    <button
                      onClick={() => saveEdit(mode.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: chip.text, padding: 0 }}
                    >
                      <CheckIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditId(null)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: chip.text, padding: 0, opacity: 0.6 }}
                    >
                      <XMarkIcon className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-[13px] font-medium min-w-0 truncate" style={{ color: chip.text }}>{mode.name}</span>
                    <DropdownMenu
                      items={[
                        {
                          label: 'Edit',
                          onClick: () => { setEditId(mode.id); setEditName(mode.name) },
                        },
                        {
                          label: 'Delete',
                          onClick: () => deleteMode(mode.id),
                          variant: 'danger',
                        },
                      ]}
                    />
                  </>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex gap-2 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="New payment mode"
            className={`flex-1 ${fi}`}
            style={fiStyle}
            onKeyDown={e => { if (e.key === 'Enter') addMode() }}
          />
          <button
            onClick={addMode}
            className="px-3 py-2 rounded-md text-[13px] text-white"
            style={{ background: 'var(--green)', border: 'none', cursor: 'pointer' }}
          >
            Add
          </button>
        </div>
      </div>

      {error && <p className="mt-2 text-[12px] text-red-500">{error}</p>}
      {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
    </div>
  )
}
