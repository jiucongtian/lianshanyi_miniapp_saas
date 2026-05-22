# 02 — 系统架构

## 1. 总体拓扑

```
┌──────────────────────────────────────────────────────────────────┐
│                         用户浏览器 (移动端 H5)                    │
│   Vue 3 + Vant 4 + Pinia + Vue Router + axios                    │
└──────────────────────┬───────────────────────────────────────────┘
                       │  HTTPS
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                  Nginx (443) — 反向代理 + TLS 终止                │
│   - /            → 静态资源 (Vue dist)                           │
│   - /api/v1/*    → 后端 API (Node)                               │
│   - /minio/*     → MinIO Console (可选, 内网限制)                │
└────────┬────────────────────────┬─────────────────────────┬──────┘
         │                        │                         │
         ▼                        ▼                         ▼
┌─────────────────┐    ┌──────────────────────┐    ┌──────────────┐
│   Vue 静态站    │    │    Node API 服务      │    │   MinIO       │
│   (volume 挂载) │    │    Express + JWT      │    │   对象存储   │
└─────────────────┘    │    + node-cron        │    │  (S3 兼容)   │
                       └───────┬──────────────┘    └──────────────┘
                               │
                               ▼
                       ┌──────────────────┐
                       │     MongoDB      │
                       │     7.0          │
                       └──────────────────┘

                       (容器外可选)
                       ┌──────────────────┐
                       │     Redis 7      │  ← 验证码 / 速率限制 / 会话
                       └──────────────────┘
```

所有容器在同一 Docker bridge 网络上，对外仅 80/443 暴露给互联网，22 仅限运维。

## 2. 后端运行时模块

```
api-server (Node.js + Express)
├── routes/                   # Express 路由（按业务划分）
│   ├── auth.routes.js
│   ├── user.routes.js
│   ├── profile.routes.js
│   ├── bazi.routes.js
│   ├── card.routes.js        # 抽卡 + 单卡查看
│   ├── dailyInsight.routes.js
│   ├── assistant.routes.js
│   ├── feedback.routes.js
│   └── admin.routes.js
├── controllers/              # 处理 HTTP 请求/响应
├── services/                 # 业务逻辑层（无 HTTP 概念，可被 cron 复用）
├── models/                   # mongoose Schema
├── middlewares/              # auth / rate-limit / error / requestId
├── lib/
│   ├── bazi/                 # 八字计算（移植 localCalculateBazi）
│   ├── ai/                   # AI 适配器（Mock / Coze / Future）
│   ├── sms/                  # 短信通道（Mock / Aliyun / Tencent）
│   ├── storage/              # 对象存储客户端（MinIO）
│   └── crypto/               # JWT / bcrypt 封装
├── jobs/                     # 定时任务（auto_updateDailyInsight）
├── config/
│   ├── index.js              # 配置聚合
│   └── env.js                # 环境变量 schema（用 zod 校验）
└── server.js                 # 启动入口
```

## 3. 前端运行时结构

```
web-client (Vue 3 + Vite)
├── src/
│   ├── api/                  # axios 封装 + 各业务 API
│   ├── stores/               # Pinia stores（user / profile / card）
│   ├── router/               # 路由 + meta 权限
│   ├── views/                # 页面组件（1:1 对应原小程序 pages/）
│   ├── components/           # 复用组件（bazi-card / card-flip / 等）
│   ├── composables/          # 组合式函数（useAuth / useToast / 等）
│   ├── layouts/              # 布局：TabBarLayout（首页/卡牌/我的）+ FullScreenLayout
│   ├── assets/               # 本地静态（icon、agreement 文本）
│   ├── styles/               # 全局样式 + 主题变量
│   └── main.ts
├── public/                   # 直出资源（favicon、manifest.json）
├── vite.config.ts            # 构建配置（PWA 插件可选）
└── tsconfig.json
```

## 4. 关键运行时数据流

### 4.1 用户登录（手机号 + 验证码）

```
[H5] 输入手机号
  ↓
[H5] POST /api/v1/auth/sms/send  { phone }
  ↓                                           
[API] 限频校验 (Redis: phone:<phone>:rate)
  ↓
[API] 调用 sms adapter (Mock 模式直接 log)
  ↓
[API] Redis SET phone:<phone>:code = 6位数字, TTL 5min
  ↓
[H5] 输入验证码
  ↓
[H5] POST /api/v1/auth/sms/login  { phone, code }
  ↓
[API] 验证 code, 查询/创建 user
  ↓
[API] 签 JWT (15min) + RefreshToken (7d, httpOnly Cookie)
  ↓
[H5] 收到 JWT, 存 Pinia + sessionStorage
```

