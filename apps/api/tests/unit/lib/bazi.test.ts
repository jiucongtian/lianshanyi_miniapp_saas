import { describe, it, expect } from 'vitest';
import { computeBazi, getDayGanZhi } from '../../../src/lib/bazi/index';
import { buildCardsData as getCards } from '../../../src/seeds/cards.data';

describe('computeBazi', () => {
  it('computes pillars for a solar date', () => {
    const result = computeBazi({ year: 1990, month: 5, day: 15, hour: 8 });
    expect(result.dayPillar).toBeDefined();
    expect(result.dayPillar.stem).toBeTruthy();
    expect(result.dayPillar.branch).toBeTruthy();
    expect(result.yearPillar).toBeDefined();
    expect(result.monthPillar).toBeDefined();
    expect(result.hourPillar).toBeDefined();
  });

  it('accepts lunar date and converts to solar', () => {
    const result = computeBazi({
      year: 1990,
      month: 4,
      day: 20,
      hour: 8,
      isLunar: true,
    });
    expect(result.dayPillar).toBeDefined();
  });

  it('throws for out-of-range lunar date', () => {
    expect(() =>
      computeBazi({ year: 1800, month: 1, day: 1, hour: 0, isLunar: true }),
    ).toThrow();
  });
});

describe('getDayGanZhi', () => {
  it('returns stem and branch for a date', () => {
    const { stem, branch } = getDayGanZhi(2024, 1, 1);
    expect(stem).toBeTruthy();
    expect(branch).toBeTruthy();
  });
});

describe('buildCardsData', () => {
  it('produces exactly 60 cards', () => {
    const cards = getCards();
    expect(cards).toHaveLength(60);
  });

  it('first card is 甲子', () => {
    const cards = getCards();
    expect(cards[0].name).toBe('甲子');
    expect(cards[0].cardId).toBe(1);
  });

  it('last card is 癸亥', () => {
    const cards = getCards();
    expect(cards[59].name).toBe('癸亥');
    expect(cards[59].cardId).toBe(60);
  });

  it('all cards have required fields', () => {
    const cards = getCards();
    for (const card of cards) {
      expect(card.heavenlyStem).toBeTruthy();
      expect(card.earthlyBranch).toBeTruthy();
      expect(card.nayin).toBeTruthy();
      expect(card.description).toBeTruthy();
    }
  });
});
