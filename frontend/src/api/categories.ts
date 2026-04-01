import api from './client'

export interface CategoryItem {
  id: string
  name: string
  created_at: string
}

export const categoriesApi = {
  list: () => api.get<CategoryItem[]>('/categories'),
  create: (name: string) => api.post<CategoryItem>('/categories', { name }),
  update: (id: string, name: string) => api.put<CategoryItem>(`/categories/${id}`, { name }),
  delete: (id: string) => api.delete(`/categories/${id}`),
}
