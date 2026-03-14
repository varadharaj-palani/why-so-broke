import { useState, useEffect, useCallback } from 'react'
import { analyticsApi } from '../api/analytics'
import { useFilterStore } from '../store/filterStore'
import { Summary, CategoryBreakdown, MonthlyTrendItem, ModeBreakdown } from '../types'

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export function useAnalytics() {
  const { filters } = useFilterStore()
  const debouncedFilters = useDebounce(filters, 300)

  const [summary, setSummary] = useState<Summary | null>(null)
  const [byCategory, setByCategory] = useState<CategoryBreakdown[]>([])
  const [trend, setTrend] = useState<MonthlyTrendItem[]>([])
  const [byMode, setByMode] = useState<ModeBreakdown[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const [s, c, t, m] = await Promise.all([
        analyticsApi.summary(debouncedFilters),
        analyticsApi.byCategory(debouncedFilters),
        analyticsApi.monthlyTrend(12),
        analyticsApi.byMode(debouncedFilters),
      ])
      setSummary(s.data)
      setByCategory(c.data)
      setTrend(t.data)
      setByMode(m.data)
    } catch (e) {
      // silently fail — charts just don't update
    } finally {
      setLoading(false)
    }
  }, [debouncedFilters])

  useEffect(() => { fetch() }, [fetch])

  return { summary, byCategory, trend, byMode, loading, refetch: fetch }
}
