import api from './client'
import { Jar, JarContribution } from '../types'

export const jarsApi = {
  list: (include_archived = false) =>
    api.get<Jar[]>('/jars', { params: { include_archived } }),
  create: (data: { name: string; description?: string; target_amount?: string; color?: string }) =>
    api.post<Jar>('/jars', data),
  update: (id: string, data: { name?: string; description?: string; target_amount?: string; color?: string }) =>
    api.put<Jar>(`/jars/${id}`, data),
  archive: (id: string) => api.delete(`/jars/${id}`),

  listContributions: (jarId: string) =>
    api.get<JarContribution[]>(`/jars/${jarId}/contributions`),
  addContribution: (jarId: string, data: { bank_id?: string; amount: string; date: string; notes?: string }) =>
    api.post<JarContribution>(`/jars/${jarId}/contributions`, data),
  deleteContribution: (jarId: string, contributionId: string) =>
    api.delete(`/jars/${jarId}/contributions/${contributionId}`),
}
