# 用户反馈管理 API

## 概述
用户反馈管理云函数，提供用户反馈提交、查询等功能。

## 云函数名称
`feedbackManagement`

## 版本信息
- **云函数版本**: v1.4
- **对应客户端版本**: v1.3.0+
- **创建时间**: 2024-12

---

## Action 列表

| Action | 功能描述 | 用户权限 |
|--------|---------|---------|
| submitFeedback | 提交用户反馈 | 所有用户 |
| getUserFeedbacks | 获取用户反馈列表 | 所有用户 |
| getFeedbackDetail | 获取反馈详情 | 所有用户 |

---

## 1. submitFeedback - 提交用户反馈

### 功能说明
用户提交问题反馈、功能建议或其他意见。系统会验证用户身份、反馈内容格式，并创建反馈记录。

### 请求参数

```javascript
{
  action: 'submitFeedback',
  data: {
    feedbackType: 'problem',      // 必填，反馈类型：problem/suggestion/other
    title: '卡牌显示异常',        // 必填，标题，10-50个字符
    content: '在查看卡牌时，发现某些卡牌的图片显示不出来，希望能修复这个问题。' // 必填，内容，20-500个字符
  }
}
```

#### 参数说明

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| feedbackType | string | 是 | 反馈类型，可选值：problem（问题反馈）、suggestion（功能建议）、other（其他反馈） |
| title | string | 是 | 反馈标题，长度10-50个字符 |
| content | string | 是 | 反馈内容，长度20-500个字符 |

### 返回数据

#### 成功响应

```json
{
  "success": true,
  "message": "反馈提交成功",
  "data": {
    "feedbackId": "feedback_60a1b2c3d4e5f6789abcdef0",
    "feedback": {
      "_id": "feedback_60a1b2c3d4e5f6789abcdef0",
      "userId": "user_60a1b2c3d4e5f6789abcdef0",
      "openid": "oABCD1234567890abcdef1234567890ab",
      "feedbackType": "problem",
      "title": "卡牌显示异常",
      "content": "在查看卡牌时，发现某些卡牌的图片显示不出来，希望能修复这个问题。",
      "status": "pending",
      "adminReply": null,
      "adminId": null,
      "replyTime": null,
      "createTime": "2023-09-14T08:00:00.000Z",
      "updateTime": "2023-09-14T08:00:00.000Z",
      "isDeleted": false
    }
  }
}
```

#### 错误响应

```json
{
  "success": false,
  "error": "标题长度必须在10-50个字符之间",
  "code": "INVALID_TITLE_LENGTH"
}
```

### 错误码说明

| 错误码 | 说明 |
|--------|------|
| MISSING_REQUIRED_FIELDS | 缺少必填字段（反馈类型、标题或内容） |
| INVALID_FEEDBACK_TYPE | 无效的反馈类型 |
| INVALID_TITLE_LENGTH | 标题长度不符合要求（10-50字符） |
| INVALID_CONTENT_LENGTH | 内容长度不符合要求（20-500字符） |
| USER_NOT_FOUND | 用户不存在或未激活 |
| SUBMIT_FAILED | 提交失败（数据库错误等） |

### 使用示例

```javascript
// 在小程序中调用
const { VersionManager } = require('../../utils/manager/versionManager');

// 获取云函数名称
const functionName = VersionManager.getFunctionName('feedbackManagement');

wx.cloud.callFunction({
  name: functionName,
  data: {
    action: 'submitFeedback',
    data: {
      feedbackType: 'problem',
      title: '卡牌显示异常',
      content: '在查看卡牌时，发现某些卡牌的图片显示不出来，希望能修复这个问题。'
    }
  }
}).then(res => {
  if (res.result.success) {
    console.log('反馈提交成功:', res.result.data);
  } else {
    console.error('反馈提交失败:', res.result.error);
  }
});
```

---

## 2. getUserFeedbacks - 获取用户反馈列表

### 功能说明
获取当前用户提交的所有反馈列表，支持分页和筛选。

### 请求参数

```javascript
{
  action: 'getUserFeedbacks',
  data: {
    page: 1,                    // 可选，页码，默认1
    limit: 20,                  // 可选，每页数量，默认20
    feedbackType: 'problem',    // 可选，按类型筛选
    status: 'pending'           // 可选，按状态筛选
  }
}
```

#### 参数说明

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | number | 否 | 页码，默认1 |
| limit | number | 否 | 每页数量，默认20 |
| feedbackType | string | 否 | 按类型筛选：problem/suggestion/other |
| status | string | 否 | 按状态筛选：pending/processing/resolved/closed |

### 返回数据

#### 成功响应

```json
{
  "success": true,
  "data": {
    "feedbacks": [
      {
        "_id": "feedback_60a1b2c3d4e5f6789abcdef0",
        "userId": "user_60a1b2c3d4e5f6789abcdef0",
        "openid": "oABCD1234567890abcdef1234567890ab",
        "feedbackType": "problem",
        "title": "卡牌显示异常",
        "content": "在查看卡牌时，发现某些卡牌的图片显示不出来...",
        "status": "pending",
        "adminReply": null,
        "adminId": null,
        "replyTime": null,
        "createTime": "2023-09-14T08:00:00.000Z",
        "updateTime": "2023-09-14T08:00:00.000Z",
        "isDeleted": false
      }
    ],
    "total": 5,
    "page": 1,
    "limit": 20,
    "hasMore": false
  }
}
```

