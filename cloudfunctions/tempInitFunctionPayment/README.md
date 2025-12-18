# 临时云函数：初始化功能付费系统数据

## 📋 概述

此云函数用于执行功能按次付费系统 Phase 1 的数据初始化，包括：
1. 初始化功能商品数据（智慧洞见、AI出报告）
2. 更新用户类型配置（添加免费配额字段）
3. 验证数据完整性

**注意：** 初始化完成后，此云函数可以删除。

## 🚀 部署步骤

### 1. 确保数据库集合已创建

在云开发控制台创建以下集合：
- `function_products`（权限：仅管理端可读写）
- `function_quotas`（权限：仅管理端可读写）
- `function_usage_records`（权限：仅管理端可读写）

### 2. 设置必需的唯一索引

⚠️ **重要：** 在执行初始化前，必须先创建唯一索引：

- `function_products` 集合：
  - 字段 `functionCode`，类型：唯一索引（升序）

- `function_quotas` 集合：
  - 字段 `openid`，类型：唯一索引（升序）

### 3. 部署云函数

```bash
# 在项目根目录执行
# 如果使用命令行工具
# tcb fn deploy tempInitFunctionPayment

# 或在云开发控制台手动部署
```

**部署方式：**
- 在云开发控制台 → 云函数 → 上传并部署
- 选择"云端安装依赖"

## 📖 使用方式

### 方式1：一键初始化（推荐）✅

执行所有初始化操作：

```javascript
wx.cloud.callFunction({
  name: 'tempInitFunctionPayment',
  data: {
    action: 'initAll'
  }
}).then(res => {
  console.log('初始化结果:', res.result);
  
  if (res.result.success) {
    console.log('✅ 初始化成功！');
    console.log('商品数据:', res.result.products);
    console.log('用户类型:', res.result.userTypes);
  } else {
    console.error('❌ 初始化失败');
  }
});
```

### 方式2：分步执行

#### 步骤1：初始化商品数据

```javascript
wx.cloud.callFunction({
  name: 'tempInitFunctionPayment',
  data: {
    action: 'initProducts'
  }
}).then(res => {
  console.log('商品初始化结果:', res.result);
  
  if (res.result.success) {
    console.log('✅ 成功添加商品:', res.result.added);
    console.log('跳过的商品:', res.result.skipped);
    console.log('总商品数:', res.result.totalProducts);
  }
});
```

#### 步骤2：验证商品数据

```javascript
wx.cloud.callFunction({
  name: 'tempInitFunctionPayment',
  data: {
    action: 'validateProducts'
  }
}).then(res => {
  console.log('商品验证结果:', res.result);
  
  if (res.result.valid) {
    console.log('✅ 商品数据验证通过');
  } else {
    console.error('❌ 商品数据验证失败:', res.result.issues);
  }
});
```

#### 步骤3：更新用户类型配置

```javascript
wx.cloud.callFunction({
  name: 'tempInitFunctionPayment',
  data: {
    action: 'updateUserTypes'
  }
}).then(res => {
  console.log('用户类型更新结果:', res.result);
  
  if (res.result.success) {
    console.log('✅ 成功更新用户类型:', res.result.updated);
    console.log('使用集合:', res.result.collection);
  }
});
```

#### 步骤4：验证用户类型配置

```javascript
wx.cloud.callFunction({
  name: 'tempInitFunctionPayment',
  data: {
    action: 'validateUserTypes'
  }
}).then(res => {
  console.log('用户类型验证结果:', res.result);
  
  if (res.result.valid) {
    console.log('✅ 用户类型配置验证通过');
    console.log('用户类型列表:', res.result.userTypes);
  } else {
    console.error('❌ 验证失败:', res.result.issues);
  }
});
```

### 方式3：验证所有数据

```javascript
wx.cloud.callFunction({
  name: 'tempInitFunctionPayment',
  data: {
    action: 'validateAll'
  }
}).then(res => {
  console.log('完整验证结果:', res.result);
  
  if (res.result.success) {
    console.log('✅ 所有数据验证通过');
  } else {
    console.error('❌ 存在问题');
    console.log('商品问题:', res.result.products.issues);
    console.log('用户类型问题:', res.result.userTypes.issues);
  }
});
```

