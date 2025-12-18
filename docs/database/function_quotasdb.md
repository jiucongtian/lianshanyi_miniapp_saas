# 功能配额表 (function_quotas)

## 数据表概述
存储用户各功能的**付费配额**信息。记录用户购买的付费次数，永久有效。免费配额不存储在此表，通过查询 `function_usage_records` 表统计每日使用次数。

## 数据表名称
`function_quotas`

## 字段定义

| 字段名 | 类型 | 必填 | 索引 | 说明 |
|--------|------|------|------|------|
| _id | string | 是 | 主键 | 系统自动生成的文档ID |
| openid | string | 是 | 唯一索引 | 微信用户openid，唯一标识用户 |
| userId | string | 是 | 索引 | 关联用户表的用户ID |
| quotas | object | 是 | - | 配额信息对象，按功能分类存储 |
| quotas.{functionCode} | object | 否 | - | 某个功能的配额信息（如：wisdom_insight） |
| quotas.{functionCode}.paidTotal | number | 是 | - | 付费总次数（累计购买） |
| quotas.{functionCode}.paidUsed | number | 是 | - | 付费已使用次数 |
| quotas.{functionCode}.paidRemaining | number | 是 | - | 付费剩余次数（paidTotal - paidUsed） |
| quotas.{functionCode}.lastUsedTime | date | 否 | - | 最后使用时间 |
| quotas.{functionCode}.lastGrantTime | date | 否 | - | 最后获得配额时间 |
| createTime | date | 是 | - | 记录创建时间 |
| updateTime | date | 是 | - | 记录最后更新时间 |

## 数据示例

### 示例1：用户有多个功能的付费配额
```json
{
  "_id": "quota_60a1b2c3d4e5f6789abcdef0",
  "openid": "oABCD1234567890abcdef1234567890ab",
  "userId": "user_60a1b2c3d4e5f6789abcdef0",
  "quotas": {
    "wisdom_insight": {
      "paidTotal": 10,
      "paidUsed": 3,
      "paidRemaining": 7,
      "lastUsedTime": "2024-12-17T10:30:00.000Z",
      "lastGrantTime": "2024-12-15T08:00:00.000Z"
    },
    "ai_report": {
      "paidTotal": 5,
      "paidUsed": 2,
      "paidRemaining": 3,
      "lastUsedTime": "2024-12-16T14:20:00.000Z",
      "lastGrantTime": "2024-12-14T09:00:00.000Z"
    }
  },
  "createTime": "2024-12-10T08:00:00.000Z",
  "updateTime": "2024-12-17T10:30:00.000Z"
}
```

### 示例2：用户只有一个功能的付费配额
```json
{
  "_id": "quota_60a1b2c3d4e5f6789abcdef1",
  "openid": "oXYZ9876543210zyxwvu9876543210zy",
  "userId": "user_60a1b2c3d4e5f6789abcdef1",
  "quotas": {
    "wisdom_insight": {
      "paidTotal": 1,
      "paidUsed": 0,
      "paidRemaining": 1,
      "lastUsedTime": null,
      "lastGrantTime": "2024-12-18T08:00:00.000Z"
    }
  },
  "createTime": "2024-12-18T08:00:00.000Z",
  "updateTime": "2024-12-18T08:00:00.000Z"
}
```

## 索引设计

### 主要索引
- `openid`: **唯一索引**，用于快速查找用户配额，**必须设置以防止重复记录**
- `userId`: 普通索引，用于通过用户ID查询配额

### 查询优化
- 通过openid查询用户配额是最常用的查询方式，设置为唯一索引
- 每个用户只有一条配额记录，通过 quotas 对象存储多个功能的配额

### 重要提醒
⚠️ **数据库约束要求**：
- **必须为 `openid` 字段创建唯一索引**，防止同一用户有多条配额记录
- 在云开发控制台中设置：数据库 → function_quotas集合 → 索引管理 → 添加索引
- 索引配置：字段名 `openid`，索引类型选择 `唯一索引`

## 与其他数据表的关系

### 关联表
- **users表**: 多对一关系
  - 外键: `function_quotas.openid` 关联 `users.openid`
  - 关系描述: 一个用户对应一条配额记录

