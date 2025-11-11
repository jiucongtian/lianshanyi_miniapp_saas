# Coze 工作流通用云函数 API 文档

## 接口名称
Coze 工作流通用调用接口 v1.3

## 接口说明
通用的 Coze 工作流调用接口，支持通过工作流类型枚举调用不同的工作流，易于扩展。

## 云函数名称
`cozeFunctions_v1_3`

## 功能特点
- ✅ 支持多种工作流类型的统一调用
- ✅ 使用枚举管理工作流，易于扩展
- ✅ 灵活的参数传递机制
- ✅ 完善的错误处理和日志记录
- ✅ 返回完整的 Coze 工作流执行结果

## 工作流类型枚举

当前支持的工作流类型：

| 枚举名 | WorkflowId | 说明 |
|-------|-----------|------|
| DRAW_CARD | 7565131575660003366 | 抽卡牌工作流（默认） |
| GEN_BAZI | 7544388114807095337 | 生成八字工作流 |

后续可在云函数代码中添加更多工作流类型。

## 请求参数

### 标准调用格式

```javascript
{
  "workflowType": "DRAW_CARD",     // 可选，工作流类型枚举，不传则使用默认值 DRAW_CARD
  "parameters": {                   // 必填，传递给 Coze 工作流的参数对象
    // 根据不同的工作流类型，传入对应的参数
  }
}
```

### 抽卡牌工作流示例 (DRAW_CARD)

```javascript
{
  "workflowType": "DRAW_CARD",
  "parameters": {
    "bazi_name": "甲戌",
    "question": "我跟她这趟去香港的旅游，能达到我的目的么？感情能不能迅速升温"
  }
}
```

### 生成八字工作流示例 (GEN_BAZI)

```javascript
{
  "workflowType": "GEN_BAZI",
  "parameters": {
    "year": 2024,
    "month": 1,
    "day": 15,
    "hour": 10,
    "min": 30
  }
}
```

## 参数说明

| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| workflowType | string | 否 | 工作流类型枚举，支持的值见上方表格，不传则使用默认值 DRAW_CARD |
| parameters | object | 是 | 传递给 Coze 工作流的参数对象，具体字段取决于工作流类型 |

### DRAW_CARD 工作流参数

| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| bazi_name | string | 是 | 八字组合名，例如："甲戌"、"乙亥" 等 |
| question | string | 否 | 咨询的问题，可以为空字符串 |

### GEN_BAZI 工作流参数

| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| year | number | 是 | 年份 |
| month | number | 是 | 月份 (1-12) |
| day | number | 是 | 日期 (1-31) |
| hour | number | 是 | 小时 (0-23) |
| min | number | 是 | 分钟 (0-59) |

## 返回数据

### 成功响应

```json
{
  "success": true,
  "data": {
    // Coze API 返回的原始数据
    "code": 0,
    "msg": "Success",
    "data": {
      // 工作流的具体返回内容
    }
  },
  "workflowType": "DRAW_CARD",
  "workflowId": "7565131575660003366",
  "parameters": {
    "bazi_name": "甲戌",
    "question": "我跟她这趟去香港的旅游，能达到我的目的么？"
  },
  "openid": "用户的openid",
  "appid": "小程序的appid",
  "unionid": "用户的unionid",
  "timestamp": 1234567890000
}
```

### 错误响应

```json
{
  "success": false,
  "error": "错误信息描述",
  "code": -1,
  "timestamp": 1234567890000
}
```

## 返回字段说明

| 字段名 | 类型 | 说明 |
|-------|------|------|
| success | boolean | 调用是否成功 |
| data | object | Coze API 返回的原始数据 |
| workflowType | string | 使用的工作流类型枚举 |
| workflowId | string | 实际使用的工作流ID |
| parameters | object | 传递给工作流的参数 |
| openid | string | 用户的微信 openid |
| appid | string | 小程序的 appid |
| unionid | string | 用户的微信 unionid |
| timestamp | number | 响应时间戳 |
| error | string | 错误信息（失败时返回） |
| code | number | 错误码（失败时返回） |

