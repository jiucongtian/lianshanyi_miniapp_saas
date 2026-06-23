## Context

The project began as a WeChat Mini Program (`miniprogram/`) backed by Tencent CloudBase cloud functions (`cloudfunctions/`). It has since been re-platformed:

- **Backend** → self-hosted Node/TypeScript API at `apps/api` (`lianshanyi-api`, Express + Mongo/Redis/MinIO, vitest tests, deployed via Docker to `159.75.73.193`).
- **Client** → Vue 3 + Vite H5 apps at `apps/web` (end-user) and `apps/admin` (admin dashboard).
- **Orchestration** → `docker-compose.yml` / `docker-compose.prod.yml` / `Makefile`, all referencing only `apps/*`.

The legacy tree is dead weight that still ships in the repo:

| Path | Tracked files | Role | Replaced by |
| --- | --- | --- | --- |
| `miniprogram/` | 190 | Mini Program client | `apps/web` |
| `cloudfunctions/` | 80 (21 functions, ~218&nbsp;MB) | CloudBase functions | `apps/api` |
| `cloudbase/`, `.cloudbase/` | 1 | CloudBase env config | `apps/api` env / Docker |
| `config/` | 4 | Mini Program env build script | n/a |
| `wechat-mp-debug-pkg/` | 7 | Mini Program CDP debug tool | n/a |
| `scripts/regression-test.js` | 1 | Mini Program CDP regression harness | `apps/api` tests |
| `project.config.json`, `project.private.config.json` | 2 | WeChat DevTools project config | n/a |
| `.cursorrules-architecture`, legacy `.cursor/rules/*.mdc` | — | Mini Program / CloudBase rules | web/api rules |
| ~70 legacy `docs/*` incl. legacy `docs/api/*` | many | Mini Program / cloud-function docs | `docs/web-migration/`, OpenAPI guide |

Crucially, the only links from the retained stack into the legacy tree are **comments**: `apps/api/src/seeds/cards.data.ts:3` and `apps/api/src/lib/bazi/index.ts:3` cite `cloudfunctions/...` as the migration source. There are **no runtime imports** from `apps/*` into any removed path, and `docker-compose*`/`Makefile` reference only `apps/*`. This makes the removal low-risk.

## Goals / Non-Goals

**Goals:**

- Delete the Mini Program + CloudBase code, tooling, and config so they stop appearing in searches and misleading future work.
- Prune legacy documentation while preserving docs that describe the new stack.
- Refresh orientation files (`README.md`, `CLAUDE.md`, `AGENTS.md`, root `package.json`, `.gitignore`) so they describe the self-hosted web/api/admin architecture.
- Prove the retained stack is unaffected: API type-check + tests, web/admin builds, and a clean reference grep.

**Non-Goals:**

