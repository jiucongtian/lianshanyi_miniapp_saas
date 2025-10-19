# 档案表 (profiles)

## 数据表概述
存储用户创建的生辰八字档案信息，每个档案包含生日信息和对应的生辰八字数据。用户可以创建多个档案用于查询不同人的生辰八字。

## 数据表名称
`profiles`

## 字段定义

| 字段名 | 类型 | 必填 | 索引 | 说明 |
|--------|------|------|------|------|
| _id | string | 是 | 主键 | 系统自动生成的文档ID |
| userId | string | 是 | 索引 | 关联用户表的用户ID |
| openid | string | 是 | 索引 | 微信用户openid，用于快速查询 |
| profileName | string | 是 | - | 档案名称，用户自定义 |
| birthDate | object | 是 | - | 生日信息对象 |
| birthDate.year | number | 是 | - | 出生年份 |
| birthDate.month | number | 是 | - | 出生月份(1-12) |
| birthDate.day | number | 是 | - | 出生日期(1-31) |
| birthDate.hour | number | 是 | - | 出生时辰(0-23) |
| birthDate.minute | number | 否 | - | 出生分钟(0-59)，默认0 |
| birthDate.isLunar | boolean | 否 | - | 是否为农历，默认false(公历) |
| birthDate.isLeapMonth | boolean | 否 | - | 农历时是否闰月，默认false(仅isLunar=true时有效) |
| baziData | object | 是 | - | 生辰八字数据对象 |
| baziData.year | object | 是 | - | 年柱 |
| baziData.year.gan | string | 是 | - | 年干 |
| baziData.year.zhi | string | 是 | - | 年支 |
| baziData.year.ganzhiIndex | number | 是 | - | 年柱干支索引(1-60) |
| baziData.month | object | 是 | - | 月柱 |
| baziData.month.gan | string | 是 | - | 月干 |
| baziData.month.zhi | string | 是 | - | 月支 |
| baziData.month.ganzhiIndex | number | 是 | - | 月柱干支索引(1-60) |
| baziData.day | object | 是 | - | 日柱 |
| baziData.day.gan | string | 是 | - | 日干 |
| baziData.day.zhi | string | 是 | - | 日支 |
| baziData.day.ganzhiIndex | number | 是 | - | 日柱干支索引(1-60) |
| baziData.hour | object | 是 | - | 时柱 |
| baziData.hour.gan | string | 是 | - | 时干 |
| baziData.hour.zhi | string | 是 | - | 时支 |
| baziData.hour.ganzhiIndex | number | 是 | - | 时柱干支索引(1-60) |
| baziData.lunarDate | object | 否 | - | 对应农历日期 |
| baziData.lunarDate.year | number | 否 | - | 农历年 |
| baziData.lunarDate.month | number | 否 | - | 农历月 |
| baziData.lunarDate.day | number | 否 | - | 农历日 |
| baziData.lunarDate.isLeap | boolean | 否 | - | 是否闰月 |
| gender | number | 否 | - | 性别(0:未知,1:男,2:女) |
| isUncertainTime | boolean | 否 | - | 是否不确定时辰信息，默认false |
| description | string | 否 | - | 档案描述备注 |
| createTime | date | 是 | - | 档案创建时间 |
| updateTime | date | 是 | - | 档案最后更新时间 |
| isActive | boolean | 否 | - | 档案是否有效，默认true |

## 数据示例

```json
{
  "_id": "profile_60a1b2c3d4e5f6789abcdef1",
  "userId": "user_60a1b2c3d4e5f6789abcdef0",
  "openid": "oABCD1234567890abcdef1234567890ab",
  "profileName": "我的生辰八字",
  "birthDate": {
    "year": 1990,
    "month": 5,
    "day": 15,
    "hour": 14,
    "minute": 30,
    "isLunar": false,
    "isLeapMonth": false
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
    },
    "lunarDate": {
      "year": 1990,
      "month": 4,
      "day": 22,
      "isLeap": false
    }
  },
  "gender": 1,
  "isUncertainTime": false,
  "description": "本人生辰八字档案",
  "createTime": "2023-09-14T08:00:00.000Z",
  "updateTime": "2023-09-14T08:00:00.000Z",
  "isActive": true
}
```

## 索引设计

### 主要索引
- `userId`: 普通索引，用于查询用户的所有档案
- `openid`: 普通索引，用于快速查询用户档案
- `createTime`: 普通索引，用于按时间排序

### 复合索引
- `{openid: 1, isActive: 1, createTime: -1}`: 用于查询用户有效档案并按创建时间倒序排列

### 查询优化
- 通过openid查询用户档案是最常用的查询方式
- 支持按创建时间排序的分页查询
- isActive字段用于软删除过滤

## 与其他数据表的关系

### 关联表
- **users表**: 多对一关系
  - 外键: `profiles.userId` 关联 `users._id`
  - 冗余字段: `profiles.openid` 冗余存储，便于快速查询
  - 关系描述: 多个档案属于一个用户

## 业务规则

1. **数据完整性**: userId、openid、profileName、birthDate、baziData为必填字段
2. **档案唯一性**: 同一用户可以创建多个档案，档案名称可以重复
3. **时间戳管理**: createTime在创建时设置，updateTime在每次更新时自动更新
4. **软删除**: 使用isActive字段进行软删除，保留历史数据
5. **数据冗余**: openid字段冗余存储，避免频繁关联查询users表
6. **日历类型兼容**: 
   - 默认为公历 (isLunar=false)
   - 农历档案需标记 isLunar=true
   - 农历闰月需标记 isLeapMonth=true (仅农历时有效)
   - 老数据未设置 isLunar 字段时，默认视为公历
7. **向前兼容**: 新增字段均设置了默认值，不影响已有档案的正常使用

## 扩展性考虑

1. **档案分类**: 可添加category字段对档案进行分类
2. **分享功能**: 可添加isPublic、shareCode等字段支持档案分享
3. **收藏功能**: 可添加isFavorite字段标记重要档案
4. **排序功能**: 可添加sortOrder字段支持用户自定义排序
5. **标签系统**: 可添加tags数组字段支持档案标签管理
6. **计算缓存**: 可添加analysisCache字段缓存复杂的八字分析结果
7. **关联人物**: 可添加relationship字段描述档案对应人物与用户的关系

## 性能优化建议

1. **查询优化**: 主要查询场景为通过openid获取用户档案列表
2. **数据量控制**: 建议单个用户档案数量限制在100个以内
3. **缓存策略**: 对于频繁查询的档案数据可考虑缓存
4. **分页查询**: 档案列表查询建议使用分页，避免一次性加载过多数据
