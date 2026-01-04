# 功能按次付费设计方案

## 📋 目录

1. [业务场景](#业务场景)
2. [技术方案设计](#技术方案设计)
3. [数据库设计](#数据库设计)
4. [支付流程设计](#支付流程设计)
5. [实现细节](#实现细节)
6. [安全机制](#安全机制)
7. [已确认问题](#已确认问题)

---

## 业务场景

### 需要按次付费的功能

1. **智慧洞见**
   - 功能描述：用户输入问题，AI给出智慧洞见答案
   - 付费方式：每次使用付费
   - 使用位置：`pages/home/index.js`

2. **AI出报告（额外解读）**
   - 功能描述：对抽中的卡牌进行AI深度解读
   - 付费方式：每次解读付费
   - 使用位置：`pages/answer/index.js` 的 `onAIInterpret` 方法

3. **其他可能的按次功能**
   - 未来可能扩展的功能，如：详细分析、专业报告等

### 业务特点

- **即时性**：用户点击后立即使用，需要快速响应
- **按次计费**：每次使用独立计费，不涉及包月或包年
- **体验优先**：支付流程不能打断用户体验

---

## 技术方案设计

### 方案选择

#### 方案一：先付费后使用（推荐）

**流程**：
```
用户点击功能 → 检查配额 → 配额不足 → 弹出支付 → 支付成功 → 获得使用次数 → 立即使用
```

**优点**：
- ✅ 用户体验流畅：支付后立即使用，无需等待
- ✅ 防止恶意使用：先付费再使用，避免未付费使用
- ✅ 实现简单：复用现有支付系统

**缺点**：
- ⚠️ 需要预付费：用户需要先支付才能使用

#### 方案二：先使用后付费

**流程**：
```
用户点击功能 → 直接使用 → 使用成功 → 记录使用记录 → 定期结算 → 发起支付
```

**优点**：
- ✅ 用户体验好：无需预付费即可使用

**缺点**：
- ❌ 实现复杂：需要记录使用记录、定期结算
- ❌ 存在风险：用户可能不支付就使用
- ❌ 不符合小程序支付规范

**结论**：**采用方案一（先付费后使用）**

### 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                    客户端（小程序）                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ 智慧洞见页面  │  │ AI解读页面    │  │ 其他功能页面  │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                  │                  │         │
│         └──────────────────┼──────────────────┘         │
│                            │                             │
│                   ┌────────▼────────┐                   │
│                   │ FunctionService │                   │
│                   │  - 预检查配额    │                   │
│                   │  - 创建订单      │                   │
│                   │  - 调用功能      │                   │
│                   │    (云端检查)    │                   │
│                   └────────┬────────┘                   │
└────────────────────────────┼────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────┐
│                    云函数层                              │
│  ┌──────────────────────────────────────────────────┐ │
│  │ functionCallGateway (新增-统一调用网关)            │ │
│  │  - 检查权限                                        │ │
│  │  - 调用 functionQuotaManagement 检查配额          │ │
│  │  - 调用 functionQuotaManagement 扣除配额          │ │
│  │  - 调用对应的功能云函数                            │ │
│  │  - 记录使用记录                                    │ │
│  │  - 调用失败时调用 functionQuotaManagement 回滚   │ │
│  └──────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────┐ │
│  │ paymentManagement_v1_3                            │ │
│  │  - 创建功能付费订单                                │ │
│  │  - 处理支付回调                                    │ │
│  │  - 调用 functionQuotaManagement 发放配额          │ │
│  └──────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────┐ │
│  │ functionQuotaManagement (新增)                    │ │
│  │  - 检查功能配额（免费+付费）                      │ │
│  │  - 扣除使用次数（原子操作）                        │ │
│  │  - 发放配额（支付成功后）                          │ │
│  │  - 回滚配额（调用失败时）                          │ │
│  │  - 查询配额信息                                    │ │
│  └──────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────┐ │
│  │ cozeFunctions_v1_3                               │ │
│  │  - 调用AI功能（纯功能，不检查配额）                │ │
│  └──────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────┐
│                    数据库层                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ payment_     │  │ function_     │  │ function_    │ │
│  │   products   │  │   quotas      │  │   usage_     │ │
│  │              │  │              │  │   records    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 核心流程

#### 1. 功能使用流程

```
用户点击功能
    ↓
客户端调用统一网关（functionCallGateway）
    ├─ 参数：{ functionCode, functionParams, targetFunction }
    └─ targetFunction: 要调用的实际功能云函数名称
    ↓
【云端】统一网关处理
    ├─ 1. 检查权限（用户类型、功能权限）
    ├─ 2. 检查配额（免费配额 + 付费配额）
    │
    ├─ 配额不足？
    │   ├─ 是 → 返回错误码 QUOTA_INSUFFICIENT
    │   │       客户端引导支付
    │   └─ 否 → 继续
    │
    ├─ 3. 扣除配额（原子操作）
    │   ├─ 优先扣除免费配额
    │   └─ 免费配额不足时扣除付费配额
    │
    ├─ 4. 调用目标功能云函数
    │   ├─ 根据 functionCode 调用对应的云函数
    │   └─ 传递 functionParams 参数
    │
    ├─ 5. 功能调用结果
    │   ├─ 成功 → 记录使用记录 → 返回结果 ✅
    │   └─ 失败 → 回滚配额 → 返回错误（用户可重试）
    │
    └─ 6. 返回统一格式结果
```

**支付流程**：
```
配额不足 → 显示支付弹窗
    ↓
用户确认支付
    ↓
创建订单（paymentManagement.createFunctionOrder）
    ↓
调起微信支付
    ↓
支付成功回调
    ↓
发放使用次数（functionQuotaManagement.grantQuota）
    ↓
提示用户"购买成功，请点击使用功能"
    ↓
用户再次点击功能 → 调用统一网关 → 走上面的使用流程
```

#### 2. 配额管理流程

```
用户配额表（function_quotas）
├── 智慧洞见配额：remainingCount
├── AI解读配额：remainingCount
└── 其他功能配额：remainingCount

每次使用：
1. 检查配额是否充足
2. 扣除配额（原子操作）
3. 记录使用记录
4. 返回结果
```

---

## 数据库设计

### 1. 功能商品表 `function_products`

**用途**：定义按次付费功能的商品信息和调用配置

```javascript
{
  _id: "func_product_001",
  functionCode: "wisdom_insight",        // 功能编码（唯一）
  functionName: "智慧洞见",             // 功能名称
  functionType: "per_use",             // 付费类型：per_use（按次）
  description: "AI智慧洞见，每次使用付费", // 功能描述
  
  // 价格配置
  price: 190,                          // 单价（分），1.9元/次
  originalPrice: 190,                  // 原价（用于展示）
  
  // 调用配置（统一网关使用）
  callConfig: {
    targetFunction: "cozeFunctions_v1_3",  // 目标云函数名称
    targetAction: null,                    // 目标云函数的action（可选）
    workflowType: "WISDOM_INSIGHT",         // 工作流类型（传递给目标云函数）
    parameters: {}                          // 默认参数（可选）
  },
  
  // 商品配置（快照到订单）
  grantData: {
    type: "grant_function_quota",      // 发货类型
    functionCode: "wisdom_insight",     // 功能编码
    quantity: 1                         // 发放次数
  },
  
  // 状态
  status: "active",                    // active/inactive
  sortOrder: 1,                        // 排序
  
  // 时间戳
  createTime: Date,
  updateTime: Date
}

// 索引
{
  functionCode: 1,  // 唯一索引
  status: 1         // 查询可用商品
}
```

**商品示例**：

```javascript
// 1. 智慧洞见 - 1.9元/次
{
  functionCode: "wisdom_insight",
  functionName: "智慧洞见",
  functionType: "per_use",
  price: 190,        // 1.9元
  callConfig: {
    targetFunction: "cozeFunctions_v1_3",
    targetAction: null,
    workflowType: "WISDOM_INSIGHT"
  },
  grantData: {
    type: "grant_function_quota",
    functionCode: "wisdom_insight",
    quantity: 1
  }
}

// 2. AI出报告 - 9.9元/次
{
  functionCode: "ai_report",
  functionName: "AI出报告",
  functionType: "per_use",
  price: 990,        // 9.9元
  callConfig: {
    targetFunction: "cozeFunctions_v1_3",
    targetAction: null,
    workflowType: "AI_REPORT"
  },
  grantData: {
    type: "grant_function_quota",
    functionCode: "ai_report",
    quantity: 1
  }
}
```

**说明**：
- ✅ `callConfig` 字段定义了如何调用目标云函数
- ✅ 统一网关根据 `functionCode` 查询商品配置，获取 `callConfig`
- ✅ 然后根据 `callConfig` 调用对应的目标云函数
- ✅ 新增功能只需在 `function_products` 表中添加配置，无需修改网关代码

### 2. 功能配额表 `function_quotas`

**用途**：记录用户各功能的**付费配额**（免费配额通过查询使用记录表统计）

**说明**：
- ✅ **付费配额**：存储在 `function_quotas` 表中，永久有效
- ✅ **免费配额**：通过 `static_user_types` 表配置，通过查询 `function_usage_records` 表统计每日使用次数
- ✅ **配额检查**：免费配额 + 付费配额 = 总可用配额

```javascript
{
  _id: "quota_xxx",
  openid: "olKds13ie...",              // 用户openid
  userId: "user_xxx",                  // 用户ID（关联users表）
  
  // 付费配额信息（按功能分类）
  quotas: {
    wisdom_insight: {                  // 智慧洞见付费配额
      paidTotal: 10,                   // 付费总次数（累计购买）
      paidUsed: 3,                     // 付费已使用次数
      paidRemaining: 7,                // 付费剩余次数
      lastUsedTime: Date,               // 最后使用时间
      lastGrantTime: Date              // 最后获得时间
    },
    ai_report: {                       // AI出报告付费配额
      paidTotal: 5,
      paidUsed: 2,
      paidRemaining: 3,
      lastUsedTime: Date,
      lastGrantTime: Date
    }
  },
  
  // 时间戳
  createTime: Date,
  updateTime: Date
}

// 索引
{
  openid: 1,                          // 用户查询（唯一）
  userId: 1                           // 用户ID查询
}
```

**重要说明**：
- ✅ **免费配额不存储在 `function_quotas` 表中**，通过查询使用记录表统计
- ✅ **付费配额存储在 `function_quotas` 表中**，永久有效
- ✅ **扣除配额时优先使用免费配额**，免费配额用完后才使用付费配额
- ✅ **功能调用失败不扣除配额**，用户可以重新使用

### 3. 功能使用记录表 `function_usage_records`

**用途**：记录每次功能使用的详细信息（用于统计、对账）

```javascript
{
  _id: "usage_xxx",
  openid: "olKds13ie...",              // 用户openid
  userId: "user_xxx",                  // 用户ID
  
  // 功能信息
  functionCode: "wisdom_insight",       // 功能编码
  functionName: "智慧洞见",            // 功能名称
  
  // 使用信息
  usageData: {                         // 使用时的参数（快照）
    question: "我应该换工作吗？",       // 智慧洞见的问题
    // 或其他功能的参数
  },
  result: {                            // 使用结果（可选）
    success: true,
    data: "AI返回的结果..."
  },
  
  // 付费信息
  isPaid: false,                       // 是否付费使用：true=付费，false=免费
  orderId: "order_xxx",                // 关联的订单ID（付费使用时）
  out_trade_no: "ORDER_xxx",           // 商户订单号（付费使用时）
  
  // 配额信息（快照）
  quotaBefore: {                       // 使用前配额信息
    freeRemaining: 1,                  // 免费剩余配额
    paidRemaining: 5,                  // 付费剩余配额
    totalRemaining: 6                  // 总剩余配额
  },
  quotaAfter: {                        // 使用后配额信息
    freeRemaining: 0,
    paidRemaining: 5,
    totalRemaining: 5
  },
  
  // 时间戳
  usageTime: Date,                    // 使用时间
  usageDate: "2024-12-07",            // 使用日期（YYYY-MM-DD格式，用于统计每日配额）
  createTime: Date
}

// 索引
{
  openid: 1,                          // 用户使用记录查询
  functionCode: 1,                     // 功能使用统计
  usageTime: -1,                      // 时间排序
  orderId: 1                          // 订单关联查询
}
```

### 4. 订单表扩展 `payment_orders`

**复用现有订单表**，新增字段支持功能付费：

```javascript
{
  // ... 现有字段 ...
  
  // 新增：功能付费相关字段
  orderType: "function_payment",        // 订单类型：function_payment（功能付费）
  functionCode: "wisdom_insight",      // 功能编码
  functionName: "智慧洞见",            // 功能名称
  
  // grantData 中已包含功能信息
  grantData: {
    type: "grant_function_quota",
    functionCode: "wisdom_insight",
    quantity: 1
  },
  
  // 权益发放信息（方案A：简化版）
  grantInfo: {
    status: "granted",              // 发放状态：pending（待发放）/granted（已发放）/failed（发放失败）
    grantTime: Date,                // 发放时间
    grantResult: {                  // 发放结果
      success: true,
      message: "配额发放成功"
    },
    errorMessage: ""                 // 失败时的错误信息（如果status为failed）
  }
}
```

**字段说明**：

| 字段 | 类型 | 说明 |
|-----|------|------|
| `grantInfo.status` | string | 发放状态：`pending`（待发放）、`granted`（已发放）、`failed`（发放失败） |
| `grantInfo.grantTime` | Date | 权益发放的时间 |
| `grantInfo.grantResult.success` | boolean | 发放是否成功 |
| `grantInfo.grantResult.message` | string | 发放结果消息 |
| `grantInfo.errorMessage` | string | 发放失败时的错误信息（可选） |

**状态流转**：
```
订单创建 → grantInfo.status = "pending"
    ↓
支付成功 → 开始发放权益
    ↓
发放成功 → grantInfo.status = "granted", grantInfo.grantTime = 当前时间
    ↓
发放失败 → grantInfo.status = "failed", grantInfo.errorMessage = 错误信息
```

### 5. 权益发放记录（已采用方案A：简化版）✅

**说明**：虽然销售的是虚拟产品，但"权益发放记录"仍然有价值：
- ✅ **问题排查**：记录发放状态和时间，便于定位问题
- ✅ **失败处理**：记录发放失败的情况和原因，便于后续补发或退款
- ✅ **数据统计**：统计发放成功率等指标

**已采用方案A（简化版）**：
- 在订单表 `payment_orders` 中记录权益发放信息
- 字段：`grantInfo.status`（发放状态）、`grantInfo.grantTime`（发放时间）、`grantInfo.grantResult`（发放结果）
- 不单独建立权益发放日志表

**注意**：不再需要 `payment_grant_logs` 表，所有信息记录在订单表中即可。

---

## 支付流程设计

### 完整流程图

```
用户点击功能（智慧洞见/AI出报告）
    ↓
检查配额（functionQuotaManagement.checkQuota）
    ↓
配额充足？
    ├─ 是 → 扣除配额 → 调用功能 → 返回结果 ✅
    │
    └─ 否 → 显示支付弹窗
            ↓
        用户确认支付
            ↓
        创建功能订单（paymentManagement.createFunctionOrder）
            ├─ 参数：{ functionCode: "wisdom_insight" }
            ├─ 查询商品信息（从 function_products）
            ├─ 创建订单记录
            └─ 返回支付参数
            ↓
        调起微信支付（wx.requestPayment）
            ↓
        支付成功（用户操作）
            ↓
        微信回调（paymentManagement.handlePaymentNotify）
            ├─ 验证签名
            ├─ 更新订单状态
            └─ 发放配额（functionQuotaManagement.grantQuota）
            ↓
        小程序轮询订单状态（可选）
            ↓
        配额发放成功
            ↓
        自动扣除配额 → 调用功能 → 返回结果 ✅
```

### 关键时序

**正常流程时间线**：
```
T0:  用户点击功能
T1:  检查配额（~100ms）
T2:  配额不足，显示支付弹窗（即时）
T3:  用户确认支付（用户操作）
T4:  创建订单（~500ms）
T5:  调起支付（即时）
T6:  用户完成支付（用户操作，1-30秒）
T7:  微信回调云函数（支付后1-3秒）
T8:  发放配额（~200ms）
T9:  扣除配额并调用功能（~2秒）
T10: 返回结果给用户
```

**优化方案**：
- 支付成功后，小程序等待3秒后自动查询配额
- 如果配额已发放，自动调用功能
- 如果3秒后仍未发放，提示"处理中，请稍后刷新"

---

## 实现细节

### 1. 新增云函数：`functionCallGateway`（统一调用网关）⭐

**设计理念**：所有需要付费的功能调用都通过统一网关，网关负责协调各个云函数完成功能调用。

**职责划分**：
- ✅ **统一网关（functionCallGateway）**：
  - 检查用户权限
  - **调用 `functionQuotaManagement` 检查配额**
  - **调用 `functionQuotaManagement` 扣除配额**
  - 调用目标功能云函数（如 `cozeFunctions_v1_3`）
  - 记录使用记录
  - **调用失败时调用 `functionQuotaManagement` 回滚配额**
  
- ✅ **配额管理（functionQuotaManagement）**：
  - 检查功能配额（免费配额 + 付费配额）
  - 扣除配额（原子操作，优先使用免费配额）
  - 发放配额（支付成功后）
  - 回滚配额（调用失败时）
  - 查询配额信息

**关键点**：
- ✅ **职责分离**：统一网关负责协调，配额管理负责配额操作
- ✅ **代码复用**：配额逻辑集中在 `functionQuotaManagement`，可被多个云函数调用
- ✅ **易于维护**：修改配额逻辑只需修改 `functionQuotaManagement`

**接口设计**：

```javascript
// 统一调用接口
{
  action: 'callFunction',
  data: {
    functionCode: 'wisdom_insight',        // 功能编码
    targetFunction: 'cozeFunctions_v1_3',  // 要调用的实际云函数名称
    targetAction: null,                    // 目标云函数的action（可选）
    functionParams: {                     // 传递给目标云函数的参数
      workflowType: 'WISDOM_INSIGHT',
      parameters: {
        question: '我应该换工作吗？'
      }
    }
  }
}
```

**实现逻辑**：

```javascript
// cloudfunctions/functionCallGateway/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { action, data } = event;
  
  if (action !== 'callFunction') {
    return { success: false, error: '未知操作类型' };
  }
  
  const { functionCode, functionParams } = data;
  
  try {
    // 1. 验证必需参数
    if (!functionCode) {
      return {
        success: false,
        error: '缺少必需参数：functionCode',
        code: 'INVALID_PARAMS'
      };
    }
    
    // 2. 查询功能配置（从 function_products 表）
    const productResult = await db.collection('function_products')
      .where({ functionCode: functionCode, status: 'active' })
      .get();
    
    if (productResult.data.length === 0) {
      return {
        success: false,
        error: '功能不存在或已下架',
        code: 'FUNCTION_NOT_FOUND'
      };
    }
    
    const productConfig = productResult.data[0];
    const callConfig = productConfig.callConfig;
    
    if (!callConfig || !callConfig.targetFunction) {
      return {
        success: false,
        error: '功能配置错误：缺少调用配置',
        code: 'INVALID_CONFIG'
      };
    }
    
    const { targetFunction, targetAction, workflowType } = callConfig;
    
    // 2. 检查用户权限
    const permissionCheck = await checkUserPermission(wxContext, functionCode);
    if (!permissionCheck.allowed) {
      return {
        success: false,
        error: permissionCheck.message || '无权限使用此功能',
        code: 'PERMISSION_DENIED',
        quotaInfo: permissionCheck.quotaInfo
      };
    }
    
    // 3. 检查配额（调用 functionQuotaManagement）
    const quotaCheckResult = await cloud.callFunction({
      name: 'functionQuotaManagement',
      data: {
        action: 'checkQuota',
        data: { functionCode: functionCode }
      }
    });
    
    if (!quotaCheckResult.result || !quotaCheckResult.result.success) {
      return {
        success: false,
        error: quotaCheckResult.result?.error || '检查配额失败',
        code: 'CHECK_QUOTA_FAILED'
      };
    }
    
    const quotaCheck = quotaCheckResult.result.data;
    if (!quotaCheck.canUse) {
      return {
        success: false,
        error: '配额不足，请先购买',
        code: 'QUOTA_INSUFFICIENT',
        quotaInfo: quotaCheck  // 返回配额信息，客户端可用于引导支付
      };
    }
    
    // 4. 扣除配额（原子操作，调用 functionQuotaManagement）
    const deductResult = await cloud.callFunction({
      name: 'functionQuotaManagement',
      data: {
        action: 'deductQuota',
        data: { functionCode: functionCode, quantity: 1 }
      }
    });
    
    if (!deductResult.result || !deductResult.result.success) {
      return {
        success: false,
        error: deductResult.result?.error || '扣除配额失败',
        code: 'DEDUCT_QUOTA_FAILED'
      };
    }
    
    const deductData = deductResult.result.data;
    
    // 5. 调用目标功能云函数
    let functionResult;
    try {
      // 构建调用参数（合并配置中的默认参数和用户传入的参数）
      const finalParams = {
        workflowType: workflowType || functionParams.workflowType,
        parameters: {
          ...callConfig.parameters,  // 配置中的默认参数
          ...functionParams.parameters  // 用户传入的参数（优先级更高）
        }
      };
      
      // 如果目标云函数需要 action 格式，则包装
      const callParams = targetAction 
        ? { action: targetAction, data: finalParams }
        : finalParams;
      
      // 调用目标云函数
      functionResult = await cloud.callFunction({
        name: targetFunction,
        data: callParams
      });
      
      // 检查调用结果
      if (!functionResult || !functionResult.result) {
        throw new Error('功能调用失败：无返回结果');
      }
      
      // 如果返回的是统一格式（有success字段），检查是否成功
      if (functionResult.result.success === false) {
        throw new Error(functionResult.result.error || '功能调用失败');
      }
      
    } catch (functionError) {
      // 6. 功能调用失败，回滚配额（调用 functionQuotaManagement）
      try {
        await cloud.callFunction({
          name: 'functionQuotaManagement',
          data: {
            action: 'rollbackQuota',
            data: {
              functionCode: functionCode,
              quantity: 1,
              isPaid: deductData.isPaid
            }
          }
        });
      } catch (rollbackError) {
        console.error('[functionCallGateway] 回滚配额失败:', rollbackError);
        // 回滚失败不影响错误返回
      }
      
      return {
        success: false,
        error: functionError.message || '功能调用失败',
        code: 'FUNCTION_CALL_FAILED',
        quotaInfo: quotaCheck  // 返回回滚后的配额信息（应该是扣除前的状态）
      };
    }
    
    // 7. 功能调用成功，记录使用记录
    await recordFunctionUsage(wxContext, {
      functionCode: functionCode,
      targetFunction: targetFunction,
      usageData: functionParams,
      result: functionResult.result,
      isPaid: deductData.isPaid,
      quotaBefore: quotaCheck,
      quotaAfter: deductData.quotaAfter
    });
    
    // 8. 返回结果
    return {
      success: true,
      data: functionResult.result.data || functionResult.result,
      quotaInfo: deductData.quotaAfter,  // 返回更新后的配额信息
      isPaid: deductData.isPaid          // 标记本次使用是免费还是付费
    };
    
  } catch (error) {
    console.error('[functionCallGateway] 调用失败:', error);
    
    // 如果已经扣除了配额，需要回滚
    if (typeof deductResult !== 'undefined' && deductResult && deductResult.result && deductResult.result.success) {
      try {
        const deductData = deductResult.result.data;
        await cloud.callFunction({
          name: 'functionQuotaManagement',
          data: {
            action: 'rollbackQuota',
            data: {
              functionCode: functionCode,
              quantity: 1,
              isPaid: deductData.isPaid
            }
          }
        });
      } catch (rollbackError) {
        console.error('[functionCallGateway] 回滚配额失败:', rollbackError);
      }
    }
    
    return {
      success: false,
      error: error.message || '调用失败',
      code: 'INTERNAL_ERROR'
    };
  }
};

/**
 * 检查用户权限
 */
async function checkUserPermission(wxContext, functionCode) {
  const { OPENID } = wxContext;
  
  // 1. 获取用户信息
  const userResult = await db.collection('users')
    .where({ openid: OPENID, isActive: true })
    .get();
  
  if (userResult.data.length === 0) {
    return { allowed: false, message: '用户不存在' };
  }
  
  const user = userResult.data[0];
  const userType = user.userType || 'guest';
  
  // 2. 获取用户类型配置
  const typeConfig = await getUserTypeConfig(userType);
  
  // 3. 检查功能权限（可以根据functionCode配置权限）
  // 这里可以根据实际需求扩展权限检查逻辑
  // 例如：某些功能只有premium用户可以使用
  
  return {
    allowed: true,
    userType: userType,
    quotaInfo: null  // 权限检查不涉及配额
  };
}

/**
 * 记录使用记录
 */
async function recordFunctionUsage(wxContext, usageData) {
  const { OPENID } = wxContext;
  
  try {
    await db.collection('function_usage_records').add({
      data: {
        openid: OPENID,
        userId: await getUserId(wxContext),
        functionCode: usageData.functionCode,
        targetFunction: usageData.targetFunction,
        usageData: usageData.usageData,
        result: usageData.result,
        isPaid: usageData.isPaid,
        quotaBefore: usageData.quotaBefore,
        quotaAfter: usageData.quotaAfter,
        usageTime: new Date(),
        usageDate: new Date().toISOString().split('T')[0],
        createTime: new Date()
      }
    });
  } catch (error) {
    console.error('[functionCallGateway] 记录使用记录失败:', error);
    // 记录失败不影响主流程
  }
}

/**
 * 获取用户ID
 */
async function getUserId(wxContext) {
  const { OPENID } = wxContext;
  const userResult = await db.collection('users')
    .where({ openid: OPENID, isActive: true })
    .get();
  
  return userResult.data.length > 0 ? userResult.data[0]._id : null;
}
```

**优势**：
- ✅ **统一入口**：所有付费功能调用都通过统一网关
- ✅ **集中管理**：权限、配额检查集中在一个地方
- ✅ **易于扩展**：新增功能只需配置，无需修改网关代码
- ✅ **安全可靠**：所有检查在云端进行，客户端无法绕过
- ✅ **统一格式**：返回统一的响应格式，便于客户端处理

### 2. 新增云函数：`functionQuotaManagement`

**功能**：专门负责配额相关的所有操作，被 `functionCallGateway` 和其他云函数调用。

**职责**：
- ✅ 检查配额（免费配额 + 付费配额）
- ✅ 扣除配额（原子操作，优先使用免费配额）
- ✅ 发放配额（支付成功后发放）
- ✅ 查询配额信息
- ✅ 回滚配额（功能调用失败时）

**接口设计**：

```javascript
// action: checkQuota
// 检查配额是否充足
{
  action: 'checkQuota',
  data: {
    functionCode: 'wisdom_insight'
  }
}
// 返回：
{
  success: true,
  data: {
    canUse: true/false,
    freeRemaining: 1,
    paidRemaining: 5,
    totalRemaining: 6,
    freeDailyQuota: 3,
    freeUsedToday: 2
  }
}

// action: deductQuota
// 扣除配额（原子操作）
{
  action: 'deductQuota',
  data: {
    functionCode: 'wisdom_insight',
    quantity: 1
  }
}
// 返回：
{
  success: true,
  data: {
    isPaid: false,  // true=付费使用，false=免费使用
    quotaBefore: { freeRemaining: 1, paidRemaining: 5, totalRemaining: 6 },
    quotaAfter: { freeRemaining: 0, paidRemaining: 5, totalRemaining: 5 }
  }
}

// action: grantQuota
// 发放配额（支付成功后调用）
{
  action: 'grantQuota',
  data: {
    functionCode: 'wisdom_insight',
    quantity: 1,
    orderId: 'order_xxx'  // 可选，关联订单
  }
}

// action: rollbackQuota
// 回滚配额（功能调用失败时调用）
{
  action: 'rollbackQuota',
  data: {
    functionCode: 'wisdom_insight',
    quantity: 1,
    isPaid: false  // true=回滚付费配额，false=删除免费使用记录
  }
}

// action: getQuotaInfo
// 获取配额信息
{
  action: 'getQuotaInfo',
  data: {
    functionCode: 'wisdom_insight'  // 可选，不传则返回所有功能配额
  }
}
```

**关键点**：
- ✅ **被统一网关调用**：`functionCallGateway` 调用此云函数处理配额操作
- ✅ **职责单一**：只负责配额管理，不涉及功能调用
- ✅ **可复用**：其他云函数也可以调用此云函数进行配额操作

### 2. 扩展支付云函数：`paymentManagement_v1_3`

**新增接口**：

```javascript
// action: createFunctionOrder
// 创建功能付费订单
{
  action: 'createFunctionOrder',
  data: {
    functionCode: 'wisdom_insight'  // 只传功能编码，价格从数据库查询
  }
}
```

**发货逻辑扩展**：

```javascript
// 在 handlePaymentSuccess 中新增
case 'grant_function_quota':
  // 调用 functionQuotaManagement 发放配额
  const { functionCode, quantity } = grantData;
  
  try {
    const grantResult = await cloud.callFunction({
      name: 'functionQuotaManagement',
      data: {
        action: 'grantQuota',
        data: {
          functionCode: functionCode,
          quantity: quantity || 1,
          orderId: order._id
        }
      }
    });
    
    const grantSuccess = grantResult.result && grantResult.result.success;
    const grantMessage = grantResult.result?.message || 
                        (grantSuccess ? '配额发放成功' : '配额发放失败');
    
    // 更新订单的 grantInfo（方案A：简化版）
    await db.collection('payment_orders').doc(order._id).update({
      data: {
        'grantInfo.status': grantSuccess ? 'granted' : 'failed',
        'grantInfo.grantTime': new Date(),
        'grantInfo.grantResult': {
          success: grantSuccess,
          message: grantMessage
        },
        'grantInfo.errorMessage': grantSuccess ? '' : (grantResult.result?.error || '未知错误'),
        updateTime: new Date()
      }
    });
    
  } catch (error) {
    console.error('[handlePaymentSuccess] 发放配额失败:', error);
    
    // 更新订单状态为失败
    await db.collection('payment_orders').doc(order._id).update({
      data: {
        'grantInfo.status': 'failed',
        'grantInfo.grantTime': new Date(),
        'grantInfo.grantResult': {
          success: false,
          message: '配额发放失败：' + error.message
        },
        'grantInfo.errorMessage': error.message,
        updateTime: new Date()
      }
    });
  }
  
  break;
```

### 3. 功能云函数：`cozeFunctions_v1_3`（保持不变）

**说明**：功能云函数保持纯功能实现，不包含配额检查逻辑。

- ✅ **职责单一**：只负责调用AI功能
- ✅ **不检查配额**：配额检查由统一网关负责
- ✅ **可复用**：可以被网关调用，也可以被其他云函数调用

**接口保持不变**：

```javascript
// cozeFunctions_v1_3 云函数（纯功能实现）
exports.main = async (event, context) => {
  const { workflowType, parameters } = event;
  
  // 直接调用 Coze API，不检查配额
  const result = await callCozeAPI(parameters, workflowId);
  
  return {
    success: true,
    data: result.data
  };
};
```

### 4. 客户端Service：`FunctionService`

**新增Service类**（统一调用网关）：

```javascript
// miniprogram/services/FunctionService.js
class FunctionService extends BaseService {
  /**
   * 预检查配额（可选，用于UI提示）
   * 注意：这只是UI提示，最终检查在统一网关
   */
  async checkQuota(functionCode) {
    return this.callFunction('functionQuotaManagement', {
      action: 'checkQuota',
      data: { functionCode }
    });
  }
  
  /**
   * 调用功能（通过统一网关）
   * @param {string} functionCode - 功能编码（如：'wisdom_insight'）
   * @param {Object} functionParams - 功能参数（如：{ parameters: { question: '...' } }）
   */
  async useFunction(functionCode, functionParams) {
    // 调用统一网关，网关会从 function_products 表读取配置
    return this.callFunction('functionCallGateway', {
      action: 'callFunction',
      data: {
        functionCode: functionCode,
        functionParams: functionParams  // 直接传递参数，网关会处理
      }
    });
  }
  
  /**
   * 购买功能使用次数
   */
  async purchaseFunction(functionCode) {
    return this.callFunction('paymentManagement_v1_3', {
      action: 'createFunctionOrder',
      data: { functionCode }
    });
  }
}
```

**关键点**：
- ✅ **统一调用入口**：所有功能调用都通过统一网关
- ✅ **客户端简化**：客户端只需要知道功能编码，不需要知道具体云函数
- ✅ **易于扩展**：新增功能只需配置，无需修改客户端代码

### 5. 客户端Controller：`FunctionController`

**统一处理功能使用和支付**：

```javascript
// miniprogram/controllers/FunctionController.js
class FunctionController {
  /**
   * 使用功能（通过统一网关，自动处理配额和支付）
   */
  async useFunction(functionCode, functionParams) {
    // 显示加载
    wx.showLoading({ title: '处理中...', mask: true });
    
    try {
      // 1. 调用统一网关（网关会检查配额和权限）
      const result = await functionService.useFunction(functionCode, functionParams);
      
      wx.hideLoading();
      
      // 2. 如果配额不足，引导支付
      if (!result.success && result.code === 'QUOTA_INSUFFICIENT') {
        const confirmed = await this._showPaymentDialog(functionCode, result.quotaInfo);
        if (!confirmed) return result;
        
        // 发起支付流程
        const paymentResult = await this._purchaseFunction(functionCode);
        return paymentResult;
      }
      
      // 3. 权限不足
      if (!result.success && result.code === 'PERMISSION_DENIED') {
        this._showError(result.error || '无权限使用此功能');
        return result;
      }
      
      // 4. 功能调用成功
      if (result.success) {
        // 显示成功提示
        const message = result.isPaid 
          ? '使用成功（已扣除付费次数）'
          : '使用成功（已扣除免费次数）';
        this._showSuccess(message);
        
        // 更新配额信息（如果有）
        if (result.quotaInfo) {
          this.page.setData({
            quotaInfo: result.quotaInfo
          });
        }
        
        return result;
      }
      
      // 5. 其他错误
      this._showError(result.error || '使用失败');
      return result;
      
    } catch (error) {
      wx.hideLoading();
      this._showError('网络错误，请重试');
      return ResponseBean.error('调用失败：' + error.message);
    }
  }
  
  /**
   * 显示支付弹窗
   */
  async _showPaymentDialog(functionCode, quotaInfo) {
    return new Promise((resolve) => {
      const functionNames = {
        'wisdom_insight': '智慧洞见',
        'ai_report': 'AI出报告'
      };
      
      const functionName = functionNames[functionCode] || '功能';
      
      wx.showModal({
        title: '配额不足',
        content: `${functionName}配额不足，是否购买？`,
        confirmText: '购买',
        cancelText: '取消',
        success: (res) => resolve(res.confirm)
      });
    });
  }
  
  /**
   * 购买功能（支付成功后需要用户再次点击使用）
   */
  async _purchaseFunction(functionCode) {
    // 1. 创建订单
    wx.showLoading({ title: '创建订单...', mask: true });
    
    const orderResult = await functionService.purchaseFunction(functionCode);
    wx.hideLoading();
    
    if (!orderResult.success) {
      this._showError('创建订单失败：' + orderResult.error);
      return orderResult;
    }
    
    // 2. 调起支付
    wx.showLoading({ title: '支付中...', mask: true });
    
    try {
      await this._requestPayment(orderResult.data.paymentParams);
      
      // 3. 支付成功，提示用户
      wx.hideLoading();
      wx.showModal({
        title: '支付成功',
        content: '购买成功！请点击功能按钮使用',
        showCancel: false,
        confirmText: '知道了'
      });
      
      return ResponseBean.success({ message: '支付成功，请点击使用功能' });
      
    } catch (error) {
      wx.hideLoading();
      
      if (error.errMsg && error.errMsg.includes('cancel')) {
        this._showError('已取消支付');
      } else {
        this._showError('支付失败：' + error.message);
      }
      
      return ResponseBean.error('支付失败');
    }
  }
  
  /**
   * 调起微信支付
   */
  async _requestPayment(paymentParams) {
    return new Promise((resolve, reject) => {
      wx.requestPayment({
        ...paymentParams,
        success: resolve,
        fail: reject
      });
    });
  }
  
  _showSuccess(message) {
    wx.showToast({ title: message, icon: 'success' });
  }
  
  _showError(message) {
    wx.showToast({ title: message, icon: 'none', duration: 2000 });
  }
}
```

---

## 安全机制

### ⚠️ 重要：统一网关模式的安全优势

**核心原则**：
- ✅ **统一入口**：所有付费功能调用都通过统一网关 `functionCallGateway`
- ✅ **配额检查必须在云端**：客户端可以绕过任何检查，必须在云函数中验证
- ✅ **功能调用前必须检查**：在调用AI功能前，必须先检查配额和权限
- ✅ **扣除配额使用原子操作**：防止并发问题，确保配额准确扣除
- ✅ **功能调用失败回滚配额**：如果功能调用失败，不扣除配额，用户可以重试

**统一网关流程**：
```
客户端调用功能
    ↓
统一网关（functionCallGateway）
    ├─ 【云端】检查权限 ← 必须在这里
    ├─ 【云端】检查配额 ← 必须在这里
    ├─ 【云端】扣除配额（原子操作）← 必须在这里
    ├─ 调用目标功能云函数
    ├─ 成功 → 记录使用记录
    └─ 失败 → 回滚配额
```

**错误示例**（不安全）：
```javascript
// ❌ 错误：客户端检查配额
// 客户端代码
if (quota > 0) {
  await callFunction('cozeFunctions');  // 客户端可以绕过检查
}

// ❌ 错误：功能云函数检查配额（分散管理）
// 每个功能云函数都要实现配额检查，容易遗漏
exports.main = async (event) => {
  // 每个云函数都要写一遍配额检查代码
  const quotaCheck = await checkQuota(...);
  // ...
};
```

**正确示例**（安全 - 统一网关模式）：
```javascript
// ✅ 正确：统一网关检查配额
// 客户端代码
await callFunction('functionCallGateway', {
  action: 'callFunction',
  data: {
    functionCode: 'wisdom_insight',
    targetFunction: 'cozeFunctions_v1_3',
    functionParams: { ... }
  }
});

// ✅ 统一网关代码（集中管理）
exports.main = async (event) => {
  // 1. 检查权限（必须）
  const permissionCheck = await checkUserPermission(...);
  if (!permissionCheck.allowed) {
    return { success: false, error: '无权限' };
  }
  
  // 2. 检查配额（必须）
  const quotaCheck = await checkFunctionQuota(...);
  if (!quotaCheck.canUse) {
    return { success: false, error: '配额不足', code: 'QUOTA_INSUFFICIENT' };
  }
  
  // 3. 扣除配额（原子操作，必须）
  const deductResult = await deductFunctionQuota(...);
  
  // 4. 调用目标功能云函数
  try {
    const result = await cloud.callFunction({
      name: targetFunction,
      data: functionParams
    });
    
    // 5. 记录使用记录
    await recordFunctionUsage(...);
    
    return { success: true, data: result };
  } catch (error) {
    // 6. 失败回滚配额
    await rollbackQuota(...);
    throw error;
  }
};
```

**统一网关的优势**：
- ✅ **集中管理**：所有权限和配额检查集中在一个地方，不会遗漏
- ✅ **统一格式**：返回统一的错误码和格式，便于客户端处理
- ✅ **易于维护**：修改配额逻辑只需修改网关，不需要修改每个功能云函数
- ✅ **易于扩展**：新增功能只需配置，无需修改网关代码
- ✅ **安全可靠**：所有检查在云端进行，客户端无法绕过

### 1. 防止未付费使用

**措施**：
- ✅ **配额检查在云函数中进行**，客户端无法绕过
- ✅ **扣除配额使用数据库原子操作**，防止并发问题
- ✅ **每次使用都记录使用记录**，可追溯
- ✅ **功能调用前必须检查配额**，防止绕过检查直接调用

### 2. 防止重复扣费

**措施**：
- ✅ 扣除配额使用原子操作（`db.command.inc(-1)` + 条件判断）
- ✅ 如果扣除失败（配额不足），返回错误，不执行功能
- ✅ 使用记录表记录每次使用，可对账

### 3. 防止价格篡改

**措施**：
- ✅ 客户端只传 `functionCode`，价格从数据库查询
- ✅ 订单创建时，商品信息快照到订单表
- ✅ 发货时使用订单表中的快照数据

### 4. 防止并发问题

**措施**：
- ✅ 扣除配额使用数据库原子操作
- ✅ 订单创建时检查是否有待支付订单
- ✅ 支付回调使用订单状态判断，防止重复发货

---

## 已确认问题 ✅

### 1. 价格策略 ✅

**已确认**：
- ✅ 智慧洞见：**1.9元/次**（190分）
- ✅ AI出报告：**9.9元/次**（990分）
- ✅ 暂不设置套餐

**商品配置更新**：
```javascript
// 1. 智慧洞见 - 1.9元/次
{
  functionCode: "wisdom_insight",
  functionName: "智慧洞见",
  functionType: "per_use",
  price: 190,  // 1.9元
  grantData: {
    type: "grant_function_quota",
    functionCode: "wisdom_insight",
    quantity: 1
  }
}

// 2. AI出报告 - 9.9元/次
{
  functionCode: "ai_report",
  functionName: "AI出报告",
  functionType: "per_use",
  price: 990,  // 9.9元
  grantData: {
    type: "grant_function_quota",
    functionCode: "ai_report",
    quantity: 1
  }
}
```

### 2. 免费配额 ✅

**已确认**：
- ✅ 智慧洞见已有免费体验次数，不同用户等级免费次数不同
- ✅ **不需要调整数据表**，沿用现有机制

**实现方式**（参考抽卡功能的实现）：
1. **免费配额配置**：在 `static_user_types` 表中配置免费配额
   - **智慧洞见**：复用现有的 `dailyDrawQuota` 字段（⚠️ 抽卡功能和智慧洞见是同一个功能）
     - guest: 0次（不可用）
     - normal: 1次/天
     - premium: 无限（-1）
   - **AI出报告**：新增 `dailyAiReportQuota` 字段
     - guest: 0次（不可用）
     - normal: 1次/天
     - premium: 无限（-1）
   - 配置方式：0=不可用，正整数=每日次数，-1=无限

2. **使用记录**：通过 `function_usage_records` 表记录每次使用
   - 记录字段：`functionCode`、`usageTime`、`usageDate`（YYYY-MM-DD格式）

3. **配额检查**：查询 `function_usage_records` 表统计每日使用次数
   - 智慧洞见免费配额 = `dailyDrawQuota`（复用现有字段）
   - AI出报告免费配额 = `dailyAiReportQuota`（新增字段）
   - 已使用次数 = 查询当日使用记录数
   - 剩余配额 = 免费配额 - 已使用次数

**数据表调整**：
- ✅ **不需要新增数据表**
- ✅ 在 `static_user_types` 表中新增 `dailyAiReportQuota` 字段（智慧洞见复用 `dailyDrawQuota`）
- ✅ 使用 `function_usage_records` 表记录使用记录

### 3. 配额有效期 ✅

**已确认**：
- ✅ 购买的配额**永久有效**（不设置过期时间）
- ✅ 免费配额按日重置（通过查询使用记录表的日期字段）

### 4. 支付失败处理 ✅

**已确认**：
- ✅ 支付失败后，订单状态保持为 `NOTPAY`
- ✅ 用户可以重新支付（在"我的订单"中）
- ✅ 订单2小时后自动过期（已有实现）

### 5. 功能调用时机 ✅

**已确认**：
- ✅ **支付成功后，需要用户再次点击使用**
- ✅ 支付成功后只发放配额，不自动调用功能
- ✅ 用户需要主动点击功能按钮使用

**流程调整**：
```
支付成功 → 发放配额 → 提示"购买成功，请点击使用功能"
    ↓
用户点击功能 → 检查配额 → 扣除配额 → 调用功能 → 返回结果
```

### 6. 退款策略 ✅

**已确认**：
- ✅ **功能调用失败不扣除次数**：调用失败时，配额不扣除，用户可以重新点击使用
- ✅ **付费次数不支持退费**：一旦购买，不支持退款
- ✅ **配额存储**：付费购买的次数以可用次数形式存储在 `function_quotas` 表中

**实现逻辑**：
```javascript
// 功能调用流程
1. 检查配额（免费配额 + 付费配额）
2. 调用功能
3. 如果调用成功 → 扣除配额（优先扣除免费配额，再扣除付费配额）
4. 如果调用失败 → 不扣除配额，用户可以重新使用
```

### 7. 数据统计需求 ✅

**已确认**：
- ✅ **统计功能使用情况**：使用 `function_usage_records` 表记录所有使用记录
- ✅ **不需要额外的数据表**：`function_usage_records` 表已设计，可以满足统计需求

**统计维度**（基于 `function_usage_records` 表）：
- 使用次数：按功能、按用户、按时间统计
- 付费次数：通过 `orderId` 字段关联订单，统计付费使用次数
- 转化率：付费使用次数 / 总使用次数
- 用户活跃度：按用户统计使用频率

**查询示例**：
```javascript
// 统计智慧洞见的使用次数
db.collection('function_usage_records')
  .where({ functionCode: 'wisdom_insight' })
  .count()

// 统计付费使用次数
db.collection('function_usage_records')
  .where({ 
    functionCode: 'wisdom_insight',
    orderId: db.command.neq(null)  // 有订单ID表示付费使用
  })
  .count()

// 统计用户的使用记录
db.collection('function_usage_records')
  .where({ openid: 'xxx' })
  .orderBy('usageTime', 'desc')
  .get()
```

---

## 总结

### 核心设计要点

1. **统一调用网关**：`functionCallGateway` 云函数作为所有付费功能的统一入口
   - ✅ 集中管理权限和配额检查
   - ✅ 统一错误处理和响应格式
   - ✅ 易于扩展和维护

2. **复用现有支付系统**：扩展 `paymentManagement_v1_3`，新增功能付费订单类型

3. **新增配额管理系统**：`functionQuotaManagement` 云函数管理功能配额

4. **数据库设计**：
   - `function_products`：功能商品表
   - `function_quotas`：用户付费配额表（免费配额通过查询使用记录统计）
   - `function_usage_records`：使用记录表（记录所有使用，用于统计和配额计算）
   - `payment_orders`：订单表（扩展 `grantInfo` 字段记录权益发放信息）
   - `static_user_types`：用户类型表（扩展免费配额配置字段）

5. **权益发放记录**：采用方案A（简化版），在订单表中记录发放状态、时间、结果

6. **支付流程**：先付费后使用，支付成功后发放配额，用户需要再次点击使用

7. **安全机制**：
   - ✅ 统一网关模式：所有检查在云端进行，客户端无法绕过
   - ✅ 配额检查在服务端：使用原子操作防止并发问题
   - ✅ 功能调用失败回滚配额：不扣除配额，用户可以重试

### 下一步行动

1. **确认细节问题**：与产品确认价格、免费配额、退款策略等
2. **数据库设计确认**：确认数据库表结构是否符合需求
3. **开发计划**：
   - Phase 1：数据库表创建
   - Phase 2：云函数开发（functionQuotaManagement）
   - Phase 3：支付云函数扩展
   - Phase 4：客户端Service和Controller开发
   - Phase 5：页面集成和测试

---

**文档版本**：v1.0  
**创建时间**：2024年12月  
**维护者**：开发团队

