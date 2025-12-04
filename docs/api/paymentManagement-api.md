# 支付管理云函数API文档

## 接口概述
支付管理云函数提供微信小程序支付功能，包括创建支付订单、查询订单状态、处理支付回调等。

## 接口地址
`paymentManagement` 云函数

## 请求方式
POST（云函数调用）

## 功能说明
支付管理云函数采用action模式，根据不同的action参数执行不同的操作：
- createPaymentOrder: 创建支付订单
- queryOrderStatus: 查询订单状态
- handlePaymentNotify: 处理支付回调（HTTP触发器）

## 环境变量配置

在云函数环境变量中需要配置以下参数：

| 变量名 | 说明 | 示例 |
|-----|---|---|
| WECHAT_PAY_MCHID | 微信支付商户号 | 1234567890 |
| WECHAT_PAY_API_KEY | 微信支付API密钥 | your_api_key_here |
| WECHAT_PAY_NOTIFY_URL | 支付回调通知地址（可选） | https://your-domain.com/payment/notify |

## API列表

### 1. 创建支付订单

#### 接口名称
创建支付订单，调用微信支付统一下单接口获取prepay_id，并生成小程序支付参数。

#### 请求参数
```javascript
{
  "action": "createPaymentOrder",
  "data": {
    "description": "升级为高级用户",
    "amount": 1000,
    "orderType": "upgrade_premium",
    "orderData": {
      "targetUserType": "premium"
    }
  }
}
```

#### 参数说明
| 参数名 | 类型 | 必填 | 说明 |
|-----|---|---|---|
| action | string | 是 | 操作类型，固定为"createPaymentOrder" |
| data | object | 是 | 订单数据对象 |
| data.description | string | 是 | 商品描述，最多127个字符 |
| data.amount | number | 是 | 订单金额，单位：分，必须大于0 |
| data.orderType | string | 否 | 订单类型，用于业务区分，默认"default" |
| data.orderData | object | 否 | 订单附加数据，用于存储业务相关信息 |

#### 成功响应
```json
{
  "success": true,
  "message": "订单创建成功",
  "data": {
    "orderId": "order_60a1b2c3d4e5f6789abcdef0",
    "out_trade_no": "ORDER_1694678400000_abc12345",
    "prepay_id": "wx1234567890abcdef1234567890",
    "paymentParams": {
      "timeStamp": "1694678400",
      "nonceStr": "abc123def456",
      "package": "prepay_id=wx1234567890abcdef1234567890",
      "signType": "RSA",
      "paySign": "签名值"
    }
  }
}
```

#### 返回字段说明
| 字段名 | 类型 | 说明 |
|-----|---|---|
| success | boolean | 操作是否成功 |
| message | string | 操作结果消息 |
| data.orderId | string | 订单ID（数据库_id） |
| data.out_trade_no | string | 商户订单号 |
| data.prepay_id | string | 预支付交易会话ID |
| data.paymentParams | object | 小程序支付参数，用于调起支付 |
| data.paymentParams.timeStamp | string | 时间戳 |
| data.paymentParams.nonceStr | string | 随机字符串 |
| data.paymentParams.package | string | 统一下单接口返回的prepay_id参数值 |
| data.paymentParams.signType | string | 签名类型，固定为"RSA" |
| data.paymentParams.paySign | string | 签名值 |

### 2. 查询订单状态

#### 接口名称
查询订单支付状态，支持通过商户订单号或订单ID查询。

#### 请求参数
```javascript
{
  "action": "queryOrderStatus",
  "data": {
    "out_trade_no": "ORDER_1694678400000_abc12345"
  }
}
```

或者

```javascript
{
  "action": "queryOrderStatus",
  "data": {
    "orderId": "order_60a1b2c3d4e5f6789abcdef0"
  }
}
```

#### 参数说明
| 参数名 | 类型 | 必填 | 说明 |
|-----|---|---|---|
| action | string | 是 | 操作类型，固定为"queryOrderStatus" |
| data | object | 是 | 查询参数对象 |
| data.out_trade_no | string | 否 | 商户订单号（与orderId二选一） |
| data.orderId | string | 否 | 订单ID（与out_trade_no二选一） |

#### 成功响应
```json
{
  "success": true,
  "message": "查询成功",
  "data": {
    "orderId": "order_60a1b2c3d4e5f6789abcdef0",
    "out_trade_no": "ORDER_1694678400000_abc12345",
    "status": "SUCCESS",
    "amount": 1000,
    "description": "升级为高级用户",
    "createTime": "2023-09-14T08:00:00.000Z",
    "updateTime": "2023-09-14T08:00:10.000Z",
    "payTime": "2023-09-14T08:00:10.000Z"
  }
}
```

#### 返回字段说明
| 字段名 | 类型 | 说明 |
|-----|---|---|
| success | boolean | 是否成功 |
| message | string | 返回消息 |
| data.orderId | string | 订单ID |
| data.out_trade_no | string | 商户订单号 |
| data.status | string | 订单状态（NOTPAY/SUCCESS/CLOSED/REFUND等） |
| data.amount | number | 订单金额（分） |
| data.description | string | 商品描述 |
| data.createTime | string | 订单创建时间 |
| data.updateTime | string | 订单更新时间 |
| data.payTime | string | 支付时间（如果已支付） |

### 3. 处理支付回调

#### 接口名称
处理微信支付回调通知，更新订单状态并执行相应的业务逻辑。