## 使用示例

### 示例 1：抽卡牌（DRAW_CARD）

```javascript
wx.cloud.callFunction({
  name: 'cozeFunctions_v1_3',
  data: {
    workflowType: 'DRAW_CARD',
    parameters: {
      bazi_name: '甲戌',
      question: '我跟她这趟去香港的旅游，能达到我的目的么？感情能不能迅速升温'
    }
  },
  success: res => {
    if (res.result.success) {
      console.log('抽卡成功:', res.result.data);
      console.log('工作流类型:', res.result.workflowType);
      console.log('传入参数:', res.result.parameters);
    } else {
      console.error('抽卡失败:', res.result.error);
    }
  },
  fail: err => {
    console.error('云函数调用失败:', err);
  }
});
```

### 示例 2：使用默认工作流（不传 workflowType）

```javascript
// 不传 workflowType 时，默认使用 DRAW_CARD
wx.cloud.callFunction({
  name: 'cozeFunctions_v1_3',
  data: {
    parameters: {
      bazi_name: '乙亥',
      question: '今天运势如何？'
    }
  },
  success: res => {
    if (res.result.success) {
      console.log('抽卡成功:', res.result.data);
    }
  }
});
```

### 示例 3：生成八字（GEN_BAZI）

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
      console.log('八字生成成功:', res.result.data);
    }
  }
});
```

### 示例 4：在页面中使用

```javascript
// pages/drawCard/index.js
Page({
  data: {
    baziName: '',
    question: '',
    result: null,
    loading: false
  },
  
  // 输入八字组合名
  onBaziNameInput(e) {
    this.setData({ baziName: e.detail.value });
  },
  
  // 输入问题
  onQuestionInput(e) {
    this.setData({ question: e.detail.value });
  },
  
  // 抽卡
  async drawCard() {
    if (!this.data.baziName) {
      wx.showToast({
        title: '请输入八字组合名',
        icon: 'none'
      });
      return;
    }
    
    this.setData({ loading: true });
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'cozeFunctions_v1_3',
        data: {
          workflowType: 'DRAW_CARD',
          parameters: {
            bazi_name: this.data.baziName,
            question: this.data.question
          }
        }
      });
      
      if (res.result.success) {
        this.setData({
          result: res.result.data,
          loading: false
        });
        
        wx.showToast({
          title: '抽卡成功',
          icon: 'success'
        });
      } else {
        throw new Error(res.result.error);
      }
    } catch (error) {
      console.error('抽卡失败:', error);
      
      wx.showToast({
        title: error.message || '抽卡失败，请重试',
        icon: 'none'
      });
      
      this.setData({ loading: false });
    }
  }
});
```

### 示例 5：封装为 Service

```javascript
// services/CozeService.js
class CozeService {
  /**
   * 调用 Coze 工作流
   * @param {string} workflowType - 工作流类型枚举
   * @param {object} parameters - 工作流参数
   * @returns {Promise<Object>} 工作流执行结果
   */
  async callWorkflow(workflowType, parameters) {
    try {
      console.log('[CozeService] 调用工作流:', { workflowType, parameters });
      
      const res = await wx.cloud.callFunction({
        name: 'cozeFunctions_v1_3',
        data: {
          workflowType,
          parameters
        }
      });
      
      if (res.result.success) {
        console.log('[CozeService] 调用成功');
        return {
          success: true,
          data: res.result.data,
          workflowType: res.result.workflowType,
          workflowId: res.result.workflowId
        };
      } else {
        throw new Error(res.result.error);
      }
    } catch (error) {
      console.error('[CozeService] 调用失败:', error);
      return {
        success: false,
        error: error.message || '工作流调用失败'
      };
    }
  }
  
