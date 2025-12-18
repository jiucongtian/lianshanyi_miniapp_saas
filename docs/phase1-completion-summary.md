# Phase 1: 数据库设计与初始化 - 完成总结

## ✅ 已完成任务

### 1. 数据库文档创建（5个文档）

| 序号 | 文档名称 | 路径 | 状态 |
|-----|---------|------|------|
| 1 | function_productsdb.md | docs/database/ | ✅ 已完成 |
| 2 | function_quotasdb.md | docs/database/ | ✅ 已完成 |
| 3 | function_usage_recordsdb.md | docs/database/ | ✅ 已完成 |
| 4 | payment_ordersdb.md | docs/database/ | ✅ 已更新 |
| 5 | user_typesdb.md | docs/database/ | ✅ 已更新 |

### 2. 初始化脚本创建（2个脚本）

| 序号 | 脚本名称 | 路径 | 功能 | 状态 |
|-----|---------|------|------|------|
| 1 | init_function_products.js | docs/tools/ | 初始化功能商品数据 | ✅ 已完成 |
| 2 | update_user_types_config.js | docs/tools/ | 更新用户类型配额配置 | ✅ 已完成 |

### 3. 执行指南文档创建

| 文档名称 | 路径 | 内容 | 状态 |
|---------|------|------|------|
| phase1-function-payment-setup.md | docs/database/ | 详细的执行步骤和验收标准 | ✅ 已完成 |

## 📊 文档内容概览

### 新增数据库表（3个）

#### 1. function_products（功能商品表）
**用途：** 存储按次付费功能的商品信息和调用配置

**关键字段：**
- `functionCode` - 功能编码（唯一索引）
- `price` - 价格（单位：分）
- `callConfig` - 调用配置（目标云函数、参数等）
- `grantData` - 权益发放配置

**初始数据：**
- 智慧洞见：190分（1.9元/次）
- AI出报告：990分（9.9元/次）

#### 2. function_quotas（功能配额表）
**用途：** 存储用户的付费配额（永久有效）

**关键字段：**
- `openid` - 用户标识（唯一索引）
- `quotas.{functionCode}.paidRemaining` - 付费剩余配额

**说明：** 免费配额不存储在此表，通过查询使用记录表统计

#### 3. function_usage_records（功能使用记录表）
**用途：** 记录每次功能使用的详细信息

**关键字段：**
- `functionCode` - 功能编码
- `isPaid` - 是否付费使用
- `usageDate` - 使用日期（用于统计每日免费配额）
- `quotaBefore/quotaAfter` - 配额变化快照

**用途：** 统计分析、配额计算、问题排查

### 扩展现有表（2个）

#### 1. payment_orders（支付订单表）
**新增字段：**
- `functionCode` - 功能编码
- `functionName` - 功能名称
- `grantData` - 权益发放配置（快照）
- `grantInfo` - 权益发放信息（状态、时间、结果）

#### 2. user_types（用户类型表）
**新增字段：**
- `dailyWisdomInsightQuota` - 每日智慧洞见免费配额
- `dailyAiReportQuota` - 每日AI出报告免费配额

**默认配置：**
- guest: 智慧洞见=0（不可用），AI出报告=0（不可用）
- normal: 智慧洞见=1次/天，AI出报告=1次/天
- premium: 智慧洞见=无限，AI出报告=无限

## 🎯 核心设计理念

### 1. 配额管理
```
总可用配额 = 免费配额（每日重置）+ 付费配额（永久有效）

免费配额：
  - 配置在 user_types 表中
  - 通过查询 function_usage_records 表统计当日使用次数
  - 每天00:00自动重置

付费配额：
  - 存储在 function_quotas 表中
  - 永久有效，不过期
  - 支付成功后发放
```

### 2. 使用优先级
```
1. 优先使用免费配额（isPaid=false）
2. 免费配额用完后使用付费配额（isPaid=true）
```

