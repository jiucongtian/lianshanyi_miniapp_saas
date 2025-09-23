# 用户管理云函数API文档

## 接口概述
用户管理云函数提供用户注册、信息获取和更新等功能，基于微信小程序的openid进行用户身份识别。

## 接口地址
`userManagement` 云函数

## 请求方式
POST（云函数调用）

## 功能说明
用户管理云函数采用action模式，根据不同的action参数执行不同的操作：
- createUser: 创建或更新用户信息
- getUserInfo: 获取用户信息
- updateUserInfo: 更新用户信息
- updateUserLevel: 更新用户级别（管理员功能）
- getUsersByLevel: 按级别查询用户列表
- getUserLevelStats: 获取用户级别统计

## API列表

### 1. 创建或更新用户信息

#### 请求参数
```javascript
{
  "action": "createUser",
  "data": {
    "nickName": "张三",
    "avatarUrl": "https://thirdwx.qlogo.cn/mmopen/xxxxx",
    "gender": 1,
    "country": "中国",
    "province": "北京",
    "city": "北京",
    "language": "zh_CN"
  }
}
```

#### 参数说明
| 参数名 | 类型 | 必填 | 说明 |
|-----|---|---|---|
| action | string | 是 | 操作类型，固定为"createUser" |
| data | object | 否 | 用户数据对象 |
| data.nickName | string | 否 | 用户昵称 |
| data.avatarUrl | string | 否 | 用户头像URL |
| data.gender | number | 否 | 用户性别(0:未知,1:男,2:女) |
| data.country | string | 否 | 用户所在国家 |
| data.province | string | 否 | 用户所在省份 |
| data.city | string | 否 | 用户所在城市 |
| data.language | string | 否 | 用户语言 |

#### 成功响应
```json
{
  "success": true,
  "message": "用户创建成功",
  "data": {
    "userId": "user_60a1b2c3d4e5f6789abcdef0",
    "isNewUser": true
  }
}
```

#### 响应字段说明
| 字段名 | 类型 | 说明 |
|-----|---|---|
| success | boolean | 操作是否成功 |
| message | string | 操作结果消息 |
| data.userId | string | 用户ID |
| data.isNewUser | boolean | 是否为新用户 |

### 2. 获取用户信息

#### 请求参数
```javascript
{
  "action": "getUserInfo"
}
```

#### 参数说明
| 参数名 | 类型 | 必填 | 说明 |
|-----|---|---|---|
| action | string | 是 | 操作类型，固定为"getUserInfo" |

#### 成功响应
```json
{
  "success": true,
  "data": {
    "_id": "user_60a1b2c3d4e5f6789abcdef0",
    "openid": "oABCD1234567890abcdef1234567890ab",
    "unionid": "uABCD1234567890abcdef1234567890ab",
    "nickName": "张三",
    "avatarUrl": "https://thirdwx.qlogo.cn/mmopen/xxxxx",
    "gender": 1,
    "country": "中国",
    "province": "北京",
    "city": "北京",
    "language": "zh_CN",
    "createTime": "2023-09-14T08:00:00.000Z",
    "updateTime": "2023-09-14T08:00:00.000Z",
    "lastLoginTime": "2023-09-14T08:00:00.000Z",
    "userLevel": "normal",
    "isActive": true
  }
}
```

### 3. 更新用户信息

#### 请求参数
```javascript
{
  "action": "updateUserInfo",
  "data": {
    "nickName": "李四",
    "gender": 2
  }
}
```

#### 参数说明
| 参数名 | 类型 | 必填 | 说明 |
|-----|---|---|---|
| action | string | 是 | 操作类型，固定为"updateUserInfo" |
| data | object | 是 | 要更新的用户数据 |

#### 成功响应
```json
{
  "success": true,
  "message": "用户信息更新成功"
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
// 创建用户
const createResult = await wx.cloud.callFunction({
  name: 'userManagement',
  data: {
    action: 'createUser',
    data: {
      nickName: '张三',
      gender: 1
    }
  }
});

// 获取用户信息
const getUserResult = await wx.cloud.callFunction({
  name: 'userManagement',
  data: {
    action: 'getUserInfo'
  }
});

// 更新用户信息
const updateResult = await wx.cloud.callFunction({
  name: 'userManagement',
  data: {
    action: 'updateUserInfo',
    data: {
      nickName: '李四'
    }
  }
});
```

### 4. 更新用户级别

