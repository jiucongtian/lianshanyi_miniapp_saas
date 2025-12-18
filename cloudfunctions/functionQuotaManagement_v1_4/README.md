# 功能配额管理云函数 v1.4

## 📋 功能说明

负责管理用户的功能配额，包括配额检查、扣除、发放、回滚等核心操作。支持免费配额和付费配额的统一管理。

## 🎯 核心功能

### 1. 配额检查（checkQuota）
检查用户某个功能的可用配额，返回免费配额、付费配额和总配额信息。

### 2. 配额扣除（deductQuota）
扣除用户配额，优先扣除免费配额，免费配额用完后扣除付费配额。使用原子操作保证并发安全。

### 3. 配额发放（grantQuota）
发放付费配额（支付成功后调用），支持首次创建和追加发放。

### 4. 配额回滚（rollbackQuota）
功能调用失败时回滚配额，确保用户权益不受损失。

### 5. 配额信息查询（getQuotaInfo）
获取用户的配额信息，支持查询单个功能或所有功能。

## 📊 配额计算逻辑

### 配额组成
```
总可用配额 = 免费剩余配额 + 付费剩余配额

其中：
- 免费剩余配额 = 用户类型的每日配额 - 当日已使用免费次数
- 付费剩余配额 = function_quotas 表中的 paidRemaining 字段
```

### 扣除优先级
1. **优先扣除免费配额**（isPaid=false）
   - 插入使用记录到 function_usage_records
   - 不修改 function_quotas 表

2. **免费配额用完后扣除付费配额**（isPaid=true）
   - 使用原子操作更新 function_quotas 表
   - 插入使用记录到 function_usage_records

### 免费配额字段映射
- **智慧洞见**（wisdom_insight）：复用 `dailyDrawQuota` 字段
- **AI出报告**（ai_report）：使用 `dailyAiReportQuota` 字段

## 🔧 接口列表

| Action | 说明 | 参数 |
|--------|------|------|
| checkQuota | 检查配额 | functionCode |
| deductQuota | 扣除配额 | functionCode, quantity(可选), functionName(可选) |
| grantQuota | 发放配额 | functionCode, quantity, orderId(可选) |
| rollbackQuota | 回滚配额 | functionCode, quantity(可选), isPaid, recordId(可选) |
| getQuotaInfo | 获取配额信息 | functionCode(可选) |

## 📝 使用示例

### 检查配额
```javascript
const result = await wx.cloud.callFunction({
  name: 'functionQuotaManagement_v1_4',
  data: {
    action: 'checkQuota',
    data: {
      functionCode: 'wisdom_insight'
    }
  }
});

// 返回结果
{
  success: true,
  data: {
    canUse: true,
    freeRemaining: 2,      // 免费剩余配额
    paidRemaining: 5,      // 付费剩余配额
    totalRemaining: 7,     // 总剩余配额
    freeDailyQuota: 3,     // 每日免费配额
    freeUsedToday: 1       // 今日已用免费次数
  }
}
```

### 扣除配额
```javascript
const result = await wx.cloud.callFunction({
  name: 'functionQuotaManagement_v1_4',
  data: {
    action: 'deductQuota',
    data: {
      functionCode: 'wisdom_insight',
      quantity: 1,
      functionName: '智慧洞见'
    }
  }
});

// 返回结果
{
  success: true,
  data: {
    isPaid: false,  // 是否使用付费配额
    quantity: 1,
    quotaBefore: { freeRemaining: 2, paidRemaining: 5, totalRemaining: 7 },
    quotaAfter: { freeRemaining: 1, paidRemaining: 5, totalRemaining: 6 }
  }
}
```

### 发放配额
```javascript
const result = await wx.cloud.callFunction({
  name: 'functionQuotaManagement_v1_4',
  data: {
    action: 'grantQuota',
    data: {
      functionCode: 'wisdom_insight',
      quantity: 10,
      orderId: 'order_xxx'
    }
  }
});
```

### 回滚配额
```javascript
const result = await wx.cloud.callFunction({
  name: 'functionQuotaManagement_v1_4',
  data: {
    action: 'rollbackQuota',
    data: {
      functionCode: 'wisdom_insight',
      quantity: 1,
      isPaid: false  // 回滚免费配额
    }
  }
});
```

