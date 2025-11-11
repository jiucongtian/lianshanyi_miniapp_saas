# 抽卡牌云函数 API 文档

## 接口名称
抽卡牌接口 v1.3

## 接口说明
基于八字组合名和问题，调用 Coze 工作流进行塔罗牌抽取和解读。

## 云函数名称
`cozeFunctions_v1_3`

## 功能特点
- ✅ 支持根据八字组合名进行个性化抽卡
- ✅ 支持传入具体问题（可选）
- ✅ 完善的错误处理和日志记录
- ✅ 返回完整的 Coze 工作流执行结果

## 请求参数

### 基本调用

```javascript
{
  "bazi_name": "甲戌",              // 必填，八字组合名
  "question": "我跟她这趟去香港的旅游，能达到我的目的么？感情能不能迅速升温",  // 可选，咨询问题
  "workflowId": "7565131575660003366"  // 可选，工作流ID，不传则使用默认值
}
```

## 参数说明

| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| bazi_name | string | 是 | 八字组合名，例如："甲戌"、"乙亥" 等 |
| question | string | 否 | 咨询的问题，可以为空或不传 |
| workflowId | string | 否 | Coze 工作流ID，如果不传则使用配置的默认值 |

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
      // 包括抽取的卡牌、解读等信息
    }
  },
  "workflowId": "7565131575660003366",
  "bazi_name": "甲戌",
  "question": "我跟她这趟去香港的旅游，能达到我的目的么？",
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
| data | object | Coze API 返回的原始数据，包含抽卡结果和解读 |
| workflowId | string | 实际使用的工作流ID |
| bazi_name | string | 传入的八字组合名 |
| question | string/null | 传入的问题，如果没传则为 null |
| openid | string | 用户的微信 openid |
| appid | string | 小程序的 appid |
| unionid | string | 用户的微信 unionid |
| timestamp | number | 响应时间戳 |
| error | string | 错误信息（失败时返回） |
| code | number | 错误码（失败时返回） |

## 使用示例

### 示例 1：带问题的抽卡

```javascript
wx.cloud.callFunction({
  name: 'cozeFunctions_v1_3',
  data: {
    bazi_name: '甲戌',
    question: '我跟她这趟去香港的旅游，能达到我的目的么？感情能不能迅速升温'
  },
  success: res => {
    if (res.result.success) {
      console.log('抽卡成功:', res.result.data);
      console.log('八字组合名:', res.result.bazi_name);
      console.log('咨询问题:', res.result.question);
    } else {
      console.error('抽卡失败:', res.result.error);
    }
  },
  fail: err => {
    console.error('云函数调用失败:', err);
  }
});
```

### 示例 2：不带问题的抽卡

```javascript
wx.cloud.callFunction({
  name: 'cozeFunctions_v1_3',
  data: {
    bazi_name: '乙亥'
  },
  success: res => {
    if (res.result.success) {
      console.log('抽卡成功:', res.result.data);
    } else {
      console.error('抽卡失败:', res.result.error);
    }
  }
});
```

### 示例 3：在页面中使用

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
          bazi_name: this.data.baziName,
          question: this.data.question
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

### 示例 4：封装为 Service

```javascript
// services/TarotService.js
class TarotService {
  /**
   * 抽卡
   * @param {string} baziName - 八字组合名
   * @param {string} question - 咨询问题（可选）
   * @returns {Promise<Object>} 抽卡结果
   */
  async drawCard(baziName, question = '') {
    try {
      console.log('[TarotService] 开始抽卡:', { baziName, question });
      
      const res = await wx.cloud.callFunction({
        name: 'cozeFunctions_v1_3',
        data: {
          bazi_name: baziName,
          question: question
        }
      });
      
      if (res.result.success) {
        console.log('[TarotService] 抽卡成功');
        return {
          success: true,
          data: res.result.data,
          baziName: res.result.bazi_name,
          question: res.result.question
        };
      } else {
        throw new Error(res.result.error);
      }
    } catch (error) {
      console.error('[TarotService] 抽卡失败:', error);
      return {
        success: false,
        error: error.message || '抽卡失败'
      };
    }
  }
}

// 导出单例
export default new TarotService();
```

```javascript
// 在页面中使用
import TarotService from '../../services/TarotService';

Page({
  async onLoad() {
    const result = await TarotService.drawCard('甲戌', '今天运势如何？');
    
    if (result.success) {
      console.log('抽卡结果:', result.data);
    } else {
      console.error('抽卡失败:', result.error);
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
  baseURL: 'https://api.coze.cn',
  defaultWorkflowId: '7565131575660003366'  // 抽卡牌工作流
}
```

如需修改配置，直接编辑云函数代码中的 `COZE_CONFIG` 常量即可。

## 错误码说明

| 错误码 | 说明 |
|-------|------|
| 0 | 成功 |
| -1 | 通用错误 |
| 401 | API认证失败，请检查 COZE_TOKEN |
| 429 | 请求过于频繁，请稍后再试 |
| 4028 | Coze 免费配额已用完 |

## 注意事项

1. **必需参数**：`bazi_name` 是必需参数，不能为空
2. **问题参数**：`question` 是可选参数，可以不传或传空字符串
3. **超时设置**：云函数超时时间为 30 秒，Coze API 请求超时为 25 秒
4. **内存配置**：推荐使用 512MB 内存
5. **配置修改**：所有配置（token、baseURL、defaultWorkflowId）都在云函数代码中定义，修改后需要重新部署
6. **日志记录**：所有请求和响应都会详细记录到云函数日志中，便于调试
7. **工作流返回**：返回的 data 字段内容取决于 Coze 工作流的具体实现

## 错误处理最佳实践

```javascript
async function safeDrawCard(baziName, question = '') {
  try {
    // 参数验证
    if (!baziName || typeof baziName !== 'string') {
      throw new Error('八字组合名格式不正确');
    }
    
    wx.showLoading({ title: '正在抽卡...' });
    
    const res = await wx.cloud.callFunction({
      name: 'cozeFunctions_v1_3',
      data: {
        bazi_name: baziName,
        question: question
      }
    });
    
    wx.hideLoading();
    
    if (res.result.success) {
      return {
        success: true,
        data: res.result.data
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

### Q1: bazi_name 参数的格式是什么？
A: bazi_name 应该是八字组合名，例如 "甲戌"、"乙亥" 等。具体格式取决于你的业务需求。

### Q2: question 参数可以传什么？
A: question 可以传任何咨询问题的字符串，或者不传（空字符串）。例如："今天运势如何？"、"这次旅行会顺利吗？" 等。

### Q3: 如何获取抽卡结果？
A: 抽卡结果在返回的 `data` 字段中，具体结构取决于 Coze 工作流的实现。

### Q4: 抽卡需要多长时间？
A: 通常在几秒内完成，最多不超过 25 秒（API 超时时间）。

## 相关链接

- Coze API 文档：https://www.coze.cn/docs/developer_guides/coze_api_overview
- 云函数控制台：https://tcb.cloud.tencent.com/dev

## 更新记录

### v1.3
- 初始版本，实现抽卡牌功能
- 支持基于八字组合名和问题进行塔罗牌抽取
- 完善的错误处理和日志记录
