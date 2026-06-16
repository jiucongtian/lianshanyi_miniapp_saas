import { get, post, patch } from './client'

export interface Credential {
  appId: string
  tenantId: string
  remark?: string
  scopes: string[]
  status: 'active' | 'disabled'
  rateLimit: number
  createdAt: string
}

export interface CreateCredentialPayload {
  tenantId: string
  remark?: string
  scopes?: string[]
  rateLimit?: number
}

export interface CreateCredentialResult extends Credential {
  appSecret: string
}

export interface UpdateCredentialPayload {
  remark?: string
  scopes?: string[]
  rateLimit?: number
}

export const credentialsApi = {
  list: (params?: Record<string, unknown>) => get<{ credentials: Credential[]; meta: { total: number; page: number; limit: number } }>('/v1/admin/credentials', params),
  get: (appId: string) => get<Credential>(`/v1/admin/credentials/${appId}`),
  create: (payload: CreateCredentialPayload) => post<CreateCredentialResult>('/v1/admin/credentials', payload),
  update: (appId: string, payload: UpdateCredentialPayload) => patch<Credential>(`/v1/admin/credentials/${appId}`, payload),
  rotateSecret: (appId: string) => post<{ appSecret: string }>(`/v1/admin/credentials/${appId}/rotate-secret`),
  setStatus: (appId: string, status: 'active' | 'disabled') => patch<Credential>(`/v1/admin/credentials/${appId}/status`, { status }),
}
