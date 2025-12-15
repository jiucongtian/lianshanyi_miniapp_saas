# 每日愈见（日报）页面云函数加载方案

## 一、方案概述

### 1.1 功能需求
- **获取今日卡牌**：根据当前日期从云端获取对应的每日卡牌内容（每天的内容和卡牌是固定的，提前计算好存储在数据库中）
- **日期信息**：显示公历、农历、干支纪年等信息（客户端计算）

### 1.2 架构设计
遵循项目现有的分层架构：
```
Page层 (daily-insight/index.js)
  ↓
Controller层 (DailyInsightController.js)
  ↓
Service层 (DailyInsightService.js)
  ↓
Bean层 (DailyInsightBean.js)
  ↓
云函数层 (dailyInsightManagement_v1_x/index.js)
```

## 二、数据结构设计

### 2.1 日报卡牌数据结构（DailyInsightBean）

```javascript
{
  // 基础信息
  _id: string,                    // 卡牌记录ID
  date: string,                   // 日期（YYYY-MM-DD格式）
  cardName: string,               // 卡牌名称（如"贵虎"）
  cardNumber: number,             // 卡牌编号（1-60，对应60甲子）
  
  // 卡牌内容
  central: string,                // 卡牌中央描述
  seasonMark: string,             // 季节印记（如"春秋"）
  talentMark: string,             // 天赋印记（如"变通力"）
  abilityMark: string,            // 才能印记（如"二"）
  pathMark: string,               // 路途印记（如"精与义"）
  description: string,            // 卡牌描述
  blessing: string,               // 卡牌祝福
  tip: string,                    // 卡牌提示
  password: string,               // 通关密码
  
  // 元数据
  createdAt: timestamp,          // 创建时间
  updatedAt: timestamp,           // 更新时间
  isActive: boolean              // 是否有效
}

// 图片路径计算说明
// 图片URL不需要存储在数据结构中，通过 cardNumber 计算得出
// 计算方式与 card 页面一致：
// 1. 使用工具函数 getBaziImageById(cardNumber) 获取图片信息
// 2. 图片路径格式：cloud://${envId}.${cloudStorageId}/${cardImagesPath}/${fileName}
// 3. 文件名格式：${cardNumber.toString().padStart(2, '0')}.jpg（如 "01.jpg"）
```

### 2.2 日期信息结构（客户端计算）

```javascript
{
  year: number,                   // 公历年
  month: string,                  // 公历月（补零格式，如"01"）
  day: string                     // 公历日（补零格式，如"01"）
}

// 注意：只包含页面实际使用的字段
// 如果将来需要在页面显示农历、干支纪年等信息，可以再添加相应字段
```

## 三、云函数设计

### 3.1 云函数名称
`dailyInsightManagement_v1_1`（首次版本）

### 3.2 时间处理说明

**重要**：云函数会自动处理时间转换：
1. 获取服务器当前时间（UTC时间）
2. 转换为北京时间（UTC+8）
3. 根据北京时间确定日期（YYYY-MM-DD）
4. 查询该日期对应的日报卡牌数据

**时区转换示例**：
- 服务器时间：2024-01-01 16:00:00 UTC
- 北京时间：2024-01-02 00:00:00（UTC+8）
- 查询日期：2024-01-02

这样可以确保无论用户在哪个时区，都能获取到正确的北京时间对应的日报数据。

### 3.3 云函数接口设计

#### 3.3.1 获取今日卡牌
```javascript
// 请求参数
{
  action: 'getTodayCard'
  // 注意：不需要传入日期参数
  // 服务器会根据接口调用时间，自动转换为北京时间，获取对应日期的日报数据
}

// 返回数据
{
  success: true,
  data: {
    card: DailyInsightBean,      // 卡牌信息
    date: string                  // 实际查询的日期（YYYY-MM-DD，北京时间）
  },
  code: 0,
  message: '获取成功'
}
```

