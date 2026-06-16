## 1. 后端：管理员鉴权 (admin-auth)

- [x] 1.1 新增 `requireAdmin` 中间件：在 `authenticate('jwt')` 后校验对应用户 `isAdmin===true`，否则返回 403 `FORBIDDEN_ADMIN`
- [x] 1.2 在 `Principal` / `jwtStrategy` 中透传 `isAdmin`（或在中间件内回查 user），确保 `requireAdmin` 可判定
- [x] 1.3 新增后台登录接口 `POST /admin/auth/login`：复用 `auth.service.loginWithPassword`，成功后强制校验 `isAdmin`，非管理员返回 403
- [x] 1.6 新增改密码接口 `PUT /admin/auth/password`：校验旧密码（bcrypt compare）后更新 `passwordHash`，需 `requireAdmin`
- [x] 1.4 新增 `routes/admin/index.ts` 路由树并在 `routes/index.ts` 挂载 `/admin`，全树套用 `requireAdmin`（登录接口除外）
- [ ] 1.5 为 `requireAdmin`、`/admin/auth/login` 编写集成测试（无令牌 401、普通用户 403、管理员通过）

## 2. 后端：系统配置模型与服务 (ai-service-config)

- [x] 2.1 新增 `models/app-config.model.ts`（单例文档：`{ ai: { provider, cozeTokenEnc, cardDrawWorkflowId, dailyInsightWorkflowId, assistantBotId } }`）
- [x] 2.2 新增 `services/app-config.service.ts`：读取/更新配置，Token 用 `encryptSecret` 加密、读取时掩码；带内存缓存与失效
- [x] 2.3 改造 `lib/ai/adapter.ts` 的 `getAiAdapter()` 与 `coze.adapter.ts`：运行时优先读 `app-config`，缺失回退环境变量；配置更新后清缓存
- [x] 2.4 新增种子脚本：用现有环境变量初始化 `app_config`，保证迁移平滑
- [x] 2.5 新增 `GET/PUT /admin/ai-config` 控制器与「测试连接」`POST /admin/ai-config/test`
- [ ] 2.6 为 app-config 服务（加密/掩码/回退）与适配器读取编写单元/集成测试

## 3. 后端：OpenAPI 凭据管理 (openapi-credential-management)

- [x] 3.1 `open-app.model.ts` 新增 `remark?: string` 字段，`toJSON` 保留 remark
- [x] 3.2 `open-app.service.ts` / `open-app.controller.ts` 的 create 支持 `remark`，新增 `updateApp`（编辑 remark/scopes/限流）
- [x] 3.3 在 `/admin/credentials` 下收敛凭据 CRUD（list/create/get/rotate-secret/status/scopes/update），统一套 `requireAdmin`
- [x] 3.4 确认 list/get 不返回任何形式 Secret；create/rotate 一次性返回明文 Secret
- [ ] 3.5 更新/新增集成测试覆盖 remark、updateApp、轮换后旧 Secret 失效、禁用后调用被拒

## 4. 后端：租户/Account 管理 (account-management)

- [x] 4.1 新增 `/admin/accounts` 路由与控制器，复用 `tenant.service`（list/search/get/update/setStatus）
- [x] 4.2 支持编辑主题配置、`limits`（maxUsers/aiCallsPerDay）、`ipWhitelist`、状态 trial/active/suspended
- [ ] 4.3 编写集成测试（编辑限流、IP 白名单、suspended 后关联凭据调用被拒）

## 5. 后端：用户 & 反馈管理 (admin-user-feedback)

- [x] 5.1 新增 `/admin/users` 路由：复用 `user.service`，支持搜索/分页/修改 userType
- [x] 5.2 新增 `/admin/feedbacks` 路由：复用 `feedback.service`，支持按状态过滤/分页/标记已处理
- [ ] 5.3 编写集成测试（搜索、改类型、按状态筛选、处理反馈）

## 6. 后端：调用日志 & 数据看板 (admin-operations-dashboard)

- [x] 6.1 新增 `/admin/logs` 路由：查询 `open-api-log`，支持 appId/时间范围/路径/状态码过滤与分页
- [x] 6.2 新增 `/admin/dashboard/usage`：按凭据/接口/时间维度聚合调用量、成功率、平均耗时
- [x] 6.3 新增 `/admin/dashboard/overview`：汇总抽卡记录、每日愈见生成数等运营指标
- [ ] 6.4 编写集成测试（按 appId 过滤日志、用量聚合、概览汇总）

## 7. 前端：apps/admin 脚手架 (admin-dashboard-shell)

- [x] 7.1 在 monorepo 新建 `apps/admin`（Vue3 + Vite + Element Plus + Pinia + Vue Router），配置别名/环境变量/代理
- [x] 7.2 实现统一 API 客户端：注入 Bearer、解析 `{success,data,error,code}` 信封、统一错误提示
- [x] 7.3 实现桌面端布局（顶栏 + 侧边导航 + 内容区）与按模块组织的路由
- [x] 7.4 实现 Pinia auth store（登录态、令牌持久化、登出）
- [x] 7.5 实现全局路由守卫：未登录重定向登录页、401 自动登出

## 8. 前端：各模块页面

- [x] 8.1 登录页：用户名/密码登录，错误提示，登录后跳回目标页；账户设置页含「修改密码」表单（校验旧密码）
- [x] 8.2 凭据管理页：列表（按 Account 过滤）、生成（明文 Secret 一次性展示 + 一键复制）、详情、编辑备注/scopes/限流、轮换、启停
- [x] 8.3 AI 配置页：provider 切换、Token（掩码 + 可更新）、workflow/bot ID、测试连接
- [x] 8.4 租户管理页：列表/搜索、编辑主题/限流/IP 白名单、状态启停
- [x] 8.5 用户管理页：搜索/分页、修改用户类型
- [x] 8.6 反馈管理页：按状态筛选/分页、处理反馈
- [x] 8.7 数据看板页：调用日志查询、用量统计、运营概览

## 9. 部署与集成

- [x] 9.1 新增 `apps/admin/Dockerfile`（development target，源码挂载热更新）
- [x] 9.2 `docker-compose.yml` 增加 `lsy-admin` 服务（如 `127.0.0.1:5174`），接入 `lsy-net`
- [ ] 9.3 验证 AI 配置后台化后，将明文 `COZE_API_TOKEN` 从 compose 收敛（保留种子/兜底）
- [x] 9.4 移动端 `apps/web` 的 `AdminPage.vue` 标记废弃（注释/下线入口，迁移完成后另行清理）

## 10. 文档与验收

- [x] 10.1 更新 `docs/api/` 增加 `/admin/*` 接口文档
- [ ] 10.2 编写后台使用说明（登录、凭据签发流程、AI 配置、回滚）
- [ ] 10.3 端到端走查：管理员登录 → 生成凭据 → 联调方用新凭据通过 HMAC 调用成功
