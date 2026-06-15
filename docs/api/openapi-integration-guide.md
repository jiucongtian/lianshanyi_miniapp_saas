# 身心游开放平台 · 接入指南

**文档版本：** v1.0  
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
7. [接口：智慧洞见](#7-接口智慧洞见)
8. [接口：每日愈见](#8-接口每日愈见)
9. [接口：助学童子（TBD）](#9-接口助学童子tbd)
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

所有接口均使用 **HTTPS POST**，请求体为 JSON。

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
    "stem":         "壬",
    "branch":       "申",
    "stemWuXing":   "水",
    "branchWuXing": "金"
  },
  "dayPillar": {
    "stem":         "戊",
    "branch":       "子",
    "stemWuXing":   "土",
    "branchWuXing": "水"
  },
  "hourPillar": {
    "stem":         "丁",
    "branch":       "未",
    "stemWuXing":   "火",
    "branchWuXing": "土"
  },
  "wuXingCount": {
    "木": 0,
    "火": 2,
    "土": 3,
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

## 7. 接口：智慧洞见

### `POST /openapi/v1/ai/chat`

**所需权限：** `ai:chat`

基于连山易学知识体系的「智慧洞见」AI 问答能力。**仅支持单轮问答**：每次请求独立提问、独立返回，服务端不维护多轮上下文。

#### 请求参数

```jsonc
{
  "content": "帮我分析一下庚午日柱的性格特点"   // 必填 · 用户问题，单次不超过 2000 字
}
```

#### 成功响应 `data`

```jsonc
{
  "reply": "根据庚午日柱……"   // AI 回复内容
}
```

> **注意：** 本接口为无状态单轮问答，不返回也不接受 `conversationId`。若需要"连续对话"效果，请由您的后台自行把上下文拼进单次 `content` 提交。

#### 请求示例

```bash
curl -X POST https://api.lianshanyi.com/openapi/v1/ai/chat \
  -H "Content-Type: application/json" \
  -H "X-App-Id: your_app_id" \
  -H "X-Timestamp: 1718000000" \
  -H "X-Nonce: x9y8z7w6v5u4t3s2" \
  -H "X-Signature: 9c4d1a..." \
  -d '{ "content": "帮我分析一下庚午日柱的性格特点" }'
```

---

## 8. 接口：每日愈见

### `POST /openapi/v1/daily-insight`

**所需权限：** `daily-insight:read`

获取指定日期的「每日愈见」——当日卦象、干支与运势文案。同一日期对所有调用稳定一致。

#### 请求参数

```jsonc
{
  "date": "2026-06-15"   // 选填 · 目标日期 YYYY-MM-DD，默认当天
}
```

#### 成功响应 `data`

```jsonc
{
  "date":           "2026-06-15",
  "cardId":         42,            // 卦序 1–60
  "cardName":       "...",         // 卦名
  "dayStem":        "庚",          // 当日天干
  "dayBranch":      "午",          // 当日地支
  "title":          "...",         // 标题
  "summary":        "...",         // 摘要
  "fullText":       "...",         // 全文
  "luckyDirection": "东南",        // 吉利方位
  "luckyColor":     "金色",        // 吉利颜色
  "luckyNumber":    8              // 吉利数字
}
```

#### 字段说明

| 字段 | 类型 | 说明 |
|---|---|---|
| `date` | string | 日期 YYYY-MM-DD |
| `cardId` | number | 当日卦序，1–60 |
| `cardName` | string | 卦名 |
| `dayStem` / `dayBranch` | string | 当日天干 / 地支 |
| `title` / `summary` / `fullText` | string? | 运势标题 / 摘要 / 全文 |
| `luckyDirection` / `luckyColor` | string? | 吉利方位 / 颜色 |
| `luckyNumber` | number? | 吉利数字 |

> 若指定日期尚未生成内容，返回 `404 NOT_FOUND`。

#### 请求示例

```bash
curl -X POST https://api.lianshanyi.com/openapi/v1/daily-insight \
  -H "Content-Type: application/json" \
  -H "X-App-Id: your_app_id" \
  -H "X-Timestamp: 1718000000" \
  -H "X-Nonce: b2c3d4e5f6a7b8c9" \
  -H "X-Signature: 7e2f9a..." \
  -d '{ "date": "2026-06-15" }'
```

---

## 9. 接口：助学童子（TBD）

> **状态：待定（TBD）。** 该接口规格尚未最终确定，下方为占位说明，**请勿据此开发**，最终字段以我方后续更新为准。

「助学童子」是面向学习场景的 AI 辅导能力（区别于「智慧洞见」的通用问答）。预计形态：

| 项 | 暂定值 |
|---|---|
| 端点 | `POST /openapi/v1/tutor/chat`（暂定） |
| 所需权限 | `tutor:chat`（暂定） |
| 请求参数 | TBD（预计与「智慧洞见」类似：单次 `content` 提问） |
| 响应 | TBD（预计含 `reply`） |

> 如该接口在您的首批联调范围内，请与我方确认排期与最终规格。

---

## 10. 签名示例代码

### Node.js

```javascript
const crypto = require('crypto');

function sign({ appSecret, method, path, timestamp, nonce, body = '' }) {
  const bodyHash = crypto.createHash('sha256').update(body).digest('hex');
  const signStr = [method.toUpperCase(), path, timestamp, nonce, bodyHash].join('\n');
  return crypto.createHmac('sha256', appSecret).update(signStr).digest('hex');
}

// 使用示例
const appId     = 'your_app_id';
const appSecret = 'your_app_secret';
const timestamp = String(Math.floor(Date.now() / 1000));
const nonce     = crypto.randomBytes(16).toString('hex');
const body      = JSON.stringify({ year: 1990, month: 8, day: 15, hour: 14 });

const signature = sign({
  appSecret,
  method:    'POST',
  path:      '/openapi/v1/bazi/calculate',
  timestamp,
  nonce,
  body,
});

// 将 appId / timestamp / nonce / signature 放入请求头发送
```

### Python

```python
import hmac
import hashlib
import time
import secrets

def sign(app_secret: str, method: str, path: str,
         timestamp: str, nonce: str, body: str = '') -> str:
    body_hash = hashlib.sha256(body.encode()).hexdigest()
    sign_str  = '\n'.join([method.upper(), path, timestamp, nonce, body_hash])
    return hmac.new(app_secret.encode(), sign_str.encode(), hashlib.sha256).hexdigest()

# 使用示例
app_id     = 'your_app_id'
app_secret = 'your_app_secret'
timestamp  = str(int(time.time()))
nonce      = secrets.token_hex(16)
body       = '{"year":1990,"month":8,"day":15,"hour":14}'

signature = sign(app_secret, 'POST', '/openapi/v1/bazi/calculate', timestamp, nonce, body)
```

### Java

```java
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;

public class OpenApiSign {
    public static String sign(String appSecret, String method, String path,
                               String timestamp, String nonce, String body) throws Exception {
        String bodyHash = sha256Hex(body);
        String signStr  = String.join("\n", method.toUpperCase(), path, timestamp, nonce, bodyHash);
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(appSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] raw = mac.doFinal(signStr.getBytes(StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        for (byte b : raw) sb.append(String.format("%02x", b));
        return sb.toString();
    }

    private static String sha256Hex(String input) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        byte[] hash = md.digest(input.getBytes(StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        for (byte b : hash) sb.append(String.format("%02x", b));
        return sb.toString();
    }
}
```

---

## 11. 联调检查清单

在联调前，请确认以下事项：

- [ ] `appSecret` 仅保存在服务端，未出现在任何客户端代码或版本仓库中
- [ ] 签名时使用的 `timestamp` 为 Unix 秒级时间戳（非毫秒）
- [ ] 签名时使用的 `PATH` 不含域名，不含 query string，以 `/` 开头
- [ ] 请求体与签名中的 `body` 内容**字节一致**（编码、空格、顺序相同）
- [ ] 每次请求的 `nonce` 唯一，不重复使用
- [ ] 服务器时间已与 NTP 同步，时间偏差 < 5 分钟
- [ ] 已确认所需 scope 已开通（`bazi:calculate` / `ai:chat` / `daily-insight:read`；助学童子 scope 待定）
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

**Q：智慧洞见支持多轮连续对话吗？**

不支持。智慧洞见为**单轮无状态**问答，每次请求独立、不记忆上下文，也不涉及 `conversationId`。如需"连续对话"效果，请由您的后台自行把历史拼进单次 `content`。

**Q：`wuXingCount` 总共是几个计数？**

四柱共 8 个字（4 天干 + 4 地支），`wuXingCount` 各值之和为 8。

**Q：是否支持批量计算？**

当前版本不支持批量接口，每次请求计算一条。如有大批量需求，请联系我方评估。

**Q：遇到 `AI_UPSTREAM_ERROR` 怎么办？**

AI 服务临时异常，建议等待 10–30 秒后重试。若持续出现，请携带响应头中的 `X-Request-Id` 联系我方技术支持。

---

*如有疑问，请联系我方技术支持，并提供您的 `appId` 与出错时的 `X-Request-Id` 以便快速定位。*
