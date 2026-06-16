import { get, post, patch } from './client'

export interface Credential {
  appId: string
  accountId: string
  name: string
  scopes: string[]
  status: 'active' | 'disabled'
  rateLimit?: { windowMs: number; max: number }
  createdAt: string
}

export interface CreateCredentialPayload {
  name: string
  accountId: string
  scopes: string[]
  rateLimit?: { windowMs: number; max: number }
}

export interface CreateCredentialResult extends Credential {
  appSecret: string
}

export interface UpdateCredentialPayload {
  name?: string
  scopes?: string[]
  rateLimit?: { windowMs: number; max: number }
}

export const credentialsApi = {
  list: (params?: Record<string, unknown>) => get<Credential[]>('/v1/admin/credentials', params),
  get: (appId: string) => get<Credential>(`/v1/admin/credentials/${appId}`),
  revealSecret: (appId: string) => get<{ appSecret: string }>(`/v1/admin/credentials/${appId}/secret`),
  create: (payload: CreateCredentialPayload) => post<CreateCredentialResult>('/v1/admin/credentials', payload),
  update: (appId: string, payload: UpdateCredentialPayload) => patch<Credential>(`/v1/admin/credentials/${appId}`, payload),
  rotateSecret: (appId: string) => post<{ appSecret: string }>(`/v1/admin/credentials/${appId}/rotate-secret`),
  setStatus: (appId: string, status: 'active' | 'disabled') => patch<Credential>(`/v1/admin/credentials/${appId}/status`, { status }),
}
