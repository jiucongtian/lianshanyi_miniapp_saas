// 引入八字图片映射表 [[memory:7739041]]
const { getBaziImageById, getBaziImageByPinyin } = require('../../utils/baziImageMap');

Page({
  data: {
    deviceSize: 'medium',
    showTimePopup: false,
    yearPillar: { 
      heavenlyStem: '甲',
      earthlyBranch: '子',
      imagePath: ''  // 将在onReady中设置
    },
    monthPillar: {
      heavenlyStem: '乙',
      earthlyBranch: '丑',
      imagePath: ''  // 将在onReady中设置
    },
    dayPillar: {
      heavenlyStem: '丙',
      earthlyBranch: '寅',
      imagePath: ''  // 将在onReady中设置
    },
    timePillar: {
      heavenlyStem: '丁',
      earthlyBranch: '卯',
      imagePath: ''  // 将在onReady中设置
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

  onReady: function() {
    // 页面渲染完成后，根据天干地支设置正确的图片路径
    this.updateInitialImages();
  },

  // 初始化时更新图片路径
  updateInitialImages: function() {
    const { yearPillar, monthPillar, dayPillar, timePillar } = this.data;
    
    this.setData({
      'yearPillar.imagePath': this.getBaziImagePath(yearPillar.heavenlyStem, yearPillar.earthlyBranch),
      'monthPillar.imagePath': this.getBaziImagePath(monthPillar.heavenlyStem, monthPillar.earthlyBranch),
      'dayPillar.imagePath': this.getBaziImagePath(dayPillar.heavenlyStem, dayPillar.earthlyBranch),
      'timePillar.imagePath': this.getBaziImagePath(timePillar.heavenlyStem, timePillar.earthlyBranch)
    });
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

  // 根据天干地支获取对应的图片路径
  getBaziImagePath: function(heavenlyStem, earthlyBranch) {
    // 将天干地支转换为拼音
    const tianGanMap = {
      '甲': 'jia', '乙': 'yi', '丙': 'bing', '丁': 'ding', '戊': 'wu',
      '己': 'ji', '庚': 'geng', '辛': 'xin', '壬': 'ren', '癸': 'gui'
    };
    
    const diZhiMap = {
      '子': 'zi', '丑': 'chou', '寅': 'yin', '卯': 'mao', '辰': 'chen', '巳': 'si',
      '午': 'wu', '未': 'wei', '申': 'shen', '酉': 'you', '戌': 'xu', '亥': 'hai'
    };
    
    const tianGanPinyin = tianGanMap[heavenlyStem];
    const diZhiPinyin = diZhiMap[earthlyBranch];
    
    if (tianGanPinyin && diZhiPinyin) {
      const pinyin = tianGanPinyin + diZhiPinyin;
      const imageInfo = getBaziImageByPinyin(pinyin);
      return imageInfo ? imageInfo.imagePath : '/static/new_bazi/01_jiazi.png';
    }
    
    return '/static/new_bazi/01_jiazi.png'; // 默认图片
  },

  // 更新八字图片
  updateBaziImages: function(data) {
    this.setData({
      yearPillar: { 
        heavenlyStem: data.yearPillar.heavenlyStem,
        earthlyBranch: data.yearPillar.earthlyBranch,
        imagePath: this.getBaziImagePath(data.yearPillar.heavenlyStem, data.yearPillar.earthlyBranch)
      },
      monthPillar: {
        heavenlyStem: data.monthPillar.heavenlyStem,
        earthlyBranch: data.monthPillar.earthlyBranch,
        imagePath: this.getBaziImagePath(data.monthPillar.heavenlyStem, data.monthPillar.earthlyBranch)
      },
      dayPillar: {
        heavenlyStem: data.dayPillar.heavenlyStem,
        earthlyBranch: data.dayPillar.earthlyBranch,
        imagePath: this.getBaziImagePath(data.dayPillar.heavenlyStem, data.dayPillar.earthlyBranch)
      },
      timePillar: {
        heavenlyStem: data.timePillar.heavenlyStem,
        earthlyBranch: data.timePillar.earthlyBranch,
        imagePath: this.getBaziImagePath(data.timePillar.heavenlyStem, data.timePillar.earthlyBranch)
      },
      originalTime: data.originalTime,
      lunarTime: data.lunarTime
    });
  }
});