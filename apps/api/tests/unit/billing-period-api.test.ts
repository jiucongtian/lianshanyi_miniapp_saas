import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as controller from '../../src/controllers/admin/billing-period.controller';
import { billingPeriodService } from '../../src/services/billing-period.service';

const body = {
  from: '2026-07-31T16:00:00.000Z', to: '2026-08-31T16:00:00.000Z',
  pricesFen: { 'card-insight': 100, 'daily-insight': 200, 'tutor-chat': 300 },
};

function response() {
  const json = vi.fn();
  return { res: { json } as unknown as Response, json };
}

beforeEach(() => vi.restoreAllMocks());

describe('billing period admin controller', () => {
  it('rejects invalid dates and fractional prices before calculating', async () => {
    const preview = vi.spyOn(billingPeriodService, 'preview');
    const next = vi.fn() as NextFunction;
    const { res, json } = response();
    await controller.preview({ body: { ...body, from: body.to, pricesFen: { ...body.pricesFen, 'card-insight': 1.5 } } } as Request, res, next);
    expect(preview).not.toHaveBeenCalled();
    expect(json).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });

  it('returns preview data and passes the submitted fingerprint to generation', async () => {
    const fingerprint = 'b'.repeat(64);
    vi.spyOn(billingPeriodService, 'preview').mockResolvedValue({
      callCount: 2, amountFen: 300, historicalCount: 2, retainedCount: 0, skippedCount: 0,
      byProduct: { 'card-insight': { count: 1, amountFen: 100 }, 'daily-insight': { count: 1, amountFen: 200 }, 'tutor-chat': { count: 0, amountFen: 0 } },
      fingerprint,
    });
    const generate = vi.spyOn(billingPeriodService, 'generate').mockResolvedValue({ activeRevision: 1 } as Awaited<ReturnType<typeof billingPeriodService.generate>>);
    const next = vi.fn() as NextFunction;
    const previewResponse = response();
    await controller.preview({ body } as Request, previewResponse.res, next);
    expect(previewResponse.json.mock.calls[0][0].data.amountFen).toBe(300);
    const generatedResponse = response();
    await controller.generate({ body: { ...body, expectedFingerprint: fingerprint }, principal: { subjectUserId: 'test-admin' } } as Request, generatedResponse.res, next);
    expect(generatedResponse.json.mock.calls[0][0].data.activeRevision).toBe(1);
    expect(generate).toHaveBeenCalledWith(new Date(body.from), new Date(body.to), body.pricesFen, fingerprint, 'test-admin');
    expect(next).not.toHaveBeenCalled();
  });
});
