# 功能付费订单测试指南

## 📋 概述

本文档提供 Phase 4 功能付费订单系统的完整测试方案，包括测试工具、测试步骤和验收标准。

## 🎯 测试目标

验证以下4个核心功能：

1. ✅ **createFunctionOrder** - 创建功能付费订单
2. ✅ **支付回调处理** - 支付成功后更新订单状态
3. ✅ **配额自动发放** - 支付成功后自动发放配额
4. ✅ **grantInfo 字段更新** - 权益发放状态正确记录

## 🛠️ 测试工具

### 测试脚本位置

测试脚本已创建在：`docs/tools/test-function-payment.js`

### 使用方法

#### 方式1：在小程序页面中使用（推荐）

```javascript
// pages/debug/index.js 或任意页面
const { 
  testCreateFunctionOrder, 
  testQueryOrderStatus,
  testVerifyQuotaGrant,
  testFullFlow,
  runQuickTest
} = require('../../docs/tools/test-function-payment.js');

Page({
  // 快速测试
  async onQuickTestTap() {
    await runQuickTest();
  },
  
  // 完整流程测试
  async onFullFlowTestTap() {
    await testFullFlow('wisdom_insight');
  },
  
  // 单独测试创建订单
  async onCreateOrderTap() {
    await testCreateFunctionOrder('wisdom_insight');
  },
  
  // 单独测试查询订单
  async onQueryOrderTap() {
    // 需要先有订单ID或订单号
    await testQueryOrderStatus('order_xxx');
  },
  
  // 验证配额发放
  async onVerifyQuotaTap() {
    await testVerifyQuotaGrant('wisdom_insight');
  }
});
```

#### 方式2：在开发者工具控制台中调用

```javascript
// 在控制台输入
const { testCreateFunctionOrder } = require('./docs/tools/test-function-payment.js');
testCreateFunctionOrder('wisdom_insight')
```

---

## 📝 详细测试步骤

### 测试1：创建功能付费订单（createFunctionOrder）

#### 🎯 测试目标

验证 `createFunctionOrder` 接口能够正确创建功能付费订单。

#### 📋 测试步骤

**步骤1：调用创建订单接口**

```javascript
const { testCreateFunctionOrder } = require('./docs/tools/test-function-payment.js');

// 测试智慧洞见订单
const result = await testCreateFunctionOrder('wisdom_insight');
```

**步骤2：验证返回结果**

在控制台查看输出，验证以下内容：

✅ **必需字段验证**：
- `orderId` - 订单ID（数据库_id）
- `out_trade_no` - 商户订单号
- `prepay_id` - 预支付交易会话ID
- `paymentParams` - 支付参数对象
- `functionCode` - 功能编码
- `functionName` - 功能名称
- `price` - 价格（单位：分）

✅ **支付参数验证**：
- `paymentParams.timeStamp` - 时间戳
- `paymentParams.nonceStr` - 随机字符串
- `paymentParams.package` - prepay_id参数值
- `paymentParams.signType` - 签名类型（RSA）
- `paymentParams.paySign` - 签名值

**步骤3：验证数据库记录**

在云开发控制台 → 数据库 → `payment_orders` 集合中查询刚创建的订单：

```javascript
// 查询条件：使用返回的 orderId 或 out_trade_no
{
  "_id": "order_xxx",  // 或
  "out_trade_no": "ORDER_xxx"
}
```

验证订单字段：

✅ **订单基本信息**：
- `orderType` = `'function_payment'`
- `functionCode` = `'wisdom_insight'`
- `functionName` = `'智慧洞见'`
- `amount` = `190`（1.9元）
- `status` = `'NOTPAY'`（未支付）

✅ **权益发放配置（grantData）**：
```json
{
  "type": "grant_function_quota",
  "functionCode": "wisdom_insight",
  "quantity": 1
}
```

✅ **权益发放信息（grantInfo）**：
```json
{
  "status": "pending",
  "grantTime": null,
  "grantResult": null,
  "errorMessage": ""
}
```

#### ✅ 预期结果

- ✅ 接口调用成功，返回 `success: true`
- ✅ 所有必需字段都存在
- ✅ 支付参数完整且格式正确
- ✅ 数据库订单记录创建成功
- ✅ `grantData` 字段正确快照商品信息
- ✅ `grantInfo.status` 初始化为 `'pending'`

#### 🧪 测试用例

- [ ] 测试创建 `wisdom_insight` 订单
- [ ] 测试创建 `ai_report` 订单
- [ ] 测试无效的 `functionCode`（应返回错误）
- [ ] 测试已下架的商品（`status='inactive'`，应返回错误）

---

### 测试2：查询订单状态（验证 grantInfo 字段）

#### 🎯 测试目标

