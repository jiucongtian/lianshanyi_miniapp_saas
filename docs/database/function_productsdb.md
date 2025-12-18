# 功能商品表 (function_products)

## 数据表概述
存储按次付费功能的商品信息和调用配置。定义每个付费功能的价格、描述、调用方式等，用于支持功能按次付费系统。

## 数据表名称
`function_products`

## 字段定义

| 字段名 | 类型 | 必填 | 索引 | 说明 |
|--------|------|------|------|------|
| _id | string | 是 | 主键 | 系统自动生成的文档ID |
| functionCode | string | 是 | 唯一索引 | 功能编码，唯一标识（如：wisdom_insight、ai_report） |
| functionName | string | 是 | - | 功能名称（如：智慧洞见、AI出报告） |
| functionType | string | 是 | - | 付费类型：per_use（按次付费） |
| description | string | 否 | - | 功能描述，用于展示给用户 |
| price | number | 是 | - | 单价，单位：分（如：190表示1.9元） |
| originalPrice | number | 否 | - | 原价，用于展示划线价，单位：分 |
| callConfig | object | 是 | - | 调用配置对象，定义如何调用目标云函数 |
| callConfig.targetFunction | string | 是 | - | 目标云函数名称（如：cozeFunctions_v1_3） |
| callConfig.targetAction | string | 否 | - | 目标云函数的action（可选，如果目标云函数使用action格式） |
| callConfig.workflowType | string | 否 | - | 工作流类型（传递给目标云函数的参数） |
| callConfig.parameters | object | 否 | - | 默认参数（可选，会与用户传入的参数合并） |
| grantData | object | 是 | - | 权益发放配置对象，支付成功后如何发放权益 |
| grantData.type | string | 是 | - | 发货类型：grant_function_quota（发放功能配额） |
| grantData.functionCode | string | 是 | - | 功能编码（与主functionCode一致） |
| grantData.quantity | number | 是 | - | 发放次数（默认为1） |
| status | string | 是 | 索引 | 商品状态：active（上架）/ inactive（下架） |
| sortOrder | number | 否 | - | 排序号，用于商品列表排序，数字越小越靠前 |
| createTime | date | 是 | - | 创建时间 |
| updateTime | date | 是 | - | 最后更新时间 |

## 数据示例

### 智慧洞见（1.9元/次）
```json
{
  "_id": "func_product_001",
  "functionCode": "wisdom_insight",
  "functionName": "智慧洞见",
  "functionType": "per_use",
  "description": "AI智慧洞见，每次使用付费",
  "price": 190,
  "originalPrice": 190,
  "callConfig": {
    "targetFunction": "cozeFunctions_v1_3",
    "targetAction": null,
    "workflowType": "WISDOM_INSIGHT",
    "parameters": {}
  },
  "grantData": {
    "type": "grant_function_quota",
    "functionCode": "wisdom_insight",
    "quantity": 1
  },
  "status": "active",
  "sortOrder": 1,
  "createTime": "2024-12-18T08:00:00.000Z",
  "updateTime": "2024-12-18T08:00:00.000Z"
}
```

### AI出报告（9.9元/次）
```json
{
  "_id": "func_product_002",
  "functionCode": "ai_report",
  "functionName": "AI出报告",
  "functionType": "per_use",
  "description": "AI深度解读卡牌，生成专业报告",
  "price": 990,
  "originalPrice": 990,
  "callConfig": {
    "targetFunction": "cozeFunctions_v1_3",
    "targetAction": null,
    "workflowType": "AI_REPORT",
    "parameters": {}
  },
  "grantData": {
    "type": "grant_function_quota",
    "functionCode": "ai_report",
    "quantity": 1
  },
  "status": "active",
  "sortOrder": 2,
  "createTime": "2024-12-18T08:00:00.000Z",
  "updateTime": "2024-12-18T08:00:00.000Z"
}
```

## 索引设计

### 主要索引
- `functionCode`: **唯一索引**，用于快速查找功能商品，**必须设置以防止重复功能编码**
- `status`: 普通索引，用于查询上架/下架商品

### 查询优化
- 通过functionCode查询商品是最常用的查询方式，设置为唯一索引
- status用于筛选上架商品，设置为普通索引

### 重要提醒
⚠️ **数据库约束要求**：
- **必须为 `functionCode` 字段创建唯一索引**，防止重复的功能编码
- 在云开发控制台中设置：数据库 → function_products集合 → 索引管理 → 添加索引
- 索引配置：字段名 `functionCode`，索引类型选择 `唯一索引`

