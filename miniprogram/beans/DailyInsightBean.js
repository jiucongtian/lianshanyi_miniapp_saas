/**
 * 日报卡牌数据Bean
 * 用于格式化和验证从云函数返回的卡牌数据
 */
const { BaseBean } = require('./BaseBean');
const { getBaziImageById } = require('../utils/baziImageMap');

class DailyInsightBean extends BaseBean {
  constructor(data) {
    super(data); // 调用BaseBean构造函数
    
    // 使用BaseBean提供的_getField方法提取字段
    this._id = this._getField(this.data, '_id', '', 'string');
    this.cardName = this._getField(this.data, 'cardName', '未知卡牌', 'string');
    this.cardNumber = this._getField(this.data, 'cardNumber', 0, 'number');
    this.central = this._getField(this.data, 'central', '', 'string');
    this.seasonMark = this._getField(this.data, 'seasonMark', '', 'string');
    this.talentMark = this._getField(this.data, 'talentMark', '', 'string');
    this.abilityMark = this._getField(this.data, 'abilityMark', '', 'string');
    this.pathMark = this._getField(this.data, 'pathMark', '', 'string');
    this.description = this._getField(this.data, 'description', '', 'string');
    this.blessing = this._getField(this.data, 'blessing', '', 'string');
    this.tip = this._getField(this.data, 'tip', '', 'string');
    this.password = this._getField(this.data, 'password', '', 'string');
    this.createdAt = this._getField(this.data, 'createdAt', null);
    this.updatedAt = this._getField(this.data, 'updatedAt', null);
    this.isActive = this.data.isActive !== undefined ? this.data.isActive : true;
    
    // 验证关键字段
    this._validate();
  }
  
  /**
   * 验证数据完整性
   */
  _validate() {
    // 验证必需字段
    this._validateRequiredField('_id', this._id);
    this._validateRequiredField('cardName', this.cardName);
    
    // 验证cardNumber范围（1-60）
    if (this.cardNumber < 1 || this.cardNumber > 60) {
      this._addValidationError('cardNumber', `cardNumber必须在1-60之间，当前值: ${this.cardNumber}`);
    }
    
    // 标记为已验证
    this._isValidated = true;
  }
  
  /**
   * 获取图片信息（与card页面一致的计算方式）
   * @returns {Object|null} 图片信息对象，包含 imagePath 和 fileName
   */
  getImageInfo() {
    if (!this.cardNumber || this.cardNumber < 1 || this.cardNumber > 60) {
      this._warn('getImageInfo', 'cardNumber无效，无法获取图片信息', { cardNumber: this.cardNumber });
      return null;
    }
    return getBaziImageById(this.cardNumber);
  }
  
  /**
   * 获取图片路径（云存储路径）
   * @returns {string} 图片路径，如果无法计算则返回默认路径
   */
  getImageUrl() {
    const imageInfo = this.getImageInfo();
    if (imageInfo && imageInfo.imagePath) {
      return imageInfo.imagePath;
    }
    // 默认返回卡牌背面图片
    return '/static/card-back.jpg';
  }
  
  /**
   * 检查数据完整性（业务方法）
   * @returns {boolean} 数据是否完整
   */
  isValid() {
    return !!(this._id && this.cardName && this.cardNumber >= 1 && this.cardNumber <= 60);
  }
}

module.exports = { DailyInsightBean };

