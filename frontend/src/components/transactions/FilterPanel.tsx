import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

type FieldKey = 'date_range' | 'category' | 'bank' | 'mode' | 'type'

interface FilterRow {
  field: FieldKey
  from?: string
  to?: string
  value?: string
}

interface FilterPanelProps {
  categories: string[]
  modes: string[]
  banks: { id: string; name: string }[]
  onApply: (filters: {
    date_from?: string
    date_to?: string
    category?: string
    bank_id?: string
    mode?: string
    type?: string
  }) => void
  onClose: () => void
  activeCount: number
}

const FIELD_LABELS: Record<FieldKey, string> = {
  date_range: 'Date range',
  category: 'Category',
  bank: 'Bank',
  mode: 'Payment mode',
  type: 'Type',
}

export default function FilterPanel({ categories, modes, banks, onApply, onClose, activeCount }: FilterPanelProps) {
  const [rows, setRows] = useState<FilterRow[]>([{ field: 'category' }])

  function addRow() {
    setRows(r => [...r, { field: 'category' }])
  }

  function removeRow(i: number) {
    setRows(r => r.filter((_, idx) => idx !== i))
  }

  function updateRow(i: number, patch: Partial<FilterRow>) {
    setRows(r => r.map((row, idx) => idx === i ? { ...row, ...patch } : row))
  }

  function handleApply() {
    const filters: Parameters<FilterPanelProps['onApply']>[0] = {}
    for (const row of rows) {
      if (row.field === 'date_range') {
        if (row.from) filters.date_from = row.from
        if (row.to) filters.date_to = row.to
      } else if (row.field === 'category' && row.value) {
        filters.category = row.value
      } else if (row.field === 'bank' && row.value) {
        filters.bank_id = row.value
      } else if (row.field === 'mode' && row.value) {
        filters.mode = row.value
      } else if (row.field === 'type' && row.value) {
        filters.type = row.value
      }
    }
    onApply(filters)
    onClose()
  }

  function handleClear() {
    onApply({})
    setRows([{ field: 'category' }])
    onClose()
  }

  const inputCls = "px-2.5 py-1.5 text-[12px] border rounded-md outline-none focus:border-[var(--green)] transition-colors"
  const inputStyle = { background: 'var(--surface)', borderColor: 'var(--border2)', color: 'var(--text)' }
  const selectStyle = { ...inputStyle, padding: '6px 10px' }

  return (
    <div className="rounded-xl p-4 border mb-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[15px] font-medium" style={{ color: 'var(--text)' }}>Filters</span>
        <button onClick={onClose} style={{ color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-col gap-2 mb-3">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[12px] w-9 flex-shrink-0" style={{ color: 'var(--text3)' }}>
              {i === 0 ? 'Where' : 'And'}
            </span>
            <select
              value={row.field}
              onChange={e => updateRow(i, { field: e.target.value as FieldKey, value: '', from: '', to: '' })}
              className="flex-1 rounded-md border text-[12px] outline-none"
              style={selectStyle}
            >
              {(Object.keys(FIELD_LABELS) as FieldKey[]).map(k => (
                <option key={k} value={k}>{FIELD_LABELS[k]}</option>
              ))}
            </select>
            <span className="text-[12px] flex-shrink-0" style={{ color: 'var(--text3)' }}>is</span>
            {row.field === 'date_range' ? (
              <div className="flex items-center gap-1 flex-[1.4]">
                <input type="date" value={row.from || ''} onChange={e => updateRow(i, { from: e.target.value })}
                  className={`flex-1 rounded-md border ${inputCls}`} style={inputStyle} />
                <span className="text-[12px]" style={{ color: 'var(--text3)' }}>→</span>
                <input type="date" value={row.to || ''} onChange={e => updateRow(i, { to: e.target.value })}
                  className={`flex-1 rounded-md border ${inputCls}`} style={inputStyle} />
              </div>
            ) : (
              <select
                value={row.value || ''}
                onChange={e => updateRow(i, { value: e.target.value })}
                className="flex-[1.4] rounded-md border text-[12px] outline-none"
                style={selectStyle}
              >
                <option value="">Select…</option>
                {row.field === 'category' && categories.map(c => <option key={c} value={c}>{c}</option>)}
                {row.field === 'bank' && banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                {row.field === 'mode' && modes.map(m => <option key={m} value={m}>{m}</option>)}
                {row.field === 'type' && ['expense', 'income', 'transfer'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
            <button onClick={() => removeRow(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: '4px' }}>
              <XMarkIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <button onClick={addRow} className="text-[13px] flex items-center gap-1.5 mb-4" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--green)' }}>
        <span className="text-base leading-none">+</span> Add filter
      </button>

      <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <button onClick={handleClear} className="px-3 py-1.5 text-[13px] border rounded-md" style={{ borderColor: 'var(--border2)', color: 'var(--text2)', background: 'var(--surface)' }}>
          Clear all
        </button>
        <button onClick={handleApply} className="px-3 py-1.5 text-[13px] rounded-md text-white" style={{ background: 'var(--green)' }}>
          Apply
        </button>
      </div>
    </div>
  )
}
