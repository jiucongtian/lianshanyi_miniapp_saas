# 支付订单表 (payment_orders)

## 数据表概述
存储微信小程序支付订单信息，包括订单基本信息、支付状态、交易信息等。用于管理用户的支付流程和订单状态。

## 数据表名称
`payment_orders`

## 字段定义

| 字段名 | 类型 | 必填 | 索引 | 说明 |
|--------|------|------|------|------|
| _id | string | 是 | 主键 | 系统自动生成的文档ID |
| openid | string | 是 | 索引 | 微信用户openid，用于关联用户 |
| appid | string | 是 | - | 小程序appid |
| out_trade_no | string | 是 | 唯一索引 | 商户订单号，格式：ORDER_{timestamp}_{random} |
| prepay_id | string | 否 | - | 预支付交易会话ID，微信支付统一下单接口返回 |
| description | string | 是 | - | 商品描述，最多127个字符 |
| amount | number | 是 | - | 订单金额，单位：分 |
| orderType | string | 否 | 索引 | 订单类型，用于业务区分（如：upgrade_premium、function_payment等），默认"default" |
| orderData | object | 否 | - | 订单附加数据，用于存储业务相关信息（如：targetUserType、quota等） |
| functionCode | string | 否 | 索引 | 功能编码（功能付费订单专用，如：wisdom_insight、ai_report） |
| functionName | string | 否 | - | 功能名称（功能付费订单专用） |
| grantData | object | 否 | - | 权益发放配置（快照商品信息，用于支付成功后发放权益） |
| grantData.type | string | 否 | - | 发货类型（如：grant_function_quota） |
| grantData.functionCode | string | 否 | - | 功能编码 |
| grantData.quantity | number | 否 | - | 发放次数 |
| grantInfo | object | 否 | - | 权益发放信息（记录发放状态和结果） |
| grantInfo.status | string | 否 | - | 发放状态：pending（待发放）/ granted（已发放）/ failed（发放失败） |
| grantInfo.grantTime | date | 否 | - | 权益发放时间 |
| grantInfo.grantResult | object | 否 | - | 发放结果对象 |
| grantInfo.grantResult.success | boolean | 否 | - | 发放是否成功 |
| grantInfo.grantResult.message | string | 否 | - | 发放结果消息 |
| grantInfo.errorMessage | string | 否 | - | 发放失败时的错误信息 |
| status | string | 是 | 索引 | 订单状态（NOTPAY/SUCCESS/CLOSED/REFUND/REVOKED/USERPAYING/PAYERROR），默认"NOTPAY" |
| transaction_id | string | 否 | - | 微信支付交易号，支付成功后由微信支付回调返回 |
| createTime | date | 是 | 索引 | 订单创建时间 |
| updateTime | date | 是 | - | 订单最后更新时间 |
| payTime | date | 否 | - | 支付成功时间 |
| isActive | boolean | 否 | - | 订单是否有效，默认true，用于软删除 |

## 数据示例

```json
{
  "_id": "order_60a1b2c3d4e5f6789abcdef0",
  "openid": "oABCD1234567890abcdef1234567890ab",
  "appid": "wx1234567890abcdef",
  "out_trade_no": "ORDER_1694678400000_abc12345",
  "prepay_id": "wx1234567890abcdef1234567890",
  "description": "升级为高级用户",
  "amount": 1000,
  "orderType": "upgrade_premium",
  "orderData": {
    "targetUserType": "premium"
  },
  "status": "SUCCESS",
  "transaction_id": "4200001234567890123456789",
  "createTime": "2023-09-14T08:00:00.000Z",
  "updateTime": "2023-09-14T08:00:10.000Z",
  "payTime": "2023-09-14T08:00:10.000Z",
  "isActive": true
}
```

## 索引设计

### 主要索引
- `out_trade_no`: **唯一索引**，用于快速查找订单，**必须设置以防止重复订单号**
- `openid`: 普通索引，用于查询用户的订单列表
- `status`: 普通索引，用于按状态查询订单
- `orderType`: 普通索引，用于按订单类型查询
- `createTime`: 普通索引，用于按时间排序和查询

### 复合索引
- `openid + status`: 复合索引，用于查询用户特定状态的订单列表（如：查询用户已支付的订单）

### 查询优化
- 通过out_trade_no查询订单是最常用的查询方式，设置为唯一索引
- openid用于查询用户的订单列表，设置为普通索引
- status用于筛选不同状态的订单，设置为普通索引
- createTime可用于订单时间排序和统计

### 重要提醒
⚠️ **数据库约束要求**：
- **必须为 `out_trade_no` 字段创建唯一索引**，防止重复订单号
- 在云开发控制台中设置：数据库 → payment_orders集合 → 索引管理 → 添加索引
- 索引配置：字段名 `out_trade_no`，索引类型选择 `唯一索引`

## 与其他数据表的关系

### 关联表
- **users表**: 多对一关系
  - 外键: `payment_orders.openid` 关联 `users.openid`
  - 关系描述: 一个用户可以创建多个支付订单

## 订单状态说明

| 状态值 | 说明 | 业务含义 |
|--------|------|----------|
| NOTPAY | 未支付 | 订单已创建，等待用户支付 |
| SUCCESS | 支付成功 | 用户已完成支付，订单成功 |
| CLOSED | 已关闭 | 订单已关闭（超时或主动关闭） |
| REFUND | 已退款 | 订单已退款 |
| REVOKED | 已撤销 | 订单已撤销 |
| USERPAYING | 用户支付中 | 用户正在支付（轮询状态） |
| PAYERROR | 支付失败 | 支付过程中发生错误 |

## 业务规则