#### 请求参数
```javascript
{
  "action": "updateUserLevel",
  "data": {
    "targetOpenid": "oABCD1234567890abcdef1234567890ab",
    "newLevel": "primary",
    "operatorOpenid": "oXYZ9876543210fedcba9876543210xy"
  }
}
```

#### 参数说明
| 参数名 | 类型 | 必填 | 说明 |
|-----|---|---|---|
| action | string | 是 | 操作类型，固定为"updateUserLevel" |
| data.targetOpenid | string | 是 | 目标用户的openid |
| data.newLevel | string | 是 | 新的用户级别(normal/primary/internal) |
| data.operatorOpenid | string | 是 | 操作员openid |

#### 成功响应
```json
{
  "success": true,
  "message": "用户级别已更新为 primary",
  "data": {
    "targetOpenid": "oABCD1234567890abcdef1234567890ab",
    "newLevel": "primary",
    "updateTime": "2023-09-14T08:00:00.000Z"
  }
}
```

### 5. 按级别查询用户列表

#### 请求参数
```javascript
{
  "action": "getUsersByLevel",
  "data": {
    "level": "normal",
    "limit": 20,
    "skip": 0
  }
}
```

#### 参数说明
| 参数名 | 类型 | 必填 | 说明 |
|-----|---|---|---|
| action | string | 是 | 操作类型，固定为"getUsersByLevel" |
| data.level | string | 是 | 用户级别(normal/primary/internal) |
| data.limit | number | 否 | 返回数量限制，默认20 |
| data.skip | number | 否 | 跳过数量，用于分页，默认0 |

#### 成功响应
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "_id": "user_60a1b2c3d4e5f6789abcdef0",
        "openid": "oABCD1234567890abcdef1234567890ab",
        "nickName": "张三",
        "userLevel": "normal",
        "createTime": "2023-09-14T08:00:00.000Z"
      }
    ],
    "count": 1,
    "level": "normal"
  }
}
```

### 6. 获取用户级别统计

#### 请求参数
```javascript
{
  "action": "getUserLevelStats"
}
```

#### 参数说明
| 参数名 | 类型 | 必填 | 说明 |
|-----|---|---|---|
| action | string | 是 | 操作类型，固定为"getUserLevelStats" |

#### 成功响应
```json
{
  "success": true,
  "data": {
    "stats": {
      "normal": 150,
      "primary": 25,
      "internal": 5,
      "total": 180
    },
    "timestamp": "2023-09-14T08:00:00.000Z"
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
// 创建用户
const createResult = await wx.cloud.callFunction({
  name: 'userManagement',
  data: {
    action: 'createUser',
    data: {
      nickName: '张三',
      gender: 1
    }
  }
});

// 获取用户信息
const getUserResult = await wx.cloud.callFunction({
  name: 'userManagement',
  data: {
    action: 'getUserInfo'
  }
});

// 更新用户信息
const updateResult = await wx.cloud.callFunction({
  name: 'userManagement',
  data: {
    action: 'updateUserInfo',
    data: {
      nickName: '李四'
    }
  }
});

// 更新用户级别（管理员功能）
const updateLevelResult = await wx.cloud.callFunction({
  name: 'userManagement',
  data: {
    action: 'updateUserLevel',
    data: {
      targetOpenid: 'oABCD1234567890abcdef1234567890ab',
      newLevel: 'primary',
      operatorOpenid: 'oXYZ9876543210fedcba9876543210xy'
    }
  }
});

// 按级别查询用户
const getUsersByLevelResult = await wx.cloud.callFunction({
  name: 'userManagement',
  data: {
    action: 'getUsersByLevel',
    data: {
      level: 'normal',
      limit: 10
    }
  }
});

// 获取用户级别统计
const statsResult = await wx.cloud.callFunction({
  name: 'userManagement',
  data: {
    action: 'getUserLevelStats'
  }
});
```

## 用户级别说明
- **normal**: 普通用户，新注册用户的默认级别
- **primary**: 初阶用户，具有额外权限的用户
- **internal**: 内部用户，具有最高权限的用户

## 注意事项
1. 所有操作都基于微信小程序的openid进行用户识别
2. createUser操作具有幂等性，如果用户已存在则更新信息
3. 用户信息支持软删除，通过isActive字段控制
4. 首次调用会自动创建用户记录，默认级别为"normal"
5. 时间字段自动维护，无需手动设置
6. updateUserLevel功能需要管理员权限，实际使用时应添加权限验证
7. 用户级别只能是：normal、primary、internal 中的一个
