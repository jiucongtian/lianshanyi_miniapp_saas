/**
 * Resolve Coze runtime config: DB-first, env-var fallback.
 */
import { appConfigService } from '../../services/app-config.service';

const DEFAULT_WORKFLOW_DRAW_CARD = '7565131575660003366';
const DEFAULT_WORKFLOW_DAILY_INSIGHT = '7583167143870382106';
const DEFAULT_BOT_ID_ASSISTANT = '7615870340559978548';

export interface CozeRuntimeConfig {
  token: string;
  cardDrawWorkflowId: string;
  dailyInsightWorkflowId: string;
  assistantBotId: string;
}

export async function resolveCozeConfig(): Promise<CozeRuntimeConfig> {
  let dbToken: string | undefined;
  let dbConfig: { cardDrawWorkflowId?: string; dailyInsightWorkflowId?: string; assistantBotId?: string } = {};

  try {
    const raw = await appConfigService.getAiConfigRaw();
    dbToken = raw.cozeTokenEnc ? await appConfigService.resolveCozeToken() : undefined;
    dbConfig = {
      cardDrawWorkflowId: raw.cardDrawWorkflowId,
      dailyInsightWorkflowId: raw.dailyInsightWorkflowId,
      assistantBotId: raw.assistantBotId,
    };
  } catch {
    // DB not ready yet — fall through to env vars
  }

  const token = dbToken ?? process.env.COZE_API_TOKEN;
  if (!token) throw new Error('Coze token not configured (set via admin AI config or COZE_API_TOKEN env var)');

  return {
    token,
    cardDrawWorkflowId: dbConfig.cardDrawWorkflowId ?? process.env.COZE_CARD_DRAW_WORKFLOW_ID ?? DEFAULT_WORKFLOW_DRAW_CARD,
    dailyInsightWorkflowId: dbConfig.dailyInsightWorkflowId ?? process.env.COZE_DAILY_INSIGHT_WORKFLOW_ID ?? DEFAULT_WORKFLOW_DAILY_INSIGHT,
    assistantBotId: dbConfig.assistantBotId ?? process.env.COZE_ASSISTANT_BOT_ID ?? DEFAULT_BOT_ID_ASSISTANT,
  };
}
