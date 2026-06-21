# 身心游开放平台 · 接入指南

**文档版本：** v1.1  
**适用对象：** 第三方应用后端开发者  
**Base URL：** `https://api.lianshanyi.com/openapi/v1`（联调阶段以实际提供的地址为准）

> **联调阶段说明（请先读）**
> - **联调环境地址**与**测试凭据**由我方单独提供，本文档中的 `https://api.lianshanyi.com` 仅为示意。
> - **首批开放接口以我方通知为准**（生辰八字计算优先）。
> - 联调期间，**防重放（nonce 去重）与限流可能暂未严格启用**；但请您**仍按规范为每次请求生成唯一 nonce**——正式环境会开启，避免上线时才发现签名实现有遗漏。
> - **签名算法、请求头、响应信封与错误码即为最终契约**，请按本文档一次性实现到位，正式上线无需改动。

---

## 目录

1. [接入须知](#1-接入须知)
2. [凭据与签名](#2-凭据与签名)
3. [公共请求规范](#3-公共请求规范)
4. [公共响应规范](#4-公共响应规范)
5. [错误码参考](#5-错误码参考)
6. [接口：生辰八字计算](#6-接口生辰八字计算)
7. [接口：助学童子问答](#7-接口助学童子问答)
8. [接口：智慧洞见](#8-接口智慧洞见)
9. [接口：每日愈见](#9-接口每日愈见)
10. [签名示例代码](#10-签名示例代码)
11. [联调检查清单](#11-联调检查清单)
12. [常见问题](#12-常见问题)

---

## 1. 接入须知

### 调用模式

本平台采用**服务端对服务端（Server-to-Server）**调用模式。您的 `appId` 和 `appSecret` 属于服务端凭据，**必须保存在您自己的后台服务中，严禁下发到任何客户端**（App、小程序、H5、浏览器 JS 等）。

正确的调用链路如下：

```
您的终端用户
    ↓
您的后台服务（持有 appId + appSecret，在此签名）
    ↓
身心游开放平台 /openapi/v1
```

> **为什么不能在客户端直接调用？** 客户端可被逆向分析，密钥一旦泄露将无法溯源且难以控制影响范围。如需为您的终端用户提供直连能力，请联系我们开通「短期令牌」方案。

### 接入流程

1. 联系我方运营，提供应用名称及所需功能，获取 `appId` 和 `appSecret`（密钥**仅签发时展示一次，请立即保存**）
2. 按本文档完成签名逻辑开发
3. 使用测试凭据完成联调
4. 通过验收后切换为生产凭据

---

## 2. 凭据与签名

### 凭据说明

| 字段 | 说明 |
|---|---|
| `appId` | 应用唯一标识，公开传输，放在请求头 `X-App-Id` |
| `appSecret` | 应用密钥，**永远不上行**，仅用于本地生成签名 |

### 签名算法

每次请求必须附带 HMAC-SHA256 签名，防止请求被篡改或重放。

#### 第一步：构造待签名字符串

将以下字段按顺序用换行符（`\n`）拼接：

```
{HTTP_METHOD}\n
{PATH}\n
{TIMESTAMP}\n
{NONCE}\n
{BODY_HASH}
```

> 即：5 个字段用**单个**换行符 `\n` 连接成一个字符串，字段间与首尾**不要有多余空格或换行**。例如：
> `POST\n/openapi/v1/bazi/calculate\n1718000000\na1b2c3d4e5f6g7h8\n<bodyHash>`

各字段说明：

| 字段 | 类型 | 说明 |
|---|---|---|
| `HTTP_METHOD` | string | 大写 HTTP 方法，如 `POST` |
| `PATH` | string | 请求路径（不含域名、不含 query string），如 `/openapi/v1/bazi/calculate` |
| `TIMESTAMP` | string | 当前 Unix 时间戳（秒），字符串形式，如 `"1718000000"` |
| `NONCE` | string | 随机字符串，每次请求唯一，建议 16 位以上，如 `"a1b2c3d4e5f6g7h8"` |
| `BODY_HASH` | string | 请求体的 SHA-256 十六进制摘要；无请求体时对空字符串取摘要 |

#### 第二步：计算签名

```
signature = HMAC-SHA256(appSecret, signString)
```

结果以**十六进制小写字符串**表示。

#### 第三步：放入请求头

| 请求头 | 值 |
|---|---|
| `X-App-Id` | 您的 `appId` |
| `X-Timestamp` | 签名时使用的时间戳（与签名串中一致） |
| `X-Nonce` | 签名时使用的随机串（与签名串中一致） |
| `X-Signature` | 第二步计算出的签名值 |

#### 签名有效期

- 时间戳与服务器时间偏差不得超过 **±5 分钟**，超出返回 `EXPIRED_TIMESTAMP`
- 同一 `appId` 在有效期内相同 `nonce` 不得重复使用，重复返回 `REPLAY_DETECTED`

---

## 3. 公共请求规范

```
Content-Type: application/json
X-App-Id: your_app_id
X-Timestamp: 1718000000
X-Nonce: a1b2c3d4e5f6g7h8
X-Signature: 3a7f2e...（十六进制小写）
```

除特别说明外，接口使用 **HTTPS POST**，请求体为 JSON。`GET` 接口无请求体，签名时 `BODY_HASH` 按空字符串计算。

---

## 4. 公共响应规范

所有接口响应均使用统一信封：

```jsonc
// 成功
{
  "success": true,
  "data": { ... },   // 业务数据
  "error": null,
  "code": null
}

// 失败
{
  "success": false,
  "data": null,
  "error": "可读的错误描述",
  "code": "MACHINE_READABLE_CODE"   // 稳定错误码，见第 5 节
}
```

---

## 5. 错误码参考

| HTTP 状态 | `code` | 说明 | 建议处理 |
|---|---|---|---|
| 401 | `INVALID_SIGNATURE` | 签名校验失败，或 appId 不存在/已禁用 | 检查签名逻辑与凭据有效性 |
| 401 | `EXPIRED_TIMESTAMP` | 请求时间戳超出 ±5 分钟 | 同步服务器时间后重试 |
| 401 | `REPLAY_DETECTED` | nonce 在有效期内重复使用 | 确保每次请求使用唯一 nonce |
| 403 | `FORBIDDEN_SCOPE` | 该应用未授权此接口的调用权限 | 联系我方开通对应 scope |
| 400 | `VALIDATION_ERROR` | 请求参数不合法 | 检查 `error` 字段中的参数说明 |
| 400 | `BAZI_OUT_OF_RANGE` | 日期超出支持范围（1900–2100） | 检查输入日期 |
| 404 | `NOT_FOUND` | 请求资源不存在（如指定日期暂无每日愈见） | 确认日期或稍后重试 |
| 429 | `RATE_LIMITED` | 请求频率超出限额 | 降低调用频率，查看响应头中的限流信息 |
| 500 | `AI_UPSTREAM_ERROR` | AI 服务临时异常 | 稍后重试，持续异常请联系我方 |
| 500 | `INTERNAL_ERROR` | 服务内部错误 | 记录 `X-Request-Id` 响应头后联系我方排查 |

---

## 6. 接口：生辰八字计算

### `POST /openapi/v1/bazi/calculate`

**所需权限：** `bazi:calculate`

根据输入的出生日期时间，计算四柱八字及五行分布。支持公历与农历两种输入方式。

#### 请求参数

```jsonc
{
  "year":    1990,        // 必填 · 年，整数
  "month":   8,           // 必填 · 月，1–12
  "day":     15,          // 必填 · 日，1–31
  "hour":    14,          // 必填 · 时（24小时制），0–23
  "minute":  30,          // 选填 · 分，0–59，默认 0
  "isLunar": false,       // 选填 · 是否农历，默认 false（公历）
  "isLeapMonth": false    // 选填 · isLunar=true 时有效，是否闰月，默认 false
}
```

#### 成功响应 `data`

```jsonc
{
  "yearPillar": {
    "stem":         "庚",   // 天干
    "branch":       "午",   // 地支
    "stemWuXing":   "金",   // 天干五行
    "branchWuXing": "火"    // 地支五行
  },
  "monthPillar": {
    "stem":         "甲",
    "branch":       "申",
    "stemWuXing":   "木",
    "branchWuXing": "金"
  },
  "dayPillar": {
    "stem":         "壬",
    "branch":       "子",
    "stemWuXing":   "水",
    "branchWuXing": "水"
  },
  "hourPillar": {
    "stem":         "丁",
    "branch":       "未",
    "stemWuXing":   "火",
    "branchWuXing": "土"
  },
  "wuXingCount": {
    "木": 1,
    "火": 2,
    "土": 1,
    "金": 2,
    "水": 2
  },
  "lunarDate": "农历1990年七月二十五日"   // isLunar=true 时才返回此字段
}
```

#### 字段说明

| 字段 | 类型 | 说明 |
|---|---|---|
| `yearPillar` / `monthPillar` / `dayPillar` / `hourPillar` | object | 年/月/日/时柱 |
| `*.stem` | string | 天干（甲乙丙丁戊己庚辛壬癸之一） |
| `*.branch` | string | 地支（子丑寅卯辰巳午未申酉戌亥之一） |
| `*.stemWuXing` | string | 天干对应五行（木/火/土/金/水） |
| `*.branchWuXing` | string | 地支对应五行 |
| `wuXingCount` | object | 八字中各五行出现次数统计 |
| `lunarDate` | string? | 农历输入时返回，公历输入时不含此字段 |

#### 请求示例

```bash
curl -X POST https://api.lianshanyi.com/openapi/v1/bazi/calculate \
  -H "Content-Type: application/json" \
  -H "X-App-Id: your_app_id" \
  -H "X-Timestamp: 1718000000" \
  -H "X-Nonce: a1b2c3d4e5f6g7h8" \
  -H "X-Signature: 3a7f2e..." \
  -d '{
    "year": 1990,
    "month": 8,
    "day": 15,
    "hour": 14
  }'
```

---

## 7. 接口：助学童子问答

### `POST /openapi/v1/tutor-chat`

**所需权限：** `tutor:chat`

面向学习与问答场景的「助学童子」AI 辅导能力。支持传入可选 `conversationId` 进行连续对话；首轮不传时，服务端会返回新的 `conversationId`。

#### 请求参数

```jsonc
{
  "content": "请介绍一下庚午日柱的特点",          // 必填 · 用户问题，单次不超过 2000 字
  "conversationId": "..."                         // 选填 · 多轮对话 ID，首轮不传
}
```

#### 成功响应 `data`

```jsonc
{
  "reply": "您好！关于您提到的……",                 // AI 回复内容
  "conversationId": "d72c8106-11ba-4c4c-9c52-77d63a95c058"
}
```

#### 字段说明

| 字段 | 类型 | 说明 |
|---|---|---|
| `reply` | string | AI 回复内容 |
| `conversationId` | string | 会话 ID；后续请求可原样传回以延续对话 |

#### 请求示例

```bash
curl -X POST https://api.lianshanyi.com/openapi/v1/tutor-chat \
  -H "Content-Type: application/json" \
  -H "X-App-Id: your_app_id" \
  -H "X-Timestamp: 1718000000" \
  -H "X-Nonce: x9y8z7w6v5u4t3s2" \
  -H "X-Signature: 9c4d1a..." \
  -d '{ "content": "请介绍一下庚午日柱的特点" }'
```

---

## 8. 接口：智慧洞见

### `POST /openapi/v1/card-insight`

**所需权限：** `insight:interpret`

基于卡牌名称与可选问题，生成面向当前场景的卡牌解读。

#### 请求参数

```jsonc
{
  "cardName": "庚午",              // 必填 · 卡牌名称，1–10 字（60甲子之一）
  "question": "今年适合创业吗？"    // 选填 · 具体问题，不超过 200 字
}
```

#### 成功响应 `data`

```jsonc
{
  "interpretation": "【庚午】—— 卦象示以坚韧之道……"
}
```

#### 字段说明

| 字段 | 类型 | 说明 |
|---|---|---|
| `interpretation` | string | 卡牌解读正文 |

#### 请求示例

```bash
curl -X POST https://api.lianshanyi.com/openapi/v1/card-insight \
  -H "Content-Type: application/json" \
  -H "X-App-Id: your_app_id" \
  -H "X-Timestamp: 1718000000" \
  -H "X-Nonce: b2c3d4e5f6a7b8c9" \
  -H "X-Signature: 7e2f9a..." \
  -d '{
    "cardName": "庚午",
    "question": "今年适合创业吗？"
  }'
```

---

## 9. 接口：每日愈见

### `GET /openapi/v1/daily-insight`

**所需权限：** `daily-insight:read`

根据调用方传入的日期、卡牌与当日干支信息，生成「每日愈见」文案。

> 本接口使用 `GET` query string 传参。签名时 `PATH` 仍为 `/openapi/v1/daily-insight`，不包含 query string；`BODY_HASH` 按空字符串计算。

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `date` | string | 是 | 目标日期，格式 `YYYY-MM-DD` |
| `cardName` | string | 是 | 卡牌名称，1–10 字（60甲子之一） |

#### 成功响应 `data`

```jsonc
{
  "title":          "2026-06-15 · 庚午 · 庚午日",     // 标题
  "summary":        "今日主卦「庚午」……",             // 摘要
  "fullText":       "今日干支 庚午……",                // 全文
  "luckyDirection": "西北",                           // 吉利方位
  "luckyColor":     "蓝色",                           // 吉利颜色
  "luckyNumber":    8                                 // 吉利数字
}
```

#### 字段说明

| 字段 | 类型 | 说明 |
|---|---|---|
| `title` | string | 运势标题 |
| `summary` | string | 摘要 |
| `fullText` | string | 全文 |
| `luckyDirection` | string | 吉利方位 |
| `luckyColor` | string | 吉利颜色 |
| `luckyNumber` | number | 吉利数字 |

#### 请求示例

```bash
curl -X GET 'https://api.lianshanyi.com/openapi/v1/daily-insight?date=2026-06-15&cardName=%E5%BA%9A%E5%8D%88' \
  -H "X-App-Id: your_app_id" \
  -H "X-Timestamp: 1718000000" \
  -H "X-Nonce: b2c3d4e5f6a7b8c9" \
  -H "X-Signature: 7e2f9a..."
```

---

## 10. 签名示例代码

### JavaScript / Node.js

```javascript
const crypto = require('crypto');

const config = {
  baseUrl: 'https://api.lianshanyi.com',
  appId: 'your_app_id',
  appSecret: 'your_app_secret',
};

function createSignature({ appSecret, method, path, timestamp, nonce, body = '' }) {
  const bodyHash = crypto.createHash('sha256').update(body).digest('hex');
  const signStr = [method.toUpperCase(), path, timestamp, nonce, bodyHash].join('\n');
  return crypto.createHmac('sha256', appSecret).update(signStr).digest('hex');
}

async function requestOpenApi({ method = 'POST', path, query, data }) {
  // GET 请求没有请求体，签名时 body 必须使用空字符串。
  // POST 请求签名用的 body 字符串必须与实际发送的请求体完全一致。
  const body = data === undefined ? '' : JSON.stringify(data);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = crypto.randomBytes(16).toString('hex');
  const signature = createSignature({
    appSecret: config.appSecret,
    method,
    path,
    timestamp,
    nonce,
    body,
  });

  const search = query ? `?${new URLSearchParams(query).toString()}` : '';
  const headers = {
    'X-App-Id': config.appId,
    'X-Timestamp': timestamp,
    'X-Nonce': nonce,
    'X-Signature': signature,
  };

  if (data !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${config.baseUrl}${path}${search}`, {
    method,
    headers,
    body: data === undefined ? undefined : body,
  });

  const result = await response.json();
  if (!response.ok || result.success === false) {
    const error = new Error(result.error || `HTTP ${response.status}`);
    error.status = response.status;
    error.code = result.code;
    error.response = result;
    throw error;
  }

  return result;
}

async function calculateBazi() {
  return requestOpenApi({
    method: 'POST',
    path: '/openapi/v1/bazi/calculate',
    data: {
      year: 1990,
      month: 8,
      day: 15,
      hour: 14,
      minute: 30,
      isLunar: false,
    },
  });
}

async function askTutor() {
  return requestOpenApi({
    method: 'POST',
    path: '/openapi/v1/tutor-chat',
    data: {
      content: '抽卡解读情感问题，第一张14，第二张44',
      // conversationId: '7651828284779708450', // 继续同一轮对话时传入
    },
  });
}

async function getWisdomInsight() {
  return requestOpenApi({
    method: 'POST',
    path: '/openapi/v1/card-insight',
    data: {
      cardId: 7,
      cardName: '庚午',
      profileName: '李明',
      gender: 'male',
      baziSummary: '庚午日主，八字金火交战，性格刚烈果断',
      question: '今年适合创业吗？',
    },
  });
}

async function getDailyInsight() {
  return requestOpenApi({
    method: 'GET',
    path: '/openapi/v1/daily-insight',
    query: {
      date: '2026-06-15',
      cardId: '7',
      cardName: '庚午',
      dayStem: '庚',
      dayBranch: '午',
    },
  });
}

async function main() {
  try {
    console.log('生辰八字计算：', await calculateBazi());
    console.log('助学童子问答：', await askTutor());
    console.log('智慧洞见：', await getWisdomInsight());
    console.log('每日愈见：', await getDailyInsight());
  } catch (error) {
    console.error('OpenAPI 调用失败：', {
      status: error.status,
      code: error.code,
      message: error.message,
      response: error.response,
    });
    process.exitCode = 1;
  }
}

main();
```

---

## 11. 联调检查清单

在联调前，请确认以下事项：

- [ ] `appSecret` 仅保存在服务端，未出现在任何客户端代码或版本仓库中
- [ ] 签名时使用的 `timestamp` 为 Unix 秒级时间戳（非毫秒）
- [ ] 签名时使用的 `PATH` 不含域名，不含 query string，以 `/` 开头
- [ ] `POST` 请求体与签名中的 `body` 内容**字节一致**（编码、空格、顺序相同）
- [ ] `GET` 请求签名时 `PATH` 不含 query string，`body` 使用空字符串
- [ ] 每次请求的 `nonce` 唯一，不重复使用
- [ ] 服务器时间已与 NTP 同步，时间偏差 < 5 分钟
- [ ] 已确认所需 scope 已开通（`bazi:calculate` / `tutor:chat` / `insight:interpret` / `daily-insight:read`）
- [ ] 已实现 `429 RATE_LIMITED` 的重试退避逻辑

---

## 12. 常见问题

**Q：总是收到 `INVALID_SIGNATURE`，如何排查？**

按以下顺序检查：
1. `appId` 和 `appSecret` 是否与签发时一致（注意首尾空格）
2. 签名串中 `PATH` 是否与实际请求路径一致，包括大小写
3. 签名时 `body` 字符串与实际发送的请求体是否**完全相同**（包括 JSON key 顺序）
4. `timestamp` 是否为秒级（10 位数字），不是毫秒（13 位）
5. 签名结果是否为十六进制**小写**字符串

**Q：收到 `EXPIRED_TIMESTAMP`，如何处理？**

您的服务器时间与标准时间偏差超过 5 分钟，请同步 NTP 时间服务器。

**Q：助学童子支持多轮连续对话吗？**

支持。首轮调用 `POST /openapi/v1/tutor-chat` 时可以不传 `conversationId`，服务端会返回新的 `conversationId`；后续调用传回该值即可延续对话。

**Q：`wuXingCount` 总共是几个计数？**

四柱共 8 个字（4 天干 + 4 地支），`wuXingCount` 各值之和为 8。

**Q：是否支持批量计算？**

当前版本不支持批量接口，每次请求计算一条。如有大批量需求，请联系我方评估。

**Q：遇到 `AI_UPSTREAM_ERROR` 怎么办？**

AI 服务临时异常，建议等待 10–30 秒后重试。若持续出现，请携带响应头中的 `X-Request-Id` 联系我方技术支持。

---

*如有疑问，请联系我方技术支持，并提供您的 `appId` 与出错时的 `X-Request-Id` 以便快速定位。*
