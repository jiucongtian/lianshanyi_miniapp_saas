# 反馈表 (feedbacks)

## 数据表概述
存储用户提交的反馈信息，包括反馈内容、类型、状态、图片等。支持用户反馈问题、建议和意见，管理员可以查看和处理反馈。

## 数据表名称
`feedbacks`

## 字段定义

| 字段名 | 类型 | 必填 | 索引 | 说明 |
|--------|------|------|------|------|
| _id | string | 是 | 主键 | 系统自动生成的文档ID |
| userId | string | 是 | 索引 | 用户ID，关联users表的_id |
| openid | string | 是 | 索引 | 用户openid，用于快速查询用户反馈 |
| feedbackType | string | 是 | 索引 | 反馈类型（problem/suggestion/other） |
| title | string | 是 | - | 反馈标题，10-50个字符 |
| content | string | 是 | - | 反馈内容，20-500个字符 |
| status | string | 是 | 索引 | 反馈状态（pending/processing/resolved/closed），仅后台使用 |
| adminReply | string | 否 | - | 管理员回复内容 |
| adminId | string | 否 | 索引 | 处理反馈的管理员ID，关联users表的_id |
| replyTime | date | 否 | - | 管理员回复时间 |
| createTime | date | 是 | 索引 | 反馈创建时间 |
| updateTime | date | 是 | - | 反馈最后更新时间 |
| isDeleted | boolean | 否 | - | 是否已删除（软删除），默认false |

## 数据示例

```json
{
  "_id": "feedback_60a1b2c3d4e5f6789abcdef0",
  "userId": "user_60a1b2c3d4e5f6789abcdef0",
  "openid": "oABCD1234567890abcdef1234567890ab",
  "feedbackType": "problem",
  "title": "卡牌显示异常",
  "content": "在查看卡牌时，发现某些卡牌的图片显示不出来，希望能修复这个问题。",
  "status": "pending",
  "adminReply": null,
  "adminId": null,
  "replyTime": null,
  "createTime": "2023-09-14T08:00:00.000Z",
  "updateTime": "2023-09-14T08:00:00.000Z",
  "isDeleted": false
}
```

## 索引设计

### 主要索引
- `userId`: 普通索引，用于查询用户的反馈列表
- `openid`: 普通索引，用于快速查询用户反馈（用户端查询）
- `feedbackType`: 普通索引，用于按类型筛选反馈
- `status`: 普通索引，用于按状态筛选反馈
- `createTime`: 普通索引，用于按时间排序
- `adminId`: 普通索引，用于查询管理员处理的反馈

### 查询优化
- 通过openid查询用户反馈是最常用的查询方式，设置为普通索引
- userId用于关联查询，设置为普通索引
- feedbackType和status用于筛选，设置为普通索引
- createTime用于排序，设置为普通索引

## 与其他数据表的关系

### 关联表
- **users表**: 多对一关系
  - 外键: `feedbacks.userId` 关联 `users._id`
  - 关系描述: 一个用户可以提交多条反馈
- **users表（管理员）**: 多对一关系
  - 外键: `feedbacks.adminId` 关联 `users._id`
  - 关系描述: 一个管理员可以处理多条反馈

## 业务规则

### 反馈类型枚举
- `problem`: 问题反馈（bug、使用问题等）
- `suggestion`: 功能建议（新功能建议、改进建议等）
- `other`: 其他反馈（意见、想法等）

### 反馈状态枚举
- `pending`: 待处理（默认状态）
- `processing`: 处理中（管理员已开始处理）
- `resolved`: 已处理（问题已解决）
- `closed`: 已关闭（反馈已关闭，不再处理）

### 内容限制
- **标题**：10-50个字符
- **内容**：20-500个字符

### 数据完整性
- userId和openid为必填字段，用于关联用户
- feedbackType、title、content为必填字段
- status默认为'pending'
- createTime在创建时设置，updateTime在每次更新时自动更新

### 软删除
- 使用isDeleted字段进行软删除，不直接删除反馈数据
- 删除的反馈仍然保留在数据库中，但不会在正常查询中显示

### 权限控制
- 用户只能提交反馈
- 管理员可以查看和处理所有用户的反馈
- 状态字段仅用于后台管理，不对用户展示

## 扩展性考虑

1. **反馈分类细化**：可以添加更多反馈类型，如"bug报告"、"功能请求"、"用户体验"等
2. **优先级系统**：可添加priority字段（low/medium/high/urgent）用于反馈优先级管理
3. **标签系统**：可添加tags数组字段用于反馈标签分类
4. **图片上传**：可扩展支持图片上传功能
5. **反馈统计**：可添加统计字段用于数据分析，如处理时长、回复次数等
6. **反馈关联**：可添加relatedFeedbackId字段用于关联相关反馈
7. **用户评分**：可添加rating字段用于用户对处理结果的评分
