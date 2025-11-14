# 抽卡记录表 (draw_card_records)

## 数据表概述
存储用户的抽卡和AI解读历史记录。每次用户完成AI解读后，记录问题、抽中的卡牌、AI返回的答案以及时间信息。用于配额统计、历史查询和数据分析。

## 数据表名称
`draw_card_records`

## 字段定义

| 字段名 | 类型 | 必填 | 索引 | 说明 |
|--------|------|------|------|------|
| _id | string | 是 | 主键 | 系统自动生成的文档ID |
| userId | string | 是 | 复合索引 | 用户ID，关联users._id |
| openid | string | 是 | 复合索引 | 微信用户openid（冗余字段，方便查询） |
| userTypeCode | string | 是 | - | 抽卡时的用户类型代码（快照，用于统计） |
| question | string | 否 | - | 用户提出的问题 |
| cardNumber | number | 是 | - | 抽中的卡牌编号（1-60，对应60甲子） |
| cardName | string | 是 | - | 抽中的卡牌名称（如"甲子"、"乙丑"等） |
| aiAnswer | string | 是 | - | AI返回的解读结果 |
| drawTime | date | 是 | - | 抽卡时间（用户点击抽卡的时间） |
| interpretTime | date | 是 | 索引 | AI解读时间（记录创建时间） |
| drawDate | string | 是 | 复合索引 | 抽卡日期（YYYY-MM-DD格式，用于按天统计） |
| cloudFunctionVersion | string | 否 | - | 调用的云函数版本号（如"cozeFunctions_v1_3"） |
| isActive | boolean | 否 | - | 是否有效记录（用于软删除），默认true |

## 数据示例

```json
{
  "_id": "record_64f1a2b3c4d5e6f7g8h9i0j1",
  "userId": "user_60a1b2c3d4e5f6789abcdef0",
  "openid": "oABCD1234567890abcdef1234567890ab",
  "userTypeCode": "normal",
  "question": "我今年的事业运势如何？",
  "cardNumber": 15,
  "cardName": "戊寅",
  "aiAnswer": "根据戊寅的特性，今年你的事业运势呈现稳中有进的态势...",
  "drawTime": "2023-09-14T08:30:15.000Z",
  "interpretTime": "2023-09-14T08:30:45.000Z",
  "drawDate": "2023-09-14",
  "cloudFunctionVersion": "cozeFunctions_v1_3",
  "isActive": true
}
```

## 索引设计

### 主要索引

1. **`userId` + `drawDate` 复合索引**（必须创建）
   - 用途：快速查询某用户某天的抽卡记录
   - 场景：配额统计、每日次数检查
   - 配置：
     ```javascript
     {
       "userId": 1,
       "drawDate": 1
     }
     ```

2. **`openid` + `drawDate` 复合索引**（可选，备用）
   - 用途：通过openid查询某天的记录
   - 场景：跨设备查询、数据迁移
   - 配置：
     ```javascript
     {
       "openid": 1,
       "drawDate": 1
     }
     ```

3. **`interpretTime` 普通索引**（可选）
   - 用途：按时间范围查询记录
   - 场景：统计分析、数据导出

### 查询优化

- **配额检查查询**（最频繁）：
  ```javascript
  db.collection('draw_card_records')
    .where({
      userId: 'xxx',
      drawDate: '2023-09-14',
      isActive: true
    })
    .count()
  ```
  通过 `userId + drawDate` 复合索引优化

- **用户历史查询**：
  ```javascript
  db.collection('draw_card_records')
    .where({
      userId: 'xxx',
      isActive: true
    })
    .orderBy('interpretTime', 'desc')
    .limit(20)
    .get()
  ```

### 重要提醒

⚠️ **数据库索引要求**：
- **必须为 `userId` + `drawDate` 创建复合索引**，用于配额统计查询
- 在云开发控制台中设置：数据库 → draw_card_records集合 → 索引管理 → 添加索引
- 索引配置：
  - 索引名称：`userId_drawDate`
  - 索引字段：`userId: 升序, drawDate: 升序`
  - 索引类型：普通索引

## 与其他数据表的关系

### 关联表

- **users表**: 多对一关系
  - 外键: `draw_card_records.userId` 关联 `users._id`
  - 关系描述: 一个用户可以有多条抽卡记录

- **static_user_types表**: 间接关联
  - 通过 `userTypeCode` 字段关联
  - 用于统计分析不同用户类型的使用情况

## 业务规则

### 1. 记录创建规则

- **记录时机**：AI解读成功后立即创建记录
- **必填字段**：userId、cardNumber、cardName、aiAnswer、drawTime、interpretTime、drawDate
- **可选字段**：question（用户可以不输入问题直接抽卡）
- **时间记录**：
  - `drawTime`：用户点击抽卡按钮的时间
  - `interpretTime`：AI解读完成的时间（一般是记录创建时间）
  - `drawDate`：用于配额统计的日期字段（从drawTime提取）

### 2. 数据完整性

