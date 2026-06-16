import { get, patch } from './client'

export interface AdminUser {
  _id: string
  username?: string
  phone?: string
  userType: 'guest' | 'normal' | 'student' | 'premium'
  tenantId: string
  createdAt: string
}

export const usersApi = {
  list: (params?: Record<string, unknown>) => get<{ users: AdminUser[]; meta: { total: number; page: number; limit: number } }>('/v1/admin/users', params),
  updateType: (userId: string, userType: AdminUser['userType']) => patch<AdminUser>(`/v1/admin/users/${userId}/type`, { userType }),
}