### 获取配额信息
```javascript
// 获取单个功能的配额
const result1 = await wx.cloud.callFunction({
  name: 'functionQuotaManagement_v1_4',
  data: {
    action: 'getQuotaInfo',
    data: {
      functionCode: 'wisdom_insight'
    }
  }
});

// 获取所有功能的配额
const result2 = await wx.cloud.callFunction({
  name: 'functionQuotaManagement_v1_4',
  data: {
    action: 'getQuotaInfo',
    data: {}
  }
});

// 返回结果（所有功能）
{
  success: true,
  data: {
    wisdom_insight: { canUse: true, freeRemaining: 2, paidRemaining: 5, ... },
    ai_report: { canUse: true, freeRemaining: 1, paidRemaining: 3, ... }
  }
}
```

## 🔒 并发安全

### 原子操作
- 付费配额的扣除使用 `db.command.inc()` 原子操作
- 配额更新带条件检查：`paidRemaining > 0`

### 并发场景
```javascript
// 同时多个请求扣除配额
// ✅ 原子操作保证不会超扣
db.collection('function_quotas')
  .where({
    openid: openid,
    [`quotas.${functionCode}.paidRemaining`]: _.gt(0)  // 条件检查
  })
  .update({
    data: {
      [`quotas.${functionCode}.paidRemaining`]: _.inc(-1)  // 原子操作
    }
  });
```

## 📈 性能优化

### 配置缓存
- 用户类型配置缓存 5 分钟
- 减少数据库查询次数

### 索引优化
确保以下索引已创建：
- `function_quotas`: openid（唯一索引）
- `function_usage_records`: openid + functionCode + usageDate（复合索引）

## ⚠️ 注意事项

1. **配额不足处理**
   - 返回错误码 `QUOTA_INSUFFICIENT`
   - 返回当前配额信息供客户端显示

2. **配额回滚**
   - 功能调用失败必须回滚配额
   - 免费配额回滚：删除使用记录
   - 付费配额回滚：恢复配额数量

3. **日期处理**
   - usageDate 使用 `YYYY-MM-DD` 格式
   - 确保时区处理正确

4. **错误日志**
   - 所有操作记录详细日志
   - 便于问题排查

## 🔄 错误码说明

| 错误码 | 说明 |
|--------|------|
| INVALID_PARAMS | 参数错误 |
| CHECK_QUOTA_FAILED | 检查配额失败 |
| QUOTA_INSUFFICIENT | 配额不足 |
| DEDUCT_QUOTA_FAILED | 扣除配额失败 |
| GRANT_QUOTA_FAILED | 发放配额失败 |
| ROLLBACK_QUOTA_FAILED | 回滚配额失败 |
| GET_QUOTA_INFO_FAILED | 获取配额信息失败 |
| INVALID_ACTION | 无效的操作类型 |
| INTERNAL_ERROR | 内部错误 |

## 📦 依赖

```json
{
  "wx-server-sdk": "~2.6.3"
}
```

## 🚀 部署

```bash
# 上传云函数
# 在云开发控制台上传或使用 CLI 工具

# 安装依赖（云端安装）
# 在云开发控制台选择"云端安装依赖"
```

## 📚 相关文档

- [功能配额表结构](../../docs/database/function_quotasdb.md)
- [功能使用记录表结构](../../docs/database/function_usage_recordsdb.md)
- [用户类型配置表结构](../../docs/database/user_typesdb.md)
- [API 接口文档](../../docs/api/functionQuotaManagementAPI.md)
- [功能付费系统设计](../../docs/function-payment-design.md)

## 📝 更新日志

### v1.4.0 (2024-12-18)
- ✨ 初始版本
- ✅ 实现配额检查功能
- ✅ 实现配额扣除功能（支持免费/付费）
- ✅ 实现配额发放功能
- ✅ 实现配额回滚功能
- ✅ 实现配额信息查询功能
- ✅ 支持智慧洞见和AI出报告两个功能
- ✅ 使用原子操作保证并发安全
- ✅ 配置缓存优化性能

