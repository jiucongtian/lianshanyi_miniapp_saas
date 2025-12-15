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
   * @returns {string} 日期字符串
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

