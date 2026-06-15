## ADDED Requirements

### Requirement: 对外智慧洞见接口（单轮）

系统 SHALL 经对外门面提供 `POST /openapi/v1/ai/chat`（智慧洞见），要求平台类 scope `ai:chat`，复用共享业务能力中的 AI adapter，AI 配置取自 `Principal.contextId` 指向的 `Account.aiConfig`，MUST NOT 直接耦合具体 AI 供应商实现。该接口为**单轮无状态问答**，MUST NOT 接受或返回 `conversationId`，服务端不维护多轮上下文。

#### Scenario: 单轮问答成功

- **WHEN** 携带合法签名与 scope 的请求提交单次 `content`
- **THEN** 系统调用 AI adapter 返回 `reply`，`success=true`，响应不含 `conversationId`

#### Scenario: 不维护多轮上下文

- **WHEN** 连续两次请求提交不同 `content`
- **THEN** 两次互相独立，服务端不基于上一次内容维持上下文

### Requirement: AI 入参校验与边界约束

接口 SHALL 校验 `content` 非空且长度受限，超限 MUST 返回 `VALIDATION_ERROR`。

#### Scenario: 空内容被拒绝

- **WHEN** 请求 `content` 为空或缺失
- **THEN** 系统返回 400 与错误码 `VALIDATION_ERROR`，不调用 AI

#### Scenario: 内容超长被拒绝

- **WHEN** `content` 超过配置上限
- **THEN** 系统返回 400 与错误码 `VALIDATION_ERROR`

### Requirement: AI 调用配额约束

系统 SHALL 对 AI 接口按应用配置施加配额/限流约束，超额 MUST 返回 `RATE_LIMITED`，并 SHALL NOT 向第三方泄露内部供应商错误细节。

#### Scenario: 超出 AI 配额

- **WHEN** 应用 AI 调用超过其配额/限流阈值
- **THEN** 系统返回 429 与错误码 `RATE_LIMITED`

#### Scenario: 上游错误脱敏

- **WHEN** 底层 AI 供应商返回错误
- **THEN** 系统返回通用错误码（如 `AI_UPSTREAM_ERROR`），消息不包含供应商密钥或内部堆栈
