## ADDED Requirements

### Requirement: 两个门面共享单一流水线

系统 SHALL 提供两个路由门面——内部全量面 `/api/v1` 与对外精选面 `/openapi/v1`——二者 MUST 复用同一条下游流水线（统一鉴权解析 → 统一授权 → 共享业务能力 → 数据层），差异仅在于各自接受的鉴权策略与暴露的接口清单。

#### Scenario: 同一能力两面行为一致

- **WHEN** 同一业务能力分别经两个门面被合法调用
- **THEN** 走相同的授权与业务逻辑，结果语义一致（仅对外 DTO 可能为精选子集）

#### Scenario: 门面只暴露各自清单

- **WHEN** 调用方访问某门面未暴露的接口
- **THEN** 返回 404，不泄露该接口在另一门面是否存在

### Requirement: 对外门面契约稳定性

对外门面 `/openapi/v1` SHALL 仅暴露经显式登记的精选接口子集，并在控制器层将内部结果**显式逐字段映射**为稳定的对外 DTO，MUST NOT 透传内部结构。内部接口或实现的重构 MUST NOT 改变已发布的对外 DTO 字段。

#### Scenario: 内部结构变更不破坏对外契约

- **WHEN** 内部业务模块重构、字段重命名
- **THEN** 只需更新对外门面的映射层，已发布的 `/openapi/v1` DTO 字段保持不变

#### Scenario: 对外不暴露内部专属字段

- **WHEN** 内部结果含调试/原始字段（如 `raw`）
- **THEN** 对外 DTO 默认不包含这些字段

### Requirement: 统一响应信封与稳定错误码

两个门面 SHALL 使用统一响应信封 `{ success, data, error, code }`；对外门面的 `code` MUST 为稳定的机器可读错误码（如 `INVALID_SIGNATURE`、`FORBIDDEN_SCOPE`、`RATE_LIMITED`、`VALIDATION_ERROR`），错误消息 MUST NOT 泄露内部堆栈或上游供应商细节。

#### Scenario: 失败响应携带稳定错误码

- **WHEN** 请求处理失败
- **THEN** 返回 `success=false`、`data=null`、`error` 可读消息、`code` 稳定错误码

### Requirement: 按应用与按用户的限流

系统 SHALL 对调用施加限流：`service` 调用按 `appId` 维度，`user` 调用按用户/IP 维度，阈值优先取上下文或凭据配置，未配置时回退全局默认。超限 MUST 返回 429 `RATE_LIMITED`。

#### Scenario: 应用超限

- **WHEN** 某 `appId` 在窗口内请求数超过其阈值
- **THEN** 返回 429 `RATE_LIMITED` 并附标准限流响应头

### Requirement: 调用审计

系统 SHALL 为对外门面的每次调用记录审计日志，至少含 `appId`/`contextId`、路径、scope、HTTP 状态、错误码、耗时、时间戳，且 MUST NOT 记录 `appSecret` 明文或完整签名串。

#### Scenario: 记录一次对外调用

- **WHEN** 任一 `/openapi/v1/*` 请求完成（无论成败）
- **THEN** 异步写入一条脱敏审计记录
