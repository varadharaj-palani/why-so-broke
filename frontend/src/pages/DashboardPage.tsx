import { useState, useEffect } from 'react'
import { useAnalytics } from '../hooks/useAnalytics'
import { useFilterStore } from '../store/filterStore'
import { analyticsApi } from '../api/analytics'
import { formatAmount } from '../utils/formatters'
import { getCategoryColor } from '../utils/constants'
import { DailySpendItem } from '../types'
import dayjs from 'dayjs'
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
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

export default function DashboardPage() {
  const [range, setRange] = useState<Range>('month')
  const { setFilters } = useFilterStore()
  const { summary, byCategory, trend, byMode, loading } = useAnalytics()
  const [dailySpend, setDailySpend] = useState<DailySpendItem[]>([])

  useEffect(() => {
    const dates = getRangeDates(range)
    setFilters(dates)

    const from = dates.date_from || dayjs().startOf('year').format('YYYY-MM-DD')
    const to = dates.date_to || dayjs().format('YYYY-MM-DD')
    analyticsApi.dailySpend(from, to)
      .then(r => setDailySpend(r.data))
      .catch(() => {})
  }, [range])

  function handleRange(r: Range) {
    setRange(r)
  }

  const netValue = parseFloat(summary?.net || '0')
  const isDeficit = netValue < 0

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
              onClick={() => handleRange(r.key)}
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

      {/* Charts 2×2 */}
      <div className="grid md:grid-cols-2 gap-3">
        <ChartCard title="Spend by category">
          {byCategory.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={byCategory} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text3)' }} tickFormatter={v => `₹${(+v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="category" type="category" tick={{ fontSize: 10, fill: 'var(--text3)' }} width={80} />
                <Tooltip formatter={(v: number) => formatAmount(v)} contentStyle={{ fontSize: 11, background: 'var(--surface)', borderColor: 'var(--border)' }} />
                <Bar dataKey="total" radius={[0, 3, 3, 0]} animationDuration={300}>
                  {byCategory.map(entry => (
                    <Cell key={entry.category} fill={getCategoryColor(entry.category)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Monthly trend">
          {trend.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text3)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text3)' }} tickFormatter={v => `₹${(+v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatAmount(v)} contentStyle={{ fontSize: 11, background: 'var(--surface)', borderColor: 'var(--border)' }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="income" fill="var(--green)" name="Income" radius={[3, 3, 0, 0]} animationDuration={300} />
                <Bar dataKey="expense" fill="var(--amber)" name="Expense" radius={[3, 3, 0, 0]} animationDuration={300} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="By payment mode">
          {byMode.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={130}>
              <PieChart>
                <Pie data={byMode.map(m => ({ ...m, total: parseFloat(m.total) }))} dataKey="total" nameKey="mode" cx="50%" cy="50%" innerRadius={35} outerRadius={55} animationDuration={300}>
                  {byMode.map((entry, i) => (
                    <Cell key={entry.mode} fill={getCategoryColor(entry.mode)} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatAmount(v)} contentStyle={{ fontSize: 11, background: 'var(--surface)', borderColor: 'var(--border)' }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, color: 'var(--text3)' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Daily spend pattern">
          {dailySpend.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={130}>
              <LineChart data={dailySpend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text3)' }} tickFormatter={d => dayjs(d).format('DD')} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text3)' }} tickFormatter={v => `₹${(+v / 1000).toFixed(0)}k`} />
                <Tooltip
                  labelFormatter={d => dayjs(d).format('DD MMM')}
                  formatter={(v: number) => formatAmount(v)}
                  contentStyle={{ fontSize: 11, background: 'var(--surface)', borderColor: 'var(--border)' }}
                />
                <Line type="monotone" dataKey="total" stroke="var(--green)" strokeWidth={1.5} dot={false} animationDuration={300} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  )
}

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

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <p className="text-[11px] uppercase tracking-[0.5px] font-medium mb-3.5" style={{ color: 'var(--text3)' }}>{title}</p>
      {children}
    </div>
  )
}

function EmptyChart() {
  return <p className="text-[12px] text-center py-8" style={{ color: 'var(--text4)' }}>No data</p>
}
