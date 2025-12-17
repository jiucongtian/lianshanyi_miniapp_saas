# updateDailyInsight 云函数

## 功能概述

定时更新日报数据的云函数。遍历所有60个甲子，为每个干支生成卡牌基础数据，并调用 Coze GET_DAILY_INSIGHT 工作流生成日报解读（blessing、tip、password），最后批量保存到 `test_daily_insights` 测试数据库表（避免污染真实数据）。

## 主要功能

1. **遍历60甲子**：直接使用60甲子映射表，无需计算
2. **生成卡牌基础信息**：根据干支查表计算 `seasonMark`、`talentMark`、`abilityMark`、`pathMark` 等字段
3. **批量调用 Coze 工作流**：为每个干支异步调用 GET_DAILY_INSIGHT 工作流
4. **批量保存数据**：将所有数据保存到 `test_daily_insights` 测试表（自动判断新增或更新）

## 数据流程

```
1. 遍历所有60个甲子（从映射表获取）
   ↓
2. 对每个干支：
   ├─ 生成卡牌基础信息（查表）
   │  ├─ cardName: 干支名称
   │  ├─ cardNumber: 卡牌编号（1-60）
   │  ├─ seasonMark: 季节标记
   │  ├─ talentMark: 天赋标记
   │  ├─ abilityMark: 才能标记（爻位，1-6）
   │  └─ pathMark: 路径标记
   │
   ├─ 调用 Coze GET_DAILY_INSIGHT 工作流
   │  输入: { cai_neng: abilityMark, gan_zhi: cardName }
   │  输出: { blessing, password, tip }
   │
   ├─ 合并所有数据
   │
   └─ 保存到 test_daily_insights 测试表
      - 如果该 cardNumber 已存在记录 → 更新
      - 如果该 cardNumber 不存在 → 新增
   ↓
3. 延迟（避免过快调用 Coze API）
   ↓
4. 继续下一个干支
```

## 代码模块

### 基础数据模块
- 从 `docs/tools/jiazi-card-generator/base-data.js` 复制
- 包含：天干、地支、60甲子映射等基础数据

### 计算数据模块
- 从 `docs/tools/jiazi-card-generator/calculated-data.js` 复制
- 包含：季节标记计算逻辑

### 业务数据模块
- 从 `docs/tools/jiazi-card-generator/business-data.js` 复制
- 包含：天赋标记、能力标记、路径标记查表逻辑

## 调用方式

### 方式1：批量更新所有60甲子（默认并发5个）

```javascript
wx.cloud.callFunction({
  name: 'updateDailyInsight',
  data: {}
});
```

### 方式2：指定并发数量

```javascript
wx.cloud.callFunction({
  name: 'updateDailyInsight',
  data: {
    concurrency: 10  // 每批并发10个（默认5个）
  }
});
```

### 方式3：指定并发数量和批次延迟

```javascript
wx.cloud.callFunction({
  name: 'updateDailyInsight',
  data: {
    concurrency: 5,      // 每批并发5个
    batchDelayMs: 2000   // 批次间延迟2秒（默认1秒）
  }
});
```

**说明：**
- **并发模式**：每批同时处理多个干支，大大缩短总时间
- **默认并发数**：5个（可根据 Coze API 频率限制调整）
- **超时设置**：每个请求3分钟超时（Coze接口可能需要1-2分钟）
- **预计时间**：
  - 并发5个：60 ÷ 5 = 12批，每批约1-2分钟 = 约12-24分钟
  - 并发10个：60 ÷ 10 = 6批，每批约1-2分钟 = 约6-12分钟
- **批次延迟**：批次之间延迟1秒，避免触发频率限制

## 返回数据格式

### 成功响应

```json
{
  "success": true,
  "message": "批量更新完成，成功60条，失败0条",
  "data": {
    "total": 60,
    "successCount": 60,
    "errorCount": 0,
    "totalTime": "120.50",
    "results": [
      {
        "success": true,
        "ganZhiName": "甲子",
        "cardNumber": 1,
        "action": "created"
      },
      // ... 其他59个
    ],
    "errors": []
  },
  "timestamp": 1694678400000
}
```

### 失败响应

```json
{
  "success": false,
  "error": "错误信息",
  "timestamp": 1694678400000
}
```

## 配置定时触发器

在云开发控制台配置定时触发器：

### 触发周期

建议配置为每天凌晨 0:10 执行（给系统留出日期切换时间）：

```
Cron 表达式: 10 0 * * *
```

或每天凌晨 1:00 执行：

```
Cron 表达式: 0 1 * * *
```

### 配置步骤

1. 进入云开发控制台
2. 选择"云函数" → "updateDailyInsight"
3. 点击"触发器"选项卡
4. 点击"新建触发器"
5. 选择"定时触发器"
6. 输入 Cron 表达式：`10 0 * * *`
7. 触发器名称：`daily-update`
8. 保存配置

## 📝 字段说明

### `central` 字段（卡牌中央描述）

**当前处理**：留空字符串

**原因**：此字段暂时不需要，留待后续需要时再补充

**如需补充**：可以通过以下方式：
- 方案A：从现有的60甲子卡牌数据表中查询
- 方案B：通过额外的 Coze 工作流生成
- 方案C：手动维护一个映射表，在代码中添加

### `description` 字段

**状态**：已移除，不需要此字段

## 日志输出

云函数执行时会输出详细日志，便于调试：

```
[updateDailyInsight] 开始更新日报数据
[步骤1] 获取干支信息...
[getGanZhiForDate] 八字计算结果: {...}
[步骤2] 生成卡牌基础信息...
[generateCardBaseInfo] 生成的基础信息: {...}
[步骤3] 调用Coze工作流获取日报解读...
[callCozeWorkflow] Coze API 响应: {...}
[步骤4] 合并数据...
[步骤5] 保存到数据库...
[saveDailyInsight] 更新现有记录 / 插入新记录
[updateDailyInsight] 更新日报数据成功
```

## 错误处理

云函数包含完整的错误处理：

1. **八字计算失败**：捕获并返回详细错误信息
2. **Coze API 调用失败**：处理超时、网络错误、API错误码
3. **数据库操作失败**：捕获并记录数据库错误
4. **数据格式错误**：验证关键字段并给出明确提示

## 性能说明

1. **执行模式**：并发处理（默认每批5个）
2. **执行时间**：约12-24分钟（60个干支 ÷ 5并发 × 1-2分钟/批）
3. **API调用**：60次 Coze API 调用（每个干支一次，并发执行）
4. **数据库操作**：60次写操作（新增或更新）
5. **超时设置**：每个请求3分钟超时（Coze接口可能需要1-2分钟）
6. **并发控制**：
   - 批次内并发执行（默认5个）
   - 批次间延迟1秒，避免触发频率限制
   - 可根据 Coze API 频率限制调整并发数

## 相关文件

- 云函数：`/cloudfunctions/updateDailyInsight/index.js`
- 数据表文档：`/docs/database/daily_insightsdb.md`
- 工具代码：`/docs/tools/jiazi-card-generator/`
- Coze API 文档：`/docs/api/cozeFunctions_v1_4-api.md`

## 部署步骤

1. 确保已安装依赖：`npm install`
2. 上传云函数到云端
3. 配置定时触发器
4. 手动测试一次，验证功能正常
5. 查看云函数日志，确认执行成功

---

**最后更新时间：** 2025-01-17

