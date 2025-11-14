# 抽卡配额限制系统实施执行计划

## 一、执行概览

根据 `draw-card-quota-system.md` 设计方案，本计划将分阶段实施抽卡配额限制功能。

**预计工作量**：约 4-6 小时  
**优先级**：高  
**依赖关系**：无阻塞依赖

---

## 二、实施阶段

### 阶段一：数据库准备（30分钟）

> **📋 详细操作指南**：请参考 `docs/database/phase1-setup-guide.md` 获取完整的操作步骤和截图说明。

> **🔧 自动化脚本**：可以使用云函数 `initDrawCardDatabase` 自动更新 `static_user_types` 表（需要手动创建 `draw_card_records` 集合）。

#### 1.1 确认/更新 `static_user_types` 表

**任务**：确认 `static_user_types` 表是否已有 `dailyDrawQuota` 字段

**操作步骤**：
1. 检查数据库文档 `docs/database/user_typesdb.md`（已确认包含该字段）
2. 在云开发控制台检查实际数据库表结构
3. 如果字段不存在，有两种方式添加：
   
   **方式一：使用云函数自动更新（推荐）**
   - 部署云函数 `initDrawCardDatabase`
   - 调用云函数执行初始化
   - 检查执行结果
   
   **方式二：手动更新**
   - 在控制台找到三个用户类型记录（guest, normal, premium）
   - 为每条记录添加 `dailyDrawQuota` 字段
   - 设置值：guest=0, normal=3, premium=-1

**配置数据**：
```json
// guest 用户类型
{
  "typeCode": "guest",
  "dailyDrawQuota": 0
}

// normal 用户类型
{
  "typeCode": "normal",
  "dailyDrawQuota": 3
}

// premium 用户类型
{
  "typeCode": "premium",
  "dailyDrawQuota": -1
}
```

**验证**：查询表数据，确认三个用户类型都有正确的 `dailyDrawQuota` 值

**相关文件**：
- 操作指南：`docs/database/phase1-setup-guide.md`
- 初始化云函数：`cloudfunctions/initDrawCardDatabase/`

---

#### 1.2 创建 `draw_card_records` 集合

**任务**：创建抽卡记录表并配置索引

**操作步骤**：
1. 在云开发控制台创建新集合：`draw_card_records`
2. 配置集合权限：
   - 所有用户可读：否（仅创建者可读）
   - 所有用户可写：否（仅创建者可写）
   - 仅管理端可读写：是（云函数中操作）

3. **创建复合索引**（必须）：
   - 索引名称：`userId_drawDate`
   - 索引字段：
     - `userId`: 升序
     - `drawDate`: 升序
   - 索引类型：普通索引

4. **可选索引**（性能优化）：
   - `openid` + `drawDate` 复合索引
   - `interpretTime` 普通索引

**验证**：在控制台测试查询，确认索引生效

**参考文档**：
- 操作指南：`docs/database/phase1-setup-guide.md`
- 表设计文档：`docs/database/draw_card_recordsdb.md`

---

### 阶段二：云函数开发（90分钟）

#### 2.1 创建云函数基础结构

**任务**：创建 `drawCardManagement` 云函数

**文件结构**：
```
cloudfunctions/drawCardManagement/
├── index.js
└── package.json
```

**package.json**：
```json
{
  "name": "drawCardManagement",
  "version": "1.0.0",
  "description": "抽卡配额管理和记录云函数",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```

**index.js 基础结构**：
```javascript
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { action, data } = event;
  
  try {
    switch (action) {
      case 'checkQuota':
        return await checkQuota(wxContext);
      case 'recordDraw':
        return await recordDraw(wxContext, data);
      default:
        return { success: false, error: '未知操作类型', code: -1 };
    }
  } catch (error) {
    console.error('[drawCardManagement] 云函数执行失败:', error);
    return { success: false, error: error.message || '操作失败', code: -1 };
  }
};
```

**参考**：参考 `cloudfunctions/userManagement/index.js` 的实现风格

---

#### 2.2 实现 `checkQuota` 接口

**功能**：检查用户抽卡配额

