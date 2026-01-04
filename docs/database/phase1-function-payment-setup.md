# Phase 1: 数据库设计与初始化 - 执行指南

## 📋 概述

本文档详细说明如何执行功能按次付费系统的 Phase 1 任务：数据库设计与初始化。

## ✅ 已完成任务

### 1. 数据库文档创建 ✅

已创建以下数据库文档：

| 文档名称 | 路径 | 说明 |
|---------|------|------|
| function_productsdb.md | docs/database/ | 功能商品表结构定义 |
| function_quotasdb.md | docs/database/ | 用户功能配额表结构定义 |
| function_usage_recordsdb.md | docs/database/ | 功能使用记录表结构定义 |
| payment_ordersdb.md | docs/database/ | 支付订单表（已更新功能付费字段） |
| user_typesdb.md | docs/database/ | 用户类型表（已更新免费配额字段） |

### 2. 初始化脚本创建 ✅

已创建以下初始化脚本：

| 脚本名称 | 路径 | 用途 |
|---------|------|------|
| init_function_products.js | docs/tools/ | 初始化功能商品数据 |
| update_user_types_config.js | docs/tools/ | 更新用户类型配置 |

## 🚀 执行步骤

### 步骤 1: 在云开发控制台创建数据库集合

登录微信云开发控制台，创建以下数据库集合：

#### 1.1 创建 `function_products` 集合
```
集合名称：function_products
权限设置：仅管理端可读写
```

**创建索引：**
1. 唯一索引：`functionCode`
   - 字段名：functionCode
   - 索引类型：唯一索引（升序）
   - ⚠️ 必须设置，防止重复的功能编码

2. 普通索引：`status`
   - 字段名：status
   - 索引类型：普通索引（升序）

#### 1.2 创建 `function_quotas` 集合
```
集合名称：function_quotas
权限设置：仅管理端可读写
```

**创建索引：**
1. 唯一索引：`openid`
   - 字段名：openid
   - 索引类型：唯一索引（升序）
   - ⚠️ 必须设置，确保每个用户只有一条记录

2. 普通索引：`userId`
   - 字段名：userId
   - 索引类型：普通索引（升序）

#### 1.3 创建 `function_usage_records` 集合
```
集合名称：function_usage_records
权限设置：仅管理端可读写
```

**创建索引：**
1. 普通索引：`openid`
   - 字段名：openid
   - 索引类型：普通索引（升序）

2. 普通索引：`functionCode`
   - 字段名：functionCode
   - 索引类型：普通索引（升序）

3. 普通索引：`usageTime`
   - 字段名：usageTime
   - 索引类型：普通索引（降序）

4. 普通索引：`usageDate`
   - 字段名：usageDate
   - 索引类型：普通索引（升序）

5. 普通索引：`orderId`
   - 字段名：orderId
   - 索引类型：普通索引（升序）

**推荐复合索引：**
```json
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
```

### 步骤 2: 更新现有集合索引

#### 2.1 更新 `payment_orders` 集合

**新增索引：**
- 普通索引：`functionCode`
  - 字段名：functionCode
  - 索引类型：普通索引（升序）

**说明：** 其他字段已在现有订单表中存在，无需修改。

### 步骤 3: 执行初始化脚本

#### 3.1 初始化功能商品数据

**方法1：通过云函数执行（推荐）**

1. 创建临时云函数：
   ```bash
   cloudfunctions/
   └── tempInitProducts/
       ├── index.js  # 复制 docs/tools/init_function_products.js 内容
       └── package.json
   ```

2. 部署云函数：
   ```bash
   # 在云开发控制台或命令行部署
   ```

3. 调用云函数：
   ```javascript
   // 在小程序端或云开发控制台调用
   wx.cloud.callFunction({
     name: 'tempInitProducts',
     data: {
       action: 'init'
     }
   }).then(res => {
     console.log('初始化结果:', res.result);
   });
   ```

**方法2：通过数据库导入**

1. 准备 JSON 数据文件（参考 init_function_products.js 中的 products 数组）
2. 在云开发控制台 → 数据库 → function_products → 导入
3. 选择 JSON 文件导入

**验证：**
```javascript
// 调用验证接口
wx.cloud.callFunction({
  name: 'tempInitProducts',
  data: {
    action: 'validate'
  }
}).then(res => {
  console.log('验证结果:', res.result);
});
```

#### 3.2 更新用户类型配置

**⚠️ 重要：先确认用户类型表名称**

检查您的数据库中用户类型表的名称：
- `user_types` 
- 或 `static_user_types`

然后修改 `update_user_types_config.js` 第 15 行：
```javascript
const USER_TYPES_COLLECTION = 'static_user_types';  // 或 'user_types'
```

**执行更新：**

