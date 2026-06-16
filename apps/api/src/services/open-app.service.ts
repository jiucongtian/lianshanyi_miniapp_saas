import { OpenApp, IOpenApp } from '../models/open-app.model';
import { Tenant } from '../models/tenant.model';
import { encryptSecret, invalidateSecretCache } from '../lib/crypto/app-secret';
import { generateAppId, generateAppSecret } from '../lib/crypto/sign';
import { isDataScope } from '../lib/openapi/scopes';
import { AppError, NotFoundError } from '../utils/errors';
import mongoose from 'mongoose';

export interface CreateAppInput {
  name: string;
  remark?: string;
  accountId: string;
  scopes: string[];
  rateLimit?: { windowMs: number; max: number };
}

export interface UpdateAppInput {
  name?: string;
  remark?: string;
  scopes?: string[];
  rateLimit?: { windowMs: number; max: number };
}

export interface CreateAppResult {
  app: IOpenApp;
  appSecret: string;
}

function validateDataScopes(scopes: string[], accountId: string | undefined): void {
  const dataScopes = scopes.filter(isDataScope);
  if (dataScopes.length > 0 && !accountId) {
    throw new AppError('数据类 scope 仅能授予已绑定 Account 的凭据', 400, 'VALIDATION_ERROR');
  }
}

export async function createApp(input: CreateAppInput): Promise<CreateAppResult> {
  const { name, accountId, scopes, rateLimit } = input;

  // Validate account exists
  const account = await Tenant.findById(accountId).lean();
  if (!account) throw new NotFoundError('Account');

  validateDataScopes(scopes, accountId);

  const appId = generateAppId();
  const plainSecret = generateAppSecret();
  const secretEnc = encryptSecret(plainSecret);

  const app = await OpenApp.create({
    appId,
    secretEnc,
    name,
    remark: input.remark,
    accountId: new mongoose.Types.ObjectId(accountId),
    scopes,
    status: 'active',
    ...(rateLimit ? { rateLimit } : {}),
  });

  return { app, appSecret: plainSecret };
}

export async function listApps(accountId?: string) {
  const filter = accountId ? { accountId: new mongoose.Types.ObjectId(accountId) } : {};
  return OpenApp.find(filter).select('-secretEnc').lean();
}

export async function getApp(appId: string) {
  const app = await OpenApp.findOne({ appId }).select('-secretEnc').lean();
  if (!app) throw new NotFoundError('OpenApp');
  return app;
}

export async function rotateSecret(appId: string): Promise<{ appSecret: string }> {
  const app = await OpenApp.findOne({ appId });
  if (!app) throw new NotFoundError('OpenApp');

  const plainSecret = generateAppSecret();
  app.secretEnc = encryptSecret(plainSecret);
  await app.save();
  invalidateSecretCache(appId);

  return { appSecret: plainSecret };
}

export async function setStatus(appId: string, status: 'active' | 'disabled'): Promise<void> {
  const result = await OpenApp.findOneAndUpdate({ appId }, { status });
  if (!result) throw new NotFoundError('OpenApp');
  if (status === 'disabled') invalidateSecretCache(appId);
}

export async function updateScopes(appId: string, scopes: string[]): Promise<void> {
  const app = await OpenApp.findOne({ appId });
  if (!app) throw new NotFoundError('OpenApp');

  validateDataScopes(scopes, String(app.accountId));
  app.scopes = scopes;
  await app.save();
}

export async function updateApp(appId: string, input: UpdateAppInput): Promise<void> {
  const app = await OpenApp.findOne({ appId });
  if (!app) throw new NotFoundError('OpenApp');

  if (input.scopes) validateDataScopes(input.scopes, String(app.accountId));
  if (input.name !== undefined) app.name = input.name;
  if (input.remark !== undefined) app.remark = input.remark;
  if (input.scopes) app.scopes = input.scopes;
  if (input.rateLimit) app.rateLimit = input.rateLimit;
  await app.save();
}

export async function findActiveByAppId(appId: string) {
  return OpenApp.findOne({ appId, status: 'active' }).lean();
}
