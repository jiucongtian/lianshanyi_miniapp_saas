/**
 * 抽卡服务类
 * 处理抽卡相关的业务逻辑，包括配额检查、抽卡记录等
 */
const { BaseService } = require('./BaseService');
const { ResponseBean } = require('../beans/ResponseBean');
const { DrawCardQuotaBean } = require('../beans/DrawCardQuotaBean');

class DrawCardService extends BaseService {
  constructor() {
    super();
  }
  
  /**
   * 检查抽卡配额
   * @returns {Promise<ResponseBean>} 配额信息响应，成功时data为DrawCardQuotaBean实例
   */
  async checkQuota() {
    try {
      const response = await this.callFunction('drawCardManagement', {
        action: 'checkQuota'
      });
      
      this._logServiceCall('checkQuota', {}, response);
      
      // 成功时将data转换为DrawCardQuotaBean
      if (response.success && response.data) {
        response.data = new DrawCardQuotaBean(response.data);
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
   * @param {Date|string} drawData.drawTime - 抽卡时间（可选）
   * @param {string} drawData.cloudFunctionVersion - 云函数版本号（可选）
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
      
      // 处理 drawTime（如果是 Date 对象，转换为 ISO 字符串）
      const processedData = { ...drawData };
      if (processedData.drawTime instanceof Date) {
        processedData.drawTime = processedData.drawTime.toISOString();
      }
      
      const response = await this.callFunction('drawCardManagement', {
        action: 'recordDraw',
        data: processedData
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