验证 `queryOrderStatus` 接口能够正确返回订单信息，包括 `grantInfo` 字段。

#### 📋 测试步骤

**步骤1：使用订单ID查询**

```javascript
const { testQueryOrderStatus } = require('./docs/tools/test-function-payment.js');

// 使用订单ID查询
const result = await testQueryOrderStatus('order_xxx');
```

**步骤2：使用商户订单号查询**

```javascript
// 使用商户订单号查询
const result = await testQueryOrderStatus(null, 'ORDER_xxx');
```

**步骤3：验证返回结果**

✅ **订单基本信息**：
- `orderId` - 订单ID
- `out_trade_no` - 商户订单号
- `status` - 订单状态
- `amount` - 订单金额
- `description` - 商品描述

✅ **功能付费订单专用字段**：
- `functionCode` - 功能编码
- `functionName` - 功能名称
- `grantData` - 权益发放配置
- `grantInfo` - 权益发放信息

✅ **grantInfo 字段验证**（如果订单已支付）：
- `grantInfo.status` - 发放状态（pending/granted/failed）
- `grantInfo.grantTime` - 发放时间
- `grantInfo.grantResult` - 发放结果对象
- `grantInfo.errorMessage` - 错误信息（如果失败）

#### ✅ 预期结果

- ✅ 接口调用成功，返回 `success: true`
- ✅ 功能付费订单包含 `functionCode`、`functionName`、`grantData`、`grantInfo` 字段
- ✅ `grantInfo` 字段结构完整
- ✅ 未支付订单的 `grantInfo.status` 为 `'pending'`
- ✅ 已支付订单的 `grantInfo.status` 为 `'granted'` 或 `'failed'`

#### 🧪 测试用例

- [ ] 查询未支付订单（`status='NOTPAY'`，`grantInfo.status='pending'`）
- [ ] 查询已支付订单（`status='SUCCESS'`，`grantInfo.status='granted'`）
- [ ] 查询发放失败的订单（`grantInfo.status='failed'`）
- [ ] 查询不存在的订单（应返回错误）

---

### 测试3：支付回调处理

#### 🎯 测试目标

验证支付回调能够正确更新订单状态并触发权益发放。

#### 📋 测试步骤

**步骤1：创建测试订单**

```javascript
const { testCreateFunctionOrder } = require('./docs/tools/test-function-payment.js');
const createResult = await testCreateFunctionOrder('wisdom_insight');
const orderId = createResult.data.orderId;
const out_trade_no = createResult.data.out_trade_no;
```

**步骤2：模拟支付回调（开发环境）**

由于开发环境可能无法接收真实的微信支付回调，可以手动触发支付成功处理：

**方式1：在云函数中手动调用（推荐用于测试）**

在云开发控制台 → 云函数 → `paymentManagement_v1_3` → 在线编辑器中添加测试代码：

```javascript
// 临时测试代码（测试完成后删除）
exports.testHandlePaymentSuccess = async (event) => {
  const { orderId } = event;
  
  // 查询订单
  const orderResult = await db.collection('payment_orders')
    .doc(orderId)
    .get();
  
  if (orderResult.data.length === 0) {
    return { success: false, error: '订单不存在' };
  }
  
  const order = orderResult.data;
  
  // 更新订单状态为 SUCCESS
  await db.collection('payment_orders').doc(orderId).update({
    data: {
      status: 'SUCCESS',
      payTime: new Date(),
      transaction_id: 'test_transaction_' + Date.now(),
      updateTime: new Date()
    }
  });
  
  // 调用 handlePaymentSuccess
  await handlePaymentSuccess(order);
  
  return { success: true };
};
```

然后在小程序中调用：

```javascript
const result = await wx.cloud.callFunction({
  name: 'paymentManagement_v1_3',
  data: {
    action: 'testHandlePaymentSuccess',
    orderId: 'order_xxx'
  }
});
```

**方式2：直接更新数据库并调用权益发放**

```javascript
// 1. 更新订单状态
await db.collection('payment_orders').doc(orderId).update({
  data: {
    status: 'SUCCESS',
    payTime: new Date(),
    transaction_id: 'test_transaction_' + Date.now(),
    updateTime: new Date()
  }
});

// 2. 调用配额发放（模拟支付回调）
const grantResult = await wx.cloud.callFunction({
  name: 'functionQuotaManagement_v1_4',
  data: {
    action: 'grantQuota',
    data: {
      functionCode: 'wisdom_insight',
      quantity: 1,
      orderId: orderId
    }
  }
});

// 3. 更新 grantInfo
await db.collection('payment_orders').doc(orderId).update({
  data: {
    'grantInfo.status': 'granted',
    'grantInfo.grantTime': new Date(),
    'grantInfo.grantResult': {
      success: true,
      message: '配额发放成功'
    },
    'grantInfo.errorMessage': '',
    updateTime: new Date()
  }
});
```

