# 用户类型配置表 (user_types)

## 数据表概述
存储用户类型的配置信息，包括权限、配额等。通过配置化管理用户类型，避免在用户表中硬编码权限信息，提高系统的可维护性和扩展性。

## 数据表名称
`user_types`

## 字段定义

| 字段名 | 类型 | 必填 | 索引 | 说明 |
|--------|------|------|------|------|
| _id | string | 是 | 主键 | 系统自动生成的文档ID |
| typeCode | string | 是 | 唯一索引 | 用户类型代码(guest,normal,premium,admin) |
| typeName | string | 是 | - | 用户类型名称 |
| displayName | string | 是 | - | 用户类型显示名称 |
| description | string | 否 | - | 用户类型描述 |
| profileQuota | number | 是 | - | 档案配额(-1表示无限制) |
| permissions | array | 是 | - | 权限列表 |
| dailyDrawQuota | number | 是 | - | 每日智慧洞见配额(0=不可用，正整数=次数限制，-1=无限) |
| dailyAiReportQuota | number | 否 | - | 每日AI出报告配额(0=不可用，正整数=次数限制，-1=无限)，默认0 |

## 数据示例

```json
{
  "_id": "user_type_guest",
  "typeCode": "guest",
  "typeName": "临时用户",
  "displayName": "临时用户",
  "description": "未注册的临时用户，功能受限",
  "profileQuota": 3,
  "permissions": ["view", "create_limited"],
  "dailyDrawQuota": 0,
  "dailyAiReportQuota": 0
}
```

```json
{
  "_id": "user_type_normal",
  "typeCode": "normal", 
  "typeName": "探索者",
  "displayName": "探索者",
  "description": "已注册的普通用户，享受基础功能",
  "profileQuota": 50,
  "permissions": ["view", "create"],
  "dailyDrawQuota": 1,
  "dailyAiReportQuota": 1
}
```

```json
{
  "_id": "user_type_premium",
  "typeCode": "premium",
  "typeName": "高级用户", 
  "displayName": "高级用户",
  "description": "付费高级用户，享受全部功能",
  "profileQuota": -1,
  "permissions": ["all"],
  "dailyDrawQuota": -1,
  "dailyAiReportQuota": -1
}
```

```json
{
  "_id": "user_type_admin",
  "typeCode": "admin",
  "typeName": "管理员",
  "displayName": "管理员",
  "description": "系统管理员，拥有所有权限和管理功能",
  "profileQuota": -1,
  "permissions": ["all", "admin"],
  "dailyDrawQuota": -1,
  "dailyAiReportQuota": -1
}
```

## 索引设计

### 主要索引
- `typeCode`: **唯一索引**，用于快速查找用户类型配置，**必须设置以防止重复类型代码**

### 查询优化
- 通过typeCode查询用户类型是最常用的查询方式，设置为唯一索引

### 重要提醒
⚠️ **数据库约束要求**：
- **必须为 `typeCode` 字段创建唯一索引**，防止重复的用户类型代码
- 在云开发控制台中设置：数据库 → user_types集合 → 索引管理 → 添加索引
- 索引配置：字段名 `typeCode`，索引类型选择 `唯一索引`

## 与其他数据表的关系

### 关联表
- **users表**: 一对多关系
  - 外键: `users.userTypeCode` 关联 `user_types.typeCode`
  - 关系描述: 一个用户类型可以被多个用户使用

- **draw_card_records表**: 间接关联
  - 通过 `draw_card_records.userTypeCode` 字段关联
  - 关系描述: 抽卡记录中存储用户当时的类型（快照），用于统计分析

## 业务规则

1. **类型代码唯一性**: 通过typeCode保证用户类型唯一性
2. **数据完整性**: typeCode、typeName、displayName为必填字段
3. **权限管理**: 
   - permissions数组存储该用户类型拥有的权限
   - 权限代码：view(查看)、create(创建)、create_limited(受限创建)、all(全部权限)、admin(管理员权限)
4. **配额管理**:
   - profileQuota表示档案创建配额
     - -1表示无限制
     - 其他数值表示具体配额数量
   - dailyDrawQuota表示每日智慧洞见配额
     - 0表示不可用（如临时用户）
     - 正整数表示每日次数限制
     - -1表示无限制
   - dailyAiReportQuota表示每日AI出报告免费配额
     - 0表示不可用
     - 正整数表示每日免费次数
     - -1表示无限制

## 用户类型权限详细说明

### 临时用户 (guest)
- 档案配额：3个
- 智慧洞见配额：0次（不可用，dailyDrawQuota=0）
- AI出报告配额：0次（不可用）
- 权限范围：
  - ✅ 查看小程序基础功能
  - ✅ 进行生辰八字计算
  - ✅ 创建档案（数量限制）
  - ✅ 查看已创建的档案
  - ❌ 无法使用智慧洞见功能
  - ❌ 无法使用AI出报告
  - ❌ 无法享受高级分析功能

