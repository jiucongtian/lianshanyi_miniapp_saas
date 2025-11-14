# drawCardManagement 云函数接口文档

## 接口概述

`drawCardManagement` 云函数用于管理抽卡功能的配额检查和使用记录。包含两个主要功能：
1. 检查用户抽卡配额（checkQuota）
2. 记录抽卡历史（recordDraw）

## 云函数信息

- **函数名称**: `drawCardManagement`
- **调用方式**: `wx.cloud.callFunction`
- **认证方式**: 小程序自动认证（通过 openid）
- **返回格式**: JSON

## 功能说明

### 整体流程

```mermaid
graph TD
    A[用户点击抽卡] --> B[调用checkQuota检查配额]
    B --> C{是否可以抽卡?}
    C -->|否| D[显示错误提示]
    C -->|是| E[执行抽卡]
    E --> F[调用AI解读]
    F --> G{AI解读成功?}
    G -->|否| H[显示错误]
    G -->|是| I[显示结果]
    I --> J[调用recordDraw记录]
    J --> K[刷新配额信息]
```

---

## 接口1：检查用户配额

### 接口名称
检查用户抽卡配额

### 接口地址
云函数：`drawCardManagement`

### 请求方式
POST（云函数调用）

### 功能说明
检查当前用户是否可以使用抽卡功能，返回配额信息。

### 请求参数

```javascript
{
  action: 'checkQuota'
}
```

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| action | string | 是 | 固定值：'checkQuota' |

### 返回数据

#### 成功响应（可以抽卡）

```json
{
  "success": true,
  "data": {
    "canDraw": true,
    "userTypeCode": "normal",
    "remainingQuota": 2,
    "totalQuota": 3,
    "usedToday": 1
  }
}
```

#### 成功响应（无限配额）

```json
{
  "success": true,
  "data": {
    "canDraw": true,
    "userTypeCode": "premium",
    "remainingQuota": -1,
    "totalQuota": -1,
    "usedToday": 0
  }
}
```

#### 失败响应（未注册用户）

```json
{
  "success": false,
  "error": "请先注册后使用抽卡功能",
  "code": 1001,
  "data": {
    "canDraw": false,
    "userTypeCode": "guest",
    "remainingQuota": 0,
    "totalQuota": 0,
    "usedToday": 0
  }
}
```

#### 失败响应（配额用完）

```json
{
  "success": false,
  "error": "今日抽卡次数已用完",
  "code": 1003,
  "data": {
    "canDraw": false,
    "userTypeCode": "normal",
    "remainingQuota": 0,
    "totalQuota": 3,
    "usedToday": 3
  }
}
```

### 返回字段说明

| 字段名 | 类型 | 说明 |
|--------|------|------|
| success | boolean | 请求是否成功 |
| error | string | 错误信息（失败时） |
| code | number | 错误码（失败时） |
| data | object | 配额数据 |
| data.canDraw | boolean | 是否可以抽卡 |
| data.userTypeCode | string | 用户类型代码 |
| data.remainingQuota | number | 今日剩余次数（-1表示无限） |
| data.totalQuota | number | 每日总配额（-1表示无限） |
| data.usedToday | number | 今日已使用次数 |

### 错误码说明

| 错误码 | 说明 | 处理建议 |
|--------|------|----------|
| 1001 | 未注册用户（guest） | 提示用户注册 |
| 1002 | 用户类型不支持抽卡功能 | 提示功能不可用 |
| 1003 | 今日配额已用完 | 提示明天再来 |
| -1 | 系统错误 | 稍后重试 |

### 使用示例

```javascript
// 在客户端调用
async function checkDrawQuota() {
  try {
    const res = await wx.cloud.callFunction({
      name: 'drawCardManagement',
      data: {
        action: 'checkQuota'
      }
    });
    
    if (res.result.success) {
      const quota = res.result.data;
      console.log('可以抽卡:', quota.canDraw);
      console.log('剩余次数:', quota.remainingQuota);
      return quota;
    } else {
      console.error('配额检查失败:', res.result.error);
      wx.showToast({
        title: res.result.error,
        icon: 'none'
      });
      return null;
    }
  } catch (error) {
    console.error('网络错误:', error);
    wx.showToast({
      title: '网络错误，请重试',
      icon: 'none'
    });
    return null;
  }
}
```

