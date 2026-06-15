## Why

连山易后端（`apps/api`，Express + TypeScript + Mongoose）需要同时服务三类调用方：自有小程序/Web 客户端、自有及租户的服务端、以及外部第三方应用。若为「对外开放」单独搭一套并行体系，后续将出现两套鉴权、两套授权、两份业务逻辑，长期维护成本翻倍。

由于 Web/小程序与租户系统**尚未上线**，可以一步到位做成**一套系统**：统一的身份模型、统一的授权模型、一套共享业务逻辑与数据层，前端只保留一个很薄的「鉴权适配层」按凭据类型分流；对外则通过一个独立的精选门面输出，既复用同一内核，又保证第三方契约不被内部演进破坏。这样以后只维护一套系统即可同时交付内部与外部能力。

## What Changes

- 引入统一身份对象 `Principal`（`callerType`、`contextId`、`subjectUserId`、`scopes`）；下游授权与业务逻辑只依赖它，不感知具体鉴权方式。
- 鉴权改为**可插拔策略**：`JWT 策略`（客户端）与 `HMAC 策略`（服务端 appId+appSecret 签名，AES-256-GCM 存储 + 防重放），统一产出 `Principal`。
- 授权统一为 **scope 体系**：用户角色映射为 scope 集合，与应用凭据走同一套 `requireScope` 校验；用 `:self`/`:any` 表达「只能动自己」与「可代操作上下文内用户」。
- 泛化租户为 **`Account` 上下文**（`type: tenant | partner`）：每个 `Principal` 绑定一个 `Account`，AI 配置、限额等统一从中读取，消除「第三方是特例」的分支。
- 设两个**薄门面**共享同一流水线：`/api/v1`（内部全量）与 `/openapi/v1`（对外精选子集 + 稳定 DTO）；内部重构不破坏对外契约。
- 对外暴露平台能力：生辰八字 `POST /openapi/v1/bazi/calculate`、AI 问答 `POST /openapi/v1/ai/chat`，复用共享业务逻辑、零重复实现。
- 安全规则：S2S 的 `contextId` 仅取自凭据绑定（不信任租户头）；数据类 scope 必须绑定上下文。
- 配套：按应用/用户限流、调用审计、凭据与 `Account` 的管理端。

## Capabilities

### New Capabilities
- `unified-auth`: 统一身份与鉴权 —— `Principal`、可插拔策略（JWT/HMAC）、统一 scope 授权、`:self`/`:any`、上下文解析与跨租户安全规则、服务账号 subject 透传。
- `api-facades`: 两个薄门面共享单一流水线 —— 内部全量面 + 对外精选面、契约稳定性、统一响应信封与错误码、限流、审计。
- `credential-management`: `Account` 上下文模型 + 应用凭据生命周期（创建/轮换/启停/调整 scope）+ 数据类 scope 签发约束，管理员专属。
- `open-api-bazi`: 对外生辰八字计算能力（平台类 scope，无需绑定上下文）。
- `open-api-ai`: 对外 AI 问答能力（AI 配置取自绑定的 `Account`）。

### Modified Capabilities
<!-- 内部 Web/小程序与租户系统尚未上线，无已发布的 spec 需作需求级修改；本次为一次性统一建模。 -->

## Impact

- **统一层（新增/重构）**：`Principal` 类型、`authenticate` 解析中间件、`jwt`/`hmac` 两个策略、`requireScope`（统一授权，替代 `requireAuth/requireUser/requireAdmin` + `resolveTenant` + 独立 openAppAuth）。
- **模型**：`Tenant` 泛化为 `Account`（加 `type`）；新增应用凭据模型（`appId`、`secretEnc`、`scopes`、`status`、`accountId` 绑定）与审计日志模型。
- **门面**：`app.ts` 挂载 `/api/v1` 与 `/openapi/v1` 两个门面，共享下游；对外控制器做「内部结果 → 稳定对外 DTO」映射。
- **复用，不改算法**：八字计算、AI adapter 等共享业务能力。
- **依赖/配置**：Node 内置 `crypto`（HMAC + AES-GCM）；可选 Redis 做 nonce 防重放；新增环境变量（签名时间窗口、密钥主密钥等）。
- **客户端影响**：因尚未上线，可一次性按统一模型实现；无线上迁移包袱。
