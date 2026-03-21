import { useState, useEffect } from 'react'
import { formatDateTime } from '../../utils/formatters'
import api from '../../api/client'
import dayjs from 'dayjs'

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

function groupByDay(items: ActivityItem[]) {
  const groups: { date: string; items: ActivityItem[] }[] = []
  for (const item of items) {
    const date = dayjs(item.created_at).format('DD MMM YYYY')
    const existing = groups.find(g => g.date === date)
    if (existing) {
      existing.items.push(item)
    } else {
      groups.push({ date, items: [item] })
    }
  }
  return groups
}

function actionLabel(action: string): string {
  return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

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
      <h3 className="text-[15px] font-medium mb-4" style={{ color: 'var(--text)' }}>Activity log</h3>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-1.5 mb-5">
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
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'var(--border)' }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-10 text-center rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <p className="text-[13px]" style={{ color: 'var(--text3)' }}>No activity found.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map(group => (
            <div key={group.date}>
              <p className="text-[11px] font-medium mb-2 uppercase tracking-wide" style={{ color: 'var(--text3)' }}>
                {group.date}
              </p>
              <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                {group.items.map((item, i) => (
                  <div
                    key={item.id}
                    className="px-4 py-3 flex items-start gap-3"
                    style={{ borderBottom: i < group.items.length - 1 ? '0.5px solid var(--border)' : 'none' }}
                  >
                    {/* Timeline dot */}
                    <div className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--green)' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>
                        {actionLabel(item.action)}
                      </p>
                      {item.details && Object.keys(item.details).length > 0 && (
                        <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text3)' }}>
                          {Object.entries(item.details)
                            .slice(0, 2)
                            .map(([k, v]) => `${k}: ${String(v)}`)
                            .join(' · ')}
                        </p>
                      )}
                    </div>
                    <p className="text-[11px] shrink-0" style={{ color: 'var(--text3)' }}>
                      {formatDateTime(item.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {items.length < total && (
            <button
              onClick={loadMore}
              disabled={loading}
              className="w-full py-2 rounded-md text-[13px] border disabled:opacity-50"
              style={{ borderColor: 'var(--border2)', color: 'var(--text2)', background: 'var(--surface)' }}
            >
              {loading ? 'Loading…' : `Load more (${total - items.length} remaining)`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
