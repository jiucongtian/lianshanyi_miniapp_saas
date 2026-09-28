import { get, post, put } from './client'

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
  source?: 'live' | 'historical-inferred'
  retainedAfterExpiry?: boolean
}

export type PeriodPrices = Record<BillingProduct, number>

export interface BillingPeriodRevision {
  number: number
  pricesFen: PeriodPrices
  callCount: number
  amountFen: number
  historicalCount: number
  retainedCount: number
  skippedCount: number
  generatedAt: string
  generatedBy: string
}

export interface BillingPeriod {
  _id: string
  from: string
  to: string
  activeRevision: number
  revisions: BillingPeriodRevision[]
}

export interface BillingPeriodPreview {
  callCount: number
  amountFen: number
  historicalCount: number
  retainedCount: number
  skippedCount: number
  byProduct: Record<BillingProduct, { count: number; amountFen: number }>
  fingerprint: string
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
  period: (from: string, to: string) => get<BillingPeriod | null>('/v1/admin/billing/periods/current', { from, to }),
  previewPeriod: (from: string, to: string, pricesFen: PeriodPrices) =>
    post<BillingPeriodPreview>('/v1/admin/billing/periods/preview', { from, to, pricesFen }),
  generatePeriod: (from: string, to: string, pricesFen: PeriodPrices, expectedFingerprint: string) =>
    post<BillingPeriod>('/v1/admin/billing/periods/generate', { from, to, pricesFen, expectedFingerprint }),
  periodEntries: (id: string, params: Record<string, unknown>) =>
    get<{ items: BillingEntry[]; meta: { total: number; page: number; limit: number } }>(`/v1/admin/billing/periods/${id}/entries`, params),
  periodSummary: (id: string, params: Record<string, unknown>) =>
    get<BillingSummary[]>(`/v1/admin/billing/periods/${id}/summary`, params),
  periodStatement: (id: string, params: Record<string, unknown>) =>
    get<BillingStatement>(`/v1/admin/billing/periods/${id}/statement`, params),
}
