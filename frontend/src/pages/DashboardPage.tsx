import { useAnalytics } from '../hooks/useAnalytics'
import { useFilterStore } from '../store/filterStore'
import { formatAmount, currentMonth } from '../utils/formatters'
import { CATEGORY_COLORS } from '../utils/constants'
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{formatAmount(value)}</p>
    </div>
  )
}

export default function DashboardPage() {
  const { summary, byCategory, trend, byMode, loading } = useAnalytics()
  const { filters, setFilter } = useFilterStore()

  const month = filters.date_from?.slice(0, 7) || currentMonth()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
        <input
          type="month"
          value={month}
          onChange={(e) => {
            const m = e.target.value
            setFilter('date_from', m ? `${m}-01` : undefined)
            setFilter('date_to', m ? `${m}-31` : undefined)
          }}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* Summary cards */}
      {loading && !summary ? (
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : summary && (
        <div className="grid grid-cols-3 gap-3">
          <SummaryCard label="Income" value={summary.total_income} color="text-green-600" />
          <SummaryCard label="Expense" value={summary.total_expense} color="text-red-600" />
          <SummaryCard label="Net" value={summary.net} color={parseFloat(summary.net) >= 0 ? 'text-blue-600' : 'text-red-600'} />
        </div>
      )}

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Spend by category */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Spend by Category</h3>
          {byCategory.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={byCategory} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={80} animationDuration={300}>
                  {byCategory.map((entry) => (
                    <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category] || '#9ca3af'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatAmount(v)} />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Monthly trend */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Monthly Trend</h3>
          {trend.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatAmount(v)} />
                <Legend />
                <Bar dataKey="income" fill="#22c55e" name="Income" radius={[3,3,0,0]} animationDuration={300} />
                <Bar dataKey="expense" fill="#ef4444" name="Expense" radius={[3,3,0,0]} animationDuration={300} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Spend by mode */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Spend by Payment Mode</h3>
          {byMode.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byMode} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <YAxis dataKey="mode" type="category" tick={{ fontSize: 11 }} width={90} />
                <Tooltip formatter={(v: number) => formatAmount(v)} />
                <Bar dataKey="total" fill="#6366f1" name="Amount" radius={[0,3,3,0]} animationDuration={300} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
