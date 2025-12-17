# Coze Functions API v1.4 - 智能解读服务

## 接口概述

`cozeFunctions_v1_4` 是一个通用的Coze工作流调用云函数，支持多种AI智能解读服务。当前支持抽卡牌解读、生成八字和获取日报等工作流。

## 版本信息

- **云函数名称**: `cozeFunctions_v1_4`
- **版本**: v1.4
- **状态**: ✅ 已完成
- **支持客户端版本**: 1.4.0+

## 接口信息

- **云函数名**: 通过 `VersionManager.getFunctionName('cozeFunctions')` 获取
- **调用方式**: `wx.cloud.callFunction()`
- **超时时间**: 60秒

## 请求参数

### 主要参数结构

```javascript
{
  workflowType: string,  // 工作流类型（必填）
  parameters: object     // 工作流参数（必填）
}
```

### 参数说明

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| workflowType | string | 是 | 工作流类型，可选值：DRAW_CARD（抽卡解读）、GEN_BAZI（生成八字）、GET_DAILY_INSIGHT（获取日报） | "GET_DAILY_INSIGHT" |
| parameters | object | 是 | 工作流参数，根据不同工作流类型传入不同参数 | { caning: "5", ganzhiname: "己未" } |

### 工作流类型说明

#### DRAW_CARD - 抽卡解读

用于对干支文字进行AI解读分析。

**parameters 参数**：

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| bazi_name | string | 是 | 卡牌名称（60甲子之一） | "甲子" |
| question | string | 否 | 用户的问题 | "请解读这个卡牌" |

#### GEN_BAZI - 生成八字

用于生成八字信息。

**parameters 参数**：

根据实际工作流需求传入相应参数。

#### GET_DAILY_INSIGHT - 获取日报

用于获取每日卡牌解读信息。

**parameters 参数**：

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| cai_neng | string | 是 | 爻位数字（字符串格式） | "2" 或 "5" |
| gan_zhi | string | 是 | 干支名称（60甲子之一） | "己未" |

## 返回数据

### 成功响应

#### GET_DAILY_INSIGHT 工作流返回格式

```json
{
  "success": true,
  "data": {
    "code": 0,
    "msg": "success",
    "data": {
      "output": "{\"blessing\":\"今天可以借助夏季温暖热烈的能量，发挥你的战斗力优势，在资源共享或主动出击争取结果的过程中，把能量提炼得更精炼，同时用温暖的态度对待他人，会收获更多认可与成长。\",\"password\":\"精战守衡\",\"tip\":\"注意避免因固执己见错过合作机会，处理资源相关事务时平衡利益与情义，别让燥气影响判断，适时冷静调整节奏，规避不必要的矛盾。\"}"
    }
  },
  "workflowType": "GET_DAILY_INSIGHT",
  "workflowId": "7583167143870382106",
  "parameters": {
    "cai_neng": "2",
    "gan_zhi": "己未"
  },
  "openid": "用户openid",
  "appid": "小程序appid",
  "unionid": "用户unionid",
  "timestamp": 1694678400000
}
```

**注意**：`output` 字段是一个 JSON 字符串，需要解析后才能获取 `blessing`、`password`、`tip` 等字段。

#### 其他工作流返回格式

```json
{
  "success": true,
  "data": {
    "code": 0,
    "msg": "success",
    "data": {
      "output": "AI解读结果文本...",
      "result": "...",
      "text": "..."
    }
  },
  "workflowType": "DRAW_CARD",
  "workflowId": "7565131575660003366",
  "parameters": {
    "bazi_name": "甲子",
    "question": "请解读这个卡牌"
  },
  "openid": "用户openid",
  "appid": "小程序appid",
  "unionid": "用户unionid",
  "timestamp": 1694678400000
}
```

### 失败响应

```json
{
  "success": false,
  "error": "错误信息",
  "code": -1,
  "timestamp": 1694678400000
}
```

### 返回字段说明

