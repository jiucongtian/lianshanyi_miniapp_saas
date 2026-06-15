import mongoose from 'mongoose';
import { Tenant } from '../src/models/tenant.model';
import { OpenApp } from '../src/models/open-app.model';
import { createApp } from '../src/services/open-app.service';

async function main() {
  await mongoose.connect(process.env.MONGO_URI ?? 'mongodb://localhost:27017/lianshanyi_dev');

  const old = await Tenant.findOne({ slug: 'cli-test-partner' });
  if (old) {
    await OpenApp.deleteMany({ accountId: old._id });
    await old.deleteOne();
  }

  const account = await Tenant.create({
    type: 'partner',
    slug: 'cli-test-partner',
    name: '本机验证测试',
    status: 'active',
    plan: 'basic',
    themeConfig: {},
    aiConfig: { provider: 'mock' },
    limits: { maxUsers: 100 },
  });

  const { app, appSecret } = await createApp({
    name: 'CLI Test App',
    accountId: String(account._id),
    scopes: ['bazi:calculate', 'tutor:chat', 'insight:interpret', 'daily-insight:read'],
  });

  console.log('APP_ID=' + app.appId);
  console.log('APP_SECRET=' + appSecret);
  await mongoose.disconnect();
}

main().catch(console.error);
