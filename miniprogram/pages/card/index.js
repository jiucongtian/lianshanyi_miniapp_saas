// 引入CardController
const { CardController } = require('../../controllers/CardController');
const { createModuleLogger } = require('../../utils/logger/index');
const log = createModuleLogger('CardPage');

Page({
  data: {
    isDataLoaded: false, // 标记数据是否已加载
    isLoading: true, // 标记是否正在加载
    currentProfileName: '生命智慧卡牌', // 当前档案名称，默认为生命智慧卡牌
    isUncertainTime: false, // 是否不确定时辰信息
    profileCount: 0, // 档案数量
    // 图片预览相关
    showImagePreview: false,
    previewImagePath: '',
    // 卡牌描述信息
    previewCardDescription: null,
    // 八字数据（只保留天干地支，图片加载和翻转状态由组件管理）
    yearPillar: { 
      heavenlyStem: '',
      earthlyBranch: ''
    },
    monthPillar: {
      heavenlyStem: '',
      earthlyBranch: ''
    },
    dayPillar: {
      heavenlyStem: '',
      earthlyBranch: ''
    },
    timePillar: {
      heavenlyStem: '',
      earthlyBranch: ''
    },
    cardBackImagePath: '/static/card-back.jpg', // 卡牌背面图片路径
  },

  onLoad: function(options) {
    log.info('onLoad', '页面加载', { options });
    this.controller = new CardController(this);
    this.controller.initialize(options);
  },

  onReady: function() {
    log.debug('onReady', '页面渲染完成');
  },

  onShow: function() {
    log.debug('onShow', '页面显示');
    if (this.controller) {
      this.controller.onShow();
    }
  },

  onHide: function() {
    log.debug('onHide', '页面隐藏');
    if (this.controller) {
      this.controller.onHide();
    }
  },

  onUnload: function() {
    log.debug('onUnload', '页面卸载');
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

    log.debug('onCardTap', '卡牌被点击', { pillarName, isFlipped: isFlipped ? '正面' : '背面' });
    
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
    log.debug('onImageLoaded', '卡牌图片加载成功', { pillarName, imagePath });
    // 组件内部已经处理了所有逻辑，这里只记录日志
  },

  // 图片加载失败（组件触发的 imageloaderror 事件）
  onImageLoadError: function(e) {
    const { pillarName, error } = e.detail;
    log.error('onImageLoadError', '卡牌图片加载失败', { pillarName, error });
    
    // 提示用户
    wx.showToast({
      title: '图片加载失败',
      icon: 'none',
      duration: 2000
    });
  },

  // 图片加载成功（预览图片的 load 事件）
  onImageLoad: function(e) {
    log.debug('onImageLoad', '预览图片加载成功');
    // 预览图片加载成功，可以在这里添加一些逻辑
  },

  // 图片加载失败（预览图片的 error 事件）
  onImageError: function(e) {
    log.error('onImageError', '预览图片加载失败');
    // 预览图片加载失败，可以在这里添加一些逻辑
  },

  // 分享功能 - 激活右上角分享按钮
  onShareAppMessage: function() {
    const { yearPillar, monthPillar, dayPillar, timePillar } = this.data;
    const baziText = `${yearPillar.heavenlyStem}${yearPillar.earthlyBranch} ${monthPillar.heavenlyStem}${monthPillar.earthlyBranch} ${dayPillar.heavenlyStem}${dayPillar.earthlyBranch} ${timePillar.heavenlyStem}${timePillar.earthlyBranch}`;
    
    return {
      title: '生命智慧卡牌',
      path: '/pages/card/index',
      imageUrl: '', // 可以设置分享图片
    };
  },

  // 牌库入口点击事件
  onProfileEntryTap: function() {
    log.debug('onProfileEntryTap', '点击牌库入口');
    wx.navigateTo({
      url: '/pages/profile/index',
      success: () => {
        log.debug('onProfileEntryTap', '成功跳转到牌库页面');
      },
      fail: (error) => {
        log.error('onProfileEntryTap', '跳转失败', { error: error.errMsg });
        wx.showToast({
          title: '跳转失败',
          icon: 'none'
        });
      }
    });
  }

});