**重要说明**：
- 服务器会自动获取当前服务器时间
- 将服务器时间转换为北京时间（UTC+8）
- 根据北京时间确定对应的日期（YYYY-MM-DD）
- 查询该日期对应的日报卡牌数据
- 返回数据中包含实际查询的日期，供客户端验证使用

### 3.4 数据库设计

#### 3.4.1 daily_insights 集合（日报卡牌数据）
```javascript
{
  _id: string,                    // 主键
  date: string,                   // 日期（YYYY-MM-DD），索引字段
  cardName: string,               // 卡牌名称（如"贵虎"）
  cardNumber: number,             // 卡牌编号（1-60，对应60甲子）
  central: string,                // 卡牌中央描述
  seasonMark: string,             // 季节印记（如"春秋"）
  talentMark: string,             // 天赋印记（如"变通力"）
  abilityMark: string,            // 才能印记（如"二"）
  pathMark: string,                // 路途印记（如"精与义"）
  description: string,             // 卡牌描述
  blessing: string,                // 卡牌祝福
  tip: string,                     // 卡牌提示
  password: string,                // 通关密码
  createdAt: timestamp,           // 创建时间
  updatedAt: timestamp,           // 更新时间
  isActive: boolean                // 默认true
}

// 索引设计
// 1. date 单字段索引（必须创建，用于按日期查询今日卡牌）
// 2. isActive 单字段索引（用于过滤有效数据）

// 图片路径计算说明
// 图片URL不需要存储在数据库中，可以通过 cardNumber 计算得出
// 计算方式与 card 页面一致：
// 1. 根据 cardNumber 生成文件名：`${cardNumber.toString().padStart(2, '0')}.jpg`
// 2. 使用工具函数 getBaziImageById(cardNumber) 获取图片信息
// 3. 图片路径格式：cloud://${envId}.${cloudStorageId}/${cardImagesPath}/${fileName}
```

## 四、客户端实现设计

### 4.1 Bean层：DailyInsightBean.js

```javascript
/**
 * 日报卡牌数据Bean
 * 用于格式化和验证从云函数返回的卡牌数据
 */
const { getBaziImageById } = require('../utils/baziImageMap');

class DailyInsightBean {
  constructor(data) {
    // 提供默认值，避免程序崩溃
    this._id = data._id || '';
    this.date = data.date || '';
    this.cardName = data.cardName || '未知卡牌';
    this.cardNumber = data.cardNumber || 0;
    this.central = data.central || '';
    this.seasonMark = data.seasonMark || '';
    this.talentMark = data.talentMark || '';
    this.abilityMark = data.abilityMark || '';
    this.pathMark = data.pathMark || '';
    this.description = data.description || '';
    this.blessing = data.blessing || '';
    this.tip = data.tip || '';
    this.password = data.password || '';
    
    // 验证关键字段
    this._validate(data);
  }
  
  _validate(data) {
    if (!data.cardName) {
      console.warn('[DailyInsightBean] 缺少cardName字段');
    }
    if (!data.date) {
      console.warn('[DailyInsightBean] 缺少date字段');
    }
    if (!data.cardNumber || data.cardNumber < 1 || data.cardNumber > 60) {
      console.warn('[DailyInsightBean] cardNumber字段无效:', data.cardNumber);
    }
  }
  
  /**
   * 获取图片信息（与card页面一致的计算方式）
   * @returns {Object|null} 图片信息对象，包含 imagePath 和 fileName
   */
  getImageInfo() {
    if (!this.cardNumber || this.cardNumber < 1 || this.cardNumber > 60) {
      return null;
    }
    return getBaziImageById(this.cardNumber);
  }
  
  /**
   * 获取图片路径（云存储路径）
   * @returns {string} 图片路径，如果无法计算则返回默认路径
   */
  getImageUrl() {
    const imageInfo = this.getImageInfo();
    if (imageInfo && imageInfo.imagePath) {
      return imageInfo.imagePath;
    }
    // 默认返回卡牌背面图片
    return '/static/card-back.jpg';
  }
  
  // 业务方法
  getDateKey() {
    // 从date（YYYY-MM-DD）转换为dateKey（YYYYMMDD）
    return this.date ? this.date.replace(/-/g, '') : '';
  }
  
  // 检查数据完整性
  isValid() {
    return !!(this._id && this.cardName && this.date && this.cardNumber);
  }
}
```

