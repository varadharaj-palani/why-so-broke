import api from './client'
import { Budget, BudgetProgress } from '../types'

export const budgetsApi = {
  list: (params: { start_date?: string; end_date?: string }) =>
    api.get<Budget[]>('/budgets', { params }),
  create: (data: { category: string; start_date: string; end_date: string; amount: string }) =>
    api.post<Budget>('/budgets', data),
  update: (id: string, data: { amount?: string; start_date?: string; end_date?: string }) =>
    api.put<Budget>(`/budgets/${id}`, data),
  delete: (id: string) => api.delete(`/budgets/${id}`),
  progress: (params: { start_date: string; end_date: string }) =>
    api.get<BudgetProgress[]>('/budgets/progress', { params }),
}
