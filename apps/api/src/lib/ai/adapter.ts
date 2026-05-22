export interface CardDrawInput {
  profileName: string;
  gender: string;
  baziSummary: string;
  question?: string;
  cardId: number;
  cardName: string;
}

export interface CardDrawResult {
  interpretation: string;
  provider: 'mock' | 'coze';
}

export interface DailyInsightInput {
  date: string;
  cardId: number;
  cardName: string;
  dayStem: string;
  dayBranch: string;
}

export interface DailyInsightResult {
  title: string;
  summary: string;
  fullText: string;
  luckyDirection?: string;
  luckyColor?: string;
  luckyNumber?: number;
  provider: 'mock' | 'coze';
}

export interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantChatInput {
  conversationId?: string;
  messages: AssistantMessage[];
  profileContext?: string;
}

export interface AssistantChatResult {
  conversationId: string;
  reply: string;
  provider: 'mock' | 'coze';
}

export interface AiAdapter {
  drawCard(input: CardDrawInput): Promise<CardDrawResult>;
  generateDailyInsight(input: DailyInsightInput): Promise<DailyInsightResult>;
  assistantChat(input: AssistantChatInput): Promise<AssistantChatResult>;
}

// Lazy singleton
let _adapter: AiAdapter | null = null;

export async function getAiAdapter(): Promise<AiAdapter> {
  if (!_adapter) {
    const provider = process.env.AI_PROVIDER ?? 'mock';
    if (provider === 'mock') {
      const { mockAiAdapter } = await import('./mock.adapter');
      _adapter = mockAiAdapter;
    } else if (provider === 'coze') {
      const { cozeAiAdapter } = await import('./coze.adapter');
      _adapter = cozeAiAdapter;
    } else {
      throw new Error(`Unknown AI provider: ${provider}`);
    }
  }
  return _adapter;
}