- No behavior, API, or schema changes to `apps/api`, `apps/web`, or `apps/admin`.
- No re-porting of any remaining Mini Program feature — the migration is assumed complete (per the project's web-migration tracking).
- No rewrite of CI/deploy beyond removing dead references; `docker-compose*`, `Makefile`, and `deploy/` stay as-is.
- Not touching untracked local tooling dirs (`.claire/`, `.codex/`, `__pycache__/`).

## Decisions

**1. Categorize into Remove / Update / Keep instead of a blanket `git rm`.**
A three-bucket classification (see Context table + proposal) keeps the change auditable and prevents accidentally deleting new-stack assets that happen to live beside legacy ones (e.g. `docs/api/` mixes legacy cloud-function docs with the new `openapi-integration-guide.*` and `admin-api.md`). *Alternative considered:* delete whole top-level dirs only — rejected because `docs/`, `scripts/`, and `.cursor/rules` each contain a mix of legacy and current files.

**2. Use `git rm` for tracked deletions, in one focused commit (or a small set of logically grouped commits).**
This preserves history (the code remains recoverable from git) and produces a reviewable diff. *Alternative considered:* plain `rm` — rejected; loses the staged, reviewable record.

**3. Reword provenance comments rather than delete the code they annotate.**
`cards.data.ts` and `bazi/index.ts` are retained, working code; only their "migrated from cloudfunctions/..." comments become dangling. Reword to "ported from the legacy Mini Program (removed)" so intent survives without pointing at a missing path. *Alternative:* leave comments — rejected; they would reference nonexistent files and re-introduce the confusion this change exists to remove.

**4. Update, do not delete, the four orientation files.**
`README.md`/`CLAUDE.md`/`AGENTS.md`/root `package.json` are entry points; deleting them loses onboarding value and `CLAUDE.md`/`AGENTS.md` are read by agents every session. Rewrite their architecture/commands sections to match `apps/*` + Makefile/Docker. Root `package.json` drops the Mini Program `build:*` scripts and the `tdesign-miniprogram-starter` identity; it becomes a minimal repo-root manifest (or a workspaces pointer to `apps/*`). *Open question below on the exact root-manifest shape.*

**5. Verify before claiming done — automated checks are the spec's acceptance criteria.**
Run `apps/api` typecheck + vitest, build `apps/web` and `apps/admin`, then grep the retained tree for references to removed paths. The cleanup is only complete when all pass; this is encoded as scenarios in `specs/legacy-decommission/spec.md`.

## Risks / Trade-offs

- **A retained file secretly depends on a removed asset (data/image/JSON).** → Mitigated: grep for `miniprogram`, `cloudfunctions`, `cloudbase`, `wx.cloud`, `tcb` across `apps/`, `docker-compose*`, `Makefile`, `deploy/` before deleting; the pre-scan already showed only comment references. Re-run after deletion.
- **A legacy doc is still a useful reference (e.g. card data, bazi algorithm spec).** → Mitigated: before deleting `docs/*`, confirm the equivalent knowledge exists in the new stack or `docs/web-migration/`; when in doubt, keep the doc and flag it rather than delete. Git history retains anything removed.
- **Root `package.json` removal breaks a husky/lint-staged hook or root `npm` script someone relies on.** → Mitigated: inspect `.husky/`/`lint-staged` usage; the root lint targeted Mini Program globs, so retarget or drop rather than silently break. `apps/*` have their own lint/test configs.
- **`docs/api/` deletion catches a still-referenced file.** → Mitigated: keep `openapi-integration-guide.*` and `admin-api.md`; grep `apps/` and `docs/web-migration/` for links into `docs/api/` before pruning the rest.
- **Over-deletion is hard to spot in a huge diff.** → Mitigated: group deletions by category in tasks, and rely on the build/test gate to catch any retained-stack breakage immediately.

## Migration Plan

1. **Pre-flight (read-only):** confirm baseline — `apps/api` tests pass, `apps/web`/`apps/admin` build — so any post-cleanup failure is attributable to the cleanup. Re-grep for legacy references.
2. **Remove code/tooling:** `git rm -r` the legacy dirs and files (Remove bucket).
3. **Prune docs:** `git rm` legacy `docs/*` and legacy `docs/api/*`, keeping the new-stack docs.
4. **Reword comments** in `cards.data.ts` and `bazi/index.ts`.
5. **Update orientation files:** `README.md`, `CLAUDE.md`, `AGENTS.md`, root `package.json`, `.gitignore`.
6. **Verify:** typecheck + tests + builds + reference grep (the spec scenarios).
7. **Commit** in reviewable, grouped commits with Chinese messages per repo convention.

**Rollback:** everything removed is recoverable via `git revert` of the cleanup commit(s) or `git checkout <prev-sha> -- <path>`, since deletions are staged through git rather than losing files.

## Open Questions

- **Root `package.json` shape:** reduce to a minimal manifest, or convert to an npm/pnpm workspaces root pointing at `apps/*`? Default chosen if unanswered: minimal manifest that keeps repo-wide dev conveniences (lint/format) retargeted at `apps/**`, dropping all Mini Program build scripts.
- **`.cursor/rules` keep-list:** `web-development.mdc` is clearly retained; `project_rules.mdc`, `workflows.mdc`, and `ui-design.mdc` need a content check during apply to decide keep-vs-update-vs-remove.
- **Legacy domain docs worth porting:** a few docs (`六十甲子卡牌完整数据.json`, `生辰八字计算需求文档.md`) may encode domain knowledge still relevant to `apps/api`; during apply, confirm coverage in the new stack before deleting, otherwise relocate under `docs/` rather than drop.
