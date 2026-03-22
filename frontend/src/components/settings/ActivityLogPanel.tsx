import { useState, useEffect } from 'react'
import api from '../../api/client'
import dayjs from 'dayjs'
import {
  PlusIcon,
  PencilSquareIcon,
  ArrowDownTrayIcon,
  BuildingLibraryIcon,
  BanknotesIcon,
  TagIcon,
} from '@heroicons/react/24/outline'

interface ActivityItem {
  id: string
  action: string
  entity_type: string | null
  created_at: string
  details: Record<string, unknown> | null
}

const FILTER_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Transactions', value: 'transaction' },
  { label: 'Budgets', value: 'budget' },
  { label: 'Imports', value: 'import_job' },
  { label: 'Settings', value: 'settings' },
]

const PER_PAGE = 20

// ─── Icon config per action ────────────────────────────────────────────────────

type IconCfg = { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>, bg: string, color: string }

function getIconCfg(action: string, entityType: string | null): IconCfg {
  if (action === 'transaction_created') return { icon: PlusIcon, bg: 'var(--gl)', color: 'var(--green)' }
  if (action.startsWith('transaction_')) return { icon: PencilSquareIcon, bg: 'var(--al)', color: 'var(--amber)' }
  if (action.startsWith('budget_') || entityType === 'budget') return { icon: BanknotesIcon, bg: '#ede9fe', color: '#7c3aed' }
  if (entityType === 'import_job' || action.includes('import')) return { icon: ArrowDownTrayIcon, bg: '#dbeafe', color: '#2563eb' }
  if (action.includes('bank')) return { icon: BuildingLibraryIcon, bg: '#ccfbf1', color: '#0d9488' }
  return { icon: TagIcon, bg: '#f1f5f9', color: '#64748b' }
}

// ─── Label + detail parsing ────────────────────────────────────────────────────

