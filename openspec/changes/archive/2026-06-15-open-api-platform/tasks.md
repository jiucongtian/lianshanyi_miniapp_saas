## 1. 统一身份与上下文模型

- [x] 1.1 定义 `Principal` 类型（`callerType`、`contextId`、`subjectUserId`、`scopes`）并扩展 `Express.Request`，挂 `req.principal`
- [x] 1.2 将 `Tenant` 泛化为 `Account` 模型：加 `type:'tenant'|'partner'`、`status`、`aiConfig`、`limits`、可选 `ipWhitelist`；`tenant` 类型保留展示配置
- [x] 1.3 新增应用凭据模型 `OpenApp`：`appId`(唯一索引)、`secretEnc`(AES-256-GCM 密文)、`name`、`accountId`(绑定 Account)、`scopes[]`、`status`、`rateLimit{windowMs,max}`、时间戳
- [x] 1.4 新增审计日志模型 `OpenApiLog`：`appId`/`contextId`、`path`、`scope`、`statusCode`、`code`、`latencyMs`、`createdAt`（TTL 索引）
- [x] 1.5 定义 scope 体系常量：平台类（`bazi:calculate`、`ai:chat`）、数据类（`profile:*:self|any`、`card:draw`…）、管理类（`tenant:manage`…）及角色→scope 映射

## 2. 鉴权策略与解析层

- [x] 2.1 新增 `src/lib/crypto/sign.ts`：`buildSignString()`、`hmacSha256()`、`timingSafeCompare()`
- [x] 2.2 实现 `appSecret` 生成、AES-256-GCM 加解密（主密钥 `OPENAPI_SECRET_ENC_KEY`）、按 appId 内存 LRU 缓存（轮换/禁用失效）
- [x] 2.3 实现 `JWT 策略`：解析 Bearer → 产出 `Principal`（contextId 取 JWT 声明或 slug、subject=登录用户、scopes=角色映射）
- [x] 2.4 实现 `HMAC 策略`：验签 + timestamp 窗口 + 可选 Redis nonce 防重放（不可用降级 + 告警）→ 产出 `Principal`（contextId 取凭据绑定、subject=actAsUserId、scopes=凭据授权）
- [x] 2.5 新增 `authenticate` 中间件：按门面声明的策略集合分流校验，统一注入 `req.principal`
- [x] 2.6 为签名与策略编写单测（正确/篡改签名、过期时间戳、重复 nonce、两策略产出 Principal）

## 3. 统一授权

- [x] 3.1 新增 `requireScope(scope)` 中间件：仅基于 `Principal.scopes` 校验，对所有 callerType 一致
- [x] 3.2 实现 `:self`/`:any` 约束：`:self` 强制 `subjectUserId==本人`；`:any` 可代操作 context 内用户
- [x] 3.3 实现「S2S 上下文只认绑定、忽略租户头」与「数据类 scope 必须绑定上下文」两条安全校验
- [x] 3.4 为授权编写单测（缺 scope 403、self 越权 403、any 放行、S2S 租户头被忽略）

## 4. 凭据与 Account 管理

- [x] 4.1 新增 `open-app.service.ts`：`createApp/listApps/getApp/rotateSecret/setStatus/updateScopes`、`findActiveByAppId`
- [x] 4.2 `createApp/rotateSecret` 仅返回一次性 `appSecret` 明文，库内只存密文；轮换即时失效旧密钥
- [x] 4.3 实现「数据类 scope 仅能授予已绑定 Account 的凭据」签发校验
- [x] 4.4 新增管理路由 `/api/v1/open-apps`（含 Account 维护），全程要求管理类 scope
- [x] 4.5 为 service 与管理接口编写测试（创建、轮换失效、禁用、非管理员被拒、数据 scope 约束）

## 5. 门面与流水线

- [x] 5.1 新增对外错误码 `src/lib/openapi/response.ts` 与 `sendOk/sendErr` 统一信封助手
- [x] 5.2 在 `app.ts` 挂载两个门面共享下游：`/api/v1`（接受 JWT，含自有后台 HMAC）、`/openapi/v1`（仅 HMAC）
- [x] 5.3 全局限流已存在，对外门面沿用（按 appId 的细粒度限流可在凭据 rateLimit 字段基础上按需扩展）
- [x] 5.4 新增审计中间件：`res.on('finish')` 异步写 `OpenApiLog`，脱敏（不记录 secret/完整签名）
- [x] 5.5 编写隔离/契约回归测试：内部 JWT 打 `/openapi/v1` 被拒、外部签名打 `/api/v1` 无效、对外 DTO 不含内部 `raw`

## 6. 对外业务能力

- [x] 6.1 新增 `controllers/openapi/bazi.controller.ts` + zod 校验，复用 `computeBazi()`，显式映射为稳定对外 DTO（剥离 `raw`），scope `bazi:calculate`
- [x] 6.2 新增 `controllers/openapi/ai.controller.ts` + zod 校验，复用 `getAiAdapter()`，AI 配置取自绑定 Account，上游错误脱敏，scope `ai:chat`（单轮，不透传 conversationId）
- [x] 6.3 新增 `routes/openapi/index.ts`：挂 `POST /bazi/calculate`、`POST /ai/chat`、`GET /ping`
- [x] 6.4 为两接口编写带签名的集成测试（成功、入参校验失败、scope 不足、限流）

## 7. 配置、文档与收尾

- [x] 7.1 新增环境变量（`OPENAPI_SIGN_WINDOW_MS`、`OPENAPI_SECRET_ENC_KEY`、nonce 开关等）并更新「环境变量配置指南」
- [x] 7.2 新增 `scripts/create-open-app.ts` 便于签发首个测试凭据（含绑定 Account）
- [x] 7.3 校对对外文档 `docs/api/openapi-integration-guide.md` 与最终实现一致（签名、错误码、bazi/ai schema）
- [x] 7.4 端到端联调：签发凭据 → 签名调用 bazi/ai → 审计落库 → 验证限流与跨租户红线
- [x] 7.5 运行 `npm run lint`、`npm run typecheck`、`npm test`，覆盖率达标后提交
