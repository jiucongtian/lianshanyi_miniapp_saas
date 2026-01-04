# 支付成功日志检查指南

本文档说明在支付成功后，`paymentManagement_v1_3` 云函数应该打印的关键日志，用于判断支付回调是否成功处理。

## 📋 支付成功时的完整日志流程

### 1. 收到支付回调（第一步）

```
[handlePaymentNotify] 收到支付回调
{
  headers: { ... },
  body: {
    out_trade_no: "订单号",
    transaction_id: "微信支付交易号",
    trade_state: "SUCCESS",  // 关键：必须是 "SUCCESS"
    ...
  }
}
```

**关键点：**
- ✅ `trade_state` 必须是 `"SUCCESS"`
- ✅ 必须包含 `out_trade_no`（订单号）
- ✅ 必须包含 `transaction_id`（微信支付交易号）

---

### 2. 订单状态更新（第二步）

```
[handlePaymentNotify] 订单状态已更新
{
  out_trade_no: "订单号",
  oldStatus: "NOTPAY" 或 "PENDING",  // 旧状态
  newStatus: "SUCCESS"  // 新状态（必须是 SUCCESS）
}
```

**关键点：**
- ✅ `newStatus` 必须是 `"SUCCESS"`
- ✅ 订单状态从 `NOTPAY` 或 `PENDING` 更新为 `SUCCESS`

---

### 3. 准备处理支付成功业务逻辑（第三步）

```
[handlePaymentNotify] 准备处理支付成功业务逻辑
{
  orderId: "订单ID",
  orderType: "function_payment" 或 "upgrade_premium",
  hasGrantData: true  // 如果是功能付费订单，应该为 true
}
```

**关键点：**
- ✅ `orderType` 表示订单类型
- ✅ 如果是功能付费订单（`function_payment`），`hasGrantData` 应该为 `true`

---

### 4. 开始处理支付成功业务逻辑（第四步）

```
[handlePaymentSuccess] 开始处理支付成功业务逻辑
{
  orderType: "function_payment" 或 "upgrade_premium",
  orderData: { ... },
  openid: "用户openid",
  hasGrantData: true
}
```

---

### 5. 配额发放（如果是功能付费订单）

#### 5.1 开始发放配额

```
[grantFunctionQuota] 开始发放功能配额
{
  openid: "用户openid",
  functionCode: "功能代码",
  quantity: 数量,
  orderId: "订单ID"
}
```

#### 5.2 配额发放成功（关键日志）

```
[grantFunctionQuota] 配额发放成功
{
  functionCode: "功能代码",
  quantity: 数量,
  result: {
    // 配额发放的详细结果
  }
}
```

**这是最重要的成功日志！** ✅

#### 5.3 grantInfo 更新成功

```
[updateGrantInfo] grantInfo 更新成功
{
  orderId: "订单ID",
  status: "granted"  // 关键：必须是 "granted"
}
```

**关键点：**
- ✅ `status` 必须是 `"granted"`（已发放）
- ✅ 表示权益发放信息已成功更新到订单

---

### 6. 支付成功业务逻辑处理完成（最后一步）

```
[handlePaymentNotify] 支付成功业务逻辑处理完成
{
  orderId: "订单ID"
}
```

**关键点：**
- ✅ 这表示整个支付成功流程已完成
- ✅ 没有错误日志

---

## ✅ 成功标志总结

### 必须看到的日志（按顺序）：

1. ✅ `[handlePaymentNotify] 收到支付回调` - 收到回调
2. ✅ `[handlePaymentNotify] 订单状态已更新` - `newStatus: "SUCCESS"`
3. ✅ `[handlePaymentNotify] 准备处理支付成功业务逻辑` - 准备处理
4. ✅ `[handlePaymentSuccess] 开始处理支付成功业务逻辑` - 开始处理
5. ✅ `[grantFunctionQuota] 配额发放成功` - **配额发放成功（功能付费订单）**
6. ✅ `[updateGrantInfo] grantInfo 更新成功` - `status: "granted"`
7. ✅ `[handlePaymentNotify] 支付成功业务逻辑处理完成` - 处理完成