- **function_usage_records表**: 一对多关系
  - 关联: 通过 openid 和 functionCode 关联
  - 关系描述: 配额的使用会记录在使用记录表中

- **payment_orders表**: 间接关联
  - 关联: 支付成功后发放配额，更新此表
  - 关系描述: 订单支付成功后增加对应功能的配额

## 配额计算逻辑

### 总配额计算公式
```
总可用配额 = 免费剩余配额 + 付费剩余配额

其中：
- 免费剩余配额 = 用户类型的每日配额 - 当日已使用免费次数
  （通过查询 function_usage_records 表，筛选 isPaid=false 且 usageDate=今天）
  
- 付费剩余配额 = function_quotas.quotas.{functionCode}.paidRemaining
```

### 配额检查示例代码
```javascript
async function checkQuota(openid, functionCode) {
  // 1. 获取用户类型配置（免费配额）
  const userTypeConfig = await getUserTypeConfig(openid);
  const freeDailyQuota = userTypeConfig[`daily${functionCode}Quota`] || 0;
  
  // 2. 统计今日免费使用次数
  const today = new Date().toISOString().split('T')[0];
  const freeUsedToday = await db.collection('function_usage_records')
    .where({
      openid: openid,
      functionCode: functionCode,
      isPaid: false,
      usageDate: today
    })
    .count();
  
  // 3. 计算免费剩余配额
  const freeRemaining = freeDailyQuota === -1 
    ? Infinity 
    : Math.max(0, freeDailyQuota - freeUsedToday.total);
  
  // 4. 获取付费配额
  const quotaDoc = await db.collection('function_quotas')
    .where({ openid: openid })
    .get();
  
  const paidRemaining = quotaDoc.data.length > 0
    ? (quotaDoc.data[0].quotas[functionCode]?.paidRemaining || 0)
    : 0;
  
  // 5. 计算总可用配额
  const totalRemaining = (freeRemaining === Infinity || paidRemaining === Infinity)
    ? Infinity
    : freeRemaining + paidRemaining;
  
  return {
    canUse: totalRemaining > 0,
    freeRemaining: freeRemaining,
    paidRemaining: paidRemaining,
    totalRemaining: totalRemaining,
    freeDailyQuota: freeDailyQuota,
    freeUsedToday: freeUsedToday.total
  };
}
```

## 业务规则

1. **一人一条记录**: 每个用户（openid）只有一条配额记录
2. **动态字段**: quotas 对象按需添加功能配额，不是所有功能都必须存在
3. **配额发放**:
   - 支付成功后，增加对应功能的 paidTotal 和 paidRemaining
   - 使用原子操作：`db.command.inc(quantity)`
4. **配额扣除**:
   - 优先扣除免费配额（插入使用记录）
   - 免费配额用完后扣除付费配额（减少 paidUsed，增加 paidRemaining）
   - 使用原子操作：`db.command.inc(-1)`
5. **配额永久有效**: 付费配额不过期，可以随时使用
6. **免费配额每日重置**: 通过 usageDate 字段实现每日重置（查询当日记录）

## 配额操作示例

### 1. 首次发放配额（创建记录）
```javascript
// 用户首次购买，创建配额记录
await db.collection('function_quotas').add({
  data: {
    openid: openid,
    userId: userId,
    quotas: {
      [functionCode]: {
        paidTotal: quantity,
        paidUsed: 0,
        paidRemaining: quantity,
        lastUsedTime: null,
        lastGrantTime: new Date()
      }
    },
    createTime: new Date(),
    updateTime: new Date()
  }
});
```

### 2. 追加配额（更新记录）
```javascript
// 用户再次购买，增加配额
const _ = db.command;
await db.collection('function_quotas')
  .where({ openid: openid })
  .update({
    data: {
      [`quotas.${functionCode}.paidTotal`]: _.inc(quantity),
      [`quotas.${functionCode}.paidRemaining`]: _.inc(quantity),
      [`quotas.${functionCode}.lastGrantTime`]: new Date(),
      updateTime: new Date()
    }
  });
```

