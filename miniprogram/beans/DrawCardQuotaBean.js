/**
 * 抽卡配额数据Bean
 * 用于处理抽卡配额相关的数据格式化和验证
 */
const { BaseBean } = require('./BaseBean');

class DrawCardQuotaBean extends BaseBean {
  constructor(data) {
    super(data); // 调用BaseBean构造函数
    
    // 使用BaseBean提供的_getField方法提取字段
    this.canDraw = this._getField(this.data, 'canDraw', false, 'boolean');
    this.userTypeCode = this._getField(this.data, 'userTypeCode', 'guest', 'string');
    this.remainingQuota = this._getField(this.data, 'remainingQuota', 0, 'number');
    this.totalQuota = this._getField(this.data, 'totalQuota', 0, 'number');
    this.usedToday = this._getField(this.data, 'usedToday', 0, 'number');
    
    // 验证数据
    this._validate();
  }
  
  /**
   * 验证数据完整性
   */
  _validate() {
    // 验证必需字段
    this._validateFieldType('canDraw', this.canDraw, 'boolean');
    this._validateFieldType('remainingQuota', this.remainingQuota, 'number');
    this._validateFieldType('totalQuota', this.totalQuota, 'number');
    this._validateFieldType('usedToday', this.usedToday, 'number');
    
    // 验证用户类型
    const validUserTypes = ['guest', 'normal', 'premium'];
    if (!validUserTypes.includes(this.userTypeCode)) {
      this._addValidationError('userTypeCode', `无效的用户类型: ${this.userTypeCode}`);
    }
    
    // 验证配额值的合理性
    if (this.totalQuota !== -1 && this.totalQuota < 0) {
      this._addValidationError('totalQuota', `总配额不能为负数（-1表示无限）: ${this.totalQuota}`);
    }
    
    if (this.remainingQuota !== -1 && this.remainingQuota < 0) {
      this._addValidationError('remainingQuota', `剩余配额不能为负数（-1表示无限）: ${this.remainingQuota}`);
    }
    
    if (this.usedToday < 0) {
      this._addValidationError('usedToday', `已使用次数不能为负数: ${this.usedToday}`);
    }
    
    // 验证配额逻辑
    if (this.totalQuota !== -1 && this.remainingQuota !== -1) {
      const calculatedRemaining = this.totalQuota - this.usedToday;
      if (this.remainingQuota !== Math.max(0, calculatedRemaining)) {
        this._warn('剩余配额计算可能不正确', {
          totalQuota: this.totalQuota,
          usedToday: this.usedToday,
          remainingQuota: this.remainingQuota,
          calculated: calculatedRemaining
        });
      }
    }
    
    // 标记为已验证
    this._isValidated = true;
  }
  
  /**
   * 是否还有剩余配额
   * @returns {boolean}
   */
  hasRemainingQuota() {
    return this.canDraw && (this.totalQuota === -1 || this.remainingQuota > 0);
  }
  
  /**
   * 是否无限配额
   * @returns {boolean}
   */
  isUnlimited() {
    return this.totalQuota === -1;
  }
  
  /**
   * 获取配额描述
   * @returns {string}
   */
  getQuotaDescription() {
    if (this.isUnlimited()) {
      return '无限次';
    }
    return `今日剩余 ${this.remainingQuota}/${this.totalQuota} 次`;
  }
  
  /**
   * 获取配额状态文本
   * @returns {string}
   */
  getQuotaStatusText() {
    if (!this.canDraw) {
      if (this.userTypeCode === 'guest') {
        return '请先注册后使用抽卡功能';
      }
      if (this.remainingQuota === 0 && this.totalQuota > 0) {
        return `今日抽卡次数已用完（${this.totalQuota}次/天），明天再来吧~`;
      }
      return '暂时无法使用抽卡功能';
    }
    
    if (this.isUnlimited()) {
      return '无限次抽卡';
    }
    
    return this.getQuotaDescription();
  }
  
  /**
   * 检查是否为guest用户
   * @returns {boolean}
   */
  isGuest() {
    return this.userTypeCode === 'guest';
  }
  
  /**
   * 检查是否为normal用户
   * @returns {boolean}
   */
  isNormal() {
    return this.userTypeCode === 'normal';
  }
  
  /**
   * 检查是否为premium用户
   * @returns {boolean}
   */
  isPremium() {
    return this.userTypeCode === 'premium';
  }
  
  /**
   * 转换为简单对象（用于调试或日志）
   * @returns {Object} 简化的配额对象
   */
  toObject() {
    return {
      canDraw: this.canDraw,
      userTypeCode: this.userTypeCode,
      remainingQuota: this.remainingQuota,
      totalQuota: this.totalQuota,
      usedToday: this.usedToday,
      isUnlimited: this.isUnlimited(),
      quotaDescription: this.getQuotaDescription()
    };
  }
}

module.exports = { DrawCardQuotaBean };