### 4.2 Service层：DailyInsightService.js

```javascript
/**
 * 日报服务类
 * 处理日报相关的业务逻辑
 */
const { BaseService } = require('./BaseService');
const { DailyInsightBean } = require('../beans/DailyInsightBean');
const { ResponseBean } = require('../beans/ResponseBean');

class DailyInsightService extends BaseService {
  constructor() {
    super();
    // 今日卡牌缓存（避免重复请求）
    this._todayCardCache = null;
    this._cacheDate = null;
  }
  
  /**
   * 获取今日卡牌
   * @param {boolean} forceRefresh - 是否强制刷新，默认false
   * @returns {Promise<ResponseBean>} 卡牌信息响应
   */
  async getTodayCard(forceRefresh = false) {
    try {
      // 检查缓存（不强制刷新时）
      if (!forceRefresh && this._todayCardCache) {
        // 检查缓存日期是否与今天匹配（使用客户端日期作为初步判断）
        const today = this._getTodayDate();
        if (this._cacheDate === today) {
          this._log('getTodayCard', '使用缓存数据', { date: today });
          return this._todayCardCache;
        }
      }
      
      // 调用云函数，不传递日期参数，由服务器自动处理
      const response = await this.callFunction('dailyInsightManagement', {
        action: 'getTodayCard'
      });
      
      this._logServiceCall('getTodayCard', {}, response);
      
      // 成功时将card转换为DailyInsightBean
      if (response.success && response.data && response.data.card) {
        response.data.card = new DailyInsightBean(response.data.card);
        
        // 使用服务器返回的日期作为缓存key
        const serverDate = response.data.date;
        if (serverDate) {
          this._todayCardCache = response;
          this._cacheDate = serverDate;
        }
      }
      
      return response;
    } catch (error) {
      this._error('getTodayCard', '获取今日卡牌异常:', error);
      return ResponseBean.error('获取今日卡牌失败: ' + error.message, -1);
    }
  }
  
  /**
   * 清除今日卡牌缓存
   */
  _clearTodayCardCache() {
    this._todayCardCache = null;
    this._cacheDate = null;
  }
  
  /**
   * 获取今天的日期（YYYY-MM-DD格式，客户端时间，仅用于缓存判断）
   */
  _getTodayDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

// 导出类和单例实例
module.exports = {
  DailyInsightService,
  dailyInsightService: new DailyInsightService()
};
```

### 4.3 Controller层：DailyInsightController.js

