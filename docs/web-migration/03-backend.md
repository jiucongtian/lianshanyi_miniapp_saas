# 03 — 后端方案（Node.js + Express + MongoDB）

## 1. 技术栈

| 类别 | 选型 | 说明 |
|------|------|------|
| 运行时 | Node.js 20 LTS | 与现有云函数 ES 语法兼容 |
| Web 框架 | Express 4 | 轻量、社区成熟、迁移最快 |
| ORM | mongoose 8 | 文档式模型、自带校验 |
| 数据库 | MongoDB 7 | 与原 NoSQL 结构一致 |
| 缓存 | Redis 7 | 验证码、限频、轻量会话 |
| 校验 | zod | TypeScript 友好、运行时校验 |
| 鉴权 | jsonwebtoken + bcrypt + cookie-parser | JWT + RefreshToken |
| 日志 | pino + pino-http | 结构化、性能好 |
| 定时 | node-cron | 替代腾讯云开发定时触发器 |
| HTTP 客户端 | axios | AI Mock 切换真实 API 后用 |
| 测试 | vitest + supertest | 单元 + 接口测试 |
| 文档 | swagger-jsdoc + swagger-ui-express | OpenAPI 3 自动生成 |

> **语言**：建议 **TypeScript**。强类型对长期维护收益大，且 mongoose + zod 的 TS 支持成熟。如果团队偏好 JS，可保持 JS，方案不变。

## 1.1 单版本原则（明确）

