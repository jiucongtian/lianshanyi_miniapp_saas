# 01 — 现状分析与决策汇总

## 1. 现有项目盘点

### 1.1 仓库结构（dev 分支）

```
lianshanyi_miniapp_platform/
├── miniprogram/              # 小程序前端（17 个页面）
│   ├── pages/                # 业务页面
│   ├── controllers/          # 页面控制器（含业务编排）
│   ├── services/             # API 调用层（统一 callFunction）
│   ├── beans/                # 数据模型 + 校验
│   ├── components/           # 自定义组件（bazi-card、time-picker 等）
│   ├── utils/                # 工具与管理器（imageCache/profile/version）
│   ├── config/index.js       # 环境配置
│   └── app.json              # 路由 + tabBar
├── cloudfunctions/           # 11 个云函数（约 6000 行）
└── cloudbase/cloudbaserc.json
```

### 1.2 前端页面清单（17 个）

| 路径 | 功能 | 是否保留 |
|------|------|----------|
| `pages/home` | 首页（八字展示 + 入口） | 保留 |
| `pages/card` | 卡牌总览（60 甲子） | 保留 |
| `pages/cardViewer` | 单卡详情 | 保留 |
| `pages/answer` | 抽卡 + AI 解读（1755 行，核心交互） | 保留（AI 走 Mock） |
| `pages/profile` | 档案详情 | 保留 |
| `pages/addProfile` | 新增/编辑档案 | 保留 |
| `pages/mine` | 我的页 | 保留 |
| `pages/register` | 注册（升级用户类型） | 改造为登录/注册 |
| `pages/agreement` | 用户协议 | 保留 |
| `pages/daily-insight` | 每日运势 | 保留 |
| `pages/assistant` | 助学童子 AI 对话 | 保留（AI 走 Mock） |
| `pages/feedback` | 用户反馈 | 保留 |
| `pages/sysManage` | 管理员后台 | 保留 |
| `pages/cacheInfo` | 缓存/日志查看（调试） | 删除 |
| `pages/debug` | 调试页（1832 行） | 删除 |
| `pages/webview` | 小程序内嵌 webview | 删除 |
| `pages/store` | 微信小店 | 删除（已确认） |

### 1.3 云函数清单（11 个 → 移除后 7 个核心模块）

