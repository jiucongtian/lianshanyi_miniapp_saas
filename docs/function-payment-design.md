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
│                   │  - 检查配额      │                   │
│                   │  - 创建订单      │                   │
│                   │  - 调用功能      │                   │
│                   └────────┬────────┘                   │
└────────────────────────────┼────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────┐
│                    云函数层                              │
│  ┌──────────────────────────────────────────────────┐ │
│  │ paymentManagement_v1_3                            │ │
│  │  - 创建功能付费订单                                │ │
│  │  - 处理支付回调                                    │ │
│  │  - 发放使用次数                                    │ │
│  └──────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────┐ │
│  │ functionQuotaManagement (新增)                    │ │
│  │  - 检查功能配额                                    │ │
│  │  - 扣除使用次数                                    │ │
│  │  - 查询配额信息                                    │ │
│  └──────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────┐ │
│  │ cozeFunctions_v1_3                               │ │
│  │  - 调用AI功能（保持不变）                          │ │
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
检查配额（functionQuotaManagement.checkQuota）
    ↓
配额充足？
    ├─ 是 → 扣除配额 → 调用功能 → 返回结果
    └─ 否 → 显示支付弹窗
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
        扣除配额 → 调用功能 → 返回结果
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

**用途**：定义按次付费功能的商品信息

```javascript
{
  _id: "func_product_001",
  functionCode: "wisdom_insight",        // 功能编码（唯一）
  functionName: "智慧洞见",             // 功能名称
  functionType: "per_use",             // 付费类型：per_use（按次）
  description: "AI智慧洞见，每次使用付费", // 功能描述
  
  // 价格配置
  price: 100,                          // 单价（分），如：1元/次
  originalPrice: 100,                  // 原价（用于展示）
  
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
  grantData: {
    type: "grant_function_quota",
    functionCode: "ai_report",
    quantity: 1
  }
}
```

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

### 1. 新增云函数：`functionQuotaManagement`

**功能**：
- 检查配额
- 扣除配额
- 发放配额
- 查询配额信息

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

// action: deductQuota
// 扣除配额（原子操作）
{
  action: 'deductQuota',
  data: {
    functionCode: 'wisdom_insight',
    quantity: 1
  }
}