1. 创建临时云函数：
   ```bash
   cloudfunctions/
   └── tempUpdateUserTypes/
       ├── index.js  # 复制 docs/tools/update_user_types_config.js 内容
       └── package.json
   ```

2. 部署并调用：
   ```javascript
   // 先查看当前配置
   wx.cloud.callFunction({
     name: 'tempUpdateUserTypes',
     data: {
       action: 'show'
     }
   }).then(res => {
     console.log('当前配置:', res.result);
   });

   // 执行更新
   wx.cloud.callFunction({
     name: 'tempUpdateUserTypes',
     data: {
       action: 'update'
     }
   }).then(res => {
     console.log('更新结果:', res.result);
   });

   // 验证配置
   wx.cloud.callFunction({
     name: 'tempUpdateUserTypes',
     data: {
       action: 'validate'
     }
   }).then(res => {
     console.log('验证结果:', res.result);
   });
   ```

### 步骤 4: 验证数据库初始化

#### 4.1 验证功能商品表

在云开发控制台查询：
```javascript
db.collection('function_products')
  .where({ status: 'active' })
  .orderBy('sortOrder', 'asc')
  .get()
```

**预期结果：**
- 应该看到 2 条记录：智慧洞见（1.9元）、AI出报告（9.9元）
- 每条记录包含完整的 callConfig 和 grantData

#### 4.2 验证用户类型配置

在云开发控制台查询：
```javascript
db.collection('static_user_types')  // 或 user_types
  .get()
```

**预期结果：**
每个用户类型应该包含以下字段：
- `dailyWisdomInsightQuota`
- `dailyAiReportQuota`

**各用户类型的配额：**
- guest: 智慧洞见=1，AI出报告=0
- normal: 智慧洞见=3，AI出报告=1
- premium: 智慧洞见=-1，AI出报告=-1

#### 4.3 验证索引

在云开发控制台 → 数据库 → 各集合 → 索引管理，检查：
- ✅ function_products.functionCode 是唯一索引
- ✅ function_quotas.openid 是唯一索引
- ✅ 其他索引已创建

## 📊 验收清单

### 数据库集合创建
- [ ] function_products 集合已创建
- [ ] function_quotas 集合已创建
- [ ] function_usage_records 集合已创建

### 索引创建
- [ ] function_products.functionCode 唯一索引
- [ ] function_products.status 普通索引
- [ ] function_quotas.openid 唯一索引
- [ ] function_quotas.userId 普通索引
- [ ] function_usage_records.openid 普通索引
- [ ] function_usage_records.functionCode 普通索引
- [ ] function_usage_records.usageTime 降序索引
- [ ] function_usage_records.usageDate 普通索引
- [ ] function_usage_records.orderId 普通索引
- [ ] payment_orders.functionCode 普通索引

### 数据初始化
- [ ] 功能商品数据已导入（2条记录）
- [ ] 商品数据验证通过
- [ ] 用户类型配置已更新（3个类型）
- [ ] 用户类型配置验证通过

### 文档完成
- [ ] 所有数据库文档已创建
- [ ] 初始化脚本已创建
- [ ] 执行指南已创建

## 🛠️ 故障排查

### 问题1：集合创建失败
**原因：** 权限不足
**解决：** 确保在云开发控制台操作，有管理员权限

### 问题2：唯一索引创建失败
**原因：** 集合中已有重复数据
**解决：** 先清理重复数据，再创建唯一索引

### 问题3：初始化脚本执行失败
**原因：** 云函数环境配置问题
**解决：** 检查 package.json 中的 wx-server-sdk 版本，确保已安装依赖

### 问题4：用户类型表名称错误
**原因：** 不同项目用户类型表名称可能不同
**解决：** 检查实际表名，修改 update_user_types_config.js 中的配置

## 🔄 回滚操作

如果需要回滚初始化：

### 回滚商品数据
```javascript
db.collection('function_products')
  .where({ functionCode: _.in(['wisdom_insight', 'ai_report']) })
  .remove()
```

### 回滚用户类型配置
```javascript
// 调用回滚脚本
wx.cloud.callFunction({
  name: 'tempUpdateUserTypes',
  data: {
    action: 'rollback'
  }
})
```

### 删除集合（慎重）
在云开发控制台手动删除：
- function_products
- function_quotas
- function_usage_records

## ⏭️ 下一步

Phase 1 完成后，进入 **Phase 2: 配额管理云函数开发**

参考文档：
- `docs/function-payment-implementation-plan.md` - 完整实施计划
- `docs/function-payment-design.md` - 系统设计方案

## 📞 支持

如遇到问题，请检查：
1. 云开发控制台日志
2. 云函数调用日志
3. 数据库查询结果

---

**文档版本：** v1.0  
**创建时间：** 2024年12月18日  
**最后更新：** 2024年12月18日

