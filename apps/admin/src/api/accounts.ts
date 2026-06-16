import { get, patch, post, del } from './client'

export interface Account {
  _id: string
  name: string
  slug: string
  type: 'tenant' | 'partner'
  status: 'trial' | 'active' | 'suspended'
  plan: 'trial' | 'basic' | 'pro'
  limits: { maxUsers: number; aiCallsPerDay: number }
  ipWhitelist: string[]
  createdAt: string
}

export interface CreateAccountPayload {
  name: string
  slug: string
  type: 'tenant' | 'partner'
  plan?: 'trial' | 'basic' | 'pro'
  limits?: { maxUsers?: number; aiCallsPerDay?: number }
}

export interface UpdateAccountPayload {
  name?: string
  status?: 'trial' | 'active' | 'suspended'
  limits?: { maxUsers?: number; aiCallsPerDay?: number }
  ipWhitelist?: string[]
}

export const accountsApi = {
  list: (params?: Record<string, unknown>) => get<{ accounts: Account[]; meta: { total: number; page: number; limit: number } }>('/v1/admin/accounts', params),
  get: (id: string) => get<Account>(`/v1/admin/accounts/${id}`),
  create: (payload: CreateAccountPayload) => post<Account>('/v1/admin/accounts', payload),
  update: (id: string, payload: UpdateAccountPayload) => patch<Account>(`/v1/admin/accounts/${id}`, payload),
  delete: (id: string) => del<null>(`/v1/admin/accounts/${id}`),
}