---

## 接口2：记录抽卡历史

### 接口名称
记录抽卡和AI解读历史

### 接口地址
云函数：`drawCardManagement`

### 请求方式
POST（云函数调用）

### 功能说明
AI解读成功后，记录用户的抽卡信息、问题和AI解读结果。

### 请求参数

```javascript
{
  action: 'recordDraw',
  data: {
    question: "我今年的事业运势如何？",
    cardNumber: 15,
    cardName: "戊寅",
    aiAnswer: "根据戊寅的特性，今年你的事业运势呈现稳中有进的态势..."
  }
}
```

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| action | string | 是 | 固定值：'recordDraw' |
| data | object | 是 | 记录数据 |
| data.question | string | 否 | 用户提出的问题（可为空） |
| data.cardNumber | number | 是 | 抽中的卡牌编号（1-60） |
| data.cardName | string | 是 | 抽中的卡牌名称（如"戊寅"） |
| data.aiAnswer | string | 是 | AI返回的解读结果 |

### 返回数据

#### 成功响应

```json
{
  "success": true,
  "message": "记录成功"
}
```

#### 失败响应

```json
{
  "success": false,
  "error": "用户不存在",
  "code": 1001
}
```

### 返回字段说明

| 字段名 | 类型 | 说明 |
|--------|------|------|
| success | boolean | 是否记录成功 |
| message | string | 成功消息 |
| error | string | 错误信息（失败时） |
| code | number | 错误码（失败时） |

### 使用示例

```javascript
// 在客户端调用（AI解读成功后）
async function recordDrawHistory(card, question, aiAnswer) {
  try {
    const res = await wx.cloud.callFunction({
      name: 'drawCardManagement',
      data: {
        action: 'recordDraw',
        data: {
          question: question || '',
          cardNumber: card.cardNumber,
          cardName: card.cardName,
          aiAnswer: aiAnswer
        }
      }
    });
    
    if (res.result.success) {
      console.log('记录成功');
    } else {
      console.error('记录失败:', res.result.error);
      // 记录失败不影响用户体验，静默处理
    }
  } catch (error) {
    console.error('记录异常:', error);
    // 静默处理
  }
}
```

---

## 完整使用流程示例

```javascript
// pages/answer/index.js

Page({
  data: {
    question: '',
    selectedCard: null,
    aiInterpretation: '',
    userQuotaInfo: null
  },
  
  /**
   * 页面加载时获取配额信息
   */
  async onLoad() {
    await this.loadUserQuota();
  },
  
  /**
   * 加载用户配额
   */
  async loadUserQuota() {
    const res = await wx.cloud.callFunction({
      name: 'drawCardManagement',
      data: { action: 'checkQuota' }
    });
    
    if (res.result.success) {
      this.setData({
        userQuotaInfo: res.result.data
      });
    }
  },
  
  /**
   * 点击抽卡按钮
   */
  async onDrawCard() {
    // 1. 检查配额
    const quotaCheck = await this.checkQuota();
    if (!quotaCheck.canDraw) {
      this.showQuotaError(quotaCheck);
      return;
    }
    
    // 2. 执行抽卡动画
    const card = await this.doDrawCard();
    
    // 3. 自动调用AI解读
    const aiAnswer = await this.callAIInterpret(card);
    
    // 4. 记录历史
    if (aiAnswer) {
      await this.recordHistory(card, aiAnswer);
      // 5. 刷新配额
      await this.loadUserQuota();
    }
  },
  
  /**
   * 检查配额
   */
  async checkQuota() {
    const res = await wx.cloud.callFunction({
      name: 'drawCardManagement',
      data: { action: 'checkQuota' }
    });
    
    return res.result.success 
      ? res.result.data 
      : { canDraw: false, error: res.result.error, code: res.result.code };
  },
  
  /**
   * 记录历史
   */
  async recordHistory(card, aiAnswer) {
    await wx.cloud.callFunction({
      name: 'drawCardManagement',
      data: {
        action: 'recordDraw',
        data: {
          question: this.data.question || '',
          cardNumber: card.cardNumber,
          cardName: card.cardName,
          aiAnswer: aiAnswer
        }
      }
    });
  },
  
  /**
   * 显示配额错误
   */
  showQuotaError(quotaInfo) {
    let message = quotaInfo.error;
    
    switch (quotaInfo.code) {
      case 1001:
        message = '请先注册后使用抽卡功能';
        break;
      case 1003:
        message = `今日抽卡次数已用完（${quotaInfo.totalQuota}次/天），明天再来吧~`;
        break;
    }
    
    wx.showToast({
      title: message,
      icon: 'none',
      duration: 2500
    });
  }
});
```

