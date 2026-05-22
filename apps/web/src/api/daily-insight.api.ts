import apiClient from './client'
import type { ApiResponse, DailyInsight } from '@/types'

export function getTodayInsight() {
  return apiClient.get<ApiResponse<DailyInsight>>('/daily-insight/today')
}

export function getInsightByDate(date: string) {
  return apiClient.get<ApiResponse<DailyInsight>>(`/daily-insight/${date}`)
}