**实现要点**：
1. 获取用户信息（从 `users` 表）
2. 获取用户类型配置（从 `static_user_types` 表，包含 `dailyDrawQuota`）
3. 检查用户类型：
   - `guest`：返回错误码 1001（不可用）
   - `normal`/`premium`：继续检查配额
4. 查询今日已使用次数（从 `draw_card_records` 表）
5. 计算剩余配额
6. 返回配额信息

**关键代码逻辑**：
```javascript
async function checkQuota(wxContext) {
  const { OPENID } = wxContext;
  
  // 1. 获取用户信息
  const userResult = await db.collection('users')
    .where({ openid: OPENID, isActive: true })
    .get();
  
  if (userResult.data.length === 0) {
    return {
      success: false,
      error: '用户不存在',
      code: 1001
    };
  }
  
  const user = userResult.data[0];
  
  // 2. 获取用户类型配置
  const typeConfig = await getUserTypeConfig(user.userType);
  
  // 3. 检查用户类型配额
  if (typeConfig.dailyDrawQuota === 0) {
    return {
      success: false,
      error: '请先注册后使用抽卡功能',
      code: 1001,
      data: {
        canDraw: false,
        userTypeCode: user.userType,
        remainingQuota: 0,
        totalQuota: 0,
        usedToday: 0
      }
    };
  }
  
  // 4. 查询今日已使用次数
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const countResult = await db.collection('draw_card_records')
    .where({
      userId: user._id,
      drawDate: today,
      isActive: true
    })
    .count();
  
  const usedToday = countResult.total;
  const totalQuota = typeConfig.dailyDrawQuota;
  const remainingQuota = totalQuota === -1 ? -1 : Math.max(0, totalQuota - usedToday);
  const canDraw = totalQuota === -1 || remainingQuota > 0;
  
  // 5. 如果配额用完，返回错误
  if (!canDraw) {
    return {
      success: false,
      error: '今日抽卡次数已用完',
      code: 1003,
      data: {
        canDraw: false,
        userTypeCode: user.userType,
        remainingQuota: 0,
        totalQuota: totalQuota,
        usedToday: usedToday
      }
    };
  }
  
  // 6. 返回成功响应
  return {
    success: true,
    data: {
      canDraw: true,
      userTypeCode: user.userType,
      remainingQuota: remainingQuota,
      totalQuota: totalQuota,
      usedToday: usedToday
    }
  };
}
```

**辅助函数**：复用 `userManagement` 云函数中的 `getUserTypeConfig` 函数，或提取到公共模块

**参考文档**：`docs/api/drawCardManagement-api.md`

---

#### 2.3 实现 `recordDraw` 接口

**功能**：记录抽卡历史

**实现要点**：
1. 验证必需参数（cardNumber, cardName, aiAnswer）
2. 获取用户信息
3. 获取用户类型（用于快照）
4. 构建记录数据：
   - `userId`: 用户ID
   - `openid`: 用户openid
   - `userTypeCode`: 用户类型（快照）
   - `question`: 用户问题（可选）
   - `cardNumber`: 卡牌编号
   - `cardName`: 卡牌名称
   - `aiAnswer`: AI解读结果
   - `drawTime`: 抽卡时间（从参数传入或使用当前时间）
   - `interpretTime`: 解读时间（当前时间）
   - `drawDate`: 抽卡日期（YYYY-MM-DD格式）
   - `isActive`: true
5. 插入记录到 `draw_card_records` 表

