# 收费功能调用架构说明

## 📋 设计原则

**核心思想：在原有调用基础上增加配额管理逻辑，而不是重新设计调用方式。**

### 为什么不需要配置文件？

客户端本来就知道：
- 智慧洞见 → 调用 `cozeFunctions`，传 `workflowType: 'DRAW_CARD'`
- AI报告 → 调用 `cozeFunctions`，传 `workflowType: 'AI_REPORT'`

**增加收费功能只是在调用前后加了配额管理，不需要从数据库读取"该调用哪个云函数"。**

## 🏗️ 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                         客户端                                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  FunctionController                                     │ │
│  │                                                         │ │
│  │  FUNCTION_WORKFLOW_MAP = {                             │ │
│  │    'wisdom_insight': 'DRAW_CARD',                      │ │
│  │    'ai_report': 'AI_REPORT'                            │ │
│  │  }                                                      │ │
│  │                                                         │ │
│  │  useFunction(functionCode, params) {                   │ │
│  │    1. checkQuota()          // 检查配额                 │ │
│  │    2. deductQuota()         // 扣除配额                 │ │
│  │    3. callCozeFunctions()   // 调用云函数（和原来一样） │ │
│  │    4. if (失败) rollbackQuota() // 回滚配额            │ │
│  │  }                                                      │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓
                            ↓ (直接调用，绕过网关)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      云函数层                                 │
│                                                              │
│  ┌──────────────────┐    ┌──────────────────┐              │
│  │ functionQuota    │    │  cozeFunctions   │              │
│  │ Management_v1_4  │    │  _v1_3           │              │
│  │                  │    │                  │              │
│  │ - checkQuota     │    │ - DRAW_CARD      │              │
│  │ - deductQuota    │    │ - AI_REPORT      │              │
│  │ - rollbackQuota  │    │ - ...            │              │
│  └──────────────────┘    └──────────────────┘              │
│           ↓                       ↓                         │
│           ↓                       ↓                         │
│  ┌──────────────────────────────────────────┐              │
│  │          数据库                           │              │
│  │  - function_products (商品信息)          │              │
│  │  - user_function_quotas (用户配额)       │              │
│  │  - function_usage_records (使用记录)     │              │
│  └──────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

## 📂 代码结构

### 客户端

```javascript
// miniprogram/controllers/FunctionController.js

// 功能与工作流映射（客户端本来就知道的）
const FUNCTION_WORKFLOW_MAP = {
  'wisdom_insight': 'DRAW_CARD',
  'ai_report': 'AI_REPORT'
};

class FunctionController {
  async useFunction(functionCode, functionParams, options) {
    // 1. 检查配额
    const quotaCheck = await functionService.checkQuota(functionCode);
    if (!quotaCheck.data.canUse) {
      // 弹出支付弹窗
      return null;
    }
    
    // 2. 扣除配额
    const deductResult = await functionService.deductQuota(functionCode);
    
    // 3. 调用云函数（就像以前一样）
    const workflowType = FUNCTION_WORKFLOW_MAP[functionCode];
    const response = await functionService.callCozeFunctionDirectly(
      workflowType, 
      functionParams.parameters
    );
    
    // 4. 失败回滚配额
    if (!response.success) {
      await functionService.rollbackQuota(functionCode);
    }
    
    return response.data;
  }
}
```

### 服务层

```javascript
// miniprogram/services/FunctionService.js

class FunctionService {
  // 直接调用 cozeFunctions（和原来一样）
  async callCozeFunctionDirectly(workflowType, parameters) {
    return await this.callFunction('cozeFunctions', {
      workflowType: workflowType,
      parameters: parameters
    });
  }
  
  // 配额管理方法
  async checkQuota(functionCode) { ... }
  async deductQuota(functionCode) { ... }
  async rollbackQuota(functionCode) { ... }
}
```

### 云函数

```javascript
// cloudfunctions/functionQuotaManagement_v1_4/index.js

exports.main = async (event, context) => {
  const { action } = event;
  
  switch (action) {
    case 'checkQuota':
      return await checkQuota(wxContext, data);
    case 'deductQuota':
      return await deductQuota(wxContext, data);
    case 'rollbackQuota':
      return await rollbackQuota(wxContext, data);
  }
};
```

## 🔄 调用流程

### 原来的调用方式（没有收费）

```javascript
// 直接调用
wx.cloud.callFunction({
  name: 'cozeFunctions_v1_3',
  data: {
    workflowType: 'DRAW_CARD',
    parameters: { bazi_name: '辛未' }
  }
});
```

### 现在的调用方式（增加收费）

```javascript
// 使用 FunctionController（只是加了配额管理）
await functionController.useFunction('wisdom_insight', {
  parameters: { bazi_name: '辛未' }
});

// 内部流程：
// 1. 检查配额
// 2. 扣除配额
// 3. 调用 cozeFunctions（和原来一样！）
// 4. 失败回滚
```

