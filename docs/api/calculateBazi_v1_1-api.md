# 生辰八字计算云函数接口文档

## 接口名称
生辰八字计算云函数 - calculateBazi_v1_1

## 接口地址
云函数：`calculateBazi_v1_1`

## 请求方式
- 通过微信小程序云函数调用

## 功能说明
根据用户提供的北京时间戳计算对应的生辰八字（四柱干支），并返回标准化的八字数据结构。

## 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|-----|---|---|---|
| timestamp | number | 是 | 北京时间戳（毫秒） |

## 返回数据

### 成功响应

```json
{
  "success": true,
  "data": {
    "baziData": {
      "year": {"gan": "乙", "zhi": "巳", "ganzhiIndex": 42},
      "month": {"gan": "丙", "zhi": "戌", "ganzhiIndex": 23},
      "day": {"gan": "辛", "zhi": "亥", "ganzhiIndex": 48},
      "hour": {"gan": "丁", "zhi": "酉", "ganzhiIndex": 34}
    },
    "rawCozeData": {...},
    "parameters": {...},
    "timestamp": 1760000400000,
    "openid": "...",
    "appid": "...",
    "unionid": "undefined"
  }
}
```

### 返回字段说明

| 字段名 | 类型 | 说明 |
|-----|---|---|---|
| success | boolean | 云函数执行是否成功 |
| data.baziData | object | **核心八字数据** |
| data.baziData.year | object | 年柱数据 {gan, zhi, ganzhiIndex} |
| data.baziData.month | object | 月柱数据 {gan, zhi, ganzhiIndex} |
| data.baziData.day | object | 日柱数据 {gan, zhi, ganzhiIndex} |
| data.baziData.hour | object | 时柱数据 {gan, zhi, ganzhiIndex} |

## 客户端使用示例

```javascript
// 直接调用云函数（推荐）
const result = await wx.cloud.callFunction({
  name: 'calculateBazi_v1_1',
  data: {
    timestamp: Date.now()
  }
});

if (result.result.success) {
  const baziData = result.result.data.baziData;
  console.log('八字字符串:', baziData.baziString);
}
```

## 重要注意事项

**数据结构层级**：
- 核心数据位置：`result.data.baziData`
- BaziBean期望接收：`baziData` 部分，不是整个 `data` 对象
- 正确使用：`new BaziBean(result.data.baziData)`

## 版本历史

- **v1.1** - 修复数据传递层级问题，优化错误处理