### 错误响应

```json
{
  "success": false,
  "error": "获取反馈列表失败",
  "code": "GET_LIST_FAILED"
}
```

### 使用示例

```javascript
const { VersionManager } = require('../../utils/manager/versionManager');

const functionName = VersionManager.getFunctionName('feedbackManagement');

wx.cloud.callFunction({
  name: functionName,
  data: {
    action: 'getUserFeedbacks',
    data: {
      page: 1,
      limit: 20,
      feedbackType: 'problem' // 只查询问题反馈
    }
  }
}).then(res => {
  if (res.result.success) {
    console.log('反馈列表:', res.result.data.feedbacks);
  }
});
```

---

## 3. getFeedbackDetail - 获取反馈详情

### 功能说明
获取单条反馈的详细信息。

### 请求参数

```javascript
{
  action: 'getFeedbackDetail',
  data: {
    feedbackId: 'feedback_60a1b2c3d4e5f6789abcdef0'  // 必填，反馈ID
  }
}
```

#### 参数说明

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| feedbackId | string | 是 | 反馈ID |

### 返回数据

#### 成功响应

```json
{
  "success": true,
  "data": {
    "_id": "feedback_60a1b2c3d4e5f6789abcdef0",
    "userId": "user_60a1b2c3d4e5f6789abcdef0",
    "openid": "oABCD1234567890abcdef1234567890ab",
    "feedbackType": "problem",
    "title": "卡牌显示异常",
    "content": "在查看卡牌时，发现某些卡牌的图片显示不出来，希望能修复这个问题。",
    "status": "pending",
    "adminReply": null,
    "adminId": null,
    "replyTime": null,
    "createTime": "2023-09-14T08:00:00.000Z",
    "updateTime": "2023-09-14T08:00:00.000Z",
    "isDeleted": false
  }
}
```

#### 错误响应

```json
{
  "success": false,
  "error": "反馈不存在",
  "code": "FEEDBACK_NOT_FOUND"
}
```

### 错误码说明

| 错误码 | 说明 |
|--------|------|
| MISSING_FEEDBACK_ID | 缺少反馈ID参数 |
| FEEDBACK_NOT_FOUND | 反馈不存在或已被删除 |
| GET_DETAIL_FAILED | 获取详情失败 |

### 使用示例

```javascript
const { VersionManager } = require('../../utils/manager/versionManager');

const functionName = VersionManager.getFunctionName('feedbackManagement');

wx.cloud.callFunction({
  name: functionName,
  data: {
    action: 'getFeedbackDetail',
    data: {
      feedbackId: 'feedback_60a1b2c3d4e5f6789abcdef0'
    }
  }
}).then(res => {
  if (res.result.success) {
    console.log('反馈详情:', res.result.data);
  }
});
```

---

## 数据字段说明

### 反馈类型（feedbackType）

| 值 | 说明 | 使用场景 |
|----|------|---------|
| problem | 问题反馈 | 用户遇到bug、使用问题等 |
| suggestion | 功能建议 | 用户提出新功能建议、改进建议等 |
| other | 其他反馈 | 用户的其他意见、想法等 |

### 反馈状态（status）

| 值 | 说明 | 备注 |
|----|------|------|
| pending | 待处理 | 默认状态，管理员尚未开始处理 |
| processing | 处理中 | 管理员已开始处理 |
| resolved | 已处理 | 问题已解决 |
| closed | 已关闭 | 反馈已关闭，不再处理 |

**注意**: 状态字段仅用于后台管理，普通用户只能查看，无法修改。

---

## 业务规则

### 内容限制
- **标题**: 10-50个字符
- **内容**: 20-500个字符

### 用户验证
- 提交反馈前会验证用户是否存在且激活
- 所有反馈都关联用户的 openid 和 userId

### 数据安全
- 用户只能查看和提交自己的反馈
- 反馈内容会进行长度和格式验证
- 使用软删除机制，不会真正删除数据

---

## 注意事项

1. **版本兼容性**: 该云函数对应客户端版本 1.3.0+，使用时需通过 VersionManager 获取正确的函数名称
2. **字符限制**: 标题和内容都有严格的长度限制，超出范围会返回错误
3. **权限控制**: 当前版本所有已登录用户都可以提交反馈
4. **状态管理**: 反馈状态由管理员在后台管理，用户端暂不支持修改状态

---

## 后续扩展

### 计划功能
- [ ] 图片上传支持
- [ ] 反馈撤回功能
- [ ] 反馈评论功能
- [ ] 管理员回复通知

### 管理端功能（待开发）
- 查看所有用户反馈
- 处理反馈状态
- 回复用户反馈
- 反馈统计分析

