/**
 * Database seed script
 * Run with: npm run seed
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { StaticCard } from '../models/static-card.model';
import { StaticUserType } from '../models/static-user-type.model';
import { buildCardsData } from './cards.data';
import { USER_TYPES_DATA } from './user-types.data';
import { logger } from '../utils/logger';

async function seed() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) throw new Error('MONGO_URI not set');

  await mongoose.connect(mongoUri);
  logger.info('Connected to MongoDB for seeding');

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
