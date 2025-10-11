# 云函数公共模块使用文档

## 概述

本目录包含云函数公共模块，用于提供可复用的功能和工具函数，避免代码重复。

## 模块列表

### 1. userTypeConfig.js - 用户类型配置模块

提供用户类型配置的获取和管理功能，支持缓存机制。

#### 主要函数

- `getUserTypeConfig(typeCode)` - 获取用户类型配置（带缓存）
- `getDefaultConfig(typeCode)` - 获取默认配置
- `clearCache()` - 清除缓存
- `getUserPermissionsAndQuota(user)` - 获取用户权限和配额信息

#### 使用示例

```javascript
const { getUserTypeConfig, getUserPermissionsAndQuota } = require('../common/userTypeConfig');

// 获取用户类型配置
const config = await getUserTypeConfig('normal');

// 获取用户权限和配额
const userPermissions = await getUserPermissionsAndQuota(user);
```

### 2. responseHelper.js - 响应处理模块

提供统一的响应格式处理功能。

#### 主要函数

- `success(data, message)` - 创建成功响应
- `error(errorMessage, code, data)` - 创建错误响应
- `paginated(items, total, page, limit, message)` - 创建分页响应
- `profileListResponse(profiles, total, page, limit)` - 创建档案列表响应
- `quotaExceededResponse(userType, typeName, currentCount, quota)` - 创建配额超限响应

#### 使用示例

```javascript
const { success, error, profileListResponse } = require('../common/responseHelper');

// 成功响应
return success(data, '操作成功');

// 错误响应
return error('操作失败', -1);

// 档案列表响应
return profileListResponse(profiles, total, page, limit);
```

### 3. validators.js - 数据验证模块

提供数据验证功能，确保数据完整性和正确性。

#### 主要函数

- `validateProfileData(profileData)` - 验证档案数据
- `validateUserData(userData)` - 验证用户数据
- `validatePaginationParams(queryData)` - 验证分页参数
- `validateProfileId(profileId)` - 验证档案ID
- `validateBirthDate(birthDate)` - 验证出生日期

#### 使用示例

```javascript
const { validateProfileData, validatePaginationParams } = require('../common/validators');

// 验证档案数据
const validation = validateProfileData(profileData);
if (!validation.isValid) {
  return error(validation.errors.join(', '), -4);
}

// 验证分页参数
const paginationValidation = validatePaginationParams(queryData);
if (!paginationValidation.isValid) {
  return error(paginationValidation.errors.join(', '), -2);
}
```

### 4. errorCodes.js - 错误码定义

定义统一的错误码和错误消息。

#### 主要功能

- `ERROR_CODES` - 错误码常量
- `ERROR_MESSAGES` - 错误消息映射
- `getErrorMessage(errorCode, customMessage)` - 获取错误消息
- `createError(errorCode, customMessage, data)` - 创建标准错误对象
- `isValidErrorCode(errorCode)` - 检查错误码是否有效

#### 使用示例

```javascript
const { ERROR_CODES, createError } = require('../common/errorCodes');

// 使用预定义错误码
return createError(ERROR_CODES.PROFILE_NOT_FOUND);

// 使用自定义错误消息
return createError(ERROR_CODES.VALIDATION_FAILED, '档案名称不能为空');
```

## 缓存机制

### userTypeConfig 缓存

- 缓存时长：5分钟
- 缓存内容：用户类型配置数据
- 自动失效：超过缓存时长后自动重新获取
- 手动清除：调用 `clearCache()` 函数

## 错误处理

所有模块都包含完整的错误处理机制：

1. **参数验证**：检查输入参数的有效性
2. **异常捕获**：捕获并记录所有异常
3. **默认值提供**：在获取失败时提供合理的默认值
4. **详细日志**：记录详细的操作日志用于调试

## 最佳实践

1. **优先使用公共模块**：避免重复实现相同功能
2. **统一错误处理**：使用 errorCodes 模块定义错误码
3. **数据验证**：在业务逻辑前先进行数据验证
4. **缓存利用**：合理利用缓存机制提高性能
5. **日志记录**：记录关键操作和错误信息

## 注意事项

1. 所有模块都依赖 `wx-server-sdk`，确保云函数已正确初始化
2. 缓存机制基于内存，云函数重启后缓存会丢失
3. 错误码和消息可以根据业务需要扩展
4. 验证函数返回的验证结果对象，需要检查 `isValid` 字段
