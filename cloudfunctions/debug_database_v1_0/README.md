# 数据库调试云函数

## 📋 概述

此云函数用于管理员调试数据库操作，支持执行常见的数据库查询、添加、更新、删除等操作。同时提供用户配额查询等调试功能。

**⚠️ 重要：此云函数仅限管理员使用，普通用户无法调用。**

## 🎯 功能列表

1. **数据库操作调试**：通过 command 参数执行数据库操作
2. **用户抽卡配额查询**：通过用户名或 openid 查询用户的抽卡配额信息

## 🔐 权限验证

云函数会自动验证调用者是否为管理员：
- 用户类型为 `admin`，或
- `adminRole` 字段不为 `none`

## 🚀 使用方式

### 方式1：直接执行数据库查询代码（推荐）⭐

**新增功能**：支持直接执行 JavaScript 数据库查询代码，无需修改云函数即可执行任何查询。

```javascript
wx.cloud.callFunction({
  name: 'debug_database_v1_0',
  data: {
    queryCode: `
      db.collection('users')
        .aggregate()
        .match({
          'nickName': '朱峰｜Fred',
          'isActive': true
        })
        .lookup({
          from: 'profiles',
          localField: 'openid',
          foreignField: 'openid',
          as: 'profiles'
        })
        .addFields({
          'activeProfiles': {
            $filter: {
              input: '$profiles',
              cond: { 
                $and: [
                  { $eq: ['$$this.isActive', true] }
                ]
              }
            }
          }
        })
        .project({
          '_id': 1,
          'openid': 1,
          'nickName': 1,
          'avatarUrl': 1,
          'activeProfiles': 1,
          'profileCount': { $size: '$activeProfiles' }
        })
        .end()
    `
  }
}).then(res => {
  console.log('执行结果:', res.result);
});
```

**可用对象：**
- `db`：数据库对象
- `_`：查询操作符（`db.command`），如 `_.gt()`, `_.lt()`, `_.eq()` 等
- `$`：聚合操作符（`db.command.aggregate`），如 `$.sum()`, `$.first()`, `$.addToSet()` 等

**支持的查询类型：**
- 普通查询：`db.collection('xxx').where({...}).get()`
- 聚合查询：`db.collection('xxx').aggregate().match({...}).group({...}).end()`
- 计数查询：`db.collection('xxx').where({...}).count()`
- 所有微信云开发支持的数据库操作

### 方式2：JSON 格式命令（原有方式）

```javascript
wx.cloud.callFunction({
  name: 'debug_database_v1_0',
  data: {
    command: JSON.stringify({
      operation: 'get',        // 操作类型：get, add, update, remove, count, aggregate
      collection: 'users',     // 集合名称
      where: {},              // 查询条件（可选）
      // ... 其他参数根据操作类型而定
    })
  }
}).then(res => {
  console.log('执行结果:', res.result);
});
```

## 📖 支持的操作类型

### 1. 查询操作 (get)

查询数据库记录：

```javascript
const command = JSON.stringify({
  operation: 'get',
  collection: 'users',
  where: {
    isActive: true,
    userType: 'normal'
  },
  field: {},              // 字段筛选（可选）
  orderBy: {              // 排序（可选）
    field: 'createTime',
    order: 'desc'
  },
  skip: 0,               // 跳过记录数（可选）
  limit: 20              // 返回数量限制（可选，最多100条）
});

wx.cloud.callFunction({
  name: 'debug_database_v1_0',
  data: { command }
});
```

### 2. 添加操作 (add)

添加新记录：

```javascript
const command = JSON.stringify({
  operation: 'add',
  collection: 'users',
  data: {
    openid: 'test_openid',
    nickName: '测试用户',
    userType: 'guest',
    isActive: true
  }
});

wx.cloud.callFunction({
  name: 'debug_database_v1_0',
  data: { command }
});
```

### 3. 更新操作 (update)

更新记录：

```javascript
const command = JSON.stringify({
  operation: 'update',
  collection: 'users',
  where: {
    openid: 'test_openid'
  },
  data: {
    nickName: '更新后的昵称',
    updateTime: new Date()
  }
});

wx.cloud.callFunction({
  name: 'debug_database_v1_0',
  data: { command }
});
```

### 4. 删除操作 (remove)

删除记录：

```javascript
const command = JSON.stringify({
  operation: 'remove',
  collection: 'users',
  where: {
    openid: 'test_openid',
    isActive: false
  }
});

wx.cloud.callFunction({
  name: 'debug_database_v1_0',
  data: { command }
});
```

### 5. 计数操作 (count)

统计记录数量：

```javascript
const command = JSON.stringify({
  operation: 'count',
  collection: 'users',
  where: {
    isActive: true,
    userType: 'normal'
  }
});

wx.cloud.callFunction({
  name: 'debug_database_v1_0',
  data: { command }
});
```

