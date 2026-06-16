import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { appConfigService } from '../../services/app-config.service';
import { resolveCozeConfig } from '../../lib/ai/coze-config';

const updateSchema = z.object({
  provider: z.enum(['mock', 'coze']),
  cozeToken: z.string().optional(),
  cardDrawWorkflowId: z.string().optional(),
  dailyInsightWorkflowId: z.string().optional(),
  assistantBotId: z.string().optional(),
});

export async function getAiConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await appConfigService.getAiConfigPublic();
    res.json({ success: true, data, error: null, code: null });
  } catch (err) { next(err); }
}

export async function updateAiConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = updateSchema.parse(req.body);
    const data = await appConfigService.updateAiConfig(body);
    res.json({ success: true, data, error: null, code: null });
  } catch (err) { next(err); }
}

export async function testAiConnection(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const cfg = await resolveCozeConfig();
    // Minimal probe: call the Coze ping endpoint
    const axios = (await import('axios')).default;
    const r = await axios.get('https://api.coze.cn/v1/bot/list', {
      headers: { Authorization: `Bearer ${cfg.token}` },
      timeout: 10_000,
      params: { space_id: '0', page_size: 1 },
      validateStatus: () => true,
    });
    const ok = r.status < 500;
    res.json({ success: true, data: { ok, httpStatus: r.status, cozeCode: r.data?.code }, error: null, code: null });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.json({ success: true, data: { ok: false, error: msg }, error: null, code: null });
  }
}
