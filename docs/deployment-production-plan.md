# 生产环境部署方案（分期）

> 适用范围：自建后端 `apps/api`（Node/Express）+ `apps/web` / `apps/admin`（Vue 静态）+ MongoDB + Redis + 对象存储。
> 部署形态：一台腾讯云服务器 + Docker，按业务分期逐步扩容。

## 分期总览

| 分期 | 对外提供的服务 | 主要流量来源 | 部署重点 |
|---|---|---|---|
| **第一期** | 仅 **Open API**（`/openapi/v1`，B2B，HMAC 签名） | 少数业务合作方，量小可控 | 一台轻量服务器跑全栈；**开放给第三方前必须先做按应用限流** |
| **第二期** | 面向 C 端的 **Web/H5**（及后续小程序客户端） | 终端用户，并发上升 | 加 CDN、对象存储、（视情况）云数据库；迁入老用户数据 |
| **第三期** | 同上，规模化 | 高并发，需高可用 | 多实例 + 负载均衡 + 共享 Redis 限流（**触发式，达到瓶颈才做**） |

> 说明：小程序与 Web 是同一套 `/api/v1` 后端的不同客户端，部署上无差别。若为微信小程序，需在微信后台额外配置「服务器域名 / 业务域名」，并完成域名备案。

---

## 执行摘要（重点先读）

- **最重要的一条：按应用限流是「第一期上线前必做」，不是延期项。** 第一期对外即 Open API、客户即第三方；`OpenApp.rateLimit` 字段已定义但**无任何执行逻辑**，只有全局 IP 限流。一个 appId 不限速就能刷爆 AI 接口、刷高 Coze 账单。详见第六节。
- **采购节奏（参考价/月，以控制台价格计算器为准）：**
  - 第一期（Open API）：Lighthouse 2核4G + 域名 ≈ **¥70–120**，一台机器跑全栈足够。
  - 第二期（Web/C 端）：升到 4核8G + COS + CDN ≈ **¥250–600**；上云数据库 MongoDB ≈ **¥450–1000**。
  - 第三期（高可用，触发式）：第二台机 + CLB + 云 Redis，达到瓶颈再买。
- **两个硬门槛先办**：ICP 备案（关键路径，最先提交，约 7–20 个工作日）；MongoDB 备份先验证「能恢复」再放真实数据。
- **老数据迁移安排在第二期 Web 上线前**：第一期 B2B 不依赖老 C 端用户数据，正好错开。支付/配额不迁（后续用新额度机制）。
- **小程序按「第二期 C 端的一个客户端」对待**（与 Web 共用 `/api/v1`）；若只做 H5，忽略「配微信业务域名」相关步骤。

---

## 一、上线前两个硬门槛（不办则无法上线）

1. **ICP 备案（关键路径，今天就提交）**
   腾讯云**大陆地域**服务器，域名要跑 80/443 必须先完成 ICP 备案，约 7–20 个工作日。第一期 Open API 也走域名（如 `api.lianshanyi.com`），同样需要备案。
   - 若服务器选**香港/境外地域**则免备案，但大陆访问慢、合规与微信生态对接受限。建议大陆地域 + 备案。

2. **数据备份必须先跑通**
   单机方案最大的风险是磁盘故障导致数据全失。上线前先把 MongoDB 的每日备份（见第四节）验证到「能恢复」，再放真实数据。

---

## 二、架构拓扑

### 第一期（仅 Open API）

```
                 公网 443
                   │  TLS（Let's Encrypt / 腾讯免费证书）
          ┌────────▼─────────┐
          │ Nginx（宿主机）   │
          └───┬──────────┬───┘
   /openapi/  │          │  /admin（仅内部用，发凭据/管理）
              ▼          ▼
          ┌──────────────────┐
          │ api 容器(Node)    │──► Coze（外部 AI，调用较慢）
          └───┬──────────┬───┘
              ▼          ▼
          redis 容器   MongoDB 容器
         (缓存/nonce)  (凭据/日志/数据)
```

第一期不需要对公网暴露 C 端 Web；`admin` 仅你内部使用（发开放平台凭据、看调用日志）。

### 第二期（+ Web / C 端）

```
                 公网 443
                   │  TLS
          ┌────────▼─────────┐        ┌──────────────┐
          │ Nginx（宿主机）   │───────►│ 腾讯云 CDN     │ 静态资源/图片加速
          └─┬────┬───────┬───┘        └──────┬───────┘
   静态 web │    │ /api/ │ /openapi/         │
   /admin   │    ▼       ▼                   ▼
   (dist)   │  ┌──────────────┐         腾讯云 COS（图片/对象存储）
            │  │ api 容器(Node)│────► Coze
            │  └───┬──────┬───┘
            │      ▼      ▼
            │   redis    MongoDB（自托管 或 云数据库 MongoDB）
```