### 6. 聚合操作 (aggregate)

执行聚合查询：

```javascript
const command = JSON.stringify({
  operation: 'aggregate',
  collection: 'users',
  stages: [
    {
      type: 'match',
      data: {
        isActive: true
      }
    },
    {
      type: 'group',
      data: {
        _id: '$userType',
        count: _.sum(1)
      }
    },
    {
      type: 'sort',
      data: {
        count: -1
      }
    }
  ]
});

wx.cloud.callFunction({
  name: 'debug_database_v1_0',
  data: { command }
});
```

**注意：** 聚合操作使用 stages 数组，每个阶段包含 `type`（阶段类型）和 `data`（阶段数据）。支持的阶段类型：`match`、`group`、`sort`、`limit`、`skip`、`project`。

## 📤 返回格式

### queryCode 方式返回格式

#### 聚合查询返回

```json
{
  "success": true,
  "data": {
    "type": "aggregate",
    "count": 10,
    "data": [...]
  },
  "message": "查询执行成功",
  "code": 0,
  "timestamp": 1694678400000
}
```

#### 普通查询返回

```json
{
  "success": true,
  "data": {
    "type": "query",
    "count": 10,
    "data": [...]
  },
  "message": "查询执行成功",
  "code": 0,
  "timestamp": 1694678400000
}
```

#### 计数查询返回

```json
{
  "success": true,
  "data": {
    "type": "count",
    "total": 100
  },
  "message": "查询执行成功",
  "code": 0,
  "timestamp": 1694678400000
}
```

### command 方式返回格式（原有方式）

#### 成功响应

```json
{
  "success": true,
  "data": {
    "operation": "get",
    "collection": "users",
    "count": 10,
    "data": [...]
  },
  "message": "数据库操作执行成功",
  "code": 0,
  "timestamp": 1694678400000
}
```

### 错误响应

```json
{
  "success": false,
  "error": "错误信息",
  "code": -403,
  "data": {
    "openid": "用户openid",
    "userType": "guest",
    "adminRole": "none"
  },
  "timestamp": 1694678400000
}
```

## ⚠️ 注意事项

1. **权限限制**：只有管理员可以调用此云函数
2. **安全考虑**：此函数仅用于调试，生产环境应谨慎使用
3. **queryCode 方式（推荐）**：
   - 支持执行任何微信云开发数据库查询代码
   - 代码在安全的沙箱环境中执行，只提供 `db`、`_`、`$` 对象
   - 如果查询代码以 `.end()` 结尾，会自动添加 `return await`
   - 支持所有微信云开发支持的数据库操作和聚合操作
   - 无需修改云函数即可执行新的查询
4. **command 方式（原有方式）**：
   - 数据限制：查询操作最多返回100条记录
   - 时间戳：添加和更新操作会自动添加时间戳字段
   - 命令格式：`command` 参数必须是有效的 JSON 字符串
5. **聚合操作符**：在 queryCode 中使用 `$` 表示聚合操作符，如 `$.sum()`, `$.first()`, `$filter` 等
6. **查询操作符**：在 queryCode 中使用 `_` 表示查询操作符，如 `_.gt()`, `_.lt()`, `_.eq()` 等

## 🔍 错误码说明

| 错误码 | 说明 |
|--------|------|
| -400 | 参数错误（缺少参数或格式错误） |
| -403 | 权限不足（非管理员用户） |
| -500 | 服务器内部错误 |

## 📝 示例

### 直接执行数据库查询代码示例

#### 示例1：复杂聚合查询（用户及其档案）

```javascript
const queryCode = `
  db.collection('users')
    .aggregate()
    .match({
      'nickName': '朱峰｜Fred',
      'isActive': true
    })
    .lookup({
      from: 'profiles',
      localField: 'openid',
      foreignField: 'openid',
      as: 'profiles'
    })
    .addFields({
      'activeProfiles': {
        $filter: {
          input: '$profiles',
          cond: { 
            $and: [
              { $eq: ['$$this.isActive', true] }
            ]
          }
        }
      }
    })
    .project({
      '_id': 1,
      'openid': 1,
      'nickName': 1,
      'avatarUrl': 1,
      'activeProfiles': 1,
      'profileCount': { $size: '$activeProfiles' }
    })
    .end()
`;

wx.cloud.callFunction({
  name: 'debug_database_v1_0',
  data: { queryCode }
}).then(res => {
  if (res.result.success) {
    console.log('查询结果:', res.result.data);
    console.log('数据数量:', res.result.data.count);
    console.log('数据列表:', res.result.data.data);
  }
});
```

#### 示例2：普通查询

```javascript
const queryCode = `
  db.collection('users')
    .where({
      isActive: true,
      userType: 'normal'
    })
    .orderBy('createTime', 'desc')
    .limit(20)
    .get()
`;

wx.cloud.callFunction({
  name: 'debug_database_v1_0',
  data: { queryCode }
});
```