| 字段名 | 类型 | 说明 |
|--------|------|------|
| success | boolean | 调用是否成功 |
| data | object | Coze API 返回的完整数据 |
| data.code | number | Coze API 状态码，0表示成功 |
| data.msg | string | Coze API 状态消息 |
| data.data | object | 工作流返回的实际数据 |
| data.data.output | string | 工作流输出（可能是JSON字符串，需要解析） |
| workflowType | string | 使用的工作流类型 |
| workflowId | string | 实际调用的工作流ID |
| parameters | object | 传入的参数 |
| error | string | 错误信息（失败时） |
| timestamp | number | 时间戳 |

## 使用示例

### 方式1：通过 Service 层调用（推荐）

```javascript
// 引入 DailyInsightService
const { dailyInsightService } = require('../../services/DailyInsightService');

// 调用 getDailyInsightFromCoze 方法
const result = await dailyInsightService.getDailyInsightFromCoze('2', '己未');

// 处理返回结果
if (result.success) {
  console.log('✅ 获取成功');
  
  // 方式1：使用Service自动解析的数据
  if (result.data.parsedOutput) {
    console.log('祝福语:', result.data.parsedOutput.blessing);
    console.log('通关密码:', result.data.parsedOutput.password);
    console.log('提示:', result.data.parsedOutput.tip);
  }
  
  // 方式2：手动解析（如果Service未解析）
  if (result.data.data && result.data.data.output) {
    try {
      const dailyInsight = JSON.parse(result.data.data.output);
      console.log('祝福语:', dailyInsight.blessing);
      console.log('通关密码:', dailyInsight.password);
      console.log('提示:', dailyInsight.tip);
    } catch (parseError) {
      console.error('解析失败:', parseError);
    }
  }
} else {
  console.error('❌ 获取失败:', result.error);
}
```

### 方式2：直接调用云函数

```javascript
const { VersionManager } = require('../../utils/manager/versionManager');

// 获取云函数名称（通过版本管理器）
const functionName = VersionManager.getFunctionName('cozeFunctions');

// 调用云函数
const result = await wx.cloud.callFunction({
  name: functionName,
  data: {
    workflowType: 'GET_DAILY_INSIGHT',
    parameters: {
      cai_neng: '2',  // 爻位数字
      gan_zhi: '己未'  // 干支名称
    }
  }
});

// 处理返回结果
if (result.result && result.result.success) {
  const data = result.result.data;
  
  // 解析 output 字段（JSON字符串）
  let dailyInsight = {};
  if (data.data && data.data.output) {
    try {
      dailyInsight = JSON.parse(data.data.output);
      console.log('祝福语:', dailyInsight.blessing);
      console.log('通关密码:', dailyInsight.password);
      console.log('提示:', dailyInsight.tip);
    } catch (parseError) {
      console.error('解析日报数据失败:', parseError);
    }
  }
} else {
  console.error('获取日报失败:', result.result?.error);
}
```

### DRAW_CARD 工作流调用示例

```javascript
const { VersionManager } = require('../../utils/manager/versionManager');

// 获取云函数名称（通过版本管理器）
const functionName = VersionManager.getFunctionName('cozeFunctions');

// 调用云函数
const result = await wx.cloud.callFunction({
  name: functionName,
  data: {
    workflowType: 'DRAW_CARD',
    parameters: {
      bazi_name: '甲子',
      question: '请解读这个卡牌'
    }
  }
});

// 处理返回结果
if (result.result && result.result.success) {
  const data = result.result.data;
  
  // 提取AI解读结果
  let interpretation = '';
  if (data.data) {
    interpretation = data.data.output || data.data.result || data.data.text;
  }
  
  console.log('AI解读结果:', interpretation);
  
  // 如果有抽卡配额信息
  if (result.result.drawCardQuota) {
    console.log('剩余抽卡次数:', result.result.drawCardQuota.drawCardRemainingQuota);
  }
} else {
  console.error('解读失败:', result.result?.error);
}
```

