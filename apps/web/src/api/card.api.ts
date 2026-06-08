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
  // Coze AI can take 30-90s; use a longer timeout than the default 30s
  return apiClient.post<ApiResponse<DrawCardRecord>>('/cards/draw', data ?? {}, { timeout: 120_000 })
}

export interface InterpretCardParams {
  cardId: number
  question?: string
  profileId?: string
}

export function interpretCard(data: InterpretCardParams) {
  return apiClient.post<ApiResponse<DrawCardRecord>>('/cards/interpret', data, { timeout: 120_000 })
}

export function getDrawHistory(page = 1, limit = 20) {
  return apiClient.get<ApiResponse<DrawCardRecord[]>>('/cards/history', {
    params: { page, limit },
  })
}
