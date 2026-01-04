# 功能使用记录表 (function_usage_records)

## 数据表概述
记录每次功能使用的详细信息，包括使用时间、使用参数、结果、配额类型等。用于统计分析、配额计算、问题排查。

## 数据表名称
`function_usage_records`

## 字段定义

| 字段名 | 类型 | 必填 | 索引 | 说明 |
|--------|------|------|------|------|
| _id | string | 是 | 主键 | 系统自动生成的文档ID |
| openid | string | 是 | 索引 | 微信用户openid |
| userId | string | 是 | - | 关联用户表的用户ID |
| functionCode | string | 是 | 索引 | 功能编码（如：wisdom_insight、ai_report） |
| functionName | string | 是 | - | 功能名称（快照，用于显示） |
| targetFunction | string | 否 | - | 实际调用的云函数名称 |
| usageData | object | 否 | - | 使用时的参数（快照），不同功能参数不同 |
| result | object | 否 | - | 使用结果（可选），可用于问题排查 |
| result.success | boolean | 否 | - | 功能调用是否成功 |
| result.data | any | 否 | - | 功能返回的数据 |
| isPaid | boolean | 是 | - | 是否付费使用：true=付费配额，false=免费配额 |
| orderId | string | 否 | 索引 | 关联的订单ID（付费使用时） |
| out_trade_no | string | 否 | - | 商户订单号（付费使用时） |
| quotaBefore | object | 否 | - | 使用前配额信息（快照） |
| quotaBefore.freeRemaining | number | 否 | - | 使用前免费剩余配额 |
| quotaBefore.paidRemaining | number | 否 | - | 使用前付费剩余配额 |
| quotaBefore.totalRemaining | number | 否 | - | 使用前总剩余配额 |
| quotaAfter | object | 否 | - | 使用后配额信息（快照） |
| quotaAfter.freeRemaining | number | 否 | - | 使用后免费剩余配额 |
| quotaAfter.paidRemaining | number | 否 | - | 使用后付费剩余配额 |
| quotaAfter.totalRemaining | number | 否 | - | 使用后总剩余配额 |
| usageTime | date | 是 | 索引(降序) | 使用时间 |
| usageDate | string | 是 | 索引 | 使用日期（YYYY-MM-DD格式），用于统计每日配额 |
| createTime | date | 是 | - | 记录创建时间 |

## 数据示例

### 示例1：使用免费配额
```json
{
  "_id": "usage_60a1b2c3d4e5f6789abcdef0",
  "openid": "oABCD1234567890abcdef1234567890ab",
  "userId": "user_60a1b2c3d4e5f6789abcdef0",
  "functionCode": "wisdom_insight",
  "functionName": "智慧洞见",
  "targetFunction": "cozeFunctions_v1_3",
  "usageData": {
    "workflowType": "WISDOM_INSIGHT",
    "parameters": {
      "question": "我应该换工作吗？"
    }
  },
  "result": {
    "success": true,
    "data": "根据你的生辰八字..."
  },
  "isPaid": false,
  "orderId": null,
  "out_trade_no": null,
  "quotaBefore": {
    "freeRemaining": 2,
    "paidRemaining": 5,
    "totalRemaining": 7
  },
  "quotaAfter": {
    "freeRemaining": 1,
    "paidRemaining": 5,
    "totalRemaining": 6
  },
  "usageTime": "2024-12-18T10:30:00.000Z",
  "usageDate": "2024-12-18",
  "createTime": "2024-12-18T10:30:00.000Z"
}
```

### 示例2：使用付费配额
```json
{
  "_id": "usage_60a1b2c3d4e5f6789abcdef1",
  "openid": "oABCD1234567890abcdef1234567890ab",
  "userId": "user_60a1b2c3d4e5f6789abcdef0",
  "functionCode": "ai_report",
  "functionName": "AI出报告",
  "targetFunction": "cozeFunctions_v1_3",
  "usageData": {
    "workflowType": "AI_REPORT",
    "parameters": {
      "cardData": {
        "year": "甲子",
        "month": "乙丑",
        "day": "丙寅",
        "hour": "丁卯"
      }
    }
  },
  "result": {
    "success": true,
    "data": "深度解读报告..."
  },
  "isPaid": true,
  "orderId": "order_60a1b2c3d4e5f6789abcdef2",
  "out_trade_no": "ORDER_1702886400000_abc12345",
  "quotaBefore": {
    "freeRemaining": 0,
    "paidRemaining": 3,
    "totalRemaining": 3
  },
  "quotaAfter": {
    "freeRemaining": 0,
    "paidRemaining": 2,
    "totalRemaining": 2
  },
  "usageTime": "2024-12-18T14:20:00.000Z",
  "usageDate": "2024-12-18",
  "createTime": "2024-12-18T14:20:00.000Z"
}
```

### 示例3：功能调用失败（不扣配额，此记录不应创建）
```
注意：如果功能调用失败，配额会回滚，不应插入使用记录。
只有功能调用成功后才插入使用记录。
```

