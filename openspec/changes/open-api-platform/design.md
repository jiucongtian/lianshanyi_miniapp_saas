## Context

`apps/api` 是连山易后端：Express 4 + TypeScript + Mongoose。现状所有路由挂在 `/api/v1`，链路为 `helmet` → `cors` → body 解析 → 全局限流 → `resolveTenant`（解析 `X-Tenant-Slug`）→ 业务路由 → `requireAuth/requireUser/requireAdmin`（JWT）。核心能力已是可复用内部模块：八字 `src/lib/bazi/index.ts#computeBazi`，AI `src/lib/ai/adapter.ts#getAiAdapter`。数据访问用 Repository 模式并注入租户。

目标是用**一套系统**同时交付：自有小程序/Web 客户端、自有及租户的服务端、外部第三方应用。关键约束与机会：**Web/小程序与租户系统尚未上线**，故可一次性统一建模、无迁移包袱。难点在于这三类调用方的**安全能力不同**——客户端无法安全保存密钥，服务端可以——因此不可能用单一鉴权方式，但可以统一其余一切。

## Goals / Non-Goals

**Goals:**
- 一套内核：统一身份模型、统一授权模型、共享业务逻辑与数据层，长期只维护一套。
- 鉴权方式可插拔：客户端用 JWT，服务端用 appId+appSecret 签名，归一为同一 `Principal`。
- 对外契约与内部演进解耦：对外精选门面 + 稳定 DTO，内部随意重构不破坏第三方。
- 复用既有 `computeBazi`/AI adapter，零重复业务逻辑。

**Non-Goals:**
- 不做 OAuth2 用户授权码流程（对服务端是「应用级」授权）。
- 不实现计费/账单（仅落审计，为后续计量留数据）。
- 不把两种鉴权强行合并成一种（客户端不能持密钥，物理约束）。
- 不在本期提供第三方自助开发者门户 UI（管理员后台签发凭据）。

## Decisions

### 1. 一套内核 + 两个薄门面（不是两套系统）
统一发生在**身份/授权/业务/数据**四层；前面留一个薄「鉴权适配层」按凭据分流。路由保留两个门面但共享同一条下游流水线：
- `/api/v1`：内部全量面，随前端快速演进。
- `/openapi/v1`：对外精选子集 + 稳定 DTO，独立版本与契约。

保留两个门面恰恰是为了**保护**：内部接口怎么重构，只要不动 `/openapi/v1` 的薄映射层，第三方契约就不变。砍成单门面会丢掉这层契约隔离。维护成本在内核（一套），契约隔离在门面（很薄）。
- 备选：单一 URL 同时收 JWT 与签名 —— 否决，内部演进会直接外泄、破坏第三方契约；且无法做对外接口的精选与冻结。

### 2. 统一身份 `Principal`：下游只认它
鉴权层把任意凭据归一为：
```
Principal {
  callerType:    'user' | 'service'    // 唯一因鉴权方式而异的字段
  contextId:     string                // 所属 Account 上下文（必有）
  subjectUserId: string | undefined    // 被操作的终端用户
  scopes:        string[]              // 能干什么
}
```
授权与业务层 MUST 只依赖 `Principal`，不感知鉴权方式。新增鉴权方式只要产出合法 `Principal`，下游零改动。
- 这是整套统一的枢纽，替代现状里散落的 `req.user` + `req.tenant` + 新增的 `req.openApp`。

### 3. 鉴权：可插拔策略（JWT / HMAC）
`authenticate` 中间件按请求所带凭据选择策略：
- **JWT 策略**：解析 `Authorization: Bearer`，`contextId` 取自 JWT 声明或 `X-Tenant-Slug`，`subjectUserId` = 登录用户，`scopes` = 角色映射。
- **HMAC 策略**：解析 `X-App-Id` + 签名头，验签后 `contextId` 取自**凭据绑定**，`subjectUserId` = 请求所带 `actAsUserId`，`scopes` = 凭据授权集。

每个门面声明接受的策略集合：`/api/v1` 接受 JWT（及自有后台的 HMAC），`/openapi/v1` 仅接受 HMAC。
- 备选：纯静态 Bearer token —— 否决，无法防重放、泄露即长期可用。

### 4. HMAC 签名与密钥存储
签名串 = `HMAC_SHA256(appSecret, method + "\n" + path + "\n" + timestamp + "\n" + nonce + "\n" + sha256(body))`，头携带 `X-App-Id / X-Timestamp / X-Nonce / X-Signature`。HMAC 需双方共享原始密钥，故服务端必须能恢复 `appSecret`：**AES-256-GCM 加密存储 `secretEnc`，主密钥 `OPENAPI_SECRET_ENC_KEY` 与库分离**；明文仅签发/轮换当次返回一次。验签解密后用 `crypto.timingSafeEqual` 比较；解密结果按 `appId` 内存 LRU 缓存（禁用/轮换失效）。
- 强制集成模式：`appSecret` 是服务端凭据，MUST NOT 下发客户端；第三方/租户必须由其**后台**统一代理调用（Server-to-Server）。

