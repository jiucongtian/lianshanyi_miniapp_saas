/**
 * Issue the first OpenApp credential for a partner/tenant account.
 * Usage: tsx scripts/create-open-app.ts
 * Env:   MONGO_URI, OPENAPI_SECRET_ENC_KEY required
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import * as readline from 'readline';

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => { rl.close(); resolve(answer.trim()); });
  });
}

async function main() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) throw new Error('MONGO_URI not set');
  if (!process.env.OPENAPI_SECRET_ENC_KEY) throw new Error('OPENAPI_SECRET_ENC_KEY not set');

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  // Lazy import after env is validated
  const { Tenant } = await import('../src/models/tenant.model');
  const { createApp } = await import('../src/services/open-app.service');

  // List existing accounts
  const accounts = await Tenant.find({}, { _id: 1, name: 1, slug: 1, type: 1 }).lean();
  if (accounts.length === 0) {
    console.error('No accounts found. Create a tenant/partner first.');
    process.exit(1);
  }

  console.log('\nAvailable accounts:');
  accounts.forEach((a, i) => console.log(`  [${i}] ${a.name} (${a.slug}) — ${a.type}`));

  const idx = Number(await prompt('\nSelect account index: '));
  const account = accounts[idx];
  if (!account) { console.error('Invalid index'); process.exit(1); }

  const name = await prompt('App name (e.g. "测试接入方"): ');
  const scopesInput = await prompt('Scopes (comma-separated, e.g. bazi:calculate,ai:chat): ');
  const scopes = scopesInput.split(',').map(s => s.trim()).filter(Boolean);

  const { app, appSecret } = await createApp({
    name,
    accountId: String(account._id),
    scopes,
  });

  console.log('\n✅ OpenApp created successfully!\n');
  console.log('┌─────────────────────────────────────────┐');
  console.log(`│ App ID:     ${app.appId}`);
  console.log(`│ App Secret: ${appSecret}`);
  console.log('│');
  console.log('│ ⚠️  Save the appSecret now — it will NOT be shown again.');
  console.log('└─────────────────────────────────────────┘\n');
  console.log(`Scopes: ${scopes.join(', ')}`);

  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
