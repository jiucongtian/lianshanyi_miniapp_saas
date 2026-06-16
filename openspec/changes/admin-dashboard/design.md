## Context

平台后端为 `apps/api`（Express + TypeScript + Mongoose），C 端为 `apps/web`（Vue3 + Vant，移动端），基础设施由 docker-compose 编排（mongo/redis/minio + api + web）。开放平台 OpenAPI 已上线，凭据通过 HMAC 鉴权，`OpenApp` 模型已具备 appId/secretEnc/scopes/status/rateLimit，且 `/open-apps` 已有 CRUD 接口（受 `ADMIN_SCOPES.OPEN_APP_MANAGE` 保护）。当前痛点：运营全靠脚本和环境变量，无统一带鉴权的后台面板。

约束：
- 复用现有后端鉴权链（`authenticate` → `jwtStrategy` → `requireScope`）与 `User.isAdmin`。
- 敏感数据加密已有 `lib/crypto/app-secret.ts`（AES-256-GCM，依赖 `OPENAPI_SECRET_ENC_KEY`）。
- 开发环境 api 以 `tsx watch` 挂载源码热重载。
- 不引入登录态以外的新认证体系（用户决策：复用 isAdmin + 密码登录）。

## Goals / Non-Goals

**Goals:**
- 新建独立桌面端 `apps/admin`，统一收敛凭据、AI 配置、租户、用户/反馈、调用日志等运营能力。
- 管理员鉴权复用 `isAdmin` + 密码登录，新增 `requireAdmin` 后端边界与前端路由守卫。
- OpenApp 增加 `remark`；AI 配置从环境变量迁移到可持久化、可视化、加密存储的系统配置。
- 消除明文 Token 进 git 的风险。

**Non-Goals:**
- 不实现独立 AdminUser 体系、细粒度 RBAC 角色矩阵（后续可演进）。
- 不重写现有 OpenAPI 业务接口与 HMAC 鉴权逻辑。
- 不在本次移除 `apps/web` 的 `AdminPage.vue`（仅标记废弃，迁移完成后另行清理）。
- 不做多语言、审计留痕导出等增强功能。

## Decisions

### 决策 1：独立 `apps/admin` + Element Plus（而非复用 apps/web）
后台是桌面端、表格/表单密集，Vant（移动端）不适用。独立应用隔离构建、路由、UI 库，避免污染 C 端包体。选用 Element Plus：Vue3 生态成熟、表格/表单/弹窗开箱即用。
- 备选：复用 apps/web + Vant → 被否，UI 范式不匹配；Ant Design Vue → 可选，但团队若已熟悉 Element 则优先。

### 决策 2：管理员鉴权复用 isAdmin + 密码登录
复用 `auth.service.loginWithPassword` 与 `jwtStrategy`（admin 角色已映射 `ALL_SCOPES`）。新增：
- 后端 `requireAdmin` 中间件：在 `authenticate('jwt')` 之后校验 `principal` 对应用户 `isAdmin===true`（principal 需带 `isAdmin` 或后台登录接口单独校验）。
- 后台登录接口 `POST /admin/auth/login`：调用密码登录后强制校验 `isAdmin`，非管理员返回 403 `FORBIDDEN_ADMIN`。
- 备选：独立 AdminUser 表 → 被否（用户决策），工作量大且当前单租户运营场景无需。

### 决策 3：系统配置持久化到 `app_config` 集合
新增 `AppConfig` 模型（单文档或按 key 存储），存 AI provider、Coze token（加密）、workflow/bot ID。`getAiAdapter()` 与 `coze.adapter.ts` 改为运行时从配置服务读取，缺失回退环境变量。配置写入后清除适配器内存缓存以即时生效。
- 敏感字段复用 `encryptSecret/decryptSecret`；读取接口对 token 掩码返回。
- 备选：继续用环境变量 → 被否，无法可视化、改一次要重启容器。

### 决策 4：后端新增 `/admin/*` 路由树，最大化复用 service
新增 `routes/admin/`（auth、credentials、ai-config、accounts、users、feedbacks、logs、dashboard），控制器尽量薄，直接复用现有 `open-app.service`、`tenant.service`、`user.service`、`feedback.service`，仅新增 `app-config.service` 与日志/统计查询。`/open-apps` 既有接口可保留或由 `/admin/credentials` 收敛（实现时统一到 admin 树并加 `requireAdmin`）。

### 决策 5：OpenApp 增加 `remark` 字段
`open-app.model.ts` 加 `remark?: string`；`createApp`/新增 `updateApp` 支持写入；`toJSON` 保留 remark、继续删除 secretEnc。

### 决策 6：Docker 集成
新增 `apps/admin/Dockerfile`（development target，源码挂载热更新）与 compose 服务 `lsy-admin`（如 `127.0.0.1:5174`）。AI 配置迁移后，compose 中 `COZE_API_TOKEN` 可改回占位/移除，改由后台配置（首次仍可用环境变量种子）。

## Risks / Trade-offs

- [管理员与普通用户共用 User 表] → `requireAdmin` 强校验 `isAdmin`；后台登录接口二次校验；admin 账户用强密码并通过 `admin:create` 脚本创建。
- [AI 配置迁移引入运行时 DB 依赖] → 保留环境变量兜底；配置读取加内存缓存 + 失效机制；DB 不可用时回退环境变量，不阻断 AI 调用。
- [明文 Secret/Token 暴露面] → Secret 仅生成/轮换时一次性返回；配置读取一律掩码；加密密钥 `OPENAPI_SECRET_ENC_KEY` 必须配置且与 DB 分离保存。
- [`/open-apps` 与 `/admin/credentials` 双入口] → 实现时统一到 admin 树，旧路由保留兼容或重定向，避免鉴权口径不一致。
- [独立前端增加维护成本] → 仅引入必要依赖；与 apps/web 共享 API 信封约定与类型定义（可抽公共类型）。

## Migration Plan

1. 后端：加 `requireAdmin`、`AppConfig` 模型/服务、`/admin/*` 路由；`OpenApp` 加 `remark`；`coze.adapter`/`getAiAdapter` 接入配置服务（带环境变量兜底）。
2. 数据：首次启动用现有环境变量种子化 `app_config`（迁移脚本），保证切换平滑。
3. 前端：脚手架 `apps/admin`，实现登录 + 各模块页面。
4. 部署：compose 增加 `lsy-admin`；验证后将明文 `COZE_API_TOKEN` 从 compose 收敛到后台配置。
5. 回滚：AI 适配器保留环境变量兜底，回退只需移除 `/admin` 服务并恢复 compose 环境变量；不破坏既有 OpenAPI 调用。

## Open Questions

_以下问题已确认，无遗留待定项。_

| 问题 | 决策 |
|------|------|
| `app_config` 结构 | 单例文档：`{ ai: { provider, cozeTokenEnc, ... } }` |
| `/open-apps` 旧路由 | 本次实现时立即下线，统一收敛到 `/admin/credentials` |
| 数据看板聚合方式 | 实时聚合（`$aggregate`）；当前量级完全够用，日志量级增大后再引入预聚合 |
| 管理员改密码 | 后台内支持「修改密码」页（`PUT /admin/auth/password`，需校验旧密码）|
