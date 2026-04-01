import api from './client'

export interface ModeItem {
  id: string
  name: string
  created_at: string
}

export const modesApi = {
  list: () => api.get<ModeItem[]>('/modes'),
  create: (name: string) => api.post<ModeItem>('/modes', { name }),
  update: (id: string, name: string) => api.put<ModeItem>(`/modes/${id}`, { name }),
  delete: (id: string) => api.delete(`/modes/${id}`),
}
