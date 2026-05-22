# 06 — 实施路线图

## 1. 阶段总览

| 阶段 | 周次 | 主题 | 关键产出 | 验收 |
|------|------|------|----------|------|
| P0 | W1 上半 | 启动与脚手架 | 新仓库、CI、Docker、基础骨架 | `docker compose up` 起得起 |
| P1 | W1 下半 – W2 上半 | 认证 + 用户体系 | `/auth/*`、`/users/*`、登录注册页 | 全流程注册/登录可走通 |
| P2 | W2 下半 – W3 | 八字 + 档案 | bazi 库、`/profiles/*`、新增/编辑/详情页 | 创建档案→看到八字 |
| P3 | W3 末 – W4 上半 | 卡牌 + 抽卡（Mock AI） | `/cards/*`、抽卡核心页 | 抽卡→看到 Mock 解读 |
| P4 | W4 下半 | 每日运势 + 助学童子（Mock） | `/daily-insight/*`、`/assistant/*`、定时任务 | 每日 0:05 自动生成日卡 |
| P5 | W5 上半 | 反馈 + 我的 + 我的档案管理 | `/feedbacks/*`、MinePage、ProfileList | 用户可提交反馈、查/改自己信息 |
| P6 | W5 下半 | 管理员后台 | `/admin/*`、用户/反馈管理 | 超管可改用户类型/回反馈 |
| P7 | W6 上半 | E2E 测试 + 性能压测 + PWA | Playwright + Lighthouse | 关键路径全过 |
| P8 | W6 下半 | 部署上线 | 服务器配齐、域名、证书 | 公网可访问 |
| P9 | W7 | 真实 AI 接入（按需） | 切换 ai adapter 为 Coze | 抽卡/对话使用真实模型 |

并行 2 人开发可压缩到 4 周（前/后端分头推进）。

## 2. P0 — 启动与脚手架（2-3 天）

### 任务
- [ ] 新建仓库 `lianshanyi-web`（建议 monorepo: `apps/api` + `apps/web` + `packages/shared-types`），或独立两库
- [ ] 后端：`npm create vite@latest`（仅取 TS 模板不要 UI 框架）→ 改 Express；或直接 `npm init -y` 自己拼装
- [ ] 前端：`npm create vue@latest`（TS + Vite + Router + Pinia + Vitest）
- [ ] 全局 lint/prettier 配好
- [ ] CI（GitHub Actions / GitLab CI）：lint + typecheck + test + build
- [ ] `Dockerfile`（API）+ `docker-compose.yml`（开发版）
- [ ] 通信契约：`packages/shared-types/` 放 ResponseEnvelope、ErrorCode、AuthPayload 等共享 TS 类型
- [ ] `docs/web-migration/` 落到新仓 + 内部 RFC 流程

### 产出物
- `lianshanyi-web/` 目录结构按 [03](./03-backend.md) §2 与 [04](./04-frontend.md) §2 落地
- 本地 `docker compose up` 起得起 mongo/redis/minio
- `GET /api/v1/health` 返回 `{status:'ok'}`
- Vue 首页空壳渲染

### 风险/注意
- 决定 monorepo（pnpm workspaces）还是双仓
- 把现有 `localCalculateBazi_v1_3` 整目录复制到 `apps/api/src/lib/bazi/`，先确保跑得起来（写一个 smoke test）

## 3. P1 — 认证与用户体系（4-5 天）

### 后端
- [ ] `models/User.ts`
- [ ] `lib/sms/` 的 Mock 实现（写到日志）
- [ ] `lib/crypto/` JWT 与 bcrypt 封装
- [ ] `routes/auth.routes.ts`：sms send / sms login / password register / password login / refresh / logout / anonymous
- [ ] `middlewares/auth.ts` + `requireAuth` + `requireAdmin` + `requirePermission`
- [ ] `routes/users.routes.ts`：me、me PATCH、me/quota、me/permissions、me/upgrade
- [ ] `seeds/staticUserTypes.json` + seed 脚本
- [ ] 管理员创建 CLI：`scripts/createAdmin.ts`
- [ ] 单元测试：JWT 签验、密码哈希、SMS 限频