function actionLabel(action: string): string {
  return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function getDetailLines(item: ActivityItem): { line1?: string; line2?: string } {
  const d = item.details
  if (!d) return {}

  if (item.action === 'transaction_created' || item.action === 'transaction_updated') {
    const desc = d.description ? String(d.description) : ''
    const amt = d.amount != null ? `₹${Number(d.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : ''
    const category = d.category ? String(d.category) : ''
    const bank = d.bank_name ? String(d.bank_name) : ''
    const mode = d.mode ? String(d.mode) : ''
    return {
      line1: [desc, amt].filter(Boolean).join(' · ') || undefined,
      line2: [category, bank, mode].filter(Boolean).join(' · ') || undefined,
    }
  }

  if (item.action === 'budget_set') {
    const category = String(d.category ?? '')
    const amt = d.amount != null ? Number(d.amount).toLocaleString('en-IN') : ''
    const start = d.start_date ? dayjs(String(d.start_date)).format('D MMM') : ''
    let end = ''
    if (d.end_date) {
      end = dayjs(String(d.end_date)).format('D MMM')
    } else if (d.cycle_days && d.start_date) {
      end = dayjs(String(d.start_date)).add(Number(d.cycle_days) - 1, 'day').format('D MMM')
    }
    return {
      line1: [category, amt ? `Limit ₹${amt}` : ''].filter(Boolean).join(' · '),
      line2: start && end ? `Cycle: ${start} → ${end}` : '',
    }
  }

  if (item.entity_type === 'import_job') {
    const bank = String(d.bank_name ?? d.bank ?? '')
    const rows = d.total_rows != null ? `${d.total_rows} transactions extracted` : ''
    const unverified = d.unverified_count != null ? `${d.unverified_count} unverified` : ''
    return {
      line1: bank || undefined,
      line2: [rows, unverified].filter(Boolean).join(' · ') || undefined,
    }
  }

  // Generic: show up to 2 key-value pairs
  const parts = Object.entries(d)
    .slice(0, 3)
    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${String(v)}`)
  return { line1: parts.slice(0, 2).join(' · '), line2: parts[2] }
}

// ─── Date group helpers ────────────────────────────────────────────────────────

function groupByDay(items: ActivityItem[]) {
  const groups: { isoDate: string; items: ActivityItem[] }[] = []
  for (const item of items) {
    const isoDate = dayjs(item.created_at).format('YYYY-MM-DD')
    const existing = groups.find(g => g.isoDate === isoDate)
    if (existing) existing.items.push(item)
    else groups.push({ isoDate, items: [item] })
  }
  return groups
}

function dayHeader(isoDate: string): string {
  const d = dayjs(isoDate)
  const today = dayjs()
  if (d.isSame(today, 'day')) return 'TODAY'
  if (d.isSame(today.subtract(1, 'day'), 'day')) return 'YESTERDAY'
  if (d.year() === today.year()) return d.format('D MMM').toUpperCase()
  return d.format('D MMM YYYY').toUpperCase()
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function ActivityLogPanel() {
  const [items, setItems] = useState<ActivityItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(false)

  async function loadPage(p: number, entityType: string, replace: boolean) {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page: p, per_page: PER_PAGE }
      if (entityType) params.entity_type = entityType
      const res = await api.get('/activity', { params })
      const data = res.data
      setTotal(data.total)
      setItems(prev => replace ? data.items : [...prev, ...data.items])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setPage(1)
    loadPage(1, filter, true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  function loadMore() {
    const next = page + 1
    setPage(next)
    loadPage(next, filter, false)
  }

  const groups = groupByDay(items)

  return (
    <div>
      <h3 className="text-[15px] font-medium" style={{ color: 'var(--text)' }}>Activity log</h3>
      <p className="text-[12px] mt-0.5 mb-4" style={{ color: 'var(--text3)' }}>All changes to your account — all time, paginated.</p>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className="px-3 py-1 rounded-full text-[12px] font-medium border transition-colors"
            style={{
              background: filter === opt.value ? 'var(--gl)' : 'var(--surface)',
              borderColor: filter === opt.value ? 'var(--green)' : 'var(--border)',
              color: filter === opt.value ? 'var(--green)' : 'var(--text3)',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading && items.length === 0 ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-3">
              <div className="w-9 h-9 rounded-full animate-pulse shrink-0" style={{ background: 'var(--border)' }} />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3 rounded animate-pulse w-40" style={{ background: 'var(--border)' }} />
                <div className="h-2.5 rounded animate-pulse w-56" style={{ background: 'var(--border)' }} />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-[13px] py-8 text-center" style={{ color: 'var(--text3)' }}>No activity found.</p>
      ) : (
        <div className="space-y-6">
          {groups.map(group => (
            <div key={group.isoDate}>
              {/* Date header with horizontal rule */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[11px] font-semibold tracking-widest shrink-0" style={{ color: 'var(--text3)' }}>
                  {dayHeader(group.isoDate)}
                </span>
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              </div>

              {/* Timeline items */}
              <div className="space-y-0">
                {group.items.map((item, i) => {
                  const cfg = getIconCfg(item.action, item.entity_type)
                  const Icon = cfg.icon
                  const { line1, line2 } = getDetailLines(item)
                  const time = dayjs(item.created_at).format('h:mm A')
                  const isLast = i === group.items.length - 1

                  return (
                    <div key={item.id} className="flex gap-3 relative">
                      {/* Spine line */}
                      {!isLast && (
                        <div
                          className="absolute w-px"
                          style={{
                            left: 17,
                            top: 36,
                            bottom: 0,
                            background: 'var(--border)',
                          }}
                        />
                      )}

                      {/* Icon circle */}
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 z-10"
                        style={{ background: cfg.bg }}
                      >
                        <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pb-5">
                        <p className="text-[13px] font-semibold leading-snug" style={{ color: 'var(--text)' }}>
                          {actionLabel(item.action)}
                        </p>
                        {line1 && (
                          <p className="text-[12px] mt-0.5" style={{ color: 'var(--text2)' }}>{line1}</p>
                        )}
                        <p className="text-[11px] mt-0.5" style={{ color: 'var(--text3)' }}>
                          {[line2, time].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {items.length < total && (
            <div className="flex justify-end">
              <button
                onClick={loadMore}
                disabled={loading}
                className="px-5 py-2 rounded-full text-[13px] border disabled:opacity-50 transition-colors"
                style={{ borderColor: 'var(--border2)', color: 'var(--text2)', background: 'var(--surface)' }}
              >
                {loading ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
