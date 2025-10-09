/**
 * 八字计算服务
 * 提供生辰八字计算相关功能
 */
const { BaseService } = require('./BaseService');
const { ResponseBean } = require('../beans/ResponseBean');
const { BaziBean } = require('../beans/BaziBean');

class BaziService extends BaseService {
  /**
   * 计算生辰八字
   * @param {number} timestamp - 时间戳
   * @returns {Promise<ResponseBean>} 返回计算结果
   */
  async calculateBazi(timestamp) {
    try {
      console.log('[BaziService] 开始计算生辰八字，参数:', { timestamp });
      
      const result = await this.callFunction('calculateBazi', {
        timestamp: timestamp
      });
      
      if (result.success && result.data) {
        // 将baziData转换为BaziBean，保留其他数据
        const baziData = result.data.baziData;
        if (baziData) {
          result.data.baziData = new BaziBean(baziData);
          console.log('[BaziService] 八字计算成功，BaziBean已创建');
        } else {
          console.error('[BaziService] 云函数返回数据中缺少baziData字段');
        }
      } else {
        console.error('[BaziService] 八字计算失败:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('[BaziService] 八字计算异常:', error);
      return ResponseBean.error(error.message || '八字计算失败');
    }
  }

  /**
   * 带重试的八字计算
   * @param {number} timestamp - 时间戳
   * @param {number} retryCount - 重试次数
   * @returns {Promise<ResponseBean>} 返回计算结果
   */
  async calculateBaziWithRetry(timestamp, retryCount = 3) {
    try {
      console.log('[BaziService] 开始带重试的八字计算，参数:', { timestamp, retryCount });
      
      const result = await this.callFunctionWithRetry('calculateBazi', {
        timestamp: timestamp
      }, retryCount);
      
      if (result.success && result.data) {
        // 将baziData转换为BaziBean，保留其他数据
        const baziData = result.data.baziData;
        if (baziData) {
          result.data.baziData = new BaziBean(baziData);
          console.log('[BaziService] 带重试的八字计算成功，BaziBean已创建');
        } else {
          console.error('[BaziService] 云函数返回数据中缺少baziData字段');
        }
      } else {
        console.error('[BaziService] 带重试的八字计算失败:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('[BaziService] 带重试的八字计算异常:', error);
      return ResponseBean.error(error.message || '八字计算失败');
    }
  }
}

// 导出类和单例
module.exports = {
  BaziService,
  baziService: new BaziService()
};
