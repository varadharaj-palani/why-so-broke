import { useState, useEffect } from 'react'
import { useAnalytics } from '../hooks/useAnalytics'
import { useFilterStore } from '../store/filterStore'
import { analyticsApi } from '../api/analytics'
import { formatAmount } from '../utils/formatters'
import { getCategoryColor } from '../utils/constants'
import { DailySpendItem } from '../types'
import dayjs from 'dayjs'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

type Range = 'month' | '3months' | 'year' | 'all'

function getRangeDates(range: Range): { date_from?: string; date_to?: string } {
  const today = dayjs()
  if (range === 'month') return {
    date_from: today.startOf('month').format('YYYY-MM-DD'),
    date_to: today.format('YYYY-MM-DD'),
  }
  if (range === '3months') return {
    date_from: today.subtract(90, 'day').format('YYYY-MM-DD'),
    date_to: today.format('YYYY-MM-DD'),
  }
  if (range === 'year') return {
    date_from: today.startOf('year').format('YYYY-MM-DD'),
    date_to: today.format('YYYY-MM-DD'),
  }
  return {}
}

const RANGES: { key: Range; label: string }[] = [
  { key: 'month', label: 'This month' },
  { key: '3months', label: '3 months' },
  { key: 'year', label: 'This year' },
  { key: 'all', label: 'All time' },
]

