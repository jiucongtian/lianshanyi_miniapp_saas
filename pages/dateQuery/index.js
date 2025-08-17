import dayjs from 'dayjs';
import Message from 'tdesign-miniprogram/message/index';

Page({
  data: {
    dateTimeValue: null, // 初始为空，让用户自己选择
    formatedDateTime: '', // 格式化后的时间显示
    showPicker: false,
    pickerValue: [0, 0, 0, 0], // 选择器当前选中的值 [年, 月, 日, 时辰]
    yearRange: [], // 年份范围
    monthRange: Array.from({length: 12}, (_, i) => i + 1), // 月份范围 1-12
    dayRange: Array.from({length: 31}, (_, i) => i + 1), // 日期范围 1-31
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
  
  onLoad() {
    // 初始化年份范围（1949-2050）
    const startYear = 1949;
    const endYear = 2050;
    const yearRange = Array.from(
      {length: endYear - startYear + 1}, 
      (_, i) => startYear + i
    );
    
    // 获取当前日期
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    const currentHour = now.getHours();
    
    // 计算当前时辰
    let timeIndex = 0;
    for (let i = 0; i < this.data.timeMap.length; i++) {
      const time = this.data.timeMap[i];
      if (time.name === '子时') {
        if (currentHour >= 23 || currentHour < 1) {
          timeIndex = i;
          break;
        }
      } else if (currentHour >= time.start && currentHour < time.end) {
        timeIndex = i;
        break;
      }
    }
    
    // 设置初始值
    this.setData({
      yearRange,
      pickerValue: [
        yearRange.indexOf(currentYear),
        currentMonth - 1,
        currentDay - 1,
        timeIndex
      ]
    });
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  },

  // 点击时间输入框
  onInputTap() {
    console.log('点击输入框，打开选择器');
    this.setData({
      showPicker: true
    });
  },

  // picker-view 值变化事件
  onPickerChange(e) {
    const { value } = e.detail;
    this.setData({
      pickerValue: value
    });
  },

  // 确认选择
  onPickerConfirm() {
    const { pickerValue, yearRange, monthRange, dayRange, timeMap } = this.data;
    const [yearIndex, monthIndex, dayIndex, timeIndex] = pickerValue;
    
    const year = yearRange[yearIndex];
    const month = monthRange[monthIndex];
    const day = dayRange[dayIndex];
    const timeInfo = timeMap[timeIndex];
    
    const formatedTime = `${year}年${month}月${day}日 ${timeInfo.name}（${timeInfo.range}）`;
    
    // 构建日期对象（使用时辰的开始时间）
    const baseHour = timeInfo.start;
    const dateStr = `${year}-${month}-${day} ${baseHour}:00:00`;
    const dateTimeValue = new Date(dateStr).getTime();
    
    this.setData({
      dateTimeValue,
      formatedDateTime: formatedTime,
      showPicker: false
    });

    console.log('确认选择时间:', formatedTime);
    
    // 显示选择成功提示
    Message.success({
      context: this,
      offset: [120, 32],
      duration: 2000,
      content: `已选择：${formatedTime}`,
    });
  },

  // 取消选择
  onPickerCancel() {
    console.log('取消选择');
    this.setData({
      showPicker: false
    });
  },

  // 选择器关闭
  onPickerClose({ detail }) {
    console.log('选择器关闭事件:', detail);
    const { trigger } = detail;
    if (trigger === 'overlay') {
      this.setData({
        showPicker: false
      });
    }
  },

  // 查询数据
  onQueryData() {
    if (!this.data.dateTimeValue) {
      Message.warning({
        context: this,
        offset: [120, 32],
        duration: 3000,
        content: '请先选择查询时间',
      });
      return;
    }

    // 显示加载状态
    wx.showLoading({
      title: '计算中...',
      mask: true
    });

    // 跳转到八字页面
    setTimeout(() => {
      wx.hideLoading();
      
      // 确保日期格式正确
      const dateStr = dayjs(this.data.dateTimeValue).format('YYYY-MM-DD HH:mm:ss');
      const timestamp = new Date(dateStr).getTime();
      
      wx.navigateTo({
        url: `/pages/bazi/index?datetime=${timestamp}`,
        success: () => {
          console.log('跳转到八字页面成功，时间戳：', timestamp);
        },
        fail: (error) => {
          console.error('跳转失败:', error);
          Message.error({
            context: this,
            offset: [120, 32],
            duration: 3000,
            content: '页面跳转失败，请重试',
          });
        }
      });
    }, 500);
  },
});
