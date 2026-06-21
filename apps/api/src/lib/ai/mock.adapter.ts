import { randomUUID } from 'crypto';
import type {
  AiAdapter,
  CardDrawInput,
  CardDrawResult,
  DailyInsightInput,
  DailyInsightResult,
  AssistantChatInput,
  AssistantChatResult,
} from './adapter';
import { cardNameToId } from './adapter';

const MOCK_INTERPRETATIONS = [
  '本卦象征生机勃发，万物始生。此时宜积极进取，把握良机，凡事开拓创新，必有所成。',
  '此卦显示内外平衡之象，进退有度，静待时机。不宜冒进，守成为上，循序渐进方可大成。',
  '卦象示以坚韧之道，虽遇阻碍，当持之以恒。顺势而为，逆境中见机遇，终将化险为夷。',
  '水火既济，阴阳调和。当下局势趋于平稳，适合筹谋长远，奠定根基，蓄势而发。',
  '天地感应，上下相通。人际关系和谐，合作共赢之象。宜广结善缘，借力成事。',
];

const DIRECTIONS = ['东', '南', '西', '北', '东南', '西南', '东北', '西北'];
const COLORS = ['红色', '金色', '绿色', '蓝色', '白色', '紫色'];

export const mockAiAdapter: AiAdapter = {
  async drawCard(input: CardDrawInput): Promise<CardDrawResult> {
    await new Promise((r) => setTimeout(r, 200));
    const seed = input.cardId ?? input.cardName.charCodeAt(0);
    const idx = seed % MOCK_INTERPRETATIONS.length;
    const interpretation = `【${input.cardName}】—— ${MOCK_INTERPRETATIONS[idx]}${input.question ? `\n\n针对您的问题「${input.question}」：此卦提示您顺应自然规律，静待佳音。` : ''}`;
    return { interpretation, provider: 'mock' };
  },

  async generateDailyInsight(input: DailyInsightInput): Promise<DailyInsightResult> {
    await new Promise((r) => setTimeout(r, 100));
    const cardId = cardNameToId(input.cardName);
    const dayStem = input.cardName[0];
    const dayBranch = input.cardName[1];
    const dirIdx = cardId % DIRECTIONS.length;
    const colorIdx = (cardId + 2) % COLORS.length;
    return {
      title: `${input.date} · ${input.cardName} · ${dayStem}${dayBranch}日`,
      summary: `今日主卦「${input.cardName}」，${dayStem}${dayBranch}之气主导，宜谋定后动，守正出奇。`,
      fullText: `今日干支 ${dayStem}${dayBranch}，配合「${input.cardName}」之象，提示诸事宜稳中求进。晨间可进行冥想或规划，有助于明确方向。下午适合处理重要事务。晚间宜休养生息，为明日积蓄能量。`,
      luckyDirection: DIRECTIONS[dirIdx],
      luckyColor: COLORS[colorIdx],
      luckyNumber: (cardId % 9) + 1,
      provider: 'mock',
    };
  },

  async assistantChat(input: AssistantChatInput): Promise<AssistantChatResult> {
    await new Promise((r) => setTimeout(r, 300));
    const lastMessage = input.messages[input.messages.length - 1];
    const reply = `您好！关于您提到的「${lastMessage?.content?.slice(0, 20) ?? '问题'}」，助学童子认为：依据八字命理，天时地利人和三者兼备，方能事半功倍。建议您结合自身八字，在合适的时机稳步推进。如需深入分析，请提供更多信息。`;
    return {
      conversationId: input.conversationId ?? randomUUID(),
      reply,
      provider: 'mock',
    };
  },
};
