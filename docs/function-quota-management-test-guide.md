# 配额管理云函数测试指南

## 📋 概述

本文档提供 `functionQuotaManagement_v1_4` 云函数的完整测试方案，包括测试工具、测试步骤和验收标准。

## 🎯 测试目标

验证以下5个核心接口的功能正确性：

1. ✅ **checkQuota** - 检查配额
2. ✅ **deductQuota** - 扣除配额
3. ✅ **grantQuota** - 发放配额
4. ✅ **rollbackQuota** - 回滚配额
5. ✅ **getQuotaInfo** - 获取配额信息

## 🛠️ 测试工具

### 测试脚本位置

测试脚本已创建在：`docs/tools/test-quota-management.js`

### 使用方法

#### 方式1：在小程序页面中使用（推荐）

1. 打开任意小程序页面（如 `pages/mine/index.js`）
2. 复制测试函数到页面文件
3. 在按钮点击事件或 `onLoad` 中调用

```javascript
// pages/mine/index.js
Page({
  async onTestQuotaTap() {
    // 导入测试函数（或直接复制到当前文件）
    const { runFullTest } = require('../../docs/tools/test-quota-management.js');
    
    // 执行完整测试
    await runFullTest();
  },
  
  async onQuickTestTap() {
    // 快速测试
    const { runQuickTest } = require('../../docs/tools/test-quota-management.js');
    await runQuickTest();
  }
});
```

#### 方式2：在开发者工具控制台中调用

1. 打开小程序开发者工具
2. 在控制台输入测试函数
3. 按回车执行

```javascript
// 在控制台输入
testCheckQuota('wisdom_insight')
```

#### 方式3：创建临时测试页面

```javascript
// pages/testQuota/index.js
const { 
  testCheckQuota, 
  testDeductQuota, 
  testGrantQuota, 
  testRollbackQuota, 
  testGetQuotaInfo,
  runFullTest,
  runQuickTest
} = require('../../docs/tools/test-quota-management.js');

Page({
  data: {},
  
  onLoad() {
    // 页面加载时自动运行快速测试
    // runQuickTest();
  },
  
  // 完整测试
  async onFullTestTap() {
    await runFullTest();
  },
  
  // 快速测试
  async onQuickTestTap() {
    await runQuickTest();
  },
  
  // 单独测试各个接口
  async onCheckQuotaTap() {
    await testCheckQuota('wisdom_insight');
  },
  
  async onDeductQuotaTap() {
    await testDeductQuota('wisdom_insight', 1);
  },
  
  async onGrantQuotaTap() {
    await testGrantQuota('wisdom_insight', 10);
  },
  
  async onRollbackQuotaTap() {
    await testRollbackQuota('wisdom_insight', false);
  },
  
  async onGetQuotaInfoTap() {
    await testGetQuotaInfo('wisdom_insight');
  }
});
```

---

## 📝 测试步骤

### 阶段1：基础功能测试

#### 测试1.1：检查配额（checkQuota）

**测试目标**：验证配额检查功能

**测试步骤**：
1. 调用 `testCheckQuota('wisdom_insight')`
2. 查看控制台输出
3. 验证返回数据格式

**预期结果**：
- ✅ 返回 `success: true`
- ✅ 包含 `canUse`, `freeRemaining`, `paidRemaining`, `totalRemaining` 等字段
- ✅ 配额数值正确（根据用户类型配置）

**测试用例**：
- [ ] 测试 `wisdom_insight`（智慧洞见）
- [ ] 测试 `ai_report`（AI出报告）
- [ ] 测试无效的 `functionCode`（应返回错误）

#### 测试1.2：获取配额信息（getQuotaInfo）

**测试目标**：验证配额信息查询功能

**测试步骤**：
1. 调用 `testGetQuotaInfo('wisdom_insight')`（单个功能）
2. 调用 `testGetQuotaInfo()`（所有功能）
3. 查看控制台输出

**预期结果**：
- ✅ 单个功能：返回格式与 `checkQuota` 相同
- ✅ 所有功能：返回对象，包含所有功能的配额信息

