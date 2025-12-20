# 阶段七：统一配额架构

## 📋 背景

### 问题
之前的实现混乱地使用了两个配额来源：
1. **UserBean** - 从用户信息中获取免费抽卡配额
2. **FunctionQuotaBean (智慧洞见)** - 从功能配额系统获取付费配额

这导致：
- 需要两次查询才能获取完整配额
- 代码逻辑复杂，需要手动合并两个配额
- 容易出现数据不一致

### 解决方案
**统一使用智慧洞见配额**，因为 `functionQuotaManagement` 的 `checkQuota` 返回已经包含了完整信息：
```javascript
{
  functionCode: 'wisdom_insight',
  canUse: true,
  freeRemaining: 1,        // ✅ 免费剩余配额
  paidRemaining: 19,       // ✅ 付费剩余配额
  totalRemaining: 20,      // ✅ 总剩余配额（自动计算）
  freeDailyQuota: 1,       // ✅ 每日免费配额
  freeUsedToday: 0         // ✅ 今日已使用免费配额
}
```

## 🎯 架构改进

### 旧架构（混乱）
```
抽卡页面
  ├─ 加载 UserBean（免费配额）
  │   └─ globalUserManager.getUserInfo()
  │        └─ drawCardRemainingQuota
  │
  ├─ 加载智慧洞见配额（付费配额）
  │   └─ functionController.refreshQuota('wisdom_insight')
  │        └─ paidRemaining
  │
  └─ 手动合并两个配额
       └─ totalRemaining = freeRemaining + paidRemaining
```

### 新架构（统一）
```
抽卡页面
  └─ 加载智慧洞见配额（包含完整信息）✅
       └─ functionController.refreshQuota('wisdom_insight')
            ├─ freeRemaining      （免费配额）
            ├─ paidRemaining      （付费配额）
            └─ totalRemaining     （总配额，已自动计算）
```

## 📝 代码修改

### 1. 数据模型简化

#### 修改前
```javascript
data: {
  userQuotaInfo: null,        // UserBean（免费配额）
  wisdomInsightQuota: null,   // FunctionQuotaBean（付费配额）
  drawButtonText: '抽卡'
}
```

#### 修改后
```javascript
data: {
  // 统一使用智慧洞见配额（包含免费 + 付费）
  wisdomInsightQuota: null,   // FunctionQuotaBean
  drawButtonText: '抽卡'
}
```

### 2. 初始化逻辑简化

#### 修改前
```javascript
async onLoad(options) {
  // ...
  
  // 先加载智慧洞见配额（付费）
  await this._loadQuotaInfo();
  
  // 再加载用户配额（免费）
  await this._loadUserQuota();
}
```

#### 修改后
```javascript
async onLoad(options) {
  // ...
  
  // 加载智慧洞见配额（包含免费 + 付费）✅
  await this._loadQuotaInfo();
}
```

### 3. 配额加载简化

#### 修改前
```javascript
async _loadQuotaInfo() {
  const quotaInfo = await this.functionController.refreshQuota('wisdom_insight');
  this.setData({ wisdomInsightQuota: quotaInfo });
}

async _loadUserQuota() {
  const app = getApp();
  const response = await app.globalData.globalUserManager.getUserInfo();
  const userInfo = response.data; // UserBean
  
  // 获取免费配额
  const freeRemaining = userInfo.getDrawCardRemainingQuota();
  
  // 获取付费配额
  const wisdomQuota = this.data.wisdomInsightQuota;
  const paidRemaining = wisdomQuota?.paidRemaining || 0;
  
  // 手动合并
  const totalRemaining = freeRemaining + paidRemaining;
  
  // 生成按钮文本
  const buttonText = this._getDrawButtonText(userInfo);
  this.setData({ drawButtonText: buttonText });
}
```

#### 修改后
```javascript
async _loadQuotaInfo() {
  const quotaInfo = await this.functionController.refreshQuota('wisdom_insight');
  this.setData({ wisdomInsightQuota: quotaInfo });
  
  // 直接生成按钮文本（配额已完整）✅
  const buttonText = this._getDrawButtonText(quotaInfo);
  this.setData({ drawButtonText: buttonText });
}
```

### 4. 按钮文本生成简化

#### 修改前
```javascript
_getDrawButtonText(userInfo) {
  // 获取免费配额（从 UserBean）
  const freeRemaining = userInfo.getDrawCardRemainingQuota();
  
  // 获取付费配额（从 this.data）
  const wisdomQuota = this.data.wisdomInsightQuota;
  const paidRemaining = wisdomQuota?.paidRemaining || 0;
  
  // 手动合并
  const totalRemaining = freeRemaining + paidRemaining;
  
  if (totalRemaining > 0) {
    return `抽卡（剩余${totalRemaining}次）`;
  } else {
    return '抽卡（需付费）';
  }
}
```

#### 修改后
```javascript
_getDrawButtonText(quotaInfo) {
  // 直接使用智慧洞见配额的总配额（已自动合并）✅
  const totalRemaining = quotaInfo.totalRemaining;
  
  if (totalRemaining > 0) {
    return `抽卡（剩余${totalRemaining}次）`;
  } else {
    return '抽卡（需付费）';
  }
}
```

### 5. 配额检查简化

