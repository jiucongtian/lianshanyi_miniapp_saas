# 用户表 (users)

## 数据表概述
存储小程序用户的基本信息，通过微信openid进行用户身份识别和数据关联。支持用户分类管理和权限控制。

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
| phoneNumber | string | 否 | - | 用户手机号 |
| createTime | date | 是 | - | 用户首次使用时间 |
| updateTime | date | 是 | - | 用户信息最后更新时间 |
| lastLoginTime | date | 否 | - | 用户最后登录时间 |
| userType | string | 否 | 索引 | 用户类型(guest:临时用户,normal:普通用户,premium:高级用户)，默认guest |
| registrationTime | date | 否 | - | 用户注册时间（从临时用户升级为普通用户的时间） |
| upgradeTime | date | 否 | - | 用户升级时间（升级为高级用户的时间） |
| profileQuota | number | 否 | - | 档案配额（临时用户:3, 普通用户:20, 高级用户:无限制） |
| usedProfiles | number | 否 | - | 已使用档案数量，默认0 |
| permissions | array | 否 | - | 用户权限列表 |
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
  "phoneNumber": "13800138000",
  "createTime": "2023-09-14T08:00:00.000Z",
  "updateTime": "2023-09-14T08:00:00.000Z",
  "lastLoginTime": "2023-09-14T08:00:00.000Z",
  "userType": "guest",
  "registrationTime": null,
  "upgradeTime": null,
  "profileQuota": 1,
  "usedProfiles": 0,
  "permissions": ["view", "create_limited"],
  "isActive": true
}
```

## 索引设计

### 主要索引
- `openid`: **唯一索引**，用于快速查找用户，**必须设置以防止重复用户记录**
- `unionid`: 普通索引，用于跨应用用户识别
- `userType`: 普通索引，用于按用户类型查询和统计

### 查询优化
- 通过openid查询用户是最常用的查询方式，设置为唯一索引
- unionid用于跨应用场景，设置为普通索引
- userType用于用户分类管理和权限控制，设置为普通索引
- createTime可用于用户增长分析

### 重要提醒
⚠️ **数据库约束要求**：
- **必须为 `openid` 字段创建唯一索引**，防止同一用户创建多条记录
- 在云开发控制台中设置：数据库 → users集合 → 索引管理 → 添加索引
- 索引配置：字段名 `openid`，索引类型选择 `唯一索引`
- 如果已存在重复的openid记录，需要先清理重复数据再创建唯一索引

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
5. **用户分类管理**: 
   - 新用户默认类型为"guest"（临时用户）
   - 类型可选值：guest（临时用户）、normal（普通用户）、premium（高级用户）
   - 用户类型变更通过注册流程或付费升级触发
6. **档案配额管理**:
   - 临时用户：最多创建3个档案
   - 普通用户：最多创建20个档案
   - 高级用户：无限制创建档案
8. **权限管理**:
   - 临时用户权限：["view", "create_limited"]
   - 普通用户权限：["view", "create"]
   - 高级用户权限：["all"]

## 用户类型权限详细说明

### 临时用户 (guest)
- 档案配额：3个
- 权限范围：
  - ✅ 查看小程序基础功能
  - ✅ 进行生辰八字计算
  - ✅ 创建档案（数量限制）
  - ✅ 查看已创建的档案
  - ❌ 无法享受高级分析功能

### 普通用户 (normal)
- 档案配额：20个
- 权限范围：
  - ✅ 临时用户的所有权限
  - ✅ 参与社区互动（如有）
  - ✅ 收藏和管理档案
  - ❌ 无法使用高级分析算法
  - ❌ 无法享受专属客服支持

### 高级用户 (premium)
- 档案配额：无限制
- 权限范围：
  - ✅ 普通用户的所有权限
  - ✅ 高级八字分析算法
  - ✅ 专属分析报告模板
  - ✅ 无限档案创建
  - ✅ 专属客服支持
  - ✅ 优先体验新功能
  - ✅ 数据云端备份

## 扩展性考虑

1. **用户权限系统**: 基于userType可以扩展更细粒度的权限控制
2. **用户偏好设置**: 可添加preferences对象字段存储用户个性化设置
3. **统计数据**: 可添加profileCount、lastActiveTime等统计字段
4. **第三方集成**: unionid字段为后续跨平台集成预留
5. **级别升级机制**: 可添加levelUpgradeTime、upgradeReason等字段记录级别变更历史
6. **用户行为分析**: 可添加behaviorData字段记录用户行为数据用于个性化推荐