import { get } from './client'

export interface LogEntry {
  _id: string
  appId: string
  path: string
  method: string
  statusCode: number
  latencyMs: number
  createdAt: string
}

export interface UsageStat {
  _id: { appId: string; path: string }
  total: number
  success: number
  avgLatencyMs: number
}

export interface Overview {
  apiCalls: { total: number; last30d: number }
  cardDraws: { total: number; last30d: number }
  dailyInsights: { total: number; last30d: number }
}

export const dashboardApi = {
  logs: (params?: Record<string, unknown>) => get<{ logs: LogEntry[]; meta: { total: number; page: number; limit: number } }>('/v1/admin/logs', params),
  usage: (params?: Record<string, unknown>) => get<UsageStat[]>('/v1/admin/dashboard/usage', params),
  overview: () => get<Overview>('/v1/admin/dashboard/overview'),
}