### 前端
- [ ] axios 客户端 + token 自动刷新
- [ ] `useAuthStore` + `useUserStore`
- [ ] `LoginPage`（手机号+验证码 / 用户名+密码 双 Tab）
- [ ] `RegisterPage`
- [ ] 路由守卫：`requiresAuth` / `guestOnly` / `requiresAdmin`
- [ ] `MinePage` 雏形：展示当前用户 + 退出登录

### 验收
- 用 Postman 走完两种登录路径
- E2E：访问 `/answer`（受保护）→ 自动跳 login → 完成登录 → 回到 `/answer`
- 验证码限频生效（同手机号 1 分钟内第二次请求 → 429）

## 4. P2 — 八字 + 档案（5-7 天）

### 后端
- [ ] `lib/bazi/` 移植 + 单元测试（公历、农历、闰月、子时跨日 ≥ 10 个 case）
- [ ] `routes/bazi.routes.ts`：POST `/bazi/calculate`
- [ ] `models/Profile.ts`
- [ ] `routes/profile.routes.ts`：CRUD + 列表（分页、搜索）
- [ ] 配额校验：创建档案前检查 `usedProfiles < profileQuota`
- [ ] 删除档案时事务式更新 `users.usedProfiles--`

### 前端
- [ ] `AddProfilePage`：表单 + 公历/农历切换 + 时辰 picker
- [ ] `ProfilePage`：四柱可视化
- [ ] 档案列表入口（在 MinePage 或单独 `/profiles`）
- [ ] `useProfileStore` 持久化 currentId

### 验收
- 创建档案 → 看到完整四柱
- 编辑档案 → 数据回填 + 重新计算
- 删除档案 → 配额回退
- 边界：1900-01-01 子时、2000-02-29 闰年、农历闰月

## 5. P3 — 卡牌 + 抽卡 Mock（5-7 天）

### 后端
- [ ] `lib/ai/` 接口 + Mock 实现
- [ ] `models/DrawCardRecord.ts` + `models/StaticCard.ts`
- [ ] `seeds/staticCards.json`（60 张卡完整数据，从 `auto_updateDailyInsight` 与 `docs/六十甲子卡牌完整数据.json` 整合）
- [ ] `routes/card.routes.ts`：list / detail / draw / history
- [ ] 抽卡服务：随机算法 + AI Mock 调用 + 当日配额校验 + 落库
- [ ] 当日配额查询：`draw_card_records.count({ userId, drawDate })`

### 前端
- [ ] `CardListPage`：60 卡瀑布流，懒加载图
- [ ] `CardViewerPage`：单卡详情 + 央字描述
- [ ] `AnswerPage`：核心翻牌交互 + Markdown 解读 + 配额提示
- [ ] `CardFlip` 组件（CSS3 transform）
- [ ] `lib/poster.ts`（html2canvas）+ 下载/分享按钮

### 验收
- 60 张图全部可正常加载（来自 MinIO）
- 抽 3 次后第 4 次返回 `QUOTA_EXCEEDED`
- 翻牌动画流畅（FPS ≥ 50）
- 海报下载/复制链接可用

## 6. P4 — 每日运势 + 助学童子 Mock（4-5 天）

### 后端
- [ ] `models/DailyInsight.ts`
- [ ] `services/DailyInsightService`：refreshToday()，依赖 baziLib 算今天日柱干支
- [ ] `jobs/dailyInsight.job.ts`：cron `5 0 * * *`（每天 00:05 Asia/Shanghai）
- [ ] `routes/dailyInsight.routes.ts`：today / ganzhi/today
- [ ] `routes/assistant.routes.ts`：createConversation / messages POST / messages GET
- [ ] Mock chat：本地内存 conversationId map + 15 条预设回复随机

