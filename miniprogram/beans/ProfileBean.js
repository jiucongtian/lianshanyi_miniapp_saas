/**
 * 档案数据Bean
 * 用于处理档案相关的数据格式化和验证
 */
const { BaseBean } = require('./BaseBean');

class ProfileBean extends BaseBean {
  constructor(data) {
    super(data); // 调用BaseBean构造函数
    
    // 使用BaseBean提供的_getField方法提取字段
    this._id = this._getField(this.data, '_id', '', 'string');
    this.userId = this._getField(this.data, 'userId', '', 'string');
    this.openid = this._getField(this.data, 'openid', '', 'string');
    this.profileName = this._getField(this.data, 'profileName', '', 'string');
    
    // 处理嵌套的birthDate对象
    const birthDateData = this._getField(this.data, 'birthDate', {});
    this.birthDate = {
      year: this._getField(birthDateData, 'year', 0, 'number'),
      month: this._getField(birthDateData, 'month', 0, 'number'),
      day: this._getField(birthDateData, 'day', 0, 'number'),
      hour: this._getField(birthDateData, 'hour', 0, 'number'),
      minute: this._getField(birthDateData, 'minute', 0, 'number'),
      isLunar: this._getField(birthDateData, 'isLunar', false, 'boolean')
    };
    
    // 处理嵌套的baziData对象
    const baziDataRaw = this._getField(this.data, 'baziData', {});
    this.baziData = {
      year: baziDataRaw.year || { gan: '', zhi: '', ganzhiIndex: 0 },
      month: baziDataRaw.month || { gan: '', zhi: '', ganzhiIndex: 0 },
      day: baziDataRaw.day || { gan: '', zhi: '', ganzhiIndex: 0 },
      hour: baziDataRaw.hour || { gan: '', zhi: '', ganzhiIndex: 0 },
      lunarDate: baziDataRaw.lunarDate || null
    };
    
    this.gender = this._getField(this.data, 'gender', 0, 'number');
    this.isUncertainTime = this._getField(this.data, 'isUncertainTime', false, 'boolean');
    this.description = this._getField(this.data, 'description', '', 'string');
    this.createTime = this._getField(this.data, 'createTime', null);
    this.updateTime = this._getField(this.data, 'updateTime', null);
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
    this._validateRequiredField('userId', this.userId);
    this._validateRequiredField('openid', this.openid);
    this._validateRequiredField('profileName', this.profileName);
    
    // 验证生日数据
    if (this.birthDate) {
      this._validateFieldType('birthDate.year', this.birthDate.year, 'number');
      this._validateFieldType('birthDate.month', this.birthDate.month, 'number');
      this._validateFieldType('birthDate.day', this.birthDate.day, 'number');
      this._validateFieldType('birthDate.hour', this.birthDate.hour, 'number');
    }
    
    // 验证八字数据
    if (this.baziData) {
      const pillars = ['year', 'month', 'day', 'hour'];
      pillars.forEach(pillar => {
        if (this.baziData[pillar]) {
          const pillarData = this.baziData[pillar];
          if (typeof pillarData.gan !== 'string') {
            this._addValidationError(`baziData.${pillar}.gan`, `类型错误: ${typeof pillarData.gan}`);
          }
          if (typeof pillarData.zhi !== 'string') {
            this._addValidationError(`baziData.${pillar}.zhi`, `类型错误: ${typeof pillarData.zhi}`);
          }
          if (typeof pillarData.ganzhiIndex !== 'number') {
            this._addValidationError(`baziData.${pillar}.ganzhiIndex`, `类型错误: ${typeof pillarData.ganzhiIndex}`);
          }
        }
      });
    }
    
    // 验证其他字段类型
    this._validateFieldType('gender', this.gender, 'number');
    this._validateFieldType('isUncertainTime', this.isUncertainTime, 'boolean');
    this._validateFieldType('isActive', this.isActive, 'boolean');
    
    // 标记为已验证
    this._isValidated = true;
  }
  
