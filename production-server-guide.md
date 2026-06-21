# 生产服务器运维指南

## 服务器信息

| 项目 | 值 |
|---|---|
| IP | `159.75.73.193` |
| 域名 | `openapi.shenxinyou.com` |
| 管理后台 | `https://openapi.shenxinyou.com/admin/` |
| OpenAPI | `https://openapi.shenxinyou.com/openapi/v1/` |
| 内部 API | `https://openapi.shenxinyou.com/api/v1/` |
| 面板 | 宝塔（BT Panel） |

## 架构概览

```
用户请求
  │
  ▼
Nginx（宝塔管理，/www/server/nginx/）
  ├── /admin/          → 静态文件 /www/wwwroot/lsy-admin/
  ├── /api/            → Node.js API :3000（Docker）
  └── /openapi/        → Node.js API :3000（Docker）

Docker Compose（/opt/lianshanyi/docker-compose.prod.yml）
  ├── lsy-api          → Node.js API，监听 127.0.0.1:3000
  ├── lsy-mongo        → MongoDB 7，监听 127.0.0.1:27017
  └── lsy-redis        → Redis 7，监听 127.0.0.1:6379
```

## 日常操作

### 查看服务状态

```bash
ssh root@159.75.73.193
docker ps                                          # 查看容器状态
docker logs lsy-api --tail 50                      # 查看 API 日志
docker logs lsy-api --tail 50 --follow             # 实时跟踪日志
```

### 重启服务

```bash
cd /opt/lianshanyi
docker compose -f docker-compose.prod.yml restart api    # 只重启 API
docker compose -f docker-compose.prod.yml restart        # 重启全部
```

### 查看 Nginx 日志

```bash
tail -f /www/wwwlogs/openapi.shenxinyou.com.log          # 访问日志
tail -f /www/wwwlogs/openapi.shenxinyou.com.error.log    # 错误日志
```

---

## 更新部署

### 更新 API

```bash
# 1. 本地：同步源码到服务器
rsync -az apps/api/src/ root@159.75.73.193:/opt/lianshanyi/apps/api/src/

# 2. 服务器：重新构建镜像并重启
ssh root@159.75.73.193 "
  cd /opt/lianshanyi
  docker compose -f docker-compose.prod.yml build api
  docker compose -f docker-compose.prod.yml up -d api
"
```

### 更新管理后台

```bash
# 1. 本地：构建
cd apps/admin && npm run build

# 2. 上传到服务器
rsync -az apps/admin/dist/ root@159.75.73.193:/www/wwwroot/lsy-admin/

# 无需重启 Nginx，静态文件立即生效
```

---

## Nginx 配置

配置文件路径：`/www/server/panel/vhost/nginx/openapi.shenxinyou.com.conf`

关键注意事项：
- **admin 静态文件**：使用 `alias` + `try_files $uri /admin/index.html`，不要加 `$uri/`（会导致目录跳转 503）
- **不要**在 alias location 下再用 regex 子 location（路径拼接会出错）
- 修改后执行 `/www/server/nginx/sbin/nginx -s reload` 生效

```nginx
# 正确写法
location /admin/ {
    alias /www/wwwroot/lsy-admin/;
    try_files $uri /admin/index.html;    # 注意：不要写 $uri/
}

# 错误写法（alias + regex 子 location 会丢失文件名）
location ~* ^/admin/assets/ {
    alias /www/wwwroot/lsy-admin/assets/;  # 不要这样做
}
```

### SSL 证书

证书由 acme.sh 管理，**自动续期**，无需手动操作。

```bash
# 证书位置
/www/server/panel/vhost/cert/openapi.shenxinyou.com/fullchain.pem
/www/server/panel/vhost/cert/openapi.shenxinyou.com/privkey.pem

# 手动强制续期（正常情况不需要）
~/.acme.sh/acme.sh --renew -d openapi.shenxinyou.com --force
```

---

## 环境变量

API 环境变量文件：`/opt/lianshanyi/apps/api/.env`

**修改后需重启 API 容器才能生效：**

```bash
ssh root@159.75.73.193 "cd /opt/lianshanyi && docker compose -f docker-compose.prod.yml up -d api"
```

---

## 管理员账号

| 字段 | 值 |
|---|---|
| 登录地址 | `https://openapi.shenxinyou.com/admin/` |
| 手机号 | `18108230066` |
| 密码 | 初始密码已交接，请登录后自行修改 |

### 创建新管理员（需要直接操作数据库）

