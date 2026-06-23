## Why

The backend has migrated from Tencent CloudBase (腾讯云开发) to a self-hosted server (`apps/api`), and the client has migrated from a WeChat Mini Program to a Vue H5 web app (`apps/web`, `apps/admin`). The original Mini Program source, CloudBase cloud functions, their build tooling, and ~90 historical docs still live in the repo. They no longer run, are not referenced by `apps/*` (only by provenance comments), and actively mislead future development — the root `package.json`, `README.md`, `CLAUDE.md`/`AGENTS.md`, and `.cursor/rules` still describe the old "pages → controllers → services → beans → cloudfunctions" architecture. Removing them removes a large source of confusion and ~225&nbsp;MB of dead weight.

## What Changes

- **BREAKING (dev workflow only):** Remove the legacy WeChat Mini Program client (`miniprogram/`, 190 files) — superseded by `apps/web`.
- **BREAKING (dev workflow only):** Remove the CloudBase cloud functions (`cloudfunctions/`, 21 functions) and CloudBase config (`cloudbase/`, `.cloudbase/`, `project.config.json`, `project.private.config.json`) — superseded by `apps/api`.
- Remove Mini Program build/tooling: `config/` (env build script), root `package.json` + `package-lock.json` Mini-Program scripts, `wechat-mp-debug-pkg/`, `scripts/regression-test.js` (CDP regression harness).
- Remove legacy `.cursor/rules` (`cloudbase-platform`, `miniprogram-development`, `cloudrun-development`, `data-model-creation`, `database`, `architecture-design`, `cloud_rules`) and `.cursorrules-architecture`; keep only rules relevant to the web/api stack.
- Prune legacy documentation: Mini Program / CloudBase implementation docs, phase reports, and the legacy `docs/api/*` cloud-function API docs. Keep `docs/web-migration/`, `docs/api/openapi-integration-guide.*`, `docs/api/admin-api.md`, and other docs that describe the new stack.
- **Update (not delete)** the orientation docs `CLAUDE.md`, `AGENTS.md`, `README.md`, and `.gitignore` so they describe the self-hosted web/api/admin stack instead of the Mini Program.
- Keep everything under `apps/`, `docker-compose*.yml`, `Makefile`, `deploy/`, `production-server-guide.md`, and `openspec/` untouched.

## Capabilities

### New Capabilities
- `legacy-decommission`: The acceptance criteria for safely removing the WeChat Mini Program + Tencent CloudBase legacy code and documentation while leaving the refactored `apps/web`, `apps/api`, and `apps/admin` stack building, passing tests, and free of dangling references.

### Modified Capabilities
<!-- None. No specs exist under openspec/specs/ yet; this change introduces no behavior changes to the retained stack. -->

## Impact

- **Removed code/dirs:** `miniprogram/`, `cloudfunctions/`, `cloudbase/`, `.cloudbase/`, `config/`, `wechat-mp-debug-pkg/`, `scripts/regression-test.js`, `project.config.json`, `project.private.config.json`, `.cursorrules-architecture`, legacy `.cursor/rules/*.mdc`, and legacy `docs/*`.
- **Updated files:** root `package.json`/`package-lock.json`, `README.md`, `CLAUDE.md`, `AGENTS.md`, `.gitignore`.
- **Not affected (must stay green):** `apps/api` (Node/TS, 13 test files via `vitest`), `apps/web` (Vue/Vite), `apps/admin` (Vite), and the Docker/Makefile orchestration. The only `apps/*` references to removed paths are comments in `apps/api/src/seeds/cards.data.ts` and `apps/api/src/lib/bazi/index.ts`, which will be reworded to drop the stale provenance pointers.
- **Verification:** `cd apps/api && npm test` + `npm run typecheck`, `apps/web` and `apps/admin` builds, and a repo-wide grep confirming no retained file imports a removed path.