## 与其他数据表的关系

### 关联表
- **payment_orders表**: 一对多关系
  - 外键: `payment_orders.functionCode` 关联 `function_products.functionCode`
  - 关系描述: 一个功能商品可以对应多个支付订单

- **function_quotas表**: 间接关联
  - 通过 functionCode 关联
  - 关系描述: 商品的 grantData 配置定义了如何发放配额

- **function_usage_records表**: 间接关联
  - 通过 functionCode 关联
  - 关系描述: 使用记录关联到具体的功能商品

## 业务规则

1. **功能编码唯一性**: 通过functionCode保证功能唯一性
2. **价格单位**: 价格单位为"分"，不是"元"（例如：1.9元 = 190分）
3. **商品状态管理**:
   - active：上架，用户可以购买
   - inactive：下架，用户不可见
4. **调用配置 (callConfig)**:
   - targetFunction：必填，指定要调用的云函数名称
   - workflowType：传递给目标云函数，用于区分不同的工作流
   - parameters：可选的默认参数，会与用户传入的参数合并
5. **权益发放配置 (grantData)**:
   - 定义支付成功后如何发放权益
   - type='grant_function_quota'表示发放功能配额
   - quantity指定发放的次数

## callConfig 配置说明

### 基本格式
```javascript
{
  "targetFunction": "云函数名称",
  "targetAction": "action名称（可选）",
  "workflowType": "工作流类型",
  "parameters": {
    // 默认参数（可选）
  }
}
```

### 调用流程
1. 统一网关（functionCallGateway）根据 functionCode 查询商品配置
2. 从 callConfig 获取 targetFunction 和其他配置
3. 合并 callConfig.parameters 和用户传入的 functionParams
4. 调用目标云函数：
   ```javascript
   // 如果有 targetAction
   cloud.callFunction({
     name: targetFunction,
     data: {
       action: targetAction,
       data: { workflowType, parameters: {...} }
     }
   })
   
   // 如果没有 targetAction
   cloud.callFunction({
     name: targetFunction,
     data: {
       workflowType,
       parameters: {...}
     }
   })
   ```

### 扩展性设计
- ✅ 新增功能只需在数据库中添加配置，无需修改代码
- ✅ 调用不同云函数只需修改 targetFunction
- ✅ 支持复杂的参数传递和合并逻辑
- ✅ 商品信息会快照到订单，价格调整不影响已创建的订单

## 商品管理操作

### 新增商品
```javascript
db.collection('function_products').add({
  data: {
    functionCode: 'new_function',
    functionName: '新功能',
    functionType: 'per_use',
    description: '新功能描述',
    price: 500,
    originalPrice: 500,
    callConfig: {
      targetFunction: 'someFunction',
      targetAction: null,
      workflowType: 'NEW_WORKFLOW',
      parameters: {}
    },
    grantData: {
      type: 'grant_function_quota',
      functionCode: 'new_function',
      quantity: 1
    },
    status: 'active',
    sortOrder: 3,
    createTime: new Date(),
    updateTime: new Date()
  }
})
```

### 更新商品价格
```javascript
db.collection('function_products')
  .where({ functionCode: 'wisdom_insight' })
  .update({
    data: {
      price: 290,  // 修改为2.9元
      updateTime: new Date()
    }
  })
```

### 下架商品
```javascript
db.collection('function_products')
  .where({ functionCode: 'wisdom_insight' })
  .update({
    data: {
      status: 'inactive',
      updateTime: new Date()
    }
  })
```

### 查询上架商品
```javascript
db.collection('function_products')
  .where({ status: 'active' })
  .orderBy('sortOrder', 'asc')
  .get()
```

## 扩展性考虑

1. **套餐支持**: 可扩展支持套餐（如：10次套餐），通过 quantity 字段控制
2. **限时优惠**: 可新增字段支持限时价格（discountPrice、discountEndTime）
3. **会员价格**: 可新增字段支持不同用户类型的差异化定价
4. **商品分组**: 可新增 category 字段用于商品分类
5. **库存管理**: 如需限量销售，可新增 stock 字段
6. **购买限制**: 可新增字段限制每人购买次数（如：每人每天限购3次）

## 注意事项

⚠️ **重要**：
1. 价格调整不影响已创建的订单（订单中会快照商品信息）
2. functionCode 不可修改（如需修改，应创建新商品并下架旧商品）
3. callConfig 修改后只影响新订单，不影响已支付订单
4. 下架商品不删除，只修改 status 为 inactive
5. 商品删除需谨慎，建议软删除（下架）而非物理删除

