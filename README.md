# 联山易 Lianshanyi Platform

联山易 — 自建（self-hosted）的生辰八字与六十甲子卡牌 SaaS 平台。前身为微信小程序 + 腾讯云开发（CloudBase），现已整体迁移为自建 Web 技术栈。

## 技术栈

| 模块 | 目录 | 技术 |
|------|------|------|
| 后端 API | `apps/api` | Node + TypeScript、Express、MongoDB/Mongoose、Redis、MinIO、vitest |
| 用户端 H5 | `apps/web` | Vue 3 + Vite + Vant（axios / pinia / vue-router） |
| 管理后台 | `apps/admin` | Vue 3 + Vite + Element Plus（axios / pinia / vue-router） |
| 基础设施 | `docker-compose.yml` | MongoDB、Redis、MinIO |

## 快速开始

```bash
# 安装依赖（apps/api + apps/web）
make install

# 启动完整开发栈（api + web + admin + mongo + redis + minio）
make dev

# 或：仅启动基础设施 + 本地跑 API / Web
make dev-infra
make dev-api
make dev-web

# 初始化数据与首个管理员
make seed
make admin

# 后端测试
make test-api
```

更多命令见 [`Makefile`](./Makefile)。各子应用也可进入对应目录运行 `npm run dev | build | test | typecheck`。

## 文档

- [迁移设计文档](./docs/web-migration/README.md) — 现状分析、架构、前后端与部署设计
- [OpenAPI 接入指南](./docs/api/openapi-integration-guide.md)
- [管理后台 API](./docs/api/admin-api.md)
- [生产服务器运维指南](./production-server-guide.md)

## 部署

自建服务器，基于 Docker 部署。运维步骤见 [`production-server-guide.md`](./production-server-guide.md)，部署设计见 [`docs/web-migration/05-deployment.md`](./docs/web-migration/05-deployment.md)。

## License

MIT
