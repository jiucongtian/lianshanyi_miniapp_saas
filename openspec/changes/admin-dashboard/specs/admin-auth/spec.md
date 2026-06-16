## ADDED Requirements

### Requirement: 管理员密码登录

系统 SHALL 提供管理员登录接口，复用现有 `User.isAdmin` 标志与密码登录（bcrypt）机制；只有 `isAdmin === true` 的账户可以登录后台。

#### Scenario: 管理员凭正确用户名密码登录成功

- **WHEN** 一个 `isAdmin=true` 的用户提交正确的用户名/手机号与密码
- **THEN** 系统返回 access token、refresh token 与用户信息，token 中 `isAdmin` 为 true

#### Scenario: 非管理员账户被拒绝登录后台

- **WHEN** 一个 `isAdmin=false` 的普通用户在后台登录页提交正确的用户名与密码
- **THEN** 系统返回 403 与错误码 `FORBIDDEN_ADMIN`，不签发后台会话

#### Scenario: 错误密码被拒绝

- **WHEN** 用户提交错误的密码
- **THEN** 系统返回 401 与「用户名或密码错误」，且不泄露账户是否存在

### Requirement: 后台接口管理员鉴权

系统 SHALL 提供 `requireAdmin` 中间件，所有 `/admin/*` 管理类接口 MUST 经过 JWT 鉴权且校验 `principal` 对应用户 `isAdmin===true` 后才能访问。

#### Scenario: 无令牌访问被拒绝

- **WHEN** 客户端未携带有效 Bearer 令牌访问任意 `/admin/*` 接口
- **THEN** 系统返回 401 与错误码 `UNAUTHORIZED`

#### Scenario: 普通用户令牌访问被拒绝

- **WHEN** 客户端携带普通用户（非 admin）令牌访问 `/admin/*` 接口
- **THEN** 系统返回 403 与错误码 `FORBIDDEN_ADMIN`

#### Scenario: 管理员令牌访问通过

- **WHEN** 客户端携带 `isAdmin` 令牌访问 `/admin/*` 接口
- **THEN** 请求通过鉴权进入业务处理

### Requirement: 前端路由守卫

后台前端 SHALL 实现全局路由守卫：未登录或登录态失效时访问任意受保护页面 MUST 重定向到登录页。

#### Scenario: 未登录访问受保护页重定向

- **WHEN** 未登录用户直接访问 `/credentials` 等受保护路由
- **THEN** 前端重定向到 `/login` 并在登录成功后跳回原目标页

#### Scenario: 令牌过期自动登出

- **WHEN** 任意后台接口返回 401
- **THEN** 前端清除本地会话并重定向到登录页
