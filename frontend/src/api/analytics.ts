import api from './client'
import { Summary, CategoryBreakdown, MonthlyTrendItem, ModeBreakdown, DailySpendItem, Filters } from '../types'

export const analyticsApi = {
  summary: (filters: Filters) => api.get<Summary>('/analytics/summary', { params: filters }),
  byCategory: (filters: Filters) => api.get<CategoryBreakdown[]>('/analytics/by-category', { params: filters }),
  monthlyTrend: (months?: number) => api.get<MonthlyTrendItem[]>('/analytics/monthly-trend', { params: { months } }),
  byMode: (filters: Filters) => api.get<ModeBreakdown[]>('/analytics/by-mode', { params: filters }),
  dailySpend: (date_from: string, date_to: string) =>
    api.get<DailySpendItem[]>('/analytics/daily-spend', { params: { date_from, date_to } }),
}
