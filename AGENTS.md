# AGENTS.md

This file provides guidance to Codex (and other coding agents) when working with code in this repository.

## Git 仓库

**GitHub 仓库：** `git@github.com:jiucongtian/lianshanyi_miniapp_saas.git`

**提交规范（必须遵守）：**
1. 每完成一个功能后，及时 `git commit`（不要等积累很多改动）
2. 功能验证通过后，立即 `git push origin <branch>` 推送到 GitHub
3. 不要等用户提醒，主动完成提交和推送
4. 提交信息使用中文，格式：`feat/fix/refactor: 简短描述`

## Project Overview

联山易 (Lianshanyi) — a self-hosted SaaS platform for Chinese BaZi (生辰八字) fortune telling and 六十甲子 card drawing. The original WeChat Mini Program + Tencent CloudBase implementation has been **fully retired**; the product now runs as a self-hosted web stack.

## Architecture

This is a monorepo under `apps/`:

```
apps/
├── api/     # lianshanyi-api — Node + TypeScript backend (Express, MongoDB/Mongoose, Redis, MinIO)
├── web/     # End-user H5 app — Vue 3 + Vite + Vant (axios, pinia, vue-router)
└── admin/   # Admin dashboard — Vue 3 + Vite + Element Plus (axios, pinia, vue-router)
```

Supporting infrastructure (via `docker-compose.yml`): MongoDB, Redis, MinIO.

### `apps/api` layering

```
routes/ → controllers/ → services/ → repos/ → models/ (Mongoose)
```

- **routes/** — Express route definitions (`auth`, `user`, `profile`, `card`, `daily-insight`, `feedback`, `tenant`, `assistant`, plus `admin/` and `openapi/` route groups, and `open-app` for the OpenAPI platform).
- **controllers/** — request handling, input validation, response shaping.
- **services/** — business logic.
- **repos/** — data access over Mongoose models.
- **models/** — Mongoose schemas (`user`, `profile`, `tenant`, `static-card`, `daily-insight`, `draw-card-record`, `feedback`, `open-app`, `app-config`, …). The platform is **multi-tenant** (`tenant` model + tenant scoping).
- **lib/bazi/** — local BaZi calculation library (ported from the retired Mini Program).
- **seeds/** — static seed data (e.g. the 60-甲子 card set in `cards.data.ts`).
- Tests live in `apps/api/tests/` (`unit/`, `integration/`) and run via **vitest**. Integration tests require MongoDB (and Redis) — start the infra with Docker first.

## Commands

The `Makefile` is the canonical task runner:

```bash
make dev          # Full dev stack via docker-compose (api + web + admin + mongo + redis + minio)
make dev-infra    # Just infra (mongo + redis + minio)
make dev-api      # Run API locally (apps/api: npm run dev)
make dev-web      # Run web locally (apps/web: npm run dev)
make seed         # Seed the database
make admin        # Create the first admin account
make test-api     # Backend tests (vitest)
make build-api    # Build API
make build-web    # Build web
make install      # Install deps for apps/api + apps/web
```

Per-app scripts (run inside the app dir): `npm run dev | build | test | typecheck | lint`.
`apps/api` also has `npm run seed` and `npm run admin:create`.

## Coding Standards

### Required Patterns

1. **No duplicate code** — extract shared logic into utilities/services.
2. **Use the logger, not `console`** — use the project logger (pino) in `apps/api`.
3. **Validate at boundaries** — validate request input in controllers (e.g. Zod) before it reaches services.
4. **Use the layering** — controllers don't touch Mongoose directly; go through services → repos.
5. **Respect tenant scoping** — queries on tenant-owned data must be scoped to the current tenant.

### Naming Conventions

- Files: kebab-case for modules (`user.service.ts`, `daily-insight.model.ts`).
- Classes/Types: PascalCase.
- Methods/functions: camelCase.
- Private methods: underscore prefix (`_validate`).
- Constants: UPPER_SNAKE_CASE.

## Important Rules

1. **Do not auto-commit code** — only commit when explicitly requested.
2. **Do not auto-deploy** — deployment to the production server is manual (see `production-server-guide.md`).
3. **Do not create test pages/scripts** without permission.
4. **Keep API docs current** — update `docs/api/openapi-integration-guide.md` and `docs/api/admin-api.md` when changing the corresponding endpoints.
5. **Auth** — the web/admin clients authenticate against `apps/api` (JWT); there is no WeChat `wx.cloud` / OPENID flow anymore.

## Deployment

Self-hosted via Docker. See `production-server-guide.md` for the server runbook and `docs/web-migration/05-deployment.md` for the deployment design. (The production server is the Tencent Cloud VM at `159.75.73.193`; build images and restart containers there.)

## Key Files to Read

1. `docs/web-migration/` — migration overview, architecture, backend/frontend/deployment design.
2. `apps/api/src/routes/index.ts` — API surface.
3. `docs/api/openapi-integration-guide.md` + `docs/api/admin-api.md` — API documentation.
4. `Makefile` / `docker-compose.yml` — how to run and wire the stack.
