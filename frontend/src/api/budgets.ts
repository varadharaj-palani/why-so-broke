import api from './client'
import { Budget, BudgetProgress } from '../types'

export const budgetsApi = {
  list: (params?: { active_on?: string }) =>
    api.get<Budget[]>('/budgets', { params }),
  create: (data: { category: string; start_date: string; cycle_days: number; amount: string }) =>
    api.post<Budget>('/budgets', data),
  update: (id: string, data: { amount?: string; start_date?: string; cycle_days?: number }) =>
    api.put<Budget>(`/budgets/${id}`, data),
  delete: (id: string) => api.delete(`/budgets/${id}`),
  progress: () =>
    api.get<BudgetProgress[]>('/budgets/progress'),
}
