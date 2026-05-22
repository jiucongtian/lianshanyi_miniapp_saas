import axios from 'axios';
import type {
  AiAdapter,
  CardDrawInput,
  CardDrawResult,
  DailyInsightInput,
  DailyInsightResult,
  AssistantChatInput,
  AssistantChatResult,
} from './adapter';
import { createModuleLogger } from '../../utils/logger';

const log = createModuleLogger('CozeAI');
const COZE_API_BASE = 'https://api.coze.cn/v1';

// Placeholder — wire up Coze API when AI_PROVIDER=coze
// Reference: cloudfunctions/cozeFunctions_v1_3/index.js & assistantChat_v1_0/index.js
export const cozeAiAdapter: AiAdapter = {
  async drawCard(input: CardDrawInput): Promise<CardDrawResult> {
    const token = process.env.COZE_API_TOKEN;
    const workflowId = process.env.COZE_CARD_DRAW_WORKFLOW_ID;
    if (!token || !workflowId) throw new Error('Coze config missing');

    // TODO: implement workflow trigger + polling
    log.info({ cardId: input.cardId }, 'Coze drawCard stub called');
    throw new Error('Coze adapter not yet implemented');
  },

  async generateDailyInsight(input: DailyInsightInput): Promise<DailyInsightResult> {
    const token = process.env.COZE_API_TOKEN;
    const workflowId = process.env.COZE_DAILY_INSIGHT_WORKFLOW_ID;
    if (!token || !workflowId) throw new Error('Coze config missing');

    log.info({ date: input.date }, 'Coze dailyInsight stub called');
    throw new Error('Coze adapter not yet implemented');
  },

  async assistantChat(input: AssistantChatInput): Promise<AssistantChatResult> {
    const token = process.env.COZE_API_TOKEN;
    const botId = process.env.COZE_ASSISTANT_BOT_ID;
    if (!token || !botId) throw new Error('Coze config missing');

    log.info({}, 'Coze assistantChat stub called');
    throw new Error('Coze adapter not yet implemented');
  },
};
