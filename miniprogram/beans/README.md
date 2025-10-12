# Bean层使用文档

## 概述

Bean层是项目架构中的数据层，负责处理云函数返回的数据格式化和验证。所有云函数返回的数据都必须通过Bean函数处理，确保数据的安全性和一致性。

**所有Bean类都继承自BaseBean，BaseBean又继承自BaseClass。**

## 继承关系

```
BaseClass (顶层基类)
  └── BaseBean (数据Bean基类)
        ├── UserBean (用户数据Bean)
        ├── ProfileBean (档案数据Bean)
        └── BaziBean (八字数据Bean)
  
  └── ResponseBean (云函数响应Bean，直接继承BaseClass)
```

**注意**：ResponseBean由于其特殊性（处理云函数响应而非数据模型），直接继承BaseClass而非BaseBean。

## 设计原则

1. **数据安全检查**：所有Bean类都进行字段存在性检查和数据类型验证
2. **默认值提供**：为所有字段提供合理的默认值，避免程序崩溃
3. **详细错误日志**：通过BaseClass提供的统一日志功能记录详细日志
4. **业务方法封装**：提供业务相关的便捷方法
5. **继承复用**：通过继承BaseBean复用通用的数据处理功能

## Bean类说明

### BaseBean - 数据Bean基类

BaseBean是所有数据Bean的基类，提供通用的数据处理功能。

#### 核心功能

1. **字段提取与验证**
   - `_getField(obj, fieldName, defaultValue, expectedType)` - 安全地获取字段值
   - `_getNestedField(obj, path, defaultValue)` - 获取嵌套字段值
   - `_validateRequiredField(fieldName, value)` - 验证必需字段
   - `_validateFieldType(fieldName, value, expectedType)` - 验证字段类型
   - `_validateFieldRange(fieldName, value, min, max)` - 验证数值范围
   - `_validateStringLength(fieldName, value, minLength, maxLength)` - 验证字符串长度
   - `_validateArray(fieldName, value, minLength)` - 验证数组

2. **数据转换**
   - `toObject()` - 转换为普通对象
   - `toJSON(pretty)` - 转换为JSON字符串
   - `getRawData()` - 获取原始数据
   - `clone()` - 克隆Bean实例
   - `merge(newData)` - 合并数据

3. **验证管理**
   - `hasValidationErrors()` - 是否有验证错误
   - `getValidationErrors()` - 获取验证错误列表
   - `isValid()` - 是否验证通过

#### 使用示例

```javascript
const { BaseBean } = require('./BaseBean');

class MyBean extends BaseBean {
  constructor(data) {
    super(data); // 必须调用
    
    // 使用_getField提取字段（带类型检查）
    this.id = this._getField(this.data, 'id', '', 'string');
    this.name = this._getField(this.data, 'name', '', 'string');
    this.age = this._getField(this.data, 'age', 0, 'number');
    
    // 获取嵌套字段
    this.city = this._getNestedField(this.data, 'address.city', '');
    
    // 执行验证
    this._validate();
  }
  
  _validate() {
    // 验证必需字段
    this._validateRequiredField('id', this.id);
    this._validateRequiredField('name', this.name);
    
    // 验证字段类型
    this._validateFieldType('age', this.age, 'number');
    
    // 验证数值范围
    this._validateFieldRange('age', this.age, 0, 150);
    
    // 验证字符串长度
    this._validateStringLength('name', this.name, 1, 50);
    
    this._isValidated = true;
  }
}
```

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
2. **继承BaseBean**（而不是从零开始）
3. 在构造函数中调用`super(data)`
4. 使用`_getField`方法提取字段
5. 实现`_validate`方法进行数据验证
6. 添加业务相关的便捷方法
7. 在`index.js`中导出新Bean
8. 更新使用文档

#### 新Bean类模板

```javascript
const { BaseBean } = require('./BaseBean');

class NewBean extends BaseBean {
  constructor(data) {
    super(data); // 必须调用
    
    // 提取字段
    this.field1 = this._getField(this.data, 'field1', '', 'string');
    this.field2 = this._getField(this.data, 'field2', 0, 'number');
    
    // 执行验证
    this._validate();
  }
  
  _validate() {
    // 验证逻辑
    this._validateRequiredField('field1', this.field1);
    this._validateFieldType('field2', this.field2, 'number');
    
    this._isValidated = true;
  }
  
  // 业务方法
  getDisplayName() {
    return `${this.field1} - ${this.field2}`;
  }
}

module.exports = { NewBean };
```

### 添加新的验证规则

1. 在`_validate`方法中添加新的验证逻辑
2. 使用`this._addValidationError(fieldName, message)`记录验证错误
3. 可以使用BaseBean提供的验证方法：
   - `_validateRequiredField` - 验证必需字段
   - `_validateFieldType` - 验证字段类型
   - `_validateFieldRange` - 验证数值范围
   - `_validateStringLength` - 验证字符串长度
   - `_validateArray` - 验证数组
4. 提供合理的默认值（在`_getField`调用时设置）
5. 更新文档说明

#### 自定义验证示例

```javascript
_validate() {
  // 使用BaseBean提供的验证方法
  this._validateRequiredField('email', this.email);
  
  // 自定义验证逻辑
  if (this.email && !this._isValidEmail(this.email)) {
    this._addValidationError('email', '邮箱格式不正确');
  }
  
  this._isValidated = true;
}

_isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
```

## 注意事项

1. **性能考虑**：Bean类会进行数据验证，在大量数据处理时注意性能
2. **内存使用**：Bean对象会保存完整的数据副本，注意内存使用
3. **错误处理**：Bean验证失败不会抛出异常，而是记录日志并设置默认值
4. **向后兼容**：修改Bean类时注意保持向后兼容性
