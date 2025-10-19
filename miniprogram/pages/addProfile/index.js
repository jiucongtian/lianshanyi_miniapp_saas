import Message from 'tdesign-miniprogram/message/index';
const { AddProfileController } = require('../../controllers/AddProfileController');
const { createModuleLogger } = require('../../utils/logger/index');
const log = createModuleLogger('AddProfilePage');


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
    calendarType: 'solar', // 日历类型：solar=公历，lunar=农历，默认公历
    formatedDateTime: '', // 格式化后的时间显示
    showPicker: false,
    isUncertainTime: false, // 是否不确定时辰信息
    isLeapMonth: false, // 是否闰月（仅农历有效）
    initialDateTime: null, // 传递给time-picker的初始时间
    
    // 分别存储公历和农历时间数据
    solarDateTime: null, // 公历时间数据 {year, month, day, hour, minute}
    lunarDateTime: null, // 农历时间数据 {year, month, day, hour, minute, isLeapMonth}
    solarFormatedDateTime: '', // 公历格式化时间显示
    lunarFormatedDateTime: '', // 农历格式化时间显示
  },

  // 页面生命周期
  onLoad(options) {
    log.info('onLoad', '页面加载', { options });
    
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

  onCalendarTypeSelect(e) {
    const type = e.currentTarget.dataset.type;
    log.debug('onCalendarTypeSelect', '选择日历类型', { type });
    
    // 更新日历类型
    this.setData({
      calendarType: type
    });
    
    // 通知Controller处理日历类型切换
    if (this.controller) {
      this.controller.onCalendarTypeChange(type);
    }
  },

  async onSubmit(e) {
    const success = await this.controller.onSubmit();
    if (!success) {
      this.resetButtonState();
    }
  },

  // 时间选择器组件事件处理方法
  onTimePickerConfirm(e) {
    const timeData = e.detail;
    log.info('onTimePickerConfirm', '时间选择器确认', timeData);
    
    // 通知Controller处理时间确认
    if (this.controller) {
      this.controller.onTimeConfirm(timeData);
    }
  },

  onTimePickerCancel() {
    log.info('onTimePickerCancel', '取消时间选择');
    this.setData({
      showPicker: false
    });
  },

  onTimePickerUncertainToggle(e) {
    const { isUncertainTime } = e.detail;
    log.info('onTimePickerUncertainToggle', '切换不确定时辰状态:', isUncertainTime);
    
    // 通知Controller处理不确定时辰状态切换
    if (this.controller) {
      this.controller.onUncertainTimeToggle();
    }
  },

  onLeapMonthToggle(e) {
    const { isLeapMonth } = e.detail;
    log.info('onLeapMonthToggle', '切换闰月状态:', isLeapMonth);
    
    // 更新页面的闰月状态
    this.setData({
      isLeapMonth: isLeapMonth
    });
    
    // 通知Controller处理闰月状态切换
    if (this.controller) {
      this.controller.onLeapMonthToggle(isLeapMonth);
    }
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

  onSolarInputTap() {
    log.debug('onSolarInputTap', '点击公历输入框，打开选择器');
    
    // 获取公历时间数据作为初始值
    let initialDateTime = null;
    
    if (this.data.solarDateTime) {
      // 使用已有的公历时间
      initialDateTime = this.data.solarDateTime;
    } else if (this.data.birthDate) {
      // 使用birthDate（通常是公历时间）
      initialDateTime = this.data.birthDate;
    }
    
    // 如果没有时间数据，使用当前系统时间
    if (!initialDateTime) {
      const now = new Date();
      initialDateTime = {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: now.getDate(),
        hour: now.getHours(),
        minute: now.getMinutes()
      };
    }
    
    log.debug('onSolarInputTap', '设置公历初始时间:', initialDateTime);
    
    this.setData({
      showPicker: true,
      calendarType: 'solar',
      initialDateTime: initialDateTime
    });
  },

  onLunarInputTap() {
    log.debug('onLunarInputTap', '点击农历输入框，打开选择器');
    
    // 获取农历时间数据作为初始值
    let initialDateTime = null;
    let isLeapMonth = false;
    
    if (this.data.lunarDateTime) {
      // 使用已有的农历时间
      initialDateTime = this.data.lunarDateTime;
      isLeapMonth = this.data.lunarDateTime.isLeapMonth || false;
    } else if (this.data.birthDate) {
      // 使用birthDate
      initialDateTime = this.data.birthDate;
      isLeapMonth = this.data.birthDate.isLeapMonth || false;
    }
    
    // 如果没有时间数据，使用当前系统时间
    if (!initialDateTime) {
      const now = new Date();
      initialDateTime = {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: now.getDate(),
        hour: now.getHours(),
        minute: now.getMinutes()
      };
      isLeapMonth = false;
    }
    
    log.debug('onLunarInputTap', '设置农历初始时间:', { initialDateTime, isLeapMonth });
    
    this.setData({
      showPicker: true,
      calendarType: 'lunar',
      initialDateTime: initialDateTime,
      isLeapMonth: isLeapMonth
    });
  },



});