第二期把图片放 COS + CDN，Web/Admin 的 `dist` 由 Nginx 直接 serve。

### 有状态组件的处置原则（贯穿各期）

| 组件 | 放哪 | 理由 |
|---|---|---|
| api / web / admin | Docker 本机（web/admin 出 dist 给 Nginx） | 无状态，本机足够 |
| Redis | Docker 本机 | 仅缓存 + nonce，丢失无影响，自托管最省 |
| 对象存储 | **腾讯云 COS（替代 MinIO）** | 自动多副本、便宜、天然配 CDN；代码已用 S3 兼容 SDK，改 endpoint 即可 |
| MongoDB | 第一期/预算紧：Docker 本机 + 严格备份；有付费用户：**云数据库 MongoDB** | 唯一「丢了要命」的数据，云数据库自带主从 HA + 自动备份 |

---

## 三、分阶段采购清单与价格

> ⚠️ 以下为**参考价区间（人民币/月）**，腾讯云常有促销、包年更便宜，**最终以控制台「价格计算器」为准**。

### 第一期采购（Open API 上线）

| 项 | 推荐规格 | 参考价/月 | 必要性 |
|---|---|---|---|
| 轻量应用服务器 Lighthouse | **2核4G / 80G SSD**（含流量包，性价比高） | ¥60–110 | 必须 |
| 域名 | `.com` | ¥60–90/年 | 必须 |
| SSL 证书 | 腾讯免费 DV 证书 / Let's Encrypt | ¥0 | 必须 |
| 容器镜像服务 TCR | 个人版 | ¥0 起 | 建议（CI 推镜像） |

**第一期小计：约 ¥70–120/月。** 这一期数据量小、并发低，一台 Lighthouse 跑 api+mongo+redis 足够。

### 第二期采购（Web / C 端上线）

| 项 | 推荐规格 | 参考价/月 | 必要性 |
|---|---|---|---|
| 服务器升级 | **Lighthouse 4核8G** 或换 **CVM 4核8G/100G SSD** | ¥150–400 | 必须（C 端并发上来，Mongo 工作集吃内存） |
| 对象存储 COS | 标准存储，按量 | 几元~几十元 | 强烈建议（替代 MinIO） |
| CDN | 加速 COS 图片 + Web 静态 | 按流量，起步近免费 | 建议（提速明显） |
| 云数据库 MongoDB | 单节点 1核2G 起 / 双节点副本集 2核4G | ¥200–800 | 有真实付费用户后强烈建议；预算紧可暂用自托管 |
| 公网带宽 | 5 Mbps 固定 或 按流量 | ¥50–150 | 必须（图片走 CDN 后压力小） |

**第二期小计：约 ¥250–600/月（不含云数据库），上云数据库约 ¥450–1000/月。**

### 第三期采购（高可用 / 横向扩，触发式，**达到瓶颈再买**）

| 项 | 规格 | 参考价/月 |
|---|---|---|
| 第二台 api 服务器 | 同规格 | 同上 |
| 负载均衡 CLB | 标准 | ¥20–60 + 流量 |
| 云数据库 Redis | 1G 主从 | ¥100–200 |
| 云数据库 MongoDB（升配/分片） | 按量 | 按量 |

**触发信号**：CPU 持续 >70% / Mongo 内存频繁换页 / 单机故障无法承受停机。

---

## 四、运维方案（上线前必须就位）

1. **MongoDB 备份（单机方案命门）**
   每日 `mongodump` → 打包 → 上传 COS，保留 7–14 天；**务必先验证能从备份恢复**。
   ```bash
   # /srv/lianshanyi/backup.sh（配 crontab 每日执行）
   TS=$(date +%F)
   docker exec lsy-mongo mongodump --archive=/tmp/db-$TS.gz --gzip
   docker cp lsy-mongo:/tmp/db-$TS.gz /srv/lianshanyi/backups/
   coscmd upload /srv/lianshanyi/backups/db-$TS.gz /backups/   # coscmd 为腾讯云 COS 工具
   find /srv/lianshanyi/backups -mtime +14 -delete
   ```
   > 若用云数据库 MongoDB，自动备份开箱即用，此步可省。

2. **TLS 自动续期**：certbot 定时 renew，或用腾讯免费证书（一年期，到期重签）。

3. **监控告警（最低配）**
   - CVM 的 CPU / 内存 / **磁盘水位**告警（磁盘写满是单机最常见的「猝死」原因）。
   - 一个外部 uptime 监控定时打 `/api/v1/health`（已改为真探针，Mongo 挂返回 503）。

