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
  }
  
  /**
   * 获取今日卡牌
   * 注意：日报数据每次都从云端获取，不使用本地缓存
   * @returns {Promise<ResponseBean>} 卡牌信息响应
   */
  async getTodayCard() {
    try {
      // 调用云函数，不传递日期参数，由服务器自动处理
      const response = await this.callFunction('dailyInsightManagement', {
        action: 'getTodayCard'
      });
      
      // 打印云函数返回的完整结果
      console.log('[DailyInsightService] 云函数返回的完整结果:')
      console.log('[DailyInsightService] - response:', JSON.stringify(response, null, 2))
      console.log('[DailyInsightService] - response.success:', response.success)
      console.log('[DailyInsightService] - response.data:', response.data)
      if (response.data) {
        console.log('[DailyInsightService] - response.data.card:', response.data.card)
        console.log('[DailyInsightService] - response.data.date:', response.data.date, '(今天的日期，由云函数返回)')
        console.log('[DailyInsightService] - response.data.ganZhi:', response.data.ganZhi)
        console.log('[DailyInsightService] - response.data.cardNumber:', response.data.cardNumber)
        if (response.data.card) {
          console.log('[DailyInsightService] - response.data.card 详细内容:')
          console.log('[DailyInsightService]   - _id:', response.data.card._id)
          console.log('[DailyInsightService]   - cardName:', response.data.card.cardName)
          console.log('[DailyInsightService]   - cardNumber:', response.data.card.cardNumber, '(类型:', typeof response.data.card.cardNumber, ')')
          console.log('[DailyInsightService]   - central:', response.data.card.central ? '存在' : '缺失')
          console.log('[DailyInsightService]   - seasonMark:', response.data.card.seasonMark ? '存在' : '缺失')
          console.log('[DailyInsightService]   - talentMark:', response.data.card.talentMark ? '存在' : '缺失')
          console.log('[DailyInsightService]   - abilityMark:', response.data.card.abilityMark ? '存在' : '缺失')
          console.log('[DailyInsightService]   - pathMark:', response.data.card.pathMark ? '存在' : '缺失')
          console.log('[DailyInsightService]   - description:', response.data.card.description ? '存在' : '缺失')
          console.log('[DailyInsightService]   - blessing:', response.data.card.blessing ? '存在' : '缺失')
          console.log('[DailyInsightService]   - tip:', response.data.card.tip ? '存在' : '缺失')
          console.log('[DailyInsightService]   - password:', response.data.card.password ? '存在' : '缺失')
          console.log('[DailyInsightService]   - isActive:', response.data.card.isActive)
        }
      }
      if (response.error) {
        console.log('[DailyInsightService] - response.error:', response.error)
      }
      
      this._logServiceCall('getTodayCard', {}, response);
      
      // 成功时将card转换为DailyInsightBean
      if (response.success && response.data && response.data.card) {
        console.log('[DailyInsightService] 开始转换DailyInsightBean')
        console.log('[DailyInsightService] - 转换前的card数据:', JSON.stringify(response.data.card, null, 2))
        
        response.data.card = new DailyInsightBean(response.data.card);
        
        console.log('[DailyInsightService] 转换后的DailyInsightBean:')
        console.log('[DailyInsightService] - card._id:', response.data.card._id)
        console.log('[DailyInsightService] - card.cardName:', response.data.card.cardName)
        console.log('[DailyInsightService] - card.cardNumber:', response.data.card.cardNumber, '(类型:', typeof response.data.card.cardNumber, ')')
        console.log('[DailyInsightService] - card.isValid():', response.data.card.isValid())
        const validationErrors = response.data.card.getValidationErrors()
        if (validationErrors && validationErrors.length > 0) {
          console.error('[DailyInsightService] - card验证错误:', JSON.stringify(validationErrors, null, 2))
        } else {
          console.log('[DailyInsightService] - card验证通过，无错误')
        }
      } else {
        console.warn('[DailyInsightService] 无法转换DailyInsightBean:')
        console.warn('[DailyInsightService] - response.success:', response.success)
        console.warn('[DailyInsightService] - response.data:', response.data)
        console.warn('[DailyInsightService] - response.data.card:', response.data?.card)
      }
      
      return response;
    } catch (error) {
      this._error('getTodayCard', '获取今日卡牌异常:', error);
      return ResponseBean.error('获取今日卡牌失败: ' + error.message, -1);
    }
  }
}

// 导出类和单例实例
module.exports = {
  DailyInsightService,
  dailyInsightService: new DailyInsightService()
};

