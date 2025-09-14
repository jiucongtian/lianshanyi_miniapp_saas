# testFunction 云函数接口文档

## 接口概述

`testFunction` 是一个用于测试的简单云函数，主要功能是打印日志信息并返回基本的执行结果。

## 接口信息

- **函数名称**: `testFunction`
- **调用方式**: 微信小程序云函数调用
- **环境要求**: 微信小程序云开发环境

## 请求参数

该函数接受任意参数，主要用于测试目的。

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| 任意参数 | any | 否 | 测试参数，函数会将接收到的所有参数打印到日志中 |

## 返回数据

### 成功响应

```json
{
  "success": true,
  "message": "测试云函数执行成功！",
  "timestamp": 1694678400000,
  "data": {
    "openid": "用户的openid",
    "appid": "小程序的appid", 
    "unionid": "用户的unionid",
    "receivedParams": {
      "传入的参数": "参数值"
    },
    "executionTime": "2023-09-14T08:00:00.000Z"
  }
}
```

### 返回字段说明

| 字段名 | 类型 | 说明 |
|--------|------|------|
| success | boolean | 执行是否成功 |
| message | string | 执行结果消息 |
| timestamp | number | 执行时间戳 |
| data | object | 详细数据 |
| data.openid | string | 用户的微信openid |
| data.appid | string | 小程序的appid |
| data.unionid | string | 用户的微信unionid（可能为空） |
| data.receivedParams | object | 函数接收到的参数 |
| data.executionTime | string | 执行时间（ISO格式） |

## 使用示例

### 小程序端调用

```javascript
// 在小程序页面中调用
wx.cloud.callFunction({
  name: 'testFunction',
  data: {
    testParam: 'hello world',
    number: 123,
    boolean: true
  },
  success: res => {
    console.log('云函数调用成功:', res.result)
    if (res.result.success) {
      console.log('测试消息:', res.result.message)
      console.log('执行时间:', res.result.data.executionTime)
    }
  },
  fail: err => {
    console.error('云函数调用失败:', err)
  }
})
```

### 使用云函数API调用

```javascript
// 使用封装的API调用
import { callCloudFunction } from '../api/cloud.js'

async function testCloudFunction() {
  try {
    const result = await callCloudFunction('testFunction', {
      message: 'test message',
      userId: 'user123'
    })
    
    if (result.success) {
      console.log('测试成功:', result.message)
      console.log('返回数据:', result.data)
    }
  } catch (error) {
    console.error('调用失败:', error)
  }
}
```

## 日志输出

该函数会在云函数日志中输出以下信息：

1. 执行开始标记
2. 执行时间
3. 用户信息（openid、appid、unionid）
4. 接收到的参数
5. 云函数上下文信息
6. 执行完成标记

## 注意事项

1. 这是一个测试函数，主要用于验证云函数环境和日志功能
2. 函数会记录所有传入的参数，请注意不要传入敏感信息
3. 返回的用户信息依赖于微信小程序的授权状态
4. 该函数没有复杂的业务逻辑，主要用于测试和调试

## 错误处理

由于这是一个简单的测试函数，通常不会出现错误。如果出现异常，会返回云函数的标准错误信息。

## 更新日志

- 2023-09-14: 创建测试云函数，提供基本的日志打印和参数返回功能

