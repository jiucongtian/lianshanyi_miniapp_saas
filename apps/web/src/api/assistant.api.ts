import apiClient from './client'
import type { ApiResponse, AssistantMessage } from '@/types'

export interface ChatParams {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  conversationId?: string
  profileId?: string
}

export interface ChatResponse {
  message: AssistantMessage
  conversationId: string
}

export function chat(
  messages: ChatParams['messages'],
  conversationId?: string,
  profileId?: string,
) {
  return apiClient.post<ApiResponse<ChatResponse>>('/assistant/chat', {
    messages,
    conversationId,
    profileId,
  })
}
