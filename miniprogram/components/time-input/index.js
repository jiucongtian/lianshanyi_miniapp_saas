/**
 * 时间输入框组件
 * 用于显示和选择时间（公历/农历）
 */
const { createModuleLogger } = require('../../utils/logger/index');
const log = createModuleLogger('TimeInput');

Component({
  /**
   * 组件属性
   */
  properties: {
    // 日历类型：solar=公历，lunar=农历
    calendarType: {
      type: String,
      value: 'solar'
    },
    
    // 公历格式化时间显示
    solarFormatedDateTime: {
      type: String,
      value: ''
    },
    
    // 农历格式化时间显示
    lunarFormatedDateTime: {
      type: String,
      value: ''
    },
    
    // 是否显示标签
    showLabel: {
      type: Boolean,
      value: true
    },
    
    // 自定义标签文本（为空时根据日历类型自动显示）
    labelText: {
      type: String,
      value: ''
    },
    
    // 自定义占位符（为空时根据日历类型自动显示）
    placeholder: {
      type: String,
      value: ''
    }
  },

  /**
   * 组件数据
   */
  data: {
    // 组件内部不需要额外的data
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      log.debug('attached', '时间输入框组件加载', {
        calendarType: this.data.calendarType,
        solarFormatedDateTime: this.data.solarFormatedDateTime,
        lunarFormatedDateTime: this.data.lunarFormatedDateTime
      });
    },
    
    detached() {
      log.debug('detached', '时间输入框组件卸载');
    }
  },

  /**
   * 组件方法
   */
  methods: {
    /**
     * 处理输入框点击
     */
    onInputTap() {
      log.debug('onInputTap', '时间输入框被点击');
      
      // 触发tap事件，通知父组件
      this.triggerEvent('tap', {
        calendarType: this.data.calendarType
      });
    },
    
    /**
     * 获取当前显示的时间文本
     * @returns {string} 当前显示的时间
     */
    getCurrentTimeText() {
      return this.data.calendarType === 'solar' 
        ? this.data.solarFormatedDateTime 
        : this.data.lunarFormatedDateTime;
    },
    
    /**
     * 获取标签文本
     * @returns {string} 标签文本
     */
    getLabelText() {
      if (this.data.labelText) {
        return this.data.labelText;
      }
      return this.data.calendarType === 'solar' ? '公历时间' : '农历时间';
    },
    
    /**
     * 获取占位符文本
     * @returns {string} 占位符文本
     */
    getPlaceholder() {
      if (this.data.placeholder) {
        return this.data.placeholder;
      }
      return this.data.calendarType === 'solar' 
        ? '请选择年月日时' 
        : '请选择农历年月日时';
    }
  }
});