```bash
ssh root@159.75.73.193
docker exec -i lsy-mongo mongosh lianshanyi_prod << 'EOF'
const bcrypt = require('bcryptjs');  // mongosh 不支持，需用下面方式
EOF

# 正确方式：在 API 容器内运行
docker exec lsy-api node -e "
const mongoose = require('./node_modules/mongoose');
const bcrypt = require('./node_modules/bcryptjs');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const hash = await bcrypt.hash('新密码', 12);
  await mongoose.connection.collection('users').insertOne({
    phone: '手机号',
    passwordHash: hash,
    isAdmin: true,
    userType: 'premium',
    createdAt: new Date(),
    updatedAt: new Date()
  });
  console.log('创建成功');
  process.exit(0);
});
"
```

---

## 部署时遇到的问题记录

### 1. Docker build：tsc 找不到

**现象**：`sh: tsc: not found`

**原因**：Dockerfile build 阶段设置了 `ENV NODE_ENV=production`，导致 `npm ci` 自动跳过 devDependencies（包含 TypeScript）。

**修复**：build 阶段不设置 `NODE_ENV`，仅在 production 阶段设置。

```dockerfile
# 错误
FROM base AS build
ENV NODE_ENV=production   # ← 导致 npm ci 跳过 devDependencies
RUN npm ci

# 正确
FROM base AS build
RUN npm ci                # 不设置 NODE_ENV，安装全量依赖
```

### 2. Docker 启动：找不到 dist/server.js

**现象**：`Cannot find module '/app/dist/server.js'`

**原因**：`tsconfig.json` 的 `rootDir: "."` 导致编译产物在 `dist/src/` 而非 `dist/`。

**修复**：Dockerfile CMD 改为 `node dist/src/server.js`。

### 3. 管理员登录 500 错误

**现象**：`TypeError: Cannot read properties of undefined (reading 'toString')`

**原因**：`adminLogin` 中执行 `user.tenantId.toString()`，但通过脚本创建的管理员没有 `tenantId` 字段（管理员为平台级账号，不属于任何租户）。

**修复**：`apps/api/src/controllers/admin/auth.controller.ts`

```typescript
// 修改前
tenantId: user.tenantId.toString()

// 修改后
tenantId: user.tenantId?.toString() ?? ''
```

### 4. 修改密码 500 错误

**现象**：`User validation failed: tenantId: Path 'tenantId' is required`

**原因**：`setPassword` 使用 `user.save()` 触发 Mongoose 全文档校验，`tenantId` 必填但管理员没有该字段。

**修复**：`apps/api/src/services/user.service.ts`

```typescript
// 修改前
user.passwordHash = await bcrypt.hash(newPassword, 12);
await user.save();  // 触发全文档校验

// 修改后
const newHash = await bcrypt.hash(newPassword, 12);
await User.findByIdAndUpdate(userId, { passwordHash: newHash });  // 只更新目标字段
```

### 5. 管理后台资源 503

**现象**：JS/CSS 文件返回 503，`#app` 空白无法渲染。

**原因**：Nginx 配置中同时存在 `location /admin/`（alias）和 `location ~* ^/admin/assets/`（alias + regex）。regex location 配合 alias 时，若未使用捕获组，文件名会丢失，nginx 尝试访问目录导致 503。

**修复**：删除 regex 子 location，只保留 `location /admin/`，并且 `try_files` 去掉 `$uri/`：

```nginx
# 修复前（有问题）
location /admin/ {
    alias /www/wwwroot/lsy-admin/;
    try_files $uri $uri/ /admin/index.html;  # $uri/ 会触发目录跳转
}
location ~* ^/admin/assets/ {
    alias /www/wwwroot/lsy-admin/assets/;   # regex + alias 丢失文件名
}

# 修复后（正确）
location /admin/ {
    alias /www/wwwroot/lsy-admin/;
    try_files $uri /admin/index.html;
}
```

### 6. 访问 /admin 无尾斜杠 404

**现象**：`https://openapi.shenxinyou.com/admin` 返回 404。

**原因**：Nginx 只有 `location /admin/` 块，无尾斜杠时无法匹配。

**修复**：添加精确匹配重定向：

```nginx
location = /admin {
    return 301 /admin/;
}
```

---

## 前端构建注意事项

管理后台部署在 `/admin/` 路径下（非根路径），构建时需确保以下配置：

**`apps/admin/vite.config.ts`**：
```typescript
export default defineConfig({
  base: '/admin/',   // 必须设置，否则资源路径以 / 开头导致 404
  // ...
})
```

**`apps/admin/src/router/index.ts`**：
```typescript
const router = createRouter({
  history: createWebHistory('/admin/'),  // 必须与 base 一致
  // ...
})
```

如果将来迁移到根路径，这两处都需要去掉路径前缀。
