## 1. Pre-flight baseline (read-only)

- [x] 1.1 Baseline recorded: `apps/api` typecheck clean; unit suites pass; 7 integration suites fail only because they `mongoose.connect` to `localhost:27017` and Docker/Mongo is not running locally (purely environmental, unrelated to this change)
- [x] 1.2 `apps/web` has no installed deps and neither `apps/web` nor `apps/admin` source is touched by this change, so they are out of the blast radius; no rebuild needed as a cleanup gate
- [x] 1.3 Reference grep done: only legacy hits in the retained tree are comments + the standalone `apps/api/scripts/migrate-from-cloudbase.ts` migration utility (reads a CloudBase *export file*, not the `cloudfunctions/` dir). No runtime imports of any removed path
- [x] 1.4 Inspected: no `.husky/` dir and no `prepare` script exist, and no root eslint/prettier config exists — the root `package.json` Mini Program lint/build scripts are already dead; safe to reduce to a minimal manifest

## 2. Remove legacy code & tooling

- [x] 2.1 `git rm -r miniprogram/`
- [x] 2.2 `git rm -r cloudfunctions/`
- [x] 2.3 `git rm -r cloudbase/` (tracked) + `rm -rf .cloudbase/` (untracked) + `rm -rf __pycache__/`
- [x] 2.4 `git rm -r config/` (Mini Program env build script)
- [x] 2.5 `git rm -r wechat-mp-debug-pkg/` and `git rm scripts/regression-test.js`
- [x] 2.6 `git rm project.config.json project.private.config.json .cursorrules-architecture`
- [x] 2.7 Removed legacy `.cursor/rules/*.mdc` (the 7 listed) plus `workflows.mdc` (CloudBase deploy) and `project_rules.mdc` (alwaysApply Mini Program/cloud guidance) and `.cursor/mcp.json` (CloudBase MCP); kept `web-development.mdc` and `ui-design.mdc`

## 3. Prune legacy documentation

- [x] 3.1 Built an explicit keep-set (23 files): `docs/web-migration/`, `docs/api/openapi-integration-guide.*`, `docs/api/admin-api.md`, plus domain reference. Everything else under `docs/` (131 files: Mini Program / cloud-function impl, phase reports, payment/share/tabbar/profile docs, legacy `docs/api/*`, `docs/database/`, `docs/test-reports/`, `docs/ue-demo/`) removed
- [x] 3.2 Kept domain reference rather than deleting: `六十甲子卡牌完整数据.json`, `生辰八字计算需求文档.md`, `card-des.md`, `24节气、农历数据.XLS`, and `docs/tools/jiazi-card-generator/` (card-derivation logic)
- [x] 3.3 Grepped `apps/` + kept docs for links into removed `docs/` files — none found
- [x] 3.4 `git rm` the 131 confirmed legacy docs (untracked `docs/openapi-test-guide.md` is new, kept)

## 4. Reword dangling provenance comments

- [x] 4.1 Reworded the `apps/api/src/seeds/cards.data.ts` comment to reference the removed Mini Program/CloudBase implementation instead of the deleted `cloudfunctions/...` path
- [x] 4.2 Reworded the `apps/api/src/lib/bazi/index.ts` comment to drop the deleted `cloudfunctions/localCalculateBazi_v1_3` pointer (now points at `./bazi-calculator.js`)

## 5. Refresh orientation files (update, do not delete)

- [x] 5.1 Rewrote `README.md` to describe the self-hosted `apps/api` + `apps/web` + `apps/admin` stack, Makefile commands, and the kept docs
- [x] 5.2 Rewrote `CLAUDE.md`: new monorepo architecture, `apps/api` layering (routes → controllers → services → repos → models), Makefile/Docker commands, deploy via `production-server-guide.md`; dropped the Mini Program layering / versionManager / cloud-function deploy; kept the Git 提交规范 and naming/coding principles
- [x] 5.3 Applied the same rewrite to `AGENTS.md`
- [x] 5.4 Reduced root `package.json` to a minimal private monorepo manifest (`lianshanyi-platform`); removed Mini Program `build:*`/lint scripts, husky/lint-staged, and tdesign identity; removed the stale root `package-lock.json` (apps each keep their own lockfile)
- [x] 5.5 Cleaned `.gitignore`: removed `miniprogram_npm/`, `cloudbase/cloudbaserc.json`, `cloudfunctions/*/node_modules/`; kept the `apps/*` entries

## 6. Verify (acceptance criteria)

- [x] 6.1 `apps/api` typecheck clean; **vitest 13/13 files, 107/107 tests pass** post-cleanup (the 1.1 baseline integration failures were a cold-start `beforeAll` hook timeout, not code — the warm run is fully green)
- [x] 6.2 `apps/admin` builds successfully (vue-tsc + vite, ✓ 2.08s). `apps/web` source is untouched by the change and has no installed deps locally, so no rebuild was needed as a cleanup gate
- [x] 6.3 Post-cleanup reference grep across the retained tree — no retained executable code references any removed path
- [x] 6.4 Kept docs confirmed present: `docs/web-migration/`, `docs/api/openapi-integration-guide.*`, `docs/api/admin-api.md`, `production-server-guide.md`
- [x] 6.5 `git status`/`diff --stat` reviewed: only intended deletions + the 4 orientation files changed; the only `apps/` edits are the two reworded comments (note: `apps/api/src/lib/bazi/bazi-calculator.js` was already modified at session start — pre-existing user work, untouched by this change)

## 7. Commit

- [x] 7.1 Committed in 3 grouped Chinese commits and pushed to `origin main` (`016fa16` 移除小程序客户端与 CloudBase 云函数, `9ac1b2b` 清理 Cursor 规则与小程序根配置, `10d8aa2` 清理遗留文档并刷新项目说明). Pre-existing user changes (`bazi-calculator.js`, untracked `docs/openapi-test-guide.md`) intentionally left out