#### 修改前
```javascript
async _checkDrawQuota() {
  // 获取用户信息（免费配额）
  const app = getApp();
  const response = await app.globalData.globalUserManager.getUserInfo();
  const userInfo = response.data;
  
  // 获取免费配额
  const freeRemaining = userInfo.getDrawCardRemainingQuota();
  
  // 获取付费配额
  const wisdomQuota = this.data.wisdomInsightQuota;
  const paidRemaining = wisdomQuota?.paidRemaining || 0;
  
  // 手动合并
  const totalRemaining = freeRemaining + paidRemaining;
  const canDraw = totalRemaining > 0;
  
  return { canDraw, totalRemaining, freeRemaining, paidRemaining };
}
```

#### 修改后
```javascript
async _checkDrawQuota() {
  // 直接使用智慧洞见配额（已包含完整信息）✅
  const quotaInfo = this.data.wisdomInsightQuota;
  
  const canDraw = quotaInfo.canUse && quotaInfo.totalRemaining > 0;
  
  return {
    canDraw: canDraw,
    totalRemaining: quotaInfo.totalRemaining,  // 已自动合并
    freeRemaining: quotaInfo.freeRemaining,
    paidRemaining: quotaInfo.paidRemaining
  };
}
```

## 📊 数据流简化

### 旧数据流
```
1. 页面加载
   ├─ 调用 functionQuotaManagement → wisdomInsightQuota { paidRemaining: 19 }
   └─ 调用 userManagement → userInfo { freeRemaining: 1 }
   
2. 手动合并
   └─ totalRemaining = 1 + 19 = 20

3. 点击抽卡
   ├─ 检查配额（手动合并）
   ├─ 扣除配额（functionQuotaManagement）
   └─ 刷新配额（两次调用）
```

### 新数据流
```
1. 页面加载
   └─ 调用 functionQuotaManagement
       └─ wisdomInsightQuota {
            freeRemaining: 1,
            paidRemaining: 19,
            totalRemaining: 20  ✅ 自动合并
          }

2. 点击抽卡
   ├─ 检查配额（直接使用 totalRemaining）✅
   ├─ 扣除配额（functionQuotaManagement）
   └─ 刷新配额（一次调用）✅
```

## ✅ 优势

### 1. 代码更简洁
- **删除了 113 行代码**（`_loadUserQuota` 方法）
- 只需一次配额查询
- 不需要手动合并配额

### 2. 逻辑更清晰
- 单一数据源（智慧洞见配额）
- 配额自动合并（云函数层面）
- 减少客户端逻辑

### 3. 性能更好
- 减少一次网络请求（不需要 getUserInfo）
- 减少一次数据处理（不需要手动合并）

### 4. 更易维护
- 配额逻辑集中在 `functionQuotaManagement`
- 客户端只需关心 `wisdomInsightQuota`
- 减少数据不一致的可能

## 🔄 完整调用流程

```
页面加载 (onLoad)
  ↓
加载智慧洞见配额 (_loadQuotaInfo)
  ↓
functionController.refreshQuota('wisdom_insight')
  ↓
functionQuotaManagement_v1_4 (checkQuota)
  ├─ 查询用户类型配置
  ├─ 计算免费配额
  │   ├─ freeDailyQuota: 1
  │   └─ freeRemaining: 1
  ├─ 查询付费配额
  │   └─ paidRemaining: 19
  └─ 返回完整配额 ✅
       {
         freeRemaining: 1,
         paidRemaining: 19,
         totalRemaining: 20,
         freeDailyQuota: 1,
         freeUsedToday: 0
       }
  ↓
生成按钮文本
  ↓
显示：抽卡（剩余20次）✅
```

```
点击抽卡 (onAnalyzeAnswer)
  ↓
检查配额 (_checkDrawQuota)
  ├─ 从 this.data.wisdomInsightQuota 获取
  └─ canDraw = totalRemaining > 0 ✅
  ↓
执行抽卡动画
  ↓
自动 AI 解读
  ↓
functionController.useFunction('wisdom_insight')
  ├─ checkQuota（检查配额）
  ├─ deductQuota（扣除配额，优先免费）
  ├─ callCozeFunctions（调用 AI）
  └─ 成功/失败回滚
  ↓
显示结果
  ↓
刷新配额 (_loadQuotaInfo)
  ↓
更新按钮文本：抽卡（剩余19次）✅
```

## 🚀 部署说明

无需部署云函数，只修改了客户端代码。

## 📈 统计

- **删除代码**: 113 行
- **简化方法**: 4 个
- **减少查询**: 1 次（不需要 getUserInfo）
- **减少数据合并**: 3 处

## 🎯 总结

通过统一使用智慧洞见配额系统，我们：
1. ✅ **消除了架构混乱** - 单一数据源
2. ✅ **简化了代码逻辑** - 删除 113 行代码
3. ✅ **提升了性能** - 减少一次网络请求
4. ✅ **提高了可维护性** - 逻辑更清晰

**核心原则**：一个功能（抽卡 = 智慧洞见）→ 一个配额系统 → 一次查询 → 自动合并

## 📁 相关文件

### 修改的文件
- `miniprogram/pages/answer/index.js`
  - 删除 `_loadUserQuota()` 方法
  - 删除 `userQuotaInfo` 数据字段
  - 简化 `_loadQuotaInfo()`
  - 简化 `_getDrawButtonText()`
  - 简化 `_checkDrawQuota()`
  - 简化 `onLoad()`

### 不需要修改的文件
- `cloudfunctions/functionQuotaManagement_v1_4/index.js` - 已包含完整配额信息
- `miniprogram/controllers/FunctionController.js` - 配额控制器无需改动
- `miniprogram/beans/FunctionQuotaBean.js` - Bean 类无需改动

