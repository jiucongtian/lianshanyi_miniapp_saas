// 引入CardController
const { CardController } = require('../../controllers/CardController');

Page({
  data: {
    isDataLoaded: false, // 标记数据是否已加载
    isLoading: true, // 标记是否正在加载
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
    // 每张卡牌的加载状态：true表示正在加载，false表示加载完成
    yearCardLoading: false,
    monthCardLoading: false,
    dayCardLoading: false,
    timeCardLoading: false,
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
   * - 如果卡牌正在加载，不响应点击
   * - 如果卡牌显示背面（未翻转），点击后翻转显示正面
   * - 如果卡牌显示正面（已翻转），点击后放大预览
   */
  onCardTap: function(e) {
    // 从组件事件中获取信息
    const { pillarName, isFlipped } = e.detail;
    
    if (!pillarName) return;

    console.log(`[CardPage] ${pillarName} 卡牌被点击，当前状态: ${isFlipped ? '正面' : '背面'}`);
    
    if (isFlipped) {
      // 卡牌已翻转（显示正面），执行预览操作
      this.controller.previewCard(pillarName);
    } else {
      // 卡牌未翻转（显示背面），执行翻转操作
      this.controller.flipCard(pillarName);
    }
  },

  // 关闭图片预览
  closeImagePreview: function() {
    if (this.controller) {
      this.controller.closeImagePreview();
    }
  },

  // 图片加载成功（组件触发的 imageloaded 事件）
  onImageLoaded: function(e) {
    const { pillarName, imagePath } = e.detail;
    console.log(`[CardPage] ${pillarName} 卡牌图片加载成功:`, imagePath);
    // 组件内部已经处理了所有逻辑，这里只记录日志
  },

  // 图片加载失败（组件触发的 imageloaderror 事件）
  onImageLoadError: function(e) {
    const { pillarName, error } = e.detail;
    console.error(`[CardPage] ${pillarName} 卡牌图片加载失败:`, error);
    
    // 提示用户
    wx.showToast({
      title: '图片加载失败',
      icon: 'none',
      duration: 2000
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
  }

});
