# 档案管理云函数API文档 v1.1

## 接口概述
档案管理云函数提供八字档案的创建、查询、更新和删除功能，支持用户创建多个生辰八字档案。

## 接口地址
`profileManagement_v1_1` 云函数

## 请求方式
POST（云函数调用）

## 功能说明
档案管理云函数采用action模式，支持以下操作：
- createProfile: 创建八字档案
- getProfiles: 获取用户的所有档案
- getProfile: 获取单个档案详情
- updateProfile: 更新档案信息（v1.1新增：返回完整档案数据）
- deleteProfile: 删除档案（软删除）
- searchProfile: 搜索档案

## 版本更新说明

### v1.1 更新内容
- **自动八字计算**：createProfile和updateProfile现在自动计算八字数据，无需客户端传入
- **createProfile 方法增强**：现在返回完整的ProfileBean数据，包含所有字段
- **updateProfile 方法增强**：现在返回更新后的完整ProfileBean数据，自动重新计算八字
- **数据一致性提升**：所有操作都返回完整的档案信息，客户端可直接使用
- **客户端简化**：减少客户端手动构建档案对象的复杂度，直接使用云函数返回的数据
- **性能优化**：减少网络请求次数，服务端统一处理八字计算
- **时间处理修复**：修复了时区处理问题，确保八字计算使用正确的北京时间

## API列表

### 1. 创建八字档案

#### 请求参数
```javascript
{
  "action": "createProfile",
  "data": {
    "profileName": "我的生辰八字",
    "birthDate": {
      "year": 1990,
      "month": 5,
      "day": 15,
      "hour": 14,
      "minute": 30,
      "isLunar": false
    },
    "gender": 1,
    "isUncertainTime": false,
    "description": "本人生辰八字档案"
  }
}
```

#### 参数说明
| 参数名 | 类型 | 必填 | 说明 |
|-----|---|---|---|
| action | string | 是 | 操作类型，固定为"createProfile" |
| data.profileName | string | 是 | 档案名称 |
| data.birthDate | object | 是 | 生日信息对象 |
| data.birthDate.year | number | 是 | 出生年份 |
| data.birthDate.month | number | 是 | 出生月份(1-12) |
| data.birthDate.day | number | 是 | 出生日期(1-31) |
| data.birthDate.hour | number | 是 | 出生时辰(0-23) |
| data.birthDate.minute | number | 否 | 出生分钟(0-59) |
| data.birthDate.isLunar | boolean | 否 | 是否为农历 |
| data.gender | number | 否 | 性别(0:未知,1:男,2:女) |
| data.isUncertainTime | boolean | 否 | 是否不确定时辰信息 |
| data.description | string | 否 | 档案描述 |

**注意**：baziData参数已移除，云函数会自动根据birthDate计算八字数据

#### 成功响应
```json
{
  "success": true,
  "message": "档案创建成功",
  "data": {
    "profileId": "profile_60a1b2c3d4e5f6789abcdef1",
    "profile": {
      "_id": "profile_60a1b2c3d4e5f6789abcdef1",
      "userId": "user_60a1b2c3d4e5f6789abcdef1",
      "openid": "o1234567890abcdef",
      "profileName": "我的生辰八字",
      "birthDate": {
        "year": 1990,
        "month": 5,
        "day": 15,
        "hour": 14,
        "minute": 30,
        "isLunar": false
      },
      "baziData": {
        "year": {
          "gan": "庚",
          "zhi": "午",
          "ganzhiIndex": 7
        },
        "month": {
          "gan": "辛",
          "zhi": "巳",
          "ganzhiIndex": 18
        },
        "day": {
          "gan": "甲",
          "zhi": "戌",
          "ganzhiIndex": 11
        },
        "hour": {
          "gan": "辛",
          "zhi": "未",
          "ganzhiIndex": 8
        }
      },
      "gender": 1,
      "isUncertainTime": false,
      "description": "本人生辰八字档案",
      "createTime": "2023-09-14T08:00:00.000Z",
      "updateTime": "2023-09-14T08:00:00.000Z",
      "isActive": true
    }
  }
}
```

### 2. 获取用户的所有档案

#### 请求参数
```javascript
{
  "action": "getProfiles",
  "data": {
    "page": 1,
    "limit": 20
  }
}
```

