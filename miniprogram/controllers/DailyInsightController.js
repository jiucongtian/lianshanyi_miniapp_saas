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
   * 注意：每次都从云端获取最新数据，不使用缓存
   */
  async loadTodayCard() {
    try {
      this._setData({ loading: true });
      
      // 调用Service，不传递日期参数，由服务器自动处理
      const response = await dailyInsightService.getTodayCard();
      
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
   * @returns {string} 日期字符串
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

