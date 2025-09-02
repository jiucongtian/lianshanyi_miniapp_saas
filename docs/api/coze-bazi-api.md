# Coze 生辰八字计算接口文档

## 接口概述

该接口用于调用 Coze 平台的生辰八字计算服务，根据用户提供的出生时间计算对应的八字信息。

## 接口信息

- **接口名称**: Coze 生辰八字计算
- **请求方法**: POST
- **接口地址**: 通过 `api/coze.js` 模块调用
- **接口类型**: 异步接口
- **超时时间**: 10秒

## 请求参数

### 输入参数

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| datetime | number | 是 | 出生时间的时间戳（毫秒） | 1703123400000 |
| location | string | 否 | 出生地点 | "北京" |

### 请求示例

```javascript
const cozeApi = require('../../api/coze');

// 调用示例
const params = {
  datetime: 1703123400000,  // 2023-12-21 10:30:00
  location: "北京"
};

cozeApi.calculateBazi(params)
  .then(result => {
    console.log('计算结果:', result);
  })
  .catch(error => {
    console.error('计算失败:', error);
  });
```

## 返回数据

### 成功响应

```json
{
  "code": 0,
  "msg": "Success",
  "data": "{\"output\":{\"day\":\"甲戌\",\"hour\":\"戊辰\",\"month\":\"甲申\",\"year\":\"乙巳\"}}",
  "debug_url": "https://www.coze.cn/work_flow?execute_id=754526937...",
  "usage": {
    "token_count": 245,
    "output_count": 128,
    "input_count": 117
  }
}
```

### 返回参数说明

| 参数名 | 类型 | 说明 |
|--------|------|------|
| code | number | 响应状态码，0表示成功 |
| msg | string | 响应消息 |
| data | string | JSON字符串，包含八字计算结果 |
| debug_url | string | 调试链接（可选） |
| usage | object | 接口使用统计信息 |

### data 字段详细结构

`data` 字段是一个JSON字符串，解析后的结构如下：

```json
{
  "output": {
    "year": "乙巳",    // 年柱：天干+地支
    "month": "甲申",   // 月柱：天干+地支  
    "day": "甲戌",     // 日柱：天干+地支
    "hour": "戊辰"     // 时柱：天干+地支
  }
}
```

#### 八字组成说明

每个柱子由两个字符组成：
- **第一个字符**：天干（甲、乙、丙、丁、戊、己、庚、辛、壬、癸）
- **第二个字符**：地支（子、丑、寅、卯、辰、巳、午、未、申、酉、戌、亥）

### 错误响应

```json
{
  "code": -1,
  "msg": "计算失败：参数错误",
  "data": null
}
```

### 错误码说明

| 错误码 | 说明 |
|--------|------|
| 0 | 成功 |
| -1 | 参数错误 |
| -2 | 网络请求失败 |
| -3 | 服务器内部错误 |
| -4 | 接口超时 |

## 数据处理

### 前端解析示例

```javascript
// 解析返回的数据
function parseBaziResult(cozeData) {
  try {
    if (cozeData && cozeData.data) {
      const parsedData = JSON.parse(cozeData.data);
      
      if (parsedData.output) {
        const output = parsedData.output;
        return {
          yearPillar: {
            heavenlyStem: output.year[0],   // 天干
            earthlyBranch: output.year[1]   // 地支
          },
          monthPillar: {
            heavenlyStem: output.month[0],
            earthlyBranch: output.month[1]
          },
          dayPillar: {
            heavenlyStem: output.day[0],
            earthlyBranch: output.day[1]
          },
          timePillar: {
            heavenlyStem: output.hour[0],
            earthlyBranch: output.hour[1]
          }
        };
      }
    }
    return null;
  } catch (error) {
    console.error('解析八字数据失败:', error);
    return null;
  }
}
```

## 使用场景

1. **生辰八字查询页面**: 用户输入出生时间后调用此接口获取八字信息
2. **八字显示页面**: 接收计算结果并展示对应的八字图片
3. **数据缓存**: 计算结果可存储在 `app.globalData.baziResult` 中供其他页面使用

## 注意事项

1. **时间格式**: 输入的datetime必须是标准的时间戳格式（毫秒）
2. **数据缓存**: 建议将计算结果缓存到全局数据中，避免重复请求
3. **错误处理**: 需要处理网络异常和数据解析异常
4. **超时处理**: 接口可能存在超时情况，需要设置合理的超时时间
5. **调试信息**: 返回的debug_url可用于问题排查

## 相关文件

- `api/coze.js` - 接口调用模块
- `pages/dateQuery/index.js` - 时间查询页面
- `pages/bazi/index.js` - 八字显示页面
- `utils/baziImageMap.js` - 八字图片映射表

## 更新日志

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| v1.0 | 2024-01-XX | 初始版本，支持基础八字计算 |

---

*最后更新时间：2024年1月*