#### 请求参数
此接口通过HTTP触发器接收微信支付的POST请求，请求体包含支付回调数据。

#### 回调数据格式
```json
{
  "out_trade_no": "ORDER_1694678400000_abc12345",
  "transaction_id": "4200001234567890123456789",
  "trade_state": "SUCCESS",
  "amount": {
    "total": 1000,
    "currency": "CNY"
  }
}
```

#### 成功响应
```json
{
  "code": "SUCCESS",
  "message": "成功"
}
```

#### 错误响应
```json
{
  "code": "FAIL",
  "message": "错误信息"
}
```

## 订单状态说明

| 状态值 | 说明 |
|-----|---|
| NOTPAY | 未支付 |
| SUCCESS | 支付成功 |
| CLOSED | 已关闭 |
| REFUND | 已退款 |
| REVOKED | 已撤销 |
| USERPAYING | 用户支付中 |
| PAYERROR | 支付失败 |

## 使用示例

### JavaScript调用示例

#### 创建支付订单并调起支付
```javascript
const { paymentService } = require('./services/PaymentService');

// 创建支付订单
const createResult = await paymentService.createPaymentOrder({
  description: '升级为高级用户',
  amount: 1000, // 10元
  orderType: 'upgrade_premium',
  orderData: {
    targetUserType: 'premium'
  }
});

if (createResult.success) {
  const paymentBean = createResult.data;
  
  // 调起支付
  const payResult = await paymentService.requestPayment(paymentBean);
  
  if (payResult.success) {
    // 支付调起成功，延迟查询订单状态
    setTimeout(async () => {
      const queryResult = await paymentService.queryOrderStatus(
        paymentBean.out_trade_no
      );
      console.log('订单状态:', queryResult.data.status);
    }, 2000);
  }
}
```

#### 使用完整流程方法
```javascript
const { paymentService } = require('./services/PaymentService');

// 创建订单并调起支付（一步完成）
const result = await paymentService.createOrderAndPay({
  description: '升级为高级用户',
  amount: 1000,
  orderType: 'upgrade_premium',
  orderData: {
    targetUserType: 'premium'
  }
});

if (result.success) {
  console.log('支付调起成功');
} else {
  console.error('支付失败:', result.error);
}
```

#### 查询订单状态
```javascript
const { paymentService } = require('./services/PaymentService');

// 通过商户订单号查询
const result = await paymentService.queryOrderStatus(
  'ORDER_1694678400000_abc12345'
);

if (result.success) {
  const order = result.data;
  console.log('订单状态:', order.status);
  console.log('订单金额:', order.getFormattedAmount());
}
```

#### 直接调用云函数
```javascript
// 创建支付订单
const createResult = await wx.cloud.callFunction({
  name: 'paymentManagement',
  data: {
    action: 'createPaymentOrder',
    data: {
      description: '升级为高级用户',
      amount: 1000,
      orderType: 'upgrade_premium'
    }
  }
});

// 查询订单状态
const queryResult = await wx.cloud.callFunction({
  name: 'paymentManagement',
  data: {
    action: 'queryOrderStatus',
    data: {
      out_trade_no: 'ORDER_1694678400000_abc12345'
    }
  }
});
```

## 支付流程说明

### 完整支付流程

1. **创建订单**：调用`createPaymentOrder`创建支付订单，获取`prepay_id`和支付参数
2. **调起支付**：使用`wx.requestPayment`调起微信支付
3. **查询订单**：支付完成后调用`queryOrderStatus`确认支付结果
4. **处理回调**：微信支付会发送回调通知到配置的`notify_url`，更新订单状态

### 支付流程图

```
用户发起支付
    ↓
创建支付订单（createPaymentOrder）
    ↓
获取prepay_id和支付参数
    ↓
调起微信支付（wx.requestPayment）
    ↓
用户完成支付/取消支付
    ↓
查询订单状态（queryOrderStatus）
    ↓
根据订单状态处理业务逻辑
```

## 注意事项

1. **环境变量配置**：必须配置`WECHAT_PAY_MCHID`和`WECHAT_PAY_API_KEY`，否则无法创建订单
2. **金额单位**：订单金额单位为"分"，例如10元应传入1000
3. **订单号唯一性**：商户订单号（out_trade_no）必须唯一，系统会自动生成
4. **prepay_id有效期**：prepay_id有效期为2小时，超过2小时需要重新创建订单
5. **支付回调**：需要配置HTTP触发器接收支付回调，并验证回调签名
6. **订单状态查询**：支付完成后建议查询订单状态确认支付结果，不要仅依赖支付回调
7. **签名算法**：微信支付V3使用RSA-SHA256签名，需要配置商户私钥
8. **错误处理**：所有支付相关操作都应该有完善的错误处理和用户提示
9. **订单超时**：订单默认7天有效，可以通过`time_expire`参数设置自定义过期时间
10. **业务逻辑**：支付回调成功后，需要根据`orderType`执行相应的业务逻辑（如升级用户类型）

## 相关文件

### 云函数端
- `/cloudfunctions/paymentManagement/index.js` - 云函数实现
- `/cloudfunctions/paymentManagement/package.json` - 依赖配置

### 客户端
- `/miniprogram/services/PaymentService.js` - 支付服务类
- `/miniprogram/beans/PaymentBean.js` - 支付数据Bean

## 版本信息

- 当前版本：v1.0
- 客户端版本：1.3.0
- 云函数名称：`paymentManagement`

