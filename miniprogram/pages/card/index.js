// 引入八字图片映射表
const { getBaziImageById, getBaziImageByPinyin } = require('../../utils/baziImageMap');
const { formatBirthTime, formatLunarTime } = require('../../utils/util');
const { imageCacheManager } = require('../../utils/imageCache');

Page({
  data: {
    deviceSize: 'medium',
    showTimePopup: false,
    isDataLoaded: false, // 标记数据是否已加载
    isLoading: true, // 标记是否正在加载
    isLoadingImages: false, // 标记图片是否正在加载
    currentProfileName: '生命智慧卡牌', // 当前档案名称，默认为生命智慧卡牌
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
    
    // 立即清空图片数据，避免显示之前的图片
    this.clearImageData();
    
    // 处理传递过来的参数
    this.handleReceivedParams(options);
  },

  onReady: function() {
    // 页面渲染完成，等待onShow中的数据加载逻辑
    console.log('卡牌页面渲染完成');
  },

  onShow: function() {
    console.log('卡牌页面 onShow 触发');
    
    // 立即清空图片数据，避免显示之前的图片
    this.clearImageData();
    
    // 重置加载状态
    this.setData({
      isLoading: true,
      isDataLoaded: false
    });
    
    const app = getApp();
    
    // 优先检查是否有当前档案数据
    const currentProfileData = app.getCurrentProfile();
    if (currentProfileData) {
      console.log('onShow: 找到当前档案数据，转换为全局卡牌数据:', currentProfileData._id);
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
      
      // 没有数据，显示无数据状态
      this.showNoDataState();
    }
  },



  // 从档案数据加载卡牌显示
  loadProfileData: function(profileData) {
    console.log('loadProfileData 开始执行，profileData:', profileData);
    
    try {
      // 将档案数据转换为全局卡牌数据格式
      const { convertProfileToCardData } = require('../../utils/util');
      const cardData = convertProfileToCardData(profileData);
      
      // 更新全局卡牌数据
      const app = getApp();
      app.globalData.cardData = cardData;
      
      // 统一使用全局卡牌数据加载
      this.loadCardDataFromGlobal(cardData);
      
      console.log('从档案数据转换为全局卡牌数据并加载成功');
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
        currentProfileName: cardData.profileName || '生命智慧卡牌', // 更新档案名称
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

  // 清空图片数据
  clearImageData: function() {
    console.log('清空图片数据');
    this.setData({
      yearPillar: { heavenlyStem: '', earthlyBranch: '', imagePath: '' },
      monthPillar: { heavenlyStem: '', earthlyBranch: '', imagePath: '' },
      dayPillar: { heavenlyStem: '', earthlyBranch: '', imagePath: '' },
      timePillar: { heavenlyStem: '', earthlyBranch: '', imagePath: '' },
      originalTime: '',
      lunarTime: '',
      isLoadingImages: true
    });
  },

  // 更新八字显示
  updateBaziDisplay: async function(baziData) {
    console.log('开始更新八字显示，数据:', baziData);
    
    if (baziData && baziData.yearPillar && baziData.monthPillar && baziData.dayPillar && baziData.timePillar) {
      // 先清空图片数据，再开始加载
      this.clearImageData();
      
      try {
        // 生成图片路径信息（包含云存储路径和文件名）
        const yearImageInfo = this.getBaziImageInfo(baziData.yearPillar.heavenlyStem, baziData.yearPillar.earthlyBranch);
        const monthImageInfo = this.getBaziImageInfo(baziData.monthPillar.heavenlyStem, baziData.monthPillar.earthlyBranch);
        const dayImageInfo = this.getBaziImageInfo(baziData.dayPillar.heavenlyStem, baziData.dayPillar.earthlyBranch);
        const timeImageInfo = this.getBaziImageInfo(baziData.timePillar.heavenlyStem, baziData.timePillar.earthlyBranch);
        
        // 使用缓存管理器获取图片路径（优先使用本地缓存）
        const [yearPath, monthPath, dayPath, timePath] = await Promise.all([
          imageCacheManager.getImagePath(yearImageInfo.cloudPath, yearImageInfo.fileName),
          imageCacheManager.getImagePath(monthImageInfo.cloudPath, monthImageInfo.fileName),
          imageCacheManager.getImagePath(dayImageInfo.cloudPath, dayImageInfo.fileName),
          imageCacheManager.getImagePath(timeImageInfo.cloudPath, timeImageInfo.fileName)
        ]);
        
        console.log('图片路径获取完成（优先使用缓存）:', {
          year: yearPath,
          month: monthPath,
          day: dayPath,
          time: timePath
        });
        
        this.setData({
          yearPillar: {
            heavenlyStem: baziData.yearPillar.heavenlyStem,
            earthlyBranch: baziData.yearPillar.earthlyBranch,
            imagePath: yearPath
          },
          monthPillar: {
            heavenlyStem: baziData.monthPillar.heavenlyStem,
            earthlyBranch: baziData.monthPillar.earthlyBranch,
            imagePath: monthPath
          },
          dayPillar: {
            heavenlyStem: baziData.dayPillar.heavenlyStem,
            earthlyBranch: baziData.dayPillar.earthlyBranch,
            imagePath: dayPath
          },
          timePillar: {
            heavenlyStem: baziData.timePillar.heavenlyStem,
            earthlyBranch: baziData.timePillar.earthlyBranch,
            imagePath: timePath
          },
          originalTime: baziData.originalTime || '',
          lunarTime: baziData.lunarTime || '',
          isLoadingImages: false
        });
        
        console.log('八字显示已更新，当前数据:', this.data);
      } catch (error) {
        console.error('加载图片失败，使用云存储路径:', error);
        
        // 如果缓存加载失败，直接使用云存储路径
        const yearImagePath = this.getBaziImagePath(baziData.yearPillar.heavenlyStem, baziData.yearPillar.earthlyBranch);
        const monthImagePath = this.getBaziImagePath(baziData.monthPillar.heavenlyStem, baziData.monthPillar.earthlyBranch);
        const dayImagePath = this.getBaziImagePath(baziData.dayPillar.heavenlyStem, baziData.dayPillar.earthlyBranch);
        const timeImagePath = this.getBaziImagePath(baziData.timePillar.heavenlyStem, baziData.timePillar.earthlyBranch);
        
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
          lunarTime: baziData.lunarTime || '',
          isLoadingImages: false
        });
      }
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
      currentProfileName: '生命智慧卡牌', // 保持默认档案名称
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

  // 根据天干地支获取对应的图片信息
  getBaziImageInfo: function(heavenlyStem, earthlyBranch) {
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
      
      if (imageInfo) {
        return {
          cloudPath: imageInfo.imagePath,
          fileName: imageInfo.fileName
        };
      }
    }
    
    // 默认返回第一张图片
    const defaultImage = getBaziImageById(1);
    return {
      cloudPath: defaultImage.imagePath,
      fileName: defaultImage.fileName
    };
  },

  // 根据天干地支获取对应的图片路径（兼容旧代码）
  getBaziImagePath: function(heavenlyStem, earthlyBranch) {
    const imageInfo = this.getBaziImageInfo(heavenlyStem, earthlyBranch);
    return imageInfo.cloudPath;
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


  // 图片加载成功
  onImageLoad: function(e) {
    const pillar = e.currentTarget.dataset.pillar;
    console.log(`${pillar} 卡牌图片加载成功`);
  },

  // 图片加载失败
  onImageError: function(e) {
    console.error('图片加载失败:', e);
    const pillar = e.currentTarget.dataset.pillar;
    
    if (pillar) {
      const pillarData = this.data[`${pillar}Pillar`];
      console.log(`${pillar} 卡牌图片加载失败:`, pillarData.imagePath);
      
      wx.showToast({
        title: '图片加载失败',
        icon: 'none',
        duration: 2000
      });
    } else {
      wx.showToast({
        title: '图片加载失败',
        icon: 'none'
      });
    }
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
