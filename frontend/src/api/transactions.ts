import api from './client'
import { Transaction, TransactionListResponse, Filters } from '../types'

export const transactionsApi = {
  list: (filters: Filters & { page?: number; per_page?: number }) =>
    api.get<TransactionListResponse>('/transactions', { params: filters }),
  create: (data: Partial<Transaction> & { date: string; type: string; description: string; category: string; amount: string; mode: string }) =>
    api.post<Transaction>('/transactions', data),
  update: (id: string, data: Partial<Transaction>) =>
    api.put<Transaction>(`/transactions/${id}`, data),
  delete: (id: string) => api.delete(`/transactions/${id}`),
}