> **版本策略**：原小程序为兼容老客户端，每个云函数保留了 v1_0/v1_1/v1_2/... 多个版本（由 `versionManager.js` 按客户端版本路由）。Web 端是全新产物、无历史客户端兼容包袱，**只迁移每个云函数的最新版本**，旧版直接舍弃。下表列出的 `_v1_x` 后缀仅为指明源版本，迁移后路径和模块均去掉版本号。详见 [§6 版本策略简化](#6-版本策略简化)。

| 云函数（最新版本） | Action 数量 | 是否保留 | 备注 |
|--------|-------------|----------|------|
| `userManagement_v1_5` | 13 | 保留 | 用户/管理员，重写认证部分（丢弃 v1_3、v1_4） |
| `profileManagement_v1_4` | 6 | 保留 | 含本地八字计算（丢弃 v1_2、v1_3） |
| `localCalculateBazi_v1_3` | – | 保留 | 八字算法库（丢弃 v1_2） |
| `cozeFunctions_v1_3` | 1 | 保留（Mock 化） | 抽卡 + 解读 |
| `assistantChat_v1_0` | 3 | 保留（Mock 化） | 助学童子 |
| `dailyInsightManagement_v1_5` | 2 | 保留 | 每日卡牌 + 当日干支（丢弃 v1_4） |
| `auto_updateDailyInsight` | – | 保留 | 定时任务，转 node-cron |
| `feedbackManagement_v1_4` | 3 | 保留 | 反馈管理 |
| `paymentManagement_v1_4` | 6 | **移除** | 含微信支付（同步丢弃 v1_3） |
| `functionQuotaManagement_v1_4` | 5 | **移除** | 付费配额 |
| `functionCallGateway_v1_4` | 1 | **移除** | 付费功能调度网关 |

### 1.4 数据库集合清单（MongoDB 化后）

| 集合 | 用途 | 是否保留 |
|------|------|----------|
| `users` | 用户基本信息 + 鉴权字段（手机号、密码 hash） | 保留（schema 调整） |
| `static_user_types` | 用户类型配置（guest/normal/student/premium） | 保留 |
| `profiles` | 八字档案 | 保留 |
| `draw_card_records` | 抽卡历史 | 保留 |
| `daily_insights` | 每日运势卡 | 保留 |
| `feedbacks` | 用户反馈 | 保留 |
| `function_products` | 付费功能配置 | **移除** |
| `function_quotas` | 用户功能配额 | **移除** |
| `function_usage_records` | 功能调用记录 | **移除** |
| `payment_orders` | 支付订单 | **移除** |
| `user_types` | 老配置表 | **移除**（保留 `static_user_types`） |

### 1.5 第三方依赖

| 依赖 | 用途 | 迁移方案 |
|------|------|----------|
| `wx-server-sdk` | 云函数运行时 | 删除，改用 mongoose / Express |
| `wx.cloud.*` | 小程序前端调用云函数/存储 | 替换为 axios + REST |
| `axios` | HTTP（云函数中） | 保留 |
| `tdesign-miniprogram` | UI 组件库 | 替换为 **Vant 4**（Vue 3） |
| `<store-product>` | 微信小店原生组件 | 移除 |
| `wx.requestPayment` | 微信支付 | 移除 |
| Coze API | AI 工作流/对话 | **暂全部 Mock**，后期接入 |
| 腾讯云存储 | 卡牌图 + 二维码 | 迁移到 **MinIO** |

## 2. 关键决策汇总

| # | 决策项 | 选择 | 影响范围 |
|---|--------|------|----------|
| D1 | Web 形态 | 移动端 H5（PWA 可选） | 整体 UI 设计与适配 |
| D2 | 认证方式 | 手机号 + 短信验证码 + 用户名 + 密码（双通道） | 用户模块 + 短信网关 |
| D3 | 后端语言 | Node.js | 全部云函数 → Express 控制器 |
| D4 | 后端框架 | Express + 分层结构（route/controller/service/model） | 项目骨架 |
| D5 | 数据库 | MongoDB（mongoose） | 数据模型零改造 |
| D6 | 部署 | Docker Compose + Nginx 反代 + Let's Encrypt | 运维流程 |
| D7 | 对象存储 | MinIO（自部署） | 静态资源 URL 改写 |
| D8 | 支付 | 全部移除 | 删除 3 个云函数 + 配额体系 |
| D9 | 小店 | 移除 store 页 | 删除 1 个页面 |
| D10 | 管理员后台 | 保留 sysManage，重写为 Web 页 | 保留权限二维矩阵 |
| D11 | 用户分类 | 保留 guest/normal/student/premium，仅作权限分级 | 保留 static_user_types |
| D12 | AI 服务 | 第一阶段全 Mock，预留接入点 | 抽卡/对话/每日卡都走 Mock 适配器 |
| D13 | 数据迁移 | 不迁移生产数据，新库 Mongo seed 静态配置 | 提供 seed 脚本 |
| D14 | 服务端版本策略 | **单一最新版**，不保留历史版本路由 | 删除 `versionManager`、模块名去 `_v1_x` 后缀；API 仅一套 `/api/v1/*` |

## 3. 迁移目标

### 3.1 功能目标
- 用户可通过 H5（手机浏览器或扫码访问）完成原小程序的所有非支付功能
- 移动端体验与原小程序一致：底部 tabBar、卡牌交互、AI 解读流程
- 服务端完全独立部署，不依赖任何腾讯云开发产品

### 3.2 非功能目标
- **可观测**：结构化日志（pino）、健康检查、Prometheus 指标预留点
- **可维护**：分层清晰，REST API 文档（OpenAPI 自动生成）
- **可扩展**：Mock AI 通过接口隔离，未来切换真实模型只改一个 adapter
- **可重现**：所有环境通过 docker-compose up 一键启动
- **安全**：JWT + httpOnly Cookie；密码 bcrypt；所有 token/密钥走环境变量

### 3.3 显式 *不* 在范围内
- 微信支付、微信小店、支付订单系统
- 微信扫码登录（当前阶段不接入；后期可作为登录通道之一加回）
- 现有线上数据迁移
- 真实 AI 模型对接（仅留接口）
- 小程序版本继续维护（项目保留 git 历史即可）

## 4. 风险与已识别问题

| # | 风险 | 等级 | 应对 |
|---|------|------|------|
| R1 | 现有 Coze token 硬编码在 dev 分支多处（含 `cloudbase/cloudbaserc.json` 与多个云函数） | 高 | 新仓库严格走 `.env`，老仓库 token **必须吊销并重发**（即便不再使用） |
| R2 | 八字计算依赖 `localCalculateBazi_v1_3/baziCalculator.js`，含农历表 | 中 | 整体打包成 npm 私包或直接复制到后端 `lib/bazi/` 目录 |
| R3 | 短信服务的资质与成本：阿里云 / 腾讯云需要签名 + 模板审批 | 中 | 开发期用 Mock 短信通道；上线前完成签名审批 |
| R4 | 60 张卡牌图片需要重新上传到 MinIO 并保持文件名 | 低 | 在 seed 阶段批量迁移 + 提供脚本 |
| R5 | 前端 `posterGenerator`（生成分享海报）依赖 `wx.canvasToTempFilePath` | 中 | 改为浏览器 Canvas + `toBlob` 下载 |
| R6 | `imageCacheManager` 用 `wx.getFileSystemManager` 做磁盘缓存，Web 无对应 API | 低 | Web 不需要预下载，由浏览器自动缓存 + Service Worker（PWA） |
| R7 | 用户配额（每日抽卡次数）原本由云函数同步检查 | 低 | 后端通过 Redis 计数 / Mongo 当日记录计数实现 |

## 5. 版本策略简化

原小程序后端有一套完整的多版本机制：

```
cloudfunctions/
├── userManagement_v1_3/
├── userManagement_v1_4/
├── userManagement_v1_5/
├── profileManagement_v1_2/
├── profileManagement_v1_3/
├── profileManagement_v1_4/
└── ... (每个云函数都有 2-3 个版本)
```

由 `miniprogram/utils/manager/versionManager.js` 按客户端 `globalData.version` 动态路由到对应版本的云函数。**这是为了兼容已发布的旧小程序客户端**（用户没及时更新仍能用旧逻辑）。

Web 端没有这种约束：

| 维度 | 原小程序 | 新 Web 端 |
|------|---------|----------|
| 客户端分发 | 用户主动更新，存在多版本同时在线 | 浏览器刷新即拿到最新版，**客户端始终单一最新版** |
| 旧版兼容义务 | 需要兼容半年以上 | **无任何兼容义务** |
| 路由策略 | `userManagement_v1_3 / v1_4 / v1_5` 并存 | 仅一套 `/api/v1/users/*` |
| 版本管理代码 | `versionManager.js` 必须 | **不存在** |

### 5.1 迁移做法
- **每个云函数只取最新版本作为蓝本**（见上表标注），其余版本直接舍弃，不进新仓
- 后端模块和路由全部**去掉 `_v1_x` 后缀**：`userManagement_v1_5` → `services/user.service.ts`
- 前端 `BaseService.callFunction()` 的版本路由逻辑全部删除，axios 直接打到 `/api/v1/users/me`
- `versionManager.js` 整个文件不迁移

### 5.2 `/api/v1` 含义澄清
路径中的 `v1` 是**整个对外 API 的大版本号**（OpenAPI/REST 习惯，便于未来不兼容升级时上 `v2` 并行运行一段时间），**不是**业务逻辑的多版本。第一版上线后，所有用户始终命中同一套实现，没有版本路由。

### 5.3 未来如需多版本（远期假设）
若以后需要并行旧逻辑（例如算法重写的灰度对比），用以下机制而不是恢复 `versionManager`：
- **API 大版本并行**：`/api/v1/cards/draw` 与 `/api/v2/cards/draw` 各跑各的
- **功能开关**（feature flag）：同一接口内按 `req.user.featureFlags` 走不同分支
- **环境变量切换**：例如 `AI_PROVIDER=mock|coze` 这种 adapter 切换

## 6. 文档引用

- 后续详细设计见 [02-architecture.md](./02-architecture.md) 起
- 现有小程序架构详见根目录 `CLAUDE.md` 和 `.cursor/rules/architecture-design.mdc`
- 现有 API 详见 `docs/api/*-api.md`，迁移时作为映射参考
