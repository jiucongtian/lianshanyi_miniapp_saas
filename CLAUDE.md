# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git 仓库

**GitHub 仓库：** `git@github.com:jiucongtian/lianshanyi_miniapp_saas.git`

**提交规范（必须遵守）：**
1. 每完成一个功能后，及时 `git commit`（不要等积累很多改动）
2. 功能验证通过后，立即 `git push origin <branch>` 推送到 GitHub
3. 不要等用户提醒，主动完成提交和推送
4. 提交信息使用中文，格式：`feat/fix/refactor: 简短描述`

## Project Overview

联山易 (Lianshanyi) - A WeChat Mini Program for Chinese BaZi (生辰八字) fortune telling and card drawing. Built with WeChat CloudBase (腾讯云开发) for backend services.

## Commands

```bash
# Linting
npm run lint              # Run ESLint
npm run lint:fix          # Auto-fix linting issues

# Build for environment (updates appid, env ID, debug settings)
npm run build:dev         # Build for development
npm run build:product     # Build for production
npm run build:list        # List available environments
```

**WeChat DevTools Setup:**
1. Import project root directory
2. `cd miniprogram && npm install tdesign-miniprogram --production`
3. In DevTools: 工具 > 构建 npm

**Cloud Function Deployment:** Right-click cloud function folder > "上传并部署" (manual deployment required, do not auto-deploy)

## Architecture

### Layered Structure (MUST follow)

```
View Layer (pages/) → Controller Layer (controllers/) → Service Layer (services/) → Bean Layer (beans/) → Cloud Functions (cloudfunctions/)
```

- **pages/** - WXML/WXSS/JSON only, UI rendering, no business logic
- **controllers/** - Page logic, coordinates Service and View, handles user interaction
- **services/** - Business logic, API calls via `BaseService.callFunction()`, data caching
- **beans/** - Data models with validation, `ResponseBean` for unified response handling
- **cloudfunctions/** - Server-side logic, database operations, external APIs

### Key Base Classes

- `miniprogram/common/BaseClass.js` - Base class with logging, performance monitoring
- `miniprogram/services/BaseService.js` - Cloud function calling with error handling
- `miniprogram/controllers/BaseController.js` - UI helpers, page coordination
- `miniprogram/beans/ResponseBean.js` - Unified response parsing from cloud results

### Version Management

`miniprogram/utils/manager/versionManager.js` maps client version to cloud function versions:

```javascript
'1.4.0': {
  userManagement: 'v1_3',
  profileManagement: 'v1_2',
  cozeFunctions: 'v1_3',
  // ... other functions
}
```

**CRITICAL:** When modifying cloud functions, check `versionManager.js` to find the correct version for the current client. Do not modify old versions. Cloud function names follow pattern: `{baseName}_{version}` (e.g., `userManagement_v1_3`).

## Coding Standards

### Required Patterns

1. **No duplicate code** - Extract common logic to utility functions
2. **All cloud function responses must go through Bean classes** - Use `ResponseBean.fromCloudResult()`
3. **Use logger, not console** - `const log = createModuleLogger('ModuleName')`
4. **No dynamic globalData** - Define all properties in `app.js` globalData upfront

### Service Pattern

```javascript
class SomeService extends BaseService {
  async someMethod() {
    const response = await this.callFunction('functionName', { action: 'actionName', data: {} });
    if (response.success && response.data) {
      response.data = new SomeBean(response.data);
    }
    return response;
  }
}
```

### Controller Pattern

```javascript
class SomeController {
  constructor(page) { this.page = page; }

  async loadData() {
    this.page.setData({ loading: true });
    const response = await someService.getData();
    if (response.success) {
      this.page.setData({ data: response.data });
    } else {
      this._showError(response.error);
    }
    this.page.setData({ loading: false });
  }
}
```

### Naming Conventions

- Files: PascalCase (`UserService.js`)
- Classes: PascalCase (`UserService`)
- Methods: camelCase (`getUserInfo`)
- Private methods: underscore prefix (`_validate`)
- Constants: UPPER_SNAKE_CASE

## Important Rules

1. **Do not auto-deploy cloud functions** - Remind user to deploy manually
2. **Do not auto-commit code** - Only commit when explicitly requested
3. **Do not create test pages** without permission
4. **Do not run `npm run dev`** without permission
5. **Update API docs** in `docs/api/` when modifying cloud functions
6. **Read API docs** in `docs/api/` before calling cloud functions
7. **No login required** - WeChat Mini Programs use `wx.cloud` with automatic user identification via `cloud.getWXContext().OPENID`

## Environment Configuration

Build script `config/build.js` updates:
- `project.config.json` - App ID
- `project.private.config.json` - Project name
- `miniprogram/app.js` - Cloud environment ID
- `cloudbase/cloudbaserc.json` - Cloud function env variables

## Key Files to Read

1. `.cursor/rules/architecture-design.mdc` - Detailed architecture patterns
2. `.cursor/rules/project_rules.mdc` - Development rules
3. `miniprogram/utils/manager/versionManager.js` - Version mapping
4. `docs/api/` - API documentation