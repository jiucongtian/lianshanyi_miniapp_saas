# 小程序支付系统设计方案

## 📋 目录

1. [系统概述](#系统概述)
2. [商品体系设计](#商品体系设计)
3. [支付流程设计](#支付流程设计)
4. [安全机制设计](#安全机制设计)
5. [数据库设计](#数据库设计)
6. [代码实现方案](#代码实现方案)
7. [异常处理机制](#异常处理机制)
8. [测试方案](#测试方案)

---

## 系统概述

### 业务场景

本小程序支付系统支持以下业务场景：

1. **用户等级升级**
   - 临时用户(guest) → 探索者(normal)
   - 探索者(normal) → 高级用户(premium)

2. **抽卡次数充值**
   - 购买单次抽卡
   - 购买抽卡礼包（多次）

3. **功能权限开通**
   - 解锁特殊功能
   - 增加档案配额

### 核心原则

1. ✅ **服务端定价**：所有价格在服务端维护
2. ✅ **订单验证**：每笔订单必须验证
3. ✅ **防重复发货**：同一订单只能发货一次
4. ✅ **日志完整**：所有操作留痕
5. ✅ **用户友好**：流程简洁，提示清晰

---

## 商品体系设计

### 商品分类

```
商品体系
├── 用户权益类
│   ├── 会员升级（一次性）
│   │   ├── 升级为探索者
│   │   └── 升级为高级用户
│   └── 档案配额扩容
│       ├── +10个档案名额
│       └── +50个档案名额
│
└── 消耗品类
    └── 抽卡次数
        ├── 单次抽卡
        ├── 5次抽卡礼包
        ├── 10次抽卡礼包
        └── 50次抽卡礼包（月卡）
```

### 商品配置表

**存储位置**：云数据库 `payment_products` 集合

**字段定义**：

```javascript
{
  _id: "product_001",                    // 商品ID
  productCode: "upgrade_premium",        // 商品编码（唯一）
  productName: "升级为高级用户",         // 商品名称
  productType: "membership",             // 商品类型：membership/consumable/quota
  price: 9900,                           // 价格（分），服务端维护
  originalPrice: 19900,                  // 原价（分），用于展示
  description: "解锁全部功能，无限档案",  // 商品描述
  features: [                            // 商品特性
    "创建无限档案",
    "全部卡牌解锁",
    "每日免费抽卡3次"
  ],
  grantData: {                           // 发货数据
    type: "upgrade_user_type",
    targetUserType: "premium"
  },
  status: "active",                      // 状态：active/inactive/soldout
  stock: -1,                             // 库存：-1表示无限
  sortOrder: 1,                          // 排序
  createTime: Date,
  updateTime: Date
}
```

### 商品示例配置

```javascript
// 1. 升级为高级用户
{
  productCode: "upgrade_premium",
  productName: "升级为高级用户",
  productType: "membership",
  price: 9900,        // 99元
  grantData: {
    type: "upgrade_user_type",
    targetUserType: "premium"
  }
}

// 2. 单次抽卡
{
  productCode: "draw_card_1",
  productName: "单次抽卡",
  productType: "consumable",
  price: 100,         // 1元
  grantData: {
    type: "grant_draw_quota",
    quantity: 1
  }
}

// 3. 10次抽卡礼包
{
  productCode: "draw_card_10",
  productName: "10次抽卡礼包",
  productType: "consumable",
  price: 900,         // 9元（9折优惠）
  originalPrice: 1000,
  grantData: {
    type: "grant_draw_quota",
    quantity: 10
  }
}

// 4. 扩展档案配额
{
  productCode: "quota_expand_50",
  productName: "档案配额+50",
  productType: "quota",
  price: 1900,        // 19元
  grantData: {
    type: "expand_profile_quota",
    quantity: 50
  }
}
```

---

## 支付流程设计

### 完整流程图

```
┌─────────────┐
│   用户端    │
└──────┬──────┘
       │
       │ 1. 选择商品
       ↓
┌─────────────────────────────────────────────┐
│  显示商品列表（从云端获取）                  │
│  - 商品名称、价格、描述                      │
│  - 当前用户等级/配额                         │
└──────┬──────────────────────────────────────┘
       │
       │ 2. 点击购买
       ↓
┌─────────────────────────────────────────────┐
│  确认订单                                    │
│  - 显示商品信息                              │
│  - 显示支付金额                              │
│  - 用户确认                                  │
└──────┬──────────────────────────────────────┘
       │
       │ 3. 调用云函数创建订单
       │    参数：{ productCode }  ← 只传商品编码
       ↓
┌──────────────────────────────────────────────┐
│  云函数：createProductOrder                   │
│  ────────────────────────────────────────    │
│  ① 根据 productCode 查询商品信息              │
│  ② 验证商品状态（是否下架、库存）             │
│  ③ 验证用户是否已购买（会员类商品）           │
│  ④ 从数据库获取价格（防止客户端篡改）         │
│  ⑤ 创建订单记录（状态：NOTPAY）              │
│  ⑥ 调用微信支付API获取 prepay_id             │
│  ⑦ 生成支付参数（签名）                       │
│  ⑧ 返回：orderId, out_trade_no, paymentParams│
└──────┬───────────────────────────────────────┘
       │
       │ 4. 调起微信支付
       │    wx.requestPayment(paymentParams)
       ↓
┌──────────────────────────────────────────────┐
│  微信支付                                     │
│  - 用户输入密码                               │
│  - 完成支付                                   │
└──────┬───────────────────────────────────────┘
       │
       │ 5. 支付成功
       ↓
┌──────────────────────────────────────────────┐
│  微信服务器                                   │
│  - 发送支付结果到回调URL                      │
└──────┬───────────────────────────────────────┘
       │
       │ 6. HTTP触发器接收回调
       ↓
┌──────────────────────────────────────────────┐
│  云函数：handlePaymentNotify (HTTP触发)       │
│  ────────────────────────────────────────    │
│  ① 验证微信签名（防伪造）                     │
│  ② 查询订单记录                              │
│  ③ 验证订单状态（防重复处理）                │
│  ④ 更新订单状态为 SUCCESS                    │
│  ⑤ 根据 grantData 执行发货逻辑：              │
│     - upgrade_user_type: 升级用户等级         │
│     - grant_draw_quota: 增加抽卡次数          │
│     - expand_profile_quota: 扩展档案配额      │
│  ⑥ 记录发货日志                              │
│  ⑦ 返回成功给微信服务器                       │
└──────┬───────────────────────────────────────┘
       │
       │ 7. 返回小程序
       ↓
┌──────────────────────────────────────────────┐
│  用户端                                       │
│  - 显示支付成功                               │
│  - 刷新用户信息                               │
│  - 显示获得的权益                             │
└──────────────────────────────────────────────┘
```

### 关键时序说明

**正常流程时间线**：
```
T0:  用户点击购买
T1:  创建订单（~500ms）
T2:  调起支付（即时）
T3:  用户完成支付（用户操作，1-30秒）
T4:  微信回调云函数（支付后1-3秒）
T5:  发货完成（~200ms）
T6:  小程序显示结果（T3+3秒后查询）
```

**异步处理**：
- 支付回调是异步的，小程序不需要等待
- 小程序在支付成功后等待3秒，然后主动查询用户信息
- 如果3秒后还未发货，提示"处理中，请稍后刷新"

---

## 安全机制设计

### 1. 防止价格篡改 ⭐⭐⭐

**威胁**：客户端传递价格参数，被篡改为0.01元

**防御措施**：

```javascript
// ❌ 错误做法：客户端传递价格
wx.cloud.callFunction({
  name: 'paymentManagement',
  data: {
    productName: '升级会员',
    amount: 9900  // ← 客户端可以修改为 1
  }
});

// ✅ 正确做法：客户端只传商品ID，价格由服务端查询
wx.cloud.callFunction({
  name: 'paymentManagement',
  data: {
    action: 'createProductOrder',
    data: {
      productCode: 'upgrade_premium'  // ← 只传商品编码
    }
  }
});

// 云函数中查询真实价格
const product = await db.collection('payment_products')
  .where({ productCode: data.productCode })
  .get();
  
const realPrice = product.data[0].price;  // ← 服务端维护的真实价格
```

---

### 2. 防止重复发货 ⭐⭐⭐

**威胁**：同一订单被多次处理，导致重复发货

**防御措施**：

```javascript
// 使用订单状态和事务保证
async function handlePaymentSuccess(order) {
  // 1. 检查订单状态
  if (order.status !== 'SUCCESS') {
    console.log('[handlePaymentSuccess] 订单已处理，跳过');
    return;
  }
  
  // 2. 检查是否已发货
  if (order.grantStatus === 'granted') {
    console.log('[handlePaymentSuccess] 订单已发货，跳过');
    return;
  }
  
  // 3. 更新状态（原子操作）
  const updateResult = await db.collection('payment_orders')
    .doc(order._id)
    .update({
      data: {
        grantStatus: 'granted',      // 标记已发货
        grantTime: new Date(),       // 记录发货时间
        updateTime: new Date()
      }
    });
  
  if (updateResult.stats.updated === 0) {
    // 更新失败，可能已被其他请求处理
    console.log('[handlePaymentSuccess] 订单状态更新失败，可能已被处理');
    return;
  }
  
  // 4. 执行发货逻辑
  await grantProduct(order);
  
  // 5. 记录发货日志
  await logGrant(order);
}
```

---

### 3. 防止订单伪造 ⭐⭐⭐

**威胁**：客户端伪造订单号，绕过支付

**防御措施**：

```javascript
// 1. 订单必须关联 openid
// 创建订单时
const orderRecord = {
  openid: wxContext.OPENID,  // 云函数自动获取，无法伪造
  out_trade_no: generateOrderNo(),
  // ...
};

// 2. 查询订单时验证归属
async function queryOrder(wxContext, out_trade_no) {
  const order = await db.collection('payment_orders')
    .where({
      out_trade_no: out_trade_no,
      openid: wxContext.OPENID  // ← 必须是当前用户的订单
    })
    .get();
    
  if (order.data.length === 0) {
    return error('订单不存在或无权访问');
  }
}
```

---

### 4. 防止回调伪造 ⭐⭐⭐

**威胁**：伪造支付回调请求，骗取权益

**防御措施**：

```javascript
// 验证微信支付签名（必须实现）
async function handlePaymentNotify(event) {
  // 1. 获取签名相关信息
  const signature = event.headers['Wechatpay-Signature'];
  const timestamp = event.headers['Wechatpay-Timestamp'];
  const nonce = event.headers['Wechatpay-Nonce'];
  const serial = event.headers['Wechatpay-Serial'];
  
  // 2. 验证签名
  const isValid = verifyWechatPaySignature(
    timestamp,
    nonce,
    event.body,
    signature,
    serial
  );
  
  if (!isValid) {
    console.error('[handlePaymentNotify] 签名验证失败');
    return {
      statusCode: 401,
      body: JSON.stringify({ code: 'FAIL', message: '签名验证失败' })
    };
  }
  
  // 3. 处理业务逻辑
  // ...
}
```

**注意**：当前代码中TODO了签名验证，必须实现！

---

### 5. 防止会员重复购买 ⭐⭐

**威胁**：已是高级用户，再次购买升级商品

**防御措施**：

```javascript
// 创建订单前检查
async function createProductOrder(wxContext, data) {
  const { productCode } = data;
  
  // 查询商品
  const product = await getProduct(productCode);
  
  // 如果是会员类商品，检查用户是否已拥有
  if (product.productType === 'membership') {
    const user = await getUser(wxContext.OPENID);
    
    if (user.userType === product.grantData.targetUserType) {
      return error('您已是' + product.productName + '，无需重复购买');
    }
    
    // 检查是否只能从特定等级升级
    if (!canUpgrade(user.userType, product.grantData.targetUserType)) {
      return error('当前等级无法购买此商品');
    }
  }
  
  // 继续创建订单
  // ...
}
```

---

### 6. HTTP触发器访问控制 ⭐⭐

**威胁**：HTTP触发器URL暴露，被恶意调用

**防御措施**：

```javascript
// 1. 限制来源IP（如果可能）
// 2. 验证请求签名（必须）
// 3. 添加访问频率限制
// 4. 记录所有请求日志

async function handlePaymentNotify(event) {
  // 记录请求来源
  const sourceIP = event.headers['x-real-ip'] || 
                   event.headers['x-forwarded-for'];
  
  console.log('[handlePaymentNotify] 收到回调', {
    ip: sourceIP,
    timestamp: new Date(),
    body: event.body
  });
  
  // 验证签名（防伪造）
  // ...
}
```

---

### 7. 防止并发问题 ⭐

**威胁**：同时发起多个支付请求

**防御措施**：

```javascript
// 客户端防抖
let isCreatingOrder = false;

async function onBuyProduct(productCode) {
  if (isCreatingOrder) {
    wx.showToast({ title: '请勿重复点击', icon: 'none' });
    return;
  }
  
  isCreatingOrder = true;
  
  try {
    await createOrder(productCode);
  } finally {
    isCreatingOrder = false;
  }
}

// 服务端检查未支付订单
async function createProductOrder(wxContext, data) {
  // 检查是否有相同商品的待支付订单
  const pendingOrders = await db.collection('payment_orders')
    .where({
      openid: wxContext.OPENID,
      productCode: data.productCode,
      status: 'NOTPAY',
      createTime: _.gte(new Date(Date.now() - 5 * 60 * 1000)) // 5分钟内
    })
    .get();
  
  if (pendingOrders.data.length > 0) {
    return error('您有待支付的订单，请先完成或取消');
  }
  
  // 创建新订单
  // ...
}
```

---

## 数据库设计

### 1. 商品表 `payment_products`

```javascript
{
  _id: "product_001",
  productCode: "upgrade_premium",       // 商品编码（唯一索引）
  productName: "升级为高级用户",
  productType: "membership",            // membership/consumable/quota
  price: 9900,                          // 价格（分）
  originalPrice: 19900,                 // 原价
  description: "解锁全部功能",
  features: ["无限档案", "免费抽卡"],   // 商品特性
  grantData: {                          // 发货数据
    type: "upgrade_user_type",
    targetUserType: "premium"
  },
  restrictions: {                       // 购买限制
    requireUserType: "normal",          // 需要的用户等级
    maxPurchaseCount: 1,                // 最大购买次数（-1无限）
    validDays: -1                       // 有效天数（-1永久）
  },
  status: "active",                     // active/inactive/soldout
  stock: -1,                            // 库存（-1无限）
  sortOrder: 1,                         // 排序
  imageUrl: "cloud://...",              // 商品图片
  createTime: Date,
  updateTime: Date
}

// 索引
{
  productCode: 1,  // 唯一索引
  status: 1,       // 查询可用商品
  sortOrder: 1     // 排序
}
```

---

### 2. 订单表 `payment_orders`

```javascript
{
  _id: "order_xxx",
  openid: "olKds13ie...",               // 用户openid
  appid: "wxXXXXXX",                    // 小程序appid
  out_trade_no: "ORDER_xxx",            // 商户订单号
  transaction_id: "4200001234...",      // 微信支付订单号
  
  // 商品信息
  productCode: "upgrade_premium",       // 商品编码
  productName: "升级为高级用户",         // 商品名称（快照）
  productType: "membership",            // 商品类型
  grantData: {                          // 发货数据（快照）
    type: "upgrade_user_type",
    targetUserType: "premium"
  },
  
  // 订单信息
  description: "升级为高级用户",         // 订单描述
  amount: 9900,                         // 订单金额（分）
  status: "SUCCESS",                    // 订单状态：NOTPAY/SUCCESS/CLOSED/REFUND
  
  // 发货信息
  grantStatus: "granted",               // 发货状态：pending/granted/failed
  grantTime: Date,                      // 发货时间
  grantResult: {                        // 发货结果
    success: true,
    message: "权益发放成功"
  },
  
  // 支付信息
  prepay_id: "wx0713...",               // 预支付ID
  payTime: Date,                        // 支付时间
  
  // 时间戳
  createTime: Date,                     // 创建时间
  updateTime: Date,                     // 更新时间
  expireTime: Date,                     // 过期时间（创建后2小时）
  
  // 其他
  isActive: true,                       // 是否有效
  clientIP: "127.0.0.1",                // 客户端IP
  remark: ""                            // 备注
}

// 索引
{
  openid: 1,                            // 用户订单查询
  out_trade_no: 1,                      // 订单号查询（唯一）
  transaction_id: 1,                    // 微信订单号查询
  status: 1,                            // 订单状态查询
  createTime: -1                        // 时间排序
}
```

---

### 3. 发货日志表 `payment_grant_logs`

```javascript
{
  _id: "log_xxx",
  orderId: "order_xxx",                 // 关联订单ID
  out_trade_no: "ORDER_xxx",            // 商户订单号
  openid: "olKds13ie...",               // 用户openid
  
  grantType: "upgrade_user_type",       // 发货类型
  grantData: {                          // 发货详情
    targetUserType: "premium"
  },
  
  status: "success",                    // success/failed
  errorMessage: "",                     // 错误信息
  
  beforeSnapshot: {                     // 发货前快照
    userType: "normal",
    profileQuota: 50
  },
  afterSnapshot: {                      // 发货后快照
    userType: "premium",
    profileQuota: -1
  },
  
  grantTime: Date,                      // 发货时间
  executionTime: 125                    // 执行耗时（毫秒）
}

// 索引
{
  orderId: 1,                           // 订单关联查询
  openid: 1,                            // 用户发货记录
  grantTime: -1                         // 时间排序
}
```

---

### 4. 用户表扩展字段 `users`

```javascript
{
  _id: "user_xxx",
  openid: "olKds13ie...",
  
  // 原有字段...
  userType: "premium",
  profileQuota: -1,
  
  // 新增支付相关字段
  payment: {
    totalAmount: 9900,                  // 累计消费金额（分）
    orderCount: 1,                      // 订单数量
    lastPayTime: Date,                  // 最后支付时间
    
    // 抽卡配额（如果实现抽卡功能）
    drawQuota: {
      total: 10,                        // 总次数
      used: 3,                          // 已使用
      remaining: 7,                     // 剩余
      freeDaily: 3,                     // 每日免费次数（高级用户）
      lastDrawDate: "2024-12-07"        // 最后抽卡日期
    },
    
    // 会员信息
    membership: {
      type: "premium",                  // 会员类型
      startTime: Date,                  // 开始时间
      expireTime: null,                 // 到期时间（null表示永久）
      autoRenew: false                  // 是否自动续费
    }
  },
  
  updateTime: Date
}
```

---

## 代码实现方案

### 1. 云函数结构

```
cloudfunctions/paymentManagement_v1_3/
├── index.js                  # 主入口
├── handlers/                 # 业务处理器
│   ├── orderHandler.js       # 订单处理
│   ├── productHandler.js     # 商品处理
│   ├── grantHandler.js       # 发货处理
│   └── notifyHandler.js      # 回调处理
├── services/                 # 服务层
│   ├── wechatPayService.js   # 微信支付服务
│   ├── orderService.js       # 订单服务
│   └── grantService.js       # 发货服务
├── utils/                    # 工具函数
│   ├── security.js           # 安全验证
│   ├── validator.js          # 数据验证
│   └── logger.js             # 日志记录
├── apiclient_key.pem         # 私钥文件
├── package.json
└── README.md
```

---

### 2. 客户端Service实现

```javascript
// miniprogram/services/PaymentService.js
const { BaseService } = require('./BaseService');

class PaymentService extends BaseService {
  /**
   * 获取商品列表
   * @param {string} productType - 商品类型（可选）
   * @returns {Promise<ResponseBean>}
   */
  async getProducts(productType = null) {
    return this.callFunction('paymentManagement_v1_3', {
      action: 'getProducts',
      data: { productType }
    });
  }
  
  /**
   * 创建商品订单
   * @param {string} productCode - 商品编码
   * @returns {Promise<ResponseBean>}
   */
  async createProductOrder(productCode) {
    return this.callFunction('paymentManagement_v1_3', {
      action: 'createProductOrder',
      data: { productCode }  // ← 只传商品编码，不传价格
    });
  }
  
  /**
   * 发起支付流程
   * @param {string} productCode - 商品编码
   * @returns {Promise<Object>} { success, orderNo, message }
   */
  async purchaseProduct(productCode) {
    try {
      // 1. 创建订单
      const orderResponse = await this.createProductOrder(productCode);
      
      if (!orderResponse.success) {
        return {
          success: false,
          message: orderResponse.error
        };
      }
      
      const { out_trade_no, paymentParams } = orderResponse.data;
      
      // 2. 调起支付
      await this.requestPayment(paymentParams);
      
      // 3. 等待回调处理（3秒）
      await this.delay(3000);
      
      // 4. 返回成功
      return {
        success: true,
        orderNo: out_trade_no,
        message: '支付成功'
      };
      
    } catch (error) {
      console.error('[PaymentService] 支付失败', error);
      
      if (error.errMsg && error.errMsg.includes('cancel')) {
        return {
          success: false,
          message: '已取消支付'
        };
      }
      
      return {
        success: false,
        message: error.message || '支付失败'
      };
    }
  }
  
  /**
   * 调起微信支付
   */
  async requestPayment(paymentParams) {
    return new Promise((resolve, reject) => {
      wx.requestPayment({
        ...paymentParams,
        success: resolve,
        fail: reject
      });
    });
  }
  
  /**
   * 查询订单状态
   */
  async queryOrderStatus(out_trade_no) {
    return this.callFunction('paymentManagement_v1_3', {
      action: 'queryOrderStatus',
      data: { out_trade_no }
    });
  }
  
  /**
   * 获取我的订单列表
   */
  async getMyOrders(page = 1, limit = 20) {
    return this.callFunction('paymentManagement_v1_3', {
      action: 'getMyOrders',
      data: { page, limit }
    });
  }
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 导出单例
module.exports = {
  PaymentService,
  paymentService: new PaymentService()
};
```

---

### 3. 客户端Controller实现

```javascript
// miniprogram/controllers/PaymentController.js
const { paymentService } = require('../services/PaymentService');
const { userService } = require('../services/UserService');

class PaymentController {
  constructor(page) {
    this.page = page;
  }
  
  /**
   * 加载商品列表
   */
  async loadProducts(productType = null) {
    this.page.setData({ loading: true });
    
    const response = await paymentService.getProducts(productType);
    
    if (response.success) {
      this.page.setData({
        products: response.data,
        loading: false
      });
    } else {
      this._showError('加载商品失败：' + response.error);
      this.page.setData({ loading: false });
    }
  }
  
  /**
   * 购买商品
   */
  async purchaseProduct(productCode) {
    // 确认购买
    const confirmed = await this._confirm(
      '确认购买',
      '确认要购买此商品吗？'
    );
    
    if (!confirmed) return;
    
    // 显示加载
    wx.showLoading({ title: '处理中...', mask: true });
    
    // 发起支付
    const result = await paymentService.purchaseProduct(productCode);
    
    wx.hideLoading();
    
    if (result.success) {
      // 支付成功
      await this._showSuccess('支付成功！');
      
      // 刷新用户信息
      await userService.getUserInfo();
      
      // 显示获得的权益
      await this._showGrantResult(productCode);
      
      // 刷新页面
      this.page.onRefresh && this.page.onRefresh();
      
    } else {
      // 支付失败
      this._showError(result.message);
    }
  }
  
  /**
   * 显示权益发放结果
   */
  async _showGrantResult(productCode) {
    // 根据商品类型显示不同提示
    // 可以查询用户最新信息，对比变化
    wx.showModal({
      title: '购买成功',
      content: '恭喜您获得新权益！\n\n可在个人中心查看详情',
      showCancel: false,
      confirmText: '好的'
    });
  }
  
  // ... 其他辅助方法
}

module.exports = { PaymentController };
```

---

### 4. 云函数核心逻辑

#### 4.1 创建商品订单

```javascript
// cloudfunctions/paymentManagement_v1_3/handlers/orderHandler.js

/**
 * 创建商品订单
 */
async function createProductOrder(wxContext, data) {
  const { OPENID, APPID } = wxContext;
  const { productCode } = data;
  
  try {
    // 1. 验证参数
    if (!productCode) {
      return error('缺少商品编码');
    }
    
    // 2. 查询商品信息
    const product = await db.collection('payment_products')
      .where({ productCode: productCode, status: 'active' })
      .get();
    
    if (product.data.length === 0) {
      return error('商品不存在或已下架');
    }
    
    const productInfo = product.data[0];
    
    // 3. 检查库存
    if (productInfo.stock !== -1 && productInfo.stock <= 0) {
      return error('商品已售罄');
    }
    
    // 4. 检查用户是否可以购买（会员类商品）
    if (productInfo.productType === 'membership') {
      const canPurchase = await checkMembershipPurchase(OPENID, productInfo);
      if (!canPurchase.success) {
        return error(canPurchase.message);
      }
    }
    
    // 5. 检查是否有待支付订单
    const pendingOrders = await db.collection('payment_orders')
      .where({
        openid: OPENID,
        productCode: productCode,
        status: 'NOTPAY',
        createTime: db.command.gte(new Date(Date.now() - 5 * 60 * 1000))
      })
      .get();
    
    if (pendingOrders.data.length > 0) {
      return error('您有待支付的订单，请先完成或等待过期');
    }
    
    // 6. 生成订单号
    const out_trade_no = `ORDER_${Date.now()}_${generateNonceStr(8)}`;
    
    // 7. 创建订单记录
    const orderRecord = {
      openid: OPENID,
      appid: APPID,
      out_trade_no: out_trade_no,
      
      // 商品信息（快照，防止商品修改影响订单）
      productCode: productInfo.productCode,
      productName: productInfo.productName,
      productType: productInfo.productType,
      grantData: productInfo.grantData,
      
      // 订单信息
      description: productInfo.productName,
      amount: productInfo.price,  // ← 从数据库读取，客户端无法篡改
      status: 'NOTPAY',
      
      // 发货信息
      grantStatus: 'pending',
      
      // 时间
      createTime: new Date(),
      updateTime: new Date(),
      expireTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2小时后过期
      
      isActive: true
    };
    
    const dbResult = await db.collection('payment_orders').add({
      data: orderRecord
    });
    
    console.log('[createProductOrder] 订单创建成功', {
      orderId: dbResult._id,
      out_trade_no,
      productCode,
      amount: productInfo.price
    });
    
    // 8. 调用微信支付统一下单
    const wechatOrderData = {
      appid: APPID,
      mchid: process.env.WECHAT_PAY_MCHID,
      description: productInfo.productName,
      out_trade_no: out_trade_no,
      notify_url: process.env.WECHAT_PAY_NOTIFY_URL,
      amount: productInfo.price,  // ← 真实价格
      openid: OPENID
    };
    
    const wechatResult = await createWechatOrder(wechatOrderData);
    
    if (!wechatResult || !wechatResult.prepay_id) {
      return error('创建支付订单失败');
    }
    
    // 9. 更新订单prepay_id
    await db.collection('payment_orders').doc(dbResult._id).update({
      data: {
        prepay_id: wechatResult.prepay_id,
        updateTime: new Date()
      }
    });
    
    // 10. 生成支付参数
    const paymentParams = generatePaymentParams(
      wechatResult.prepay_id,
      APPID,
      getPrivateKey()
    );
    
    // 11. 返回结果
    return success({
      orderId: dbResult._id,
      out_trade_no: out_trade_no,
      prepay_id: wechatResult.prepay_id,
      paymentParams: paymentParams,
      productInfo: {
        productName: productInfo.productName,
        amount: productInfo.price
      }
    }, '订单创建成功');
    
  } catch (err) {
    console.error('[createProductOrder] 创建订单失败:', err);
    return error('创建订单失败: ' + err.message);
  }
}

/**
 * 检查会员商品是否可以购买
 */
async function checkMembershipPurchase(openid, product) {
  const user = await db.collection('users')
    .where({ openid: openid })
    .get();
  
  if (user.data.length === 0) {
    return { success: false, message: '用户不存在' };
  }
  
  const userInfo = user.data[0];
  const targetUserType = product.grantData.targetUserType;
  
  // 检查是否已经是目标等级
  if (userInfo.userType === targetUserType) {
    return { success: false, message: '您已经是' + product.productName };
  }
  
  // 检查升级路径是否合法
  const upgradePathMap = {
    'guest': ['normal', 'premium'],
    'normal': ['premium']
  };
  
  const allowedTypes = upgradePathMap[userInfo.userType] || [];
  
  if (!allowedTypes.includes(targetUserType)) {
    return { success: false, message: '当前等级无法购买此商品' };
  }
  
  return { success: true };
}
```

#### 4.2 发货处理

```javascript
// cloudfunctions/paymentManagement_v1_3/handlers/grantHandler.js

/**
 * 执行发货逻辑
 */
async function grantProduct(order) {
  const { grantData, openid, _id: orderId } = order;
  
  console.log('[grantProduct] 开始发货', {
    orderId,
    grantType: grantData.type
  });
  
  const startTime = Date.now();
  let beforeSnapshot = {};
  let afterSnapshot = {};
  let grantResult = { success: false, message: '' };
  
  try {
    // 获取用户信息（发货前快照）
    const user = await getUser(openid);
    beforeSnapshot = {
      userType: user.userType,
      profileQuota: user.profileQuota,
      drawQuota: user.payment?.drawQuota?.remaining || 0
    };
    
    // 根据发货类型执行不同逻辑
    switch (grantData.type) {
      case 'upgrade_user_type':
        grantResult = await grantUpgradeUserType(openid, grantData);
        break;
        
      case 'grant_draw_quota':
        grantResult = await grantDrawQuota(openid, grantData);
        break;
        
      case 'expand_profile_quota':
        grantResult = await grantProfileQuota(openid, grantData);
        break;
        
      default:
        grantResult = {
          success: false,
          message: '未知的发货类型: ' + grantData.type
        };
    }
    
    // 获取用户信息（发货后快照）
    const userAfter = await getUser(openid);
    afterSnapshot = {
      userType: userAfter.userType,
      profileQuota: userAfter.profileQuota,
      drawQuota: userAfter.payment?.drawQuota?.remaining || 0
    };
    
  } catch (error) {
    console.error('[grantProduct] 发货失败', error);
    grantResult = {
      success: false,
      message: error.message
    };
  }
  
  const executionTime = Date.now() - startTime;
  
  // 记录发货日志
  await db.collection('payment_grant_logs').add({
    data: {
      orderId: orderId,
      out_trade_no: order.out_trade_no,
      openid: openid,
      grantType: grantData.type,
      grantData: grantData,
      status: grantResult.success ? 'success' : 'failed',
      errorMessage: grantResult.message || '',
      beforeSnapshot: beforeSnapshot,
      afterSnapshot: afterSnapshot,
      grantTime: new Date(),
      executionTime: executionTime
    }
  });
  
  console.log('[grantProduct] 发货完成', {
    orderId,
    success: grantResult.success,
    executionTime
  });
  
  return grantResult;
}

/**
 * 发货：升级用户等级
 */
async function grantUpgradeUserType(openid, grantData) {
  const { targetUserType } = grantData;
  
  const updateResult = await db.collection('users')
    .where({ openid: openid })
    .update({
      data: {
        userType: targetUserType,
        upgradeTime: new Date(),
        updateTime: new Date(),
        'payment.membership': {
          type: targetUserType,
          startTime: new Date(),
          expireTime: null  // 永久
        }
      }
    });
  
  if (updateResult.stats.updated > 0) {
    return { success: true, message: '用户等级升级成功' };
  } else {
    return { success: false, message: '用户等级升级失败' };
  }
}

/**
 * 发货：赠送抽卡次数
 */
async function grantDrawQuota(openid, grantData) {
  const { quantity } = grantData;
  
  const user = await getUser(openid);
  const currentQuota = user.payment?.drawQuota?.remaining || 0;
  const newQuota = currentQuota + quantity;
  
  const updateResult = await db.collection('users')
    .where({ openid: openid })
    .update({
      data: {
        'payment.drawQuota.total': db.command.inc(quantity),
        'payment.drawQuota.remaining': newQuota,
        updateTime: new Date()
      }
    });
  
  if (updateResult.stats.updated > 0) {
    return { success: true, message: `成功赠送${quantity}次抽卡` };
  } else {
    return { success: false, message: '赠送抽卡次数失败' };
  }
}

/**
 * 发货：扩展档案配额
 */
async function grantProfileQuota(openid, grantData) {
  const { quantity } = grantData;
  
  const updateResult = await db.collection('users')
    .where({ openid: openid })
    .update({
      data: {
        profileQuota: db.command.inc(quantity),
        updateTime: new Date()
      }
    });
  
  if (updateResult.stats.updated > 0) {
    return { success: true, message: `成功扩展${quantity}个档案配额` };
  } else {
    return { success: false, message: '扩展档案配额失败' };
  }
}
```

---

## 异常处理机制

### 1. 订单超时处理

```javascript
// 定时任务：每小时执行一次，关闭超时订单
async function closeExpiredOrders() {
  const now = new Date();
  
  const expiredOrders = await db.collection('payment_orders')
    .where({
      status: 'NOTPAY',
      expireTime: db.command.lt(now)
    })
    .get();
  
  for (const order of expiredOrders.data) {
    await db.collection('payment_orders')
      .doc(order._id)
      .update({
        data: {
          status: 'CLOSED',
          updateTime: new Date()
        }
      });
    
    console.log('[closeExpiredOrders] 订单已关闭', order.out_trade_no);
  }
}
```

### 2. 发货失败重试

```javascript
// 发货失败时的重试机制
async function retryGrant(order, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await grantProduct(order);
      
      if (result.success) {
        return result;
      }
      
      // 失败，等待后重试
      if (i < maxRetries - 1) {
        await delay(1000 * (i + 1));
      }
      
    } catch (error) {
      console.error(`[retryGrant] 第${i + 1}次重试失败`, error);
      if (i === maxRetries - 1) {
        throw error;
      }
    }
  }
  
  throw new Error('发货重试失败');
}
```

### 3. 支付回调幂等性

```javascript
// 确保同一订单只处理一次
async function handlePaymentNotify(event) {
  const { out_trade_no, trade_state } = parseNotifyData(event.body);
  
  // 使用数据库事务确保原子性
  const order = await db.collection('payment_orders')
    .where({ out_trade_no: out_trade_no })
    .get();
  
  if (order.data.length === 0) {
    return error('订单不存在');
  }
  
  const orderData = order.data[0];
  
  // 检查订单状态
  if (orderData.grantStatus === 'granted') {
    console.log('[handlePaymentNotify] 订单已发货，跳过');
    return success('订单已处理');
  }
  
  // 更新订单状态（原子操作）
  const updateResult = await db.collection('payment_orders')
    .doc(orderData._id)
    .update({
      data: {
        status: trade_state,
        transaction_id: parseNotifyData(event.body).transaction_id,
        grantStatus: 'granted',  // 标记已发货
        payTime: new Date(),
        updateTime: new Date()
      }
    });
  
  // 如果更新失败，说明被其他请求处理了
  if (updateResult.stats.updated === 0) {
    console.log('[handlePaymentNotify] 订单已被处理');
    return success('订单已处理');
  }
  
  // 执行发货
  if (trade_state === 'SUCCESS') {
    await grantProduct(orderData);
  }
  
  return success('处理成功');
}
```

---

## 测试方案

### 1. 功能测试清单

| 测试项 | 测试步骤 | 预期结果 |
|--------|---------|----------|
| 商品列表 | 打开商品页面 | 显示所有上架商品 |
| 价格显示 | 查看商品价格 | 价格正确且格式化 |
| 创建订单 | 点击购买按钮 | 订单创建成功 |
| 支付流程 | 完成支付 | 支付成功，跳转 |
| 权益发放 | 支付成功后 | 用户等级/配额更新 |
| 订单查询 | 查看我的订单 | 显示订单列表 |
| 重复购买 | 再次购买会员 | 提示已购买 |
| 取消支付 | 支付时取消 | 返回正确提示 |

### 2. 安全测试清单

| 测试项 | 测试方法 | 预期结果 |
|--------|---------|----------|
| 价格篡改 | 修改客户端代码传递金额0.01 | 使用服务端价格，无法篡改 |
| 订单伪造 | 伪造订单号查询 | 验证openid，查询失败 |
| 重复发货 | 模拟多次回调 | 只发货一次 |
| 回调伪造 | 发送伪造的回调请求 | 签名验证失败 |
| 并发支付 | 快速点击多次购买 | 只创建一个订单 |

### 3. 测试脚本

```javascript
// test/payment.test.js

// 测试1：正常购买流程
async function testNormalPurchase() {
  console.log('=== 测试：正常购买流程 ===');
  
  const result = await paymentService.purchaseProduct('upgrade_premium');
  console.assert(result.success === true, '支付应该成功');
  
  const user = await userService.getUserInfo();
  console.assert(user.data.userType === 'premium', '用户等级应该升级');
}

// 测试2：重复购买检测
async function testDuplicatePurchase() {
  console.log('=== 测试：重复购买检测 ===');
  
  const result = await paymentService.purchaseProduct('upgrade_premium');
  console.assert(result.success === false, '重复购买应该失败');
  console.assert(result.message.includes('已'), '应该提示已购买');
}

// 测试3：订单查询
async function testOrderQuery() {
  console.log('=== 测试：订单查询 ===');
  
  const orders = await paymentService.getMyOrders();
  console.assert(orders.success === true, '查询应该成功');
  console.assert(orders.data.length > 0, '应该有订单记录');
}
```

---

## 附录

### A. 支付状态流转图

```
订单创建
   ↓
NOTPAY (未支付)
   ├─→ 用户支付成功 → SUCCESS (支付成功) → 发货
   ├─→ 用户取消支付 → NOTPAY (保持)
   ├─→ 订单超时 → CLOSED (已关闭)
   └─→ 申请退款 → REFUND (已退款)
```

### B. 错误码定义

| 错误码 | 说明 | 处理方式 |
|--------|------|---------|
| `PRODUCT_NOT_FOUND` | 商品不存在 | 提示并返回商品列表 |
| `PRODUCT_SOLD_OUT` | 商品已售罄 | 提示并刷新列表 |
| `ALREADY_PURCHASED` | 已购买 | 提示用户 |
| `INSUFFICIENT_LEVEL` | 等级不足 | 提示升级路径 |
| `PENDING_ORDER_EXISTS` | 有待支付订单 | 提示完成或等待 |
| `PAYMENT_FAILED` | 支付失败 | 提示重试 |
| `GRANT_FAILED` | 发货失败 | 联系客服 |

### C. 常见问题FAQ

**Q: 支付成功但权益未到账？**  
A: 通常1-3秒内到账。如超过5分钟未到账，请联系客服并提供订单号。

**Q: 支付时显示"商品已购买"？**  
A: 会员类商品不可重复购买。可在"我的订单"中查看购买记录。

**Q: 如何申请退款？**  
A: 联系客服，提供订单号。根据退款政策审核后处理。

**Q: 订单状态一直是"处理中"？**  
A: 可能是网络延迟。等待5分钟后刷新，如仍未到账请联系客服。

---

## 总结

本支付系统设计遵循以下核心原则：

1. ✅ **安全第一**：所有关键数据服务端维护，客户端不可信
2. ✅ **简洁易用**：用户只需点击购买，系统自动处理
3. ✅ **可扩展性**：商品配置化，易于增加新商品
4. ✅ **可维护性**：日志完整，问题可追溯
5. ✅ **用户体验**：流程顺畅，提示清晰

通过本方案，可以安全、可靠地实现小程序内购功能，支持会员升级、虚拟商品售卖等多种业务场景。

---

**文档版本**：v1.0  
**最后更新**：2024年12月7日  
**维护者**：开发团队

