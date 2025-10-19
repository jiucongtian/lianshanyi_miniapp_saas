/**
 * 时间选择器组件
 * 支持公历/农历时间选择，包含时辰选择功能和闰月支持
 * 
 * 功能特性：
 * - 支持公历和农历两种日历类型
 * - 农历模式下支持闰月选择
 * - 农历模式下日期范围限制为1-30日
 * - 公历模式下日期范围限制为1-31日
 * - 支持时辰选择和不确定时辰标记
 * 
 * 使用方式：
 * ```javascript
 * // 在页面JSON中注册组件
 * {
 *   "usingComponents": {
 *     "time-picker": "/components/time-picker/index"
 *   }
 * }
 * 
 * // 在WXML中使用
 * <time-picker 
 *   visible="{{showTimePicker}}"
 *   calendarType="{{calendarType}}"
 *   initialDateTime="{{initialDateTime}}"
 *   isUncertainTime="{{isUncertainTime}}"
 *   isLeapMonth="{{isLeapMonth}}"
 *   bind:confirm="onTimeConfirm"
 *   bind:cancel="onTimeCancel"
 *   bind:uncertain-time-toggle="onUncertainTimeToggle"
 *   bind:leap-month-toggle="onLeapMonthToggle"
 * />
 * ```
 * 
 * 属性说明：
 * - visible: 是否显示选择器
 * - calendarType: 日历类型，'solar'=公历，'lunar'=农历
 * - initialDateTime: 初始时间数据 {year, month, day, hour, minute, isLeapMonth}
 * - isUncertainTime: 是否不确定时辰
 * - isLeapMonth: 是否闰月（仅农历模式有效）
 * - yearRange: 年份范围 [startYear, endYear]
 * 
 * 事件说明：
 * - confirm: 确认选择，返回 {year, month, day, hour, minute, calendarType, isUncertainTime, isLeapMonth}
 * - cancel: 取消选择
 * - uncertain-time-toggle: 不确定时辰状态切换
 * - leap-month-toggle: 闰月状态切换（仅农历模式）
 */

const { createModuleLogger } = require('../../utils/logger/index');
const calendar = require('../../utils/js-calendar-converter.js');
const { formatLunarDateTime } = require('../../utils/lunarFormatter.js');
const log = createModuleLogger('TimePickerComponent');

// 时辰枚举常量
const TIME_PERIODS = {
  ZI: { name: '子时(23-01)', hour: 0, minute: 1 },
  CHOU: { name: '丑时(01-03)', hour: 2, minute: 1 },
  YIN: { name: '寅时(03-05)', hour: 4, minute: 1 },
  MAO: { name: '卯时(05-07)', hour: 6, minute: 1 },
  CHEN: { name: '辰时(07-09)', hour: 8, minute: 1 },
  SI: { name: '巳时(09-11)', hour: 10, minute: 1 },
  WU: { name: '午时(11-13)', hour: 12, minute: 1 },
  WEI: { name: '未时(13-15)', hour: 14, minute: 1 },
  SHEN: { name: '申时(15-17)', hour: 16, minute: 1 },
  YOU: { name: '酉时(17-19)', hour: 18, minute: 1 },
  XU: { name: '戌时(19-21)', hour: 20, minute: 1 },
  HAI: { name: '亥时(21-23)', hour: 22, minute: 1 }
};

// 农历月份映射（从1开始，索引0为占位）
const LUNAR_MONTHS = [
  null,
  { name: '正月', value: 1 },
  { name: '二月', value: 2 },
  { name: '三月', value: 3 },
  { name: '四月', value: 4 },
  { name: '五月', value: 5 },
  { name: '六月', value: 6 },
  { name: '七月', value: 7 },
  { name: '八月', value: 8 },
  { name: '九月', value: 9 },
  { name: '十月', value: 10 },
  { name: '冬月', value: 11 },
  { name: '腊月', value: 12 }
];

