# Coze 工作流云函数快速参考

## 调用格式

```javascript
wx.cloud.callFunction({
  name: 'cozeFunctions_v1_3',
  data: {
    workflowType: 'WORKFLOW_TYPE',  // 可选，工作流类型枚举
    parameters: {                    // 必填，工作流参数对象
      // 具体参数
    }
  }
})
```

## 支持的工作流类型

| 枚举名 | 说明 | 参数 |
|-------|------|------|
| `DRAW_CARD` (默认) | 抽卡牌 | `bazi_name`, `question`(可选) |
| `GEN_BAZI` | 生成八字 | `year`, `month`, `day`, `hour`, `min` |

## 快速示例

### 抽卡（默认工作流）

```javascript
wx.cloud.callFunction({
  name: 'cozeFunctions_v1_3',
  data: {
    parameters: {
      bazi_name: '甲戌',
      question: '今天运势如何？'
    }
  },
  success: res => {
    if (res.result.success) {
      console.log(res.result.data);
    }
  }
});
```

### 生成八字

```javascript
wx.cloud.callFunction({
  name: 'cozeFunctions_v1_3',
  data: {
    workflowType: 'GEN_BAZI',
    parameters: {
      year: 2024,
      month: 1,
      day: 15,
      hour: 10,
      min: 30
    }
  },
  success: res => {
    if (res.result.success) {
      console.log(res.result.data);
    }
  }
});
```

## 返回数据结构

```javascript
{
  success: true,           // 是否成功
  data: {},               // Coze 返回的数据
  workflowType: 'DRAW_CARD',  // 使用的工作流类型
  workflowId: '...',      // 实际的工作流ID
  parameters: {},         // 传入的参数
  timestamp: 1234567890   // 时间戳
}
```

## 添加新工作流

在 `cloudfunctions/cozeFunctions_v1_3/index.js` 中：

```javascript
const WORKFLOW_TYPES = {
  DRAW_CARD: '7565131575660003366',
  GEN_BAZI: '7544388114807095337',
  YOUR_WORKFLOW: 'your_workflow_id',  // 添加这里
}
```

然后直接调用：

```javascript
wx.cloud.callFunction({
  name: 'cozeFunctions_v1_3',
  data: {
    workflowType: 'YOUR_WORKFLOW',
    parameters: { /* 你的参数 */ }
  }
});
```

## 错误处理

```javascript
const res = await wx.cloud.callFunction({
  name: 'cozeFunctions_v1_3',
  data: { workflowType, parameters }
});

if (res.result.success) {
  // 成功处理
  console.log(res.result.data);
} else {
  // 错误处理
  console.error(res.result.error);
  // 错误码：res.result.code
}
```

## 封装 Service

```javascript
// services/CozeService.js
class CozeService {
  async callWorkflow(workflowType, parameters) {
    const res = await wx.cloud.callFunction({
      name: 'cozeFunctions_v1_3',
      data: { workflowType, parameters }
    });
    return res.result;
  }
  
  async drawCard(baziName, question = '') {
    return this.callWorkflow('DRAW_CARD', {
      bazi_name: baziName,
      question: question
    });
  }
}

export default new CozeService();
```

## 详细文档

查看完整文档：`docs/cozeFunctionsAPI.md`