1. **订单号唯一性**: 通过out_trade_no保证订单唯一性，格式为`ORDER_{timestamp}_{random}`
2. **金额单位**: 订单金额单位为"分"，不是"元"（例如：10元 = 1000分）
3. **订单状态流转**:
   - 创建订单：NOTPAY
   - 用户支付：USERPAYING → SUCCESS
   - 支付失败：PAYERROR
   - 订单超时：CLOSED
   - 退款：REFUND
4. **prepay_id有效期**: prepay_id有效期为2小时，超过2小时需要重新创建订单
5. **订单超时**: 订单默认7天有效，可以通过time_expire参数设置自定义过期时间
6. **软删除**: 使用isActive字段进行软删除，不直接删除订单数据
7. **业务逻辑处理**: 支付成功后，根据orderType执行相应的业务逻辑（如升级用户类型、增加配额等）

## 订单类型说明

| orderType | 说明 | orderData示例 |
|-----------|------|---------------|
| upgrade_premium | 升级为高级用户 | `{ "targetUserType": "premium" }` |
| recharge_quota | 充值配额 | `{ "quota": 10 }` |
| function_payment | 功能按次付费 | `{}` (使用 grantData 字段) |
| default | 默认订单类型 | `{}` |

### 功能付费订单示例

```json
{
  "_id": "order_func_pay_001",
  "openid": "oABCD1234567890abcdef1234567890ab",
  "appid": "wx1234567890abcdef",
  "out_trade_no": "ORDER_1702886400000_func123",
  "prepay_id": "wx1234567890abcdef1234567890",
  "description": "智慧洞见",
  "amount": 190,
  "orderType": "function_payment",
  "orderData": {},
  "functionCode": "wisdom_insight",
  "functionName": "智慧洞见",
  "grantData": {
    "type": "grant_function_quota",
    "functionCode": "wisdom_insight",
    "quantity": 1
  },
  "grantInfo": {
    "status": "granted",
    "grantTime": "2024-12-18T08:00:15.000Z",
    "grantResult": {
      "success": true,
      "message": "配额发放成功"
    },
    "errorMessage": ""
  },
  "status": "SUCCESS",
  "transaction_id": "4200001234567890123456789",
  "createTime": "2024-12-18T08:00:00.000Z",
  "updateTime": "2024-12-18T08:00:15.000Z",
  "payTime": "2024-12-18T08:00:10.000Z",
  "isActive": true
}
```

## 支付流程

1. **创建订单**: 调用云函数创建订单，状态为NOTPAY
2. **获取prepay_id**: 调用微信支付统一下单接口，获取prepay_id
3. **调起支付**: 使用prepay_id生成支付参数，调起微信支付
4. **支付回调**: 微信支付发送回调通知，更新订单状态为SUCCESS
5. **业务处理**: 根据orderType执行相应的业务逻辑

## 功能付费订单处理流程

### 订单创建流程
1. 客户端调用 `paymentManagement.createFunctionOrder({ functionCode })`
2. 云函数从 `function_products` 表查询商品信息
3. 创建订单，快照商品信息到 `grantData` 字段
4. 初始化 `grantInfo.status = 'pending'`
5. 调用微信支付统一下单接口
6. 返回支付参数给客户端

### 支付成功处理流程
1. 微信支付回调通知
2. 验证签名，更新订单状态为 SUCCESS
3. 根据 `grantData.type` 执行权益发放：
   - 如果 `type = 'grant_function_quota'`，调用 `functionQuotaManagement.grantQuota`
   - 传递参数：functionCode, quantity, orderId
4. 更新 `grantInfo` 字段：
   - 成功：`status='granted'`, `grantTime`, `grantResult`
   - 失败：`status='failed'`, `errorMessage`

### 权益发放状态说明

| 状态 | 说明 | 后续操作 |
|-----|------|---------|
| pending | 待发放 | 支付成功后自动发放 |
| granted | 已发放 | 无需操作，用户可使用 |
| failed | 发放失败 | 需要人工介入，手动补发或退款 |

### 查询发放失败的订单
```javascript
// 查询需要人工处理的订单
const failedOrders = await db.collection('payment_orders')
  .where({
    orderType: 'function_payment',
    status: 'SUCCESS',
    'grantInfo.status': 'failed'
  })
  .get();

console.log('需要处理的失败订单:', failedOrders.data);
```

## 与其他表的关联（功能付费）

### 关联表
- **function_products表**: 多对一关系
  - 外键: `payment_orders.functionCode` 关联 `function_products.functionCode`
  - 关系描述: 订单关联到具体的功能商品

- **function_quotas表**: 间接关联
  - 关系描述: 支付成功后，根据 grantData 发放配额到 function_quotas 表

- **function_usage_records表**: 一对多关系
  - 外键: `function_usage_records.orderId` 关联 `payment_orders._id`
  - 关系描述: 使用付费配额时，记录关联的订单ID

## 扩展性考虑

1. **订单查询**: 支持按时间范围、状态、订单类型等条件查询
2. **订单统计**: 可添加统计字段用于订单数据分析
3. **退款功能**: 支持订单退款，状态更新为REFUND
4. **订单超时**: 可添加定时任务自动关闭超时订单
5. **订单日志**: 可添加订单操作日志记录订单状态变更历史
6. **多支付方式**: 可扩展支持其他支付方式（如：支付宝、银行卡等）
7. **权益补发**: 支持手动重新发放失败的权益

## 注意事项（功能付费）

⚠️ **重要**：
1. `grantData` 字段快照商品信息，价格调整不影响已创建订单
2. `grantInfo` 字段记录权益发放状态，便于问题排查
3. 权益发放失败时，需要人工介入处理（补发或退款）
4. 查询功能付费订单时，通过 `orderType='function_payment'` 筛选
5. `functionCode` 字段用于关联功能商品和使用记录