- **用户快照**：记录用户当时的 `userTypeCode`，用于统计分析
- **版本追踪**：记录云函数版本号，方便问题排查和数据分析
- **软删除**：使用 `isActive` 字段标记是否有效，不直接删除记录

### 3. 配额统计规则

- **统计维度**：按用户ID + 日期统计
- **统计方式**：
  ```javascript
  // 查询某用户今日已使用次数
  const count = await db.collection('draw_card_records')
    .where({
      userId: userId,
      drawDate: today,  // 'YYYY-MM-DD'
      isActive: true
    })
    .count();
  ```
- **跨天重置**：每天的配额独立计算，由 `drawDate` 字段区分

### 4. 数据保留策略

- **默认保留**：所有记录永久保留
- **软删除**：通过 `isActive: false` 标记删除，不影响统计
- **归档策略**（可选）：
  - 90天前的记录可以归档到独立集合
  - 保留统计数据，移除详细内容

## 查询示例

### 1. 检查今日配额

```javascript
// 查询某用户今日已使用次数
const today = new Date().toISOString().split('T')[0];
const result = await db.collection('draw_card_records')
  .where({
    userId: userId,
    drawDate: today,
    isActive: true
  })
  .count();

const usedToday = result.total;
```

### 2. 获取用户历史记录

```javascript
// 获取用户最近20条记录
const result = await db.collection('draw_card_records')
  .where({
    userId: userId,
    isActive: true
  })
  .orderBy('interpretTime', 'desc')
  .limit(20)
  .get();
```

### 3. 统计某段时间内的使用情况

```javascript
// 统计某用户本月的使用次数
const startDate = '2023-09-01';
const endDate = '2023-09-30';

const result = await db.collection('draw_card_records')
  .where({
    userId: userId,
    drawDate: db.command.gte(startDate).and(db.command.lte(endDate)),
    isActive: true
  })
  .count();
```

### 4. 统计热门卡牌

```javascript
// 统计最常被抽中的卡牌（聚合查询，需在云函数中执行）
const result = await db.collection('draw_card_records')
  .aggregate()
  .match({
    isActive: true
  })
  .group({
    _id: '$cardNumber',
    cardName: $.first('$cardName'),
    count: $.sum(1)
  })
  .sort({
    count: -1
  })
  .limit(10)
  .end();
```

## 扩展性考虑

### 1. 分享功能扩展

如需添加分享功能，可扩展字段：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| isShared | boolean | 是否已分享 |
| shareTime | date | 分享时间 |
| shareViewCount | number | 分享浏览次数 |

### 2. 评价功能扩展

如需添加用户对AI解读的评价：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| userRating | number | 用户评分（1-5星） |
| userFeedback | string | 用户反馈内容 |

### 3. 标签功能扩展

如需对问题进行分类：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| questionCategory | string | 问题分类（事业、感情、健康等） |
| tags | array | 标签数组 |

## 数据统计示例

### 1. 用户活跃度统计

```javascript
// 统计每日抽卡用户数
db.collection('draw_card_records')
  .aggregate()
  .match({
    drawDate: db.command.gte('2023-09-01'),
    isActive: true
  })
  .group({
    _id: '$drawDate',
    userCount: $.addToSet('$userId'),
    totalCount: $.sum(1)
  })
  .sort({ _id: 1 })
  .end()
```

### 2. 用户类型使用分析

```javascript
// 统计不同用户类型的使用情况
db.collection('draw_card_records')
  .aggregate()
  .match({
    drawDate: db.command.gte('2023-09-01'),
    isActive: true
  })
  .group({
    _id: '$userTypeCode',
    count: $.sum(1),
    users: $.addToSet('$userId')
  })
  .end()
```

## 性能优化建议

1. **索引优化**：
   - 必须创建 `userId + drawDate` 复合索引
   - 根据查询需求创建其他索引

2. **查询优化**：
   - 配额检查只查询 count，不获取详细数据
   - 历史记录查询使用分页，避免一次性加载过多数据

3. **数据归档**：
   - 定期归档历史数据（如3个月前的记录）
   - 保留统计数据，移除详细内容

4. **缓存策略**：
   - 用户今日配额可以缓存在客户端
   - 每次操作后更新缓存

## 隐私和安全

1. **数据脱敏**：
   - 用户的问题可能包含隐私信息
   - 在统计分析时注意数据脱敏

2. **访问控制**：
   - 用户只能查看自己的记录
   - 管理员可以查看统计数据，不能查看具体问题内容

3. **数据导出**：
   - 用户可以导出自己的历史记录
   - 导出格式：JSON 或 CSV

## 相关文档

- [用户类型表 (user_typesdb.md)](./user_typesdb.md)
- [用户表 (usersdb.md)](./usersdb.md)
- [抽卡配额系统设计方案 (../draw-card-quota-system.md)](../draw-card-quota-system.md)
- [drawCardManagement API文档 (../api/drawCardManagement-api.md)](../api/drawCardManagement-api.md)