  /**
   * 转换为卡牌数据格式
   * @returns {Object} 卡牌数据
   */
  toCardData() {
    return {
      profileId: this._id,
      profileName: this.profileName,
      birthTime: this.formatBirthTime(),
      lunarTime: this.formatLunarTime(),
      baziData: this.baziData,
      gender: this.gender,
      genderText: this.getGenderText(),
      isUncertainTime: this.isUncertainTime,
      description: this.description,
      createTime: this.createTime,
      updateTime: this.updateTime
    };
  }

  /**
   * 转换为卡牌页面显示专用格式
   * @returns {Object} 卡牌页面显示数据
   */
  toCardDisplayData() {
    return {
      profileId: this._id,
      profileName: this.profileName,
      originalTime: this.formatBirthTime(),
      lunarTime: this.formatLunarTime(),
      isUncertainTime: this.isUncertainTime,
      baziData: this.convertBaziToCardFormat()
    };
  }

  /**
   * 将八字数据转换为卡牌显示格式
   * @returns {Object} 卡牌显示格式的八字数据
   */
  convertBaziToCardFormat() {
    if (!this.baziData) {
      return {
        yearPillar: { heavenlyStem: '', earthlyBranch: '' },
        monthPillar: { heavenlyStem: '', earthlyBranch: '' },
        dayPillar: { heavenlyStem: '', earthlyBranch: '' },
        timePillar: { heavenlyStem: '', earthlyBranch: '' }
      };
    }

    return {
      yearPillar: {
        heavenlyStem: this.baziData.year?.gan || '',
        earthlyBranch: this.baziData.year?.zhi || ''
      },
      monthPillar: {
        heavenlyStem: this.baziData.month?.gan || '',
        earthlyBranch: this.baziData.month?.zhi || ''
      },
      dayPillar: {
        heavenlyStem: this.baziData.day?.gan || '',
        earthlyBranch: this.baziData.day?.zhi || ''
      },
      timePillar: {
        heavenlyStem: this.baziData.hour?.gan || '',
        earthlyBranch: this.baziData.hour?.zhi || ''
      }
    };
  }
  
  /**
   * 格式化出生时间显示
   * @returns {string} 格式化的出生时间
   */
  formatBirthTime() {
    if (!this.birthDate || !this.birthDate.year) {
      return '未知';
    }
    
    const { year, month, day, hour, minute } = this.birthDate;
    const minuteStr = `:${minute.toString().padStart(2, '0')}`;
    const hourStr = ` ${hour.toString().padStart(2, '0')}${minuteStr}`;
    
    return `${year}年${month}月${day}日${hourStr}`;
  }
  
  /**
   * 格式化农历时间显示
   * @returns {string} 格式化的农历时间
   */
  formatLunarTime() {
    if (!this.baziData || !this.baziData.lunarDate) {
      return '';
    }
    
    const { year, month, day, isLeap } = this.baziData.lunarDate;
    const leapStr = isLeap ? '闰' : '';
    
    return `${year}年${leapStr}${month}月${day}日`;
  }
  
  /**
   * 获取性别文本
   * @returns {string} 性别文本
   */
  getGenderText() {
    switch (this.gender) {
      case 1:
        return '男';
      case 2:
        return '女';
      default:
        return '未知';
    }
  }
  
  /**
   * 获取八字字符串
   * @returns {string} 八字字符串
   */
  getBaziString() {
    if (!this.baziData) {
      return '';
    }
    
    const { year, month, day, hour } = this.baziData;
    if (!year || !month || !day || !hour) {
      return '';
    }
    
    return `${year.gan}${year.zhi} ${month.gan}${month.zhi} ${day.gan}${day.zhi} ${hour.gan}${hour.zhi}`;
  }
  
  /**
   * 获取年柱
   * @returns {string} 年柱
   */
  getYearPillar() {
    if (!this.baziData || !this.baziData.year) {
      return '';
    }
    return `${this.baziData.year.gan}${this.baziData.year.zhi}`;
  }
  
  /**
   * 获取月柱
   * @returns {string} 月柱
   */
  getMonthPillar() {
    if (!this.baziData || !this.baziData.month) {
      return '';
    }
    return `${this.baziData.month.gan}${this.baziData.month.zhi}`;
  }
  
