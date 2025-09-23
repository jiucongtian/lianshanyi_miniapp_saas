# 用户表 (users)

## 数据表概述
存储小程序用户的基本信息，通过微信openid进行用户身份识别和数据关联。

## 数据表名称
`users`

## 字段定义

| 字段名 | 类型 | 必填 | 索引 | 说明 |
|--------|------|------|------|------|
| _id | string | 是 | 主键 | 系统自动生成的文档ID |
| openid | string | 是 | 唯一索引 | 微信用户openid，用于用户身份识别 |
| unionid | string | 否 | 索引 | 微信用户unionid，用于跨应用用户识别 |
| nickName | string | 否 | - | 用户昵称 |
| avatarUrl | string | 否 | - | 用户头像URL |
| gender | number | 否 | - | 用户性别(0:未知,1:男,2:女) |
| country | string | 否 | - | 用户所在国家 |
| province | string | 否 | - | 用户所在省份 |
| city | string | 否 | - | 用户所在城市 |
| language | string | 否 | - | 用户语言 |
| createTime | date | 是 | - | 用户首次使用时间 |
| updateTime | date | 是 | - | 用户信息最后更新时间 |
| lastLoginTime | date | 否 | - | 用户最后登录时间 |
| userLevel | string | 否 | 索引 | 用户级别(normal:普通用户,primary:初阶用户,internal:内部用户)，默认normal |
| isActive | boolean | 否 | - | 用户是否活跃状态，默认true |

## 数据示例

```json
{
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
```

## 索引设计

### 主要索引
- `openid`: 唯一索引，用于快速查找用户
- `unionid`: 普通索引，用于跨应用用户识别
- `userLevel`: 普通索引，用于按用户级别查询和统计

### 查询优化
- 通过openid查询用户是最常用的查询方式，设置为唯一索引
- unionid用于跨应用场景，设置为普通索引
- userLevel用于用户级别管理和权限控制，设置为普通索引
- createTime可用于用户增长分析

## 与其他数据表的关系

### 关联表
- **profiles表**: 一对多关系
  - 外键: `profiles.userId` 关联 `users._id`
  - 关系描述: 一个用户可以创建多个生辰八字档案

## 业务规则

1. **用户唯一性**: 通过openid保证用户唯一性
2. **数据完整性**: openid为必填字段，其他字段可选
3. **时间戳管理**: createTime在创建时设置，updateTime在每次更新时自动更新
4. **软删除**: 使用isActive字段进行软删除，不直接删除用户数据
5. **用户级别管理**: 
   - 新用户默认级别为"normal"（普通用户）
   - 级别可选值：normal（普通用户）、primary（初阶用户）、internal（内部用户）
   - 用户级别变更需要管理员权限或特定业务逻辑触发

## 扩展性考虑

1. **用户权限系统**: 基于userLevel可以扩展更细粒度的权限控制
2. **用户偏好设置**: 可添加preferences对象字段存储用户个性化设置
3. **统计数据**: 可添加profileCount、lastActiveTime等统计字段
4. **第三方集成**: unionid字段为后续跨平台集成预留
5. **级别升级机制**: 可添加levelUpgradeTime、upgradeReason等字段记录级别变更历史