## 索引设计

### 主要索引
- `openid`: 普通索引，用于查询用户的使用记录
- `functionCode`: 普通索引，用于按功能统计使用情况
- `usageTime`: 降序索引，用于按时间排序查询
- `usageDate`: 普通索引，用于统计每日使用情况
- `orderId`: 普通索引，用于关联订单查询

### 复合索引（推荐）
- `openid + functionCode + usageDate`: 复合索引，用于统计某用户某功能在某日的使用次数
- `functionCode + usageDate`: 复合索引，用于统计某功能在某日的总使用次数

### 查询优化
- 统计每日免费配额使用次数时，通过 openid + functionCode + usageDate + isPaid=false 查询
- 查询用户使用历史时，通过 openid + usageTime 降序排序

### 索引创建建议
```javascript
// 复合索引1：用于统计用户某功能每日使用次数
{
  "openid": 1,
  "functionCode": 1,
  "usageDate": 1
}

// 复合索引2：用于统计某功能每日总使用次数
{
  "functionCode": 1,
  "usageDate": 1
}

// 单一索引：时间降序（用于查询最近使用记录）
{
  "usageTime": -1
}
```

## 与其他数据表的关系

### 关联表
- **users表**: 多对一关系
  - 外键: `function_usage_records.openid` 关联 `users.openid`
  - 关系描述: 一个用户可以有多条使用记录

- **function_products表**: 多对一关系
  - 外键: `function_usage_records.functionCode` 关联 `function_products.functionCode`
  - 关系描述: 一个功能可以有多条使用记录

- **payment_orders表**: 多对一关系
  - 外键: `function_usage_records.orderId` 关联 `payment_orders._id`
  - 关系描述: 一个付费订单可以对应多条使用记录（如果购买多次）

- **function_quotas表**: 间接关联
  - 关联: 通过 openid 和 functionCode 关联
  - 关系描述: 使用记录影响配额表的数据

## 业务规则

1. **只记录成功调用**: 只有功能调用成功才插入记录，失败则不插入
2. **配额快照**: quotaBefore 和 quotaAfter 记录配额变化，便于核对
3. **日期字段**: usageDate 格式为 YYYY-MM-DD，用于统计每日配额
4. **付费标记**: isPaid=true 表示使用付费配额，false 表示使用免费配额
5. **订单关联**: 付费使用时记录 orderId 和 out_trade_no，便于追溯
6. **参数快照**: usageData 记录使用时的参数，用于问题排查和分析

## 统计查询示例

### 1. 统计用户某功能今日免费使用次数
```javascript
const today = new Date().toISOString().split('T')[0];

const count = await db.collection('function_usage_records')
  .where({
    openid: openid,
    functionCode: 'wisdom_insight',
    isPaid: false,
    usageDate: today
  })
  .count();

console.log('今日免费使用次数:', count.total);
```

### 2. 查询用户使用历史
```javascript
const records = await db.collection('function_usage_records')
  .where({ openid: openid })
  .orderBy('usageTime', 'desc')
  .limit(20)
  .get();

console.log('最近20条使用记录:', records.data);
```

### 3. 统计某功能每日总使用次数
```javascript
const today = new Date().toISOString().split('T')[0];

const count = await db.collection('function_usage_records')
  .where({
    functionCode: 'wisdom_insight',
    usageDate: today
  })
  .count();

console.log('智慧洞见今日总使用次数:', count.total);
```

### 4. 统计付费使用次数
```javascript
const paidCount = await db.collection('function_usage_records')
  .where({
    functionCode: 'wisdom_insight',
    isPaid: true
  })
  .count();

console.log('智慧洞见累计付费使用次数:', paidCount.total);
```

### 5. 统计转化率（付费使用/总使用）
```javascript
const totalCount = await db.collection('function_usage_records')
  .where({ functionCode: 'wisdom_insight' })
  .count();

const paidCount = await db.collection('function_usage_records')
  .where({ functionCode: 'wisdom_insight', isPaid: true })
  .count();

const conversionRate = (paidCount.total / totalCount.total * 100).toFixed(2);
console.log('付费转化率:', conversionRate + '%');
```

### 6. 查询某订单关联的使用记录
```javascript
const records = await db.collection('function_usage_records')
  .where({ orderId: 'order_xxx' })
  .get();

console.log('订单关联的使用记录:', records.data);
```

### 7. 统计活跃用户（某时间段内使用过的用户）
```javascript
const startDate = '2024-12-01';
const endDate = '2024-12-31';

const records = await db.collection('function_usage_records')
  .where({
    functionCode: 'wisdom_insight',
    usageDate: db.command.gte(startDate).and(db.command.lte(endDate))
  })
  .field({ openid: true })
  .get();

const uniqueUsers = [...new Set(records.data.map(r => r.openid))];
console.log('12月活跃用户数:', uniqueUsers.length);
```