  /**
   * 获取日柱
   * @returns {string} 日柱
   */
  getDayPillar() {
    if (!this.baziData || !this.baziData.day) {
      return '';
    }
    return `${this.baziData.day.gan}${this.baziData.day.zhi}`;
  }
  
  /**
   * 获取时柱
   * @returns {string} 时柱
   */
  getHourPillar() {
    if (!this.baziData || !this.baziData.hour) {
      return '';
    }
    return `${this.baziData.hour.gan}${this.baziData.hour.zhi}`;
  }
  
  /**
   * 检查是否有农历信息
   * @returns {boolean} 是否有农历信息
   */
  hasLunarDate() {
    return !!(this.baziData && this.baziData.lunarDate);
  }
  
  /**
   * 检查是否为农历生日
   * @returns {boolean} 是否为农历生日
   */
  isLunarBirthday() {
    return !!(this.birthDate && this.birthDate.isLunar);
  }
  
  /**
   * 获取时辰信息
   * @returns {string} 时辰信息
   */
  getTimeInfo() {
    if (this.isUncertainTime) {
      return '时辰不确定';
    }
    
    if (!this.birthDate || this.birthDate.hour === undefined) {
      return '时辰未知';
    }
    
    const hour = this.birthDate.hour;
    const minute = this.birthDate.minute || 0;
    
    // 时辰对照表
    const timeNames = [
      '子时(23-1点)', '丑时(1-3点)', '寅时(3-5点)', '卯时(5-7点)',
      '辰时(7-9点)', '巳时(9-11点)', '午时(11-13点)', '未时(13-15点)',
      '申时(15-17点)', '酉时(17-19点)', '戌时(19-21点)', '亥时(21-23点)'
    ];
    
    // 计算时辰索引
    let timeIndex = Math.floor((hour + 1) / 2);
    if (timeIndex >= 12) timeIndex = 0;
    
    return timeNames[timeIndex];
  }
  
  /**
   * 获取档案摘要信息
   * @returns {Object} 摘要信息
   */
  getSummary() {
    return {
      profileId: this._id,
      profileName: this.profileName,
      birthTime: this.formatBirthTime(),
      baziString: this.getBaziString(),
      genderText: this.getGenderText(),
      timeInfo: this.getTimeInfo(),
      createTime: this.createTime
    };
  }
  
  /**
   * 转换为完整对象（用于编辑、存储等需要完整数据的场景）
   * @returns {Object} 完整的档案对象
   */
  toObject() {
    return {
      _id: this._id,
      profileName: this.profileName,
      birthDate: this.birthDate,
      gender: this.gender,
      isUncertainTime: this.isUncertainTime,
      isActive: this.isActive,
      createTime: this.createTime,
      userId: this.userId,
      openid: this.openid,
      // 额外提供格式化后的数据，便于显示
      birthTime: this.formatBirthTime(),
      baziString: this.getBaziString()
    };
  }
  
  /**
   * 更新档案信息
   * @param {Object} updateData - 更新数据
   */
  update(updateData) {
    if (updateData.profileName !== undefined) {
      this.profileName = updateData.profileName;
    }
    if (updateData.birthDate !== undefined) {
      this.birthDate = updateData.birthDate;
    }
    if (updateData.baziData !== undefined) {
      this.baziData = updateData.baziData;
    }
    if (updateData.gender !== undefined) {
      this.gender = updateData.gender;
    }
    if (updateData.isUncertainTime !== undefined) {
      this.isUncertainTime = updateData.isUncertainTime;
    }
    if (updateData.description !== undefined) {
      this.description = updateData.description;
    }
    
    // 更新时间戳
    this.updateTime = new Date();
  }
  
  /**
   * 检查档案是否有效
   * @returns {boolean} 是否有效
   */
  isValid() {
    return this.isActive && 
           this.profileName && 
           this.birthDate && 
           this.birthDate.year && 
           this.baziData;
  }
}

module.exports = { ProfileBean };
