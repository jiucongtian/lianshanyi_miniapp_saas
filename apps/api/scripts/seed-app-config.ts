/**
 * Seed app_config from environment variables (run once after migration).
 * Usage: MONGO_URI=... OPENAPI_SECRET_ENC_KEY=... tsx scripts/seed-app-config.ts
 */
import mongoose from 'mongoose';
import { AppConfig } from '../src/models/app-config.model';
import { encryptSecret } from '../src/lib/crypto/app-secret';

async function main() {
  const mongoUri = process.env.MONGO_URI ?? 'mongodb://localhost:27017/lianshanyi_dev';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const provider = (process.env.AI_PROVIDER ?? 'mock') as 'mock' | 'coze';
  const cozeToken = process.env.COZE_API_TOKEN;
  let cozeTokenEnc: string | undefined;
  if (cozeToken) {
    cozeTokenEnc = encryptSecret(cozeToken);
    console.log('COZE_API_TOKEN encrypted and will be stored.');
  }

  await AppConfig.findOneAndUpdate(
    {},
    {
      $setOnInsert: {
        ai: {
          provider,
          cozeTokenEnc,
          cardDrawWorkflowId: process.env.COZE_CARD_DRAW_WORKFLOW_ID,
          dailyInsightWorkflowId: process.env.COZE_DAILY_INSIGHT_WORKFLOW_ID,
          assistantBotId: process.env.COZE_ASSISTANT_BOT_ID,
        },
      },
    },
    { upsert: true },
  );

  console.log(`app_config seeded with provider=${provider}`);
  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