### 8. 统计用户使用频率分布
```javascript
// 查询所有用户的使用次数
const allRecords = await db.collection('function_usage_records')
  .where({ functionCode: 'wisdom_insight' })
  .field({ openid: true })
  .get();

// 统计每个用户的使用次数
const userUsageMap = {};
allRecords.data.forEach(record => {
  userUsageMap[record.openid] = (userUsageMap[record.openid] || 0) + 1;
});

// 按使用次数分组
const frequencyDistribution = {};
Object.values(userUsageMap).forEach(count => {
  frequencyDistribution[count] = (frequencyDistribution[count] || 0) + 1;
});

console.log('使用频率分布:', frequencyDistribution);
// 例如：{ 1: 100, 2: 50, 3: 30, ... } 表示100个用户用了1次，50个用户用了2次
```

## 数据分析维度

### 用户行为分析
1. **使用频率**: 统计用户使用某功能的次数
2. **使用时段**: 分析用户主要在什么时间使用
3. **免费/付费比例**: 分析用户更倾向于使用免费还是付费配额
4. **功能偏好**: 统计用户更喜欢使用哪个功能

### 功能分析
1. **功能使用量**: 统计各功能的使用次数
2. **付费转化率**: 付费使用/总使用
3. **使用增长趋势**: 按日/周/月统计使用增长情况
4. **用户留存**: 统计首次使用后的复购率

### 商业分析
1. **付费用户占比**: 使用过付费配额的用户数/总用户数
2. **ARPU**: 平均每用户付费金额
3. **复购率**: 购买多次的用户占比
4. **使用效率**: 购买配额的使用率

## 数据清理策略

### 历史数据保留
- 建议保留最近6个月的详细记录
- 6个月以上的数据可以归档或汇总
- 或根据实际业务需求调整保留时长

### 归档策略
```javascript
// 定时任务：归档6个月前的数据
const sixMonthsAgo = new Date();
sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

// 1. 导出到归档表
const oldRecords = await db.collection('function_usage_records')
  .where({
    usageTime: db.command.lt(sixMonthsAgo)
  })
  .get();

// 2. 插入到归档表
await db.collection('function_usage_records_archive')
  .add({
    data: oldRecords.data
  });

// 3. 删除原表数据
await db.collection('function_usage_records')
  .where({
    usageTime: db.command.lt(sixMonthsAgo)
  })
  .remove();
```

## 性能优化

### 索引优化
1. 为常用查询条件创建复合索引
2. 定期检查慢查询，优化索引
3. 避免查询返回大量数据，使用 limit 分页

### 查询优化
```javascript
// ✅ 推荐：使用索引字段查询
db.collection('function_usage_records')
  .where({ 
    openid: openid, 
    functionCode: 'wisdom_insight',
    usageDate: today 
  })
  .count();

// ❌ 不推荐：查询非索引字段
db.collection('function_usage_records')
  .where({ 
    'usageData.question': '我应该换工作吗？'  // usageData 不是索引字段
  })
  .get();
```

### 数据量控制
- 使用分页查询，避免一次性加载大量数据
- 定期归档历史数据
- 统计数据可以使用聚合查询或预计算

## 扩展性考虑

1. **用户反馈**: 可新增 feedback 字段记录用户对结果的评价
2. **错误记录**: 可扩展支持记录失败的调用（用于问题排查）
3. **性能监控**: 可新增 duration 字段记录功能调用耗时
4. **A/B测试**: 可新增 experimentId 字段支持A/B测试分析
5. **地理位置**: 可新增 location 字段分析用户地域分布
6. **设备信息**: 可新增 deviceInfo 字段分析用户设备情况

## 注意事项

⚠️ **重要**：
1. 只有功能调用成功才插入记录，失败不插入
2. usageDate 必须是 YYYY-MM-DD 格式字符串，用于统计每日配额
3. isPaid 字段用于区分免费/付费使用，统计时必须筛选
4. 记录插入失败不影响主流程（配额已扣除，功能已使用）
5. 定期检查数据量，及时归档历史数据
6. 查询时注意使用索引，避免全表扫描
7. 统计每日免费配额时，必须同时筛选 isPaid=false 和 usageDate=今天

## usageDate 字段重要性说明

### 为什么需要 usageDate？
1. **免费配额每日重置**: 免费配额按天计算，需要统计每日使用次数
2. **性能优化**: 字符串格式的日期比 Date 类型查询更快
3. **跨时区支持**: 使用固定格式避免时区问题

### 正确使用方式
```javascript
// 生成 usageDate
const usageDate = new Date().toISOString().split('T')[0];  // "2024-12-18"

// 插入记录
await db.collection('function_usage_records').add({
  data: {
    openid: openid,
    functionCode: functionCode,
    isPaid: false,
    usageDate: usageDate,  // 必填
    usageTime: new Date(),
    // ...
  }
});

// 查询今日使用次数
const today = new Date().toISOString().split('T')[0];
const count = await db.collection('function_usage_records')
  .where({
    openid: openid,
    functionCode: functionCode,
    isPaid: false,
    usageDate: today  // 使用字符串查询
  })
  .count();
```