**关键代码逻辑**：
```javascript
async function recordDraw(wxContext, data) {
  const { OPENID } = wxContext;
  
  // 1. 验证必需参数
  if (!data || !data.cardNumber || !data.cardName || !data.aiAnswer) {
    return {
      success: false,
      error: '缺少必需参数',
      code: -2
    };
  }
  
  // 2. 获取用户信息
  const userResult = await db.collection('users')
    .where({ openid: OPENID, isActive: true })
    .get();
  
  if (userResult.data.length === 0) {
    return {
      success: false,
      error: '用户不存在',
      code: 1001
    };
  }
  
  const user = userResult.data[0];
  
  // 3. 构建记录数据
  const now = new Date();
  const drawDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
  
  // drawTime 从参数传入，如果没有则使用当前时间
  const drawTime = data.drawTime ? new Date(data.drawTime) : now;
  
  const record = {
    userId: user._id,
    openid: OPENID,
    userTypeCode: user.userType, // 快照
    question: data.question || '',
    cardNumber: data.cardNumber,
    cardName: data.cardName,
    aiAnswer: data.aiAnswer,
    drawTime: drawTime,
    interpretTime: now,
    drawDate: drawDate,
    isActive: true
  };
  
  // 4. 插入记录
  try {
    await db.collection('draw_card_records').add({
      data: record
    });
    
    return {
      success: true,
      message: '记录成功'
    };
  } catch (error) {
    console.error('[recordDraw] 插入记录失败:', error);
    return {
      success: false,
      error: '记录失败: ' + error.message,
      code: -1
    };
  }
}
```

**参考文档**：`docs/api/drawCardManagement-api.md`

---

### 阶段三：客户端开发（120分钟）

#### 3.1 创建 `DrawCardService` 服务类

**文件路径**：`miniprogram/services/DrawCardService.js`

**实现要点**：
1. 继承 `BaseService`
2. 实现 `checkQuota()` 方法
3. 实现 `recordDraw()` 方法
4. 返回 `ResponseBean` 格式

**代码结构**：
```javascript
const { BaseService } = require('./BaseService');
const { ResponseBean } = require('../beans/ResponseBean');

class DrawCardService extends BaseService {
  constructor() {
    super();
  }
  
  /**
   * 检查抽卡配额
   * @returns {Promise<ResponseBean>} 配额信息响应
   */
  async checkQuota() {
    try {
      const response = await this.callFunction('drawCardManagement', {
        action: 'checkQuota'
      });
      
      this._logServiceCall('checkQuota', {}, response);
      
      // 成功时将data转换为DrawCardQuotaBean（如果创建了Bean类）
      if (response.success && response.data) {
        // response.data = new DrawCardQuotaBean(response.data);
      }
      
      return response;
    } catch (error) {
      this._error('checkQuota', '检查配额异常:', error);
      return ResponseBean.error('检查配额失败: ' + error.message, -1);
    }
  }
  
  /**
   * 记录抽卡历史
   * @param {Object} drawData - 抽卡数据
   * @param {string} drawData.question - 用户问题（可选）
   * @param {number} drawData.cardNumber - 卡牌编号
   * @param {string} drawData.cardName - 卡牌名称
   * @param {string} drawData.aiAnswer - AI解读结果
   * @param {Date} drawData.drawTime - 抽卡时间（可选）
   * @returns {Promise<ResponseBean>} 记录结果响应
   */
  async recordDraw(drawData) {
    try {
      // 验证必需参数
      const validation = this._validateRequiredParams(
        drawData,
        ['cardNumber', 'cardName', 'aiAnswer']
      );
      
      if (!validation.valid) {
        return this._createValidationError(validation.missingFields);
      }
      
      const response = await this.callFunction('drawCardManagement', {
        action: 'recordDraw',
        data: drawData
      });
      
      this._logServiceCall('recordDraw', drawData, response);
      return response;
    } catch (error) {
      this._error('recordDraw', '记录抽卡历史异常:', error);
      return ResponseBean.error('记录失败: ' + error.message, -1);
    }
  }
}

// 导出类和单例实例
module.exports = {
  DrawCardService,
  drawCardService: new DrawCardService()
};
```

**更新 `miniprogram/services/index.js`**：
```javascript
// ... 其他导入
const { drawCardService } = require('./DrawCardService');

module.exports = {
  // ... 其他导出
  drawCardService
};
```

---

#### 3.2 创建 `DrawCardQuotaBean` Bean类（可选）

**文件路径**：`miniprogram/beans/DrawCardQuotaBean.js`

**说明**：如果需要对配额数据进行格式化或添加业务方法，可以创建此Bean类。如果不需要，可以直接使用原始数据。

