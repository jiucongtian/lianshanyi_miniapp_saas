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