const fmtAxis = (v: number) => {
  if (v >= 100000) return `₹${(v / 100000).toFixed(1).replace(/\.0$/, '')}L`
  if (v >= 1000)   return `₹${(v / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return `₹${Math.round(v)}`
}

export default function DashboardPage() {
  const [range, setRange] = useState<Range>('month')
  const { setFilters } = useFilterStore()
  const trendMonths = range === 'month' ? 1 : range === '3months' ? 3 : range === 'year' ? 12 : 24
  const { summary, byCategory, trend, byMode, loading } = useAnalytics(trendMonths)
  const [dailySpend, setDailySpend] = useState<DailySpendItem[]>([])
  const [dailyLoading, setDailyLoading] = useState(false)
  const [stale, setStale] = useState(false)

  const rangeDates = getRangeDates(range)

  useEffect(() => {
    setStale(true)
    setDailyLoading(true)
    const dates = getRangeDates(range)
    setFilters(dates)
    const from = dates.date_from || dayjs().subtract(2, 'year').format('YYYY-MM-DD')
    const to = dates.date_to || dayjs().format('YYYY-MM-DD')
    analyticsApi.dailySpend(from, to)
      .then(r => setDailySpend(r.data))
      .catch(() => {})
      .finally(() => setDailyLoading(false))
  }, [range])

  // Clear stale once analytics finishes (accounts for 300ms debounce in useAnalytics)
  useEffect(() => {
    if (!loading) setStale(false)
  }, [loading])

  const isTransitioning = stale || loading || dailyLoading

  const netValue = parseFloat(summary?.net || '0')
  const isDeficit = netValue < 0

  const categoryData = byCategory.map(c => ({ ...c, total: parseFloat(c.total) }))
  const trendData = trend.map(t => ({ ...t, income: parseFloat(t.income), expense: parseFloat(t.expense) }))

  // Full date range for daily bar chart: day 1 of month → today, zeroing missing days
  const dailyBarData = (() => {
    const spendMap = new Map(dailySpend.map(d => [d.date, parseFloat(d.total)]))
    const from = dayjs().startOf('month')
    const to = dayjs()
    const result: { day: string; total: number }[] = []
    let cur = from
    while (!cur.isAfter(to)) {
      result.push({ day: cur.format('D'), total: spendMap.get(cur.format('YYYY-MM-DD')) ?? 0 })
      cur = cur.add(1, 'day')
    }
    return result
  })()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-[20px] font-medium" style={{ color: 'var(--text)' }}>Dashboard</h2>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--text3)' }}>Your financial overview</p>
        </div>
        <div className="flex gap-1 p-1 rounded-full border self-start" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
          {RANGES.map(r => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className="px-2.5 py-1.5 rounded-full text-[11px] sm:text-[12px] sm:px-3 transition-all whitespace-nowrap"
              style={range === r.key
                ? { background: 'var(--surface)', color: 'var(--green)', fontWeight: 500, border: '0.5px solid var(--border)' }
                : { color: 'var(--text2)', border: '0.5px solid transparent' }
              }
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* All data sections fade together on filter change */}
      <div style={{ opacity: isTransitioning ? 0.45 : 1, transition: 'opacity 0.25s ease' }}>

      {/* Summary — mobile: compact single card with 3 rows */}
      {loading && !summary ? (
        <div className="sm:hidden h-[132px] rounded-xl animate-pulse" style={{ background: 'var(--border)' }} />
      ) : summary && (
        <div className="sm:hidden rounded-xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.4px]" style={{ color: 'var(--text3)' }}>Income</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text4)' }}>{summary.transaction_count} transactions</p>
            </div>
            <p className="text-[17px] font-semibold" style={{ color: 'var(--green)' }}>{formatAmount(summary.total_income)}</p>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <p className="text-[11px] font-medium uppercase tracking-[0.4px]" style={{ color: 'var(--text3)' }}>Expenses</p>
            <p className="text-[17px] font-semibold" style={{ color: 'var(--text)' }}>{formatAmount(summary.total_expense)}</p>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.4px]" style={{ color: 'var(--text3)' }}>Net balance</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text4)' }}>{isDeficit ? 'Deficit this period' : 'Surplus this period'}</p>
            </div>
            <p className="text-[17px] font-semibold" style={{ color: isDeficit ? 'var(--amber)' : 'var(--green)' }}>{formatAmount(summary.net)}</p>
          </div>
        </div>
      )}

      {/* Summary — desktop: 3 accent cards */}
      {loading && !summary ? (
        <div className="hidden sm:grid sm:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--border)' }} />
          ))}
        </div>
      ) : summary && (
        <div className="hidden sm:grid sm:grid-cols-3 gap-3">
          <StatCard label="Income" value={summary.total_income} sub={`${summary.transaction_count} transactions`} accent="green" />
          <StatCard label="Expenses" value={summary.total_expense} sub="" accent="default" />
          <StatCard
            label="Net balance"
            value={summary.net}
            sub={isDeficit ? 'Deficit this period' : 'Surplus this period'}
            accent={isDeficit ? 'amber' : 'green'}
          />
        </div>
      )}

      {/* Charts — row 1: category (2/3) + mode (1/3) */}
      <div className="grid md:grid-cols-3 gap-5">
        <ChartCard title="Spend by category" className="md:col-span-2">
          {categoryData.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text3)' }} tickFormatter={fmtAxis} />
                <YAxis
                  dataKey="category"
                  type="category"
                  tick={{ fontSize: 10, fill: 'var(--text3)' }}
                  width={95}
                  interval={0}
                />
                <Tooltip
                  cursor={false}
                  formatter={(v: number) => formatAmount(v)}
                  contentStyle={{ fontSize: 11, background: 'var(--surface)', borderColor: 'var(--border)' }}
                />
                <Bar dataKey="total" radius={[0, 3, 3, 0]} isAnimationActive={false}>
                  {categoryData.map(entry => (
                    <Cell key={entry.category} fill={getCategoryColor(entry.category)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="By payment mode">
          {byMode.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={byMode.map(m => ({ ...m, total: parseFloat(m.total) }))}
                  dataKey="total"
                  nameKey="mode"
                  cx="50%"
                  cy="45%"
                  innerRadius={40}
                  outerRadius={65}
                  isAnimationActive={false}
                >
                  {byMode.map((entry) => (
                    <Cell key={entry.mode} fill={getCategoryColor(entry.mode)} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => formatAmount(v)}
                  contentStyle={{ fontSize: 11, background: 'var(--surface)', borderColor: 'var(--border)' }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, color: 'var(--text3)' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Charts — row 2: trend (1/3) + heatmap (2/3) */}
      <div className="grid md:grid-cols-3 gap-5">
        <ChartCard title={range === 'month' ? 'Daily spending' : 'Monthly trend'}>
          {range === 'month' ? (
            dailyBarData.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dailyBarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text3)' }} interval={1} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text3)' }} tickFormatter={fmtAxis} width={40} />
                  <Tooltip
                    cursor={false}
                    formatter={(v: number) => formatAmount(v)}
                    contentStyle={{ fontSize: 11, background: 'var(--surface)', borderColor: 'var(--border)' }}
                  />
                  <Bar dataKey="total" fill="var(--amber)" name="Spend" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            )
          ) : (
            trendData.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text3)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text3)' }} tickFormatter={fmtAxis} width={40} />
                  <Tooltip
                    cursor={false}
                    formatter={(v: number) => formatAmount(v)}
                    contentStyle={{ fontSize: 11, background: 'var(--surface)', borderColor: 'var(--border)' }}
                  />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="income" fill="var(--green)" name="Income" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="expense" fill="var(--amber)" name="Expense" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            )
          )}
        </ChartCard>

        <ChartCard title="Daily spend pattern" className="md:col-span-2">
          <SpendHeatmap
            data={dailySpend}
            dateFrom={rangeDates.date_from}
            dateTo={rangeDates.date_to}
          />
        </ChartCard>
      </div>

      </div>{/* end fade wrapper */}
    </div>
  )
}

// ── Heatmap ───────────────────────────────────────────────────────────────────

function SpendHeatmap({
  data,
  dateFrom,
  dateTo,
}: {
  data: DailySpendItem[]
  dateFrom?: string
  dateTo?: string
}) {
  if (!data.length) return <EmptyChart />

  const dateMap = new Map(data.map(d => [d.date, parseFloat(d.total)]))
  const max = Math.max(...[...dateMap.values()], 1)

  // Use filter range boundaries so month labels are accurate,
  // falling back to data bounds for "all time"
  const start = dayjs(dateFrom || data[0].date).startOf('week')
  const end   = dayjs(dateTo   || data[data.length - 1].date)

  const weeks: string[][] = []
  let cur = start
  while (!cur.isAfter(end)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => cur.add(i, 'day').format('YYYY-MM-DD')))
    cur = cur.add(7, 'day')
  }

  const cellColor = (amount: number) => {
    if (amount === 0) return 'color-mix(in srgb, var(--border) 80%, var(--bg))'
    const t = amount / max
    if (t < 0.25) return 'color-mix(in srgb, var(--green) 20%, var(--bg))'
    if (t < 0.5)  return 'color-mix(in srgb, var(--green) 45%, var(--bg))'
    if (t < 0.75) return 'color-mix(in srgb, var(--green) 70%, var(--bg))'
    return 'var(--green)'
  }

  const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  // First week index per calendar month (year×12+month key)
  const labelWeekIndices = new Set<number>()
  const seenMonths = new Set<number>()
  weeks.forEach((week, wi) => {
    const monthKey = dayjs(week[0]).year() * 12 + dayjs(week[0]).month()
    if (!seenMonths.has(monthKey)) {
      seenMonths.add(monthKey)
      labelWeekIndices.add(wi)
    }
  })

  return (
    <div className="flex gap-[4px] overflow-x-auto pb-1">
      {/* Day-of-week labels */}
      <div className="flex flex-col gap-[4px] pt-6 shrink-0">
        {DAY_LABELS.map((d, i) => (
          <div key={i} className="h-[16px] text-[9px] leading-none w-3 text-right" style={{ color: 'var(--text4)' }}>{d}</div>
        ))}
      </div>
      {/* Week columns */}
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-[4px] shrink-0">
          <div className="text-[9px] leading-none h-5 flex items-end justify-center" style={{ color: 'var(--text4)' }}>
            {labelWeekIndices.has(wi) ? dayjs(week[0]).format('MMM') : ''}
          </div>
          {week.map(date => {
            const amount = dateMap.get(date) ?? 0
            return (
              <div
                key={date}
                title={`${dayjs(date).format('DD MMM')}: ${amount > 0 ? formatAmount(amount) : 'No spend'}`}
                className="w-[16px] h-[16px] rounded-[3px] cursor-default"
                style={{ background: cellColor(amount) }}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ── Shared components ─────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: 'green' | 'amber' | 'default' }) {
  const borderColor = accent === 'green' ? 'var(--green)' : accent === 'amber' ? 'var(--amber)' : 'transparent'
  const textColor = accent === 'green' ? 'var(--green)' : accent === 'amber' ? 'var(--amber)' : 'var(--text)'
  return (
    <div
      className="rounded-xl p-3 sm:p-4 border-l-4"
      style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderLeft: `4px solid ${borderColor}` }}
    >
      <p className="text-[10px] uppercase tracking-[0.5px] font-medium mb-1.5" style={{ color: 'var(--text3)' }}>{label}</p>
      <p className="text-[17px] sm:text-[22px] font-medium" style={{ color: textColor }}>{formatAmount(value)}</p>
      {sub && <p className="text-[11px] mt-1" style={{ color: 'var(--text4)' }}>{sub}</p>}
    </div>
  )
}

function ChartCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl p-4 border ${className}`} style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <p className="text-[11px] uppercase tracking-[0.5px] font-medium mb-3.5" style={{ color: 'var(--text3)' }}>{title}</p>
      {children}
    </div>
  )
}

function EmptyChart() {
  return <p className="text-[12px] text-center py-8" style={{ color: 'var(--text4)' }}>No data</p>
}
