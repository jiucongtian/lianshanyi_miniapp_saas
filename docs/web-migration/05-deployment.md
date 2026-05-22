# 05 — 部署方案（Docker Compose + Nginx + MinIO）

## 1. 整体部署拓扑

```
                          ┌──────────────────────┐
                          │   公网（443/80）      │
                          └──────────┬───────────┘
                                     │
                            ┌────────▼─────────┐
                            │ Nginx (host)     │  ← Let's Encrypt 证书
                            │ www.example.com  │
                            │ cdn.example.com  │
                            └─┬───────┬────────┘
                              │       │
              static /        │       │ /api/v1/*
              （Vue dist）   ▼       ▼
                       ┌──────────────────┐
                       │  Docker Network  │
                       │  ┌────────────┐  │
                       │  │ api (3000) │  │
                       │  └─────┬──────┘  │
                       │        │         │
                       │  ┌─────▼──────┐  │
                       │  │ mongo      │  │
                       │  │ redis      │  │
                       │  │ minio      │  │
                       │  └────────────┘  │
                       └──────────────────┘
```

> **建议**：Nginx 跑在宿主机（apt 安装），不放容器里。这样 certbot 与 Nginx 的协作更简单，证书续期不影响业务。也可以把 nginx 放进 compose，二者皆可。文档默认采用宿主机 Nginx。

## 2. 服务器准备

### 2.1 推荐配置
- **OS**：Ubuntu 22.04 LTS（或 Debian 12）
- **配置**：2 vCPU / 4 GB RAM / 50 GB SSD（前期足够，后续按用户量横向扩）
- **网络**：80/443/22 入站；其他端口仅内网

### 2.2 基础软件安装

```bash
# 安装 Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 安装 Docker Compose v2（随 docker 自带）
docker compose version

# 安装 Nginx
sudo apt update && sudo apt install -y nginx

# 安装 certbot（Let's Encrypt 客户端，nginx 插件）
sudo apt install -y certbot python3-certbot-nginx

# 防火墙
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 2.3 目录约定

```
/srv/lianshanyi/
├── docker-compose.yml
├── .env                       # 不入仓
├── api/                       # 后端项目（git clone）
├── web-dist/                  # Vue 构建产物（CI 推送）
├── data/
│   ├── mongo/
│   ├── redis/
│   └── minio/
└── logs/
    ├── api/
    └── nginx/
```

## 3. `docker-compose.yml`（生产）

```yaml
version: "3.9"

services:
  api:
    image: lianshanyi-api:${API_VERSION:-latest}
    build: ./api
    restart: unless-stopped
    env_file: ./.env
    depends_on:
      mongo:    { condition: service_healthy }
      redis:    { condition: service_healthy }
      minio:    { condition: service_started }
    ports:
      - "127.0.0.1:3000:3000"           # 只对本机暴露，由宿主机 Nginx 代理
    volumes:
      - ./logs/api:/app/logs
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/v1/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  mongo:
    image: mongo:7
    restart: unless-stopped
    command: ["mongod", "--auth", "--bind_ip_all"]
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_ROOT_USER}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PWD}
    volumes:
      - ./data/mongo:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 30s
      timeout: 5s
      retries: 3

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: ["redis-server", "--requirepass", "${REDIS_PASSWORD}"]
    volumes:
      - ./data/redis:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 30s
      timeout: 5s
      retries: 3

  minio:
    image: minio/minio:latest
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    ports:
      - "127.0.0.1:9000:9000"
      - "127.0.0.1:9001:9001"           # 控制台仅本机；运维通过 SSH tunnel 访问
    volumes:
      - ./data/minio:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 5s
      retries: 3
```

> **注意**：所有 `ports` 都绑定 `127.0.0.1`，确保只能通过宿主机 Nginx 访问。

## 4. Nginx 配置

`/etc/nginx/sites-available/lianshanyi`：

```nginx
# ----------- 主站：www.example.com -----------
server {
    listen 80;
    server_name www.example.com example.com;
    return 301 https://www.example.com$request_uri;
}

server {
    listen 443 ssl http2;
    server_name www.example.com;

    ssl_certificate     /etc/letsencrypt/live/www.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/www.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Vue SPA（构建产物挂载到 /srv/lianshanyi/web-dist）
    root /srv/lianshanyi/web-dist;
    index index.html;

    # 关键：SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源强缓存
    location ~* \.(?:css|js|woff2?|ico|png|jpg|jpeg|svg)$ {
        expires 1y;
        access_log off;
        add_header Cache-Control "public, immutable";
    }

    # API 反代
    location /api/ {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   X-Request-Id      $request_id;
        proxy_read_timeout 60s;
    }

    client_max_body_size 10m;
    access_log /srv/lianshanyi/logs/nginx/www-access.log;
    error_log  /srv/lianshanyi/logs/nginx/www-error.log;
}

