import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { cozeAiAdapter } from '../../src/lib/ai/coze.adapter';
import { mockAiAdapter } from '../../src/lib/ai/mock.adapter';
import { resolveDailyInsightContext } from '../../src/lib/ai/adapter';
import { getDayGanZhi } from '../../src/lib/bazi';

vi.mock('axios', () => ({ default: { post: vi.fn() } }));
vi.mock('../../src/lib/ai/coze-config', () => ({
  resolveCozeConfig: vi.fn(async () => ({
    token: 'test-token',
    cardDrawWorkflowId: 'draw-workflow',
    dailyInsightWorkflowId: 'daily-workflow',
  })),
}));

beforeEach(() => {
  vi.mocked(axios.post).mockReset();
});

describe('AI adapter production compatibility', () => {
  it('keeps the internal card draw BaZi summary in the Coze workflow request', async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: { code: 0, data: { data: '解读' } } });

    await cozeAiAdapter.drawCard({
      cardId: 1,
      cardName: '甲子',
      question: '事业如何',
      baziSummary: '年柱甲子，月柱乙丑',
    });

    expect(axios.post).toHaveBeenCalledWith(
      'https://api.coze.cn/v1/workflow/run',
      {
        workflow_id: 'draw-workflow',
        parameters: {
          bazi_name: '甲子',
          question: '事业如何',
          bazi_summary: '年柱甲子，月柱乙丑',
        },
      },
      expect.anything(),
    );
  });

  it('derives the OpenAPI daily stem and branch from the date, not the card name', () => {
    const date = '2026-09-28';
    const expected = getDayGanZhi(2026, 9, 28);
    const context = resolveDailyInsightContext({ date, cardName: '甲子' });

    expect(context).toEqual({ cardId: 1, dayStem: expected.stem, dayBranch: expected.branch });
  });

  it('preserves the internal daily calendar fields and card ID in both adapters', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: { code: 0, data: { output: JSON.stringify({ blessing: '祝福', tip: '提示' }) } },
    });
    const input = { date: '2026-09-28', cardName: '甲子', cardId: 42, dayStem: '庚', dayBranch: '申' };

    const coze = await cozeAiAdapter.generateDailyInsight(input);
    const mock = await mockAiAdapter.generateDailyInsight(input);

    expect(coze.title).toContain('庚申日');
    expect(mock.title).toContain('庚申日');
    expect(coze.luckyNumber).toBe((42 % 9) + 1);
    expect(mock.luckyNumber).toBe((42 % 9) + 1);
  });
});
