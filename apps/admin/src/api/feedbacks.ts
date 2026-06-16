import { get, post } from './client'

export interface Feedback {
  _id: string
  tenantId: string
  userId: string
  content: string
  status: 'pending' | 'reviewed'
  reply?: string
  createdAt: string
}

export const feedbacksApi = {
  list: (params?: Record<string, unknown>) => get<{ feedbacks: Feedback[]; meta: { total: number; page: number; limit: number } }>('/v1/admin/feedbacks', params),
  review: (tenantId: string, feedbackId: string, reply?: string) =>
    post<Feedback>(`/v1/admin/feedbacks/${tenantId}/${feedbackId}/review`, { reply }),
}
