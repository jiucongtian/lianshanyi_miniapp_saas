/**
 * One-time migration script: backfill tenantId on all existing records
 * that were created before the SaaS migration.
 *
 * Run with: npx tsx scripts/migrate-add-tenant.ts
 *
 * Prerequisites: npm run seed must have been run first (default tenant must exist)
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { Tenant } from '../src/models/tenant.model';
import { User } from '../src/models/user.model';
import { Profile } from '../src/models/profile.model';
import { DrawCardRecord } from '../src/models/draw-card-record.model';
import { DailyInsight } from '../src/models/daily-insight.model';
import { Feedback } from '../src/models/feedback.model';
import { logger } from '../src/utils/logger';

async function migrate() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) throw new Error('MONGO_URI not set');

  await mongoose.connect(mongoUri);
  logger.info('Connected to MongoDB for migration');

  // Find the default tenant
  const defaultTenant = await Tenant.findOne({ slug: 'default' });
  if (!defaultTenant) {
    throw new Error('Default tenant not found. Run "npm run seed" first.');
  }
  const tenantId = defaultTenant._id;
  logger.info({ tenantId: tenantId.toString() }, 'Using default tenant for backfill');

  // Backfill each collection
  const collections = [
    { model: User, name: 'User' },
    { model: Profile, name: 'Profile' },
    { model: DrawCardRecord, name: 'DrawCardRecord' },
    { model: DailyInsight, name: 'DailyInsight' },
    { model: Feedback, name: 'Feedback' },
  ];

  for (const { model, name } of collections) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (model as any).updateMany(
      { tenantId: { $exists: false } },
      { $set: { tenantId } },
    );
    logger.info(
      { collection: name, matched: result.matchedCount, modified: result.modifiedCount },
      'Backfill complete',
    );
  }

  await mongoose.disconnect();
  logger.info('Migration complete');
}

migrate().catch((err) => {
  logger.error({ err }, 'Migration failed');
  process.exit(1);
});
