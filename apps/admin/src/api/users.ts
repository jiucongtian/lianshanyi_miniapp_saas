import { get, patch, post, del } from './client'

export interface AdminUser {
  _id: string
  username?: string
  phone?: string
  nickname?: string
  avatarUrl?: string
  userType: 'guest' | 'normal' | 'student' | 'premium'
  tenantId: { _id: string; name: string; slug: string } | string
  isGuest: boolean
  isAdmin: boolean
  lastLoginAt?: string
  createdAt: string
}

export interface CreateUserPayload {
  tenantId: string
  username: string
  phone?: string
  password: string
  userType?: AdminUser['userType']
}

export const usersApi = {
  list: (params?: Record<string, unknown>) =>
    get<{ users: AdminUser[]; meta: { total: number; page: number; limit: number } }>('/v1/admin/users', params),
  create: (payload: CreateUserPayload) => post<AdminUser>('/v1/admin/users', payload),
  delete: (userId: string) => del<null>(`/v1/admin/users/${userId}`),
  updateType: (userId: string, userType: AdminUser['userType']) =>
    patch<AdminUser>(`/v1/admin/users/${userId}/type`, { userType }),
}