// 公历月份映射（从1开始，索引0为占位）
const SOLAR_MONTHS = [
  null,
  { name: '1月', value: 1 },
  { name: '2月', value: 2 },
  { name: '3月', value: 3 },
  { name: '4月', value: 4 },
  { name: '5月', value: 5 },
  { name: '6月', value: 6 },
  { name: '7月', value: 7 },
  { name: '8月', value: 8 },
  { name: '9月', value: 9 },
  { name: '10月', value: 10 },
  { name: '11月', value: 11 },
  { name: '12月', value: 12 }
];

// 农历日期映射（从1开始，索引0为占位）
const LUNAR_DAYS = [
  null,
  { name: '初一', value: 1 },
  { name: '初二', value: 2 },
  { name: '初三', value: 3 },
  { name: '初四', value: 4 },
  { name: '初五', value: 5 },
  { name: '初六', value: 6 },
  { name: '初七', value: 7 },
  { name: '初八', value: 8 },
  { name: '初九', value: 9 },
  { name: '初十', value: 10 },
  { name: '十一', value: 11 },
  { name: '十二', value: 12 },
  { name: '十三', value: 13 },
  { name: '十四', value: 14 },
  { name: '十五', value: 15 },
  { name: '十六', value: 16 },
  { name: '十七', value: 17 },
  { name: '十八', value: 18 },
  { name: '十九', value: 19 },
  { name: '二十', value: 20 },
  { name: '廿一', value: 21 },
  { name: '廿二', value: 22 },
  { name: '廿三', value: 23 },
  { name: '廿四', value: 24 },
  { name: '廿五', value: 25 },
  { name: '廿六', value: 26 },
  { name: '廿七', value: 27 },
  { name: '廿八', value: 28 },
  { name: '廿九', value: 29 },
  { name: '三十', value: 30 }
];

// 公历日期映射（从1开始，索引0为占位）
const SOLAR_DAYS = [
  null,
  { name: '1日', value: 1 },
  { name: '2日', value: 2 },
  { name: '3日', value: 3 },
  { name: '4日', value: 4 },
  { name: '5日', value: 5 },
  { name: '6日', value: 6 },
  { name: '7日', value: 7 },
  { name: '8日', value: 8 },
  { name: '9日', value: 9 },
  { name: '10日', value: 10 },
  { name: '11日', value: 11 },
  { name: '12日', value: 12 },
  { name: '13日', value: 13 },
  { name: '14日', value: 14 },
  { name: '15日', value: 15 },
  { name: '16日', value: 16 },
  { name: '17日', value: 17 },
  { name: '18日', value: 18 },
  { name: '19日', value: 19 },
  { name: '20日', value: 20 },
  { name: '21日', value: 21 },
  { name: '22日', value: 22 },
  { name: '23日', value: 23 },
  { name: '24日', value: 24 },
  { name: '25日', value: 25 },
  { name: '26日', value: 26 },
  { name: '27日', value: 27 },
  { name: '28日', value: 28 },
  { name: '29日', value: 29 },
  { name: '30日', value: 30 },
  { name: '31日', value: 31 }
];

