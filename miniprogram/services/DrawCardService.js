/**
 * ⚠️ 废弃警告：此服务类已废弃
 * 
 * 抽卡历史记录功能已迁移到 `cozeFunctions_v1_3` 云函数中。
 * 当 AI 解读成功时，`cozeFunctions_v1_3` 会自动记录抽卡历史并返回更新后的配额信息。
 * 
 * 新的使用方式：
 * - 直接调用 `cozeFunctions_v1_3` 进行 AI 解读
 * - 解读成功后会自动记录，无需单独调用此服务
 * - 返回值中包含 `drawCardQuota` 字段，包含更新后的配额信息
 * 
 * 此服务类保留仅作为备用，不建议新代码使用。
 * 计划在未来版本中完全移除。
 * 
 * @deprecated 使用 cozeFunctions_v1_3 代替
 */
const { BaseService } = require('./BaseService');
const { ResponseBean } = require('../beans/ResponseBean');

class DrawCardService extends BaseService {
  constructor() {
    super();
  }
  
  /**
   * 记录抽卡历史
   * 
   * ⚠️ 已废弃：此方法已废弃，功能已迁移到 cozeFunctions_v1_3
   * 
   * @deprecated 使用 cozeFunctions_v1_3 代替，AI解读成功时会自动记录
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

