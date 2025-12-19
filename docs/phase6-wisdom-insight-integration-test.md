# Phase 6 智慧洞见集成测试指南

## 📋 概述

本文档说明如何测试智慧洞见功能与按次付费系统的集成。

## ✅ 集成完成内容

### 代码改动

1. **`miniprogram/pages/answer/index.js`** - 智慧洞见答案页面
   - 导入 `FunctionController`
   - 初始化功能控制器
   - 重写 `onAIInterpret()` 方法使用 FunctionController
   - 新增 `_loadQuotaInfo()` 方法

### 关键变更点

#### 1. 原有调用方式（已移除）

```javascript
// 旧代码：直接调用云函数
const result = await wx.cloud.callFunction({
  name: functionName,
  data: {
    workflowType: 'DRAW_CARD',
    parameters: {
      bazi_name: baziName,
      question: this.data.question || ''
    }
  }
});
```

#### 2. 新的调用方式（已实现）

```javascript
// 新代码：使用 FunctionController
const result = await this.functionController.useFunction('wisdom_insight', {
  bazi_name: baziName,
  question: this.data.question || ''
}, {
  showLoading: false,
  autoPayment: true,
  onQuotaInsufficient: () => {
    log.warn('onAIInterpret', '智慧洞见配额不足');
    return true; // 继续显示支付弹窗
  }
});
```

## 🧪 测试前准备

### 1. 部署云函数

**必须部署的云函数：**

```bash
# 1. 功能配额管理
functionQuotaManagement_v1_4

# 2. 统一调用网关
functionCallGateway_v1_4

# 3. 支付管理（如果测试支付流程）
paymentManagement_v1_3

# 4. 智慧洞见功能（Coze Functions）
cozeFunctions_v1_4
```

### 2. 配置数据库

**确认以下数据表和数据存在：**

#### 2.1 `function_products` 表

```json
{
  "_id": "wisdom_insight",
  "functionCode": "wisdom_insight",
  "functionName": "智慧洞见",
  "functionType": "per_use",
  "description": "抽卡获取智慧洞见",
  "price": 100,
  "originalPrice": 200,
  "status": "active",
  "callConfig": {
    "targetFunction": "cozeFunctions_v1_4",
    "workflowType": "WISDOM_INSIGHT",
    "parameters": {},
    "timeout": 60000
  },
  "grantData": {
    "paidQuota": 1
  },
  "quotaConfig": {
    "freeDailyQuota": 2,
    "enablePaidQuota": true,
    "enableFreeQuota": true
  },
  "createTime": "2025-01-01T00:00:00.000Z",
  "updateTime": "2025-01-01T00:00:00.000Z"
}
```

#### 2.2 `user_function_quotas` 表

系统会自动创建用户配额记录，但也可以手动初始化：

```json
{
  "_openid": "用户的openid",
  "functionCode": "wisdom_insight",
  "freeDailyQuota": 2,
  "freeUsedToday": 0,
  "freeLastResetDate": "2025-01-15",
  "paidQuota": 0,
  "totalUsageCount": 0,
  "createTime": "2025-01-15T00:00:00.000Z",
  "updateTime": "2025-01-15T00:00:00.000Z"
}
```

### 3. 编译小程序

```bash
# 确保使用最新的代码
# 在微信开发者工具中点击"编译"
```

## 🎯 测试用例

### 测试用例 1：免费配额使用

**目标：** 验证用户使用免费配额正常工作

**前置条件：**
- 用户有免费配额（freeUsedToday < freeDailyQuota）

**步骤：**
1. 打开小程序，进入"智慧洞见"页面
2. 输入问题（或不输入）
3. 点击"寻找答案"按钮，跳转到答案页面
4. 点击"抽卡"按钮
5. 卡牌翻转后，自动调用 AI 解读

**预期结果：**
- ✅ 显示"AI解读中..."加载提示
- ✅ AI 解读成功，显示解读内容
- ✅ 配额自动扣除（freeUsedToday +1）
- ✅ 无需支付
- ✅ 日志中显示"功能调用成功"

