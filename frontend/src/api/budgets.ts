import api from './client'
import { Budget, BudgetProgress } from '../types'

export const budgetsApi = {
  list: (month: string) => api.get<Budget[]>('/budgets', { params: { month } }),
  create: (data: { category: string; month: string; amount: string }) => api.post<Budget>('/budgets', data),
  update: (id: string, amount: string) => api.put<Budget>(`/budgets/${id}`, { amount }),
  delete: (id: string) => api.delete(`/budgets/${id}`),
  progress: (month: string) => api.get<BudgetProgress[]>('/budgets/progress', { params: { month } }),
  copyPrevious: (month: string) => api.post('/budgets/copy-previous', null, { params: { month } }),
}