  /**
   * 抽卡
   * @param {string} baziName - 八字组合名
   * @param {string} question - 咨询问题（可选）
   * @returns {Promise<Object>} 抽卡结果
   */
  async drawCard(baziName, question = '') {
    return this.callWorkflow('DRAW_CARD', {
      bazi_name: baziName,
      question: question
    });
  }
  
  /**
   * 生成八字
   * @param {number} year - 年
   * @param {number} month - 月
   * @param {number} day - 日
   * @param {number} hour - 时
   * @param {number} min - 分
   * @returns {Promise<Object>} 八字数据
   */
  async genBazi(year, month, day, hour, min) {
    return this.callWorkflow('GEN_BAZI', {
      year,
      month,
      day,
      hour,
      min
    });
  }
}

// 导出单例
export default new CozeService();
```

```javascript
// 在页面中使用
import CozeService from '../../services/CozeService';

Page({
  async onLoad() {
    // 抽卡
    const drawResult = await CozeService.drawCard('甲戌', '今天运势如何？');
    if (drawResult.success) {
      console.log('抽卡结果:', drawResult.data);
    } else {
      console.error('抽卡失败:', drawResult.error);
    }
    
    // 生成八字
    const baziResult = await CozeService.genBazi(2024, 1, 15, 10, 30);
    if (baziResult.success) {
      console.log('八字数据:', baziResult.data);
    }
  }
});
```

## 配置说明

### 云函数配置

在 `cloudbase/cloudbaserc.json` 中的配置：

```json
{
  "name": "cozeFunctions_v1_3",
  "timeout": 30,
  "runtime": "Nodejs16.13",
  "memorySize": 512
}
```

### Coze API 配置

所有 Coze API 相关配置都定义在云函数代码的常量中，无需使用环境变量。

在 `cloudfunctions/cozeFunctions_v1_3/index.js` 中：

```javascript
// Coze API 配置常量
const COZE_CONFIG = {
  token: 'sat_JBr8tgHf8a8IkpwoFMpNWiioLFdqdAWj9O8HVRZ7DFmYqQf2wKzf92vRqKjQQMdv',
  baseURL: 'https://api.coze.cn'
}

// 工作流类型枚举映射
const WORKFLOW_TYPES = {
  DRAW_CARD: '7565131575660003366',        // 抽卡牌工作流
  GEN_BAZI: '7544388114807095337',         // 生成八字工作流
  // 后续可以在这里添加更多工作流
  // WORKFLOW_NAME: 'workflow_id',
}