#### 参数说明
| 参数名 | 类型 | 必填 | 说明 |
|-----|---|---|---|
| action | string | 是 | 操作类型，固定为"getProfiles" |
| data.page | number | 否 | 页码，默认1 |
| data.limit | number | 否 | 每页数量，默认20 |

#### 成功响应
```json
{
  "success": true,
  "data": {
    "profiles": [
      {
        "_id": "profile_60a1b2c3d4e5f6789abcdef1",
        "profileName": "我的生辰八字",
        "birthDate": {
          "year": 1990,
          "month": 5,
          "day": 15,
          "hour": 14,
          "minute": 30,
          "isLunar": false
        },
        "baziData": {
          // 八字数据
        },
        "createTime": "2023-09-14T08:00:00.000Z"
      }
    ],
    "total": 5,
    "page": 1,
    "limit": 20,
    "hasMore": false
  }
}
```

### 3. 获取单个档案详情

#### 请求参数
```javascript
{
  "action": "getProfile",
  "data": {
    "profileId": "profile_60a1b2c3d4e5f6789abcdef1"
  }
}
```

#### 参数说明
| 参数名 | 类型 | 必填 | 说明 |
|-----|---|---|---|
| action | string | 是 | 操作类型，固定为"getProfile" |
| data.profileId | string | 是 | 档案ID |

#### 成功响应
```json
{
  "success": true,
  "data": {
    "_id": "profile_60a1b2c3d4e5f6789abcdef1",
    "profileName": "我的生辰八字",
    "birthDate": {
      "year": 1990,
      "month": 5,
      "day": 15,
      "hour": 14,
      "minute": 30,
      "isLunar": false
    },
    "baziData": {
      // 完整的八字数据
    },
    "gender": 1,
    "description": "本人生辰八字档案",
    "createTime": "2023-09-14T08:00:00.000Z",
    "updateTime": "2023-09-14T08:00:00.000Z"
  }
}
```

### 4. 更新档案信息（v1.1增强）

#### 请求参数
```javascript
{
  "action": "updateProfile",
  "data": {
    "profileId": "profile_60a1b2c3d4e5f6789abcdef1",
    "profileName": "更新后的档案名称",
    "description": "更新后的描述"
  }
}
```

#### 参数说明
| 参数名 | 类型 | 必填 | 说明 |
|-----|---|---|---|
| action | string | 是 | 操作类型，固定为"updateProfile" |
| data.profileId | string | 是 | 档案ID |
| data.* | any | 否 | 要更新的字段 |

#### 成功响应（v1.1新增）
```json
{
  "success": true,
  "message": "档案更新成功",
  "data": {
    "_id": "profile_60a1b2c3d4e5f6789abcdef1",
    "profileName": "更新后的档案名称",
    "birthDate": {
      "year": 1990,
      "month": 5,
      "day": 15,
      "hour": 14,
      "minute": 30,
      "isLunar": false
    },
    "baziData": {
      "year": {
        "gan": "庚",
        "zhi": "午",
        "ganzhiIndex": 7
      },
      "month": {
        "gan": "辛",
        "zhi": "巳",
        "ganzhiIndex": 18
      },
      "day": {
        "gan": "甲",
        "zhi": "戌",
        "ganzhiIndex": 11
      },
      "hour": {
        "gan": "辛",
        "zhi": "未",
        "ganzhiIndex": 8
      }
    },
    "gender": 1,
    "isUncertainTime": false,
    "description": "更新后的描述",
    "createTime": "2023-09-14T08:00:00.000Z",
    "updateTime": "2023-09-14T08:30:00.000Z",
    "isActive": true
  }
}
```

### 5. 删除档案

#### 请求参数
```javascript
{
  "action": "deleteProfile",
  "data": {
    "profileId": "profile_60a1b2c3d4e5f6789abcdef1"
  }
}
```

#### 参数说明
| 参数名 | 类型 | 必填 | 说明 |
|-----|---|---|---|
| action | string | 是 | 操作类型，固定为"deleteProfile" |
| data.profileId | string | 是 | 档案ID |

### 6. 搜索档案