### 4.2 抽卡 + 解读（核心流程，AI Mock）

```
[H5] 用户在 answer 页输入问题 + 选择档案
  ↓
[H5] POST /api/v1/cards/draw  { profileId, question }
  ↓
[API] 检查每日配额（draw_card_records 当日计数 vs user_type.dailyDrawQuota）
  ↓
[API] services/CardService.draw():
       - 从 60 张卡随机/根据八字算法选一张
       - 调用 ai adapter.interpret({card, question, bazi})  ← Mock 返回模板文本
       - 持久化 draw_card_records
  ↓
[H5] 收到 { cardNumber, cardName, imageUrl, aiAnswer }
  ↓
[H5] 翻牌动画 + Markdown 渲染解读
```

### 4.3 每日卡片更新（定时任务）

```
node-cron @ 00:05 每日（Asia/Shanghai）
  ↓
jobs/dailyInsight.job.js
  ↓
services/DailyInsightService.refreshToday():
  - 通过 baziLib 计算当天日柱干支
  - ai adapter.dailyInsight({ ganzhi, date })  ← Mock 模板
  - upsert 到 daily_insights 集合
```

### 4.4 静态资源获取

```
[H5] <img src="https://cdn.example.com/cards/15_wuyin.png">
  ↓
[Nginx] /cards/* → proxy_pass MinIO bucket (或独立 CDN 域名)
  ↓
[MinIO] 返回图片，Nginx 加 Cache-Control: public, max-age=31536000
```

## 5. 容器拓扑（docker-compose）

```yaml
services:
  nginx:        # 443, 80
  web:          # Vue 静态站（仅在 nginx 通过 volume 挂 dist，不暴露端口）
  api:          # Node API，内网 3000
  mongo:        # 27017，仅 docker 内网
  redis:        # 6379，仅 docker 内网
  minio:        # 9000（API） + 9001（控制台，可关闭）
  certbot:      # 仅在续期时启动
```

`certbot` 用 webroot 模式与 nginx 共享 `/var/www/certbot`，每月自动续期。

## 6. 环境分层

| 环境 | 用途 | 域名 | 配置文件 |
|------|------|------|----------|
| local | 本地开发 | `localhost:5173` (web) / `:3000` (api) | `.env.local` |
| staging | 联调与测试 | `staging.example.com` | `.env.staging` |
| prod | 线上 | `www.example.com` | `.env.prod`（不入仓） |

Mongo / MinIO / Redis 在 staging 与 prod 上各跑独立实例，不共享数据。

## 7. 监控与日志

- **应用日志**：pino + pino-pretty（dev）/ JSON（prod），按天滚动到 `/var/log/api/`
- **访问日志**：Nginx access.log 默认开启
- **健康检查**：
  - API: `GET /api/v1/health` → `{ status: 'ok', mongo: 'up', redis: 'up' }`
  - 用于 Docker `healthcheck` 与未来负载均衡接入
- **告警**：第一阶段不上 Prometheus，仅保留 `/metrics` 占位接口；后续接 Grafana Cloud 或自建 Prometheus

## 8. 安全基线

| 项 | 措施 |
|----|------|
| 传输 | 全站 HTTPS，HSTS 1 年 |
| 密码存储 | bcrypt, cost=12 |
| Token | JWT (HS256) + RefreshToken httpOnly + SameSite=Strict |
| 限频 | Redis 滑窗：登录 5 次/小时/IP，验证码 1 条/分钟/手机号 |
| CORS | 仅允许 prod 域名；本地开发允许 `localhost:5173` |
| Secrets | 全部 `.env`，仓库提交 `.env.example` |
| MongoDB | 强制开启认证（不要裸跑） |
| MinIO | 内网 Endpoint，前端只读公共桶；上传走后端签名 |
| 接口 | helmet 默认头 + 输入校验 (zod / joi) |

详见 [03-backend.md](./03-backend.md) 与 [05-deployment.md](./05-deployment.md)。
