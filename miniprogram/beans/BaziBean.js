/**
 * 八字数据Bean
 * 用于处理生辰八字相关的数据格式化和验证
 */
const { BaseBean } = require('./BaseBean');

class BaziBean extends BaseBean {
  constructor(data) {
    super(data); // 调用BaseBean构造函数
    
    // 使用BaseBean提供的_getField方法提取字段
    this.year = this._getField(this.data, 'year', {});
    this.month = this._getField(this.data, 'month', {});
    this.day = this._getField(this.data, 'day', {});
    this.hour = this._getField(this.data, 'hour', {});
    this.lunarDate = this._getField(this.data, 'lunarDate', null);
    this.parameters = this._getField(this.data, 'parameters', {});
    this.timestamp = this._getField(this.data, 'timestamp', null);
    this.rawCozeData = this._getField(this.data, 'rawCozeData', null);
    
    // 验证关键字段
    this._validate();
  }
  
  /**
   * 验证数据完整性
   */
  _validate() {
    // 验证四柱数据
    const pillars = ['year', 'month', 'day', 'hour'];
    
    pillars.forEach(pillar => {
      const pillarData = this[pillar];
      if (pillarData && Object.keys(pillarData).length > 0) {
        if (typeof pillarData.gan !== 'string') {
          this._addValidationError(`${pillar}.gan`, `类型错误: ${typeof pillarData.gan}`);
        }
        
        if (typeof pillarData.zhi !== 'string') {
          this._addValidationError(`${pillar}.zhi`, `类型错误: ${typeof pillarData.zhi}`);
        }
        
        if (typeof pillarData.ganzhiIndex !== 'number') {
          this._addValidationError(`${pillar}.ganzhiIndex`, `类型错误: ${typeof pillarData.ganzhiIndex}`);
        }
        
        // 验证天干地支的有效性
        this._validateGanZhi(pillarData.gan, pillarData.zhi, pillar);
      } else {
        this._addValidationError(pillar, `缺少${pillar}柱数据`);
      }
    });
    
    // 验证农历日期
    if (this.lunarDate) {
      this._validateFieldType('lunarDate.year', this.lunarDate.year, 'number');
      this._validateFieldType('lunarDate.month', this.lunarDate.month, 'number');
      this._validateFieldType('lunarDate.day', this.lunarDate.day, 'number');
      this._validateFieldType('lunarDate.isLeap', this.lunarDate.isLeap, 'boolean');
    }
    
    // 标记为已验证
    this._isValidated = true;
  }
  
  /**
   * 验证天干地支的有效性
   * @param {string} gan - 天干
   * @param {string} zhi - 地支
   * @param {string} pillar - 柱名
   */
  _validateGanZhi(gan, zhi, pillar) {
    const validGan = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    const validZhi = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    
    if (gan && !validGan.includes(gan)) {
      this._addValidationError(`${pillar}.gan`, `天干无效: ${gan}`);
    }
    
    if (zhi && !validZhi.includes(zhi)) {
      this._addValidationError(`${pillar}.zhi`, `地支无效: ${zhi}`);
    }
  }
  
  /**
   * 获取八字字符串
   * @returns {string} 八字字符串
   */
  getBaziString() {
    const yearStr = this.year.gan && this.year.zhi ? `${this.year.gan}${this.year.zhi}` : '';
    const monthStr = this.month.gan && this.month.zhi ? `${this.month.gan}${this.month.zhi}` : '';
    const dayStr = this.day.gan && this.day.zhi ? `${this.day.gan}${this.day.zhi}` : '';
    const hourStr = this.hour.gan && this.hour.zhi ? `${this.hour.gan}${this.hour.zhi}` : '';
    
    return `${yearStr} ${monthStr} ${dayStr} ${hourStr}`.trim();
  }
  
  /**
   * 获取年柱
   * @returns {string} 年柱
   */
  getYearPillar() {
    return this.year.gan && this.year.zhi ? `${this.year.gan}${this.year.zhi}` : '';
  }
  
  /**
   * 获取月柱
   * @returns {string} 月柱
   */
  getMonthPillar() {
    return this.month.gan && this.month.zhi ? `${this.month.gan}${this.month.zhi}` : '';
  }
  
  /**
   * 获取日柱
   * @returns {string} 日柱
   */
  getDayPillar() {
    return this.day.gan && this.day.zhi ? `${this.day.gan}${this.day.zhi}` : '';
  }
  
  /**
   * 获取时柱
   * @returns {string} 时柱
   */
  getHourPillar() {
    return this.hour.gan && this.hour.zhi ? `${this.hour.gan}${this.hour.zhi}` : '';
  }
  
  /**
   * 获取农历日期字符串
   * @returns {string} 农历日期字符串
   */
  getLunarDateString() {
    if (!this.lunarDate) {
      return '';
    }
    
    const { year, month, day, isLeap } = this.lunarDate;
    const leapStr = isLeap ? '闰' : '';
    
    return `${year}年${leapStr}${month}月${day}日`;
  }
  
  /**
   * 检查是否有农历信息
   * @returns {boolean} 是否有农历信息
   */
  hasLunarDate() {
    return !!(this.lunarDate && this.lunarDate.year);
  }
  
