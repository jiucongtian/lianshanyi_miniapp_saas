import { get, put, post } from './client'

export interface AiConfig {
  provider: 'mock' | 'coze'
  cozeTokenMasked?: string
  cardDrawWorkflowId?: string
  dailyInsightWorkflowId?: string
  assistantBotId?: string
}

export interface UpdateAiConfigPayload {
  provider?: 'mock' | 'coze'
  cozeToken?: string
  cardDrawWorkflowId?: string
  dailyInsightWorkflowId?: string
  assistantBotId?: string
}

export const aiConfigApi = {
  get: () => get<AiConfig>('/v1/admin/ai-config'),
  update: (payload: UpdateAiConfigPayload) => put<AiConfig>('/v1/admin/ai-config', payload),
  test: () => post<{ ok: boolean; latencyMs: number }>('/v1/admin/ai-config/test'),
}