**验证配额扣除：**

在云开发控制台查询 `user_function_quotas` 表：

```javascript
{
  "functionCode": "wisdom_insight",
  "freeUsedToday": 1,  // 应该增加1
  "paidQuota": 0,      // 不变
  "totalUsageCount": 1 // 增加1
}
```

---

### 测试用例 2：免费配额用完，弹出支付

**目标：** 验证免费配额用完后，系统自动弹出支付弹窗

**前置条件：**
- 用户免费配额已用完（freeUsedToday >= freeDailyQuota）
- 用户付费配额为0（paidQuota = 0）

**步骤：**
1. 打开小程序，进入"智慧洞见"页面
2. 输入问题（或不输入）
3. 点击"寻找答案"按钮
4. 点击"抽卡"按钮
5. 卡牌翻转后，自动调用 AI 解读

**预期结果：**
- ✅ 弹出支付弹窗
- ✅ 弹窗标题："配额不足"
- ✅ 弹窗内容：显示价格（如"购买1次仅需1.00元"）
- ✅ 显示"立即购买"和"取消"按钮

**操作：点击"取消"**
- ✅ 弹窗关闭
- ✅ AI 解读不执行
- ✅ 配额不扣除
- ✅ 显示"AI解读"按钮（可重试）

**操作：点击"立即购买"**
- 进入测试用例 3

---

### 测试用例 3：支付流程

**目标：** 验证支付流程正常工作

**前置条件：**
- 免费配额已用完
- 付费配额为0
- 已点击"立即购买"

**步骤：**
1. 系统创建订单
2. 调起微信支付
3. 完成支付（或取消支付）

**预期结果（支付成功）：**
- ✅ 显示"支付成功，配额发放中..."
- ✅ 订单状态更新为 `paid`
- ✅ 用户配额增加（paidQuota +1）
- ✅ 提示"请再次点击使用功能"
- ✅ 再次点击抽卡，使用付费配额成功

**预期结果（支付取消）：**
- ✅ 显示"用户取消支付"
- ✅ 订单状态保持 `pending`
- ✅ 配额不变
- ✅ 用户可以再次尝试

**验证订单记录：**

在云开发控制台查询 `orders` 表：

```javascript
{
  "orderType": "function",
  "functionCode": "wisdom_insight",
  "amount": 100, // 单位：分
  "status": "paid",
  "orderData": {
    "functionName": "智慧洞见",
    "quantity": 1,
    "price": 100
  }
}
```

**验证配额发放：**

在云开发控制台查询 `user_function_quotas` 表：

```javascript
{
  "functionCode": "wisdom_insight",
  "paidQuota": 1, // 应该增加1
  "totalUsageCount": 不变
}
```

---

### 测试用例 4：使用付费配额

**目标：** 验证付费配额正常使用

**前置条件：**
- 用户有付费配额（paidQuota > 0）
- 免费配额已用完

**步骤：**
1. 打开小程序，进入"智慧洞见"页面
2. 点击"抽卡"按钮
3. 卡牌翻转后，自动调用 AI 解读

**预期结果：**
- ✅ AI 解读成功
- ✅ 付费配额扣除（paidQuota -1）
- ✅ 总使用次数增加（totalUsageCount +1）
- ✅ 无需支付

**验证配额扣除：**

```javascript
{
  "functionCode": "wisdom_insight",
  "paidQuota": 0,  // 减少1
  "totalUsageCount": 增加1
}
```

---

### 测试用例 5：功能调用失败，配额回滚

**目标：** 验证功能调用失败时，配额自动回滚

**前置条件：**
- 用户有配额
- 模拟功能调用失败（修改 cozeFunctions 返回错误）

**步骤：**
1. 临时修改 `cozeFunctions_v1_4` 返回失败
2. 打开小程序，进入"智慧洞见"页面
3. 点击"抽卡"按钮
4. 卡牌翻转后，自动调用 AI 解读

