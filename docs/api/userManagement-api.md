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
    "userType": "normal",
    "typeName": "探索者",
    "displayName": "探索者",
    "profileQuota": 50,
    "usedProfiles": 5,
    "permissions": ["view", "create"],
    "canCreateMore": true,
    "remainingQuota": 45,
    "adminRole": "none",
    "createTime": "2023-09-14T08:00:00.000Z",
    "updateTime": "2023-09-14T08:00:00.000Z",
    "lastLoginTime": "2023-09-14T08:00:00.000Z",
    "isActive": true
  }
}
```

#### 返回字段说明
| 字段名 | 类型 | 说明 |
|-----|---|---|
| success | boolean | 是否成功 |
| data | object | 用户信息对象 |
| data._id | string | 用户ID |
| data.openid | string | 微信openid |
| data.unionid | string | 微信unionid |
| data.nickName | string | 用户昵称 |
| data.avatarUrl | string | 用户头像URL |
| data.gender | number | 用户性别(0:未知,1:男,2:女) |
| data.userType | string | 用户类型(guest/normal/premium) |
| data.typeName | string | 用户类型名称 |
| data.displayName | string | 用户类型显示名称 |
| data.profileQuota | number | 档案配额(-1表示无限制) |
| data.usedProfiles | number | 已使用档案数 |
| data.permissions | array | 用户权限列表 |
| data.canCreateMore | boolean | 是否可以创建更多档案 |
| data.remainingQuota | number | 剩余配额(-1表示无限制) |
| data.adminRole | string | 管理员角色(none/admin/super_admin) |
| data.createTime | string | 创建时间 |
| data.updateTime | string | 更新时间 |
| data.lastLoginTime | string | 最后登录时间 |
| data.isActive | boolean | 是否活跃 |

### 3. 更新用户信息

#### 请求参数
```javascript
{
  "action": "updateUserInfo",
  "data": {
    "nickName": "李四",
    "gender": 2,
    "phoneNumber": "13800138000",
    "avatarUrl": "cloud://xxx.jpg"
  }
}
```

#### 参数说明
| 参数名 | 类型 | 必填 | 说明 |
|-----|---|---|---|
| action | string | 是 | 操作类型，固定为"updateUserInfo" |
| data | object | 是 | 要更新的用户数据 |
| data.nickName | string | 否 | 用户昵称 |
| data.gender | number | 否 | 用户性别(0:未知,1:男,2:女) |
| data.phoneNumber | string | 否 | 手机号 |
| data.avatarUrl | string | 否 | 用户头像URL |

#### 成功响应
```json
{
  "success": true,
  "message": "用户信息更新成功",
  "data": {
    "_id": "user_id",
    "openid": "user_openid",
    "unionid": "user_unionid",
    "nickName": "李四",
    "avatarUrl": "cloud://xxx.jpg",
    "gender": 2,
    "phoneNumber": "13800138000",
    "userType": "normal",
    "typeName": "探索者",
    "displayName": "探索者",
    "profileQuota": 50,
    "usedProfiles": 5,
    "permissions": ["view", "create"],
    "createTime": "2024-01-01T00:00:00.000Z",
    "updateTime": "2024-01-02T00:00:00.000Z",
    "lastLoginTime": "2024-01-02T00:00:00.000Z"
  }
}
```

#### 返回字段说明
| 字段名 | 类型 | 说明 |
|-----|---|---|
| success | boolean | 是否成功 |
| message | string | 返回消息 |
| data | object | 更新后的完整用户信息 |
| data._id | string | 用户ID |
| data.openid | string | 微信openid |
| data.nickName | string | 用户昵称 |
| data.gender | number | 用户性别 |
| data.phoneNumber | string | 手机号 |
| data.avatarUrl | string | 用户头像URL |
| data.userType | string | 用户类型(guest/normal/premium) |
| data.typeName | string | 用户类型名称 |
| data.profileQuota | number | 档案配额(-1表示无限制) |
| data.usedProfiles | number | 已使用档案数 |
| data.permissions | array | 用户权限列表 |

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

## 用户类型说明
- **guest**: 临时用户，未注册的用户，功能受限
- **normal**: 探索者，已注册的普通用户，享受基础功能
- **premium**: 高级用户，付费用户，享受全部功能

## 管理员角色说明
- **none**: 普通用户（默认），无管理后台访问权限
- **admin**: 普通管理员，可访问管理后台基础功能
- **super_admin**: 超级管理员，可访问管理后台所有功能

## 权限维度说明
用户类型（userType）和管理员角色（adminRole）是两个独立维度：
- **用户类型** 决定业务功能和配额（档案数量等）
- **管理员角色** 决定管理后台访问权限
- 两者可任意组合，互不影响

## 注意事项
1. 所有操作都基于微信小程序的openid进行用户识别
2. createUser操作具有幂等性，如果用户已存在则更新信息
3. 用户信息支持软删除，通过isActive字段控制
4. 首次调用会自动创建用户记录，默认用户类型为"guest"，管理员角色为"none"
5. 时间字段自动维护，无需手动设置
6. updateUserLevel功能需要管理员权限，实际使用时应添加权限验证
7. 用户类型只能是：guest、normal、premium 中的一个
8. 管理员角色只能是：none、admin、super_admin 中的一个
9. 管理员角色只能通过数据库直接设置，不提供云函数接口进行角色变更
10. getUserInfo 返回的数据中，adminRole 字段默认为 'none'（普通用户）
