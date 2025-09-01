import dayjs from 'dayjs';
import Message from 'tdesign-miniprogram/message/index';
const { calculateBazi } = require('../../api/coze');

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
  
  // 根据小时计算对应的时辰索引
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

  // 根据年月日时辰计算选择器值数组
  calculatePickerValue(year, month, day, timeIndex) {
    return [
      this.data.yearRange.indexOf(year),
      month - 1,
      day - 1,
      timeIndex
    ];
  },

  // 从日期对象获取选择器值
  getPickerValueFromDate(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const timeIndex = this.calculateTimeIndex(hour);
    
    return this.calculatePickerValue(year, month, day, timeIndex);
  },

  onLoad() {
    // 初始化年份范围（1949-2050）
    const startYear = 1949;
    const endYear = 2050;
    const yearRange = Array.from(
      {length: endYear - startYear + 1}, 
      (_, i) => startYear + i
    );
    
    // 获取当前时间的选择器值
    const now = new Date();
    const initialPickerValue = this.getPickerValueFromDate(now);
    
    this.setData({
      yearRange,
      pickerValue: initialPickerValue,
      // 不设置 dateTimeValue 和 formatedDateTime，保持输入框为空
    });

    console.log('页面初始化，选择器默认定位到当前时间，但输入框保持空白');
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  },

  // 点击时间输入框
  onInputTap() {
    console.log('点击输入框，打开选择器');
    
    let targetPickerValue;
    
    // 如果用户已经选择了时间，使用用户选择的时间作为默认值
    if (this.data.dateTimeValue) {
      console.log('用户已选择时间，使用用户选择的时间作为默认值');
      const selectedDate = new Date(this.data.dateTimeValue);
      targetPickerValue = this.getPickerValueFromDate(selectedDate);
      
      console.log('使用用户已选择的时间:', {
        date: selectedDate.toLocaleString(),
        pickerValue: targetPickerValue
      });
      
    } else {
      console.log('用户未选择时间，使用当前系统时间作为默认值');
      const now = new Date();
      targetPickerValue = this.getPickerValueFromDate(now);
      
      console.log('使用当前系统时间:', {
        date: now.toLocaleString(),
        pickerValue: targetPickerValue
      });
    }
    
    this.setData({
      pickerValue: targetPickerValue,
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

  // 验证日期是否有效
  validateDate(year, month, day) {
    // 创建日期对象来验证
    const testDate = new Date(year, month - 1, day);
    
    // 检查日期是否有效（如果无效，Date会自动调整）
    const isValid = testDate.getFullYear() === year && 
                   testDate.getMonth() === month - 1 && 
                   testDate.getDate() === day;
    
    return isValid;
  },

  // 确认选择
  onPickerConfirm() {
    const { pickerValue, yearRange, monthRange, dayRange, timeMap } = this.data;
    const [yearIndex, monthIndex, dayIndex, timeIndex] = pickerValue;
    
    const year = yearRange[yearIndex];
    const month = monthRange[monthIndex];
    const day = dayRange[dayIndex];
    const timeInfo = timeMap[timeIndex];
    
    // 验证日期有效性
    if (!this.validateDate(year, month, day)) {
      console.log('日期无效:', { year, month, day });
      
      // 显示错误提示，但不关闭选择器
      Message.error({
        context: this,
        offset: [120, 32],
        duration: 3000,
        content: `日期选择错误：${month}月${day}日不存在，请重新选择`,
      });
      
      return; // 不关闭选择器，让用户重新选择
    }
    
    const formatedTime = `${year}年${month}月${day}日 ${timeInfo.name}`;
    
    // 构建日期对象（使用时辰的开始时间）
    const baseHour = timeInfo.start;
    // 确保月份和日期是两位数格式
    const formattedMonth = month.toString().padStart(2, '0');
    const formattedDay = day.toString().padStart(2, '0');
    const formattedHour = baseHour.toString().padStart(2, '0');
    
    const dateStr = `${year}-${formattedMonth}-${formattedDay} ${formattedHour}:00:00`;
    console.log('构建的日期字符串:', dateStr);
    
    const dateTimeValue = new Date(dateStr).getTime();
    console.log('构建的时间戳:', dateTimeValue);
    
    // 日期有效，保存并关闭选择器
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
  async onQueryData() {
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
      title: '正在计算生辰八字...',
      mask: true
    });

    try {
      // 确保日期格式正确
      const dateStr = dayjs(this.data.dateTimeValue).format('YYYY-MM-DD HH:mm:ss');
      const timestamp = new Date(dateStr).getTime();
      
      console.log('开始调用Coze API计算生辰八字，时间戳：', timestamp);
      
      // 调用Coze API获取生辰八字数据
      const result = await calculateBazi(timestamp);
      
      if (result.success) {
        console.log('Coze API调用成功，结果：', result);
        
        // API调用成功，跳转到八字页面并传递结果
        wx.hideLoading();
        
        // 将结果存储到全局数据中，供八字页面使用
        const app = getApp();
        app.globalData = app.globalData || {};
        app.globalData.baziResult = {
          timestamp: timestamp,
          cozeData: result.data,
          parameters: result.parameters,
          calculatedAt: new Date().getTime()
        };
        
        wx.navigateTo({
          url: `/pages/bazi/index?datetime=${timestamp}&hasCozeData=true`,
          success: () => {
            console.log('跳转到八字页面成功，已传递Coze数据');
            Message.success({
              context: this,
              offset: [120, 32],
              duration: 2000,
              content: '计算完成',
            });
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
        
      } else {
        // API调用失败，显示错误信息但仍然可以跳转（使用本地计算）
        console.error('Coze API调用失败:', result.error);
        
        wx.hideLoading();
        
        Message.warning({
          context: this,
          offset: [120, 32],
          duration: 3000,
          content: `网络计算失败，将使用本地算法：${result.error}`,
        });
        
        // 延迟跳转，让用户看到提示信息
        setTimeout(() => {
          const timestamp = new Date(dateStr).getTime();
          wx.navigateTo({
            url: `/pages/bazi/index?datetime=${timestamp}&hasCozeData=false`,
            success: () => {
              console.log('跳转到八字页面成功，使用本地计算');
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
        }, 1500);
      }
      
    } catch (error) {
      console.error('查询数据过程中出现错误:', error);
      wx.hideLoading();
      
      Message.error({
        context: this,
        offset: [120, 32],
        duration: 3000,
        content: '计算过程中出现错误，请重试',
      });
    }
  },
});
