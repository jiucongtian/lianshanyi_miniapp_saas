# 数据库调试云函数

## 📋 概述

此云函数用于管理员调试数据库操作，支持执行常见的数据库查询、添加、更新、删除等操作。

**⚠️ 重要：此云函数仅限管理员使用，普通用户无法调用。**

## 🔐 权限验证

云函数会自动验证调用者是否为管理员：
- 用户类型为 `admin`，或
- `adminRole` 字段不为 `none`

## 🚀 使用方式

### 调用格式

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

### 成功响应

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
3. **数据限制**：查询操作最多返回100条记录
4. **时间戳**：添加和更新操作会自动添加时间戳字段
5. **命令格式**：`command` 参数必须是有效的 JSON 字符串

## 🔍 错误码说明

| 错误码 | 说明 |
|--------|------|
| -400 | 参数错误（缺少参数或格式错误） |
| -403 | 权限不足（非管理员用户） |
| -500 | 服务器内部错误 |

## 📝 示例

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
