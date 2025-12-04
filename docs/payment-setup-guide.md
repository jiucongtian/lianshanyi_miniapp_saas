# 微信支付功能配置指南

## 概述

本文档说明如何配置和使用微信小程序支付功能。

## 前置条件

1. **微信小程序认证**：小程序必须完成认证
2. **商户号申请**：需要申请微信支付商户号
3. **权限开通**：在商户平台开通小程序支付权限
4. **APPID绑定**：完成商户号与小程序APPID的授权绑定

详细流程请参考：
- [微信支付快速开始](https://pay.weixin.qq.com/doc/v3/merchant/4015459512)
- [微信支付开发指引](https://pay.weixin.qq.com/doc/v3/merchant/4012791911)

## 云函数环境变量配置

在云函数`paymentManagement`的环境变量中配置以下参数：

### 必需配置

| 变量名 | 说明 | 获取方式 |
|-----|---|---|
| WECHAT_PAY_MCHID | 微信支付商户号 | 商户平台-账户中心-商户信息 |
| WECHAT_PAY_API_KEY | 微信支付API密钥 | 商户平台-账户中心-API安全-设置API密钥 |

### 可选配置

| 变量名 | 说明 | 默认值 |
|-----|---|---|
| WECHAT_PAY_NOTIFY_URL | 支付回调通知地址 | 自动生成 |

### 配置步骤

#### 方法一：通过微信开发者工具配置

1. 打开微信开发者工具
2. 点击"云开发" → "云函数"
3. 选择`paymentManagement`云函数
4. 点击"版本管理" → "环境变量"
5. 添加环境变量：
   - `WECHAT_PAY_MCHID`: 你的商户号
   - `WECHAT_PAY_API_KEY`: 你的API密钥

#### 方法二：通过云开发控制台配置

1. 登录[云开发控制台](https://console.cloud.tencent.com/tcb)
2. 选择对应的云环境
3. 进入"云函数" → 选择`paymentManagement`
4. 点击"配置" → "环境变量"
5. 添加环境变量

## 微信支付API密钥设置

### 获取API密钥

1. 登录[微信支付商户平台](https://pay.weixin.qq.com/)
2. 进入"账户中心" → "API安全"
3. 点击"设置API密钥"
4. 设置32位密钥（建议使用随机生成器生成）
5. 保存密钥（**请妥善保管，一旦设置无法查看**）

### 注意事项

- API密钥必须妥善保管，不要泄露
- 建议定期更换API密钥
- 密钥丢失需要重新设置，可能影响现有订单

## 支付回调配置

### 回调地址配置

支付回调地址需要配置为HTTP触发器，接收微信支付的POST请求。

#### 方式一：使用云函数HTTP触发器

1. 在云函数`paymentManagement`中配置HTTP触发器
2. 触发器路径：`/payment/notify`
3. 请求方法：POST
4. 在商户平台配置回调地址：`https://your-env-id.tcloudbaseapp.com/payment/notify`

#### 方式二：使用自定义域名

1. 配置自定义域名
2. 在商户平台配置回调地址：`https://your-domain.com/payment/notify`

### 回调验证

支付回调需要验证签名，确保请求来自微信支付。云函数中已实现基础验证逻辑，但需要：

1. **配置平台证书**：下载微信支付平台证书并配置到云函数
2. **验证签名**：使用平台证书验证回调请求的签名
3. **解密数据**：如果使用了数据加密，需要解密回调数据

详细实现请参考[微信支付回调文档](https://pay.weixin.qq.com/docs/merchant/apis/jsapi-payment/payment-callback.html)

## 数据库集合配置

支付功能需要创建以下数据库集合：

### payment_orders 集合

用于存储支付订单信息。

#### 字段说明

| 字段名 | 类型 | 说明 |
|-----|---|---|
| _id | string | 订单ID（自动生成） |
| openid | string | 用户openid |
| appid | string | 小程序appid |
| out_trade_no | string | 商户订单号（唯一） |
| prepay_id | string | 预支付交易会话ID |
| description | string | 商品描述 |
| amount | number | 订单金额（分） |
| orderType | string | 订单类型 |
| orderData | object | 订单附加数据 |
| status | string | 订单状态 |
| transaction_id | string | 微信支付交易号 |
| createTime | date | 创建时间 |
| updateTime | date | 更新时间 |
| payTime | date | 支付时间 |
| isActive | boolean | 是否有效（默认true） |

#### 索引配置

建议创建以下索引：

1. **out_trade_no索引**（唯一索引）
   - 字段：`out_trade_no`
   - 唯一：是

2. **openid + status索引**（复合索引）
   - 字段：`openid`, `status`
   - 用于查询用户的订单列表

3. **createTime索引**
   - 字段：`createTime`
   - 用于按时间排序

### 创建集合

在云开发控制台创建`payment_orders`集合，并配置上述索引。

## 使用示例

### 基础使用

```javascript
const { paymentService } = require('./services/PaymentService');

// 创建支付订单
const result = await paymentService.createPaymentOrder({
  description: '升级为高级用户',
  amount: 1000, // 10元
  orderType: 'upgrade_premium',
  orderData: {
    targetUserType: 'premium'
  }
});

if (result.success) {
  const paymentBean = result.data;
  
  // 调起支付
  const payResult = await paymentService.requestPayment(paymentBean);
  
  if (payResult.success) {
    // 支付调起成功，查询订单状态
    setTimeout(async () => {
      const queryResult = await paymentService.queryOrderStatus(
        paymentBean.out_trade_no
      );
      
      if (queryResult.success && queryResult.data.isPaid()) {
        // 支付成功，执行业务逻辑
        console.log('支付成功！');
      }
    }, 2000);
  }
}
```

### 完整流程

```javascript
const { paymentService } = require('./services/PaymentService');

// 使用完整流程方法（推荐）
const result = await paymentService.createOrderAndPay({
  description: '升级为高级用户',
  amount: 1000,
  orderType: 'upgrade_premium',
  orderData: {
    targetUserType: 'premium'
  }
});

if (result.success) {
  wx.showToast({
    title: '支付调起成功',
    icon: 'success'
  });
  
  // 延迟查询订单状态
  setTimeout(async () => {
    // 这里需要从result中获取订单号
    // 实际使用时应该保存订单号
  }, 2000);
} else {
  wx.showToast({
    title: result.error || '支付失败',
    icon: 'none'
  });
}
```

## 注意事项

### 1. 金额单位

订单金额单位为"分"，不是"元"。

```javascript
// ❌ 错误
amount: 10  // 这表示10分，即0.1元

// ✅ 正确
amount: 1000  // 这表示1000分，即10元
```

### 2. 订单号唯一性

商户订单号（out_trade_no）必须全局唯一，系统会自动生成，格式为：
```
ORDER_{timestamp}_{random}
```

### 3. prepay_id有效期

prepay_id有效期为2小时，超过2小时需要重新创建订单。

### 4. 支付回调处理

- 支付回调可能延迟，不要仅依赖回调
- 支付完成后建议主动查询订单状态
- 回调需要验证签名，确保安全性

### 5. 错误处理

所有支付相关操作都应该有完善的错误处理：

```javascript
try {
  const result = await paymentService.createPaymentOrder({...});
  
  if (!result.success) {
    // 处理错误
    if (result.code === -3) {
      // 参数错误
      wx.showToast({ title: '订单参数错误', icon: 'none' });
    } else {
      // 其他错误
      wx.showToast({ title: result.error, icon: 'none' });
    }
    return;
  }
  
  // 处理成功逻辑
} catch (error) {
  console.error('支付异常:', error);
  wx.showToast({ title: '网络错误，请重试', icon: 'none' });
}
```

### 6. 业务逻辑处理

支付成功后，需要根据`orderType`执行相应的业务逻辑：

```javascript
// 在支付回调处理函数中
if (order.status === 'SUCCESS') {
  switch (order.orderType) {
    case 'upgrade_premium':
      // 升级用户类型
      await upgradeUserToPremium(order.openid);
      break;
    case 'recharge_quota':
      // 充值配额
      await rechargeUserQuota(order.openid, order.orderData.quota);
      break;
    // 其他业务逻辑...
  }
}
```

## 测试建议

### 1. 使用微信支付沙箱环境

在开发阶段，建议使用微信支付沙箱环境进行测试。

### 2. 测试场景

- 正常支付流程
- 用户取消支付
- 支付超时
- 网络异常
- 订单重复创建

### 3. 日志记录

建议记录关键操作日志：

```javascript
console.log('[Payment] 创建订单', {
  out_trade_no: order.out_trade_no,
  amount: order.amount,
  orderType: order.orderType
});
```

## 常见问题

### Q1: 如何获取商户号？

A: 登录[微信支付商户平台](https://pay.weixin.qq.com/)，在"账户中心" → "商户信息"中查看。

### Q2: API密钥在哪里设置？

A: 登录[微信支付商户平台](https://pay.weixin.qq.com/)，进入"账户中心" → "API安全" → "设置API密钥"。

### Q3: 支付回调收不到怎么办？

A: 
1. 检查回调地址是否正确配置
2. 检查HTTP触发器是否正常
3. 检查回调签名验证是否通过
4. 查看云函数日志排查问题

### Q4: 如何测试支付功能？

A: 使用微信支付沙箱环境，或使用真实的测试订单（金额设置为0.01元）。

## 相关文档

- [微信支付API文档](https://pay.weixin.qq.com/docs/merchant/apis/jsapi-payment/direct-jsapi.html)
- [支付回调文档](https://pay.weixin.qq.com/docs/merchant/apis/jsapi-payment/payment-callback.html)
- [订单查询文档](https://pay.weixin.qq.com/docs/merchant/apis/china-transaction-query/query-by-out-trade-no.html)
- [项目支付API文档](../api/paymentManagement-api.md)

