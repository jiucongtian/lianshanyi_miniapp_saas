# 卡牌描述API接口文档

## 接口概述
提供卡牌描述信息的查询接口，支持单张卡牌查询、批量查询、分类查询和关键词搜索等功能。

## 云函数名称
`cardDescriptions`

## 接口列表

### 1. 获取单张卡牌描述

#### 接口名称
获取指定序号的卡牌描述信息

#### 接口地址
`/cardDescriptions`

#### 请求方式
- POST

#### 功能说明
根据卡牌序号（1-60）获取对应的卡牌描述信息，包括卡牌名称、拼音、描述文字、分类和关键词等。

#### 请求参数

```json
{
  "action": "getCardDescription",
  "data": {
    "cardNumber": 1
  }
}
```

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| action | string | 是 | 操作类型，固定值"getCardDescription" |
| data | object | 是 | 请求数据 |
| data.cardNumber | number | 是 | 卡牌序号(1-60) |

#### 返回数据

##### 成功响应

```json
{
  "success": true,
  "data": {
    "_id": "card_desc_60a1b2c3d4e5f6789abcdef1",
    "cardNumber": 1,
    "cardName": "甲子",
    "pinyin": "jiazi",
    "description": "甲子为六十甲子之首，象征着新的开始和无限可能...",
    "category": "年柱",
    "keywords": ["新开始", "开创", "机遇", "智慧", "适应"]
  }
}
```

##### 失败响应

```json
{
  "success": false,
  "error": "卡牌描述不存在"
}
```

#### 返回字段说明

| 字段名 | 类型 | 说明 |
|--------|------|------|
| success | boolean | 请求是否成功 |
| data | object | 卡牌描述数据 |
| data._id | string | 记录ID |
| data.cardNumber | number | 卡牌序号(1-60) |
| data.cardName | string | 卡牌名称 |
| data.pinyin | string | 拼音名称 |
| data.description | string | 卡牌描述文字 |
| data.category | string | 卡牌分类 |
| data.keywords | array | 关键词数组 |

---

### 2. 批量获取卡牌描述

#### 接口名称
根据卡牌序号数组批量获取卡牌描述

#### 接口地址
`/cardDescriptions`

#### 请求方式
- POST

#### 功能说明
根据卡牌序号数组批量获取多张卡牌的描述信息，用于一次性获取多张卡牌的数据。

#### 请求参数

```json
{
  "action": "getCardDescriptionsByNumbers",
  "data": {
    "cardNumbers": [1, 2, 3, 4, 5]
  }
}
```

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| action | string | 是 | 操作类型，固定值"getCardDescriptionsByNumbers" |
| data | object | 是 | 请求数据 |
| data.cardNumbers | array | 是 | 卡牌序号数组(1-60) |

#### 返回数据

##### 成功响应

```json
{
  "success": true,
  "data": [
    {
      "_id": "card_desc_60a1b2c3d4e5f6789abcdef1",
      "cardNumber": 1,
      "cardName": "甲子",
      "pinyin": "jiazi",
      "description": "甲子为六十甲子之首...",
      "category": "年柱",
      "keywords": ["新开始", "开创", "机遇"]
    },
    {
      "_id": "card_desc_60a1b2c3d4e5f6789abcdef2",
      "cardNumber": 2,
      "cardName": "乙丑",
      "pinyin": "yichou",
      "description": "乙丑为六十甲子之二...",
      "category": "年柱",
      "keywords": ["稳重", "坚持", "耐心"]
    }
  ]
}
```

---

### 3. 按分类获取卡牌描述

#### 接口名称
根据分类获取卡牌描述列表

#### 接口地址
`/cardDescriptions`

#### 请求方式
- POST

#### 功能说明
根据卡牌分类（年柱、月柱、日柱、时柱）获取对应分类下的所有卡牌描述，支持分页查询。

#### 请求参数

```json
{
  "action": "getCardDescriptionsByCategory",
  "data": {
    "category": "年柱",
    "page": 1,
    "limit": 20
  }
}
```

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| action | string | 是 | 操作类型，固定值"getCardDescriptionsByCategory" |
| data | object | 是 | 请求数据 |
| data.category | string | 是 | 卡牌分类(年柱/月柱/日柱/时柱) |
| data.page | number | 否 | 页码，默认1 |
| data.limit | number | 否 | 每页数量，默认20 |

#### 返回数据

##### 成功响应

```json
{
  "success": true,
  "data": {
    "descriptions": [
      {
        "_id": "card_desc_60a1b2c3d4e5f6789abcdef1",
        "cardNumber": 1,
        "cardName": "甲子",
        "pinyin": "jiazi",
        "description": "甲子为六十甲子之首...",
        "category": "年柱",
        "keywords": ["新开始", "开创", "机遇"]
      }
    ],
    "total": 15,
    "page": 1,
    "limit": 20,
    "hasMore": false
  }
}
```

---

### 4. 搜索卡牌描述