## 🎯 可用的 Action

| Action | 说明 | 返回值 |
|--------|------|--------|
| `initAll` | 一键初始化所有数据（推荐） | 完整的初始化和验证结果 |
| `initProducts` | 初始化功能商品数据 | 添加、跳过、错误的商品列表 |
| `validateProducts` | 验证商品数据完整性 | 验证结果和问题列表 |
| `updateUserTypes` | 更新用户类型配额配置 | 更新、跳过、错误的类型列表 |
| `validateUserTypes` | 验证用户类型配置 | 验证结果和问题列表 |
| `validateAll` | 验证所有数据 | 完整的验证结果 |

## 📊 初始化内容

### 功能商品（2个）

| 功能编码 | 功能名称 | 价格 | 目标云函数 |
|---------|---------|------|-----------|
| wisdom_insight | 智慧洞见 | 190分（1.9元） | cozeFunctions_v1_3 |
| ai_report | AI出报告 | 990分（9.9元） | cozeFunctions_v1_3 |

### 用户类型配额（3个）

| 用户类型 | 智慧洞见/天 | AI出报告/天 |
|---------|------------|------------|
| guest | 1次 | 0次（不可用） |
| normal | 3次 | 1次 |
| premium | 无限 | 无限 |

## ✅ 验收标准

### 商品数据验证
- [ ] function_products 表有2条记录
- [ ] 智慧洞见价格为190分
- [ ] AI出报告价格为990分
- [ ] callConfig 配置正确
- [ ] grantData 配置正确

### 用户类型配置验证
- [ ] 自动检测到用户类型表（static_user_types 或 user_types）
- [ ] 3个用户类型都已更新配额字段
- [ ] guest: dailyWisdomInsightQuota=1, dailyAiReportQuota=0
- [ ] normal: dailyWisdomInsightQuota=3, dailyAiReportQuota=1
- [ ] premium: dailyWisdomInsightQuota=-1, dailyAiReportQuota=-1

## 🛠️ 故障排查

### 问题1：集合不存在
**错误：** `collection not found`
**解决：** 先在云开发控制台创建集合

### 问题2：唯一索引冲突
**错误：** `duplicate key error`
**解决：** 已存在相同 functionCode 的商品，使用 `initProducts` action 会自动跳过

### 问题3：用户类型表未找到
**错误：** `未找到用户类型表`
**解决：** 检查用户类型表名称是否为 `static_user_types` 或 `user_types`

### 问题4：配额字段已存在
**行为：** 自动跳过已有配额配置的用户类型
**说明：** 这是正常行为，避免覆盖现有配置

## 🔄 重复执行

此云函数支持重复执行：
- ✅ 已存在的商品会被跳过
- ✅ 已有配额配置的用户类型会被跳过
- ✅ 不会产生重复数据

## 🗑️ 清理

初始化完成并验证通过后，可以删除此云函数：

1. 在云开发控制台 → 云函数
2. 找到 `tempInitFunctionPayment`
3. 删除

## 📞 测试调用

### 在小程序端测试

在任意页面的 `onLoad` 中调用：

```javascript
onLoad() {
  // 一键初始化
  wx.cloud.callFunction({
    name: 'tempInitFunctionPayment',
    data: { action: 'initAll' }
  }).then(res => {
    console.log('初始化结果:', res.result);
  }).catch(err => {
    console.error('调用失败:', err);
  });
}
```

### 在云开发控制台测试

1. 进入云开发控制台
2. 选择云函数 → tempInitFunctionPayment
3. 点击"测试"
4. 输入测试参数：
   ```json
   {
     "action": "initAll"
   }
   ```
5. 点击"测试运行"

## ⏭️ 下一步

初始化完成后：
1. 验证数据（使用 `validateAll` action）
2. 在云开发控制台查看数据
3. 进入 Phase 2：配额管理云函数开发

---

**创建时间：** 2024年12月18日  
**用途：** Phase 1 数据初始化  
**状态：** 临时云函数（完成后可删除）