### 5. 防重放：timestamp 窗口 + 可选 Redis nonce
`timestamp` 必须在 ±`OPENAPI_SIGN_WINDOW_MS`（默认 5min）内；`nonce` 窗口内写 Redis（TTL=窗口），命中即 `REPLAY_DETECTED`。Redis 不可用时降级为仅时间窗口校验 + 告警，不阻断。

### 6. 统一授权：一切皆 scope
授权层只认 `Principal.scopes`，对所有 `callerType` 一视同仁。用户角色映射为 scope 集；应用凭据的授权也是 scope 集。`:self`/`:any` 表达作用范围：`:self` 要求 `subjectUserId` = 本人，`:any` 可操作 context 内任意用户。
```
普通用户 → profile:*:self, card:draw, ai:chat
管理员   → profile:*:any, tenant:manage, ...
租户后台 → （其 context 内）profile:*:any, card:draw
第三方   → bazi:calculate, ai:chat
```

### 7. `Account` 上下文：泛化租户，消除特例
`Tenant` 泛化为 `Account`，加 `type: tenant | partner`。每个 `Principal` 绑定一个 `Account`，AI 配置（`aiConfig`）、限额（`limits`）统一从中读取。`tenant` 类型额外承载客户端展示配置（主题/文案，仅前端用），`partner` 类型忽略之。第三方也是一个 `Account`，不再是「无租户」的分支特例。

### 8. 两条安全红线
- **S2S 上下文只认绑定**：HMAC 策略的 `contextId` 仅取自凭据绑定，MUST NOT 信任任何请求头中的租户标识（否则跨租户越权）。
- **数据类 scope 必须绑定上下文**：`profile:*`、`card:draw` 等数据能力只能授予已绑定 `Account` 的凭据；平台能力（`bazi`/`ai`）无此约束。

### 9. 复用而非复制
对外控制器调 `computeBazi(input)` 与 `getAiAdapter().assistantChat(...)`，在门面层将内部结果**显式逐字段映射**为稳定对外 DTO（默认剥离 `raw`）。内部结构变更只改映射层。

## Risks / Trade-offs

- [统一鉴权层是这次最大改动] → 因尚未上线，全为新写、无迁移；用 `Principal` 收口，业务/数据层基本不动。
- [service 凭据绑定租户后 = 该租户全体用户的总钥匙] → scope 最小化、默认不发数据类 scope；密钥轮换 + IP 白名单 + 每次跨用户访问审计 `actAsUserId`；数据类凭据轮换更频。
- [HMAC 需可恢复 appSecret] → 主密钥与库分离（环境/KMS），明文仅签发回显一次，库泄露单独不足以恢复。
- [对外接口被刷量 / DoS] → 按 appId/用户限流 + 全局兜底 + 审计告警；AI 额外配额。
- [Redis 不可用导致防重放失效] → 降级为时间窗口校验 + 告警，可接受短时退化。
- [对外暴露增大攻击面] → 门面精选 + 入参 zod 校验 + 错误脱敏 + helmet。

## Migration Plan

1. 统一层：`Principal` 类型、`authenticate` + JWT/HMAC 策略、`requireScope`、签名库 + AES-GCM + 防重放。
2. 模型：`Account`（泛化 Tenant）、应用凭据、审计日志。
3. 授权：scope 体系与角色→scope 映射、`:self`/`:any` 约束、数据类 scope 绑定校验。
4. 门面：`app.ts` 挂载 `/api/v1` 与 `/openapi/v1`，共享下游；对外 DTO 映射。
5. 对外能力：bazi、ai 控制器 + 入参校验，端到端联调。
6. 管理端 + 文档（`docs/api/`）+ 签发首个测试凭据。
- **回滚**：移除 `/openapi/v1` 挂载与对外控制器即可；内核与内部面不受影响。

## Open Questions

- 审计日志存 Mongo 还是接入现有可观测体系（pino → 外部采集）？默认先 Mongo + TTL。
- AI 接口是否需要流式（SSE）对外？本期非流式，按需扩展。
- 是否启用 IP 白名单作为签名外二次防护？预留 `Account/凭据.ipWhitelist`，本期不强制。
- 第三方若需「其终端用户直连」：后续可加短期令牌签发（后台用 `appSecret` 换限 scope、短时效 token 下发端上），本期不实现，叠加式扩展，不影响当前架构。
