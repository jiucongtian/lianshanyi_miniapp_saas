/**
 * Database seed script
 * Run with: npm run seed
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { StaticCard } from '../models/static-card.model';
import { StaticUserType } from '../models/static-user-type.model';
import { Tenant } from '../models/tenant.model';
import { buildCardsData } from './cards.data';
import { USER_TYPES_DATA } from './user-types.data';
import { logger } from '../utils/logger';

async function seed() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) throw new Error('MONGO_URI not set');

  await mongoose.connect(mongoUri);
  logger.info('Connected to MongoDB for seeding');

  // ─── Seed default tenant ─────────────────────────────────────────────────
  logger.info('Seeding default tenant...');
  const defaultTenant = await Tenant.findOneAndUpdate(
    { slug: 'default' },
    {
      slug: 'default',
      name: '连山易',
      status: 'active',
      plan: 'pro',
      themeConfig: {
        brandName: '连山易',
        primaryColor: '#8B4513',
        bgColor: '#FFF8F0',
        cardBgColor: '#FFFDF8',
        buttonColor: '#8B4513',
        copy: {
          homeTitle: '智慧洞见',
          homeSubtitle: 'Wisdom and Insight',
          drawButtonText: '抽卡寻找答案',
          inputPlaceholder: '说出你的问题，实在没有空着也行！',
          tabInsight: '智慧洞见',
          tabDaily: '每日愈见',
        },
        features: {
          showDailyInsight: true,
          showAssistant: true,
          requireLogin: false,
        },
      },
      aiConfig: {
        provider: (process.env.AI_PROVIDER as 'mock' | 'coze') ?? 'mock',
      },
      limits: {
        dailyDrawCount: 1,
        maxUsers: 10000,
      },
    },
    { upsert: true, new: true },
  );
  logger.info({ tenantId: defaultTenant._id.toString() }, 'Default tenant ready');

  // ─── Seed user types ──────────────────────────────────────────────────────
  logger.info('Seeding user types...');
  for (const typeData of USER_TYPES_DATA) {
    await StaticUserType.findOneAndUpdate(
      { typeKey: typeData.typeKey },
      typeData,
      { upsert: true, new: true },
    );
  }
  logger.info(`Seeded ${USER_TYPES_DATA.length} user types`);

  // ─── Seed 60 cards ────────────────────────────────────────────────────────
  logger.info('Seeding 60 jiazi cards...');
  const cardsData = buildCardsData();
  for (const cardData of cardsData) {
    await StaticCard.findOneAndUpdate(
      { cardId: cardData.cardId },
      cardData,
      { upsert: true, new: true },
    );
  }
  logger.info(`Seeded ${cardsData.length} cards`);

  await mongoose.disconnect();
  logger.info('Seed complete');
}

seed().catch((err) => {
  logger.error({ err }, 'Seed failed');
  process.exit(1);
});
