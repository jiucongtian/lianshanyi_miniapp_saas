# AddProfileController 使用文档

## 概述

AddProfileController 是添加档案页面的控制器，负责处理档案创建和编辑相关的业务逻辑，包括表单验证、配额检查、八字计算、档案保存等。

## 功能特性

- ✅ 支持创建和编辑两种模式
- ✅ 完整的表单验证（名称、出生时间等）
- ✅ 用户配额检查和升级提示
- ✅ 八字自动计算（通过云函数）
- ✅ 档案数据保存和更新
- ✅ 时间选择器集成
- ✅ 数据变化检测
- ✅ 错误处理和用户提示

## 使用方法

### 1. 基本使用

```javascript
const { AddProfileController } = require('../../controllers/AddProfileController');

Page({
  data: {
    // 页面数据
  },
  
  onLoad(options) {
    this.controller = new AddProfileController(this);
    this.controller.initialize(options);
  },
  
  // 事件处理方法
  onNameChange(e) {
    this.controller.onNameChange(e.detail.value);
  },
  
  onGenderSelect(e) {
    const gender = parseInt(e.currentTarget.dataset.gender);
    this.controller.onGenderSelect(gender);
  },
  
  onTimeConfirm(timeData) {
    this.controller.onTimeConfirm(timeData);
  },
  
  onSubmit() {
    this.controller.onSubmit();
  }
});
```

### 2. 页面模式

#### 创建模式
```javascript
// 页面参数：无或 mode !== 'edit'
this.controller.initialize({});
// 或
this.controller.initialize({ mode: 'create' });
```

#### 编辑模式
```javascript
// 页面参数：mode === 'edit'
this.controller.initialize({ mode: 'edit' });
```

## 主要方法

### 初始化方法

#### `initialize(options)`
初始化页面，根据参数判断创建/编辑模式。

**参数：**
- `options` (Object): 页面参数
  - `mode` (string): 页面模式，'edit' 为编辑模式，其他为创建模式

**示例：**
```javascript
await this.controller.initialize({ mode: 'edit' });
```

### 表单验证方法

#### `validateForm()`
验证表单数据是否有效。

**返回值：**
- `boolean`: 表单是否有效

**示例：**
```javascript
const isValid = this.controller.validateForm();
if (!isValid) {
  // 处理验证失败
}
```

### 配额检查方法

#### `checkQuota()`
检查用户是否可以创建更多档案。

**返回值：**
- `Promise<boolean>`: 是否可以创建档案

**示例：**
```javascript
const canCreate = await this.controller.checkQuota();
if (!canCreate) {
  // 显示配额超限提示
}
```

### 八字计算方法

#### `calculateBazi()`
通过创建档案实现八字计算。

**返回值：**
- `Promise<Object|null>`: 八字计算结果

**示例：**
```javascript
const result = await this.controller.calculateBazi();
if (result) {
  // 处理计算结果
}
```

### 档案操作方法

#### `saveProfile()`
保存档案（创建模式）。

**返回值：**
- `Promise<boolean>`: 是否保存成功

**示例：**
```javascript
const success = await this.controller.saveProfile();
if (success) {
  // 保存成功，跳转到卡牌页面
}
```

#### `updateProfile()`
更新档案（编辑模式）。

**返回值：**
- `Promise<boolean>`: 是否更新成功

**示例：**
```javascript
const success = await this.controller.updateProfile();
if (success) {
  // 更新成功，返回上一页
}
```

### 表单处理方法

#### `onNameChange(name)`
处理名称输入变化。

**参数：**
- `name` (string): 输入的名称

**示例：**
```javascript
this.controller.onNameChange('张三');
```

#### `onGenderSelect(gender)`
处理性别选择。

**参数：**
- `gender` (number): 性别，1=男，0=女

**示例：**
```javascript
this.controller.onGenderSelect(1); // 选择男性
```

#### `onTimeConfirm(timeData)`
处理时间选择确认。

**参数：**
- `timeData` (Object): 时间数据
  - `year` (number): 年份
  - `month` (number): 月份
  - `day` (number): 日期
  - `hour` (number): 小时
  - `minute` (number): 分钟
  - `formatedTime` (string): 格式化时间显示
  - `timeIndex` (number): 时辰索引

**示例：**
```javascript
const timeData = {
  year: 1990,
  month: 5,
  day: 15,
  hour: 14,
  minute: 30,
  formatedTime: '1990年5月15日 未时(13-15)',
  timeIndex: 6
};
this.controller.onTimeConfirm(timeData);
```

#### `onUncertainTimeToggle()`
处理不确定时辰状态切换。

**示例：**
```javascript
this.controller.onUncertainTimeToggle();
```

#### `onSubmit()`
处理表单提交。

**返回值：**
- `Promise<boolean>`: 是否提交成功

**示例：**
```javascript
const success = await this.controller.onSubmit();
```

## 数据属性

### 页面状态
- `pageMode`: 页面模式（'create' 或 'edit'）
- `editingProfileId`: 编辑模式下的档案ID
- `originalProfileData`: 原始档案数据（用于变化检测）

### 表单数据
- `formData.name`: 档案名称
- `formData.gender`: 性别（1=男，0=女）
- `birthDate`: 出生日期对象
- `formatedDateTime`: 格式化的时间显示
- `isUncertainTime`: 是否不确定时辰

### 验证状态
- `nameError`: 名称错误信息
- `isFormValid`: 表单是否有效

## 事件处理

### 页面生命周期
- `onShow()`: 页面显示时的处理
- `onHide()`: 页面隐藏时的处理
- `onUnload()`: 页面卸载时的清理

### 用户交互
- 表单输入变化自动验证
- 时间选择器集成
- 配额超限自动提示
- 数据变化检测

## 错误处理

控制器内置了完整的错误处理机制：

1. **表单验证错误**：实时显示错误信息
2. **网络请求错误**：显示友好的错误提示
3. **配额超限**：显示升级提示对话框
4. **数据异常**：自动回退到安全状态

## 注意事项

1. **页面模式**：创建和编辑模式的数据处理逻辑不同
2. **配额检查**：创建模式会自动检查用户配额
3. **数据变化**：编辑模式会检测数据是否有变化
4. **时间格式**：使用北京时间，支持时辰选择
5. **错误恢复**：所有错误都有相应的恢复机制

## 示例页面集成

```javascript
// pages/addProfile/index.js
const { AddProfileController } = require('../../controllers/AddProfileController');

Page({
  data: {
    pageMode: 'create',
    formData: {
      name: '',
      gender: 1
    },
    formatedDateTime: '',
    isFormValid: false,
    nameError: '',
    isUncertainTime: false
  },

  onLoad(options) {
    this.controller = new AddProfileController(this);
    this.controller.initialize(options);
  },

  onNameChange(e) {
    this.controller.onNameChange(e.detail.value);
  },

  onGenderSelect(e) {
    const gender = parseInt(e.currentTarget.dataset.gender);
    this.controller.onGenderSelect(gender);
  },

  onTimeConfirm(timeData) {
    this.controller.onTimeConfirm(timeData);
  },

  onUncertainTimeToggle() {
    this.controller.onUncertainTimeToggle();
  },

  async onSubmit() {
    const success = await this.controller.onSubmit();
    if (success) {
      // 提交成功，页面会自动跳转
    }
  }
});
```