### 前端
- [ ] `DailyInsightPage`：今日卡 + 解读 + 二维码
- [ ] `AssistantPage`：聊天 UI（参考原 pages/assistant）
- [ ] `ChatBubble` 组件 + 流式打字效果（即便 Mock 也保留视觉）

### 验收
- 手动触发 cron（提供 `npm run job:daily` 命令）→ daily_insights 多一条
- 跨天访问 `/daily` 自动取到最新
- 助学童子可连续对话 5 轮，conversationId 保持

## 7. P5 — 反馈 + 我的（3-4 天）

### 后端
- [ ] `models/Feedback.ts`
- [ ] `routes/feedback.routes.ts`：submit / list / detail
- [ ] 反馈图片上传：MinIO presigned URL 或后端代理 multipart

### 前端
- [ ] `FeedbackPage`：表单 + `<van-uploader>` + 历史列表
- [ ] `MinePage` 完整版：卡片堆 + 配额条 + 入口菜单 + 协议 + 退出
- [ ] 头像上传：`<van-uploader>` + POST `/users/me/avatar`

### 验收
- 反馈带图片提交成功
- 头像更新后所有页面同步
- 用户退出后 token 清理干净，受保护页跳 login

## 8. P6 — 管理员后台（3-4 天）

### 后端
- [ ] `routes/admin.routes.ts`：users 搜索 / 改类型 / 删 / feedbacks 列表 / 回复 / stats overview
- [ ] `audit_logs` 集合 + 中间件记录所有 admin 操作
- [ ] CLI：`npm run admin:promote --userId=xxx --role=admin`

### 前端
- [ ] `AdminLayout` + 侧边导航
- [ ] `AdminUsersPage`：表格 + 筛选 + 改类型
- [ ] `AdminFeedbacksPage`：列表 + 回复
- [ ] `AdminStatsPage`：基础统计卡

### 验收
- 超管可改任意用户类型；普通管理员只能查不能改超管
- 所有改写操作在 audit_logs 留痕
- 非管理员访问 `/admin` → 302 到首页

## 9. P7 — E2E 测试 + PWA + 优化（3-5 天）

### 任务
- [ ] Playwright 跑通 6 个关键路径（见 [04](./04-frontend.md) §11）
- [ ] Lighthouse Mobile 跑分：首屏 LCP < 2.5s，CLS < 0.1
- [ ] PWA：manifest + service worker + 离线骨架
- [ ] 图片优化：MinIO 上传时同步生成 webp + 缩略图（可用 sharp 服务）
- [ ] API 端：开启 helmet、compression、HTTP/2 by Nginx

### 验收
- E2E 全绿
- Lighthouse 性能 ≥ 80
- 飞行模式打开 H5 → 进入卡牌列表（SW 缓存）

## 10. P8 — 部署上线（2-3 天）

按 [05-deployment.md](./05-deployment.md) §7 操作。

### 关键检查
- [ ] HTTPS 双域名（www + cdn）证书生效
- [ ] Mongo / Redis / MinIO 全部启用认证
- [ ] `.env` 中 token 全部 `openssl rand -hex 32` 生成
- [ ] 首位超管创建完成
- [ ] 60 张卡牌图片上传 MinIO（路径 `cards/01_jiazi.png` 等）
- [ ] `/api/v1/health` 公网可访
- [ ] 备份脚本 crontab 已加
- [ ] Uptime Kuma 监控启动

## 11. P9 — 真实 AI 接入（可延后）

### 任务
- [ ] 重新申请 / 复用 Coze token，放入服务器 `.env`
- [ ] `lib/ai/coze.adapter.ts`：实现 interpret / dailyInsight / chat
- [ ] env：`AI_PROVIDER=coze`，重启 api
- [ ] 灰度：用 `AI_PROVIDER_FOR_PERCENT=20%` 让 20% 抽卡走真实模型，对比解读质量
- [ ] 监控 AI 调用错误率与延迟

