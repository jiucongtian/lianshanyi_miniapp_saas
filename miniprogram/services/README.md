# Service层使用文档

## 概述

Service层是业务逻辑的核心，负责封装所有与云函数的交互，提供统一的错误处理、重试机制和数据格式化功能。

## 架构设计

```
Service层
├── BaseService.js      # 基础服务类，提供通用功能
├── UserService.js      # 用户服务类，处理用户相关业务
├── index.js           # 统一导出文件
└── README.md          # 使用文档
```

## 核心特性

### 1. 统一错误处理
- 所有云函数调用都通过ResponseBean进行统一格式化
- 自动捕获和记录错误信息
- 提供详细的错误日志用于调试

### 2. 重试机制
- 支持自动重试失败的云函数调用
- 可配置重试次数和延迟策略
- 递增延迟避免频繁重试

### 3. 数据验证
- 自动验证必需参数
- 提供参数缺失的详细错误信息
- 支持自定义验证规则

### 4. 日志记录
- 统一的日志格式和前缀
- 记录服务调用参数和结果
- 便于问题排查和性能监控

## 使用方法

### 基础用法

```javascript
// 导入服务
const { userService } = require('../services');

// 获取用户信息
const response = await userService.getUserInfo();
if (response.success) {
  const userInfo = response.data; // UserBean实例
  console.log('用户信息:', userInfo);
} else {
  console.error('获取失败:', response.error);
}
```

### 错误处理

```javascript
const response = await userService.getUserInfo();

if (!response.success) {
  // 处理错误
  switch (response.code) {
    case -1:
      console.error('网络错误');
      break;
    case -2:
      console.error('响应格式错误');
      break;
    case -3:
      console.error('参数验证失败');
      break;
    default:
      console.error('未知错误:', response.error);
  }
}
```

### 参数验证

```javascript
// 自动验证必需参数
const response = await userService.upgradeUserType('normal');
// 如果targetUserType为空，会自动返回参数验证错误
```

## API参考

### BaseService

#### callFunction(name, data)
调用云函数的基础方法

**参数:**
- `name` (string): 云函数名称
- `data` (Object): 传递给云函数的数据

**返回:** `Promise<ResponseBean>`

#### callFunctionWithRetry(name, data, retryCount)
带重试的云函数调用

**参数:**
- `name` (string): 云函数名称
- `data` (Object): 传递给云函数的数据
- `retryCount` (number): 重试次数，默认3次

**返回:** `Promise<ResponseBean>`

### UserService

#### getUserInfo()
获取当前用户信息

**返回:** `Promise<ResponseBean>`
- 成功时 `data` 为 `UserBean` 实例

#### checkQuota()
检查用户配额信息

**返回:** `Promise<ResponseBean>`

#### upgradeUserType(targetUserType, registrationData)
升级用户类型

**参数:**
- `targetUserType` (string): 目标用户类型
- `registrationData` (Object, 可选): 注册数据

**返回:** `Promise<ResponseBean>`

#### updateUserInfo(userData)
更新用户信息

**参数:**
- `userData` (Object): 要更新的用户数据

**返回:** `Promise<ResponseBean>`
- 成功时 `data` 为 `UserBean` 实例

#### createUser(userData)
创建新用户

**参数:**
- `userData` (Object): 用户数据

**返回:** `Promise<ResponseBean>`
- 成功时 `data` 为 `UserBean` 实例

#### checkUserExists()
检查用户是否存在

**返回:** `Promise<ResponseBean>`

#### getUserPermissions()
获取用户权限列表

**返回:** `Promise<ResponseBean>`

#### checkPermission(permission)
检查用户是否有特定权限

**参数:**
- `permission` (string): 权限名称

**返回:** `Promise<ResponseBean>`

## 最佳实践

### 1. 统一错误处理
```javascript
// 在Controller中使用
async loadUserInfo() {
  const response = await userService.getUserInfo();
  
  if (response.success) {
    // 处理成功情况
    this.page.setData({
      userInfo: response.data
    });
  } else {
    // 统一错误处理
    this._showError('获取用户信息失败：' + response.error);
  }
}
```

### 2. 参数验证
```javascript
// 在调用前验证参数
async updateProfile(profileData) {
  if (!profileData || !profileData.name) {
    this._showError('请填写姓名');
    return;
  }
  
  const response = await profileService.updateProfile(profileData);
  // 处理响应...
}
```

### 3. 日志记录
```javascript
// Service层会自动记录日志，无需手动添加
// 日志格式：[ServiceName] methodName 成功/失败: {参数和结果}
```

### 4. 重试机制
```javascript
// 对于关键操作，使用重试机制
const response = await userService.callFunctionWithRetry(
  'userManagement', 
  { action: 'criticalOperation' },
  5 // 重试5次
);
```

## 扩展Service

### 创建新的Service类

```javascript
const { BaseService } = require('./BaseService');
const { ResponseBean } = require('../beans/ResponseBean');

class CustomService extends BaseService {
  constructor() {
    super();
  }
  
  async customMethod(params) {
    try {
      // 验证参数
      const validation = this._validateRequiredParams(params, ['requiredField']);
      if (!validation.valid) {
        return this._createValidationError(validation.missingFields);
      }
      
      // 调用云函数
      const response = await this.callFunction('customFunction', {
        action: 'customAction',
        data: params
      });
      
      // 记录日志
      this._logServiceCall('customMethod', params, response);
      
      return response;
    } catch (error) {
      console.error('[CustomService] customMethod 异常:', error);
      return ResponseBean.error('操作失败: ' + error.message, -1);
    }
  }
}

module.exports = {
  CustomService,
  customService: new CustomService()
};
```

### 在index.js中导出

```javascript
const { CustomService, customService } = require('./CustomService');

module.exports = {
  // ... 其他导出
  CustomService,
  customService
};
```

## 注意事项

1. **所有Service方法都必须返回ResponseBean格式**
2. **成功时data字段应转换为对应的Bean类**
3. **必须添加完整的JSDoc注释**
4. **使用统一的日志前缀格式**
5. **参数验证使用内置的验证方法**
6. **错误处理要详细记录日志**

## 调试技巧

### 查看日志
```javascript
// 在开发者工具控制台中查看详细日志
// 日志格式：[ServiceName] methodName 成功/失败: {详细信息}
```

### 测试Service方法
```javascript
// 在页面中测试
Page({
  async onLoad() {
    const { userService } = require('../../services');
    
    // 测试获取用户信息
    const response = await userService.getUserInfo();
    console.log('用户信息响应:', response);
  }
});
```

## 更新日志

### v1.0.0 (2024-01-XX)
- 初始版本
- 实现BaseService基础服务类
- 实现UserService用户服务类
- 添加统一错误处理和重试机制
- 添加参数验证和日志记录功能
