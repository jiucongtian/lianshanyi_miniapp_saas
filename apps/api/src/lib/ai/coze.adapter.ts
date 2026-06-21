import axios from 'axios';
import https from 'https';
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
import { createModuleLogger } from '../../utils/logger';
import { resolveCozeConfig } from './coze-config';

const log = createModuleLogger('CozeAI');

const COZE_BASE_URL = 'https://api.coze.cn';

// Static lookup: gan-zhi card name → ability mark (cai_neng param for daily insight workflow)
const ABILITY_MARK_MAP: Record<string, string> = {
  甲子: '1', 乙丑: '4', 丙寅: '6', 丁卯: '2', 戊辰: '2', 己巳: '6',
  庚午: '4', 辛未: '4', 壬申: '5', 癸酉: '6', 甲戌: '6', 乙亥: '5',
  丙子: '5', 丁丑: '3', 戊寅: '1', 己卯: '1', 庚辰: '3', 辛巳: '5',
  壬午: '4', 癸未: '1', 甲申: '5', 乙酉: '6', 丙戌: '4', 丁亥: '4',
  戊子: '6', 己丑: '2', 庚寅: '2', 辛卯: '6', 壬辰: '3', 癸巳: '2',
  甲午: '4', 乙未: '1', 丙申: '3', 丁酉: '5', 戊戌: '5', 己亥: '3',
  庚子: '1', 辛丑: '1', 壬寅: '2', 癸卯: '3', 甲辰: '3', 乙巳: '2',
  丙午: '2', 丁未: '6', 戊申: '4', 己酉: '4', 庚戌: '6', 辛亥: '2',
  壬子: '1', 癸丑: '4', 甲寅: '2', 乙卯: '3', 丙辰: '1', 丁巳: '1',
  戊午: '3', 己未: '5', 庚申: '5', 辛酉: '3', 壬戌: '6', 癸亥: '5',
};

const LUCKY_DIRECTIONS = ['东', '南', '西', '北', '东南', '西南', '东北', '西北'];
const LUCKY_COLORS = ['红色', '金色', '绿色', '蓝色', '白色', '紫色'];

// Disable keep-alive so each request uses a fresh connection.
// Coze resets idle connections, causing ECONNRESET on reuse.
const NO_KEEPALIVE_AGENT = new https.Agent({ keepAlive: false });

function cozeHeaders(token: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

// Parse Coze workflow response data: may be a JSON string or object
function parseData(raw: unknown): Record<string, unknown> {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return { _raw: raw };
    }
  }
  if (raw && typeof raw === 'object') return raw as Record<string, unknown>;
  return {};
}

async function runWorkflow(
  token: string,
  workflowId: string,
  parameters: Record<string, unknown>,
): Promise<unknown> {
  const res = await axios.post(
    `${COZE_BASE_URL}/v1/workflow/run`,
    { workflow_id: workflowId, parameters },
    { headers: cozeHeaders(token), timeout: 120_000, httpsAgent: NO_KEEPALIVE_AGENT },
  );

  if (res.data.code !== 0) {
    throw new Error(`Coze workflow error ${res.data.code}: ${res.data.msg ?? 'unknown'}`);
  }

  return res.data.data;
}

// Poll until a Coze chat completes; returns the assistant's reply text
async function pollUntilComplete(
  token: string,
  chatId: string,
  conversationId: string,
): Promise<string> {
  const headers = cozeHeaders(token);

  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise((r) => setTimeout(r, attempt === 0 ? 800 : 2000));

    const { data: retrieve } = await axios.get(`${COZE_BASE_URL}/v3/chat/retrieve`, {
      params: { chat_id: chatId, conversation_id: conversationId },
      headers,
      timeout: 120_000,
      httpsAgent: NO_KEEPALIVE_AGENT,
    });

    if (retrieve.code !== 0) {
      throw new Error(`Coze retrieve error ${retrieve.code}: ${retrieve.msg ?? 'unknown'}`);
    }

    const status: string = retrieve.data?.status ?? '';

    if (status === 'in_progress' || status === 'created') continue;

    if (status === 'failed' || status === 'requires_action') {
      throw new Error(`Coze chat ended with status: ${status}`);
    }

    // completed — fetch messages
    const { data: msgList } = await axios.get(`${COZE_BASE_URL}/v3/chat/message/list`, {
      params: { chat_id: chatId, conversation_id: conversationId },
      headers,
      timeout: 120_000,
      httpsAgent: NO_KEEPALIVE_AGENT,
    });

    if (msgList.code !== 0) {
      throw new Error(`Coze message list error ${msgList.code}: ${msgList.msg ?? 'unknown'}`);
    }

    const messages: Array<Record<string, unknown>> = Array.isArray(msgList.data)
      ? msgList.data
      : ((msgList.data as Record<string, unknown>)?.messages as Array<Record<string, unknown>>) ?? [];

    const reply = messages
      .filter((m) => m['role'] === 'assistant' && m['type'] === 'answer')
      .map((m) => m['content'])
      .filter(Boolean)
      .join('\n');

    return reply;
  }

  throw new Error('Coze assistant chat timed out after 30 polling attempts');
}