## 12. 里程碑 demo

| 时点 | 可展示给非技术成员 |
|------|---------------------|
| 末 W1 | 注册/登录可走通 |
| 末 W3 | 创建档案→看到八字 |
| 末 W4 | 完整抽卡（Mock 解读）+ 每日卡 |
| 末 W5 | 用户完整闭环（含反馈、我的） |
| 末 W6 | 管理员后台 + 公网上线 |

## 13. 回滚策略

- 后端：每次部署前打 image tag（如 `lianshanyi-api:2025.05.22-1430`），故障时 `docker compose up -d api` 切回上版
- 前端：`web-dist/` 保留最近 3 个版本目录，Nginx 配置切 root 即可秒回
- 数据库：上文 §10 备份，必要时 `mongorestore`

## 14. 待定 / 后续可选项

| # | 待定项 | 说明 |
|---|--------|------|
| O1 | 短信网关签名审批 | 上线前完成阿里云/腾讯云签名 + 模板审核 |
| O2 | MinIO 数据冷备到 OSS | 异地容灾 |
| O3 | 上观测体系（Prometheus + Grafana） | 用户量大于 1k 后必装 |
| O4 | 真实 AI 接入（P9） | 内容质量评估 + 成本控制 |
| O5 | 微信扫码登录 | 后期增设登录通道之一 |
| O6 | 多语言/PC 版 | 远期 |

## 15. 与现有 dev 分支的关系

- **新仓库独立创建**，避免污染现有小程序代码
- 现有 dev 分支：
  - 保留作为小程序历史版本（含支付/小店等）
  - 不再合并 Web 相关代码
  - 文档 `docs/web-migration/` 也可以保留在 dev 分支中（即本次方案位置），作为决策档案
- 公共数据：
  - 六十甲子静态数据：从 `docs/六十甲子卡牌完整数据.json` 与 `cloudfunctions/auto_updateDailyInsight/index.js` 中的 CARD_CENTRAL_MAP 整合后放入新仓 `apps/api/src/seeds/staticCards.json`
  - 卡牌图片：从腾讯云存储下载 60 张图片，重命名后放入 `apps/api/src/seeds/cards-original/`，seed 脚本上传到 MinIO
- 版本选取（每个云函数仅迁移最新版，详见 [01 §5](./01-overview-and-decisions.md#5-版本策略简化)）：
  - `userManagement_v1_5` → `services/user.service.ts`（丢弃 v1_3、v1_4）
  - `profileManagement_v1_4` → `services/profile.service.ts`（丢弃 v1_2、v1_3）
  - `localCalculateBazi_v1_3` → `lib/bazi/`（丢弃 v1_2）
  - `dailyInsightManagement_v1_5` → `services/dailyInsight.service.ts`（丢弃 v1_4）
  - `cozeFunctions_v1_3` → `lib/ai/`（Mock 化）
  - `assistantChat_v1_0`、`feedbackManagement_v1_4`、`auto_updateDailyInsight` → 唯一版本直接迁
  - `versionManager.js` 整个文件不迁移

## 16. 工作量统计（参考）

| 模块 | 后端 (人日) | 前端 (人日) |
|------|-------------|-------------|
| P0 脚手架 | 1 | 1 |
| P1 认证 | 3 | 2 |
| P2 八字+档案 | 4 | 3 |
| P3 卡牌+抽卡 | 3 | 4 |
| P4 每日卡+助学童子 | 2 | 3 |
| P5 反馈+我的 | 1.5 | 2 |
| P6 管理员 | 2 | 2 |
| P7 测试+优化 | 1.5 | 2 |
| P8 部署 | 2 | 0.5 |
| **合计** | **20** | **19.5** |

单人全栈预计 35-40 工时日（约 7 周）；双人并行 4-5 周可完成。
