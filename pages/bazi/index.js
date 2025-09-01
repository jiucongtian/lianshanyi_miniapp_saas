Page({
  data: {
    deviceSize: 'medium',
    showTimePopup: false,
    yearPillar: { 
      heavenlyStem: '甲',
      earthlyBranch: '子',
      imageName: '甲子.jpg'
    },
    monthPillar: {
      heavenlyStem: '甲',
      earthlyBranch: '子',
      imageName: '甲子.jpg'
    },
    dayPillar: {
      heavenlyStem: '甲',
      earthlyBranch: '子',
      imageName: '甲子.jpg'
    },
    timePillar: {
      heavenlyStem: '甲',
      earthlyBranch: '子',
      imageName: '甲子.jpg'
    },
    originalTime: '',
    lunarTime: '',
  },

  onLoad: function(options) {
    console.log('八字页面接收到的参数:', options);
    
    this.initDeviceSize();
    this.initAnimations();
    
    // 处理传递过来的参数
    this.handleReceivedParams(options);
  },

  // 处理接收到的参数
  handleReceivedParams: function(options) {
    const { datetime, hasCozeData } = options;
    
    if (datetime) {
      const timestamp = parseInt(datetime);
      const date = new Date(timestamp);
      
      // 格式化时间显示
      const formattedTime = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
      
      // 检查是否有Coze数据
      if (hasCozeData === 'true') {
        const app = getApp();
        const baziResult = app.globalData?.baziResult;
        
        if (baziResult && baziResult.timestamp === timestamp) {
          // 如果有Coze数据，可以在这里处理和显示
          console.log('zhCoze计算结果:', baziResult.cozeData);
        }
      }
      
      // 在控制台输出详细信息
      console.log('八字页面参数详情:', {
        timestamp,
        formattedTime,
        hasCozeData,
        globalData: getApp().globalData?.baziResult
      });
    }
  },

  initDeviceSize: function() {
    wx.getSystemInfo({
      success: (res) => {
        const deviceSize = res.screenWidth < 375 ? 'small' : 
                         res.screenWidth < 414 ? 'medium' : 'large';
        this.setData({ deviceSize });
      }
    });
  },

  initAnimations: function() {
    const pillars = ['year', 'month', 'day', 'time'];
    const delay = 100; // 每个柱子的动画延迟时间（毫秒）

    pillars.forEach((pillar, index) => {
      const animation = wx.createAnimation({
        duration: 500,
        timingFunction: 'ease',
        delay: index * delay
      });

      animation.opacity(1).translateY(0).step();
      this.setData({
        [`${pillar}Animation`]: animation.export()
      });
    });
  },

  // 显示时间详情
  showTimeDetail: function() {
    this.setData({ showTimePopup: true });
  },

  // 关闭时间详情
  closeTimePopup: function() {
    this.setData({ showTimePopup: false });
  },

  // 处理弹出层状态变化
  onTimePopupChange: function(e) {
    this.setData({ showTimePopup: e.detail.visible });
  },

  // 更新八字图片
  updateBaziImages: function(data) {
    // 这里应该根据实际的天干地支组合来设置正确的图片名称
    this.setData({
      yearPillar: { 
        imageName: `${data.yearPillar.heavenlyStem}${data.yearPillar.earthlyBranch}.JPG`
      },
      monthPillar: {
        imageName: `${data.monthPillar.heavenlyStem}${data.monthPillar.earthlyBranch}.JPG`
      },
      dayPillar: {
        imageName: `${data.dayPillar.heavenlyStem}${data.dayPillar.earthlyBranch}.JPG`
      },
      timePillar: {
        imageName: `${data.timePillar.heavenlyStem}${data.timePillar.earthlyBranch}.JPG`
      },
      originalTime: data.originalTime,
      lunarTime: data.lunarTime
    });
  }
});