import api from './client'
import { User } from '../types'

export const authApi = {
  listUsers: () => api.get<{ username: string; display_name: string | null }[]>('/auth/users'),
  login: (username: string, pin: string) =>
    api.post<{ token: string; user: User }>('/auth/login', { username, pin }),
  register: (username: string, pin: string, display_name?: string) =>
    api.post<{ token: string; user: User }>('/auth/register', { username, pin, display_name }),
  me: () => api.get<User>('/auth/me'),
}