```javascript
/**
 * 日报页面控制器
 * 处理日报页面的业务逻辑
 */
const { BaseController } = require('./BaseController');
const { dailyInsightService } = require('../services/DailyInsightService');
const { createModuleLogger } = require('../utils/logger/index');

class DailyInsightController extends BaseController {
  constructor(page) {
    super(page);
    this.logger = createModuleLogger('DailyInsightController');
  }
  
  /**
   * 初始化页面
   */
  async initialize() {
    this._log('initialize', '开始初始化页面');
    
    try {
      // 设置加载状态
      this._setData({ loading: true });
      
      // 并行加载：日期信息（客户端计算）+ 今日卡牌（云端获取）
      await Promise.all([
        this._initDateInfo(),
        this.loadTodayCard()
      ]);
      
      this._setData({ loading: false });
      this._log('initialize', '页面初始化完成');
    } catch (error) {
      this._error('initialize', '页面初始化失败:', error);
      this._setData({ loading: false });
      this._handleError(error, '页面初始化');
    }
  }
  
  /**
   * 初始化日期信息（客户端计算）
   * 注意：只计算页面实际使用的字段（年月日），不计算农历和干支纪年
   */
  _initDateInfo() {
    const now = new Date();
    
    // 计算日期信息（只包含页面实际使用的字段）
    const dateInfo = {
      year: now.getFullYear(),
      month: String(now.getMonth() + 1).padStart(2, '0'),
      day: String(now.getDate()).padStart(2, '0')
    };
    
    // 设置当前时间
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    this._setData({
      currentTime: `${hours}:${minutes}`,
      dateInfo: dateInfo
    });
  }
  
  /**
   * 加载今日卡牌
   * @param {boolean} forceRefresh - 是否强制刷新
   */
  async loadTodayCard(forceRefresh = false) {
    try {
      this._setData({ loading: true });
      
      // 调用Service，不传递日期参数，由服务器自动处理
      const response = await dailyInsightService.getTodayCard(forceRefresh);
      
      if (response.success && response.data) {
        const { card, date } = response.data;
        
        if (card && card.isValid()) {
          // 计算图片路径（与card页面一致的计算方式）
          const imageUrl = card.getImageUrl();
          
          // 设置卡牌信息，包含计算出的图片路径
          this._setData({
            cardInfo: {
              ...card,
              imageUrl: imageUrl  // 计算出的图片路径，供WXML使用
            }
          });
          
          // 可选：如果服务器返回的日期与客户端日期不一致，可以记录日志
          if (date) {
            const clientDate = this._getTodayDate();
            if (date !== clientDate) {
              this._log('loadTodayCard', '服务器日期与客户端日期不一致', {
                serverDate: date,
                clientDate: clientDate
              });
            }
          }
        } else {
          this._showError('卡牌数据不完整');
        }
      } else {
        this._showError(response.error || '获取今日卡牌失败');
      }
    } catch (error) {
      this._error('loadTodayCard', '加载今日卡牌异常:', error);
      this._showError('加载失败，请重试');
    } finally {
      this._setData({ loading: false });
    }
  }
  
  /**
   * 获取今天的日期（YYYY-MM-DD格式，客户端时间，仅用于对比）
   */
  _getTodayDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  /**
   * 查看卡牌大图
   */
  onViewCardImage() {
    const { cardInfo } = this.data;
    if (cardInfo) {
      // 使用Bean的方法计算图片路径（与card页面一致）
      const imageUrl = cardInfo.getImageUrl();
      if (imageUrl) {
        wx.previewImage({
          urls: [imageUrl],
          current: imageUrl
        });
      }
    }
  }
  
}

module.exports = { DailyInsightController };
```

### 4.4 Page层改造

```javascript
// pages/daily-insight/index.js
const { DailyInsightController } = require('../../controllers/DailyInsightController');
const { createModuleLogger } = require('../../utils/logger/index');
const logger = createModuleLogger('DailyInsightPage');

Page({
  data: {
    // 当前时间
    currentTime: '',
    // 日期信息
    dateInfo: {
      year: '',
      month: '',
      day: '',
      weekday: '',
      lunar: '',
      ganzhiYear: ''
    },
    // 卡牌信息
    cardInfo: null,
    // 加载状态
    loading: false
  },

  onLoad(options) {
    logger.info('onLoad', '页面加载');
    this.controller = new DailyInsightController(this);
    this.controller.initialize();
  },

  onShow() {
    logger.info('onShow', '页面显示');
  },

  // 事件处理方法
  onViewCardImage() {
    this.controller.onViewCardImage();
  },

  onBack() {
    wx.navigateBack({ delta: 1 });
  },

  // 分享
  onShareAppMessage() {
    const { cardInfo } = this.data;
    if (cardInfo) {
      // 使用Bean的方法计算图片路径
      const imageUrl = cardInfo.getImageUrl();
      return {
        title: `每日愈见：${cardInfo.cardName} - ${cardInfo.password}`,
        path: '/pages/daily-insight/index',
        imageUrl: imageUrl || ''
      };
    }
    return {};
  },

  onShareTimeline() {
    const { cardInfo } = this.data;
    if (cardInfo) {
      // 使用Bean的方法计算图片路径
      const imageUrl = cardInfo.getImageUrl();
      return {
        title: `每日愈见：${cardInfo.cardName} - ${cardInfo.password}`,
        imageUrl: imageUrl || ''
      };
    }
    return {};
  }
});
```

