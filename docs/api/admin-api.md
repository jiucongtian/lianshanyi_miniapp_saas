# 管理后台 API 文档

> Base URL: `http://localhost:3001/api/v1/admin`
>
> 除登录接口外，所有请求须携带 `Authorization: Bearer <token>` 头，且对应用户 `isAdmin = true`。

---

## 鉴权

### POST /admin/auth/login

管理员登录。

**Request Body**
```json
{
  "username": "admin",
  "password": "your_password"
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "token": "<jwt>",
    "user": { "userId": "...", "username": "admin", "isAdmin": true }
  }
}
```

**错误码**
- `403 FORBIDDEN_ADMIN` — 账号存在但非管理员

---

### PUT /admin/auth/password

修改管理员密码（需登录）。

**Request Body**
```json
{
  "oldPassword": "current",
  "newPassword": "new_password_min8"
}
```

---

## AI 配置

### GET /admin/ai-config

获取当前 AI 服务配置。Token 掩码（仅显示末 4 位）。

**Response `data`**
```json
{
  "provider": "coze",
  "cozeTokenMasked": "...Mdv",
  "cardDrawWorkflowId": "7565131575660003366",
  "dailyInsightWorkflowId": "7583167143870382106",
  "assistantBotId": "7615870340559978548"
}
```

### PUT /admin/ai-config

更新 AI 配置。`cozeToken` 留空则不修改。

**Request Body**
```json
{
  "provider": "coze",
  "cozeToken": "sat_xxxxx",
  "cardDrawWorkflowId": "...",
  "dailyInsightWorkflowId": "...",
  "assistantBotId": "..."
}
```

### POST /admin/ai-config/test

测试当前 AI 配置连通性。

**Response `data`**
```json
{ "ok": true, "latencyMs": 342 }
```

---

## 凭据管理

### GET /admin/credentials

列出所有 OpenAPI 凭据（不含 Secret）。

**Query Params**: `page`, `limit`

**Response `data`**
```json
{
  "credentials": [
    {
      "appId": "app_xxx",
      "tenantId": "tenant_yyy",
      "remark": "联调测试",
      "scopes": ["card-insight", "tutor-chat"],
      "status": "active",
      "rateLimit": 60,
      "createdAt": "2025-06-01T00:00:00Z"
    }
  ],
  "meta": { "total": 5, "page": 1, "limit": 20 }
}
```

### POST /admin/credentials

创建凭据。**App Secret 仅此次返回明文，请立即保存。**

**Request Body**
```json
{
  "tenantId": "tenant_id",
  "remark": "联调方备注",
  "scopes": ["card-insight"],
  "rateLimit": 60
}
```

**Response `data`** 包含 `appSecret` 字段（明文，唯一一次）。

### GET /admin/credentials/:appId

获取单个凭据详情（无 Secret）。

### PATCH /admin/credentials/:appId

更新备注、scopes、限流。

### POST /admin/credentials/:appId/rotate-secret

轮换 App Secret。旧 Secret 立即失效。**Response `data.appSecret` 明文返回，仅此次。**

### PATCH /admin/credentials/:appId/status

启用 / 禁用凭据。

**Request Body**: `{ "status": "active" | "disabled" }`

---

## 租户管理

### GET /admin/accounts

**Query Params**: `page`, `limit`, `search`（名称模糊搜索）

### GET /admin/accounts/:id

### PATCH /admin/accounts/:id

```json
{
  "status": "active",
  "limits": { "maxUsers": 200, "aiCallsPerDay": 5000 },
  "ipWhitelist": ["1.2.3.4", "5.6.7.8"]
}
```

---

## 用户管理

### GET /admin/users

**Query Params**: `page`, `limit`, `search`（用户名/手机号）, `tenantId`（租户内搜索）

### PATCH /admin/users/:userId/type

```json
{ "userType": "guest" | "normal" | "student" | "premium" }
```

---

## 反馈管理

### GET /admin/feedbacks

**Query Params**: `page`, `limit`, `status`（`pending` | `reviewed`）

### POST /admin/feedbacks/:tenantId/:feedbackId/review

```json
{ "reply": "感谢反馈！" }
```

---

## 数据看板

### GET /admin/logs

**Query Params**: `page`, `limit`, `appId`, `path`（正则），`statusCode`, `from`, `to`（ISO 8601）

### GET /admin/dashboard/usage

按凭据和接口路径聚合调用量。

**Query Params**: `appId`, `from`, `to`

**Response `data`** 数组：
```json
[
  {
    "_id": { "appId": "app_xxx", "path": "/openapi/v1/card-insight" },
    "total": 120,
    "success": 115,
    "avgLatencyMs": 2340
  }
]
```

### GET /admin/dashboard/overview

最近 30 天运营概览。

