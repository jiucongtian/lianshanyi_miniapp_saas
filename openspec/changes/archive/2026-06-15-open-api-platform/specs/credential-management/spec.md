## ADDED Requirements

### Requirement: Account 上下文模型

系统 SHALL 维护统一的 `Account`（上下文）模型，作为 `Principal.contextId` 的指向目标，至少包含 `type`（`tenant` | `partner`）、`status`、`aiConfig`、`limits`。`tenant` 类型额外承载客户端展示配置（主题、文案等），`partner` 类型忽略展示配置。

#### Scenario: 两类上下文统一承载能力配置

- **WHEN** 任意 `Principal`（用户或服务）落到某 `Account`
- **THEN** 其 AI 配置、限额等均从该 `Account` 读取，无需区分内部租户或第三方的特例分支

### Requirement: 应用凭据生命周期

系统 SHALL 在管理面（`/api/v1/open-apps`，仅管理员）提供应用凭据的创建、列表、查询、密钥轮换、启停与 scope 调整。`appSecret` 明文 MUST 仅在创建/轮换当次返回一次，库内仅存其 AES-256-GCM 密文。

#### Scenario: 创建应用返回一次性密钥

- **WHEN** 管理员提交应用名称、绑定的 `Account` 与所需 scopes
- **THEN** 系统生成 `appId` 与一次性 `appSecret` 明文返回，库内仅存密文

#### Scenario: 轮换后旧密钥失效

- **WHEN** 管理员轮换某应用密钥
- **THEN** 返回新的一次性明文，旧密钥的签名校验立即失效

#### Scenario: 禁用后调用被拒

- **WHEN** 管理员将应用置为 `disabled`
- **THEN** 该应用后续对 `/openapi/v1/*` 的调用返回 401 `INVALID_SIGNATURE`

### Requirement: 数据类 scope 的签发约束

签发或调整凭据 scope 时，系统 SHALL 校验：数据类 scope（操作用户/上下文数据，如 `profile:*`、`card:draw`）只能授予已绑定 `Account` 的凭据；平台类 scope（如 `bazi:calculate`、`ai:chat`）无此约束。

#### Scenario: 未绑定上下文不得授予数据类 scope

- **WHEN** 管理员尝试给一个未绑定 `Account` 的凭据授予 `profile:read:any`
- **THEN** 系统拒绝该签发/调整操作

### Requirement: 管理端仅管理员

凭据与 `Account` 管理接口 SHALL 仅对持管理员 scope 的 `Principal` 开放。

#### Scenario: 非管理员被拒

- **WHEN** 非管理员访问 `/api/v1/open-apps/*`
- **THEN** 返回 403/401，拒绝访问
