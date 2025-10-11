import Message from 'tdesign-miniprogram/message/index';
const { AddProfileController } = require('../../controllers/AddProfileController');

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
    // 时辰对照表
    timeMap: [
      { name: '子时(23-01)', range: '23:00-01:00（次日）', start: 23, end: 1 },
      { name: '丑时(01-03)', range: '01:00-03:00', start: 1, end: 3 },
      { name: '寅时(03-05)', range: '03:00-05:00', start: 3, end: 5 },
      { name: '卯时(05-07)', range: '05:00-07:00', start: 5, end: 7 },
      { name: '辰时(07-09)', range: '07:00-09:00', start: 7, end: 9 },
      { name: '巳时(09-11)', range: '09:00-11:00', start: 9, end: 11 },
      { name: '午时(11-13)', range: '11:00-13:00', start: 11, end: 13 },
      { name: '未时(13-15)', range: '13:00-15:00', start: 13, end: 15 },
      { name: '申时(15-17)', range: '15:00-17:00', start: 15, end: 17 },
      { name: '酉时(17-19)', range: '17:00-19:00', start: 17, end: 19 },
      { name: '戌时(19-21)', range: '19:00-21:00', start: 19, end: 21 },
      { name: '亥时(21-23)', range: '21:00-23:00', start: 21, end: 23 }
    ],
  },

  // 页面生命周期
  onLoad(options) {
    console.log('[addProfile] 页面加载，参数:', options);
    this.controller = new AddProfileController(this);
    this.controller.initialize(options);
  },

  onShow() {
    console.log('[addProfile] 页面显示');
    if (this.controller) {
      this.controller.onShow();
    }
  },

  onHide() {
    console.log('[addProfile] 页面隐藏');
    if (this.controller) {
      this.controller.onHide();
    }
  },

  onUnload() {
    console.log('[addProfile] 页面卸载');
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
    for (let i = 0; i < this.data.timeMap.length; i++) {
      const time = this.data.timeMap[i];
      if (time.name.includes('子时')) {
        if (hour >= 23 || hour < 1) {
          return i;
        }
      } else if (hour >= time.start && hour < time.end) {
        return i;
      }
    }
    return 0; // 默认返回子时
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
    console.log('点击输入框，打开选择器');
    
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
    const { pickerValue, yearRange, monthRange, dayRange, timeMap } = this.data;
    const [yearIndex, monthIndex, dayIndex, timeIndex] = pickerValue;
    
    const year = yearRange[yearIndex];
    const month = monthRange[monthIndex];
    const day = dayRange[dayIndex];
    const timeInfo = timeMap[timeIndex];
    
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
      hour: timeInfo.start,
      minute: 0
    };
    
    // 通知Controller处理时间确认
    if (this.controller) {
      this.controller.onTimeConfirm({
        year,
        month,
        day,
        hour: timeInfo.start,
        minute: 0,
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



  // 分享功能
  onShareAppMessage() {
    return {
      title: '生命智慧卡牌',
      path: '/pages/addProfile/index',
      imageUrl: '',
    };
  }
});
