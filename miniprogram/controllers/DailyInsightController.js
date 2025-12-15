/**
 * 日报页面控制器
 * 处理日报页面的业务逻辑
 */
const { BaseController } = require('./BaseController');
const { dailyInsightService } = require('../services/DailyInsightService');

class DailyInsightController extends BaseController {
  constructor(page) {
    super(page);
  }
  
  /**
   * 初始化页面
   */
  async initialize() {
    this._log('initialize', '开始初始化页面');
    
    try {
      // 设置加载状态
      this._setData({ loading: true });
      
      // 先加载卡牌数据，获取服务器返回的北京时间
      await this.loadTodayCard();
      
      this._setData({ loading: false });
      this._log('initialize', '页面初始化完成');
    } catch (error) {
      this._error('initialize', '页面初始化失败:', error);
      this._setData({ loading: false });
      this._handleError(error, '页面初始化');
    }
  }
  
  /**
   * 初始化日期信息（使用云函数返回的北京时间）
   * @param {string} dateStr - 日期字符串（YYYY-MM-DD格式，来自云函数返回的北京时间）
   * @param {string} timeStr - 时间字符串（HH:mm格式，来自云函数返回的北京时间，可选）
   */
  _initDateInfo(dateStr, timeStr = null) {
    if (!dateStr || typeof dateStr !== 'string') {
      this._warn('_initDateInfo', '日期字符串无效，使用当前时间', { dateStr });
      // 如果日期无效，使用当前时间作为后备方案
      const now = new Date();
      const dateInfo = {
        year: now.getFullYear(),
        month: String(now.getMonth() + 1).padStart(2, '0'),
        day: String(now.getDate()).padStart(2, '0')
      };
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      this._setData({
        currentTime: `${hours}:${minutes}`,
        dateInfo: dateInfo
      });
      return;
    }
    
    // 从日期字符串（YYYY-MM-DD）解析年月日
    const dateParts = dateStr.split('-');
    if (dateParts.length !== 3) {
      this._warn('_initDateInfo', '日期格式错误', { dateStr });
      return;
    }
    
    const dateInfo = {
      year: parseInt(dateParts[0], 10),
      month: dateParts[1],
      day: dateParts[2]
    };
    
    // 使用云函数返回的北京时间，如果没有则使用客户端时间作为后备
    const currentTime = timeStr || (() => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    })();
    
    this._setData({
      currentTime: currentTime,
      dateInfo: dateInfo
    });
    
    this._log('_initDateInfo', '使用服务器返回的北京时间初始化日期和时间', { 
      dateStr, 
      timeStr, 
      dateInfo,
      currentTime 
    });
  }
  
  /**
   * 加载今日卡牌
   * 注意：每次都从云端获取最新数据，不使用缓存
   */
  async loadTodayCard() {
    try {
      this._setData({ loading: true });
      
      // 调用Service，不传递日期参数，由服务器自动处理
      const response = await dailyInsightService.getTodayCard();
      
      if (response.success && response.data) {
        const { card, date, time } = response.data;
        
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
          
          // 使用云函数返回的北京时间初始化日期和时间信息
          if (date) {
            this._initDateInfo(date, time);
            this._log('loadTodayCard', '使用服务器返回的北京时间', { 
              serverDate: date, 
              serverTime: time 
            });
          } else {
            this._warn('loadTodayCard', '服务器未返回日期，使用客户端时间');
            this._initDateInfo();
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
   * 查看卡牌大图
   */
  onViewCardImage() {
    const cardInfo = this._getData('cardInfo');
    if (cardInfo && cardInfo.imageUrl) {
      wx.previewImage({
        urls: [cardInfo.imageUrl],
        current: cardInfo.imageUrl
      });
    }
  }
}

module.exports = { DailyInsightController };