# ----------- CDN: cdn.example.com（静态资源） -----------
server {
    listen 443 ssl http2;
    server_name cdn.example.com;

    ssl_certificate     /etc/letsencrypt/live/cdn.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cdn.example.com/privkey.pem;

    location / {
        proxy_pass         http://127.0.0.1:9000/lianshanyi/;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_hide_header  X-Amz-Request-Id;
        proxy_hide_header  X-Amz-Id-2;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
    }
}
```

`sudo ln -s /etc/nginx/sites-available/lianshanyi /etc/nginx/sites-enabled/` → `sudo nginx -t && sudo systemctl reload nginx`。

## 5. HTTPS 证书

```bash
sudo certbot --nginx -d www.example.com -d example.com
sudo certbot --nginx -d cdn.example.com
# 自动续期由 certbot.timer 完成（默认每天检查）
sudo systemctl status certbot.timer
```

## 6. MinIO 初始化

首次部署后：

```bash
docker compose exec minio mc alias set local http://localhost:9000 $MINIO_ROOT_USER $MINIO_ROOT_PASSWORD
docker compose exec minio mc mb local/lianshanyi
docker compose exec minio mc anonymous set download local/lianshanyi   # 公共读
docker compose exec minio mc anonymous set-json /tmp/upload-deny.json local/lianshanyi  # 拒绝匿名写
```

上传 60 张卡牌图片（一次性脚本）：

```bash
docker compose exec api npm run seed:cards
# 脚本读取 lianshanyi-api/seeds/cards-original/*.png → 用 MinIO SDK 上传到 lianshanyi/cards/
```

## 7. 部署流程（首次）

```bash
# 1. 准备目录
sudo mkdir -p /srv/lianshanyi/{data/{mongo,redis,minio},logs/{api,nginx},web-dist}
cd /srv/lianshanyi
sudo chown -R $USER:$USER .

# 2. 拉取后端代码与 compose 配置
git clone <api-repo-url> api
cp api/.env.example .env
$EDITOR .env       # 填入所有密钥、域名、连接串

# 3. 构建并启动
docker compose build
docker compose up -d
docker compose logs -f api

# 4. 跑 seed
docker compose exec api npm run db:seed       # static_user_types + static_cards
docker compose exec api npm run admin:create  # 创建首个超管

# 5. 部署前端
# 在 CI 或本地构建好 web-dist/ 后 rsync 推送
rsync -avz --delete dist/ user@server:/srv/lianshanyi/web-dist/

# 6. 配 Nginx 域名 + 证书（见 §4、§5）

# 7. 验证
curl -s https://www.example.com/api/v1/health | jq
curl -I https://cdn.example.com/cards/01_jiazi.png
```

## 8. 部署流程（日常更新）

### 8.1 后端
```bash
cd /srv/lianshanyi/api
git pull
docker compose build api
docker compose up -d api
docker compose logs -f api
```

### 8.2 前端
```bash
# 本地或 CI:
npm ci && npm run build
rsync -avz --delete dist/ user@server:/srv/lianshanyi/web-dist/
# Nginx 无需 reload，try_files 即时生效；强缓存通过 vite hash 文件名自然失效
```

## 9. 定时任务

`node-cron` 由 API 容器内 `jobs/` 模块注册。如果未来 API 多实例部署，**只能让其中一个实例跑 cron**（通过 `CRON_ENABLED=true/false` env 区分）。

可选方案：单独跑 `worker` 容器：
```yaml
worker:
  image: lianshanyi-api:${API_VERSION}
  command: ["node", "dist/jobs/index.js"]
  env_file: ./.env
  depends_on: [mongo, redis]
```

## 10. 数据备份

### 10.1 Mongo

```bash
# 每日 02:00 通过宿主机 crontab
0 2 * * * docker compose exec -T mongo mongodump --uri="mongodb://$MONGO_ROOT_USER:$MONGO_ROOT_PWD@localhost:27017/?authSource=admin" --archive --gzip > /srv/lianshanyi/backup/mongo-$(date +\%Y\%m\%d).gz
# 保留 30 天
find /srv/lianshanyi/backup -name "mongo-*.gz" -mtime +30 -delete
```

### 10.2 MinIO

```bash
# 使用 mc mirror 同步到异地（如另一个 minio 节点或冷存）
mc mirror --overwrite local/lianshanyi backup/lianshanyi
```

### 10.3 异地备份

强烈建议把 Mongo dump 推到外部对象存储（阿里 OSS / 腾讯 COS / S3），保留至少 7 天版本。

## 11. 监控建议（首期可选）

| 工具 | 用途 | 部署 |
|------|------|------|
| `docker stats` | 容器资源 | 内置 |
| `node-exporter` | 主机指标 | systemd |
| `prom/prometheus` | 时序库 | compose 增加 service |
| `grafana/grafana` | 仪表盘 | compose 增加 service |
| `uptime-kuma` | 外部探测 | 单独容器 |

首期最低：跑 uptime-kuma 监 `/api/v1/health`，邮件/钉钉告警。

## 12. 安全 checklist

- [ ] `.env` 文件 `chmod 600`，不入仓
- [ ] Mongo / Redis / MinIO 全部启用认证
- [ ] Nginx 服务名、版本号通过 `server_tokens off` 隐藏
- [ ] HSTS、X-Frame-Options、X-Content-Type-Options 头齐全（用 helmet 在 API 层 + nginx 层加）
- [ ] JWT_SECRET / Refresh Secret / Mongo 密码使用 `openssl rand -hex 32` 生成
- [ ] 防火墙仅放行 22 / 80 / 443
- [ ] SSH 禁 root + 改为 key 登录
- [ ] 每月跑 `docker scout` 或 `trivy` 扫镜像

## 13. 灰度策略

第一版可直接全量上线（无存量用户）。后续如需灰度：
- Nginx `split_clients` 按 IP 哈希分流到不同 upstream（多 API 实例）
- 前端 query 参数 `?lab=1` 启用新功能；后端按 JWT 中 `featureFlags` 控制