**代码结构**（如果需要）：
```javascript
const { BaseClass } = require('../common/BaseClass');

class DrawCardQuotaBean extends BaseClass {
  constructor(data) {
    super();
    
    this.canDraw = data.canDraw || false;
    this.userTypeCode = data.userTypeCode || 'guest';
    this.remainingQuota = data.remainingQuota || 0;
    this.totalQuota = data.totalQuota || 0;
    this.usedToday = data.usedToday || 0;
    
    this._validate(data);
  }
  
  _validate(data) {
    if (typeof this.canDraw !== 'boolean') {
      this._warn('_validate', 'canDraw字段类型错误');
    }
    if (typeof this.remainingQuota !== 'number') {
      this._warn('_validate', 'remainingQuota字段类型错误');
    }
  }
  
  /**
   * 是否还有剩余配额
   * @returns {boolean}
   */
  hasRemainingQuota() {
    return this.canDraw && (this.totalQuota === -1 || this.remainingQuota > 0);
  }
  
  /**
   * 获取配额描述
   * @returns {string}
   */
  getQuotaDescription() {
    if (this.totalQuota === -1) {
      return '无限次';
    }
    return `今日剩余 ${this.remainingQuota}/${this.totalQuota} 次`;
  }
}

module.exports = { DrawCardQuotaBean };
```

---

#### 3.3 修改 `pages/answer/index.js`

**任务**：在抽卡流程中集成配额检查和记录功能

**修改点1：页面加载时预加载配额信息**

在 `onLoad` 方法中添加：
```javascript
async onLoad(options) {
  console.log('[AnswerPage] 页面加载');
  
  // ... 现有代码 ...
  
  // 预加载用户配额信息
  await this._loadUserQuota();
}
```

添加方法：
```javascript
/**
 * 加载用户配额信息
 */
async _loadUserQuota() {
  const { drawCardService } = require('../../services/DrawCardService');
  
  try {
    const response = await drawCardService.checkQuota();
    
    if (response.success) {
      this.setData({
        userQuotaInfo: response.data
      });
      log.info('_loadUserQuota', '配额信息加载成功', response.data);
    } else {
      log.warn('_loadUserQuota', '配额信息加载失败', response.error);
      // 静默处理，不影响页面显示
    }
  } catch (error) {
    log.error('_loadUserQuota', '加载配额信息异常', error);
    // 静默处理
  }
}
```

**修改点2：抽卡前检查配额**

在 `onAnalyzeAnswer` 方法开头添加：
```javascript
async onAnalyzeAnswer() {
  log.info('onAnalyzeAnswer', '点击抽卡');
  
  // 同步检查：如果正在抽卡，直接返回（防止重复点击）
  if (this.isDrawingCard) {
    log.warn('onAnalyzeAnswer', '正在抽卡中，忽略重复点击');
    return;
  }
  
  // ========== 新增：配额检查 ==========
  const quotaCheck = await this._checkDrawQuota();
  if (!quotaCheck || !quotaCheck.canDraw) {
    this._showQuotaError(quotaCheck);
    return;
  }
  // ====================================
  
  // 设置抽卡标志
  this.isDrawingCard = true;
  
  // ... 后续现有代码 ...
}
```

添加方法：
```javascript
/**
 * 检查抽卡配额
 * @returns {Promise<Object|null>} 配额信息，失败返回null
 */
async _checkDrawQuota() {
  const { drawCardService } = require('../../services/DrawCardService');
  
  try {
    const response = await drawCardService.checkQuota();
    
    if (response.success) {
      return response.data;
    } else {
      // 返回错误信息，供后续处理
      return {
        canDraw: false,
        error: response.error,
        code: response.code,
        ...response.data // 包含配额信息
      };
    }
  } catch (error) {
    log.error('_checkDrawQuota', '检查配额异常', error);
    return {
      canDraw: false,
      error: '网络错误，请重试',
      code: -1
    };
  }
}
```

**修改点3：AI解读成功后记录历史**

