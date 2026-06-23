## ADDED Requirements

### Requirement: Legacy Mini Program and CloudBase artifacts are removed

The repository SHALL NOT retain the WeChat Mini Program client, the Tencent CloudBase cloud functions, or their build/config/debug tooling once the change is applied. Specifically, the following SHALL be deleted: `miniprogram/`, `cloudfunctions/`, `cloudbase/`, `.cloudbase/`, `config/`, `wechat-mp-debug-pkg/`, `scripts/regression-test.js`, `project.config.json`, `project.private.config.json`, `.cursorrules-architecture`, and the legacy `.cursor/rules/*.mdc` files that describe the Mini Program / CloudBase architecture.

#### Scenario: Legacy directories are gone

- **WHEN** the change has been applied and the working tree is inspected
- **THEN** `miniprogram/`, `cloudfunctions/`, `cloudbase/`, `.cloudbase/`, `config/`, and `wechat-mp-debug-pkg/` no longer exist
- **AND** `project.config.json`, `project.private.config.json`, `.cursorrules-architecture`, and `scripts/regression-test.js` no longer exist

#### Scenario: Legacy Cursor rules are pruned

- **WHEN** `.cursor/rules/` is listed after the change
- **THEN** the Mini Program / CloudBase rule files (`cloudbase-platform.mdc`, `miniprogram-development.mdc`, `cloudrun-development.mdc`, `data-model-creation.mdc`, `database.mdc`, `architecture-design.mdc`, `cloud_rules.mdc`) are absent
- **AND** only rules relevant to the web/api stack remain

### Requirement: The retained web/api/admin stack remains intact and verifiable

The change SHALL NOT modify the behavior of `apps/api`, `apps/web`, or `apps/admin`. After removal, the retained stack SHALL still build, type-check, and pass its existing tests with no new failures introduced by the cleanup.

#### Scenario: API tests and type-check pass

- **WHEN** `cd apps/api && npm run typecheck && npm test` is run after the cleanup
- **THEN** type-checking succeeds and the existing vitest suites pass with the same result as before the change

#### Scenario: Web and admin builds succeed

- **WHEN** `apps/web` and `apps/admin` are built (`npm run build`) after the cleanup
- **THEN** both builds complete successfully

### Requirement: No retained file references a removed path

After removal, no retained source, config, or documentation file in the new stack SHALL import, require, or otherwise depend on a deleted path. Stale provenance comments that point at removed directories SHALL be reworded or dropped.

#### Scenario: No dangling imports

- **WHEN** the repository is searched for references to removed paths (`miniprogram/`, `cloudfunctions/`, `cloudbase`, `wx.cloud`, `tcb`) outside of `openspec/` and git history
- **THEN** no retained executable code imports or requires any removed path

#### Scenario: Provenance comments reworded

- **WHEN** `apps/api/src/seeds/cards.data.ts` and `apps/api/src/lib/bazi/index.ts` are inspected
- **THEN** comments no longer instruct the reader to consult a now-deleted `cloudfunctions/...` source as the source of truth

### Requirement: Orientation docs describe the self-hosted web stack

The top-level orientation files SHALL describe the current self-hosted Node/TS API plus Vue H5 web architecture, not the Mini Program / CloudBase architecture. This applies to `README.md`, `CLAUDE.md`, `AGENTS.md`, root `package.json`, and `.gitignore`. These files SHALL be updated, not deleted.

#### Scenario: Architecture description is current

- **WHEN** `CLAUDE.md` and `AGENTS.md` are read after the change
- **THEN** they describe the `apps/api` + `apps/web` + `apps/admin` architecture and its commands (`Makefile`, `docker-compose`)
- **AND** they no longer instruct readers to follow the "pages → controllers → services → beans → cloudfunctions" Mini Program layering or to deploy cloud functions

#### Scenario: Root package metadata no longer targets the Mini Program

- **WHEN** the root `package.json` is read after the change
- **THEN** it no longer advertises Mini Program `build:dev`/`build:product` scripts that invoke the deleted `config/build.js`

### Requirement: Documentation for the new stack is preserved

The change SHALL retain documentation that describes the migrated stack, including `docs/web-migration/`, `docs/api/openapi-integration-guide.*`, `docs/api/admin-api.md`, `production-server-guide.md`, and the `openspec/` change history.

#### Scenario: New-stack docs survive the prune

- **WHEN** the docs tree is inspected after the change
- **THEN** `docs/web-migration/` and the OpenAPI/admin integration guides remain present and untouched
