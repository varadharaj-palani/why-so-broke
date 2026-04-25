import api from './client'
import { Bank, BankBalance } from '../types'

export const banksApi = {
  list: () => api.get<Bank[]>('/banks'),
  create: (data: { name: string; short_code?: string }) => api.post<Bank>('/banks', data),
  update: (id: string, data: { name?: string; short_code?: string; is_active?: boolean }) =>
    api.put<Bank>(`/banks/${id}`, data),
  archive: (id: string) => api.delete(`/banks/${id}`),
  balances: () => api.get<BankBalance[]>('/banks/balances'),
}
