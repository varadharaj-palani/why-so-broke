import api from './client'
import { ImportJob, UnverifiedListResponse, UnverifiedTransaction } from '../types'

export const importsApi = {
  upload: (file: File, bankHint?: string) => {
    const form = new FormData()
    form.append('file', file)
    if (bankHint) form.append('bank_hint', bankHint)
    return api.post<{ import_job_id: string; status: string }>('/imports/upload', form)
  },
  list: () => api.get<ImportJob[]>('/imports'),
  get: (id: string) => api.get<ImportJob>(`/imports/${id}`),
}

export const unverifiedApi = {
  list: (params?: { import_job_id?: string; status?: string; page?: number; per_page?: number }) =>
    api.get<UnverifiedListResponse>('/unverified', { params }),
  update: (id: string, data: Partial<UnverifiedTransaction>) => api.put<UnverifiedTransaction>(`/unverified/${id}`, data),
  verify: (id: string) => api.post(`/unverified/${id}/verify`),
  reject: (id: string) => api.post(`/unverified/${id}/reject`),
  bulkVerify: (ids: string[]) => api.post('/unverified/bulk-verify', { ids }),
  bulkReject: (ids: string[]) => api.post('/unverified/bulk-reject', { ids }),
}