### 3. 数据一致性
- 使用原子操作（`db.command.inc()`）保证配额扣除准确
- 使用快照机制（quotaBefore/quotaAfter）记录配额变化
- 使用记录只在功能调用成功后插入，失败不插入

## 📋 待执行任务清单

### 需要手动执行的操作

以下任务需要您在云开发控制台手动执行：

#### ☑️ 任务1：创建数据库集合
```
1. 登录云开发控制台
2. 进入数据库管理
3. 创建集合：
   - function_products（权限：仅管理端可读写）
   - function_quotas（权限：仅管理端可读写）
   - function_usage_records（权限：仅管理端可读写）
```

#### ☑️ 任务2：设置数据库索引
```
详细索引配置请参考：docs/database/phase1-function-payment-setup.md

关键索引（必须创建）：
- function_products.functionCode（唯一索引）⚠️
- function_quotas.openid（唯一索引）⚠️
- payment_orders.functionCode（普通索引）
```

#### ☑️ 任务3：执行初始化脚本
```
方式1：创建临时云函数执行（推荐）
方式2：通过数据库导入JSON文件

详细步骤请参考：docs/database/phase1-function-payment-setup.md
```

#### ☑️ 任务4：验证初始化结果
```
验证项：
1. 商品数据已导入（2条记录）
2. 用户类型配置已更新（3个类型）
3. 所有索引已创建
4. 数据验证通过
```

## 📚 相关文档

### 数据库文档
- `docs/database/function_productsdb.md` - 功能商品表
- `docs/database/function_quotasdb.md` - 功能配额表
- `docs/database/function_usage_recordsdb.md` - 功能使用记录表
- `docs/database/payment_ordersdb.md` - 支付订单表（已更新）
- `docs/database/user_typesdb.md` - 用户类型表（已更新）

### 工具脚本
- `docs/tools/init_function_products.js` - 商品数据初始化脚本
- `docs/tools/update_user_types_config.js` - 用户类型配置更新脚本

### 执行指南
- `docs/database/phase1-function-payment-setup.md` - 详细执行步骤和验收标准

### 设计文档
- `docs/function-payment-design.md` - 系统设计方案
- `docs/function-payment-implementation-plan.md` - 完整实施计划

## 🔍 验收标准

### 文档完成度
- [x] 所有数据库文档已创建
- [x] 所有初始化脚本已创建
- [x] 执行指南文档已创建

### 数据库准备（需手动执行）
- [ ] 3个新集合已创建
- [ ] 所有索引已设置（特别是唯一索引）
- [ ] 商品数据已导入
- [ ] 用户类型配置已更新
- [ ] 数据验证通过

## ⏭️ 下一步

Phase 1 文档和脚本准备完成，待您执行云端操作后，可以进入：

**Phase 2: 配额管理云函数开发**

预计工时：2个工作日

主要任务：
1. 创建 functionQuotaManagement_v1_4 云函数
2. 实现配额检查、扣除、发放、回滚功能
3. 编写API文档和测试用例

## 💡 提示

1. **先完成云端操作** - 在进入 Phase 2 之前，请先完成数据库集合创建和初始化
2. **验证数据** - 使用初始化脚本的 validate 功能验证数据正确性
3. **保留脚本** - 初始化脚本可以重复运行，便于测试环境初始化
4. **备份数据** - 在生产环境执行前，建议先在测试环境验证

## 📞 需要帮助？

如果在执行过程中遇到问题，请参考：
1. `docs/database/phase1-function-payment-setup.md` 的故障排查章节
2. 云开发控制台的日志和错误信息
3. 数据库查询结果验证

---

**Phase 1 状态：** 文档和脚本准备完成 ✅  
**等待操作：** 云端数据库创建和初始化 ⏳  
**下一阶段：** Phase 2 - 配额管理云函数开发

**创建时间：** 2024年12月18日

