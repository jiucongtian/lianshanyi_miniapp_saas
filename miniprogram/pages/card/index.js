// 引入八字图片映射表
const { getBaziImageById, getBaziImageByPinyin } = require('../../utils/baziImageMap');
const { formatBirthTime, formatLunarTime } = require('../../utils/util');

Page({
  data: {
    deviceSize: 'medium',
    showTimePopup: false,
    isDataLoaded: false, // 标记数据是否已加载
    isLoading: true, // 标记是否正在加载
    // 图片预览相关
    showImagePreview: false,
    previewImagePath: '',
    yearPillar: { 
      heavenlyStem: '',
      earthlyBranch: '',
      imagePath: ''
    },
    monthPillar: {
      heavenlyStem: '',
      earthlyBranch: '',
      imagePath: ''
    },
    dayPillar: {
      heavenlyStem: '',
      earthlyBranch: '',
      imagePath: ''
    },
    timePillar: {
      heavenlyStem: '',
      earthlyBranch: '',
      imagePath: ''
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
    // 页面渲染完成，等待onShow中的数据加载逻辑
    console.log('卡牌页面渲染完成');
  },

  onShow: function() {
    console.log('卡牌页面 onShow 触发');
    
    // 重置加载状态
    this.setData({
      isLoading: true,
      isDataLoaded: false
    });
    
    const app = getApp();
    
    // 优先检查是否有当前档案数据
    const currentProfileData = app.getCurrentProfile();
    if (currentProfileData) {
      console.log('onShow: 找到当前档案数据，直接显示:', currentProfileData._id);
      this.loadProfileData(currentProfileData);
      return;
    }
    
    // 检查全局数据中是否有临时卡牌数据（从其他页面跳转过来的）
    const cardData = app.globalData?.cardData;
    
    console.log('onShow: cardData:', cardData);
    
    if (cardData) {
      console.log('onShow: 从全局数据加载卡牌数据');
      this.loadCardDataFromGlobal(cardData);
      // 清除全局数据，避免重复使用
      app.globalData.cardData = null;
    } else {
      console.log('onShow: 没有卡牌数据，等待档案初始化或检查其他数据源');
      // 如果档案还没有初始化完成，等待一下
      if (!app.globalData.profilesLoaded) {
        console.log('onShow: 档案尚未初始化完成，等待...');
        setTimeout(() => {
          this.onShow(); // 递归调用，等待档案初始化完成
        }, 100);
        return;
      }
      
      // 最后的备选方案：检查是否有八字计算结果
      this.loadBaziFromGlobalData();
    }
  },

  // 从全局数据加载八字结果
  loadBaziFromGlobalData: function() {
    const app = getApp();
    const baziResult = app.globalData?.baziResult;
    
    console.log('全局数据:', baziResult);
    
    if (baziResult && baziResult.baziData) {
      console.log('找到标准化八字数据:', baziResult.baziData);
      
      // 直接使用标准化的八字数据
      console.log('使用标准化数据，更新显示:', baziResult.baziData);
      this.updateBaziDisplay(baziResult.baziData);
      
      // 设置数据加载完成状态
      this.setData({
        isLoading: false,
        isDataLoaded: true,
        // 重置预览状态
        showImagePreview: false,
        previewImagePath: ''
      });
    } else {
      console.log('未找到全局八字数据，显示无数据状态');
      this.showNoDataState();
    }
  },


  // 从档案数据加载卡牌显示
  loadProfileData: function(profileData) {
    console.log('loadProfileData 开始执行，profileData:', profileData);
    
    try {
      // 构建八字数据格式
      const baziData = {
        yearPillar: {
          heavenlyStem: profileData.baziData.year.gan,
          earthlyBranch: profileData.baziData.year.zhi
        },
        monthPillar: {
          heavenlyStem: profileData.baziData.month.gan,
          earthlyBranch: profileData.baziData.month.zhi
        },
        dayPillar: {
          heavenlyStem: profileData.baziData.day.gan,
          earthlyBranch: profileData.baziData.day.zhi
        },
        timePillar: {
          heavenlyStem: profileData.baziData.hour.gan,
          earthlyBranch: profileData.baziData.hour.zhi
        }
      };

      // 使用工具函数格式化时间显示
      baziData.originalTime = formatBirthTime(profileData.birthDate);
      baziData.lunarTime = profileData.baziData.lunarDate ? formatLunarTime(profileData.baziData.lunarDate) : '';

      // 更新八字显示
      this.updateBaziDisplay(baziData);
      
      // 设置数据加载完成状态
      this.setData({
        isLoading: false,
        isDataLoaded: true,
        // 重置预览状态
        showImagePreview: false,
        previewImagePath: ''
      });
      
      console.log('从档案数据加载卡牌显示成功');
    } catch (error) {
      console.error('从档案数据加载卡牌显示失败:', error);
      this.showNoDataState();
    }
  },

  // 从全局数据加载卡牌数据
  loadCardDataFromGlobal: function(cardData) {
    console.log('loadCardDataFromGlobal 开始执行，cardData:', cardData);
    
    try {
      // 更新八字显示
      this.updateBaziDisplay(cardData.baziData);
      
      // 设置数据加载完成状态
      this.setData({
        isLoading: false,
        isDataLoaded: true,
        // 重置预览状态
        showImagePreview: false,
        previewImagePath: ''
      });
      
      console.log('从全局数据加载卡牌数据成功');
    } catch (error) {
      console.error('从全局数据加载卡牌数据失败:', error);
      this.showNoDataState();
    }
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
          console.log('检测到标准化八字数据:', baziResult.baziData);
          
          // 直接使用标准化的八字数据
          if (baziResult.baziData) {
            this.updateBaziDisplay(baziResult.baziData);
          }
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

  // 更新八字显示
  updateBaziDisplay: function(baziData) {
    console.log('开始更新八字显示，数据:', baziData);
    
    if (baziData && baziData.yearPillar && baziData.monthPillar && baziData.dayPillar && baziData.timePillar) {
      // 生成图片路径
      const yearImagePath = this.getBaziImagePath(baziData.yearPillar.heavenlyStem, baziData.yearPillar.earthlyBranch);
      const monthImagePath = this.getBaziImagePath(baziData.monthPillar.heavenlyStem, baziData.monthPillar.earthlyBranch);
      const dayImagePath = this.getBaziImagePath(baziData.dayPillar.heavenlyStem, baziData.dayPillar.earthlyBranch);
      const timeImagePath = this.getBaziImagePath(baziData.timePillar.heavenlyStem, baziData.timePillar.earthlyBranch);
      
      console.log('生成的图片路径:', {
        year: yearImagePath,
        month: monthImagePath,
        day: dayImagePath,
        time: timeImagePath
      });
      
      this.setData({
        yearPillar: {
          heavenlyStem: baziData.yearPillar.heavenlyStem,
          earthlyBranch: baziData.yearPillar.earthlyBranch,
          imagePath: yearImagePath
        },
        monthPillar: {
          heavenlyStem: baziData.monthPillar.heavenlyStem,
          earthlyBranch: baziData.monthPillar.earthlyBranch,
          imagePath: monthImagePath
        },
        dayPillar: {
          heavenlyStem: baziData.dayPillar.heavenlyStem,
          earthlyBranch: baziData.dayPillar.earthlyBranch,
          imagePath: dayImagePath
        },
        timePillar: {
          heavenlyStem: baziData.timePillar.heavenlyStem,
          earthlyBranch: baziData.timePillar.earthlyBranch,
          imagePath: timeImagePath
        },
        originalTime: baziData.originalTime || '',
        lunarTime: baziData.lunarTime || ''
      });
      
      console.log('八字显示已更新，当前数据:', this.data);
    } else {
      console.log('八字数据不完整，无法更新显示');
    }
  },

  // 显示无数据状态
  showNoDataState: function() {
    console.log('显示无数据状态');
    this.setData({
      isLoading: false,
      isDataLoaded: false,
      yearPillar: { heavenlyStem: '', earthlyBranch: '', imagePath: '' },
      monthPillar: { heavenlyStem: '', earthlyBranch: '', imagePath: '' },
      dayPillar: { heavenlyStem: '', earthlyBranch: '', imagePath: '' },
      timePillar: { heavenlyStem: '', earthlyBranch: '', imagePath: '' },
      originalTime: '',
      lunarTime: ''
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
      return imageInfo ? imageInfo.imagePath : '/static/new_bazi/01_jiazi.jpeg';
    }
    
    return '/static/new_bazi/01_jiazi.jpeg'; // 默认图片
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
  },

  // 图片点击事件
  onImageTap: function(e) {
    const pillar = e.currentTarget.dataset.pillar;
    const pillarData = this.data[`${pillar}Pillar`];
    
    if (pillarData && pillarData.imagePath) {
      this.setData({
        showImagePreview: true,
        previewImagePath: pillarData.imagePath
      });
    }
  },

  // 关闭图片预览
  closeImagePreview: function() {
    this.setData({
      showImagePreview: false,
      previewImagePath: ''
    });
  },

  // 防止点击预览容器时关闭预览
  preventClose: function() {
    // 空函数，阻止事件冒泡
  },

  // 图片加载成功
  onImageLoad: function(e) {
    // 图片加载成功
  },

  // 图片加载失败
  onImageError: function(e) {
    wx.showToast({
      title: '图片加载失败',
      icon: 'none'
    });
  },

  // 分享功能 - 激活右上角分享按钮
  onShareAppMessage: function() {
    const { yearPillar, monthPillar, dayPillar, timePillar } = this.data;
    const baziText = `${yearPillar.heavenlyStem}${yearPillar.earthlyBranch} ${monthPillar.heavenlyStem}${monthPillar.earthlyBranch} ${dayPillar.heavenlyStem}${dayPillar.earthlyBranch} ${timePillar.heavenlyStem}${timePillar.earthlyBranch}`;
    
    return {
      title: '生命智慧卡牌',
      path: '/pages/addProfile/index',
      imageUrl: '', // 可以设置分享图片
    };
  },


});