#### 示例3：使用聚合操作符

```javascript
const queryCode = `
  db.collection('draw_card_records')
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
    .end()
`;

wx.cloud.callFunction({
  name: 'debug_database_v1_0',
  data: { queryCode }
});
```

#### 示例4：使用查询操作符

```javascript
const queryCode = `
  db.collection('users')
    .where({
      createTime: _.gte(new Date('2024-01-01')),
      isActive: true
    })
    .count()
`;

wx.cloud.callFunction({
  name: 'debug_database_v1_0',
  data: { queryCode }
});
```

#### 示例5：查询用户抽卡配额（使用 queryCode 方式）

```javascript
const identifier = '用户名或openid'; // 用户输入
const today = new Date().toISOString().split('T')[0];

const queryCode = \`
  // 第一步：查询用户信息
  const userResult = await db.collection('users')
    .where({
      $or: [
        { openid: '\${identifier}', isActive: true },
        { nickName: '\${identifier}', isActive: true }
      ]
    })
    .get();
  
  if (userResult.data.length === 0) {
    throw new Error('用户不存在');
  }
  
  const user = userResult.data[0];
  const userOpenid = user.openid;
  const userType = user.userType || 'guest';
  
  // 第二步：获取用户类型配置（免费配额）
  const typeConfigResult = await db.collection('static_user_types')
    .where({ typeCode: userType })
    .get();
  
  const typeConfig = typeConfigResult.data.length > 0 
    ? typeConfigResult.data[0] 
    : { dailyDrawQuota: 0, typeName: userType };
  
  const dailyDrawQuota = typeConfig.dailyDrawQuota !== undefined ? typeConfig.dailyDrawQuota : 0;
  
  // 第三步：统计今日免费使用次数
  const freeUsedTodayResult = await db.collection('function_usage_records')
    .where({
      openid: userOpenid,
      functionCode: 'wisdom_insight',
      isPaid: false,
      usageDate: '\${today}'
    })
    .count();
  
  const freeUsedToday = freeUsedTodayResult.total;
  
  // 第四步：计算免费剩余配额
  const freeRemaining = dailyDrawQuota === -1 
    ? -1 
    : Math.max(0, dailyDrawQuota - freeUsedToday);
  
  // 第五步：获取付费配额
  const paidQuotaResult = await db.collection('function_quotas')
    .where({ openid: userOpenid })
    .get();
  
  let paidTotal = 0;
  let paidUsed = 0;
  let paidRemaining = 0;
  
  if (paidQuotaResult.data.length > 0) {
    const quotaDoc = paidQuotaResult.data[0];
    const wisdomQuota = quotaDoc.quotas?.wisdom_insight || {};
    paidTotal = wisdomQuota.paidTotal || 0;
    paidUsed = wisdomQuota.paidUsed || 0;
    paidRemaining = wisdomQuota.paidRemaining || 0;
  }
  
  // 返回结果
  return {
    user: {
      _id: user._id,
      openid: userOpenid,
      nickName: user.nickName,
      userType: userType,
      typeName: typeConfig.typeName || userType
    },
    quota: {
      free: {
        dailyQuota: dailyDrawQuota === -1 ? -1 : dailyDrawQuota,
        usedToday: freeUsedToday,
        remaining: freeRemaining
      },
      paid: {
        total: paidTotal,
        used: paidUsed,
        remaining: paidRemaining
      },
      total: {
        remaining: (freeRemaining === -1 || paidRemaining === -1) 
          ? -1 
          : freeRemaining + paidRemaining
      }
    }
  };
\`;

wx.cloud.callFunction({
  name: 'debug_database_v1_0',
  data: { queryCode }
}).then(res => {
  if (res.result.success) {
    const quotaData = res.result.data.data; // queryCode 方式返回的数据在 data.data 中
    console.log('用户信息:', quotaData.user);
    console.log('免费配额:', quotaData.quota.free);
    console.log('付费配额:', quotaData.quota.paid);
    console.log('总剩余配额:', quotaData.quota.total.remaining);
  }
});
```

### 完整示例：查询用户列表

```javascript
// 在小程序中调用
Page({
  async onLoad() {
    try {
      const command = JSON.stringify({
        operation: 'get',
        collection: 'users',
        where: {
          isActive: true
        },
        orderBy: {
          field: 'createTime',
          order: 'desc'
        },
        limit: 20
      });
      
      const result = await wx.cloud.callFunction({
        name: 'debug_database_v1_0',
        data: { command }
      });
      
      if (result.result.success) {
        console.log('查询成功:', result.result.data);
        console.log('用户数量:', result.result.data.count);
        console.log('用户列表:', result.result.data.data);
      } else {
        console.error('查询失败:', result.result.error);
      }
    } catch (error) {
      console.error('调用失败:', error);
    }
  }
});
```