4. **安全**
   - 安全组只放 **80 / 443 / 22**；`docker-compose.prod.yml` 中 27017 / 6379 / 9000 已绑 `127.0.0.1`，保持，**绝不暴露公网**。
   - `.env` 权限 600、不入库（含 `COZE_API_TOKEN`、`OPENAPI_SECRET_ENC_KEY` 等）。

5. **日志**：api 已用 pino JSON，compose 已配日志轮转（`max-size` / `max-file`），够用；要集中检索可接腾讯云日志服务 CLS。

6. **构建不在生产机做**：`docker build` + tsc + vite 吃内存，4G 机可能 OOM。用 GitHub Actions 构建镜像推 TCR，生产机只 `docker pull`。

---

## 五、运维迁移方案

### 5.1 老数据迁移（微信云开发 → 自建 MongoDB）

- **执行时机**：在**第二期 Web 上线前**做（第一期 Open API 是 B2B，不依赖老 C 端用户数据）。
- **步骤**：
  1. 云开发控制台导出 `users / profiles / draw_card_records / daily_insights / feedbacks` 为 JSON，放到 `apps/api/scripts/cloudbase-export/`。
  2. `npx tsx scripts/migrate-from-cloudbase.ts --dry-run`（只读，看 created/skipped 数）。
  3. 数字核对无误后去掉 `--dry-run` 正式导入。
- **注意**：微信用户多无手机号，迁后无法直接用手机号/密码登录 Web；脚本已保留 `openid`，待 Web 接入微信登录后凭 openid 重新关联（详见迁移脚本头注释）。**支付/配额不迁**（后续用新额度机制）。

### 5.2 阶段升级迁移（不重建，平滑过渡）

| 升级动作 | 何时做 | 怎么做（不停机/短停机） |
|---|---|---|
| 自托管 Mongo → 云数据库 MongoDB | 第二期有付费用户后 | 低峰期 `mongodump`/`mongorestore` 一次性迁入，或用腾讯云 DTS 同步后切换连接串；改 `.env` 的 `MONGO_URI` 重启 api |
| MinIO → COS | 第二期 | 历史图片用 `coscmd`/`rclone` 批量同步到 COS，改 `.env` 的对象存储 endpoint（S3 兼容） |
| 单 api 实例 → 多实例 | 第三期 | **前置改造**：限流接 `rate-limit-redis`（共享桶）、补 `OpenApp.rateLimit` 按应用限流；再加机器 + CLB |

---

## 六、与代码现状的衔接（重要）

1. **第一期把 Open API 开放给第三方之前，务必先做「按应用限流」。**
   现状 `OpenApp.rateLimit` 字段定义了但**没有任何地方执行**，只有全局 IP 限流。第一期客户就是外部第三方，一个 appId 不限速就能刷爆 AI 接口、刷高 Coze 账单。这是第一期上线前的必做项（非延期项）。

2. **单实例下，内存态限流是正常的，不用动。** 之前提的「限流内存态、多副本失准」只在第三期横向扩时才需处理。

3. **已落地的健壮性修复**（已为本部署服务）：
   - `trust proxy`：Nginx 后真实 IP，限流/审计准确。
   - `/health` 真就绪探针：供监控/负载均衡判活。
   - 优雅退出：`docker compose up -d` 重新部署时不掐断在途请求。
   - Nginx `proxy_read_timeout` 130s：盖过 AI 调用 120s，消除慢响应 504。
     > 提醒：Nginx 配置改动需在服务器 `nginx -t && nginx -s reload` 后生效。

---

## 七、落地步骤 Checklist

**第一期：**
- [ ] 提交 ICP 备案（最先做）
- [ ] 购买 Lighthouse 2c4g + 域名
- [ ] 装 Docker / Docker Compose / Nginx / certbot
- [ ] 安全组只放 80/443/22
- [ ] 配 `.env`（权限 600，不入库）
- [ ] **实现并验证 Open API 按应用限流**
- [ ] `docker compose -f docker-compose.prod.yml up -d`（api/mongo/redis）
- [ ] 配 MongoDB 每日备份 + 验证恢复
- [ ] certbot 签证书 + 自动续期
- [ ] 监控告警（CPU/内存/磁盘 + `/health`）

**第二期：**
- [ ] 服务器升配到 4c8g（或换 CVM）
- [ ] 开通 COS + CDN，对象存储切到 COS
- [ ] （视情况）上云数据库 MongoDB
- [ ] 老数据迁移：dry-run → 正式导入
- [ ] 构建并发布 web/admin dist，Nginx serve + 反代
- [ ] （如做小程序）配微信业务域名

**第三期（触发式）：**
- [ ] 限流接 Redis-store + 按应用限流
- [ ] 加 api 实例 + CLB
- [ ] 云数据库 Redis / Mongo 升配
