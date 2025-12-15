// pages/daily-insight/index.js
const { DailyInsightController } = require('../../controllers/DailyInsightController');
const { createModuleLogger } = require('../../utils/logger/index');
const logger = createModuleLogger('DailyInsightPage');
const app = getApp();

Page({
  data: {
    // 当前时间
    currentTime: '',
    // 日期信息
    dateInfo: {
      year: '',
      month: '',
      day: ''
    },
    // 卡牌信息
    cardInfo: null,
    // 加载状态
    loading: false
  },

  onLoad(options) {
    logger.info('onLoad', '页面加载');
    this.controller = new DailyInsightController(this);
    
    // 检查是否有预加载的数据
    const preloadData = app.globalData.dailyInsightPreloadData;
    if (preloadData && preloadData.timestamp) {
      // 检查数据是否过期（5分钟内有效）
      const dataAge = Date.now() - preloadData.timestamp;
      const MAX_AGE = 5 * 60 * 1000; // 5分钟
      
      if (dataAge < MAX_AGE) {
        logger.info('onLoad', '使用预加载的数据');
        // 使用预加载的数据初始化
        this.controller.initialize(preloadData);
        // 清除预加载数据，避免下次误用
        delete app.globalData.dailyInsightPreloadData;
      } else {
        logger.warn('onLoad', '预加载数据已过期，重新获取');
        delete app.globalData.dailyInsightPreloadData;
        this.controller.initialize();
      }
    } else {
      // 没有预加载数据，正常初始化
      logger.info('onLoad', '没有预加载数据，正常初始化');
      this.controller.initialize();
    }
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
      const imageUrl = cardInfo.imageUrl || '';
      return {
        title: `每日愈见：${cardInfo.cardName} - ${cardInfo.password}`,
        path: '/pages/daily-insight/index',
        imageUrl: imageUrl
      };
    }
    return {};
  },

  onShareTimeline() {
    const { cardInfo } = this.data;
    if (cardInfo) {
      // 使用Bean的方法计算图片路径
      const imageUrl = cardInfo.imageUrl || '';
      return {
        title: `每日愈见：${cardInfo.cardName} - ${cardInfo.password}`,
        imageUrl: imageUrl
      };
    }
    return {};
  }
});