#### 请求参数
```javascript
{
  "action": "searchProfile",
  "data": {
    "birthDate": {
      "year": 1990,
      "month": 5,
      "day": 15,
      "hour": 14
    }
  }
}
```

#### 参数说明
| 参数名 | 类型 | 必填 | 说明 |
|-----|---|---|---|
| action | string | 是 | 操作类型，固定为"searchProfile" |
| data.birthDate | object | 否 | 生日搜索条件 |

#### 成功响应
```json
{
  "success": true,
  "data": {
    "profiles": [
      // 匹配的档案列表
    ],
    "count": 2
  }
}
```

## 错误响应
```json
{
  "success": false,
  "error": "错误信息描述"
}
```

## 使用示例

### JavaScript调用示例
```javascript
// 创建档案（v1.1简化版 - 无需传入八字数据）
const createResult = await wx.cloud.callFunction({
  name: 'profileManagement_v1_1',
  data: {
    action: 'createProfile',
    data: {
      profileName: '我的八字',
      birthDate: { 
        year: 1990, 
        month: 5, 
        day: 15, 
        hour: 14, 
        minute: 30,
        isLunar: false 
      },
      gender: 1,
      isUncertainTime: false,
      description: '本人生辰八字档案'
    }
  }
});

// 使用创建后的完整ProfileBean数据（包含自动计算的八字数据）
if (createResult.result.success) {
  const newProfile = createResult.result.data.profile; // 完整的ProfileBean数据
  console.log('新创建的档案:', newProfile);
  console.log('自动计算的八字数据:', newProfile.baziData);
  // 可以直接添加到ProfileManager
  profileManager.addProfile(newProfile);
}

// 更新档案（v1.1增强 - 自动重新计算八字）
const updateResult = await wx.cloud.callFunction({
  name: 'profileManagement_v1_1',
  data: {
    action: 'updateProfile',
    data: {
      profileId: 'profile_60a1b2c3d4e5f6789abcdef1',
      profileName: '更新后的名称',
      birthDate: { 
        year: 1990, 
        month: 6, 
        day: 15, 
        hour: 14 
      } // 如果更新了出生日期，会自动重新计算八字
    }
  }
});

// 使用更新后的完整ProfileBean数据（包含重新计算的八字数据）
if (updateResult.result.success) {
  const updatedProfile = updateResult.result.data; // 完整的ProfileBean数据
  console.log('更新后的档案:', updatedProfile);
  console.log('重新计算的八字数据:', updatedProfile.baziData);
  // 可以直接更新ProfileManager
  profileManager.updateProfile(updatedProfile._id, updatedProfile);
}
```

## 注意事项
1. 所有操作都基于用户的openid进行权限控制
2. 档案支持软删除，通过isActive字段控制
3. 搜索功能支持按生日精确匹配
4. 档案数据包含完整的生辰八字信息
5. 建议单个用户档案数量控制在100个以内
6. 分页查询避免一次性加载过多数据
7. **v1.1版本**：createProfile和updateProfile现在返回完整的ProfileBean数据，客户端可直接使用
8. **自动八字计算**：云函数会自动根据birthDate计算八字数据，无需客户端传入baziData
9. **数据一致性**：更新出生日期时会自动重新计算八字，确保数据一致性
10. **性能优化**：减少网络请求次数，服务端统一处理八字计算
11. **ProfileBean数据**：云函数返回的数据已包含所有必要字段，无需客户端重新构建
12. **客户端简化**：客户端只需传入基本信息，八字计算由服务端处理

## 版本历史

### v1.1 (2024-01-XX)
- **重大更新**：自动八字计算功能，createProfile和updateProfile无需客户端传入baziData
- **新增功能**：createProfile和updateProfile方法现在返回完整的ProfileBean数据
- **改进**：提升数据一致性，简化客户端处理逻辑
- **性能优化**：减少网络请求次数，服务端统一处理八字计算
- **架构优化**：客户端只需传入基本信息，八字计算由服务端自动处理
- **时间处理修复**：修复了时区处理问题，确保八字计算使用正确的北京时间
- **兼容性**：与v1.0版本完全兼容，仅增强功能

### v1.0 (2023-09-14)
- **初始版本**：基础档案管理功能
- **功能**：创建、查询、更新、删除、搜索档案
