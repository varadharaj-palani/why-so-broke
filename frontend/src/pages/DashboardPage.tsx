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

  const rangeDates = getRangeDates(range)

  useEffect(() => {
    setFilters(rangeDates)
    const from = rangeDates.date_from || dayjs().subtract(2, 'year').format('YYYY-MM-DD')
    const to = rangeDates.date_to || dayjs().format('YYYY-MM-DD')
    analyticsApi.dailySpend(from, to)
      .then(r => setDailySpend(r.data))
      .catch(() => {})
  }, [range])

  const netValue = parseFloat(summary?.net || '0')
  const isDeficit = netValue < 0

  const categoryData = byCategory.map(c => ({ ...c, total: parseFloat(c.total) }))
  const trendData = trend.map(t => ({ ...t, income: parseFloat(t.income), expense: parseFloat(t.expense) }))

  // dynamic height for category chart based on number of categories
  const categoryChartHeight = Math.max(160, categoryData.length * 32)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-medium" style={{ color: 'var(--text)' }}>Dashboard</h2>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--text3)' }}>Your financial overview</p>
        </div>
        <div className="flex gap-1 p-1 rounded-full border" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
          {RANGES.map(r => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className="px-3 py-1.5 rounded-full text-[12px] transition-all whitespace-nowrap"
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

      {/* Summary cards */}
      {loading && !summary ? (
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--border)' }} />
          ))}
        </div>
      ) : summary && (
        <div className="grid grid-cols-3 gap-3">
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
      <div className="grid md:grid-cols-3 gap-3">
        <ChartCard title="Spend by category" className="md:col-span-2">
          {categoryData.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={categoryChartHeight}>
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
                <Bar dataKey="total" radius={[0, 3, 3, 0]} animationDuration={300}>
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
            <ResponsiveContainer width="100%" height={categoryChartHeight}>
              <PieChart>
                <Pie
                  data={byMode.map(m => ({ ...m, total: parseFloat(m.total) }))}
                  dataKey="total"
                  nameKey="mode"
                  cx="50%"
                  cy="45%"
                  innerRadius={40}
                  outerRadius={65}
                  animationDuration={300}
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
      <div className="grid md:grid-cols-3 gap-3">
        <ChartCard title={range === 'month' ? 'Daily spending' : 'Monthly trend'}>
          {range === 'month' ? (
            dailySpend.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={dailySpend.map(d => ({ day: dayjs(d.date).format('D'), total: parseFloat(d.total) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text3)' }} interval={1} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text3)' }} tickFormatter={fmtAxis} width={40} />
                  <Tooltip
                    cursor={false}
                    formatter={(v: number) => formatAmount(v)}
                    contentStyle={{ fontSize: 11, background: 'var(--surface)', borderColor: 'var(--border)' }}
                  />
                  <Bar dataKey="total" fill="var(--amber)" name="Spend" radius={[3, 3, 0, 0]} animationDuration={300} />
                </BarChart>
              </ResponsiveContainer>
            )
          ) : (
            trendData.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={180}>
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
                  <Bar dataKey="income" fill="var(--green)" name="Income" radius={[3, 3, 0, 0]} animationDuration={300} />
                  <Bar dataKey="expense" fill="var(--amber)" name="Expense" radius={[3, 3, 0, 0]} animationDuration={300} />
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
    if (amount === 0) return 'var(--bg)'
    const t = amount / max
    if (t < 0.25) return 'color-mix(in srgb, var(--green) 20%, var(--bg))'
    if (t < 0.5)  return 'color-mix(in srgb, var(--green) 45%, var(--bg))'
    if (t < 0.75) return 'color-mix(in srgb, var(--green) 70%, var(--bg))'
    return 'var(--green)'
  }

  const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  // Show month label on the first week column that contains a day in that month,
  // not just on the week containing the 1st — avoids missing months.
  const monthLabels = new Map<number, string>()
  weeks.forEach((week, wi) => {
    const firstDay = dayjs(week[0])
    const monthKey = firstDay.month()
    if (!monthLabels.has(monthKey)) {
      monthLabels.set(monthKey, wi.toString())
    }
    // also track year+month to handle multi-year ranges
    const key = firstDay.year() * 12 + firstDay.month()
    if (!monthLabels.has(key)) {
      monthLabels.set(key, wi.toString())
    }
  })

  // Build a set of week indices that should show a month label
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
    <div className="flex gap-1 overflow-x-auto pb-1">
      {/* Day-of-week labels */}
      <div className="flex flex-col gap-[3px] pt-5 shrink-0">
        {DAY_LABELS.map((d, i) => (
          <div key={i} className="h-[13px] text-[8px] leading-none w-3 text-right" style={{ color: 'var(--text4)' }}>{d}</div>
        ))}
      </div>
      {/* Week columns */}
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-[3px] shrink-0">
          <div className="text-[8px] leading-none h-4 flex items-end justify-center" style={{ color: 'var(--text4)' }}>
            {labelWeekIndices.has(wi) ? dayjs(week[0]).format('MMM') : ''}
          </div>
          {week.map(date => {
            const amount = dateMap.get(date) ?? 0
            return (
              <div
                key={date}
                title={`${dayjs(date).format('DD MMM')}: ${amount > 0 ? formatAmount(amount) : 'No spend'}`}
                className="w-[13px] h-[13px] rounded-[2px] cursor-default"
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
      className="rounded-xl p-4 border-l-4"
      style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderLeft: `4px solid ${borderColor}` }}
    >
      <p className="text-[10px] uppercase tracking-[0.5px] font-medium mb-1.5" style={{ color: 'var(--text3)' }}>{label}</p>
      <p className="text-[22px] font-medium" style={{ color: textColor }}>{formatAmount(value)}</p>
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
