import { useState, useEffect } from 'react'
import { categoriesApi, CategoryItem } from '../../api/categories'
import { getCategoryChip } from '../../utils/constants'
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import DropdownMenu from '../ui/DropdownMenu'

export default function CategoriesPanel() {
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [newName, setNewName] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    categoriesApi.list().then(r => setCategories(r.data))
  }, [])

  async function addCategory() {
    if (!newName.trim()) return
    try {
      const res = await categoriesApi.create(newName.trim())
      setCategories(c => [...c, res.data].sort((a, b) => a.name.localeCompare(b.name)))
      setNewName('')
      setError('')
    } catch (err: unknown) {
      setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to add category')
    }
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return
    try {
      const res = await categoriesApi.update(id, editName.trim())
      setCategories(c => c.map(x => x.id === id ? res.data : x).sort((a, b) => a.name.localeCompare(b.name)))
      setEditId(null)
      setError('')
    } catch (err: unknown) {
      setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to update')
    }
  }

  async function deleteCategory(id: string) {
    try {
      await categoriesApi.delete(id)
      setCategories(c => c.filter(x => x.id !== id))
    } catch (err: unknown) {
      setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Cannot delete category')
    }
  }

  const fi = "border rounded-md px-3 py-2 text-[13px] outline-none focus:border-[var(--green)] transition-colors"
  const fiStyle = { background: 'var(--surface)', borderColor: 'var(--border2)', color: 'var(--text)' }

  return (
    <div>
      <h3 className="text-[15px] font-medium mb-4" style={{ color: 'var(--text)' }}>Categories</h3>

      <div className="rounded-xl border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        {categories.length === 0 && (
          <p className="text-[13px] mb-4" style={{ color: 'var(--text3)' }}>No categories yet — add one below.</p>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          {categories.map(cat => {
            const chip = getCategoryChip(cat.name)
            return (
              <div
                key={cat.id}
                className="flex items-center gap-1.5 rounded-full border px-3 py-1"
                style={{ background: chip.bg, borderColor: chip.border }}
              >
                {editId === cat.id ? (
                  <>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="text-[12px] bg-transparent border-none outline-none w-24"
                      style={{ color: chip.text }}
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveEdit(cat.id)
                        if (e.key === 'Escape') setEditId(null)
                      }}
                    />
                    <button
                      onClick={() => saveEdit(cat.id)}
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
                    <span className="text-[12px] font-medium" style={{ color: chip.text }}>{cat.name}</span>
                    <DropdownMenu
                      items={[
                        {
                          label: 'Edit',
                          onClick: () => { setEditId(cat.id); setEditName(cat.name) },
                        },
                        {
                          label: 'Delete',
                          onClick: () => deleteCategory(cat.id),
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
            placeholder="New category name"
            className={`flex-1 ${fi}`}
            style={fiStyle}
            onKeyDown={e => { if (e.key === 'Enter') addCategory() }}
          />
          <button
            onClick={addCategory}
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
