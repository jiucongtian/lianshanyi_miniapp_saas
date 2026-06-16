## ADDED Requirements

### Requirement: 生成 OpenAPI 凭据

后台 SHALL 允许管理员生成新的 OpenAPI 凭据，输入名称、备注、绑定 Account、scopes 与可选限流；系统生成 App ID 与一次性明文 App Secret，Secret 以 AES-256-GCM 加密入库。

#### Scenario: 成功生成凭据并展示明文 Secret

- **WHEN** 管理员填写合法的名称、Account、至少一个 scope 并提交
- **THEN** 系统创建凭据，返回 App ID 与完整 64 位 App Secret 明文，前端提供一键复制并提示「Secret 仅显示一次」

#### Scenario: 数据类 scope 必须绑定 Account

- **WHEN** 管理员勾选数据类 scope 但未绑定有效 Account
- **THEN** 系统返回 400 与「数据类 scope 仅能授予已绑定 Account 的凭据」

### Requirement: 凭据备注信息

`OpenApp` 模型 SHALL 新增 `remark` 字段；生成与编辑凭据时可填写备注，列表与详情可展示备注。

#### Scenario: 编辑凭据备注

- **WHEN** 管理员在凭据详情中修改备注并保存
- **THEN** 系统持久化 `remark`，列表与详情展示更新后的备注

### Requirement: 凭据列表与查看

后台 SHALL 提供凭据列表（支持按 Account 过滤）与详情查看；列表与详情 MUST NOT 返回明文或密文 Secret。

#### Scenario: 列表不泄露 Secret

- **WHEN** 管理员打开凭据列表
- **THEN** 返回 App ID、名称、备注、scopes、状态、限流、创建时间，但不包含任何形式的 Secret

### Requirement: 轮换密钥

后台 SHALL 允许管理员轮换指定凭据的 Secret；轮换后旧 Secret 立即失效，新明文 Secret 一次性返回，并使该凭据的解密缓存失效。

#### Scenario: 轮换后旧 Secret 失效

- **WHEN** 管理员对某凭据执行轮换
- **THEN** 系统生成新 Secret 并返回明文，使用旧 Secret 的 HMAC 请求自此被拒绝

### Requirement: 启停与 scope/限流管理

后台 SHALL 允许管理员启用/禁用凭据、编辑 scopes 与限流配置；禁用的凭据 MUST 无法通过 HMAC 鉴权。

#### Scenario: 禁用凭据后请求被拒绝

- **WHEN** 管理员将某凭据状态置为 `disabled`
- **THEN** 该凭据后续的 OpenAPI 请求返回鉴权失败，且解密缓存被清除