### 普通用户 (normal)
- 档案配额：50个
- 智慧洞见配额：1次/天（dailyDrawQuota=1）
- AI出报告配额：1次/天
- 权限范围：
  - ✅ 临时用户的所有权限
  - ✅ 使用智慧洞见（每日1次免费）
  - ✅ 使用AI出报告（每日1次免费）
  - ✅ 参与社区互动（如有）
  - ✅ 收藏和管理档案
  - ❌ 无法使用高级分析算法
  - ❌ 无法享受专属客服支持

### 高级用户 (premium)
- 档案配额：无限制
- 智慧洞见配额：无限制（dailyDrawQuota=-1）
- AI出报告配额：无限制
- 权限范围：
  - ✅ 普通用户的所有权限
  - ✅ 无限使用智慧洞见
  - ✅ 无限使用AI出报告
  - ✅ 高级八字分析算法
  - ✅ 专属分析报告模板
  - ✅ 无限档案创建
  - ✅ 专属客服支持
  - ✅ 优先体验新功能
  - ✅ 数据云端备份

### 管理员 (admin)
- 档案配额：无限制
- 智慧洞见配额：无限制（dailyDrawQuota=-1）
- AI出报告配额：无限制
- 权限范围：
  - ✅ 高级用户的所有权限
  - ✅ 系统管理功能
  - ✅ 用户管理权限
  - ✅ 数据管理权限
  - ✅ 系统配置权限

## 功能免费配额说明

### 配额计算方式
1. **免费配额**: 在本表 (static_user_types) 中配置，按用户类型区分
   - **智慧洞见**: 使用 `dailyDrawQuota` 字段
   - **AI出报告**: 使用 `dailyAiReportQuota` 字段
2. **付费配额**: 在 function_quotas 表中记录，永久有效
3. **总配额**: 免费配额（每日重置）+ 付费配额（永久有效）

### 免费配额每日重置机制
- 免费配额不存储在数据库中，通过查询 `function_usage_records` 表统计当日使用次数
- 每天 00:00 自动重置（通过日期字段 usageDate 判断）
- 配额检查公式：
  - 智慧洞见：`剩余免费配额 = dailyDrawQuota - 当日已使用次数`
  - AI出报告：`剩余免费配额 = dailyAiReportQuota - 当日已使用次数`

### 查询免费配额示例（智慧洞见）
```javascript
// 获取用户类型配置
const userTypeConfig = await db.collection('static_user_types')
  .where({ typeCode: userTypeCode })
  .get();

// 智慧洞见使用 dailyDrawQuota 字段
const dailyWisdomInsightQuota = userTypeConfig.data[0].dailyDrawQuota;

// 统计今日免费使用次数
const today = new Date().toISOString().split('T')[0];
const freeUsedToday = await db.collection('function_usage_records')
  .where({
    openid: openid,
    functionCode: 'wisdom_insight',
    isPaid: false,  // 免费配额
    usageDate: today
  })
  .count();

// 计算剩余免费配额
const freeRemaining = dailyWisdomInsightQuota === -1 
  ? Infinity 
  : Math.max(0, dailyWisdomInsightQuota - freeUsedToday.total);
```

### 配额优先级
使用功能时，按以下优先级扣除配额：
1. **优先使用免费配额** (isPaid=false)
2. **免费配额用完后使用付费配额** (isPaid=true)

### 重要说明
- **智慧洞见配额**：使用 `dailyDrawQuota` 字段
- **AI出报告配额**：使用 `dailyAiReportQuota` 字段

## 扩展性考虑

1. **新增用户类型**: 只需在配置表中添加新记录，无需修改代码
2. **权限扩展**: 可在permissions数组中添加新的权限代码
3. **配额调整**: 修改profileQuota字段即可调整配额，无需更新用户数据
4. **多语言支持**: 可扩展displayName字段支持多语言显示
5. **新增功能配额**: 添加新的 dailyXxxQuota 字段即可
6. **字段复用**: 智慧洞见复用 dailyDrawQuota，避免字段冗余

## 数据迁移说明

### 从现有用户表迁移
1. 创建user_types表并插入默认配置数据
2. 修改users表，将userType字段改为userTypeCode
3. 更新现有用户数据，将userType值映射为对应的typeCode
4. 删除users表中的profileQuota和permissions字段
5. 修改业务逻辑，从user_types表读取配置信息

### 迁移SQL示例
```javascript
// 1. 创建用户类型配置
db.collection('user_types').add({
  data: {
    typeCode: 'guest',
    typeName: '临时用户',
    displayName: '临时用户',
    profileQuota: 3,
    permissions: ['view', 'create_limited']
  }
})

// 2. 更新用户表字段
db.collection('users').where({
  userType: 'normal'
}).update({
  data: {
    userTypeCode: 'normal'
  }
})
```