**测试用例**：
- [ ] 查询单个功能配额
- [ ] 查询所有功能配额
- [ ] 验证返回数据格式

---

### 阶段2：配额操作测试

#### 测试2.1：发放配额（grantQuota）

**测试目标**：验证配额发放功能

**测试步骤**：
1. 先检查当前配额：`testCheckQuota('wisdom_insight')`
2. 发放配额：`testGrantQuota('wisdom_insight', 10)`
3. 再次检查配额，验证是否增加

**预期结果**：
- ✅ 发放成功，返回 `success: true`
- ✅ 再次检查配额时，`paidRemaining` 增加 10
- ✅ 如果用户首次发放，会创建配额记录

**测试用例**：
- [ ] 首次发放（创建记录）
- [ ] 追加发放（更新记录）
- [ ] 发放不同数量（1次、10次、100次）
- [ ] 验证并发发放（可选）

#### 测试2.2：扣除配额（deductQuota）

**测试目标**：验证配额扣除功能

**测试步骤**：
1. 先检查当前配额
2. 扣除配额：`testDeductQuota('wisdom_insight', 1)`
3. 再次检查配额，验证是否减少

**预期结果**：
- ✅ 优先扣除免费配额（如果免费配额可用）
- ✅ 免费配额用完后扣除付费配额
- ✅ 返回 `isPaid` 标识本次使用的配额类型
- ✅ 返回扣除前后的配额对比

**测试用例**：
- [ ] 有免费配额时，优先扣除免费配额
- [ ] 免费配额用完后，扣除付费配额
- [ ] 配额不足时，返回 `QUOTA_INSUFFICIENT` 错误
- [ ] 验证并发扣除（可选）

#### 测试2.3：回滚配额（rollbackQuota）

**测试目标**：验证配额回滚功能

**测试步骤**：
1. 先扣除配额：`testDeductQuota('wisdom_insight', 1)`
2. 记录扣除结果（`isPaid`）
3. 回滚配额：`testRollbackQuota('wisdom_insight', isPaid)`
4. 再次检查配额，验证是否恢复

**预期结果**：
- ✅ 回滚免费配额：删除使用记录
- ✅ 回滚付费配额：恢复 `paidRemaining`
- ✅ 配额恢复到扣除前的状态

**测试用例**：
- [ ] 回滚免费配额（`isPaid: false`）
- [ ] 回滚付费配额（`isPaid: true`）
- [ ] 验证回滚后配额正确恢复

---

### 阶段3：完整流程测试

#### 测试3.1：完整测试流程（runFullTest）

**测试目标**：模拟真实使用场景

**测试步骤**：
1. 调用 `runFullTest()`
2. 观察整个流程的执行
3. 验证每个步骤的结果

**测试流程**：
```
1. 检查初始配额
   ↓
2. 发放测试配额（如果付费配额为0）
   ↓
3. 扣除配额（使用免费配额）
   ↓
4. 验证扣除后的配额
   ↓
5. 回滚配额
   ↓
6. 验证回滚后的配额
   ↓
7. 获取所有功能的配额信息
```

**预期结果**：
- ✅ 所有步骤执行成功
- ✅ 配额变化符合预期
- ✅ 无错误或异常

---

### 阶段4：边界条件测试

#### 测试4.1：配额为0的情况

**测试步骤**：
1. 确保配额为0（扣除所有配额）
2. 尝试扣除配额
3. 验证返回 `QUOTA_INSUFFICIENT` 错误

**预期结果**：
- ✅ 返回 `success: false`
- ✅ 错误码：`QUOTA_INSUFFICIENT`
- ✅ 返回当前配额信息（全部为0）

#### 测试4.2：并发测试（可选）

**测试步骤**：
1. 同时发起多个扣除配额请求
2. 验证配额不会超扣
3. 验证所有请求都正确处理

**预期结果**：
- ✅ 配额扣除准确（不会超扣）
- ✅ 使用原子操作保证并发安全

