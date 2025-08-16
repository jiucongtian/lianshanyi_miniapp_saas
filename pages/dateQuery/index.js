import dayjs from 'dayjs';
import Message from 'tdesign-miniprogram/message/index';

Page({
  data: {
    dateTimeValue: null, // 初始为空，让用户自己选择
    tempDateTimeValue: new Date().getTime(), // 临时值，用于选择器
    formatedDateTime: '', // 格式化后的时间显示
    showPicker: false,
    startTime: new Date('1970-01-01 00:00:00').getTime(), // 1970年1月1日开始
    endTime: new Date().getTime(), // 当前时间结束
  },
  
  onLoad() {
    // 页面加载时的逻辑
    const currentYear = new Date().getFullYear();
    const endTime = new Date(`${currentYear}-12-31 23:59:59`).getTime();
    
    this.setData({
      endTime: endTime
    });
    
    console.log('时间查询页面加载');
    console.log('时间选择范围:', {
      start: '1970-01-01 00:00:00',
      end: `${currentYear}-12-31 23:59:59`
    });
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  },

  // 点击时间输入框
  onInputTap() {
    this.setData({
      showPicker: true,
      tempDateTimeValue: this.data.dateTimeValue || new Date().getTime()
    });
  },

  // 时间选择器值变化（确认选择时触发）
  onDateTimeChange(e) {
    const selectedTime = e.detail.value;
    const formatedTime = dayjs(selectedTime).format('YYYY-MM-DD HH:mm');
    
    this.setData({
      dateTimeValue: selectedTime,
      tempDateTimeValue: selectedTime,
      formatedDateTime: formatedTime,
      showPicker: false
    });

    console.log('确认选择时间:', formatedTime);
    
    // 显示选择成功提示
    Message.success({
      context: this,
      offset: [120, 32],
      duration: 2000,
      content: `已选择时间：${formatedTime}`,
    });
  },

  // 取消选择
  onPickerCancel() {
    this.setData({
      showPicker: false
    });
    console.log('取消选择时间');
  },

  // 选择器关闭
  onPickerClose(e) {
    this.setData({
      showPicker: false
    });
    console.log('选择器关闭:', e.detail);
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

    const selectedDateTime = dayjs(this.data.dateTimeValue).format('YYYY-MM-DD HH:mm');
    
    // 显示加载状态
    wx.showLoading({
      title: '查询中...',
      mask: true
    });

    // 模拟查询过程
    setTimeout(() => {
      wx.hideLoading();
      
      Message.success({
        context: this,
        offset: [120, 32],
        duration: 4000,
        content: `查询完成！时间：${selectedDateTime}`,
      });
      
      console.log("执行查询操作，选中的日期时间：", selectedDateTime);
      
      // 这里可以添加实际的查询逻辑
      // 比如调用API、跳转到结果页面等
    }, 1500);
  },
});
