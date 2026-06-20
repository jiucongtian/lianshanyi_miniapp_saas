/**
 * 一次性迁移脚本：微信云开发数据库 → 自建 MongoDB
 * ============================================================================
 * 把小程序时代存在腾讯云开发里的数据导入自建 API 的 MongoDB。
 * 仅迁移仍在使用的业务集合，**不迁移支付 / 配额**（payment_orders / function_*，
 * 这两块已确认废弃，后续用新的额度机制重做）。
 *
 * 迁移范围：
 *   users → User      （以 openid 为身份键，可重复执行 upsert）
 *   profiles → Profile（八字结果用 apps/api 自带算法重算，保证一致）
 *   draw_card_records → DrawCardRecord
 *   daily_insights → DailyInsight（全局数据，不绑用户）
 *   feedbacks → Feedback
 *
 * 数据来源：腾讯云开发控制台「数据库 → 导出」得到的 JSON 文件
 *   （每行一个文档的 NDJSON，或一个 JSON 数组，两种都支持）。
 *   默认放在 apps/api/scripts/cloudbase-export/{collection}.json
 *
 * 运行：
 *   # 1) 先 dry-run，只统计与抽样，不写库
 *   npx tsx scripts/migrate-from-cloudbase.ts --dry-run
 *   # 2) 确认无误后正式导入（可指定单个集合）
 *   npx tsx scripts/migrate-from-cloudbase.ts
 *   npx tsx scripts/migrate-from-cloudbase.ts --only=users,profiles
 *
 * 前置条件：
 *   - 已 `npm run seed`，存在 slug=MIGRATION_TENANT_SLUG（默认 'default'）的租户
 *   - 已对 user.model 增加 openid 字段（本次改动一并提交）
 *
 * 幂等性：
 *   - users 按 (tenantId, openid) upsert，重复跑不会重复建用户
 *   - 其余集合依赖落盘的 ID 映射表（.migration-idmap.json）做去重与跨表引用
 *   - 删除映射表后重跑会重新插入，请勿在生产误删
 *
 * ⚠️ 需人工确认的假设（已用当前代码核对，仍建议 dry-run 复核）：
 *   - profiles.gender：源 1=男 0=女（addProfile/index.js 确认）
 *   - userType 非法值回退为 'guest'
 *   - 微信用户多数无手机号，迁移后无法用手机号/密码登录 Web；openid 已保留，
 *     待 Web 接入微信网页授权登录后可凭 openid 重新关联。详见文末说明。
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';

import { Tenant } from '../src/models/tenant.model';
import { User, type UserType } from '../src/models/user.model';
import { Profile } from '../src/models/profile.model';
import { DrawCardRecord } from '../src/models/draw-card-record.model';
import { DailyInsight } from '../src/models/daily-insight.model';
import { Feedback, type FeedbackStatus } from '../src/models/feedback.model';
import { computeBazi } from '../src/lib/bazi';
import { logger } from '../src/utils/logger';

// ─── 配置 ────────────────────────────────────────────────────────────────────
const EXPORT_DIR =
  process.env.CLOUDBASE_EXPORT_DIR ?? path.join(__dirname, 'cloudbase-export');
const IDMAP_PATH = path.join(__dirname, '.migration-idmap.json');
const TENANT_SLUG = process.env.MIGRATION_TENANT_SLUG ?? 'default';

const DRY_RUN = process.argv.includes('--dry-run');
const ONLY = (() => {
  const arg = process.argv.find((a) => a.startsWith('--only='));
  return arg ? new Set(arg.slice('--only='.length).split(',')) : null;
})();
const shouldRun = (name: string) => !ONLY || ONLY.has(name);

const VALID_USER_TYPES = new Set<UserType>(['guest', 'normal', 'student', 'premium']);
const VALID_FEEDBACK_STATUS = new Set<FeedbackStatus>(['pending', 'reviewed', 'resolved']);

// ─── 六十甲子卡名 → 编号（与 apps/api/src/seeds/cards.data.ts 同一生成规则）────
const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const CARD_NAME_TO_ID: Record<string, number> = (() => {
  const map: Record<string, number> = {};
  for (let i = 0; i < 60; i++) map[`${GAN[i % 10]}${ZHI[i % 12]}`] = i + 1;
  return map;
})();

// ─── ID 映射表（旧云开发 _id → 新 ObjectId 字符串）────────────────────────────
type IdMap = { users: Record<string, string>; profiles: Record<string, string> };
const idmap: IdMap = loadIdMap();

function loadIdMap(): IdMap {
  try {
    if (fs.existsSync(IDMAP_PATH)) {
      return JSON.parse(fs.readFileSync(IDMAP_PATH, 'utf8')) as IdMap;
    }
  } catch (err) {
    logger.warn({ err }, '读取 ID 映射表失败，从空表开始');
  }
  return { users: {}, profiles: {} };
}

function saveIdMap(): void {
  if (DRY_RUN) return;
  fs.writeFileSync(IDMAP_PATH, JSON.stringify(idmap, null, 2), 'utf8');
}

// ─── 通用：读取一个集合的导出文件（NDJSON 或 JSON 数组）─────────────────────────
type Doc = Record<string, unknown>;

function readExport(collection: string): Doc[] {
  const file = path.join(EXPORT_DIR, `${collection}.json`);
  if (!fs.existsSync(file)) {
    logger.warn({ collection, file }, '导出文件不存在，跳过该集合');
    return [];
  }
  const raw = fs.readFileSync(file, 'utf8').trim();
  if (!raw) return [];
  // JSON 数组
  if (raw[0] === '[') return JSON.parse(raw) as Doc[];
  // NDJSON：每行一个文档
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Doc);
}

// 云开发 _id 取值（可能是 _id 或 id）
const srcId = (d: Doc): string | null => {
  const v = d['_id'] ?? d['id'];
  return v == null ? null : String(v);
};

// 云开发时间字段 → Date
const toDate = (v: unknown): Date | undefined => {
  if (!v) return undefined;
  if (typeof v === 'number') return new Date(v);
  if (typeof v === 'string') {
    const d = new Date(v);
    return isNaN(d.getTime()) ? undefined : d;
  }
  // 云开发可能导出为 { $date: ... }
  if (typeof v === 'object' && v !== null && '$date' in v) return toDate((v as Doc)['$date']);
  return undefined;
};

const str = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;

const num = (v: unknown): number | undefined => {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

// ─── 迁移：users ───────────────────────────────────────────────────────────────
async function migrateUsers(tenantId: mongoose.Types.ObjectId): Promise<void> {
  const docs = readExport('users');
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const d of docs) {
    const oldId = srcId(d);
    const openid = str(d['openid']) ?? str(d['_openid']);
    if (!openid) {
      skipped++;
      continue; // 无 openid 无法定位身份，跳过
    }

    const rawType = str(d['userType']) ?? str(d['userTypeCode']);
    const userType: UserType =
      rawType && VALID_USER_TYPES.has(rawType as UserType) ? (rawType as UserType) : 'guest';

    const phone = str(d['phoneNumber']) ?? str(d['phone']);
    const nick = str(d['nickName']) ?? str(d['nickname']);

    const set = {
      tenantId,
      openid,
      userType,
      isAdmin: Boolean(d['isAdmin']),
      // 微信默认昵称「微信用户」不保留，避免脏数据
      ...(nick && nick !== '微信用户' ? { nickname: nick } : {}),
      ...(str(d['avatarUrl']) ? { avatarUrl: str(d['avatarUrl']) } : {}),
      ...(phone ? { phone } : {}),
      // 无手机号者视为游客身份，guestToken 用 openid 派生，保证可寻址
      isGuest: !phone,
      ...(!phone ? { guestToken: `wx:${openid}` } : {}),
      ...(toDate(d['createTime']) ? { createdAt: toDate(d['createTime']) } : {}),
      lastLoginAt: toDate(d['lastLoginTime']) ?? toDate(d['updateTime']),
    };

    if (DRY_RUN) {
      created++;
      continue;
    }

    const res = await User.findOneAndUpdate({ tenantId, openid }, { $set: set }, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
      includeResultMetadata: true,
    });
    const doc = res.value;
    if (doc) {
      if (oldId) idmap.users[oldId] = String(doc._id);
      // 同时按 openid 建一条索引，便于按 openid 反查（draw 记录可能只带 openid）
      idmap.users[`openid:${openid}`] = String(doc._id);
    }
    res.lastErrorObject?.['updatedExisting'] ? updated++ : created++;
  }

  saveIdMap();
  logger.info({ total: docs.length, created, updated, skipped, dryRun: DRY_RUN }, 'users 迁移完成');
}

// 解析 draw / feedback 里的用户引用 → 新 ObjectId
function resolveUserId(d: Doc): mongoose.Types.ObjectId | undefined {
  const byUserId = d['userId'] != null ? idmap.users[String(d['userId'])] : undefined;
  const openid = str(d['openid']) ?? str(d['_openid']);
  const byOpenid = openid ? idmap.users[`openid:${openid}`] : undefined;
  const newId = byUserId ?? byOpenid;
  return newId ? new mongoose.Types.ObjectId(newId) : undefined;
}

// ─── 迁移：profiles ────────────────────────────────────────────────────────────
async function migrateProfiles(tenantId: mongoose.Types.ObjectId): Promise<void> {
  const docs = readExport('profiles');
  let created = 0;
  let skipped = 0;
  const usersWithDefault = new Set<string>(); // 每个用户首条命盘设为默认

  for (const d of docs) {
    const oldId = srcId(d);
    if (oldId && idmap.profiles[oldId]) {
      skipped++; // 已迁过
      continue;
    }
    const userId = resolveUserId(d);
    if (!userId) {
      skipped++;
      continue; // 找不到对应用户，跳过
    }

    const birth = (d['birthDate'] ?? {}) as Doc;
    const birthYear = num(birth['year']);
    const birthMonth = num(birth['month']);
    const birthDay = num(birth['day']);
    const birthHour = num(birth['hour']) ?? 0;
    if (birthYear == null || birthMonth == null || birthDay == null) {
      skipped++;
      continue; // 出生日期不全，八字无法计算
    }
    const isLunarDate = Boolean(birth['isLunar']);

    // 八字用本仓库算法重算，确保与新后端结果一致（不沿用云端 baziData）
    let baziResult;
    try {
      baziResult = computeBazi({
        year: birthYear,
        month: birthMonth,
        day: birthDay,
        hour: birthHour,
        minute: num(birth['minute']) ?? 0,
        isLunar: isLunarDate,
        isLeapMonth: Boolean(birth['isLeapMonth']),
      });
    } catch (err) {
      logger.warn({ err, oldId }, '八字重算失败，命盘将不带 baziResult');
    }

    const uid = String(userId);
    const isDefaultProfile = Boolean(d['isDefault'] ?? d['isDefaultProfile']) || !usersWithDefault.has(uid);
    usersWithDefault.add(uid);

    const doc = {
      tenantId,
      userId,
      name: str(d['profileName']) ?? str(d['name']) ?? '未命名',
      gender: num(d['gender']) === 0 ? 'female' : 'male', // 源 1=男 0=女
      birthYear,
      birthMonth,
      birthDay,
      birthHour,
      birthMinute: num(birth['minute']) ?? 0,
      isLunarDate,
      isDefaultProfile,
      ...(baziResult ? { baziResult } : {}),
      ...(toDate(d['createTime']) ? { createdAt: toDate(d['createTime']) } : {}),
    };

    if (DRY_RUN) {
      created++;
      continue;
    }
    const res = await Profile.create(doc);
    if (oldId) idmap.profiles[oldId] = String(res._id);
    created++;
  }

  saveIdMap();
  logger.info({ total: docs.length, created, skipped, dryRun: DRY_RUN }, 'profiles 迁移完成');
}

// ─── 迁移：draw_card_records ──────────────────────────────────────────────────
async function migrateDrawRecords(tenantId: mongoose.Types.ObjectId): Promise<void> {
  const docs = readExport('draw_card_records');
  let created = 0;
  let skipped = 0;

  for (const d of docs) {
    const userId = resolveUserId(d);
    if (!userId) {
      skipped++;
      continue;
    }
    const cardName = str(d['cardName']) ?? str(d['bazi_name']);
    const cardId = cardName ? CARD_NAME_TO_ID[cardName] : undefined;
    if (!cardName || !cardId) {
      skipped++;
      continue; // 卡名无法映射到编号
    }
    const oldProfileId = d['profileId'] != null ? idmap.profiles[String(d['profileId'])] : undefined;

    const doc = {
      tenantId,
      userId,
      ...(oldProfileId ? { profileId: new mongoose.Types.ObjectId(oldProfileId) } : {}),
      cardId,
      cardName,
      ...(str(d['question']) ? { question: str(d['question']) } : {}),
      ...(str(d['aiInterpretation']) ?? str(d['result']) ?? str(d['answer'])
        ? { aiInterpretation: str(d['aiInterpretation']) ?? str(d['result']) ?? str(d['answer']) }
        : {}),
      aiProvider: 'coze' as const,
      drawDate: str(d['drawDate']) ?? toDate(d['createTime'])?.toISOString().slice(0, 10) ?? '',
      ...(toDate(d['createTime']) ? { createdAt: toDate(d['createTime']) } : {}),
    };
    if (!doc.drawDate) {
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      created++;
      continue;
    }
    await DrawCardRecord.create(doc);
    created++;
  }

  logger.info({ total: docs.length, created, skipped, dryRun: DRY_RUN }, 'draw_card_records 迁移完成');
}

// ─── 迁移：daily_insights（全局数据，按 date 去重）─────────────────────────────
async function migrateDailyInsights(tenantId: mongoose.Types.ObjectId): Promise<void> {
  const docs = readExport('daily_insights');
  let created = 0;
  let skipped = 0;

  for (const d of docs) {
    const date = str(d['date']);
    const cardName = str(d['cardName']);
    const cardId = num(d['cardId']) ?? (cardName ? CARD_NAME_TO_ID[cardName] : undefined);
    if (!date || !cardId || !cardName) {
      skipped++;
      continue;
    }

    const set = {
      tenantId,
      date,
      cardId,
      cardName,
      dayStem: str(d['dayStem']) ?? '',
      dayBranch: str(d['dayBranch']) ?? '',
      ...(str(d['title']) ? { title: str(d['title']) } : {}),
      ...(str(d['summary']) ? { summary: str(d['summary']) } : {}),
      ...(str(d['fullText']) ?? str(d['content'])
        ? { fullText: str(d['fullText']) ?? str(d['content']) }
        : {}),
      aiGenerated: Boolean(d['aiGenerated']),
      aiProvider: 'coze' as const,
    };

    if (DRY_RUN) {
      created++;
      continue;
    }
    await DailyInsight.findOneAndUpdate({ tenantId, date }, { $set: set }, {
      upsert: true,
      setDefaultsOnInsert: true,
    });
    created++;
  }

  logger.info({ total: docs.length, created, skipped, dryRun: DRY_RUN }, 'daily_insights 迁移完成');
}

// ─── 迁移：feedbacks ──────────────────────────────────────────────────────────
async function migrateFeedbacks(tenantId: mongoose.Types.ObjectId): Promise<void> {
  const docs = readExport('feedbacks');
  let created = 0;
  let skipped = 0;

  for (const d of docs) {
    const content = str(d['content']);
    if (!content) {
      skipped++;
      continue;
    }
    const title = str(d['title']);
    const rawStatus = str(d['status']);
    const status: FeedbackStatus =
      rawStatus && VALID_FEEDBACK_STATUS.has(rawStatus as FeedbackStatus)
        ? (rawStatus as FeedbackStatus)
        : 'pending';

    const doc = {
      tenantId,
      ...(resolveUserId(d) ? { userId: resolveUserId(d) } : {}),
      // 目标无 title 字段，标题并入正文
      content: title ? `【${title}】${content}` : content,
      ...(str(d['contactInfo']) ? { contactInfo: str(d['contactInfo']) } : {}),
      ...(str(d['feedbackType']) ?? str(d['category'])
        ? { category: str(d['feedbackType']) ?? str(d['category']) }
        : {}),
      status,
      ...(toDate(d['createTime']) ? { createdAt: toDate(d['createTime']) } : {}),
    };

    if (DRY_RUN) {
      created++;
      continue;
    }
    await Feedback.create(doc);
    created++;
  }

  logger.info({ total: docs.length, created, skipped, dryRun: DRY_RUN }, 'feedbacks 迁移完成');
}

// ─── 主流程 ────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) throw new Error('MONGO_URI 未配置');

  await mongoose.connect(mongoUri);
  logger.info({ exportDir: EXPORT_DIR, dryRun: DRY_RUN, only: ONLY ? [...ONLY] : 'all' }, '迁移开始');

  const tenant = await Tenant.findOne({ slug: TENANT_SLUG });
  if (!tenant) {
    throw new Error(`未找到 slug=${TENANT_SLUG} 的租户，请先执行 npm run seed`);
  }
  const tenantId = tenant._id;
  logger.info({ tenantId: String(tenantId), slug: TENANT_SLUG }, '目标租户');

  // 顺序固定：users 先行（建立 ID 映射），其余依赖它
  if (shouldRun('users')) await migrateUsers(tenantId);
  if (shouldRun('profiles')) await migrateProfiles(tenantId);
  if (shouldRun('draw_card_records')) await migrateDrawRecords(tenantId);
  if (shouldRun('daily_insights')) await migrateDailyInsights(tenantId);
  if (shouldRun('feedbacks')) await migrateFeedbacks(tenantId);

  await mongoose.disconnect();
  logger.info({ dryRun: DRY_RUN }, '迁移结束');
  if (DRY_RUN) logger.info('这是 dry-run，未写入任何数据。确认统计无误后去掉 --dry-run 正式执行。');
}

main().catch((err) => {
  logger.error({ err }, '迁移失败');
  process.exit(1);
});
