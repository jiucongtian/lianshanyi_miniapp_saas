import apiClient from './client'
import type { ApiResponse, StaticCard, DrawCardRecord } from '@/types'

export function listCards() {
  return apiClient.get<ApiResponse<StaticCard[]>>('/cards')
}

export function getCard(id: string) {
  return apiClient.get<ApiResponse<StaticCard>>(`/cards/${id}`)
}

export interface DrawCardParams {
  profileId?: string
  question?: string
}

export function drawCard(data?: DrawCardParams) {
  return apiClient.post<ApiResponse<DrawCardRecord>>('/cards/draw', data ?? {})
}

export function getDrawHistory(page = 1, limit = 20) {
  return apiClient.get<ApiResponse<DrawCardRecord[]>>('/cards/history', {
    params: { page, limit },
  })
}
