# 支付回调日志查找指南

## 📋 概述

本文档说明如何在云函数日志中查找支付回调相关的日志，帮助排查支付回调问题。

## 🔍 日志关键字

### 1. 支付回调入口日志

**关键字：`[handlePaymentNotify]`**

这是支付回调处理函数的主要日志前缀，所有支付回调相关的日志都会包含这个关键字。

**关键日志点：**

- `[handlePaymentNotify] 收到支付回调` - 回调请求到达
- `[handlePaymentNotify] 解析回调数据失败` - 回调数据解析失败
- `[handlePaymentNotify] 回调数据缺少订单号` - 回调数据不完整
- `[handlePaymentNotify] 订单不存在` - 订单查询失败
- `[handlePaymentNotify] 订单状态已更新` - 订单状态更新成功
- `[handlePaymentNotify] 准备处理支付成功业务逻辑` - 开始处理业务逻辑
- `[handlePaymentNotify] 支付成功业务逻辑处理完成` - 业务逻辑处理完成
- `[handlePaymentNotify] 业务逻辑处理失败` - 业务逻辑处理失败
- `[handlePaymentNotify] 处理支付回调失败` - 回调处理异常

### 2. 支付成功业务逻辑日志

**关键字：`[handlePaymentSuccess]`**

支付成功后的业务逻辑处理日志。

**关键日志点：**

- `[handlePaymentSuccess] 开始处理支付成功业务逻辑` - 开始处理
- `[handlePaymentSuccess] 功能付费订单缺少 grantData` - grantData 缺失警告
- `[handlePaymentSuccess] 业务逻辑处理失败` - 处理失败

### 3. 配额发放日志

**关键字：`[grantFunctionQuota]`**

功能付费订单的配额发放日志。

**关键日志点：**

- `[grantFunctionQuota] 开始发放功能配额` - 开始发放
- `[grantFunctionQuota] 配额发放失败` - 发放失败
- `[grantFunctionQuota] 配额发放成功` - 发放成功
- `[grantFunctionQuota] 发放功能配额异常` - 发放异常

### 4. grantInfo 更新日志

**关键字：`[updateGrantInfo]`**

权益发放信息更新日志。

**关键日志点：**

- `[updateGrantInfo] grantInfo 更新成功` - 更新成功
- `[updateGrantInfo] 更新 grantInfo 失败` - 更新失败

### 5. HTTP 触发器识别日志

**关键字：`[main] 识别为HTTP触发器`**

云函数入口识别 HTTP 触发器调用的日志。

**关键日志点：**

- `[main] 收到请求` - 收到请求（包含请求类型判断）
- `[main] 识别为HTTP触发器` - 识别为 HTTP 触发器

## 🔎 查找方法

### 方法1：在云开发控制台查找

1. **打开云开发控制台**
   - 访问：https://console.cloud.tencent.com/tcb
   - 选择对应的环境

2. **进入云函数日志**
   - 云函数 → `paymentManagement_v1_3` → 日志

3. **搜索关键字**
   - 在日志搜索框中输入：`handlePaymentNotify`
   - 或输入：`支付回调`
   - 或输入订单号：`ORDER_xxx`

4. **筛选时间范围**
   - 选择支付发生的时间范围
   - 通常支付回调会在支付完成后几秒内到达

### 方法2：使用日志搜索功能

**搜索关键字组合：**

```
# 查找所有支付回调日志
handlePaymentNotify

# 查找支付成功日志
handlePaymentNotify + SUCCESS

# 查找配额发放日志
grantFunctionQuota

# 查找 grantInfo 更新日志
updateGrantInfo

# 查找特定订单的回调
ORDER_1766137345838_P7nYEyDd

# 查找错误日志
handlePaymentNotify + error
```

### 方法3：按时间线查看

支付回调的典型日志时间线：

```
1. [main] 收到请求
   ↓
2. [main] 识别为HTTP触发器
   ↓
3. [handlePaymentNotify] 收到支付回调
   ↓
4. [handlePaymentNotify] 订单状态已更新
   ↓
5. [handlePaymentNotify] 准备处理支付成功业务逻辑
   ↓
6. [handlePaymentSuccess] 开始处理支付成功业务逻辑
   ↓
7. [grantFunctionQuota] 开始发放功能配额
   ↓
8. [grantFunctionQuota] 配额发放成功
   ↓
9. [updateGrantInfo] grantInfo 更新成功
   ↓
10. [handlePaymentNotify] 支付成功业务逻辑处理完成
```

## 📊 日志示例

### 正常支付回调日志示例

