## ADDED Requirements

### Requirement: 独立桌面端后台应用

系统 SHALL 在 monorepo 中新建独立的桌面端前端应用 `apps/admin`（Vue3 + Vite + Element Plus + Pinia + Vue Router），与移动端 `apps/web` 完全分离，拥有独立的路由、布局、构建与 Docker 服务。

#### Scenario: 后台应用独立构建与运行

- **WHEN** 在 `apps/admin` 执行构建并通过 docker-compose 启动
- **THEN** 后台应用以独立服务（如 `lsy-admin`）运行，可在桌面浏览器访问，且不影响 `apps/web`

### Requirement: 统一后台布局与导航

后台 SHALL 提供统一的桌面端布局（顶栏 + 侧边导航 + 内容区），侧边导航按模块（凭据管理、AI 配置、租户管理、用户/反馈、调用日志）组织。

#### Scenario: 通过侧边导航切换模块

- **WHEN** 管理员点击侧边导航中的某个模块
- **THEN** 内容区加载对应模块页面，当前导航项高亮

### Requirement: 统一 API 客户端与错误处理

后台 SHALL 提供统一的 API 客户端，自动注入 Bearer 令牌、统一解析 `{ success, data, error, code }` 响应信封，并对错误码做统一提示。

#### Scenario: 业务错误统一提示

- **WHEN** 任意后台接口返回 `success=false`
- **THEN** API 客户端抛出包含 `error` 文案的异常并由调用方以统一的消息提示展示
