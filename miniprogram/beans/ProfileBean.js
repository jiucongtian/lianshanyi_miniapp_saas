/**
 * 档案数据Bean
 * 用于处理档案相关的数据格式化和验证
 */
class ProfileBean {
  constructor(data) {
    // 检查数据是否为null或undefined
    if (!data || typeof data !== 'object') {
      console.warn('[ProfileBean] 构造函数接收到无效数据:', data);
      data = {}; // 提供空对象作为默认值
    }
    
    // 提供默认值，避免程序崩溃
    this._id = data._id || '';
    this.userId = data.userId || '';
    this.openid = data.openid || '';
    this.profileName = data.profileName || '';
    this.birthDate = {
      year: data.birthDate?.year || 0,
      month: data.birthDate?.month || 0,
      day: data.birthDate?.day || 0,
      hour: data.birthDate?.hour || 0,
      minute: data.birthDate?.minute || 0,
      isLunar: data.birthDate?.isLunar || false
    };
    this.baziData = {
      year: data.baziData?.year || { gan: '', zhi: '', ganzhiIndex: 0 },
      month: data.baziData?.month || { gan: '', zhi: '', ganzhiIndex: 0 },
      day: data.baziData?.day || { gan: '', zhi: '', ganzhiIndex: 0 },
      hour: data.baziData?.hour || { gan: '', zhi: '', ganzhiIndex: 0 },
      lunarDate: data.baziData?.lunarDate || null
    };
    this.gender = data.gender || 0;
    this.isUncertainTime = data.isUncertainTime || false;
    this.description = data.description || '';
    this.createTime = data.createTime || null;
    this.updateTime = data.updateTime || null;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    
    // 验证关键字段
    this._validate(data);
  }
  
  /**
   * 验证数据完整性
   * @param {Object} data - 原始数据
   */
  _validate(data) {
    // 验证必需字段
    if (!data._id) {
      console.warn('[ProfileBean] 缺少_id字段');
    }
    
    if (!data.userId) {
      console.warn('[ProfileBean] 缺少userId字段');
    }
    
    if (!data.openid) {
      console.warn('[ProfileBean] 缺少openid字段');
    }
    
    if (!data.profileName) {
      console.warn('[ProfileBean] 缺少profileName字段');
    }
    
    if (!data.birthDate) {
      console.warn('[ProfileBean] 缺少birthDate字段');
    }
    
    if (!data.baziData) {
      console.warn('[ProfileBean] 缺少baziData字段');
    }
    
    // 验证生日数据
    if (data.birthDate) {
      const birthDate = data.birthDate;
      if (typeof birthDate.year !== 'number') {
        console.error('[ProfileBean] birthDate.year字段类型错误:', typeof birthDate.year);
      }
      if (typeof birthDate.month !== 'number') {
        console.error('[ProfileBean] birthDate.month字段类型错误:', typeof birthDate.month);
      }
      if (typeof birthDate.day !== 'number') {
        console.error('[ProfileBean] birthDate.day字段类型错误:', typeof birthDate.day);
      }
      if (typeof birthDate.hour !== 'number') {
        console.error('[ProfileBean] birthDate.hour字段类型错误:', typeof birthDate.hour);
      }
    }
    
    // 验证八字数据
    if (data.baziData) {
      const baziData = data.baziData;
      const pillars = ['year', 'month', 'day', 'hour'];
      
      pillars.forEach(pillar => {
        if (baziData[pillar]) {
          const pillarData = baziData[pillar];
          if (typeof pillarData.gan !== 'string') {
            console.error(`[ProfileBean] baziData.${pillar}.gan字段类型错误:`, typeof pillarData.gan);
          }
          if (typeof pillarData.zhi !== 'string') {
            console.error(`[ProfileBean] baziData.${pillar}.zhi字段类型错误:`, typeof pillarData.zhi);
          }
          if (typeof pillarData.ganzhiIndex !== 'number') {
            console.error(`[ProfileBean] baziData.${pillar}.ganzhiIndex字段类型错误:`, typeof pillarData.ganzhiIndex);
          }
        }
      });
    }
    
    // 验证其他字段类型
    if (typeof this.gender !== 'number') {
      console.error('[ProfileBean] gender字段类型错误:', typeof this.gender);
    }
    
    if (typeof this.isUncertainTime !== 'boolean') {
      console.error('[ProfileBean] isUncertainTime字段类型错误:', typeof this.isUncertainTime);
    }
    
    if (typeof this.isActive !== 'boolean') {
      console.error('[ProfileBean] isActive字段类型错误:', typeof this.isActive);
    }
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
   * 转换为简单对象（用于调试或日志）
   * @returns {Object} 简化的档案对象
   */
  toObject() {
    return {
      _id: this._id,
      profileName: this.profileName,
      birthTime: this.formatBirthTime(),
      baziString: this.getBaziString(),
      gender: this.gender,
      isUncertainTime: this.isUncertainTime,
      isActive: this.isActive,
      createTime: this.createTime
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
