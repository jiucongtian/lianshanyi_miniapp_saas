/**
 * 卡牌查看器页面
 * 输入1-60的数字，显示对应的卡牌图片
 */
const { getBaziImageById } = require('../../utils/baziImageMap');
const { imageCacheManager } = require('../../utils/manager/imageCacheManager');
const { JIAZI_DATA } = require('../../utils/jiaziData');
const { createModuleLogger } = require('../../utils/logger/index');
const log = createModuleLogger('CardViewerPage');

Page({
  data: {
    cardNumber: '', // 输入的卡牌编号
    cardImagePath: '', // 卡牌图片路径
    cardInfo: null, // 卡牌信息
    isLoading: false, // 是否正在加载
    error: '', // 错误信息
    // 卡牌预览相关
    showCardPreview: false, // 是否显示卡牌预览
    previewImagePath: '' // 预览图片路径
  },

  onLoad(options) {
    log.info('onLoad', '页面加载');
  },

  /**
   * 返回按钮点击事件（TDesign navbar回调）
   */
  goBack() {
    wx.navigateBack();
  },

  /**
   * 输入卡牌编号
   */
  onCardNumberInput(e) {
    const value = e.detail.value.trim();
    this.setData({
      cardNumber: value,
      error: ''
    });
  },

  /**
   * 确认查看卡牌
   */
  async onViewCard() {
    const { cardNumber } = this.data;
    
    // 验证输入
    if (!cardNumber) {
      this.setData({ error: '请输入卡牌编号' });
      wx.showToast({
        title: '请输入卡牌编号',
        icon: 'none'
      });
      return;
    }

    const num = parseInt(cardNumber);
    if (isNaN(num) || num < 1 || num > 60) {
      this.setData({ error: '请输入1-60之间的数字' });
      wx.showToast({
        title: '请输入1-60之间的数字',
        icon: 'none'
      });
      return;
    }

    // 获取卡牌信息
    const cardInfo = getBaziImageById(num);
    if (!cardInfo) {
      this.setData({ error: '未找到对应的卡牌' });
      wx.showToast({
        title: '未找到对应的卡牌',
        icon: 'none'
      });
      return;
    }

    // 从JIAZI_DATA中获取干支中文名
    const jiaziData = JIAZI_DATA.find(item => item.cardNumber === num);
    const cardName = jiaziData ? jiaziData.cardName : '';

    // 合并卡牌信息，添加干支中文名
    const fullCardInfo = {
      ...cardInfo,
      cardName: cardName
    };

    log.info('onViewCard', '查看卡牌', { cardNumber: num, cardInfo: fullCardInfo });

    // 显示加载状态
    this.setData({
      isLoading: true,
      error: '',
      cardInfo: fullCardInfo
    });

    try {
      // 使用图片缓存管理器获取图片路径
      const imagePath = await imageCacheManager.getImagePath(cardInfo.imagePath, cardInfo.fileName);
      
      this.setData({
        cardImagePath: imagePath,
        isLoading: false
      });

      log.info('onViewCard', '卡牌图片加载成功', { imagePath });
    } catch (error) {
      log.error('onViewCard', '卡牌图片加载失败', error);
      this.setData({
        isLoading: false,
        error: '图片加载失败，请重试'
      });
      wx.showToast({
        title: '图片加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 清空输入
   */
  onClear() {
    this.setData({
      cardNumber: '',
      cardImagePath: '',
      cardInfo: null,
      error: '',
      showCardPreview: false,
      previewImagePath: ''
    });
  },

  /**
   * 卡牌图片点击事件 - 显示全屏预览
   */
  onCardImageTap() {
    const { cardImagePath } = this.data;
    
    if (!cardImagePath) {
      return;
    }
    
    log.info('onCardImageTap', '卡牌图片被点击，准备预览', { imagePath: cardImagePath });
    
    this.setData({
      showCardPreview: true,
      previewImagePath: cardImagePath
    });
  },

  /**
   * 关闭卡牌预览
   */
  onCloseCardPreview() {
    log.info('onCloseCardPreview', '关闭卡牌预览');
    this.setData({
      showCardPreview: false,
      previewImagePath: ''
    });
  }
});