## 版本管理

调用此云函数时，必须通过 `VersionManager` 获取正确的云函数名称：

```javascript
const { VersionManager } = require('../../utils/manager/versionManager');

// 自动根据客户端版本获取对应的云函数名称
const functionName = VersionManager.getFunctionName('cozeFunctions');
// 返回: 'cozeFunctions_v1_4' (当客户端版本为1.4.0时)
```

### 版本映射关系

| 客户端版本 | 云函数版本 | 云函数名称 |
|-----------|-----------|-----------|
| 1.0.0 | v1_0 | cozeFunctions |
| 1.1.0 | v1_0 | cozeFunctions |
| 1.2.0 | v1_3 | cozeFunctions_v1_3 |
| 1.4.0 | v1_4 | cozeFunctions_v1_4 |

## 错误处理

### 常见错误码

| 错误码 | 说明 | 处理建议 |
|-------|------|---------|
| 4028 | 免费配额已用完 | 提示用户稍后再试或升级计划 |
| 401 | API认证失败 | 检查token配置 |
| 429 | 请求过于频繁 | 提示用户稍后再试 |
| -1 | 参数错误 | 检查传入参数是否完整 |

### 错误处理示例

```javascript
try {
  const result = await wx.cloud.callFunction({ /* ... */ });
  
  if (!result.result.success) {
    const error = result.result.error;
    
    // 根据错误信息进行不同处理
    if (error.includes('配额')) {
      wx.showToast({ title: '当前服务繁忙，请稍后再试', icon: 'none' });
    } else if (error.includes('网络')) {
      wx.showToast({ title: '网络连接失败，请检查网络', icon: 'none' });
    } else {
      wx.showToast({ title: error, icon: 'none' });
    }
  }
} catch (error) {
  console.error('云函数调用异常:', error);
  wx.showToast({ title: '服务异常，请重试', icon: 'none' });
}
```

## 注意事项

1. **超时处理**: 云函数设置了60秒超时，如果工作流执行时间较长，需要注意超时处理
2. **参数验证**: 调用前必须验证 `parameters` 参数的完整性
3. **版本管理**: 必须通过 `VersionManager` 获取云函数名称，不要硬编码
4. **结果解析**: GET_DAILY_INSIGHT 工作流的 `output` 字段是 JSON 字符串，需要先解析才能使用
5. **日志记录**: 建议使用项目统一的 logger 记录关键操作日志
6. **抽卡记录**: DRAW_CARD 工作流会自动记录抽卡历史并返回配额信息

## 相关文件

### 云函数端

- `/cloudfunctions/cozeFunctions_v1_4/index.js` - 云函数实现
- `/cloudfunctions/cozeFunctions_v1_4/package.json` - 依赖配置

### 客户端

- `/miniprogram/pages/answer/index.js` - 调用示例（AI解读功能）
- `/miniprogram/utils/manager/versionManager.js` - 版本管理器

### 文档

- `/docs/api/cozeFunctions_examples.md` - 更多使用示例
- `/docs/cozeFunctionsAPI.md` - API详细说明

## 更新日志

### v1.4 (2025-01-XX)

- ✅ 新增 GET_DAILY_INSIGHT 工作流，支持获取每日卡牌解读
- ✅ 支持 DRAW_CARD 和 GEN_BAZI 工作流
- ✅ 增强错误处理，提供友好的错误信息
- ✅ 优化超时控制（60秒）
- ✅ 完善日志记录
- ✅ 集成到 answer 页面，提供干支解读功能

### v1.3 (2025-11-11)

- ✅ 支持 DRAW_CARD 和 GEN_BAZI 工作流
- ✅ 增强错误处理，提供友好的错误信息
- ✅ 优化超时控制
- ✅ 完善日志记录
- ✅ 集成到 answer 页面，提供干支解读功能

---

*最后更新时间：2025年1月*

