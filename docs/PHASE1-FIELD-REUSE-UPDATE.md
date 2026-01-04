# Phase 1 字段复用更新说明

## 📋 更新内容

根据确认，"抽卡功能"和"智慧洞见"是同一个功能，因此：

### ✅ 字段复用方案

**智慧洞见配额**：复用现有的 `dailyDrawQuota` 字段
- ✅ 不需要新增 `dailyWisdomInsightQuota` 字段
- ✅ 保持数据表结构简洁
- ✅ 避免字段冗余

**AI出报告配额**：新增 `dailyAiReportQuota` 字段
- ✅ 独立管理AI出报告的免费配额

## 🔄 已更新的文件

### 1. 初始化脚本
- ✅ `cloudfunctions/tempInitFunctionPayment/index.js`
  - 移除了 `dailyWisdomInsightQuota` 的添加逻辑
  - 只添加 `dailyAiReportQuota` 字段
  - 验证逻辑已更新

### 2. 数据库文档
- ✅ `docs/database/user_typesdb.md`
  - 更新字段说明：`dailyDrawQuota` 用于抽卡/智慧洞见
  - 移除了 `dailyWisdomInsightQuota` 字段的说明
  - 更新了示例数据

## 📊 字段配置说明

### 用户类型配额配置

| 用户类型 | dailyDrawQuota<br/>（抽卡/智慧洞见） | dailyAiReportQuota<br/>（AI出报告） |
|---------|--------------------------------|----------------------------------|
| guest | 0次（不可用） | 0次（不可用） |
| normal | 1次/天 | 1次/天 |
| premium | 无限（-1） | 无限（-1） |

### 数据示例

```json
// guest 用户类型
{
  "typeCode": "guest",
  "dailyDrawQuota": 0,        // 智慧洞见配额（复用，不可用）
  "dailyAiReportQuota": 0     // AI出报告配额（新增，不可用）
}

// normal 用户类型
{
  "typeCode": "normal",
  "dailyDrawQuota": 1,        // 智慧洞见配额（复用，1次/天）
  "dailyAiReportQuota": 1     // AI出报告配额（新增，1次/天）
}

// premium 用户类型
{
  "typeCode": "premium",
  "dailyDrawQuota": -1,       // 智慧洞见配额（复用，无限）
  "dailyAiReportQuota": -1    // AI出报告配额（新增，无限）
}
```

## ✅ 执行更新

### 步骤 1：更新用户类型配置

执行云函数 `updateUserTypes`，这会：
- ✅ 为每个用户类型添加 `dailyAiReportQuota` 字段
- ✅ 不会修改现有的 `dailyDrawQuota` 字段
- ✅ 智慧洞见继续使用 `dailyDrawQuota`

```json
{
  "action": "updateUserTypes"
}
```

### 步骤 2：验证配置

执行验证，确认配置正确：

```json
{
  "action": "validateUserTypes"
}
```

预期结果：
- ✅ 每个用户类型都有 `dailyDrawQuota`（智慧洞见）
- ✅ 每个用户类型都有 `dailyAiReportQuota`（AI出报告）
- ✅ 配额值符合预期

## 🎯 配额管理逻辑

### 智慧洞见配额检查

```javascript
// 获取用户类型配置
const typeConfig = await getUserTypeConfig(userType);

// 智慧洞见使用 dailyDrawQuota
const dailyWisdomInsightQuota = typeConfig.dailyDrawQuota;

// 统计今日使用次数（从 function_usage_records 表）
const freeUsedToday = await db.collection('function_usage_records')
  .where({
    openid: openid,
    functionCode: 'wisdom_insight',
    isPaid: false,
    usageDate: today
  })
  .count();

// 计算剩余配额
const freeRemaining = dailyWisdomInsightQuota === -1 
  ? Infinity 
  : Math.max(0, dailyWisdomInsightQuota - freeUsedToday.total);
```

### AI出报告配额检查

```javascript
// AI出报告使用 dailyAiReportQuota
const dailyAiReportQuota = typeConfig.dailyAiReportQuota;

// 统计今日使用次数
const freeUsedToday = await db.collection('function_usage_records')
  .where({
    openid: openid,
    functionCode: 'ai_report',
    isPaid: false,
    usageDate: today
  })
  .count();

// 计算剩余配额
const freeRemaining = dailyAiReportQuota === -1 
  ? Infinity 
  : Math.max(0, dailyAiReportQuota - freeUsedToday.total);
```

## 📝 注意事项

1. **字段复用**：智慧洞见使用 `dailyDrawQuota`，不需要新增字段
2. **向后兼容**：现有的抽卡功能逻辑不需要修改
3. **配额独立**：智慧洞见和AI出报告的配额独立管理
4. **数据一致性**：确保所有用户类型都有 `dailyDrawQuota` 字段

## ⏭️ 下一步

1. ✅ 执行 `updateUserTypes` 添加 `dailyAiReportQuota` 字段
2. ✅ 验证配置正确性
3. ✅ 继续 Phase 1 的其他步骤（创建其他数据库集合）

---

**更新日期：** 2024年12月18日  
**状态：** ✅ 已完成更新

