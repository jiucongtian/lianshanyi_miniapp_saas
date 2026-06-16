## Why

平台已上线身心游开放平台（OpenAPI Platform），但所有运营配置目前只能靠手工脚本和环境变量完成：OpenAPI 凭据要进容器跑 `create-test-cred.ts`、AI provider/Coze Token 只能改 `docker-compose.yml` 重启、用户与反馈管理只有一个嵌在 C 端 web 里的移动端 `AdminPage.vue`。缺少一个统一、带权限校验的后台管理面板，运营和联调工作既低效又容易出错（如本次联调中人工誊写 App Secret 出错、Token 明文进配置文件等）。

本变更新建一个独立的桌面端管理后台 dashboard，把凭据签发、AI 配置、租户配置、用户/反馈、调用日志等运营能力收敛到一个需管理员鉴权的统一面板。

## What Changes

- 新建独立桌面端前端应用 `apps/admin`（Vue3 + Element Plus），与移动端 `apps/web` 完全分离，独立路由/布局/构建/Docker 服务。
- 新增管理员登录与鉴权流程：复用现有 `User.isAdmin` + 密码登录（bcrypt），新增前端登录页、路由守卫、后端 `requireAdmin` 中间件，保护所有 `/admin/*` 与管理类接口。
- **OpenAPI 凭据管理**：可视化生成/列表/查看 App ID 与 App Secret、轮换密钥、启停、编辑 scopes 与限流；为 `OpenApp` 模型新增 `remark`（备注信息）字段；App Secret 仅在生成/轮换时一次性明文返回并提供一键复制。
- **AI 服务配置**：将 AI provider（mock/coze）切换、`COZE_API_TOKEN`、各 workflow/bot ID 从环境变量迁移为后台可视化配置（持久化到数据库，运行时读取，敏感字段加密存储）。
- **租户/Account 管理**：管理 Tenant/Partner 的主题配置、限流额度、IP 白名单、状态启停。
- **用户 & 反馈管理**：把现有移动端 AdminPage 的用户管理、反馈管理迁移并增强到桌面后台（搜索、分页、用户类型修改、反馈处理）。
- **调用日志 & 数据看板**：OpenAPI 调用日志（`open-api-log`）查询、用量统计、抽卡记录、每日愈见数据看板。
- 移动端 `apps/web` 内的 `AdminPage.vue` 标记为废弃（迁移完成后移除），不属于本次破坏性变更范围。

## Capabilities

### New Capabilities
- `admin-auth`: 管理员登录、会话/令牌、前端路由守卫、后端 `requireAdmin` 鉴权，限定 `isAdmin` 用户访问后台。
- `admin-dashboard-shell`: 独立桌面端后台应用骨架（`apps/admin`）——布局、导航、统一 API 客户端、错误处理、构建与 Docker 集成。
- `openapi-credential-management`: OpenAPI 凭据全生命周期管理（生成、列表、查看、轮换密钥、启停、编辑 scopes/限流/备注）。
- `ai-service-config`: AI provider 与 Coze 相关配置（token、workflow/bot ID）的持久化与可视化管理。
- `account-management`: 租户/Account 的主题、限流、IP 白名单、状态管理。
- `admin-user-feedback`: 后台用户管理与反馈管理（搜索、分页、用户类型修改、反馈处理）。
- `admin-operations-dashboard`: OpenAPI 调用日志查询、用量统计与运营数据看板。

### Modified Capabilities
<!-- 无现有 openspec/specs，故无需求级修改 -->

## Impact

- **新增前端**：`apps/admin/`（Vue3 + Vite + Element Plus + Pinia + Vue Router），新增 Dockerfile 与 docker-compose 服务（如 `lsy-admin`）。
- **后端 API**：新增 `apps/api/src/routes/admin/*` 路由树与 `admin/*` 控制器；新增 `requireAdmin` 中间件；新增 `AppConfig`（系统配置）模型与服务；扩展 `OpenApp` 模型（`remark` 字段）与 `open-app.controller`（支持 remark）。
- **数据模型**：新增 `app_config` 集合（持久化 AI/系统配置，敏感字段加密）；`OpenApp` 增加 `remark`。
- **配置/部署**：AI 配置由环境变量迁移到 DB 后，`coze.adapter.ts` 与 `getAiAdapter()` 需支持从配置服务读取（保留环境变量兜底）；`docker-compose.yml` 不再需要明文 `COZE_API_TOKEN`。
- **复用现有**：`/open-apps` CRUD、`ADMIN_SCOPES`、`jwt-strategy`、`auth.service.loginWithPassword`、`open-api-log` / `feedback` / `user` / `tenant` 模型与服务。
- **安全**：消除明文 Token 进 git 仓库的风险；新增后台鉴权边界；敏感配置加密存储（复用 `app-secret.ts` 的 AES-256-GCM 能力）。