```
[main] 收到请求 { hasPath: true, hasHttpMethod: true, path: '/payment/notify', httpMethod: 'POST' }
[main] 识别为HTTP触发器 { path: '/payment/notify', httpMethod: 'POST' }
[handlePaymentNotify] 收到支付回调 { headers: {...}, body: { out_trade_no: 'ORDER_xxx', trade_state: 'SUCCESS', ... } }
[handlePaymentNotify] 订单状态已更新 { out_trade_no: 'ORDER_xxx', oldStatus: 'NOTPAY', newStatus: 'SUCCESS' }
[handlePaymentNotify] 准备处理支付成功业务逻辑 { orderId: 'xxx', orderType: 'function_payment', hasGrantData: true }
[handlePaymentSuccess] 开始处理支付成功业务逻辑 { orderType: 'function_payment', ... }
[grantFunctionQuota] 开始发放功能配额 { openid: 'xxx', functionCode: 'wisdom_insight', quantity: 1, orderId: 'xxx' }
[grantFunctionQuota] 配额发放成功 { functionCode: 'wisdom_insight', quantity: 1, result: {...} }
[updateGrantInfo] grantInfo 更新成功 { orderId: 'xxx', status: 'granted' }
[handlePaymentNotify] 支付成功业务逻辑处理完成 { orderId: 'xxx' }
```

### 支付回调未到达的排查

如果没有看到 `[handlePaymentNotify] 收到支付回调` 日志，说明回调未到达：

**检查项：**
1. HTTP 触发器是否配置
2. 回调 URL 是否正确
3. 微信支付商户平台是否发送了回调

### 支付回调到达但处理失败的排查

如果看到 `[handlePaymentNotify] 收到支付回调` 但后续处理失败：

**检查项：**
1. 查看 `[handlePaymentNotify] 业务逻辑处理失败` 日志
2. 查看 `[grantFunctionQuota] 配额发放失败` 日志
3. 查看 `[updateGrantInfo] 更新 grantInfo 失败` 日志

## 🐛 常见问题排查

### 问题1：没有支付回调日志

**症状：** 支付完成后，订单状态仍为 `NOTPAY`，日志中没有 `[handlePaymentNotify]` 相关日志

**排查步骤：**
1. 检查 HTTP 触发器是否配置
   - 云函数 → `paymentManagement_v1_3` → 触发器
   - 确认是否有 HTTP 触发器，路径是否为 `/payment/notify`

2. 检查回调 URL 配置
   - 云函数 → 环境变量 → `WECHAT_PAY_NOTIFY_URL`
   - 格式应为：`https://你的域名/payment/notify`

3. 检查微信支付商户平台
   - 登录微信支付商户平台
   - 查看订单详情，确认支付是否成功
   - 查看回调通知记录，确认是否发送了回调

### 问题2：支付回调到达但订单状态未更新

**症状：** 有 `[handlePaymentNotify] 收到支付回调` 日志，但订单状态未更新

**排查步骤：**
1. 查看 `[handlePaymentNotify] 订单状态已更新` 日志
2. 检查日志中的 `oldStatus` 和 `newStatus`
3. 如果日志显示更新成功但数据库未更新，可能是数据库权限问题

### 问题3：支付回调到达但配额未发放

**症状：** 有支付回调日志，订单状态已更新，但 `grantInfo` 仍为 `pending`

**排查步骤：**
1. 查看 `[handlePaymentNotify] 准备处理支付成功业务逻辑` 日志
2. 检查 `hasGrantData` 是否为 `true`
3. 查看 `[grantFunctionQuota]` 相关日志
4. 查看 `[handlePaymentNotify] 业务逻辑处理失败` 日志中的错误信息

### 问题4：配额发放成功但 grantInfo 未更新

**症状：** 有 `[grantFunctionQuota] 配额发放成功` 日志，但 `grantInfo` 未更新

**排查步骤：**
1. 查看 `[updateGrantInfo]` 相关日志
2. 检查是否有 `[updateGrantInfo] 更新 grantInfo 失败` 日志
3. 查看错误信息，可能是数据库权限问题

## 📝 日志过滤技巧

### 在云开发控制台使用过滤

1. **按关键字过滤**
   ```
   handlePaymentNotify
   ```

2. **按订单号过滤**
   ```
   ORDER_1766137345838_P7nYEyDd
   ```

3. **按错误过滤**
   ```
   error + handlePaymentNotify
   ```

4. **按时间过滤**
   - 选择支付发生的时间范围
   - 通常支付回调在支付完成后 1-5 秒内到达

### 导出日志分析

1. 导出日志到本地
2. 使用文本编辑器搜索关键字
3. 或使用日志分析工具（如 grep、awk）

## 🔗 相关文档

- [支付管理 API 文档](../api/paymentManagement-api.md)
- [功能付费订单测试指南](../function-payment-test-guide.md)
- [功能付费系统实施计划](../function-payment-implementation-plan.md)

---

**文档版本**：v1.0  
**创建时间**：2024年12月18日  
**维护者**：开发团队

