// 引入CardController
const { CardController } = require('../../controllers/CardController');

Page({
  data: {
    isDataLoaded: false, // 标记数据是否已加载
    isLoading: true, // 标记是否正在加载
    isLoadingImages: false, // 标记图片是否正在加载
    currentProfileName: '生命智慧卡牌', // 当前档案名称，默认为生命智慧卡牌
    isUncertainTime: false, // 是否不确定时辰信息
    // 图片预览相关
    showImagePreview: false,
    previewImagePath: '',
    // 卡牌描述信息
    previewCardDescription: null,
    // 卡牌状态：true表示显示正面（八字图片），false表示显示背面（card-back.jpg）
    yearCardFlipped: false,
    monthCardFlipped: false,
    dayCardFlipped: false,
    timeCardFlipped: false,
    yearPillar: { 
      heavenlyStem: '',
      earthlyBranch: '',
      imagePath: '',
      baziImagePath: '' // 存储八字图片路径
    },
    monthPillar: {
      heavenlyStem: '',
      earthlyBranch: '',
      imagePath: '',
      baziImagePath: '' // 存储八字图片路径
    },
    dayPillar: {
      heavenlyStem: '',
      earthlyBranch: '',
      imagePath: '',
      baziImagePath: '' // 存储八字图片路径
    },
    timePillar: {
      heavenlyStem: '',
      earthlyBranch: '',
      imagePath: '',
      baziImagePath: '' // 存储八字图片路径
    },
    cardBackImagePath: '/static/card-back.jpg', // 卡牌背面图片路径
  },

  onLoad: function(options) {
    console.log('[CardPage] 页面加载，参数:', options);
    this.controller = new CardController(this);
    this.controller.initialize(options);
  },

  onReady: function() {
    console.log('[CardPage] 页面渲染完成');
  },

  onShow: function() {
    console.log('[CardPage] 页面显示');
    if (this.controller) {
      this.controller.onShow();
    }
  },

  onHide: function() {
    console.log('[CardPage] 页面隐藏');
    if (this.controller) {
      this.controller.onHide();
    }
  },

  onUnload: function() {
    console.log('[CardPage] 页面卸载');
    if (this.controller) {
      this.controller.onUnload();
    }
  },

  // ==================== 事件处理方法 ====================

  /**
   * 卡牌点击事件 - 统一处理翻转和预览
   * 逻辑：
   * - 如果卡牌显示背面（未翻转），点击后翻转显示正面
   * - 如果卡牌显示正面（已翻转），点击后放大预览
   */
  onCardTap: function(e) {
    const pillar = e.currentTarget.dataset.pillar;
    if (!pillar) return;

    // 获取当前卡牌的翻转状态
    const isFlipped = this.data[`${pillar}CardFlipped`];
    
    if (isFlipped) {
      // 卡牌已翻转（显示正面），执行预览操作
      this.controller.previewCard(pillar);
    } else {
      // 卡牌未翻转（显示背面），执行翻转操作
      this.controller.flipCard(pillar);
    }
  },

  // 关闭图片预览
  closeImagePreview: function() {
    if (this.controller) {
      this.controller.closeImagePreview();
    }
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
  }

});