**步骤3：验证订单状态更新**

查询订单，验证：

✅ **订单状态**：
- `status` = `'SUCCESS'`
- `payTime` 不为空
- `transaction_id` 不为空

✅ **grantInfo 更新**：
- `grantInfo.status` = `'granted'`
- `grantInfo.grantTime` 不为空
- `grantInfo.grantResult.success` = `true`
- `grantInfo.grantResult.message` = `'配额发放成功'`

#### ✅ 预期结果

- ✅ 订单状态更新为 `'SUCCESS'`
- ✅ `grantInfo.status` 更新为 `'granted'`
- ✅ `grantInfo.grantTime` 记录发放时间
- ✅ `grantInfo.grantResult` 记录发放结果

#### 🧪 测试用例

- [ ] 测试支付成功，配额发放成功
- [ ] 测试支付成功，配额发放失败（模拟失败场景）
- [ ] 验证发放失败时 `grantInfo.status='failed'` 且记录错误信息

---

### 测试4：配额自动发放

#### 🎯 测试目标

验证支付成功后配额能够自动发放到用户账户。

#### 📋 测试步骤

**步骤1：查询发放前的配额**

```javascript
const quotaBeforeResult = await wx.cloud.callFunction({
  name: 'functionQuotaManagement_v1_4',
  data: {
    action: 'getQuotaInfo',
    data: { functionCode: 'wisdom_insight' }
  }
});

const quotaBefore = quotaBeforeResult.result.data;
console.log('发放前配额:', quotaBefore);
```

记录 `paidRemaining` 的值。

**步骤2：创建订单并完成支付（或模拟支付成功）**

```javascript
// 创建订单
const createResult = await testCreateFunctionOrder('wisdom_insight');
const orderId = createResult.data.orderId;

// 模拟支付成功（参考测试3的步骤2）
// ... 触发支付回调或手动调用权益发放
```

**步骤3：验证配额发放**

```javascript
const { testVerifyQuotaGrant } = require('./docs/tools/test-function-payment.js');
const result = await testVerifyQuotaGrant('wisdom_insight');
```

**步骤4：查询发放后的配额**

```javascript
const quotaAfterResult = await wx.cloud.callFunction({
  name: 'functionQuotaManagement_v1_4',
  data: {
    action: 'getQuotaInfo',
    data: { functionCode: 'wisdom_insight' }
  }
});

const quotaAfter = quotaAfterResult.result.data;
console.log('发放后配额:', quotaAfter);
```

**步骤5：验证配额变化**

✅ **验证配额增加**：
- `paidRemaining` 增加 1（如果购买的是1次）
- `paidTotal` 增加 1
- `paidUsed` 不变（还未使用）

✅ **验证数据库记录**：

在云开发控制台 → 数据库 → `function_quotas` 集合中查询：

```javascript
// 查询条件：使用当前用户的 openid
{
  "openid": "用户openid"
}
```

验证配额记录：

```json
{
  "quotas": {
    "wisdom_insight": {
      "paidTotal": 1,        // 总付费配额
      "paidUsed": 0,         // 已使用配额
      "paidRemaining": 1,    // 剩余配额
      "lastGrantTime": "2024-12-18T08:00:00.000Z"
    }
  }
}
```

#### ✅ 预期结果

- ✅ 配额正确增加（`paidRemaining` 增加购买数量）
- ✅ `function_quotas` 表记录正确更新
- ✅ 如果用户首次购买，会创建配额记录
- ✅ 如果用户已有配额记录，会追加配额

#### 🧪 测试用例

- [ ] 首次购买（创建配额记录）
- [ ] 追加购买（更新配额记录）
- [ ] 购买多次（如购买10次，验证配额增加10）
- [ ] 购买不同功能（wisdom_insight 和 ai_report）

---

### 测试5：完整流程测试

#### 🎯 测试目标

验证从创建订单到配额发放的完整流程。

#### 📋 测试步骤

**步骤1：运行完整流程测试**

```javascript
const { testFullFlow } = require('./docs/tools/test-function-payment.js');
const result = await testFullFlow('wisdom_insight');
```

**步骤2：验证每个步骤**

测试脚本会自动执行以下步骤：

1. ✅ 创建功能付费订单
2. ✅ 查询订单（验证 grantInfo 初始状态）
3. ✅ 验证配额发放
4. ✅ 再次查询订单（验证 grantInfo 更新）

**步骤3：手动验证数据库**

在云开发控制台验证：

✅ **payment_orders 表**：
- 订单记录存在
- `orderType` = `'function_payment'`
- `grantData` 字段正确
- `grantInfo` 字段正确更新

