export interface CardDrawInput {
  cardName: string;
  cardId?: number;
  question?: string;
}

export interface CardDrawResult {
  interpretation: string;
  provider: 'mock' | 'coze';
}

export interface DailyInsightInput {
  date: string;
  cardName: string;
}

const SIXTY_JIAZI: readonly string[] = [
  '甲子','乙丑','丙寅','丁卯','戊辰','己巳','庚午','辛未','壬申','癸酉',
  '甲戌','乙亥','丙子','丁丑','戊寅','己卯','庚辰','辛巳','壬午','癸未',
  '甲申','乙酉','丙戌','丁亥','戊子','己丑','庚寅','辛卯','壬辰','癸巳',
  '甲午','乙未','丙申','丁酉','戊戌','己亥','庚子','辛丑','壬寅','癸卯',
  '甲辰','乙巳','丙午','丁未','戊申','己酉','庚戌','辛亥','壬子','癸丑',
  '甲寅','乙卯','丙辰','丁巳','戊午','己未','庚申','辛酉','壬戌','癸亥',
];

export function cardNameToId(name: string): number {
  const idx = SIXTY_JIAZI.indexOf(name);
  return idx >= 0 ? idx + 1 : 1;
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

// Lazy singleton — invalidated when app-config changes
let _adapter: AiAdapter | null = null;

export function invalidateAiAdapter(): void {
  _adapter = null;
}

export async function getAiAdapter(): Promise<AiAdapter> {
  if (!_adapter) {
    // Prefer DB config, fall back to env var
    let provider: string;
    try {
      const { appConfigService } = await import('../../services/app-config.service');
      const raw = await appConfigService.getAiConfigRaw();
      provider = raw.provider;
    } catch {
      provider = process.env.AI_PROVIDER ?? 'mock';
    }

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