#### 测试4.3：无效参数测试

**测试步骤**：
1. 测试缺少必填参数
2. 测试无效的 `functionCode`
3. 测试负数或0的数量

**预期结果**：
- ✅ 返回 `INVALID_PARAMS` 错误
- ✅ 错误信息清晰

---

## ✅ 验收标准

### 功能验收

- [ ] ✅ **checkQuota** 接口测试通过
  - [ ] 返回数据格式正确
  - [ ] 配额计算正确（免费+付费）
  - [ ] 支持两个功能编码（wisdom_insight, ai_report）

- [ ] ✅ **deductQuota** 接口测试通过
  - [ ] 优先扣除免费配额
  - [ ] 免费配额用完后扣除付费配额
  - [ ] 配额不足时正确返回错误
  - [ ] 返回扣除前后的配额对比

- [ ] ✅ **grantQuota** 接口测试通过
  - [ ] 首次发放创建记录
  - [ ] 追加发放更新记录
  - [ ] 配额正确增加

- [ ] ✅ **rollbackQuota** 接口测试通过
  - [ ] 回滚免费配额正确
  - [ ] 回滚付费配额正确
  - [ ] 配额恢复到扣除前状态

- [ ] ✅ **getQuotaInfo** 接口测试通过
  - [ ] 单个功能查询正确
  - [ ] 所有功能查询正确
  - [ ] 返回数据格式正确

### 性能验收

- [ ] ✅ 配额检查响应时间 < 500ms
- [ ] ✅ 配额扣除响应时间 < 1s
- [ ] ✅ 配额发放响应时间 < 1s

### 安全验收

- [ ] ✅ 并发扣除配额不会超扣（原子操作）
- [ ] ✅ 配额不足时正确拒绝请求
- [ ] ✅ 参数验证正确

---

## 🐛 常见问题排查

### 问题1：配额检查返回0

**可能原因**：
- 用户类型配置未正确设置
- 免费配额字段映射错误

**排查步骤**：
1. 检查 `static_user_types` 表中的用户类型配置
2. 验证 `dailyDrawQuota` 和 `dailyAiReportQuota` 字段
3. 检查云函数日志中的配置获取日志

### 问题2：扣除配额失败

**可能原因**：
- 配额不足
- 并发问题
- 数据库操作失败

**排查步骤**：
1. 先调用 `checkQuota` 确认配额是否充足
2. 查看云函数日志
3. 检查数据库连接

### 问题3：发放配额后未生效

**可能原因**：
- 配额记录未创建
- 更新操作失败

**排查步骤**：
1. 检查 `function_quotas` 表中是否有记录
2. 查看云函数日志
3. 验证 `openid` 是否正确

---

## 📊 测试报告模板

### 测试环境

- 云函数版本：`functionQuotaManagement_v1_4`
- 测试时间：YYYY-MM-DD HH:MM:SS
- 测试用户：openid（隐藏）
- 用户类型：normal/guest/premium

### 测试结果

| 接口名称 | 测试状态 | 备注 |
|---------|---------|------|
| checkQuota | ✅/❌ | |
| deductQuota | ✅/❌ | |
| grantQuota | ✅/❌ | |
| rollbackQuota | ✅/❌ | |
| getQuotaInfo | ✅/❌ | |

### 发现的问题

1. [问题描述]
   - 复现步骤：
   - 预期结果：
   - 实际结果：
   - 严重程度：高/中/低

### 测试结论

- [ ] 所有核心接口测试通过
- [ ] 性能符合要求
- [ ] 可以进入下一阶段（Phase 3）

---

## 📚 相关文档

- [配额管理 API 文档](../api/functionQuotaManagementAPI.md)
- [云函数 README](../../cloudfunctions/functionQuotaManagement_v1_4/README.md)
- [功能付费系统实施计划](../function-payment-implementation-plan.md)
- [功能付费系统设计](../function-payment-design.md)

---

**文档版本**：v1.0  
**创建时间**：2024年12月18日  
**维护者**：开发团队

