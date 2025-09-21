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

## 注意事项
1. 所有操作都基于微信小程序的openid进行用户识别
2. createUser操作具有幂等性，如果用户已存在则更新信息
3. 用户信息支持软删除，通过isActive字段控制
4. 首次调用会自动创建用户记录
5. 时间字段自动维护，无需手动设置