- 后端**不保留**原小程序的多版本机制（`versionManager.js`、`_v1_x` 命名后缀均不迁移）
- 每个原云函数只取**最新版**作为蓝本（具体版本号见 [01 §1.3](./01-overview-and-decisions.md#13-云函数清单11-个--移除后-7-个核心模块) 与 [§5 版本策略简化](./01-overview-and-decisions.md#5-版本策略简化)）
- 模块/文件命名去掉版本号：`userManagement_v1_5` → `services/user.service.ts`、`profileManagement_v1_4` → `services/profile.service.ts`、`localCalculateBazi_v1_3` → `lib/bazi/`
- 路由统一在 `/api/v1` 命名空间下（v1 是对外 API 大版本，非业务多版本）
- 数据库集合名同样**不带版本后缀**：`users`、`profiles`、`draw_card_records` 等
- 没有「客户端版本 → 服务端实现」映射表，没有 `VersionManager` 等价物

## 2. 项目目录

```
lianshanyi-api/
├── src/
│   ├── app.ts                 # Express 应用工厂
│   ├── server.ts              # 启动入口（含信号处理）
│   ├── config/
│   │   ├── env.ts             # zod 校验所有 env 变量
│   │   └── index.ts
│   ├── routes/
│   │   ├── index.ts           # 装配所有路由到 /api/v1
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   ├── profile.routes.ts
│   │   ├── bazi.routes.ts
│   │   ├── card.routes.ts
│   │   ├── dailyInsight.routes.ts
│   │   ├── assistant.routes.ts
│   │   ├── feedback.routes.ts
│   │   └── admin.routes.ts
│   ├── controllers/           # 薄层，仅解析 req/res
│   ├── services/              # 业务逻辑
│   ├── models/                # mongoose Schemas
│   ├── middlewares/
│   │   ├── auth.ts            # JWT 解析、req.user 注入
│   │   ├── requireAuth.ts
│   │   ├── requireAdmin.ts
│   │   ├── rateLimit.ts
│   │   ├── error.ts           # 统一错误转 ResponseEnvelope
│   │   └── requestId.ts
│   ├── lib/
│   │   ├── bazi/              # 移植 localCalculateBazi
│   │   ├── ai/
│   │   │   ├── index.ts       # 出口工厂：根据 env.AI_PROVIDER 返回 adapter
│   │   │   ├── adapter.ts     # interface AiAdapter
│   │   │   ├── mock.adapter.ts
│   │   │   └── coze.adapter.ts  # 后期补
│   │   ├── sms/
│   │   │   ├── index.ts
│   │   │   ├── adapter.ts
│   │   │   ├── mock.adapter.ts
│   │   │   └── aliyun.adapter.ts
│   │   ├── storage/
│   │   │   └── minio.ts       # S3 兼容客户端封装
│   │   └── crypto/
│   ├── jobs/
│   │   ├── index.ts           # 注册 cron
│   │   └── dailyInsight.job.ts
│   ├── seeds/
│   │   ├── staticUserTypes.json
│   │   ├── staticCards.json   # 60 卡基础数据
│   │   └── run.ts             # 一键 seed
│   └── utils/
│       ├── response.ts        # success/fail 包装
│       ├── logger.ts
│       └── pagination.ts
├── tests/
│   ├── unit/
│   └── integration/
├── Dockerfile
├── tsconfig.json
├── package.json
└── .env.example
```

## 3. 数据模型（mongoose）

> 字段尽量沿用现有 schema，仅做必要扩展。

### 3.1 `users`

```ts
const UserSchema = new Schema({
  // 标识
  phone:        { type: String, unique: true, sparse: true, index: true },
  username:     { type: String, unique: true, sparse: true, index: true },
  passwordHash: { type: String },              // bcrypt
  // 资料
  nickName:     { type: String },
  avatarUrl:    { type: String },
  gender:       { type: Number, enum: [0, 1, 2], default: 0 },
  // 权限/分类
  userTypeCode: { type: String, default: 'guest', index: true },
  adminRole:    { type: String, enum: ['none', 'admin', 'super_admin'], default: 'none', index: true },
  // 配额（保留原字段）
  usedProfiles: { type: Number, default: 0 },
  // 状态
  isActive:     { type: Boolean, default: true },
  // 时间
  registrationTime: Date,
  upgradeTime:      Date,
  lastLoginTime:    Date,
}, { timestamps: { createdAt: 'createTime', updatedAt: 'updateTime' } });
```

**与原 schema 差异**：
- 删除 `openid` / `unionid`（不再依赖微信识别）
- 新增 `phone`（唯一稀疏）+ `username`（唯一稀疏）+ `passwordHash`
- 至少一个登录凭据存在；未注册用户走匿名（详见 §6）

### 3.2 `static_user_types`

直接复用原 `static_user_types` 配置表，只是去掉付费相关字段：

```ts
{
  typeCode:     String, // guest / normal / student / premium
  typeName:     String,
  displayName:  String,
  description:  String,
  profileQuota: Number,
  permissions:  [String],      // ['view_card', 'create_profile', 'draw_card', 'use_assistant'...]
  dailyDrawQuota: Number,      // -1 表示无限
}
```

初始 seed 见 `seeds/staticUserTypes.json`：

```json
[
  { "typeCode": "guest",   "typeName": "访客",  "profileQuota": 1,  "permissions": ["view_card"],                          "dailyDrawQuota": 0 },
  { "typeCode": "normal",  "typeName": "探索者","profileQuota": 5,  "permissions": ["view_card","create_profile","draw_card"], "dailyDrawQuota": 3 },
  { "typeCode": "student", "typeName": "学员",  "profileQuota": 30, "permissions": ["view_card","create_profile","draw_card","use_assistant","view_zhifu"], "dailyDrawQuota": 30 },
  { "typeCode": "premium", "typeName": "高级",  "profileQuota": 100,"permissions": ["*"], "dailyDrawQuota": -1 }
]
```

### 3.3 `profiles`

字段与原 schema 一致，仅 `userId` 由 ObjectId 引用：

```ts
{
  userId:      { type: ObjectId, ref: 'User', required: true, index: true },
  profileName: { type: String, required: true },
  birthDate:   { year, month, day, hour, minute, isLunar, isLeapMonth },
  baziData:    {
    year:  { gan, zhi, ganzhiIndex },
    month: { gan, zhi, ganzhiIndex },
    day:   { gan, zhi, ganzhiIndex },
    hour:  { gan, zhi, ganzhiIndex },
    lunarDate: { year, month, day, isLeap }
  },
  gender:           Number,
  isUncertainTime:  Boolean,
  description:      String,
  isActive:         { type: Boolean, default: true },
}
// timestamps
```

去掉原 `openid` 冗余字段，由 `userId` 关联回 users。

### 3.4 `draw_card_records`

```ts
{
  userId:       { type: ObjectId, ref: 'User', required: true, index: true },
  userTypeCode: String,       // 快照
  profileId:    { type: ObjectId, ref: 'Profile' },  // 可选
  question:     String,
  cardNumber:   Number,       // 1-60
  cardName:     String,       // 甲子...癸亥
  aiAnswer:     String,
  aiProvider:   String,       // 'mock' / 'coze' / ...
  drawTime:     Date,
  interpretTime:Date,
  drawDate:     String,       // YYYY-MM-DD（用于配额聚合）
  isActive:     { type: Boolean, default: true }
}
// 复合索引：{ userId: 1, drawDate: 1 }
```

### 3.5 `daily_insights`

```ts
{
  date:        { type: String, unique: true, index: true }, // YYYY-MM-DD
  ganzhi:      String,                                       // 当日干支（甲子等）
  cardNumber:  Number,
  cardName:    String,
  imageUrl:    String,
  insight:     String,                                       // AI 生成解读
  qrCodeUrl:   String,
  aiProvider:  String,
  generatedAt: Date,
}
```

### 3.6 `feedbacks`

```ts
{
  userId:    { type: ObjectId, ref: 'User', required: true, index: true },
  content:   { type: String, required: true, maxlength: 1000 },
  contact:   String,
  category:  String,           // bug / suggestion / praise / other
  images:    [String],         // MinIO URLs
  status:    { type: String, enum: ['open', 'replied', 'closed'], default: 'open' },
  reply:     String,
  repliedAt: Date,
  repliedBy: { type: ObjectId, ref: 'User' },
}
// timestamps
```

### 3.7 `static_cards`（新增，把六十甲子静态数据落库）

```ts
{
  cardNumber:  { type: Number, unique: true }, // 1-60
  cardName:    String,                          // 甲子...癸亥
  gan:         String,
  zhi:         String,
  imagePath:   String,                          // 在 MinIO 的相对路径
  central:     String,                          // 卡牌核心描述
  attributes:  Object                           // 五行/季节等扩展字段（参考 docs/六十甲子卡牌完整数据.json）
}
```

迁移自原 `cloudfunctions/auto_updateDailyInsight/index.js` 中的 `CARD_CENTRAL_MAP` 与 `docs/六十甲子卡牌完整数据.json`。

## 4. 统一响应封装

保持与现有 `ResponseBean` 一致的语义，便于前端复用既有逻辑：

```ts
// 成功
{
  "success": true,
  "code": 0,
  "data": { ... },
  "message": "操作成功",
  "timestamp": 1715000000000
}

// 失败
{
  "success": false,
  "code": "QUOTA_EXCEEDED",  // 字符串或负数
  "error": "今日抽卡次数已用完",
  "data": null,
  "timestamp": 1715000000000
}
```

错误码命名空间见 §10。

## 5. REST API 设计

> 所有 API 前缀 `/api/v1`，全部接收/返回 JSON。除明确标注外都要求 `Authorization: Bearer <jwt>`。

### 5.1 鉴权（`/auth/*`）— 全公开

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/auth/sms/send` | 发送手机号验证码 |
| POST | `/auth/sms/login` | 手机号 + 验证码 登录/注册 |
| POST | `/auth/password/register` | 用户名/手机号 + 密码 注册 |
| POST | `/auth/password/login` | 用户名/手机号 + 密码 登录 |
| POST | `/auth/refresh` | 用 RefreshToken（Cookie）换新 JWT |
| POST | `/auth/logout` | 清除 RefreshToken Cookie |
| POST | `/auth/anonymous` | 申请匿名 guest 用户 token（首次访问可调） |

匿名访客流程：用户首次进入即可由前端调用 `/auth/anonymous` 获取一个 `userTypeCode=guest` 的临时 JWT，允许只读浏览；进入抽卡/创建档案等需要更高权限时再强制完成注册。

### 5.2 用户（`/users/*`）

| 方法 | 路径 | 替换原 action | 说明 |
|------|------|---------------|------|
| GET  | `/users/me` | getUserInfo | 当前用户信息 + 权限 |
| PATCH | `/users/me` | updateUserInfo | 更新昵称/头像/性别 |
| GET  | `/users/me/quota` | checkUserQuota / getQuotaInfo | 配额查询 |
| GET  | `/users/me/permissions` | getUserPermissions | 权限列表 |
| POST | `/users/me/upgrade` | upgradeUserType | guest → normal（仅限完成注册时调） |
| POST | `/users/me/avatar` | (新) | 头像上传（multipart）→ MinIO |

### 5.3 档案（`/profiles/*`）

| 方法 | 路径 | 替换 |
|------|------|------|
| GET    | `/profiles` | getProfiles（分页 ?page&limit&keyword） |
| POST   | `/profiles` | createProfile |
| GET    | `/profiles/:id` | getProfile |
| PATCH  | `/profiles/:id` | updateProfile |
| DELETE | `/profiles/:id` | deleteProfile |

### 5.4 八字（`/bazi/*`）

| 方法 | 路径 | 替换 |
|------|------|------|
| POST | `/bazi/calculate` | (内部, localCalculateBazi) — 仅服务于添加档案时预览计算 |

### 5.5 卡牌（`/cards/*`）

| 方法 | 路径 | 替换 |
|------|------|------|
| GET  | `/cards` | (新) 返回 60 张卡基础数据 |
| GET  | `/cards/:number` | (新) 单张卡详情 |
| POST | `/cards/draw` | cozeFunctions / drawCard | 抽卡 + AI 解读 |
| GET  | `/cards/history` | (新) 用户抽卡历史，分页 |

### 5.6 每日运势（`/daily-insight/*`）

| 方法 | 路径 | 替换 |
|------|------|------|
| GET | `/daily-insight/today` | getTodayCard |
| GET | `/daily-insight/ganzhi/today` | getTodayGanZhi |

### 5.7 助学童子（`/assistant/*`）

| 方法 | 路径 | 替换 |
|------|------|------|
| POST | `/assistant/conversations` | createConversation |
| POST | `/assistant/conversations/:cid/messages` | startChat |
| GET  | `/assistant/conversations/:cid/messages/:mid` | getChatResult |

> Mock 模式下 `POST` 立即返回拼接好的消息，无需轮询。但保留路径形态，便于切真实 AI 时无前端改动。

### 5.8 反馈（`/feedbacks/*`）

| 方法 | 路径 | 替换 |
|------|------|------|
| POST | `/feedbacks` | submitFeedback |
| GET  | `/feedbacks` | getUserFeedbacks（带 ?status） |
| GET  | `/feedbacks/:id` | getFeedbackDetail |

### 5.9 管理员（`/admin/*`，需要 `adminRole != none`）

| 方法 | 路径 | 替换 |
|------|------|------|
| GET    | `/admin/users` | adminSearchUsers（?keyword&type=phone|name） |
| PATCH  | `/admin/users/:id` | adminUpdateUserType |
| DELETE | `/admin/users/:id` | deleteUsers / deleteInactiveUsers |
| GET    | `/admin/feedbacks` | (新) 所有反馈管理 |
| POST   | `/admin/feedbacks/:id/reply` | (新) 回复反馈 |
| GET    | `/admin/stats/overview` | (新) 用户数、今日抽卡数等概览 |

### 5.10 健康检查与诊断

| 方法 | 路径 | 鉴权 |
|------|------|------|
| GET | `/health` | 无 |
| GET | `/version` | 无 |
| GET | `/metrics` | 无（仅内网 IP 白名单） |

## 6. 认证体系详解

### 6.1 用户身份层次

```
Guest (匿名, JWT.userTypeCode='guest')
   └── 可浏览卡牌、查看每日运势
   ↓ 完成注册（手机号或用户名）
Normal (探索者)
   ├── 抽卡 3 次/天、创建 5 个档案
   ↓ 管理员升级
Student (学员)
   ├── 抽卡 30 次/天、使用助学童子
   ↓ 管理员升级
Premium (高级)
   └── 无限制
```

### 6.2 Token 设计

- **Access Token**：JWT，HS256，有效期 15 分钟。Payload：
  ```json
  { "sub": "<userId>", "type": "<userTypeCode>", "admin": "<adminRole>", "iat": ..., "exp": ... }
  ```
- **Refresh Token**：随机 32 字节，存 Redis（`rt:<userId>:<jti>` → 7 天 TTL），同时下发为 `Set-Cookie: rt=<jti>; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth/refresh`
- **Guest Token**：JWT，30 天有效期，无 Refresh。允许只读。

### 6.3 注册流程

#### A. 手机号 + 验证码（推荐路径）
```
1. POST /auth/sms/send  { phone }
   - 限频：同一手机号 60s 一次；同一 IP 5 条/小时
   - Redis: SETEX sms:<phone> 300s <6位code>
   - SMS adapter.send(phone, code)
2. POST /auth/sms/login  { phone, code }
   - 校验 code（取后 DEL）
   - users.findOne({ phone })
       ├── 存在 → 更新 lastLoginTime, 签 token
       └── 不存在 → 创建 user(userTypeCode='normal'), 签 token
```

#### B. 用户名 + 密码
```
1. POST /auth/password/register  { username, password, phone?(可选) }
   - 用户名校验：3-20 位字母/数字/下划线
   - 密码：8+ 位，至少含数字与字母
   - 已存在则 409
2. POST /auth/password/login  { account, password }
   - account 可为 username 或 phone
```

### 6.4 首位超级管理员

由于不再依赖微信 openid 判断管理员，**首次部署需通过命令行创建超管**：

```bash
docker compose exec api npm run admin:create -- --phone=13800000000 --role=super_admin
```

脚本逻辑：
- 直接写入 users 集合，`adminRole='super_admin'`
- 密码通过 stdin 输入，不留命令行历史
- 该账户首次登录后强制改密

### 6.5 权限模型

```
路由 = (Auth?) × (Permission?) × (AdminRole?)
```

中间件组合：
```ts
router.get('/cards/draw',
  requireAuth,                          // 必须登录
  requirePermission('draw_card'),       // 当前 userType 必须含该权限
  CardController.draw
);

router.delete('/admin/users/:id',
  requireAuth,
  requireAdmin('super_admin'),          // 超管才能删
  AdminController.deleteUser
);
```

## 7. AI 适配器（Mock 优先，接口先行）

```ts
// lib/ai/adapter.ts
export interface AiAdapter {
  interpret(args: { card: Card; bazi: BaziData; question?: string }): Promise<string>;
  dailyInsight(args: { ganzhi: string; date: string }): Promise<string>;
  chat(args: { conversationId?: string; message: string; history: ChatMsg[] }): Promise<{
    conversationId: string;
    content: string;
  }>;
}
```

Mock 实现：
- `interpret`：根据 card.central + question 拼接固定模板（80% 内容来自卡牌数据，20% 占位）
- `dailyInsight`：固定模板 + 当日干支替换
- `chat`：随机从 15 条预设回复中选一条，1-2 秒延迟模拟思考

切换真实 AI 仅需新增 `coze.adapter.ts` 并改 env：`AI_PROVIDER=coze`。

## 8. 短信适配器

```ts
// lib/sms/adapter.ts
export interface SmsAdapter {
  sendCode(phone: string, code: string): Promise<void>;
}
```

Mock 实现：直接 `logger.info('SMS code', { phone, code })`。开发期开发者可在日志查到验证码，跳过短信网关。

接入真实短信（如阿里云 dysmsapi）后只需替换 env：`SMS_PROVIDER=aliyun`。

## 9. 八字计算库迁移

原 `cloudfunctions/localCalculateBazi_v1_3/` 内含完整农历转换 + 干支计算。迁移步骤：
1. 复制整个目录到 `lianshanyi-api/src/lib/bazi/`
2. 去掉 `wx-server-sdk` 引用，仅保留 `calculateBazi(birthDate)` 纯函数
3. 写单元测试覆盖：公历→八字、农历→八字、闰月、子时跨日等边界

## 10. 错误码规范

```
1XX  系统级（DB/网络/未知）
2XX  鉴权（未登录/Token 失效/权限不足）
3XX  参数校验
4XX  业务（配额/状态冲突等）
5XX  外部依赖（短信/AI/MinIO）
```

代码层面用字符串常量，前端展示用 `message`：

```ts
export const ErrorCode = {
  AUTH_REQUIRED:     'AUTH_REQUIRED',
  AUTH_INVALID:      'AUTH_INVALID',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  QUOTA_EXCEEDED:    'QUOTA_EXCEEDED',
  SMS_RATE_LIMITED:  'SMS_RATE_LIMITED',
  RESOURCE_NOT_FOUND:'RESOURCE_NOT_FOUND',
  AI_UNAVAILABLE:    'AI_UNAVAILABLE',
} as const;
```

## 11. 速率限制

`middlewares/rateLimit.ts` 基于 Redis 滑动窗口：

| 接口 | 限制 |
|------|------|
| `/auth/sms/send` | 1 条/60s/phone，5 条/小时/phone，10 条/小时/IP |
| `/auth/*/login` | 5 次/小时/IP，登录失败 5 次 → 锁定 15 分钟 |
| `/cards/draw` | 由业务层 dailyDrawQuota 控制 |
| 默认 | 全局 100 req/分钟/IP |

## 12. 日志与审计

- 所有改写型 admin 接口（删用户、改类型、回复反馈）记录审计日志到 `audit_logs` 集合
- 字段：`actorUserId`, `action`, `targetType`, `targetId`, `before`, `after`, `ip`, `userAgent`, `timestamp`

## 13. 测试策略

- **单元**：service / lib 纯函数覆盖率 ≥ 80%（按全局 80% 标准）
- **接口**：所有路由的 happy path + 至少 1 个失败路径
- **关键路径** E2E：注册 → 创建档案 → 抽卡 → 查看历史

参考全局 [testing.md](~/.claude/rules/common/testing.md)。

## 14. 环境变量约定

```bash
# 运行
NODE_ENV=production
PORT=3000
APP_BASE_URL=https://www.example.com

# 数据
MONGO_URI=mongodb://mongo:27017/lianshanyi
MONGO_DB=lianshanyi
REDIS_URL=redis://redis:6379

# 鉴权
JWT_SECRET=<生成>
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
COOKIE_DOMAIN=.example.com

# 适配器开关
AI_PROVIDER=mock      # mock | coze
SMS_PROVIDER=mock     # mock | aliyun | tencent

# 外部凭据（生产填）
COZE_TOKEN=
COZE_BOT_ID=
COZE_WORKFLOW_DRAW=
COZE_WORKFLOW_BAZI=
ALIYUN_SMS_ACCESS_KEY_ID=
ALIYUN_SMS_ACCESS_KEY_SECRET=
ALIYUN_SMS_SIGN_NAME=
ALIYUN_SMS_TEMPLATE_CODE=

# 对象存储
MINIO_ENDPOINT=minio:9000
MINIO_PUBLIC_URL=https://cdn.example.com
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
MINIO_BUCKET=lianshanyi

# 限流
RATE_LIMIT_GLOBAL=100/m
```

完整列表见 `.env.example`（实现阶段产出）。
