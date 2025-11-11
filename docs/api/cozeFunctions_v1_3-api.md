# Coze Functions API v1.3 - 智能解读服务

## 接口概述

`cozeFunctions_v1_3` 是一个通用的Coze工作流调用云函数，支持多种AI智能解读服务。当前支持抽卡牌解读和生成八字等工作流。

## 版本信息

- **云函数名称**: `cozeFunctions_v1_3`
- **版本**: v1.3
- **状态**: ✅ 已完成
- **支持客户端版本**: 1.2.0+

## 接口信息

- **云函数名**: 通过 `VersionManager.getFunctionName('cozeFunctions')` 获取
- **调用方式**: `wx.cloud.callFunction()`
- **超时时间**: 25秒

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
| workflowType | string | 是 | 工作流类型，可选值：DRAW_CARD（抽卡解读）、GEN_BAZI（生成八字） | "DRAW_CARD" |
| parameters | object | 是 | 工作流参数，根据不同工作流类型传入不同参数 | { ganzhi: "甲子", question: "我的问题" } |

### 工作流类型说明

#### DRAW_CARD - 抽卡解读

用于对干支文字进行AI解读分析。

**parameters 参数**：

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| ganzhi | string | 是 | 要解读的干支文字 | "甲子年丙寅月庚申日戊寅时" |
| question | string | 否 | 用户的问题 | "请解读这个八字" |

#### GEN_BAZI - 生成八字

用于生成八字信息。

**parameters 参数**：

根据实际工作流需求传入相应参数。

## 返回数据

### 成功响应

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
    "ganzhi": "甲子年丙寅月庚申日戊寅时",
    "question": "请解读这个八字"
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
| data.data.output | string | AI解读输出文本（主要字段） |
| workflowType | string | 使用的工作流类型 |
| workflowId | string | 实际调用的工作流ID |
| parameters | object | 传入的参数 |
| error | string | 错误信息（失败时） |
| timestamp | number | 时间戳 |

## 使用示例

### 在answer页面调用AI解读

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
      ganzhi: '甲子年丙寅月庚申日戊寅时',
      question: '请解读这个八字'
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
} else {
  console.error('解读失败:', result.result?.error);
}
```

### 完整的页面集成示例

参考 `/miniprogram/pages/answer/index.js` 中的 `onAIInterpret()` 方法：

```javascript
async onAIInterpret() {
  // 1. 验证输入
  if (!this.data.ganzhiInput || this.data.ganzhiInput.trim() === '') {
    wx.showToast({ title: '请输入干支文字', icon: 'none' });
    return;
  }
  
  // 2. 显示加载状态
  wx.showLoading({ title: 'AI解读中...', mask: true });
  this.setData({ isInterpreting: true });
  
  try {
    // 3. 调用云函数
    const functionName = VersionManager.getFunctionName('cozeFunctions');
    const result = await wx.cloud.callFunction({
      name: functionName,
      data: {
        workflowType: 'DRAW_CARD',
        parameters: {
          ganzhi: this.data.ganzhiInput,
          question: this.data.question
        }
      }
    });
    
    // 4. 处理结果
    wx.hideLoading();
    
    if (result.result && result.result.success) {
      const interpretation = result.result.data.data.output;
      this.setData({ aiInterpretation: interpretation });
      wx.showToast({ title: '解读成功', icon: 'success' });
    } else {
      wx.showToast({ 
        title: result.result?.error || '解读失败', 
        icon: 'none' 
      });
    }
  } catch (error) {
    wx.hideLoading();
    wx.showToast({ title: '网络错误，请重试', icon: 'none' });
  } finally {
    this.setData({ isInterpreting: false });
  }
}
```

## 版本管理

调用此云函数时，必须通过 `VersionManager` 获取正确的云函数名称：

```javascript
const { VersionManager } = require('../../utils/manager/versionManager');

// 自动根据客户端版本获取对应的云函数名称
const functionName = VersionManager.getFunctionName('cozeFunctions');
// 返回: 'cozeFunctions_v1_3' (当客户端版本为1.2.0时)
```

### 版本映射关系

| 客户端版本 | 云函数版本 | 云函数名称 |
|-----------|-----------|-----------|
| 1.0.0 | v1_0 | cozeFunctions |
| 1.1.0 | v1_0 | cozeFunctions |
| 1.2.0 | v1_3 | cozeFunctions_v1_3 |

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

1. **超时处理**: 云函数设置了25秒超时，如果工作流执行时间较长，需要注意超时处理
2. **参数验证**: 调用前必须验证 `parameters` 参数的完整性
3. **版本管理**: 必须通过 `VersionManager` 获取云函数名称，不要硬编码
4. **结果提取**: AI解读结果可能存在于 `output`、`result` 或 `text` 字段中，需要依次尝试
5. **日志记录**: 建议使用项目统一的 logger 记录关键操作日志

## 相关文件

### 云函数端

- `/cloudfunctions/cozeFunctions_v1_3/index.js` - 云函数实现
- `/cloudfunctions/cozeFunctions_v1_3/package.json` - 依赖配置

### 客户端

- `/miniprogram/pages/answer/index.js` - 调用示例（AI解读功能）
- `/miniprogram/utils/manager/versionManager.js` - 版本管理器

### 文档

- `/docs/api/cozeFunctions_examples.md` - 更多使用示例
- `/docs/cozeFunctionsAPI.md` - API详细说明

## 更新日志

### v1.3 (2025-11-11)

- ✅ 支持 DRAW_CARD 和 GEN_BAZI 工作流
- ✅ 增强错误处理，提供友好的错误信息
- ✅ 优化超时控制
- ✅ 完善日志记录
- ✅ 集成到 answer 页面，提供干支解读功能

---

*最后更新时间：2025年11月11日*

