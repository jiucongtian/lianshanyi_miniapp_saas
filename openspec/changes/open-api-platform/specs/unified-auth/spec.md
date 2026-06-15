## ADDED Requirements

### Requirement: 统一身份 Principal

无论请求通过何种凭据进入，鉴权层 SHALL 将其归一为同一个 `Principal` 对象供下游使用，至少包含：`callerType`（`user` | `service`）、`contextId`（所属租户/账户上下文，必有）、`subjectUserId`（被操作的终端用户，可空）、`scopes`（授权作用域数组）。下游授权与业务逻辑 MUST 只依赖 `Principal`，MUST NOT 直接判断调用方用的是哪种鉴权方式。

#### Scenario: 用户令牌产出 Principal

- **WHEN** 客户端携带有效用户 JWT 访问
- **THEN** 鉴权层产出 `Principal{ callerType:'user', contextId, subjectUserId=登录用户, scopes=角色对应集合 }`

#### Scenario: 应用签名产出 Principal

- **WHEN** 服务端携带有效 HMAC 签名访问
- **THEN** 鉴权层产出 `Principal{ callerType:'service', contextId=凭据绑定, subjectUserId=请求所带 actAsUserId, scopes=凭据授权集合 }`

### Requirement: 可插拔鉴权策略

鉴权层 SHALL 以可插拔策略方式支持多种凭据：`JWT 策略`（解析 `Authorization: Bearer`）与 `HMAC 策略`（解析 appId + 签名头）。每个门面 SHALL 声明其接受的策略集合；策略校验失败 MUST 终止请求。

#### Scenario: 门面只接受其声明的策略

- **WHEN** 调用方对仅接受 HMAC 策略的对外门面使用用户 JWT
- **THEN** 鉴权层拒绝并返回 401 `INVALID_SIGNATURE`

#### Scenario: 新增策略不影响下游

- **WHEN** 新增一种鉴权策略
- **THEN** 只要它产出合法 `Principal`，授权与业务层无需改动

### Requirement: HMAC 签名策略与防重放

`HMAC 策略` SHALL 要求 HMAC-SHA256 签名，签名输入 MUST 含 `appId`、`timestamp`、`nonce`、HTTP 方法、路径与请求体摘要，密钥为 `appSecret`。服务端 SHALL 由 `secretEnc`（AES-256-GCM 密文，主密钥与库分离）解密得到密钥后重算签名并恒定时间比较。`timestamp` MUST 在配置时间窗口（默认 ±5 分钟）内；启用 nonce 缓存时窗口内重复 `nonce` MUST 拒绝。

#### Scenario: 签名错误被拒绝

- **WHEN** 签名与服务端重算结果不一致，或 appId 不存在/已禁用
- **THEN** 返回 401 `INVALID_SIGNATURE`

#### Scenario: 过期时间戳被拒绝

- **WHEN** `timestamp` 超出配置窗口
- **THEN** 返回 401 `EXPIRED_TIMESTAMP`

#### Scenario: 重复 nonce 被拒绝

- **WHEN** 启用 nonce 缓存且窗口内同 `appId` 重复提交相同 `nonce`
- **THEN** 返回 401 `REPLAY_DETECTED`

### Requirement: 统一 scope 授权

授权 SHALL 仅基于 `Principal.scopes` 进行，对所有 `callerType` 一视同仁。用户角色 SHALL 映射为一组 scope（普通用户、管理员各自的集合），与应用凭据的授权集合走同一套校验。接口用 `requireScope(scope)` 声明所需权限，缺失 MUST 拒绝。

#### Scenario: 拥有 scope 放行

- **WHEN** `Principal.scopes` 含接口所需 scope
- **THEN** 放行进入业务处理

#### Scenario: 缺失 scope 被拒绝

- **WHEN** `Principal.scopes` 不含接口所需 scope
- **THEN** 返回 403 `FORBIDDEN_SCOPE`

### Requirement: self 与 any 作用域约束

对用户数据的操作 SHALL 用 `:self` 与 `:any` 后缀区分作用范围。持 `:self` scope 时，被操作的 `subjectUserId` MUST 等于已认证用户本人；持 `:any` scope 时，方可操作 `contextId` 内任意 `subjectUserId`。

#### Scenario: self 仅能操作本人

- **WHEN** `callerType='user'` 且仅持 `profile:write:self`，请求操作他人 `subjectUserId`
- **THEN** 返回 403 `FORBIDDEN_SCOPE`

#### Scenario: any 可代操作上下文内用户

- **WHEN** `callerType='service'` 且持 `profile:write:any`，请求带 `actAsUserId` 指向其 context 内某用户
- **THEN** 允许操作该用户数据

### Requirement: 上下文解析与跨租户安全规则

`Principal.contextId` 的来源 SHALL 由策略决定：用户策略可取自 JWT 声明或 `X-Tenant-Slug` 头；HMAC 策略 MUST 仅取自凭据绑定，MUST NOT 信任任何请求头中的租户标识。数据类 scope MUST 要求 `Principal` 已绑定 `contextId`。

#### Scenario: S2S 上下文不被请求头篡改

- **WHEN** 服务端凭据绑定 context A，但请求头携带 context B 的标识
- **THEN** 系统以绑定的 context A 为准，忽略请求头，不发生跨租户访问

#### Scenario: 无上下文不得用数据类 scope

- **WHEN** 某凭据未绑定 `contextId` 却被请求授予/使用数据类 scope（如 `profile:read:any`）
- **THEN** 系统拒绝（签发时校验失败，或调用时 403 `FORBIDDEN_SCOPE`）

### Requirement: 服务账号 subject 透传

`service` 类调用 SHALL 通过请求显式携带 `actAsUserId` 指定被操作的终端用户；该用户的合法性由调用方自身保证。无 `actAsUserId` 的 `service` 调用 SHALL 仅能访问无用户维度的接口（如平台能力或上下文级操作）。

#### Scenario: 缺 actAsUserId 调用用户级接口

- **WHEN** `service` 调用一个用户级接口但未携带 `actAsUserId`
- **THEN** 返回 400 `VALIDATION_ERROR`，提示需指定目标用户