---

## ❌ 错误日志（如果出现这些，说明有问题）

### 常见错误日志：

1. **订单不存在**
   ```
   [handlePaymentNotify] 订单不存在
   {
     out_trade_no: "订单号"
   }
   ```
   - 原因：订单号不匹配或订单已被删除

2. **回调数据缺少订单号**
   ```
   [handlePaymentNotify] 回调数据缺少订单号
   ```
   - 原因：微信支付回调数据格式错误

3. **业务逻辑处理失败**
   ```
   [handlePaymentNotify] 业务逻辑处理失败
   {
     out_trade_no: "订单号",
     orderId: "订单ID",
     error: "错误信息",
     stack: "错误堆栈"
   }
   ```
   - 原因：配额发放或其他业务逻辑处理失败

4. **配额发放失败**
   ```
   [grantFunctionQuota] 配额发放失败
   {
     functionCode: "功能代码",
     quantity: 数量,
     error: "错误信息"
   }
   ```
   - 原因：调用配额管理云函数失败

5. **更新 grantInfo 失败**
   ```
   [updateGrantInfo] 更新 grantInfo 失败
   {
     orderId: "订单ID",
     error: "错误信息"
   }
   ```
   - 原因：数据库更新失败

---

## 🔍 日志过滤技巧

在云开发控制台使用以下关键字过滤日志：

### 按订单号过滤
```
ORDER_1766137345838_P7nYEyDd
```

### 按功能过滤
```
handlePaymentNotify
grantFunctionQuota
```

### 按成功标志过滤
```
配额发放成功
grantInfo 更新成功
支付成功业务逻辑处理完成
```

### 按错误过滤
```
error + handlePaymentNotify
配额发放失败
业务逻辑处理失败
```

---

## 📝 检查清单

支付成功后，请检查以下内容：

- [ ] 是否看到 `[handlePaymentNotify] 收到支付回调` 日志？
- [ ] `trade_state` 是否为 `"SUCCESS"`？
- [ ] 是否看到 `[handlePaymentNotify] 订单状态已更新`，且 `newStatus` 为 `"SUCCESS"`？
- [ ] 是否看到 `[handlePaymentNotify] 准备处理支付成功业务逻辑`？
- [ ] 是否看到 `[handlePaymentSuccess] 开始处理支付成功业务逻辑`？
- [ ] 如果是功能付费订单，是否看到 `[grantFunctionQuota] 配额发放成功`？
- [ ] 是否看到 `[updateGrantInfo] grantInfo 更新成功`，且 `status` 为 `"granted"`？
- [ ] 是否看到 `[handlePaymentNotify] 支付成功业务逻辑处理完成`？
- [ ] 是否**没有**看到任何 `error` 或 `失败` 的日志？

如果以上所有项都是 ✅，说明支付回调处理成功！

---

## 🎯 快速判断

**最简单的方法：**

在日志中搜索 `配额发放成功` 或 `支付成功业务逻辑处理完成`，如果看到这些日志，说明支付回调处理成功！

---

## 📞 问题排查

如果支付成功但没有看到上述日志：

1. **检查云函数是否部署最新版本**
   - 确认 `paymentManagement_v1_3` 已部署最新代码

2. **检查HTTP触发器配置**
   - 确认HTTP触发器路径为 `/payment/notify`
   - 确认触发器已启用

3. **检查微信支付回调URL配置**
   - 确认回调URL指向正确的云函数地址

4. **检查订单数据**
   - 确认订单中存在 `grantData` 字段（功能付费订单）
   - 确认订单状态已更新为 `SUCCESS`

5. **查看完整错误日志**
   - 查看是否有异常或错误信息
   - 检查配额管理云函数是否正常