---

## 配额规则说明

### 用户类型配额

| 用户类型 | dailyDrawQuota | 说明 |
|---------|----------------|------|
| guest（临时用户） | 0 | 不可使用抽卡功能 |
| normal（普通用户） | 3 | 每天3次 |
| premium（高级用户） | -1 | 无限次数 |

### 计次规则

- **抽卡动画不计次**：用户可以随意查看抽卡动画
- **AI解读计次**：只有完成AI解读才计入配额
- **按天重置**：每天0点配额自动重置

### 时间处理

- 使用 UTC 时间存储
- 按日期字符串（YYYY-MM-DD）统计
- 避免时区问题影响配额统计

---

## 错误处理建议

### 客户端错误处理

```javascript
async function handleDrawCard() {
  try {
    // 1. 检查配额
    const quotaCheck = await checkQuota();
    
    if (!quotaCheck) {
      // 网络错误
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
      return;
    }
    
    if (!quotaCheck.canDraw) {
      // 配额不足或权限不足
      showQuotaError(quotaCheck);
      return;
    }
    
    // 2. 执行抽卡
    // ...
    
  } catch (error) {
    console.error('抽卡失败:', error);
    wx.showToast({
      title: '操作失败，请重试',
      icon: 'error'
    });
  }
}
```

### 记录失败处理

```javascript
async function recordHistory(data) {
  try {
    await wx.cloud.callFunction({
      name: 'drawCardManagement',
      data: {
        action: 'recordDraw',
        data: data
      }
    });
  } catch (error) {
    // 记录失败不影响用户体验，静默处理
    console.error('记录失败（不影响使用）:', error);
  }
}
```

---

## 性能优化建议

1. **预加载配额信息**
   - 页面加载时预先获取配额信息
   - 避免点击时等待

2. **配额信息缓存**
   - 在客户端缓存配额信息
   - 每次操作后更新缓存

3. **异步记录**
   - 记录操作不阻塞用户体验
   - 失败时静默处理

4. **错误重试**
   - 网络错误时自动重试
   - 最多重试3次

---

## 安全性说明

1. **身份验证**
   - 使用微信 openid 自动识别用户
   - 无需额外登录认证

2. **权限控制**
   - 配额检查在云函数中进行
   - 客户端无法绕过限制

3. **数据隔离**
   - 用户只能操作自己的数据
   - 无法查看其他用户的记录

4. **防刷机制**
   - 基于日期的配额限制
   - 记录时间戳防止作弊

---

## 数据库依赖

### 需要的数据表

1. **users** - 用户信息表
2. **static_user_types** - 用户类型配置表（需添加 dailyDrawQuota 字段）
3. **draw_card_records** - 抽卡记录表（新建）

### 需要的索引

1. **static_user_types.typeCode** - 唯一索引
2. **draw_card_records.userId + drawDate** - 复合索引（必须）
3. **draw_card_records.openid + drawDate** - 复合索引（可选）

---

## 相关文档

- [抽卡配额系统设计方案](../draw-card-quota-system.md)
- [抽卡记录表设计](../database/draw_card_recordsdb.md)
- [用户类型表设计](../database/user_typesdb.md)
- [用户表设计](../database/usersdb.md)

---

## 更新日志

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0 | 2024-11-14 | 初始版本，实现配额检查和记录功能 |

