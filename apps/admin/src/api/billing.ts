import { get, put } from './client'

export type BillingProduct = 'card-insight' | 'daily-insight' | 'tutor-chat'
export type BillingStatus = 'pending' | 'charged' | 'free' | 'unpriced' | 'failed'

export interface BillingRate {
  product: BillingProduct
  priceFen: number
  updatedAt: string
}

export interface BillingEntry {
  _id: string
  appId: string
  accountId: string
  accountName: string
  product: BillingProduct
  status: BillingStatus
  provider?: 'coze' | 'mock'
  priceFen?: number
  amountFen: number
  createdAt: string
  completedAt?: string
}

export interface BillingSummary {
  _id: BillingProduct
  total: number
  charged: number
  failed: number
  unpriced: number
  amountFen: number
}

export interface BillingStatement {
  summary: BillingSummary[]
  items: BillingEntry[]
  total: number
}

export const billingApi = {
  rates: () => get<BillingRate[]>('/v1/admin/billing/rates'),
  setRate: (product: BillingProduct, priceFen: number) =>
    put<BillingRate>(`/v1/admin/billing/rates/${product}`, { priceFen }),
  entries: (params: Record<string, unknown>) =>
    get<{ items: BillingEntry[]; meta: { total: number; page: number; limit: number } }>('/v1/admin/billing/entries', params),
  summary: (params: Record<string, unknown>) => get<BillingSummary[]>('/v1/admin/billing/summary', params),
  statement: (params: Record<string, unknown>) => get<BillingStatement>('/v1/admin/billing/statement', params),
}