在 `onAIInterpret` 方法中，AI解读成功后添加记录逻辑：
```javascript
async onAIInterpret(isAutoCall = false) {
  // ... 现有代码 ...
  
  try {
    // ... 调用AI解读的代码 ...
    
    if (result.result && result.result.success) {
      // ... 处理AI解读结果的代码 ...
      
      this.setData({
        aiInterpretation: interpretation,
        showInterpretButton: false
      });
      
      log.info('onAIInterpret', 'AI解读成功', { interpretation, isAutoCall });
      
      // ========== 新增：记录抽卡历史 ==========
      if (this.data.selectedCard) {
        await this._recordDrawHistory(
          this.data.selectedCard,
          this.data.question || '',
          interpretation
        );
        
        // 刷新配额信息
        await this._loadUserQuota();
      }
      // ======================================
      
      // ... 后续代码 ...
    }
  } catch (error) {
    // ... 错误处理 ...
  } finally {
    // ... 清理代码 ...
  }
}
```

添加方法：
```javascript
/**
 * 记录抽卡历史
 * @param {Object} card - 卡牌信息
 * @param {string} question - 用户问题
 * @param {string} aiAnswer - AI解读结果
 */
async _recordDrawHistory(card, question, aiAnswer) {
  const { drawCardService } = require('../../services/DrawCardService');
  
  try {
    const response = await drawCardService.recordDraw({
      question: question || '',
      cardNumber: card.cardNumber,
      cardName: card.cardName,
      aiAnswer: aiAnswer,
      drawTime: new Date() // 抽卡时间（可选，云函数会使用当前时间）
    });
    
    if (response.success) {
      log.info('_recordDrawHistory', '记录成功');
    } else {
      log.warn('_recordDrawHistory', '记录失败（不影响使用）', response.error);
      // 静默处理，不影响用户体验
    }
  } catch (error) {
    log.error('_recordDrawHistory', '记录异常（不影响使用）', error);
    // 静默处理
  }
}
```

**修改点4：添加配额错误提示**

添加方法：
```javascript
/**
 * 显示配额错误提示
 * @param {Object} quotaInfo - 配额信息（包含错误信息）
 */
_showQuotaError(quotaInfo) {
  if (!quotaInfo) {
    wx.showToast({
      title: '暂时无法使用抽卡功能',
      icon: 'none',
      duration: 2500
    });
    return;
  }
  
  let message = quotaInfo.error || '暂时无法使用抽卡功能';
  
  // 根据错误码显示不同提示
  switch (quotaInfo.code) {
    case 1001: // 未注册用户
      message = '请先注册后使用抽卡功能';
      break;
    case 1002: // 用户类型不支持
      message = '您当前的用户类型不支持抽卡功能';
      break;
    case 1003: // 配额用完
      const totalQuota = quotaInfo.totalQuota || 3;
      message = `今日抽卡次数已用完（${totalQuota}次/天），明天再来吧~`;
      break;
    default:
      // 使用原始错误信息
      break;
  }
  
  wx.showToast({
    title: message,
    icon: 'none',
    duration: 2500
  });
}
```

---

### 阶段四：测试验证（60分钟）

#### 4.1 未注册用户测试

**测试步骤**：
1. 使用 guest 用户登录小程序
2. 进入抽卡页面
3. 点击"抽卡"按钮

**预期结果**：
- 显示提示："请先注册后使用抽卡功能"
- 不执行抽卡动画

---

#### 4.2 普通用户配额限制测试

**测试步骤**：
1. 使用 normal 用户登录
2. 进入抽卡页面
3. 连续抽卡 3 次（每次完成AI解读）
4. 尝试第 4 次抽卡

**预期结果**：
- 前 3 次可以正常抽卡和AI解读
- 第 4 次显示提示："今日抽卡次数已用完（3次/天），明天再来吧~"
- `draw_card_records` 表中有 3 条记录

---

#### 4.3 高级用户无限配额测试

**测试步骤**：
1. 使用 premium 用户登录
2. 进入抽卡页面
3. 连续抽卡多次（5次以上）

**预期结果**：
- 可以无限次抽卡
- 配额信息显示：`remainingQuota: -1, totalQuota: -1`
- 所有记录都正确保存到 `draw_card_records` 表

