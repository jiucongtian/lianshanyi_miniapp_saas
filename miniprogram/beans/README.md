# Bean层使用文档

## 概述

Bean层是项目架构中的数据层，负责处理云函数返回的数据格式化和验证。所有云函数返回的数据都必须通过Bean函数处理，确保数据的安全性和一致性。

## 设计原则

1. **数据安全检查**：所有Bean类都进行字段存在性检查和数据类型验证
2. **默认值提供**：为所有字段提供合理的默认值，避免程序崩溃
3. **详细错误日志**：记录详细的错误日志用于调试
4. **业务方法封装**：提供业务相关的便捷方法

## Bean类说明

### ResponseBean - 统一响应处理Bean

用于处理所有云函数返回的数据，提供统一的响应格式。

#### 主要功能
- 解析云函数返回结果
- 验证响应格式
- 提供统一的成功/失败判断
- 记录详细日志

#### 使用示例
```javascript
const { ResponseBean } = require('../beans');

// 从云函数结果创建
const response = ResponseBean.fromCloudResult(cloudResult);

// 检查是否成功
if (response.isSuccess()) {
  const data = response.getData();
  // 处理成功数据
} else {
  const error = response.getError();
  // 处理错误
}

// 创建成功响应
const successResponse = ResponseBean.success(data, '操作成功');

// 创建错误响应
const errorResponse = ResponseBean.error('操作失败', -1);
```

### UserBean - 用户数据Bean

用于处理用户相关的数据格式化和验证。

#### 主要功能
- 用户信息验证和格式化
- 权限检查方法
- 配额管理方法
- 用户类型判断

#### 使用示例
```javascript
const { UserBean } = require('../beans');

// 创建用户Bean
const userBean = new UserBean(userData);

// 检查权限
if (userBean.canCreate()) {
  // 可以创建档案
}

// 检查配额
if (userBean.canCreateMore()) {
  const remaining = userBean.getRemainingQuota();
  console.log(`剩余配额：${remaining}`);
}

// 检查用户类型
if (userBean.isGuest()) {
  // 临时用户逻辑
} else if (userBean.isPremium()) {
  // 高级用户逻辑
}
```

### ProfileBean - 档案数据Bean

用于处理档案相关的数据格式化和验证。

#### 主要功能
- 档案信息验证和格式化
- 时间格式化方法
- 八字数据转换
- 卡牌数据转换

#### 使用示例
```javascript
const { ProfileBean } = require('../beans');

// 创建档案Bean
const profileBean = new ProfileBean(profileData);

// 转换为卡牌数据
const cardData = profileBean.toCardData();

// 格式化时间显示
const birthTime = profileBean.formatBirthTime();
const lunarTime = profileBean.formatLunarTime();

// 获取八字字符串
const baziString = profileBean.getBaziString();

// 获取摘要信息
const summary = profileBean.getSummary();
```

### BaziBean - 八字数据Bean

用于处理生辰八字相关的数据格式化和验证。

#### 主要功能
- 八字数据验证和格式化
- 天干地支验证
- 农历日期处理
- 数据标准化

#### 使用示例
```javascript
const { BaziBean } = require('../beans');

// 创建八字Bean
const baziBean = new BaziBean(baziData);

// 检查数据完整性
if (baziBean.isComplete() && baziBean.isValid()) {
  // 数据有效
}

// 获取八字字符串
const baziString = baziBean.getBaziString();

// 获取各柱信息
const yearPillar = baziBean.getYearPillar();
const monthPillar = baziBean.getMonthPillar();

// 获取农历信息
if (baziBean.hasLunarDate()) {
  const lunarDate = baziBean.getLunarDateString();
}
```

## 使用规范

### 1. 必须使用Bean处理云函数返回数据

```javascript
// ❌ 错误：直接使用云函数返回数据
const result = await wx.cloud.callFunction({ name: 'userManagement' });
if (result.result.success) {
  const userInfo = result.result.data; // 直接使用，不安全
}

// ✅ 正确：使用Bean处理
const result = await wx.cloud.callFunction({ name: 'userManagement' });
const response = ResponseBean.fromCloudResult(result);
if (response.isSuccess()) {
  const userBean = new UserBean(response.getData());
  // 使用Bean处理后的安全数据
}
```

### 2. 统一错误处理

```javascript
const response = ResponseBean.fromCloudResult(cloudResult);

if (response.isError()) {
  console.error('操作失败:', response.getError());
  // 显示错误提示
  wx.showToast({
    title: response.getError(),
    icon: 'error'
  });
  return;
}

// 处理成功数据
const data = response.getData();
```

### 3. 数据验证

```javascript
const userBean = new UserBean(userData);

// Bean会自动验证数据，但也可以手动检查
if (!userBean.isValid()) {
  console.error('用户数据无效');
  return;
}

// 使用Bean提供的业务方法
if (userBean.canCreateMore()) {
  // 可以创建更多档案
}
```

## 最佳实践

1. **始终使用Bean**：所有云函数返回的数据都必须通过Bean处理
2. **检查数据有效性**：使用Bean提供的验证方法检查数据
3. **使用业务方法**：优先使用Bean提供的业务方法而不是直接访问字段
4. **错误处理**：使用ResponseBean统一处理错误
5. **日志记录**：Bean会自动记录详细日志，便于调试

## 扩展指南

### 添加新的Bean类

1. 在`beans/`目录下创建新的Bean文件
2. 继承基本的数据验证和格式化功能
3. 添加业务相关的便捷方法
4. 在`index.js`中导出新Bean
5. 更新使用文档

### 添加新的验证规则

1. 在`_validate`方法中添加新的验证逻辑
2. 使用`console.error`记录验证错误
3. 提供合理的默认值
4. 更新文档说明

## 注意事项

1. **性能考虑**：Bean类会进行数据验证，在大量数据处理时注意性能
2. **内存使用**：Bean对象会保存完整的数据副本，注意内存使用
3. **错误处理**：Bean验证失败不会抛出异常，而是记录日志并设置默认值
4. **向后兼容**：修改Bean类时注意保持向后兼容性
