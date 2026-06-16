import { get, patch } from './client'

export interface Account {
  _id: string
  name: string
  status: 'trial' | 'active' | 'suspended'
  limits: { maxUsers: number; aiCallsPerDay: number }
  ipWhitelist: string[]
  createdAt: string
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
  update: (id: string, payload: UpdateAccountPayload) => patch<Account>(`/v1/admin/accounts/${id}`, payload),
}