**预期结果：**
- ✅ 显示错误提示："解读失败，请重试"
- ✅ 配额回滚（扣除的配额恢复）
- ✅ 显示"AI解读"按钮（可重试）
- ✅ 日志中显示"配额回滚成功"

**验证配额回滚：**

在云开发控制台查询 `user_function_quotas` 表：

```javascript
{
  "functionCode": "wisdom_insight",
  "freeUsedToday": 不变（或恢复到调用前的值）,
  "paidQuota": 不变（或恢复到调用前的值）
}
```

---

### 测试用例 6：并发调用

**目标：** 验证用户同时发起多次调用时，配额扣除不会重复

**前置条件：**
- 用户有配额

**步骤：**
1. 快速点击"抽卡"按钮多次（或使用工具模拟并发）
2. 观察日志和配额变化

**预期结果：**
- ✅ 只有第一次点击生效
- ✅ 后续点击被忽略（日志显示"正在解读中，忽略重复调用"）
- ✅ 配额只扣除一次
- ✅ 使用记录只有一条

---

## 📊 监控和日志

### 关键日志

**1. 功能调用开始**

```
[AnswerPage] onAIInterpret 调用智慧洞见功能
  bazi_name: "甲子"
  question: "我应该换工作吗？"
```

**2. FunctionController 日志**

```
[FunctionController] useFunction 开始调用功能
  functionCode: "wisdom_insight"
  functionParams: { bazi_name: "甲子", question: "..." }
```

**3. 功能调用成功**

```
[FunctionController] useFunction 功能调用成功
  functionCode: "wisdom_insight"

[AnswerPage] onAIInterpret AI解读成功
  interpretation: "..."
```

**4. 配额不足**

```
[FunctionController] _handleQuotaInsufficient 配额不足
  functionCode: "wisdom_insight"
  quotaInfo: { canUse: false, ... }
```

**5. 支付流程**

```
[FunctionController] _purchaseFunction 开始购买功能
  functionCode: "wisdom_insight"

[FunctionController] _purchaseFunction 订单创建成功
  orderId: "..."

[FunctionController] _requestPayment 调起支付
```

### 查看使用记录

在云开发控制台查询 `function_usage_records` 表：

```javascript
{
  "_openid": "用户openid",
  "functionCode": "wisdom_insight",
  "usageData": {
    "bazi_name": "甲子",
    "question": "我应该换工作吗？"
  },
  "result": "success",
  "isPaid": false,
  "quotaBefore": {
    "freeRemaining": 2,
    "paidRemaining": 0
  },
  "quotaAfter": {
    "freeRemaining": 1,
    "paidRemaining": 0
  },
  "createTime": "2025-01-15T08:00:00.000Z"
}
```

## 🐛 常见问题

### 1. 功能调用返回 null

**原因：**
- 配额不足且用户取消支付
- 权限不足
- 功能调用失败

**解决：**
- 检查配额是否充足
- 检查用户权限
- 查看云函数日志

### 2. 支付成功但配额未发放

**原因：**
- 支付回调未触发
- 配额发放逻辑出错

**解决：**
- 查看 `paymentManagement_v1_3` 云函数日志
- 检查订单状态是否为 `paid`
- 手动调用配额发放接口

### 3. 配额扣除了但功能未执行

**原因：**
- 功能调用失败
- 配额回滚失败

**解决：**
- 查看 `functionCallGateway_v1_4` 日志
- 检查配额是否已回滚
- 手动回滚配额

## ✅ 测试检查清单

- [ ] 免费配额使用正常
- [ ] 配额不足时弹出支付弹窗
- [ ] 支付流程正常（创建订单、调起支付）
- [ ] 支付成功后配额正确发放
- [ ] 使用付费配额正常
- [ ] 功能调用失败时配额正确回滚
- [ ] 并发调用时配额不会重复扣除
- [ ] 使用记录正确记录
- [ ] 日志完整清晰
- [ ] 错误处理友好

## 🎉 测试完成标志

当以上所有测试用例通过，并且检查清单全部勾选后，Phase 6 集成测试完成。

可以进入 Phase 7：测试与上线。

