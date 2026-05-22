import apiClient from './client'
import type { ApiResponse, Feedback } from '@/types'

export interface FeedbackFormData {
  content: string
  contactInfo?: string
  category?: string
}

export function submitFeedback(data: FeedbackFormData) {
  return apiClient.post<ApiResponse<Feedback>>('/feedbacks', data)
}

export function listFeedbacks(page = 1, limit = 20, status?: string) {
  return apiClient.get<ApiResponse<{ feedbacks: Feedback[]; total: number }>>('/feedbacks', {
    params: { page, limit, ...(status ? { status } : {}) },
  })
}

export function replyFeedback(id: string, reply: string) {
  return apiClient.post<ApiResponse<Feedback>>(`/feedbacks/${id}/reply`, { reply })
}
