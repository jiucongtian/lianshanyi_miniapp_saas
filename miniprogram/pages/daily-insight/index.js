// pages/daily-insight/index.js
const { DailyInsightController } = require('../../controllers/DailyInsightController');
const { createModuleLogger } = require('../../utils/logger/index');
const logger = createModuleLogger('DailyInsightPage');
const { posterGenerator } = require('../../utils/posterGenerator');
const { imageCacheManager } = require('../../utils/manager/imageCacheManager');
const { getBaziImageById } = require('../../utils/baziImageMap');
const { config } = require('../../config/index');
const app = getApp();

Page({
  data: {
    // 当前时间
    currentTime: '',
    // 日期信息
    dateInfo: {
      year: '',
      month: '',
      day: ''
    },
    // 卡牌信息
    cardInfo: null,
    // 加载状态
    loading: false
  },
  
  // Canvas相关
  canvasContext: null,
  canvas: null,

  onLoad(options) {
    logger.info('onLoad', '页面加载');
    this.controller = new DailyInsightController(this);
    
    // 检查是否有预加载的数据
    const preloadData = app.globalData.dailyInsightPreloadData;
    if (preloadData && preloadData.timestamp) {
      // 检查数据是否过期（5分钟内有效）
      const dataAge = Date.now() - preloadData.timestamp;
      const MAX_AGE = 5 * 60 * 1000; // 5分钟
      
      if (dataAge < MAX_AGE) {
        logger.info('onLoad', '使用预加载的数据');
        // 使用预加载的数据初始化
        this.controller.initialize(preloadData);
        // 清除预加载数据，避免下次误用
        delete app.globalData.dailyInsightPreloadData;
      } else {
        logger.warn('onLoad', '预加载数据已过期，重新获取');
        delete app.globalData.dailyInsightPreloadData;
        this.controller.initialize();
      }
    } else {
      // 没有预加载数据，正常初始化
      logger.info('onLoad', '没有预加载数据，正常初始化');
      this.controller.initialize();
    }
  },

  onShow() {
    logger.info('onShow', '页面显示');
  },

  // 事件处理方法
  onViewCardImage() {
    this.controller.onViewCardImage();
  },

  onBack() {
    wx.navigateBack({ delta: 1 });
  },

  // 分享
  onShareAppMessage() {
    const { cardInfo } = this.data;
    if (cardInfo) {
      // 使用Bean的方法计算图片路径
      const imageUrl = cardInfo.imageUrl || '';
      return {
        title: `每日愈见：${cardInfo.cardName} - ${cardInfo.password}`,
        path: '/pages/daily-insight/index',
        imageUrl: imageUrl
      };
    }
    return {};
  },

  onShareTimeline() {
    const { cardInfo } = this.data;
    if (cardInfo) {
      // 使用Bean的方法计算图片路径
      const imageUrl = cardInfo.imageUrl || '';
      return {
        title: `每日愈见：${cardInfo.cardName} - ${cardInfo.password}`,
        imageUrl: imageUrl
      };
    }
    return {};
  },

  /**
   * 生成分享海报
   */
  async onGeneratePoster() {
    logger.info('onGeneratePoster', '点击生成海报');

    // 验证数据
    const { cardInfo, dateInfo } = this.data;
    if (!cardInfo) {
      wx.showToast({
        title: '卡牌信息未加载完成',
        icon: 'none',
        duration: 2000
      });
      const buttonComponent = this.selectComponent('#loading-button-share');
      if (buttonComponent) {
        buttonComponent.reset();
      }
      return;
    }

    try {
      // 获取Canvas上下文（如果还没有获取）
      if (!this.canvas || !this.canvasContext) {
        await this._initCanvas();
      }

      if (!this.canvas || !this.canvasContext) {
        throw new Error('Canvas初始化失败');
      }

      // 构建日期字符串
      const month = String(dateInfo.month || '').padStart(2, '0');
      const day = String(dateInfo.day || '').padStart(2, '0');
      const dateStr = `${dateInfo.year}-${month}-${day}`;

      // 获取卡牌图片信息
      const imageInfo = getBaziImageById(cardInfo.cardNumber);
      if (!imageInfo) {
        logger.error('onGeneratePoster', '找不到对应的卡片图片', { cardNumber: cardInfo.cardNumber });
        throw new Error('找不到对应的卡片图片');
      }

      // 获取卡牌图片路径（优先使用缓存）
      logger.info('onGeneratePoster', '获取卡牌图片路径', { 
        cardNumber: cardInfo.cardNumber,
        imagePath: imageInfo.imagePath,
        fileName: imageInfo.fileName
      });
      const cardImagePath = await imageCacheManager.getImagePath(
        imageInfo.imagePath, 
        imageInfo.fileName
      );
      logger.info('onGeneratePoster', '卡牌图片路径获取完成', { cardImagePath });

      // 获取二维码图片路径（优先使用缓存）
      const qrCodePath = config.cloud.qrCodePath || '/static/erweima.JPG';
      let qrCodeLocalPath = qrCodePath;
      
      // 只有云存储路径（cloud:// 开头）才需要通过 imageCacheManager 处理
      // HTTP URL 和静态资源路径直接使用，不需要处理
      if (qrCodePath.startsWith('cloud://')) {
        try {
          // 尝试从云存储路径提取文件名
          const qrCodeFileName = qrCodePath.split('/').pop() || 'erweima.JPG';
          qrCodeLocalPath = await imageCacheManager.getImagePath(qrCodePath, qrCodeFileName);
          logger.info('onGeneratePoster', '二维码图片路径获取完成', { qrCodeLocalPath });
        } catch (error) {
          logger.warn('onGeneratePoster', '获取二维码本地路径失败，使用原始路径', { error: error.message });
          qrCodeLocalPath = qrCodePath;
        }
      } else {
        // HTTP URL 或静态资源路径直接使用
        logger.info('onGeneratePoster', '二维码使用原始路径（HTTP URL 或静态资源）', { qrCodePath });
      }

      // 生成海报
      const posterPath = await posterGenerator.generateDailyInsightPoster({
        cardImagePath: cardImagePath,
        cardName: cardInfo.cardName,
        cardNumber: cardInfo.cardNumber,
        date: dateStr,
        central: cardInfo.central,
        seasonMark: cardInfo.seasonMark,
        talentMark: cardInfo.talentMark,
        abilityMark: cardInfo.abilityMark,
        pathMark: cardInfo.pathMark,
        blessing: cardInfo.blessing,
        tip: cardInfo.tip,
        password: cardInfo.password,
        canvasContext: this.canvasContext,
        canvas: this.canvas,
        qrCodePath: qrCodeLocalPath
      });

      logger.info('onGeneratePoster', '海报生成成功', { posterPath });

      // 重置按钮状态
      const buttonComponent = this.selectComponent('#loading-button-share');
      if (buttonComponent) {
        buttonComponent.stopLoading();
      }

      // 预览海报
      wx.previewImage({
        urls: [posterPath],
        current: posterPath,
        success: () => {
          logger.info('onGeneratePoster', '海报预览成功');
        },
        fail: (err) => {
          logger.error('onGeneratePoster', '海报预览失败', err);
          // 预览失败，提示用户保存到相册
          this._savePosterToAlbum(posterPath);
        }
      });

    } catch (error) {
      logger.error('onGeneratePoster', '生成海报失败', error);
      
      // 重置按钮状态
      const buttonComponent = this.selectComponent('#loading-button-share');
      if (buttonComponent) {
        buttonComponent.reset();
      }

      wx.showToast({
        title: '生成海报失败，请重试',
        icon: 'none',
        duration: 2000
      });
    }
  },

  /**
   * 初始化Canvas
   */
  async _initCanvas() {
    return new Promise((resolve, reject) => {
      const query = wx.createSelectorQuery();
      query.select('#posterCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res || !res[0]) {
            logger.error('_initCanvas', 'Canvas节点查询失败');
            reject(new Error('Canvas节点查询失败'));
            return;
          }

          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');

          this.canvas = canvas;
          this.canvasContext = ctx;

          logger.info('_initCanvas', 'Canvas初始化成功');
          resolve();
        });
    });
  },

  /**
   * 保存海报到相册
   */
  _savePosterToAlbum(posterPath) {
    wx.showModal({
      title: '保存海报',
      content: '是否保存海报到相册？',
      success: (res) => {
        if (res.confirm) {
          wx.saveImageToPhotosAlbum({
            filePath: posterPath,
            success: () => {
              wx.showToast({
                title: '保存成功',
                icon: 'success',
                duration: 2000
              });
              logger.info('_savePosterToAlbum', '海报保存到相册成功');
            },
            fail: (err) => {
              logger.error('_savePosterToAlbum', '保存到相册失败', err);
              
              if (err.errMsg.includes('auth deny')) {
                wx.showModal({
                  title: '提示',
                  content: '需要您授权保存图片到相册',
                  confirmText: '去设置',
                  success: (modalRes) => {
                    if (modalRes.confirm) {
                      wx.openSetting();
                    }
                  }
                });
              } else {
                wx.showToast({
                  title: '保存失败',
                  icon: 'none',
                  duration: 2000
                });
              }
            }
          });
        }
      }
    });
  }
});

