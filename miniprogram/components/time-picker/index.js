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
    // 年份范围数组
    yearRangeArray: [],
    // 月份范围数组
    monthRange: Array.from({length: 12}, (_, i) => i + 1),
    // 日期范围数组
    dayRange: Array.from({length: 31}, (_, i) => i + 1),
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

      // 根据日历类型调整日期范围
      const dayRange = this._getDayRange();

      this.setData({
        yearRangeArray,
        timeMap,
        dayRange,
        internalUncertainTime: this.data.isUncertainTime,
        internalLeapMonth: this.data.isLeapMonth
      });

      log.info('_initializeData', '组件数据初始化完成', {
        yearRange: yearRangeArray.slice(0, 5),
        timeMapLength: timeMap.length,
        calendarType: this.data.calendarType,
        dayRangeLength: dayRange.length
      });
    },

    /**
     * 获取日期范围数组
     * @returns {Array} 日期范围数组
     * @private
     */
    _getDayRange() {
      // 农历模式最大30日，公历模式最大31日
      const maxDays = this.data.calendarType === 'lunar' ? 30 : 31;
      return Array.from({length: maxDays}, (_, i) => i + 1);
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
      const { pickerValue, yearRangeArray, monthRange, dayRange } = this.data;
      const [yearIndex, monthIndex, dayIndex, timeIndex] = pickerValue;
      
      const year = yearRangeArray[yearIndex];
      const month = monthRange[monthIndex];
      const day = dayRange[dayIndex];
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
      
      // 构建时间数据
      const timeData = {
        year,
        month,
        day,
        hour: timeInfo.hour,
        minute: timeInfo.minute,
        formatedTime: `${year}年${month}月${day}日 ${timeInfo.name}`,
        timeIndex,
        calendarType: this.data.calendarType,
        isUncertainTime: this.data.internalUncertainTime,
        isLeapMonth: this.data.calendarType === 'lunar' ? this.data.internalLeapMonth : false
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
