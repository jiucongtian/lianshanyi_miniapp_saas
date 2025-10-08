/**
 * 八字计算服务
 * 提供生辰八字计算相关功能
 */
const { BaseService } = require('./BaseService');
const { ResponseBean } = require('../beans/ResponseBean');

class BaziService extends BaseService {
  /**
   * 计算生辰八字
   * @param {number} timestamp - 时间戳
   * @returns {Promise<ResponseBean>} 返回计算结果
   */
  async calculateBazi(timestamp) {
    try {
      console.log('[BaziService] 开始计算生辰八字，参数:', { timestamp });
      
      const result = await this.callFunction('calculateBazi_v1_1', {
        timestamp: timestamp
      });
      
      if (result.success) {
        console.log('[BaziService] 八字计算成功');
        return result;
      } else {
        console.error('[BaziService] 八字计算失败:', result.error);
        return result;
      }
    } catch (error) {
      console.error('[BaziService] 八字计算异常:', error);
      return ResponseBean.error(error.message || '八字计算失败');
    }
  }
}

// 导出类和单例
module.exports = {
  BaziService,
  baziService: new BaziService()
};
