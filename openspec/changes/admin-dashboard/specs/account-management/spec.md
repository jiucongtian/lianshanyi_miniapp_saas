## ADDED Requirements

### Requirement: 租户/Account 列表与查看

后台 SHALL 提供 Tenant/Partner（Account）的列表、搜索与详情查看，展示类型、slug、名称、状态、套餐、限流额度与 IP 白名单。

#### Scenario: 查看 Account 列表

- **WHEN** 管理员打开租户管理页
- **THEN** 系统分页返回 Account 列表，支持按名称/slug 搜索

### Requirement: 编辑 Account 配置

后台 SHALL 允许管理员编辑 Account 的主题配置、限流额度（`maxUsers`、`aiCallsPerDay`）与 IP 白名单。

#### Scenario: 修改限流额度

- **WHEN** 管理员修改某 Account 的 `aiCallsPerDay` 并保存
- **THEN** 系统持久化新额度，详情展示更新后的值

#### Scenario: 编辑 IP 白名单

- **WHEN** 管理员为某 Account 增加一条 IP 白名单并保存
- **THEN** 系统持久化白名单，后续来自该 IP 的相关请求按白名单策略处理

### Requirement: Account 状态启停

后台 SHALL 允许管理员将 Account 状态在 `trial`/`active`/`suspended` 间切换；`suspended` 的 Account 关联凭据 MUST 无法正常调用。

#### Scenario: 暂停 Account

- **WHEN** 管理员将某 Account 状态置为 `suspended`
- **THEN** 系统持久化状态，该 Account 下凭据的 OpenAPI 调用被拒绝