### 3. 扣除配额（使用付费配额）
```javascript
// 使用付费配额
const _ = db.command;
await db.collection('function_quotas')
  .where({ 
    openid: openid,
    [`quotas.${functionCode}.paidRemaining`]: _.gt(0)
  })
  .update({
    data: {
      [`quotas.${functionCode}.paidUsed`]: _.inc(1),
      [`quotas.${functionCode}.paidRemaining`]: _.inc(-1),
      [`quotas.${functionCode}.lastUsedTime`]: new Date(),
      updateTime: new Date()
    }
  });
```

### 4. 回滚配额（调用失败时）
```javascript
// 功能调用失败，回滚配额
const _ = db.command;
await db.collection('function_quotas')
  .where({ openid: openid })
  .update({
    data: {
      [`quotas.${functionCode}.paidUsed`]: _.inc(-1),
      [`quotas.${functionCode}.paidRemaining`]: _.inc(1),
      updateTime: new Date()
    }
  });
```

### 5. 查询用户配额
```javascript
// 查询用户所有功能的配额
const result = await db.collection('function_quotas')
  .where({ openid: openid })
  .get();

if (result.data.length > 0) {
  const quotas = result.data[0].quotas;
  console.log('智慧洞见配额:', quotas.wisdom_insight);
  console.log('AI出报告配额:', quotas.ai_report);
}
```

## 数据完整性保证

### 原子操作
- ✅ 所有配额的增减使用 `db.command.inc()`，保证原子性
- ✅ 配额扣除前先检查余额，使用条件更新防止扣减为负数

### 并发控制
```javascript
// 扣除配额时使用条件更新
const _ = db.command;
const result = await db.collection('function_quotas')
  .where({ 
    openid: openid,
    [`quotas.${functionCode}.paidRemaining`]: _.gt(0)  // 条件：余额>0
  })
  .update({
    data: {
      [`quotas.${functionCode}.paidRemaining`]: _.inc(-1)
    }
  });

// 检查更新结果
if (result.stats.updated === 0) {
  throw new Error('配额不足或扣除失败');
}
```

## 统计查询

### 统计某功能的付费配额总量
```javascript
// 统计所有用户购买智慧洞见的总次数
const result = await db.collection('function_quotas')
  .where({
    'quotas.wisdom_insight': _.exists(true)
  })
  .get();

let totalPaid = 0;
let totalRemaining = 0;
result.data.forEach(doc => {
  const quota = doc.quotas.wisdom_insight;
  totalPaid += quota.paidTotal;
  totalRemaining += quota.paidRemaining;
});

console.log('累计购买次数:', totalPaid);
console.log('剩余未使用次数:', totalRemaining);
```

### 统计活跃用户（有付费配额的用户）
```javascript
// 统计购买过智慧洞见的用户数
const count = await db.collection('function_quotas')
  .where({
    'quotas.wisdom_insight.paidTotal': _.gt(0)
  })
  .count();

console.log('购买用户数:', count.total);
```

## 扩展性考虑

1. **新增功能配额**: 只需在 quotas 对象中添加新的 functionCode 字段
2. **配额过期**: 如需支持配额过期，可添加 expireTime 字段
3. **配额转赠**: 可扩展支持配额转赠功能
4. **配额锁定**: 可添加 locked 字段支持配额冻结
5. **配额历史**: 可新增字段记录配额变更历史

## 注意事项

⚠️ **重要**：
1. 此表只存储**付费配额**，免费配额通过查询 function_usage_records 表统计
2. 配额扣除必须使用原子操作，防止并发问题
3. 扣除配额时必须检查余额，防止扣减为负数
4. 配额发放和扣除都要更新 updateTime
5. quotas 对象是动态的，不是所有功能都必须存在
6. 每个用户只有一条记录，通过 openid 唯一索引保证

## 与免费配额的区别

| 维度 | 付费配额 | 免费配额 |
|-----|---------|---------|
| 存储位置 | function_quotas 表 | static_user_types 表（配置） + function_usage_records 表（使用记录） |
| 有效期 | 永久有效 | 每日重置 |
| 计算方式 | 直接读取 paidRemaining | 每日配额 - 当日使用次数 |
| 扣除顺序 | 后扣除 | 优先扣除 |
| 来源 | 购买获得 | 用户类型赠送 |