**Response `data`**
```json
{
  "apiCalls": { "total": 5000, "last30d": 800 },
  "cardDraws": { "total": 2200, "last30d": 350 },
  "dailyInsights": { "total": 890, "last30d": 120 }
}
```

---

## AI 账单

账单入口：管理后台 `/admin/billing`。所有金额均以人民币“分”为 API 存储单位，前端展示为元。只对外部 OpenAPI 的 `card-insight`（智慧洞见）、`daily-insight`（每日愈见）及 `tutor-chat`（助学童子）创建逐笔账单；内部 Web 端及定时任务不计入此账单。

调用在鉴权、权限、参数、账户检查通过后先产生 `pending` 记录。Coze 成功返回且已配置单价时为 `charged`；单价为零或使用 mock 时为 `free`；Coze 成功但未配置单价时为 `unpriced`；生成失败时为 `failed`，金额为零。401 等前置失败不产生账单记录。成功响应携带 `X-Billing-Entry-Id` 供调用方对账。已完成记录保留当时单价，不随之后调价变化；账单记录没有 90 天 TTL。

### GET /admin/billing/rates

返回三类接口已配置的单价；未配置的接口不在数组中。

### PUT /admin/billing/rates/:product

`product` 可选 `card-insight`、`daily-insight`、`tutor-chat`。

```json
{ "priceFen": 150 }
```

`priceFen` 为非负整数；`0` 表示免费。修改只影响修改后成功完成的调用。

### GET /admin/billing/entries

逐笔账单，按生成时间降序返回。Query：`appId`、`accountId`、`product`、`from`、`to`、`page`（默认 1）、`limit`（默认 50，最大 100）。`from` 包含，`to` 不包含，均为 ISO 8601 时间。

**Response `data`**：`{ "items": [...], "meta": { "total": 100, "page": 1, "limit": 50 } }`。每条包含 `_id`、`appId`、`accountId`、账户名称快照 `accountName`、`product`、`status`、`provider`、`priceFen`、`amountFen`、`createdAt`、`completedAt`；不保存请求正文、回答、密钥或签名。短期审计日志的 `billingEntryId` 可与逐笔账单 ID 对应。

### GET /admin/billing/summary

使用与 `entries` 相同的筛选参数（忽略分页），按接口汇总 `total`、`charged`、`failed`、`unpriced`、`amountFen`。

### GET /admin/billing/statement

使用与 `entries` 相同的筛选参数，返回该范围的完整 `summary`、`items`、`total`，供后台打印 PDF 对账单。单次最多 5000 条，超过时返回 `400 EXPORT_LIMIT`，应缩小账期或 App ID 范围。导出文档是调用对账单，不是税务发票。

### 按时间段生成与重算账单

管理员可为任意不超过 366 天的北京时间账期设置三类接口各自的固定单价（单位：分），先预览成功调用数与金额，再确认生成。7、8、9 月可分别设置不同价格。旧日志中 `/card-insight`、`/daily-insight`、`/tutor-chat` 及其 `/openapi/v1` 前缀版本，只有 HTTP 200 进入候选；旧调用的 Coze 提供方由运营方确认，在逐笔账单中标为 `historical-inferred`。账户 ID 优先使用调用日志的 `contextId`，缺失时使用 App ID 绑定的账户；仍无法归属则显示异常数量并拒绝生成，不静默遗漏。已有实时账单按其保存的提供方判断，mock 免费；重复生成不会把同一调用重复计费。

- `GET /admin/billing/periods/current?from=<ISO>&to=<ISO>`：查询精确时间段的已生成账期及其版本；不存在返回 `null`。
- `POST /admin/billing/periods/preview`：请求 `{ "from": "<ISO>", "to": "<ISO>", "pricesFen": { "card-insight": 100, "daily-insight": 200, "tutor-chat": 300 } }`；返回 `callCount`、`amountFen`、`historicalCount`、`retainedCount`、`skippedCount`、`byProduct` 和 `fingerprint`，不写账。
- `POST /admin/billing/periods/generate`：在预览请求体中增加 `expectedFingerprint`；只有来源和价格仍与预览一致才生成。已存在相同账期时追加新版本并将其设为当前版本，旧版本保留；与其他已生成账期重叠时返回 `409 BILLING_PERIOD_OVERLAP`。
- `GET /admin/billing/periods/:id/entries`、`/summary`、`/statement`：查询生成后的版本；可用 `revision` 指定旧版，并按 `appId`、`accountId`、`product` 筛选。明细支持 `page`、`limit`；对账单上限 5000 笔。

生成的账期使用独立、不可变的逐笔快照。改写价格后重新生成只新增版本，不改动实时 `BillingEntry`；旧审计日志 90 天过期后，已生成账期仍可凭保存的逐笔快照重新定价。未生成前已过期的日志不能从在线库恢复，须另查备份。导出的 PDF 是对账单，不是税务发票。
