## ADDED Requirements

### Requirement: AI 服务配置持久化

系统 SHALL 提供持久化的系统配置（`app_config` 集合）以管理 AI provider（`mock`/`coze`）、`COZE_API_TOKEN`、各 workflow ID 与 bot ID；敏感字段（如 Token）MUST 以 AES-256-GCM 加密存储。

#### Scenario: 保存 AI 配置

- **WHEN** 管理员在 AI 配置页设置 provider 为 `coze` 并填写 Token、workflow/bot ID 并保存
- **THEN** 系统加密持久化 Token，明文持久化非敏感字段，返回保存成功

#### Scenario: 读取配置时脱敏

- **WHEN** 管理员打开 AI 配置页
- **THEN** 系统返回各字段，但 Token 等敏感字段以掩码（如末四位）展示，不返回明文

### Requirement: 运行时优先读取后台配置

AI 适配器 SHALL 在运行时优先从 `app_config` 读取配置，缺失时回退到环境变量；配置更新后 SHALL 在合理时间内对新请求生效（如清除内存缓存）。

#### Scenario: 切换 provider 即时生效

- **WHEN** 管理员将 provider 从 `mock` 切换为 `coze` 并保存
- **THEN** 后续 AI 接口调用真实走 Coze 适配器，无需重启容器

#### Scenario: 配置缺失回退环境变量

- **WHEN** `app_config` 中未设置 `COZE_API_TOKEN`
- **THEN** 适配器回退使用环境变量 `COZE_API_TOKEN`

### Requirement: 配置连通性校验

后台 SHOULD 提供「测试连接」能力，对当前 Coze 配置发起一次最小化探测调用并返回结果。

#### Scenario: 测试 Coze 连接

- **WHEN** 管理员点击「测试连接」
- **THEN** 系统使用当前配置发起探测，返回成功或包含上游错误信息的失败结果