✅ **function_quotas 表**：
- 配额记录存在
- `paidRemaining` 正确增加

✅ **function_usage_records 表**（如果使用了配额）：
- 使用记录存在（如果测试中使用了配额）

#### ✅ 预期结果

- ✅ 所有步骤执行成功
- ✅ 订单创建成功
- ✅ 配额发放成功
- ✅ grantInfo 字段正确更新
- ✅ 数据库记录完整

---

## ✅ 验收标准

### 功能验收

- [ ] ✅ **createFunctionOrder 接口测试通过**
  - [ ] 返回数据格式正确
  - [ ] 所有必需字段存在
  - [ ] 支付参数完整
  - [ ] 数据库订单记录正确

- [ ] ✅ **支付回调处理测试通过**
  - [ ] 订单状态正确更新
  - [ ] grantInfo 字段正确更新
  - [ ] 权益发放逻辑正确执行

- [ ] ✅ **配额自动发放测试通过**
  - [ ] 配额正确增加
  - [ ] function_quotas 表记录正确
  - [ ] 首次购买创建记录
  - [ ] 追加购买更新记录

- [ ] ✅ **grantInfo 字段更新测试通过**
  - [ ] 初始状态为 `pending`
  - [ ] 发放成功后更新为 `granted`
  - [ ] 发放失败时更新为 `failed`
  - [ ] 错误信息正确记录

### 性能验收

- [ ] ✅ 创建订单响应时间 < 2s
- [ ] ✅ 查询订单响应时间 < 500ms
- [ ] ✅ 配额发放响应时间 < 1s

### 安全验收

- [ ] ✅ 订单创建时快照商品信息（价格调整不影响已创建订单）
- [ ] ✅ 配额发放使用原子操作
- [ ] ✅ grantInfo 记录完整的发放状态和错误信息

---

## 🐛 常见问题排查

### 问题1：创建订单失败

**可能原因**：
- 商品不存在或已下架
- functionCode 错误
- 云函数未部署

**排查步骤**：
1. 检查 `function_products` 表中是否有对应的商品记录
2. 验证 `functionCode` 是否正确（wisdom_insight 或 ai_report）
3. 检查商品 `status` 是否为 `'active'`
4. 查看云函数日志

### 问题2：支付回调未触发

**可能原因**：
- HTTP 触发器未配置
- 回调地址配置错误
- 开发环境无法接收真实回调

**排查步骤**：
1. 检查云函数是否配置了 HTTP 触发器
2. 验证 `WECHAT_PAY_NOTIFY_URL` 环境变量配置
3. 开发环境可以使用手动触发的方式测试

### 问题3：配额未发放

**可能原因**：
- 支付回调未处理
- grantQuota 调用失败
- grantInfo 更新失败

**排查步骤**：
1. 检查订单 `status` 是否为 `'SUCCESS'`
2. 检查 `grantInfo.status` 是否为 `'failed'`
3. 查看云函数日志中的错误信息
4. 手动调用 `grantQuota` 验证配额发放功能

### 问题4：grantInfo 字段未更新

**可能原因**：
- 支付回调未处理
- updateGrantInfo 函数调用失败
- 数据库更新失败

**排查步骤**：
1. 检查支付回调是否正常处理
2. 查看云函数日志
3. 验证数据库权限
4. 手动更新 grantInfo 验证更新功能

---

## 📊 测试报告模板

### 测试环境

- 云函数版本：`paymentManagement_v1_3`
- 配额管理云函数版本：`functionQuotaManagement_v1_4`
- 测试时间：YYYY-MM-DD HH:MM:SS
- 测试用户：openid（隐藏）

### 测试结果

| 测试项 | 测试状态 | 备注 |
|-------|---------|------|
| createFunctionOrder | ✅/❌ | |
| 支付回调处理 | ✅/❌ | |
| 配额自动发放 | ✅/❌ | |
| grantInfo 字段更新 | ✅/❌ | |
| 完整流程测试 | ✅/❌ | |

### 发现的问题

1. [问题描述]
   - 复现步骤：
   - 预期结果：
   - 实际结果：
   - 严重程度：高/中/低

### 测试结论

- [ ] 所有核心功能测试通过
- [ ] 性能符合要求
- [ ] 可以进入下一阶段（Phase 5）

---

## 📚 相关文档

- [支付管理 API 文档](../api/paymentManagement-api.md)
- [配额管理 API 文档](../api/functionQuotaManagementAPI.md)
- [功能付费系统实施计划](../function-payment-implementation-plan.md)
- [配额管理测试指南](../function-quota-management-test-guide.md)

---

**文档版本**：v1.0  
**创建时间**：2024年12月18日  
**维护者**：开发团队