## 🎯 关键设计决策

### 1. 为什么不从数据库读取调用配置？

**错误设计：**
```javascript
// ❌ 过度设计
const config = await getFunctionConfig('wisdom_insight');
// config = { targetFunction: 'cozeFunctions', workflowType: 'DRAW_CARD' }

await callFunction(config.targetFunction, config.workflowType, params);
```

**问题：**
- 客户端本来就知道该调用什么
- 增加了数据库查询（性能损耗）
- 增加了代码复杂度
- 配置和代码分离，维护困难

**正确设计：**
```javascript
// ✅ 简洁明了
const FUNCTION_WORKFLOW_MAP = {
  'wisdom_insight': 'DRAW_CARD'
};

const workflowType = FUNCTION_WORKFLOW_MAP[functionCode];
await callCozeFunctionDirectly(workflowType, params);
```

**优势：**
- 客户端代码清晰
- 无需额外数据库查询
- 配置和代码在一起，易维护
- 和原来的调用方式一致

### 2. 为什么不使用 functionCallGateway？

**问题：** 云函数间调用有 15 秒超时限制

```
客户端 → functionCallGateway → cozeFunctions → Coze API
              ↑
         15秒超时！（cozeFunctions 可能需要 30-60 秒）
```

**解决：** 客户端直接调用

```
客户端 → cozeFunctions → Coze API
              ↑
         无超时限制！
```

### 3. function_products 表的作用？

**只用于存储商品信息：**
- 商品名称、描述
- 价格（price、originalPrice）
- 配额配置（freeDailyQuota、enablePaidQuota）
- 发货配置（grantData）

**不用于：**
- ❌ 告诉客户端该调用哪个云函数
- ❌ 告诉客户端该传什么参数
- ❌ 存储调用配置

## 🆚 对比：过度设计 vs 正确设计

### 过度设计（已废弃）

```javascript
// 1. 从数据库读配置
const config = await getFunctionConfig('wisdom_insight');
// 返回：{ targetFunction: 'cozeFunctions', workflowType: 'DRAW_CARD' }

// 2. 根据配置选择云函数
if (config.targetFunction === 'cozeFunctions') {
  await callCozeFunctions(config.workflowType, params);
} else if (config.targetFunction === 'otherFunction') {
  await callOtherFunction(params);
}

// 3. 数据库配置
{
  "functionCode": "wisdom_insight",
  "callConfig": {
    "targetFunction": "cozeFunctions",
    "workflowType": "DRAW_CARD"
  }
}
```

**问题：**
- 多了一次数据库查询
- 代码复杂度增加
- 配置存在数据库，修改需要操作数据库
- 客户端不知道自己要调用什么

### 正确设计（当前实现）

```javascript
// 1. 本地映射（客户端本来就知道的）
const FUNCTION_WORKFLOW_MAP = {
  'wisdom_insight': 'DRAW_CARD',
  'ai_report': 'AI_REPORT'
};

// 2. 直接调用
const workflowType = FUNCTION_WORKFLOW_MAP[functionCode];
await callCozeFunctionDirectly(workflowType, params);

// 3. 数据库只存商品信息
{
  "functionCode": "wisdom_insight",
  "functionName": "智慧洞见",
  "price": 100,
  "quotaConfig": { ... }
}
```

**优势：**
- 无额外数据库查询
- 代码简洁清晰
- 配置在代码中，修改方便
- 和原来的调用方式一致

## 📝 总结

### 设计原则

1. **保持简单**：不要为了"灵活"而过度设计
2. **尊重原有逻辑**：客户端本来就知道该调用什么，不需要从数据库读
3. **职责分离**：
   - 数据库存商品信息（价格、配额）
   - 代码存调用逻辑（调用哪个函数、传什么参数）

### 关键点

- ✅ 客户端直接调用 `cozeFunctions`，绕过网关，避免超时
- ✅ 使用本地映射 `FUNCTION_WORKFLOW_MAP`，不从数据库读配置
- ✅ 在原有调用基础上增加配额管理（检查、扣除、回滚）
- ✅ `function_products` 表只存商品信息，不存调用配置

### 扩展新功能

添加新的收费功能，只需：

```javascript
// 1. 在映射中添加
const FUNCTION_WORKFLOW_MAP = {
  'wisdom_insight': 'DRAW_CARD',
  'ai_report': 'AI_REPORT',
  'new_function': 'NEW_WORKFLOW'  // 新增
};

// 2. 在数据库中添加商品记录
db.collection('function_products').add({
  data: {
    functionCode: 'new_function',
    functionName: '新功能',
    price: 100,
    ...
  }
});

// 3. 客户端调用（和其他功能一样）
await functionController.useFunction('new_function', {
  parameters: { ... }
});
```

就是这么简单！