// 默认工作流类型
const DEFAULT_WORKFLOW_TYPE = 'DRAW_CARD'
```

### 如何添加新的工作流

在 `WORKFLOW_TYPES` 中添加新的枚举项即可：

```javascript
const WORKFLOW_TYPES = {
  DRAW_CARD: '7565131575660003366',
  GEN_BAZI: '7544388114807095337',
  NEW_WORKFLOW: 'new_workflow_id',  // 添加新的工作流
}
```

然后即可通过枚举名调用：

```javascript
wx.cloud.callFunction({
  name: 'cozeFunctions_v1_3',
  data: {
    workflowType: 'NEW_WORKFLOW',
    parameters: { /* 新工作流的参数 */ }
  }
});
```

## 错误码说明

| 错误码 | 说明 |
|-------|------|
| 0 | 成功 |
| -1 | 通用错误 |
| 401 | API认证失败，请检查 COZE_TOKEN |
| 429 | 请求过于频繁，请稍后再试 |
| 4028 | Coze 免费配额已用完 |

## 注意事项

1. **参数结构**：必须传入 `parameters` 对象，`workflowType` 可选（默认为 DRAW_CARD）
2. **工作流枚举**：使用枚举名而非直接传 workflowId，便于管理和扩展
3. **参数验证**：不同的工作流类型需要不同的 parameters 结构，请参考对应工作流的参数说明
4. **超时设置**：云函数超时时间为 30 秒，Coze API 请求超时为 25 秒
5. **内存配置**：推荐使用 512MB 内存
6. **配置修改**：所有配置都在云函数代码中定义，修改后需要重新部署
7. **扩展性**：添加新工作流只需在 WORKFLOW_TYPES 中添加枚举映射
8. **日志记录**：所有请求和响应都会详细记录到云函数日志中，便于调试
9. **错误处理**：传入不支持的 workflowType 会返回友好的错误提示

## 错误处理最佳实践

```javascript
async function safeCallWorkflow(workflowType, parameters) {
  try {
    // 参数验证
    if (!parameters || typeof parameters !== 'object') {
      throw new Error('parameters 参数格式不正确');
    }
    
    wx.showLoading({ title: '处理中...' });
    
    const res = await wx.cloud.callFunction({
      name: 'cozeFunctions_v1_3',
      data: {
        workflowType,
        parameters
      }
    });
    
    wx.hideLoading();
    
    if (res.result.success) {
      return {
        success: true,
        data: res.result.data,
        workflowType: res.result.workflowType
      };
    } else {
      // 业务错误
      let errorMessage = res.result.error;
      
      // 根据错误码提供更友好的提示
      if (res.result.code === 4028) {
        errorMessage = 'Coze 配额已用完，请联系管理员';
      } else if (res.result.code === 401) {
        errorMessage = '认证失败，请联系管理员';
      } else if (res.result.code === 429) {
        errorMessage = '请求过于频繁，请稍后再试';
      }
      
      wx.showToast({
        title: errorMessage,
        icon: 'none',
        duration: 3000
      });
      
      return {
        success: false,
        error: errorMessage
      };
    }
  } catch (error) {
    // 系统错误
    wx.hideLoading();
    
    console.error('抽卡异常:', error);
    
    wx.showToast({
      title: error.message || '网络错误，请重试',
      icon: 'none'
    });
    
    return {
      success: false,
      error: error.message || '网络错误'
    };
  }
}
```

## 调试技巧

### 1. 查看完整日志

```javascript
wx.cloud.callFunction({
  name: 'cozeFunctions_v1_3',
  data: {
    bazi_name: '甲戌',
    question: '测试问题'
  },
  success: res => {
    // 打印完整返回结果
    console.log('=== 完整返回结果 ===');
    console.log(JSON.stringify(res.result, null, 2));
  }
});
```

### 2. 云函数日志查看

在云开发控制台查看详细日志：
- 打开：https://tcb.cloud.tencent.com/dev
- 找到 `cozeFunctions_v1_3` 云函数
- 查看「日志」选项卡
- 可以看到详细的请求和响应信息

## 常见问题

### Q1: 如何添加新的工作流？
A: 在云函数代码的 `WORKFLOW_TYPES` 对象中添加新的枚举映射即可，无需修改其他逻辑。

### Q2: workflowType 不传会怎样？
A: 不传 workflowType 时会使用默认值 `DRAW_CARD`。

### Q3: 如果传入不支持的 workflowType 会怎样？
A: 会返回错误，提示不支持的工作流类型，并列出当前支持的所有类型。

### Q4: parameters 的结构是什么？
A: parameters 是一个对象，具体字段取决于你调用的工作流类型。参考文档中对应工作流的参数说明。

### Q5: 如何知道我应该用哪个 workflowType？
A: 查看文档中的"工作流类型枚举"表格，选择符合你需求的工作流类型。

### Q6: 调用需要多长时间？
A: 通常在几秒内完成，最多不超过 25 秒（API 超时时间）。

## 相关链接

- Coze API 文档：https://www.coze.cn/docs/developer_guides/coze_api_overview
- 云函数控制台：https://tcb.cloud.tencent.com/dev

## 更新记录

### v1.3
- 初始版本，实现通用 Coze 工作流调用接口
- 使用枚举管理工作流类型，易于扩展
- 支持 DRAW_CARD（抽卡）和 GEN_BAZI（生成八字）两种工作流
- 采用 `workflowType` + `parameters` 的参数结构，提高灵活性
- 完善的错误处理和日志记录
- 支持自定义工作流，只需添加枚举映射