#### 接口名称
根据关键词搜索卡牌描述

#### 接口地址
`/cardDescriptions`

#### 请求方式
- POST

#### 功能说明
根据关键词在卡牌名称、拼音、描述文字和关键词中进行模糊搜索，支持分页查询。

#### 请求参数

```json
{
  "action": "searchCardDescriptions",
  "data": {
    "keyword": "智慧",
    "page": 1,
    "limit": 20
  }
}
```

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| action | string | 是 | 操作类型，固定值"searchCardDescriptions" |
| data | object | 是 | 请求数据 |
| data.keyword | string | 是 | 搜索关键词 |
| data.page | number | 否 | 页码，默认1 |
| data.limit | number | 否 | 每页数量，默认20 |

#### 返回数据

##### 成功响应

```json
{
  "success": true,
  "data": {
    "descriptions": [
      {
        "_id": "card_desc_60a1b2c3d4e5f6789abcdef1",
        "cardNumber": 1,
        "cardName": "甲子",
        "pinyin": "jiazi",
        "description": "甲子为六十甲子之首，象征着新的开始和无限可能...",
        "category": "年柱",
        "keywords": ["新开始", "开创", "机遇", "智慧", "适应"]
      }
    ],
    "total": 5,
    "page": 1,
    "limit": 20,
    "hasMore": false,
    "keyword": "智慧"
  }
}
```

---

### 5. 获取所有卡牌描述

#### 接口名称
获取所有卡牌描述列表

#### 接口地址
`/cardDescriptions`

#### 请求方式
- POST

#### 功能说明
获取所有卡牌描述信息，支持分页查询，按卡牌序号排序。

#### 请求参数

```json
{
  "action": "getAllCardDescriptions",
  "data": {
    "page": 1,
    "limit": 60
  }
}
```

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| action | string | 是 | 操作类型，固定值"getAllCardDescriptions" |
| data | object | 是 | 请求数据 |
| data.page | number | 否 | 页码，默认1 |
| data.limit | number | 否 | 每页数量，默认60 |

#### 返回数据

##### 成功响应

```json
{
  "success": true,
  "data": {
    "descriptions": [
      {
        "_id": "card_desc_60a1b2c3d4e5f6789abcdef1",
        "cardNumber": 1,
        "cardName": "甲子",
        "pinyin": "jiazi",
        "description": "甲子为六十甲子之首...",
        "category": "年柱",
        "keywords": ["新开始", "开创", "机遇"]
      }
    ],
    "total": 60,
    "page": 1,
    "limit": 60,
    "hasMore": false
  }
}
```

## 错误码说明

| 错误信息 | 说明 | 解决方案 |
|----------|------|----------|
| 缺少卡牌序号 | cardNumber参数缺失 | 检查请求参数 |
| 卡牌序号必须在1-60范围内 | cardNumber超出有效范围 | 使用1-60之间的序号 |
| 卡牌描述不存在 | 指定序号的卡牌描述未找到 | 检查卡牌序号是否正确 |
| 缺少分类参数 | category参数缺失 | 提供有效的分类参数 |
| 无效的分类 | category值不在支持范围内 | 使用年柱/月柱/日柱/时柱之一 |
| 缺少搜索关键词 | keyword参数缺失 | 提供搜索关键词 |
| 缺少卡牌序号数组 | cardNumbers参数缺失 | 提供卡牌序号数组 |

## 使用示例

### 小程序端调用示例

```javascript
// 获取单张卡牌描述
wx.cloud.callFunction({
  name: 'cardDescriptions',
  data: {
    action: 'getCardDescription',
    data: {
      cardNumber: 1
    }
  }
}).then(res => {
  if (res.result.success) {
    console.log('卡牌描述:', res.result.data);
  } else {
    console.error('获取失败:', res.result.error);
  }
});

// 批量获取卡牌描述
wx.cloud.callFunction({
  name: 'cardDescriptions',
  data: {
    action: 'getCardDescriptionsByNumbers',
    data: {
      cardNumbers: [1, 2, 3, 4, 5]
    }
  }
}).then(res => {
  if (res.result.success) {
    console.log('卡牌描述列表:', res.result.data);
  }
});

// 搜索卡牌描述
wx.cloud.callFunction({
  name: 'cardDescriptions',
  data: {
    action: 'searchCardDescriptions',
    data: {
      keyword: '智慧',
      page: 1,
      limit: 10
    }
  }
}).then(res => {
  if (res.result.success) {
    console.log('搜索结果:', res.result.data);
  }
});
```

## 注意事项

1. **卡牌序号范围**: 所有卡牌序号必须在1-60范围内
2. **分类值**: 分类参数只能是"年柱"、"月柱"、"日柱"、"时柱"之一
3. **分页查询**: 分页参数page从1开始，limit建议不超过100
4. **搜索功能**: 搜索支持卡牌名称、拼音、描述文字和关键词的模糊匹配
5. **数据完整性**: 确保数据库中已初始化1-60所有卡牌的描述数据
