import { AppConfig, IAiConfig } from '../models/app-config.model';
import { encryptSecret, decryptSecret } from '../lib/crypto/app-secret';
import { invalidateAiAdapter } from '../lib/ai/adapter';

export interface AiConfigPublic {
  provider: 'mock' | 'coze';
  cozeToken?: string;
  cardDrawWorkflowId?: string;
  dailyInsightWorkflowId?: string;
  assistantBotId?: string;
}

export interface AiConfigInput {
  provider: 'mock' | 'coze';
  cozeToken?: string;
  cardDrawWorkflowId?: string;
  dailyInsightWorkflowId?: string;
  assistantBotId?: string;
}

let _cache: IAiConfig | null = null;

function maskToken(token: string): string {
  if (token.length <= 8) return '****';
  return token.slice(0, 4) + '****' + token.slice(-4);
}

export const appConfigService = {
  invalidateCache(): void {
    _cache = null;
  },

  async getAiConfigRaw(): Promise<IAiConfig> {
    if (_cache) return _cache;
    const doc = await AppConfig.findOne().lean();
    const config: IAiConfig = doc?.ai ?? { provider: 'mock' };
    _cache = config;
    return config;
  },

  async getAiConfigPublic(): Promise<AiConfigPublic> {
    const raw = await this.getAiConfigRaw();
    let cozeToken: string | undefined;
    if (raw.cozeTokenEnc) {
      try {
        const plain = decryptSecret(raw.cozeTokenEnc);
        cozeToken = maskToken(plain);
      } catch {
        cozeToken = '****（解密失败）';
      }
    }
    return {
      provider: raw.provider,
      cozeToken,
      cardDrawWorkflowId: raw.cardDrawWorkflowId,
      dailyInsightWorkflowId: raw.dailyInsightWorkflowId,
      assistantBotId: raw.assistantBotId,
    };
  },

  async updateAiConfig(input: AiConfigInput): Promise<AiConfigPublic> {
    let cozeTokenEnc: string | undefined;
    if (input.cozeToken) {
      cozeTokenEnc = encryptSecret(input.cozeToken);
    }

    const update: Partial<IAiConfig> = {
      provider: input.provider,
      cardDrawWorkflowId: input.cardDrawWorkflowId,
      dailyInsightWorkflowId: input.dailyInsightWorkflowId,
      assistantBotId: input.assistantBotId,
    };
    if (cozeTokenEnc !== undefined) update.cozeTokenEnc = cozeTokenEnc;

    const setFields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(update)) {
      if (v !== undefined) setFields[`ai.${k}`] = v;
    }
    if (cozeTokenEnc !== undefined) setFields['ai.cozeTokenEnc'] = cozeTokenEnc;

    await AppConfig.findOneAndUpdate(
      {},
      { $set: setFields },
      { upsert: true, new: true },
    );

    this.invalidateCache();
    invalidateAiAdapter();
    return this.getAiConfigPublic();
  },

  /** Returns the decrypted token for use by the AI adapter */
  async resolveCozeToken(): Promise<string | undefined> {
    const raw = await this.getAiConfigRaw();
    if (raw.cozeTokenEnc) {
      try {
        return decryptSecret(raw.cozeTokenEnc);
      } catch {
        return undefined;
      }
    }
    return undefined;
  },
};