### 4.5 WXML层改造

需要移除"换一张"和"收藏"按钮，简化底部操作区域。同时，图片路径需要通过计算得出：

```xml
<!-- 卡牌图片 -->
<view class="card-image-wrapper">
  <image 
    class="card-image" 
    src="{{cardInfo.getImageUrl()}}" 
    mode="aspectFit"
    bindtap="onViewCardImage"
  />
</view>
```

**注意**：由于WXML中不能直接调用方法，在Controller的 `loadTodayCard` 方法中已经计算并设置了 `imageUrl`，所以WXML可以直接使用：

```xml
<!-- 卡牌图片 -->
<view class="card-image-wrapper">
  <image 
    class="card-image" 
    src="{{cardInfo.imageUrl}}" 
    mode="aspectFit"
    bindtap="onViewCardImage"
  />
</view>
```

图片路径的计算逻辑：
1. 通过 `cardInfo.cardNumber`（1-60）获取图片信息
2. 使用 `getBaziImageById(cardNumber)` 工具函数
3. 返回的图片路径格式：`cloud://${envId}.${cloudStorageId}/${cardImagesPath}/${fileName}`
4. 与 card 页面的计算方式完全一致

## 五、数据缓存策略

### 5.1 客户端缓存
- **今日卡牌缓存**：Service层缓存，同一天内不重复请求，避免重复调用云函数

### 5.2 云端优化
- **日期索引**：按日期建立索引，快速查询今日卡牌
- **数据预存**：每日卡牌数据提前计算好并存储在数据库中

## 六、错误处理策略

### 6.1 网络错误
- 显示友好的错误提示
- 支持重试机制（Service层已实现）

### 6.2 数据缺失
- 如果今日没有卡牌数据，返回友好的错误提示
- 建议提前准备至少未来一年的卡牌数据，避免数据缺失

## 七、实施步骤

### 实施步骤
1. ✅ 创建数据库集合文档（`daily_insights`）
2. ✅ 创建云函数 `dailyInsightManagement_v1_1`
3. ✅ 实现 `getTodayCard` 接口
4. ✅ 创建 `DailyInsightBean`
5. ✅ 创建 `DailyInsightService`
6. ✅ 创建 `DailyInsightController`
7. ✅ 改造Page层
8. ✅ 添加数据缓存
9. ✅ 优化错误处理
10. ✅ 添加加载状态提示

## 八、注意事项

### 8.1 数据一致性
- 确保每日卡牌数据唯一性（同一日期只有一张卡牌）
- 数据提前计算好并存储在数据库中，避免动态生成

### 8.2 性能优化
- 使用索引优化查询性能
- 客户端缓存减少请求次数
- 图片使用CDN加速

### 8.3 用户体验
- 加载状态提示
- 错误提示友好
- 支持离线查看（通过Service层缓存）

## 九、待讨论问题

1. **卡牌数据来源**：
   - 需要预先准备多少天的卡牌数据？（建议至少准备未来一年的数据）
   - 卡牌数据如何生成和初始化？

2. **农历计算**：
   - 客户端简化计算 vs 云端精确计算？
   - 是否需要接入专业的农历库？（如 `lunar-javascript`）

3. **数据初始化**：
   - 如何批量初始化每日卡牌数据？
   - 是否需要管理后台来管理卡牌数据？
   - 数据更新流程是什么？

4. **数据更新策略**：
   - 如果某天的卡牌数据需要更新，如何处理？
   - 是否需要版本控制？