Component({
  /**
   * 组件属性
   */
  properties: {
    // 是否显示选择器
    visible: {
      type: Boolean,
      value: false
    },
    // 日历类型：solar=公历，lunar=农历
    calendarType: {
      type: String,
      value: 'solar'
    },
    // 初始时间数据 {year, month, day, hour, minute, isLeapMonth}
    initialDateTime: {
      type: Object,
      value: null
    },
    // 是否不确定时辰
    isUncertainTime: {
      type: Boolean,
      value: false
    },
    // 是否闰月（仅农历模式有效）
    isLeapMonth: {
      type: Boolean,
      value: false
    },
    // 年份范围 [startYear, endYear]
    yearRange: {
      type: Array,
      value: [1949, 2100]
    }
  },

  /**
   * 组件数据
   */
  data: {
    // 选择器当前选中的值 [年, 月, 日, 时辰]
    pickerValue: [0, 0, 0, 0],
    // 年份范围数组（直接显示年份数字）
    yearRangeArray: [],
    // 月份显示名称数组（根据历法类型动态生成）
    monthMap: [],
    // 日期显示名称数组（根据历法类型动态生成）
    dayMap: [],
    // 时辰显示名称数组
    timeMap: [],
    // 内部状态
    internalUncertainTime: false,
    internalLeapMonth: false
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      log.info('attached', '时间选择器组件已挂载');
      this._initializeData();
    },

    detached() {
      log.info('detached', '时间选择器组件已卸载');
    }
  },

  /**
   * 组件方法
   */
  methods: {
    /**
     * 初始化组件数据
     * @private
     */
    _initializeData() {
      // 初始化年份范围
      const [startYear, endYear] = this.data.yearRange;
      const yearRangeArray = Array.from(
        {length: endYear - startYear + 1}, 
        (_, i) => startYear + i
      );

      // 初始化时辰显示列表
      const timeMap = Object.values(TIME_PERIODS).map(period => period.name);

      // 根据历法类型生成月份和日期显示列表
      const { monthMap, dayMap } = this._getMonthDayMaps();

      this.setData({
        yearRangeArray,
        monthMap,
        dayMap,
        timeMap,
        internalUncertainTime: this.data.isUncertainTime,
        internalLeapMonth: this.data.isLeapMonth
      });

      log.info('_initializeData', '组件数据初始化完成', {
        yearRange: yearRangeArray.slice(0, 5),
        timeMapLength: timeMap.length,
        calendarType: this.data.calendarType,
        monthMapLength: monthMap.length,
        dayMapLength: dayMap.length
      });
    },

    /**
     * 根据历法类型获取月份和日期映射数组
     * @returns {Object} { monthMap, dayMap }
     * @private
     */
    _getMonthDayMaps() {
      if (this.data.calendarType === 'lunar') {
        // 农历模式：使用农历月份和日期
        const monthMap = LUNAR_MONTHS.slice(1).map(item => item.name); // ['正月', '二月', ...]
        const dayMap = LUNAR_DAYS.slice(1, 31).map(item => item.name); // ['初一', '初二', ..., '三十'] (最多30天)
        return { monthMap, dayMap };
      } else {
        // 公历模式：使用公历月份和日期
        const monthMap = SOLAR_MONTHS.slice(1).map(item => item.name); // ['1月', '2月', ...]
        const dayMap = SOLAR_DAYS.slice(1).map(item => item.name); // ['1日', '2日', ..., '31日']
        return { monthMap, dayMap };
      }
    },

    /**
     * 根据索引获取月份数值
     * @param {number} monthIndex - 月份索引
     * @returns {number} 月份数值
     * @private
     */
    _getMonthValue(monthIndex) {
      if (this.data.calendarType === 'lunar') {
        return LUNAR_MONTHS[monthIndex + 1].value;
      } else {
        return SOLAR_MONTHS[monthIndex + 1].value;
      }
    },

    /**
     * 根据索引获取日期数值
     * @param {number} dayIndex - 日期索引
     * @returns {number} 日期数值
     * @private
     */
    _getDayValue(dayIndex) {
      if (this.data.calendarType === 'lunar') {
        return LUNAR_DAYS[dayIndex + 1].value;
      } else {
        return SOLAR_DAYS[dayIndex + 1].value;
      }
    },

    /**
     * 格式化选中的时间
     * @param {number} year - 年份
     * @param {number} month - 月份
     * @param {number} day - 日期
     * @param {string} timeName - 时辰名称
     * @returns {string} 格式化后的时间字符串
     * @private
     */
    _formatSelectedTime(year, month, day, timeName) {
      if (this.data.calendarType === 'lunar') {
        return formatLunarDateTime(year, month, day, timeName, this.data.internalLeapMonth);
      } else {
        return `${year}年${month}月${day}日 ${timeName}`;
      }
    },

    /**
     * 根据小时计算时辰索引
     * @param {number} hour - 小时
     * @returns {number} 时辰索引
     * @private
     */
    _calculateTimeIndex(hour) {
      const timePeriods = Object.values(TIME_PERIODS);
      for (let i = 0; i < timePeriods.length; i++) {
        if (timePeriods[i].hour === hour) {
          return i;
        }
      }
      return 0; // 默认返回子时
    },

    /**
     * 计算选择器值
     * @param {number} year - 年份
     * @param {number} month - 月份
     * @param {number} day - 日期
     * @param {number} timeIndex - 时辰索引
     * @returns {Array} 选择器值数组
     * @private
     */
    _calculatePickerValue(year, month, day, timeIndex) {
      const yearIndex = this.data.yearRangeArray.indexOf(year);
      
      // 年份超出范围时的处理
      if (yearIndex === -1) {
        log.warn('_calculatePickerValue', '年份超出范围，使用范围边界值', {
          year,
          yearRangeMin: this.data.yearRangeArray[0],
          yearRangeMax: this.data.yearRangeArray[this.data.yearRangeArray.length - 1]
        });
        
        // 如果年份小于最小值，使用最小值；如果大于最大值，使用最大值
        const clampedYear = year < this.data.yearRangeArray[0] ? 
          this.data.yearRangeArray[0] : 
          this.data.yearRangeArray[this.data.yearRangeArray.length - 1];
        const clampedYearIndex = this.data.yearRangeArray.indexOf(clampedYear);
        
        return [
          clampedYearIndex,
          month - 1,
          day - 1,
          timeIndex
        ];
      }
      
      return [
        yearIndex,
        month - 1,
        day - 1,
        timeIndex
      ];
    },

    /**
     * 从日期对象获取选择器值
     * @param {Date} date - 日期对象
     * @returns {Array} 选择器值数组
     * @private
     */
    _getPickerValueFromDate(date) {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const hour = date.getHours();
      const timeIndex = this._calculateTimeIndex(hour);
      
      return this._calculatePickerValue(year, month, day, timeIndex);
    },

    /**
     * 验证日期是否有效
     * @param {number} year - 年份
     * @param {number} month - 月份
     * @param {number} day - 日期
     * @returns {boolean} 是否有效
     * @private
     */
    _validateDate(year, month, day) {
      const testDate = new Date(year, month - 1, day);
      const isValid = testDate.getFullYear() === year && 
                     testDate.getMonth() === month - 1 && 
                     testDate.getDate() === day;
      
      if (!isValid) {
        log.warn('_validateDate', '日期验证失败', {
          inputYear: year,
          inputMonth: month,
          inputDay: day,
          testDateYear: testDate.getFullYear(),
          testDateMonth: testDate.getMonth() + 1,
          testDateDay: testDate.getDate()
        });
      }
      
      return isValid;
    },

    /**
     * 处理选择器值变化
     * @param {Object} e - 事件对象
     */
    onPickerChange(e) {
      const { value } = e.detail;
      this.setData({
        pickerValue: value
      });
    },

    /**
     * 处理确认选择
     */
    onConfirm() {
      const { pickerValue, yearRangeArray } = this.data;
      const [yearIndex, monthIndex, dayIndex, timeIndex] = pickerValue;
      
      // 通过索引获取实际值
      const year = yearRangeArray[yearIndex];
      const month = this._getMonthValue(monthIndex);
      const day = this._getDayValue(dayIndex);
      const timePeriods = Object.values(TIME_PERIODS);
      const timeInfo = timePeriods[timeIndex];
      
      log.info('onConfirm', '时间选择器确认', {
        pickerValue,
        yearIndex, monthIndex, dayIndex, timeIndex,
        year, month, day,
        timeInfo: timeInfo ? timeInfo.name : 'undefined'
      });
      
      // 验证日期
      if (!this._validateDate(year, month, day)) {
        wx.showToast({
          title: `${month}月${day}日不存在`,
          icon: 'error',
          duration: 2000
        });
        return;
      }
      
      // 进行历法转换
      const conversionResult = this._convertCalendar(year, month, day, timeInfo.hour, timeInfo.minute);
      
      if (!conversionResult.success) {
        wx.showToast({
          title: conversionResult.error || '时间转换失败',
          icon: 'error',
          duration: 2000
        });
        return;
      }
      
      // 构建时间数据
      const timeData = {
        year,
        month,
        day,
        hour: timeInfo.hour,
        minute: timeInfo.minute,
        formatedTime: this._formatSelectedTime(year, month, day, timeInfo.name),
        timeIndex,
        calendarType: this.data.calendarType,
        isUncertainTime: this.data.internalUncertainTime,
        isLeapMonth: this.data.calendarType === 'lunar' ? this.data.internalLeapMonth : false,
        // 添加转换后的时间数据
        solarDateTime: conversionResult.solarDateTime,
        lunarDateTime: conversionResult.lunarDateTime,
        solarFormatedDateTime: conversionResult.solarFormatedDateTime,
        lunarFormatedDateTime: conversionResult.lunarFormatedDateTime
      };
      
      // 触发确认事件
      this.triggerEvent('confirm', timeData);
      
      // 关闭选择器
      this.setData({
        visible: false
      });
    },

    /**
     * 处理取消选择
     */
    onCancel() {
      // 触发取消事件
      this.triggerEvent('cancel');
      
      // 关闭选择器
      this.setData({
        visible: false
      });
    },

    /**
     * 处理弹窗关闭
     * @param {Object} e - 事件对象
     */
    onPopupClose(e) {
      const { trigger } = e.detail;
      if (trigger === 'overlay') {
        this.onCancel();
      }
    },

    /**
     * 处理不确定时辰勾选框点击
     */
    onUncertainTimeToggle() {
      const newState = !this.data.internalUncertainTime;
      this.setData({
        internalUncertainTime: newState
      });
      
      log.info('onUncertainTimeToggle', '切换不确定时辰状态:', newState);
      
      // 触发不确定时辰切换事件
      this.triggerEvent('uncertain-time-toggle', { isUncertainTime: newState });
    },

    /**
     * 处理闰月勾选框点击
     */
    onLeapMonthToggle() {
      const newState = !this.data.internalLeapMonth;
      this.setData({
        internalLeapMonth: newState
      });
      
      log.info('onLeapMonthToggle', '切换闰月状态:', newState);
      
      // 触发闰月切换事件
      this.triggerEvent('leap-month-toggle', { isLeapMonth: newState });
    },

    /**
     * 历法转换
     * @param {number} year - 年份
     * @param {number} month - 月份
     * @param {number} day - 日期
     * @param {number} hour - 小时
     * @param {number} minute - 分钟
     * @returns {Object} 转换结果
     * @private
     */
    _convertCalendar(year, month, day, hour, minute) {
      try {
        log.info('_convertCalendar', '开始历法转换', {
          inputYear: year,
          inputMonth: month,
          inputDay: day,
          inputHour: hour,
          inputMinute: minute,
          calendarType: this.data.calendarType,
          isLeapMonth: this.data.internalLeapMonth
        });

        let solarResult, lunarResult;
        let solarDateTime, lunarDateTime;
        let solarFormatedDateTime, lunarFormatedDateTime;

        if (this.data.calendarType === 'solar') {
          // 公历转农历
          solarResult = calendar.solar2lunar(year, month, day);
          if (solarResult === -1) {
            return {
              success: false,
              error: '公历日期无效'
            };
          }

          // 构建公历时间数据
          solarDateTime = {
            year: year,
            month: month,
            day: day,
            hour: hour,
            minute: minute
          };

          // 构建农历时间数据
          lunarDateTime = {
            year: solarResult.lYear,
            month: solarResult.lMonth,
            day: solarResult.lDay,
            hour: hour,
            minute: minute,
            isLeapMonth: solarResult.isLeap || false
          };

          // 格式化显示
          solarFormatedDateTime = `${year}年${month}月${day}日 ${this._formatTime(hour, minute)}`;
          lunarFormatedDateTime = formatLunarDateTime(
            solarResult.lYear, 
            solarResult.lMonth, 
            solarResult.lDay, 
            this._formatTime(hour, minute),
            solarResult.isLeap || false
          );

        } else if (this.data.calendarType === 'lunar') {
          // 农历转公历
          lunarResult = calendar.lunar2solar(year, month, day, this.data.internalLeapMonth);
          if (lunarResult === -1) {
            return {
              success: false,
              error: '农历日期无效'
            };
          }

          // 构建农历时间数据
          lunarDateTime = {
            year: year,
            month: month,
            day: day,
            hour: hour,
            minute: minute,
            isLeapMonth: this.data.internalLeapMonth
          };

          // 构建公历时间数据
          solarDateTime = {
            year: lunarResult.cYear,
            month: lunarResult.cMonth,
            day: lunarResult.cDay,
            hour: hour,
            minute: minute
          };

          // 格式化显示
          lunarFormatedDateTime = formatLunarDateTime(
            year, 
            month, 
            day, 
            this._formatTime(hour, minute),
            this.data.internalLeapMonth
          );
          solarFormatedDateTime = `${lunarResult.cYear}年${lunarResult.cMonth}月${lunarResult.cDay}日 ${this._formatTime(hour, minute)}`;
        }

        log.info('_convertCalendar', '历法转换成功', {
          solarDateTime,
          lunarDateTime,
          solarFormatedDateTime,
          lunarFormatedDateTime
        });

        return {
          success: true,
          solarDateTime,
          lunarDateTime,
          solarFormatedDateTime,
          lunarFormatedDateTime
        };

      } catch (error) {
        log.error('_convertCalendar', '历法转换失败', error);
        return {
          success: false,
          error: '时间转换失败，请检查输入'
        };
      }
    },

    /**
     * 格式化时间显示
     * @param {number} hour - 小时
     * @param {number} minute - 分钟
     * @returns {string} 格式化后的时间字符串
     * @private
     */
    _formatTime(hour, minute) {
      const timePeriods = Object.values(TIME_PERIODS);
      for (const period of timePeriods) {
        if (period.hour === hour) {
          return period.name;
        }
      }
      return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    },

    /**
     * 准备选择器数据
     * @private
     */
    _preparePickerData() {
      let targetPickerValue;
      
      if (this.data.initialDateTime) {
        const { year, month, day, hour } = this.data.initialDateTime;
        const timeIndex = this._calculateTimeIndex(hour);
        targetPickerValue = this._calculatePickerValue(year, month, day, timeIndex);
      } else {
        // 使用当前时间作为默认值
        const now = new Date();
        targetPickerValue = this._getPickerValueFromDate(now);
      }
      
      this.setData({
        pickerValue: targetPickerValue
      });
      
      log.info('_preparePickerData', '准备选择器数据', {
        targetPickerValue,
        initialDateTime: this.data.initialDateTime
      });
    }
  },

  /**
   * 数据监听器
   */
  observers: {
    'visible': function(visible) {
      if (visible) {
        this._preparePickerData();
      }
    },
    
    'initialDateTime': function(initialDateTime) {
      if (initialDateTime && this.data.visible) {
        this._preparePickerData();
      }
    },

    'calendarType': function(calendarType) {
      // 日历类型变化时重新初始化数据
      this._initializeData();
      if (this.data.visible) {
        this._preparePickerData();
      }
    }
  }
});