---

#### 4.4 记录验证测试

**测试步骤**：
1. 完成一次完整的抽卡流程（抽卡 + AI解读）
2. 在云开发控制台查询 `draw_card_records` 表

**验证点**：
- 记录是否创建
- 字段是否完整：
  - `userId`、`openid`、`userTypeCode`
  - `question`、`cardNumber`、`cardName`、`aiAnswer`
  - `drawTime`、`interpretTime`、`drawDate`
  - `isActive: true`
- `drawDate` 格式是否为 `YYYY-MM-DD`
- 时间是否正确（UTC时间）

---

#### 4.5 跨天测试

**测试步骤**：
1. 使用 normal 用户，抽卡 3 次（用完配额）
2. 等待或手动修改数据库中的 `drawDate` 为第二天
3. 再次尝试抽卡

**预期结果**：
- 配额重置，可以继续抽卡

---

## 三、实施检查清单

### 数据库检查清单
- [ ] `static_user_types` 表包含 `dailyDrawQuota` 字段
- [ ] 三个用户类型的 `dailyDrawQuota` 值正确（guest: 0, normal: 3, premium: -1）
- [ ] `draw_card_records` 集合已创建
- [ ] `draw_card_records` 集合权限配置正确（仅管理端可读写）
- [ ] `userId + drawDate` 复合索引已创建

### 云函数检查清单
- [ ] `drawCardManagement` 云函数已创建
- [ ] `checkQuota` 接口实现完整
- [ ] `recordDraw` 接口实现完整
- [ ] 错误处理完善
- [ ] 日志记录完善

### 客户端检查清单
- [ ] `DrawCardService` 服务类已创建
- [ ] `pages/answer/index.js` 已集成配额检查
- [ ] `pages/answer/index.js` 已集成记录功能
- [ ] 错误提示处理完善
- [ ] 配额信息预加载功能正常

### 测试检查清单
- [ ] guest 用户测试通过
- [ ] normal 用户配额限制测试通过
- [ ] premium 用户无限配额测试通过
- [ ] 记录验证测试通过
- [ ] 跨天测试通过（可选）

---

## 四、注意事项

### 4.1 数据一致性
- 配额检查必须在云函数中进行，确保安全性
- 记录失败不影响用户体验，静默处理

### 4.2 性能优化
- 配额信息在页面加载时预加载，减少等待时间
- 记录操作异步执行，不阻塞用户操作

### 4.3 错误处理
- 网络错误时提供友好提示
- 记录失败时静默处理，不影响用户体验

### 4.4 时区问题
- 使用 UTC 时间存储
- 按日期字符串（YYYY-MM-DD）统计，避免时区差异

---

## 五、部署提醒

### 5.1 云函数部署
**重要**：完成云函数开发后，需要手动部署到云端。

**部署步骤**：
1. 在云开发控制台找到 `drawCardManagement` 云函数
2. 点击"上传并部署"
3. 等待部署完成
4. 测试云函数是否正常工作

### 5.2 数据库配置
**重要**：数据库配置需要在云开发控制台手动完成。

**配置步骤**：
1. 确认 `static_user_types` 表数据正确
2. 创建 `draw_card_records` 集合
3. 配置集合权限
4. 创建索引

---

## 六、相关文档

- [抽卡配额系统设计方案](./draw-card-quota-system.md)
- [抽卡记录表设计](./database/draw_card_recordsdb.md)
- [用户类型表设计](./database/user_typesdb.md)
- [drawCardManagement API文档](./api/drawCardManagement-api.md)

---

## 七、后续优化建议

1. **配额信息缓存**：在客户端缓存配额信息，减少云函数调用
2. **配额显示**：在页面上显示当前配额信息（如"今日剩余 2/3 次"）
3. **历史记录展示**：在个人中心显示用户的抽卡历史
4. **配额购买**：允许用户购买额外的抽卡次数

---

**执行日期**：_____________  
**执行人**：_____________  
**完成状态**：□ 进行中  □ 已完成

