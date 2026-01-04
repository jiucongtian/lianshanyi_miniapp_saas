/**
 * 功能配额数据Bean
 * 用于处理功能配额相关的数据格式化和验证
 */
const { BaseBean } = require('./BaseBean');

class FunctionQuotaBean extends BaseBean {
  constructor(data) {
    super(data);
    
    // 配额基本信息
    this.functionCode = this._getField(this.data, 'functionCode', '', 'string');
    this.canUse = this._getField(this.data, 'canUse', false, 'boolean');
    
    // 免费配额
    this.freeRemaining = this._getField(this.data, 'freeRemaining', 0, 'number');
    this.freeDailyQuota = this._getField(this.data, 'freeDailyQuota', 0, 'number');
    this.freeUsedToday = this._getField(this.data, 'freeUsedToday', 0, 'number');
    
    // 付费配额
    this.paidRemaining = this._getField(this.data, 'paidRemaining', 0, 'number');
    
    // 总配额
    this.totalRemaining = this._getField(this.data, 'totalRemaining', 0, 'number');
    
    // 验证数据
    this._validate();
  }
  
  /**
   * 验证数据完整性
   */
  _validate() {
    // 验证必需字段
    this._validateRequiredField('functionCode', this.functionCode);
    
    // 验证数据类型
    this._validateFieldType('canUse', this.canUse, 'boolean');
    this._validateFieldType('freeRemaining', this.freeRemaining, 'number');
    this._validateFieldType('paidRemaining', this.paidRemaining, 'number');
    this._validateFieldType('totalRemaining', this.totalRemaining, 'number');
    this._validateFieldType('freeDailyQuota', this.freeDailyQuota, 'number');
    this._validateFieldType('freeUsedToday', this.freeUsedToday, 'number');
    
    // 验证配额值范围（-1表示无限）
    if (this.freeRemaining !== -1 && this.freeRemaining < 0) {
      this._addValidationError('freeRemaining', '免费剩余配额不能为负数');
    }
    if (this.paidRemaining !== -1 && this.paidRemaining < 0) {
      this._addValidationError('paidRemaining', '付费剩余配额不能为负数');
    }
    if (this.totalRemaining !== -1 && this.totalRemaining < 0) {
      this._addValidationError('totalRemaining', '总剩余配额不能为负数');
    }
    if (this.freeDailyQuota !== -1 && this.freeDailyQuota < 0) {
      this._addValidationError('freeDailyQuota', '每日免费配额不能为负数');
    }
    if (this.freeUsedToday < 0) {
      this._addValidationError('freeUsedToday', '今日已使用次数不能为负数');
    }
    
    // 标记为已验证
    this._isValidated = true;
  }
  
  /**
   * 检查是否可以使用
   * @returns {boolean} 是否可以使用
   */
  canUseFunction() {
    return this.canUse === true;
  }
  
  /**
   * 检查是否有免费配额
   * @returns {boolean} 是否有免费配额
   */
  hasFreeQuota() {
    return this.freeRemaining === -1 || this.freeRemaining > 0;
  }
  
  /**
   * 检查是否有付费配额
   * @returns {boolean} 是否有付费配额
   */
  hasPaidQuota() {
    return this.paidRemaining > 0;
  }
  
  /**
   * 检查是否无限配额
   * @returns {boolean} 是否无限配额
   */
  isUnlimited() {
    return this.totalRemaining === -1;
  }
  
  /**
   * 获取显示文案
   * @returns {string} 配额显示文案
   */
  getDisplayText() {
    if (this.isUnlimited()) {
      return '无限次';
    }
    
    if (this.totalRemaining === 0) {
      return '配额已用完';
    }
    
    // 显示免费和付费配额
    let text = '';
    if (this.hasFreeQuota()) {
      if (this.freeRemaining === -1) {
        text += '免费无限';
      } else {
        text += `免费${this.freeRemaining}次`;
      }
    }
    
    if (this.hasPaidQuota()) {
      if (text) {
        text += '，';
      }
      text += `付费${this.paidRemaining}次`;
    }
    
    return text || '配额已用完';
  }
  
  /**
   * 获取简短显示文案（用于按钮等）
   * @returns {string} 简短文案
   */
  getShortDisplayText() {
    if (this.isUnlimited()) {
      return '无限';
    }
    
    if (this.totalRemaining === 0) {
      return '已用完';
    }
    
    return `剩余${this.totalRemaining}次`;
  }
  
  /**
   * 获取配额不足提示文案
   * @returns {string} 提示文案
   */
  getInsufficientQuotaMessage() {
    if (this.totalRemaining === 0) {
      return '配额已用完，请购买后使用';
    }
    
    return `剩余配额不足（${this.getShortDisplayText()}），请购买后使用`;
  }
  
  /**
   * 转换为简单对象（用于调试或日志）
   * @returns {Object} 简化的配额对象
   */
  toObject() {
    return {
      functionCode: this.functionCode,
      canUse: this.canUse,
      freeRemaining: this.freeRemaining,
      paidRemaining: this.paidRemaining,
      totalRemaining: this.totalRemaining,
      freeDailyQuota: this.freeDailyQuota,
      freeUsedToday: this.freeUsedToday,
      displayText: this.getDisplayText()
    };
  }
}

module.exports = { FunctionQuotaBean };