  /**
   * 获取天干信息
   * @returns {Object} 天干信息
   */
  getGanInfo() {
    return {
      year: this.year.gan || '',
      month: this.month.gan || '',
      day: this.day.gan || '',
      hour: this.hour.gan || ''
    };
  }
  
  /**
   * 获取地支信息
   * @returns {Object} 地支信息
   */
  getZhiInfo() {
    return {
      year: this.year.zhi || '',
      month: this.month.zhi || '',
      day: this.day.zhi || '',
      hour: this.hour.zhi || ''
    };
  }
  
  /**
   * 获取干支索引信息
   * @returns {Object} 干支索引信息
   */
  getGanzhiIndexInfo() {
    return {
      year: this.year.ganzhiIndex || 0,
      month: this.month.ganzhiIndex || 0,
      day: this.day.ganzhiIndex || 0,
      hour: this.hour.ganzhiIndex || 0
    };
  }
  
  /**
   * 检查八字数据是否完整
   * @returns {boolean} 是否完整
   */
  isComplete() {
    const pillars = ['year', 'month', 'day', 'hour'];
    
    return pillars.every(pillar => {
      const pillarData = this[pillar];
      return pillarData && 
             pillarData.gan && 
             pillarData.zhi && 
             typeof pillarData.ganzhiIndex === 'number';
    });
  }
  
  /**
   * 检查八字数据是否有效
   * @returns {boolean} 是否有效
   */
  isValid() {
    if (!this.isComplete()) {
      return false;
    }
    
    // 检查天干地支的有效性
    const validGan = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    const validZhi = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    
    const pillars = ['year', 'month', 'day', 'hour'];
    
    return pillars.every(pillar => {
      const pillarData = this[pillar];
      return validGan.includes(pillarData.gan) && validZhi.includes(pillarData.zhi);
    });
  }
  
  /**
   * 标准化八字数据
   * @returns {Object} 标准化的八字数据
   */
  standardize() {
    return {
      year: {
        gan: this.year.gan || '',
        zhi: this.year.zhi || '',
        ganzhiIndex: this.year.ganzhiIndex || 0
      },
      month: {
        gan: this.month.gan || '',
        zhi: this.month.zhi || '',
        ganzhiIndex: this.month.ganzhiIndex || 0
      },
      day: {
        gan: this.day.gan || '',
        zhi: this.day.zhi || '',
        ganzhiIndex: this.day.ganzhiIndex || 0
      },
      hour: {
        gan: this.hour.gan || '',
        zhi: this.hour.zhi || '',
        ganzhiIndex: this.hour.ganzhiIndex || 0
      },
      ...(this.lunarDate && { lunarDate: this.lunarDate })
    };
  }
  
  /**
   * 获取八字摘要信息
   * @returns {Object} 摘要信息
   */
  getSummary() {
    return {
      baziString: this.getBaziString(),
      yearPillar: this.getYearPillar(),
      monthPillar: this.getMonthPillar(),
      dayPillar: this.getDayPillar(),
      hourPillar: this.getHourPillar(),
      lunarDate: this.getLunarDateString(),
      hasLunarDate: this.hasLunarDate(),
      isComplete: this.isComplete(),
      isValid: this.isValid()
    };
  }
  
  /**
   * 转换为简单对象（用于调试或日志）
   * @returns {Object} 简化的八字对象
   */
  toObject() {
    return {
      baziString: this.getBaziString(),
      year: this.year,
      month: this.month,
      day: this.day,
      hour: this.hour,
      lunarDate: this.lunarDate,
      isComplete: this.isComplete(),
      isValid: this.isValid()
    };
  }
  
  /**
   * 更新八字数据
   * @param {Object} updateData - 更新数据
   */
  update(updateData) {
    if (updateData.year !== undefined) {
      this.year = updateData.year;
    }
    if (updateData.month !== undefined) {
      this.month = updateData.month;
    }
    if (updateData.day !== undefined) {
      this.day = updateData.day;
    }
    if (updateData.hour !== undefined) {
      this.hour = updateData.hour;
    }
    if (updateData.lunarDate !== undefined) {
      this.lunarDate = updateData.lunarDate;
    }
    if (updateData.parameters !== undefined) {
      this.parameters = updateData.parameters;
    }
    if (updateData.timestamp !== undefined) {
      this.timestamp = updateData.timestamp;
    }
    if (updateData.rawCozeData !== undefined) {
      this.rawCozeData = updateData.rawCozeData;
    }
  }
  
  /**
   * 从云函数结果创建BaziBean
   * @param {Object} cloudResult - 云函数返回结果
   * @returns {BaziBean} BaziBean实例
   */
  static fromCloudResult(cloudResult) {
    const bean = new BaziBean({});
    
    // 检查云函数调用是否成功
    if (!cloudResult || !cloudResult.result) {
      bean._warn('云函数调用失败或结果为空');
      return bean;
    }
    
    const result = cloudResult.result;
    
    // 检查云函数执行是否成功
    if (!result.success) {
      bean._warn('云函数执行失败:', result.error);
      return bean;
    }
    
    // 检查数据结构
    if (!result.data) {
      bean._warn('云函数返回数据为空');
      return bean;
    }
    
    // 检查baziData字段
    if (!result.data.baziData) {
      bean._warn('云函数返回数据中缺少baziData字段');
      return bean;
    }
    
    return new BaziBean(result.data.baziData);
  }
}

module.exports = { BaziBean };