export const cozeAiAdapter: AiAdapter = {
  async drawCard(input: CardDrawInput): Promise<CardDrawResult> {
    const cfg = await resolveCozeConfig();
    const { token } = cfg;
    const workflowId = cfg.cardDrawWorkflowId;

    log.info({ cardName: input.cardName }, 'Coze drawCard');

    const parameters: Record<string, unknown> = { bazi_name: input.cardName };
    if (input.question) parameters['question'] = input.question;

    const raw = await runWorkflow(token, workflowId, parameters);
    const outer = parseData(raw);

    // Coze returns data.data as the interpretation text (may be escaped)
    let interpretation: string;
    if (outer['data'] && typeof outer['data'] === 'string') {
      interpretation = outer['data']
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\t/g, '\t')
        .replace(/\\r/g, '\r')
        .replace(/\\\\/g, '\\');
    } else {
      interpretation = JSON.stringify(outer);
    }

    return { interpretation, provider: 'coze' };
  },

  async generateDailyInsight(input: DailyInsightInput): Promise<DailyInsightResult> {
    const cfg = await resolveCozeConfig();
    const { token } = cfg;
    const workflowId = cfg.dailyInsightWorkflowId;

    const caiNeng = ABILITY_MARK_MAP[input.cardName] ?? '1';
    const cardId = cardNameToId(input.cardName);
    const dayStem = input.cardName[0];
    const dayBranch = input.cardName[1];
    log.info({ date: input.date, cardName: input.cardName, caiNeng }, 'Coze generateDailyInsight');

    const raw = await runWorkflow(token, workflowId, {
      cai_neng: caiNeng,
      gan_zhi: input.cardName,
    });

    // Two-level parse: outer wraps an `output` field which is another JSON string
    const outer = parseData(raw);
    const inner = parseData(outer['output']);

    const blessing = String(inner['blessing'] ?? '');
    const tip = String(inner['tip'] ?? '');
    const password = String(inner['password'] ?? '');

    const dirIdx = cardId % LUCKY_DIRECTIONS.length;
    const colorIdx = (cardId + 2) % LUCKY_COLORS.length;

    return {
      title: `${input.date} · ${input.cardName} · ${dayStem}${dayBranch}日`,
      summary: blessing || `今日主卦「${input.cardName}」，${dayStem}${dayBranch}之气主导。`,
      fullText:
        tip ||
        password ||
        `今日干支 ${dayStem}${dayBranch}，配合「${input.cardName}」之象，提示诸事宜稳中求进。`,
      luckyDirection: LUCKY_DIRECTIONS[dirIdx],
      luckyColor: LUCKY_COLORS[colorIdx],
      luckyNumber: (cardId % 9) + 1,
      provider: 'coze',
    };
  },

  async assistantChat(input: AssistantChatInput): Promise<AssistantChatResult> {
    const cfg = await resolveCozeConfig();
    const { token } = cfg;
    const botId = cfg.assistantBotId;

    log.info({ conversationId: input.conversationId }, 'Coze assistantChat');

    const reversed = [...input.messages].reverse();
    const lastUserMsg = reversed.find((m) => m.role === 'user') ?? input.messages[input.messages.length - 1];
    if (!lastUserMsg) throw new Error('No messages provided');

    // When conversation exists, Coze manages history server-side.
    // Only send the current user message to avoid duplicates.
    const additionalMessages: Array<Record<string, unknown>> = [];

    // Prepend profile context as first user turn only when starting a new conversation
    if (input.profileContext && !input.conversationId) {
      additionalMessages.push({
        role: 'user',
        content: `【用户命理档案】${input.profileContext}`,
        content_type: 'text',
      });
    }

    additionalMessages.push({
      role: 'user',
      content: lastUserMsg.content,
      content_type: 'text',
    });

    const chatUrl = input.conversationId
      ? `${COZE_BASE_URL}/v3/chat?conversation_id=${encodeURIComponent(input.conversationId)}`
      : `${COZE_BASE_URL}/v3/chat`;

    const { data: chatResp } = await axios.post(
      chatUrl,
      {
        bot_id: botId,
        user_id: 'web-user',
        stream: false,
        auto_save_history: true,
        additional_messages: additionalMessages,
      },
      { headers: cozeHeaders(token), timeout: 120_000, httpsAgent: NO_KEEPALIVE_AGENT },
    );

    if (chatResp.code !== 0) {
      throw new Error(`Coze chat start error ${chatResp.code}: ${chatResp.msg ?? 'unknown'}`);
    }

    const chatId: string = chatResp.data.id;
    const conversationId: string = chatResp.data.conversation_id;

    const reply = await pollUntilComplete(token, chatId, conversationId);

    return { conversationId, reply, provider: 'coze' };
  },
};
