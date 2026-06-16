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
