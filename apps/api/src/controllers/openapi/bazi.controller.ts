import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { computeBazi } from '../../lib/bazi/index';
import { sendOk, sendErr, ERROR_CODES } from '../../lib/openapi/response';

const baziSchema = z.object({
  year: z.number().int().min(1900).max(2100),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59).optional(),
  isLunar: z.boolean().optional(),
  isLeapMonth: z.boolean().optional(),
});

export async function calculate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = baziSchema.safeParse(req.body);
    if (!parsed.success) {
      sendErr(res, 400, ERROR_CODES.VALIDATION_ERROR, parsed.error.errors[0].message);
      return;
    }

    const input = parsed.data;
    let result;
    try {
      result = computeBazi(input);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '八字计算失败';
      if (msg.includes('超出支持范围') || msg.includes('无效')) {
        sendErr(res, 400, ERROR_CODES.BAZI_OUT_OF_RANGE, msg);
      } else {
        sendErr(res, 500, ERROR_CODES.INTERNAL_ERROR, msg);
      }
      return;
    }

    // Explicit field mapping — strip internal `raw` field
    sendOk(res, {
      yearPillar: result.yearPillar,
      monthPillar: result.monthPillar,
      dayPillar: result.dayPillar,
      hourPillar: result.hourPillar,
      wuXingCount: result.wuXingCount,
      ...(result.lunarDate ? { lunarDate: result.lunarDate } : {}),
    });
  } catch (err) {
    next(err);
  }
}
