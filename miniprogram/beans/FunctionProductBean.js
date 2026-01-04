/**
 * 功能商品数据Bean
 * 用于处理功能商品相关的数据格式化和验证
 */
const { BaseBean } = require('./BaseBean');

class FunctionProductBean extends BaseBean {
  constructor(data) {
    super(data);
    
    // 基本信息
    this._id = this._getField(this.data, '_id', '', 'string');
    this.functionCode = this._getField(this.data, 'functionCode', '', 'string');
    this.functionName = this._getField(this.data, 'functionName', '', 'string');
    this.functionType = this._getField(this.data, 'functionType', 'per_use', 'string');
    this.description = this._getField(this.data, 'description', '', 'string');
    
    // 价格信息
    this.price = this._getField(this.data, 'price', 0, 'number');
    this.originalPrice = this._getField(this.data, 'originalPrice', 0, 'number');
    
    // 状态
    this.status = this._getField(this.data, 'status', 'inactive', 'string');
    this.sortOrder = this._getField(this.data, 'sortOrder', 0, 'number');
    
    // 调用配置
    this.callConfig = this._getField(this.data, 'callConfig', {});
    
    // 权益发放配置
    this.grantData = this._getField(this.data, 'grantData', {});
    
    // 时间戳
    this.createTime = this._getField(this.data, 'createTime', null);
    this.updateTime = this._getField(this.data, 'updateTime', null);
    
    // 验证数据
    this._validate();
  }
  
  /**
   * 验证数据完整性
   */
  _validate() {
    // 验证必需字段
    this._validateRequiredField('functionCode', this.functionCode);
    this._validateRequiredField('functionName', this.functionName);
    
    // 验证数据类型
    this._validateFieldType('price', this.price, 'number');
    this._validateFieldType('originalPrice', this.originalPrice, 'number');
    this._validateFieldType('status', this.status, 'string');
    this._validateFieldType('sortOrder', this.sortOrder, 'number');
    
    // 验证价格范围
    if (this.price < 0) {
      this._addValidationError('price', '价格不能为负数');
    }
    if (this.originalPrice < 0) {
      this._addValidationError('originalPrice', '原价不能为负数');
    }
    
    // 验证状态值
    const validStatuses = ['active', 'inactive', 'sold_out'];
    if (!validStatuses.includes(this.status)) {
      this._addValidationError('status', `无效的状态值: ${this.status}`);
    }
    
    // 验证功能类型
    const validTypes = ['per_use', 'subscription'];
    if (!validTypes.includes(this.functionType)) {
      this._addValidationError('functionType', `无效的功能类型: ${this.functionType}`);
    }
    
    // 标记为已验证
    this._isValidated = true;
  }
  
  /**
   * 检查商品是否可用
   * @returns {boolean} 是否可用
   */
  isActive() {
    return this.status === 'active';
  }
  
  /**
   * 检查是否有折扣
   * @returns {boolean} 是否有折扣
   */
  hasDiscount() {
    return this.originalPrice > 0 && this.price < this.originalPrice;
  }
  
  /**
   * 获取折扣率
   * @returns {number} 折扣率（0-1之间）
   */
  getDiscountRate() {
    if (!this.hasDiscount()) {
      return 0;
    }
    return (this.originalPrice - this.price) / this.originalPrice;
  }
  
  /**
   * 格式化价格显示（分转元）
   * @returns {string} 格式化后的价格文本
   */
  getPriceText() {
    const priceYuan = (this.price / 100).toFixed(2);
    return `¥${priceYuan}`;
  }
  
  /**
   * 获取原价文本（分转元）
   * @returns {string} 格式化后的原价文本
   */
  getOriginalPriceText() {
    if (this.originalPrice <= 0) {
      return '';
    }
    const priceYuan = (this.originalPrice / 100).toFixed(2);
    return `¥${priceYuan}`;
  }
  
  /**
   * 获取价格显示（包含原价和折扣）
   * @returns {string} 完整的价格显示文本
   */
  getFullPriceText() {
    const priceText = this.getPriceText();
    
    if (this.hasDiscount()) {
      const originalText = this.getOriginalPriceText();
      const discountRate = Math.round(this.getDiscountRate() * 100);
      return `${originalText} ${priceText}（${discountRate}折）`;
    }
    
    return priceText;
  }
  
  /**
   * 获取功能描述
   * @returns {string} 功能描述
   */
  getDescription() {
    return this.description || this.functionName;
  }
  
  /**
   * 转换为简单对象（用于调试或日志）
   * @returns {Object} 简化的商品对象
   */
  toObject() {
    return {
      _id: this._id,
      functionCode: this.functionCode,
      functionName: this.functionName,
      functionType: this.functionType,
      price: this.price,
      originalPrice: this.originalPrice,
      status: this.status,
      priceText: this.getPriceText(),
      isActive: this.isActive()
    };
  }
}

module.exports = { FunctionProductBean };

