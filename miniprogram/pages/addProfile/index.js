import Message from 'tdesign-miniprogram/message/index';
const { AddProfileController } = require('../../controllers/AddProfileController');
const { createModuleLogger } = require('../../utils/logger/index');
const log = createModuleLogger('AddProfilePage');

// 时辰枚举常量 - 统一管理
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

Page({
  data: {
    // 页面模式：create=创建，edit=编辑
    pageMode: 'create',
    // 编辑模式下的档案ID
    editingProfileId: null,
    // 表单数据
    formData: {
      name: '', // 名称
      gender: 1, // 性别，1=男，0=女，默认男
    },
    // 表单验证
    nameError: '', // 名称错误信息
    isFormValid: false, // 表单是否有效
    
    // 时间选择相关
    dateTimeValue: null, // 初始为空，让用户自己选择
    formatedDateTime: '', // 格式化后的时间显示
    showPicker: false,
    pickerValue: [0, 0, 0, 0], // 选择器当前选中的值 [年, 月, 日, 时辰]
    yearRange: [], // 年份范围
    monthRange: Array.from({length: 12}, (_, i) => i + 1), // 月份范围 1-12
    dayRange: Array.from({length: 31}, (_, i) => i + 1), // 日期范围 1-31
    isUncertainTime: false, // 是否不确定时辰信息
  },

  // 页面生命周期
  onLoad(options) {
    log.info('onLoad', '页面加载', { options });
    
    // 初始化时辰显示列表
    this.setData({
      timeMap: this.getTimeMapStatic()
    });
    
    this.controller = new AddProfileController(this);
    this.controller.initialize(options);
  },

  onShow() {
    log.debug('onShow', '页面显示');
    if (this.controller) {
      this.controller.onShow();
    }
  },

  onHide() {
    log.debug('onHide', '页面隐藏');
    if (this.controller) {
      this.controller.onHide();
    }
  },

  onUnload() {
    log.debug('onUnload', '页面卸载');
    if (this.controller) {
      this.controller.onUnload();
    }
  },

  // 事件处理方法
  onNameChange(e) {
    this.controller.onNameChange(e.detail.value);
  },

  onNameBlur(e) {
    this.controller.onNameChange(e.detail.value);
  },

  onGenderSelect(e) {
    const gender = parseInt(e.currentTarget.dataset.gender);
    this.controller.onGenderSelect(gender);
  },

  async onSubmit(e) {
    const success = await this.controller.onSubmit();
    if (!success) {
      this.resetButtonState();
    }
  },

  // 时间选择器相关方法
  calculateTimeIndex(hour) {
    // 根据小时数直接映射到对应的时辰索引
    const timePeriods = Object.values(TIME_PERIODS);
    for (let i = 0; i < timePeriods.length; i++) {
      if (timePeriods[i].hour === hour) {
        return i;
      }
    }
    return 0; // 默认返回子时
  },

  // 获取时辰显示名称列表
  getTimeMapStatic() {
    return Object.values(TIME_PERIODS).map(period => period.name);
  },

  calculatePickerValue(year, month, day, timeIndex) {
    return [
      this.data.yearRange.indexOf(year),
      month - 1,
      day - 1,
      timeIndex
    ];
  },

  getPickerValueFromDate(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const timeIndex = this.calculateTimeIndex(hour);
    
    return this.calculatePickerValue(year, month, day, timeIndex);
  },

  // 工具方法
  resetButtonState() {
    const buttonComponent = this.selectComponent('#loading-button');
    if (buttonComponent) {
      buttonComponent.reset();
    }
  },

  // 时间选择器UI交互方法
  goBack() {
    wx.navigateBack();
  },

  onInputTap() {
    log.debug('onInputTap', '点击输入框，打开选择器');
    
    let targetPickerValue;
    
    if (this.data.dateTimeValue) {
      const selectedDate = new Date(this.data.dateTimeValue);
      targetPickerValue = this.getPickerValueFromDate(selectedDate);
    } else if (this.data.birthDate) {
      const { year, month, day, hour } = this.data.birthDate;
      const timeIndex = this.calculateTimeIndex(hour);
      targetPickerValue = this.calculatePickerValue(year, month, day, timeIndex);
    } else {
      const now = new Date();
      targetPickerValue = this.getPickerValueFromDate(now);
    }
    
    this.setData({
      pickerValue: targetPickerValue,
      showPicker: true
    });
  },

  onPickerChange(e) {
    const { value } = e.detail;
    this.setData({
      pickerValue: value
    });
  },

  validateDate(year, month, day) {
    const testDate = new Date(year, month - 1, day);
    return testDate.getFullYear() === year && 
           testDate.getMonth() === month - 1 && 
           testDate.getDate() === day;
  },

  onPickerConfirm() {
    const { pickerValue, yearRange, monthRange, dayRange } = this.data;
    const [yearIndex, monthIndex, dayIndex, timeIndex] = pickerValue;
    
    const year = yearRange[yearIndex];
    const month = monthRange[monthIndex];
    const day = dayRange[dayIndex];
    const timePeriods = Object.values(TIME_PERIODS);
    const timeInfo = timePeriods[timeIndex];
    
    if (!this.validateDate(year, month, day)) {
      Message.error({
        context: this,
        offset: [120, 32],
        duration: 3000,
        content: `日期选择错误：${month}月${day}日不存在，请重新选择`,
      });
      return;
    }
    
    const formatedTime = `${year}年${month}月${day}日 ${timeInfo.name}`;
    const birthDate = {
      year,
      month,
      day,
      hour: timeInfo.hour,
      minute: timeInfo.minute
    };
    
    // 通知Controller处理时间确认
    if (this.controller) {
      this.controller.onTimeConfirm({
        year,
        month,
        day,
        hour: timeInfo.hour,
        minute: timeInfo.minute,
        formatedTime,
        timeIndex
      });
    }
    
    this.setData({
      birthDate: birthDate,
      formatedDateTime: formatedTime,
      showPicker: false,
      isUncertainTime: this.data.isUncertainTime
    });
  },

  onPickerCancel() {
    this.setData({
      showPicker: false
    });
  },

  onPickerClose({ detail }) {
    const { trigger } = detail;
    if (trigger === 'overlay') {
      this.setData({
        showPicker: false
      });
    }
  },

  onCheckboxTap() {
    const newState = !this.data.isUncertainTime;
    this.setData({
      isUncertainTime: newState
    });
    
    // 通知Controller处理不确定时辰状态切换
    if (this.controller) {
      this.controller.onUncertainTimeToggle();
    }
  },



});