// action: grantQuota
// 发放配额
{
  action: 'grantQuota',
  data: {
    functionCode: 'wisdom_insight',
    quantity: 1,
    orderId: 'order_xxx'  // 可选，关联订单
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
  const grantResult = await grantFunctionQuota(openid, grantData);
  
  // 更新订单的 grantInfo（方案A：简化版）
  await db.collection('payment_orders').doc(order._id).update({
    data: {
      'grantInfo.status': grantResult.success ? 'granted' : 'failed',
      'grantInfo.grantTime': new Date(),
      'grantInfo.grantResult': {
        success: grantResult.success,
        message: grantResult.message || (grantResult.success ? '配额发放成功' : '配额发放失败')
      },
      'grantInfo.errorMessage': grantResult.success ? '' : (grantResult.message || '未知错误'),
      updateTime: new Date()
    }
  });
  
  break;
```

### 3. 客户端Service：`FunctionService`

**新增Service类**：

```javascript
// miniprogram/services/FunctionService.js
class FunctionService extends BaseService {
  /**
   * 检查功能配额
   */
  async checkQuota(functionCode) {
    return this.callFunction('functionQuotaManagement', {
      action: 'checkQuota',
      data: { functionCode }
    });
  }
  
  /**
   * 使用功能（检查配额 → 扣除配额 → 调用功能）
   */
  async useFunction(functionCode, functionParams) {
    // 1. 检查配额
    const quotaCheck = await this.checkQuota(functionCode);
    if (!quotaCheck.success) {
      return quotaCheck;
    }
    
    if (!quotaCheck.data.canUse) {
      return ResponseBean.error('配额不足，请先购买', -1001);
    }
    
    // 2. 扣除配额
    const deductResult = await this.callFunction('functionQuotaManagement', {
      action: 'deductQuota',
      data: { functionCode, quantity: 1 }
    });
    
    if (!deductResult.success) {
      return deductResult;
    }
    
    // 3. 调用功能
    // 根据 functionCode 调用不同的云函数
    if (functionCode === 'wisdom_insight') {
      return await this.callWisdomInsight(functionParams);
    } else if (functionCode === 'ai_report') {
      return await this.callAIReport(functionParams);
    }
    
    return ResponseBean.error('未知功能');
  }
  
  /**
   * 购买功能使用次数
   */
  async purchaseFunction(functionCode) {
    // 调用支付云函数创建订单
    return this.callFunction('paymentManagement_v1_3', {
      action: 'createFunctionOrder',
      data: { functionCode }
    });
  }
}
```

### 4. 客户端Controller：`FunctionController`

**统一处理功能使用和支付**：

```javascript
// miniprogram/controllers/FunctionController.js
class FunctionController {
  /**
   * 使用功能（带支付流程）
   */
  async useFunction(functionCode, functionParams) {
    // 1. 尝试使用功能
    const result = await functionService.useFunction(functionCode, functionParams);
    
    // 2. 如果配额不足，引导支付
    if (result.code === -1001) {
      const confirmed = await this._showPaymentDialog(functionCode);
      if (!confirmed) return;
      
      // 发起支付流程
      const paymentResult = await this._purchaseAndUse(functionCode, functionParams);
      return paymentResult;
    }
    
    return result;
  }
  
  /**
   * 购买并使用功能
   */
  async _purchaseAndUse(functionCode, functionParams) {
    // 1. 创建订单
    const orderResult = await functionService.purchaseFunction(functionCode);
    if (!orderResult.success) {
      return ResponseBean.error('创建订单失败：' + orderResult.error);
    }
    
    // 2. 调起支付
    await this._requestPayment(orderResult.data.paymentParams);
    
    // 3. 等待配额发放（轮询）
    await this._waitForQuota(functionCode, 5000); // 最多等待5秒
    
    // 4. 使用功能
    return await functionService.useFunction(functionCode, functionParams);
  }
}
```

---

## 安全机制

### 1. 防止未付费使用

**措施**：
- ✅ 配额检查在云函数中进行，客户端无法绕过
- ✅ 扣除配额使用数据库原子操作，防止并发问题
- ✅ 每次使用都记录使用记录，可追溯

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
1. **免费配额配置**：在 `static_user_types` 表中新增字段配置免费配额
   - 字段名：`dailyWisdomInsightQuota`（智慧洞见）、`dailyAiReportQuota`（AI出报告）
   - 配置方式：类似 `dailyDrawQuota`，0=不可用，正整数=每日次数，-1=无限

2. **使用记录**：通过 `function_usage_records` 表记录每次使用
   - 记录字段：`functionCode`、`usageTime`、`usageDate`（YYYY-MM-DD格式）

3. **配额检查**：查询 `function_usage_records` 表统计每日使用次数
   - 免费配额 = 用户类型配置的每日配额
   - 已使用次数 = 查询当日使用记录数
   - 剩余配额 = 免费配额 - 已使用次数

**数据表调整**：
- ✅ **不需要新增数据表**
- ✅ 在 `static_user_types` 表中新增字段（类似 `dailyDrawQuota`）
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

1. **复用现有支付系统**：扩展 `paymentManagement_v1_3`，新增功能付费订单类型
2. **新增配额管理系统**：`functionQuotaManagement` 云函数管理功能配额
3. **数据库设计**：
   - `function_products`：功能商品表
   - `function_quotas`：用户配额表
   - `function_usage_records`：使用记录表
   - `payment_orders`：订单表（扩展 `grantInfo` 字段记录权益发放信息）
4. **权益发放记录**：采用方案A（简化版），在订单表中记录发放状态、时间、结果
5. **支付流程**：先付费后使用，支付成功后自动发放配额并调用功能
6. **安全机制**：配额检查在服务端，使用原子操作防止并发问题

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

