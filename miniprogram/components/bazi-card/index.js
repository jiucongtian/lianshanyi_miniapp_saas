/**
 * 八字卡牌组件
 * 负责单张卡牌的显示、翻转、图片加载等功能
 */

// 引入工具类
const { imageCacheManager } = require('../../utils/imageCacheManager');
const { getBaziImageById, getBaziImageByPinyin } = require('../../utils/baziImageMap');

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 卡牌标题（例如："年柱"、"时空关系卡"）
    title: {
      type: String,
      value: ''
    },
    
    // 柱子名称（year/month/day/time）
    pillarName: {
      type: String,
      value: ''
    },
    
    // 当前显示的图片路径（由父组件传入）
    imagePath: {
      type: String,
      value: ''
    },
    
    // 是否正在加载（由父组件控制加载状态）
    loading: {
      type: Boolean,
      value: false
    },
    
    // 是否显示不确定标识（仅时柱）
    showUncertainIndicator: {
      type: Boolean,
      value: false
    },
    
    // 入场动画对象
    animation: {
      type: Object,
      value: null
    },
    
    // === 以下属性为后续阶段扩展使用 ===
    
    // 天干（阶段五使用：组件内部图片加载）
    heavenlyStem: {
      type: String,
      value: ''
    },
    
    // 地支（阶段五使用：组件内部图片加载）
    earthlyBranch: {
      type: String,
      value: ''
    },
    
    // 八字图片ID（阶段五使用：组件内部图片加载）
    baziImageId: {
      type: String,
      value: ''
    },
    
    // 是否默认显示正面（阶段五使用：组件内部翻转逻辑）
    defaultShowFront: {
      type: Boolean,
      value: false
    },
    
    // 背面图片路径（阶段五使用：组件内部翻转逻辑）
    cardBackImage: {
      type: String,
      value: ''
    }
  },

  /**
   * 组件的内部数据
   */
  data: {
    // 是否已翻转
    isFlipped: false,
    
    // 八字图片路径
    baziImagePath: '',
    
    // 是否正在加载图片
    isLoadingImage: false,
    
    // 当前显示的图片路径
    currentImagePath: '',
    
    // 卡牌状态（loading/loaded/flipped/error）
    state: 'loading',
    
    // 翻转动画对象
    flipAnimation: null
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      console.log('[BaziCard] 组件挂载:', this.data.pillarName);
      
      // 根据默认配置初始化状态
      if (this.data.defaultShowFront) {
        this.setData({
          isFlipped: true,
          state: 'flipped'
        });
      }
      
      // 如果有天干地支或八字图片ID，自动加载图片
      if (this.data.baziImageId) {
        this._loadBaziImageById(this.data.baziImageId);
      } else if (this.data.heavenlyStem && this.data.earthlyBranch) {
        this._loadBaziImageByPinyin(this.data.heavenlyStem, this.data.earthlyBranch);
      }
    },
    
    detached() {
      console.log('[BaziCard] 组件卸载:', this.data.pillarName);
    }
  },

  /**
   * 属性监听器
   */
  observers: {
    // 监听天干地支变化，自动重新加载图片
    'heavenlyStem, earthlyBranch': function(heavenlyStem, earthlyBranch) {
      if (heavenlyStem && earthlyBranch) {
        console.log('[BaziCard] 天干地支变化，重新加载图片:', heavenlyStem, earthlyBranch);
        this._loadBaziImageByPinyin(heavenlyStem, earthlyBranch);
      }
    },
    
    // 监听八字图片ID变化
    'baziImageId': function(baziImageId) {
      if (baziImageId) {
        console.log('[BaziCard] 八字图片ID变化，重新加载图片:', baziImageId);
        this._loadBaziImageById(baziImageId);
      }
    }
  },

  /**
   * 组件方法列表
   */
  methods: {
    /**
     * 根据八字图片ID加载图片（使用缓存）
     * @param {number} imageId - 八字图片ID (1-60)
     */
    async _loadBaziImageById(imageId) {
      console.log('[BaziCard] 根据ID加载八字图片:', imageId);
      
      this.setData({
        isLoadingImage: true,
        state: 'loading'
      });
      
      try {
        // 获取八字图片信息
        const imageInfo = getBaziImageById(imageId);
        if (!imageInfo) {
          throw new Error(`找不到ID为 ${imageId} 的八字图片`);
        }
        
        // 使用缓存管理器获取图片路径
        const imagePath = await imageCacheManager.getImagePath(
          imageInfo.imagePath,
          imageInfo.fileName
        );
        
        console.log('[BaziCard] 图片加载完成:', imagePath);
        
        // 更新显示的图片
        this.setData({
          baziImagePath: imagePath,
          currentImagePath: imagePath,
          isLoadingImage: false,
          state: 'loaded'
        });
        
        // 触发图片加载完成事件
        this.triggerEvent('imageloaded', {
          pillarName: this.data.pillarName,
          imagePath: imagePath,
          imageInfo: imageInfo
        });
        
      } catch (error) {
        console.error('[BaziCard] 加载图片失败:', error);
        
        this.setData({
          isLoadingImage: false,
          state: 'error'
        });
        
        // 触发图片加载失败事件
        this.triggerEvent('imageloaderror', {
          pillarName: this.data.pillarName,
          error: error.message
        });
      }
    },

    /**
     * 根据天干地支拼音加载图片（使用缓存）
     * @param {string} heavenlyStem - 天干拼音
     * @param {string} earthlyBranch - 地支拼音
     */
    async _loadBaziImageByPinyin(heavenlyStem, earthlyBranch) {
      console.log('[BaziCard] 根据拼音加载八字图片:', heavenlyStem, earthlyBranch);
      
      this.setData({
        isLoadingImage: true,
        state: 'loading'
      });
      
      try {
        // 拼接完整的拼音
        const fullPinyin = `${heavenlyStem}${earthlyBranch}`.toLowerCase();
        
        // 获取八字图片信息
        const imageInfo = getBaziImageByPinyin(fullPinyin);
        if (!imageInfo) {
          throw new Error(`找不到拼音为 ${fullPinyin} 的八字图片`);
        }
        
        // 使用缓存管理器获取图片路径
        const imagePath = await imageCacheManager.getImagePath(
          imageInfo.imagePath,
          imageInfo.fileName
        );
        
        console.log('[BaziCard] 图片加载完成:', imagePath);
        
        // 更新显示的图片
        this.setData({
          baziImagePath: imagePath,
          currentImagePath: imagePath,
          isLoadingImage: false,
          state: 'loaded'
        });
        
        // 触发图片加载完成事件
        this.triggerEvent('imageloaded', {
          pillarName: this.data.pillarName,
          imagePath: imagePath,
          imageInfo: imageInfo
        });
        
      } catch (error) {
        console.error('[BaziCard] 加载图片失败:', error);
        
        this.setData({
          isLoadingImage: false,
          state: 'error'
        });
        
        // 触发图片加载失败事件
        this.triggerEvent('imageloaderror', {
          pillarName: this.data.pillarName,
          error: error.message
        });
      }
    },

    /**
     * 图片加载成功
     */
    onImageLoad(e) {
      console.log('[BaziCard] 图片加载成功:', this.data.pillarName);
      
      this.setData({
        isLoadingImage: false,
        state: 'loaded'
      });
      
      // 触发自定义事件，通知父组件
      this.triggerEvent('imageload', {
        pillarName: this.data.pillarName,
        imagePath: this.data.currentImagePath
      });
    },

    /**
     * 图片加载失败
     */
    onImageError(e) {
      console.error('[BaziCard] 图片加载失败:', this.data.pillarName, e.detail);
      
      this.setData({
        isLoadingImage: false,
        state: 'error'
      });
      
      // 触发自定义事件，通知父组件
      this.triggerEvent('imageerror', {
        pillarName: this.data.pillarName,
        imagePath: this.data.currentImagePath,
        error: e.detail
      });
    },

    /**
     * 卡牌点击事件
     */
    onCardTap(e) {
      console.log('[BaziCard] 卡牌被点击:', this.data.pillarName);
      
      // 触发自定义事件，通知父组件
      this.triggerEvent('cardtap', {
        pillarName: this.data.pillarName,
        isFlipped: this.data.isFlipped,
        heavenlyStem: this.data.heavenlyStem,
        earthlyBranch: this.data.earthlyBranch,
        imagePath: this.data.currentImagePath
      });
    },

    /**
     * 翻转卡牌到正面（带动画）
     * 公共方法，供父组件调用
     */
    flipToFront() {
      console.log('[BaziCard] 翻转卡牌到正面:', this.data.pillarName);
      
      // 如果已经翻转，不重复翻转
      if (this.data.isFlipped) {
        console.log('[BaziCard] 卡牌已经是正面，跳过翻转');
        return;
      }
      
      // 创建翻转动画
      const animation = wx.createAnimation({
        duration: 300,
        timingFunction: 'ease-in-out'
      });
      
      // 第一阶段：缩小到0 (翻转到侧面)
      animation.scaleX(0).step();
      
      this.setData({
        flipAnimation: animation.export()
      });
      
      // 第二阶段：切换图片，然后放大到1
      setTimeout(() => {
        // 切换到八字图片
        this.setData({
          isFlipped: true,
          state: 'flipped',
          currentImagePath: this.data.baziImagePath || this.data.imagePath
        });
        
        // 创建新动画：从0放大到1
        const animation2 = wx.createAnimation({
          duration: 300,
          timingFunction: 'ease-in-out'
        });
        animation2.scaleX(1).step();
        
        this.setData({
          flipAnimation: animation2.export()
        });
        
        // 触发状态变化事件
        this.triggerEvent('statechange', {
          pillarName: this.data.pillarName,
          state: 'flipped'
        });
        
      }, 300);
    },
    
    /**
     * 翻转卡牌到背面（带动画）
     * 公共方法，供父组件调用
     */
    flipToBack() {
      console.log('[BaziCard] 翻转卡牌到背面:', this.data.pillarName);
      
      // 如果已经是背面，不重复翻转
      if (!this.data.isFlipped) {
        console.log('[BaziCard] 卡牌已经是背面，跳过翻转');
        return;
      }
      
      // 创建翻转动画
      const animation = wx.createAnimation({
        duration: 300,
        timingFunction: 'ease-in-out'
      });
      
      // 第一阶段：缩小到0
      animation.scaleX(0).step();
      
      this.setData({
        flipAnimation: animation.export()
      });
      
      // 第二阶段：切换图片，然后放大到1
      setTimeout(() => {
        // 切换到背面图片
        this.setData({
          isFlipped: false,
          state: 'normal',
          currentImagePath: this.data.cardBackImage
        });
        
        // 创建新动画：从0放大到1
        const animation2 = wx.createAnimation({
          duration: 300,
          timingFunction: 'ease-in-out'
        });
        animation2.scaleX(1).step();
        
        this.setData({
          flipAnimation: animation2.export()
        });
        
        // 触发状态变化事件
        this.triggerEvent('statechange', {
          pillarName: this.data.pillarName,
          state: 'normal'
        });
        
      }, 300);
    },

    /**
     * 重新加载图片
     * 公共方法，供父组件调用
     */
    reloadImage() {
      console.log('[BaziCard] 重新加载图片:', this.data.pillarName);
      
      this.setData({
        isLoadingImage: true,
        state: 'loading'
      });
      
      // 触发状态变化事件
      this.triggerEvent('statechange', {
        pillarName: this.data.pillarName,
        state: 'loading'
      });
    },

    /**
     * 获取当前卡牌状态
     * 公共方法，供父组件调用
     */
    getState() {
      return {
        pillarName: this.data.pillarName,
        isFlipped: this.data.isFlipped,
        isLoadingImage: this.data.isLoadingImage,
        state: this.data.state,
        heavenlyStem: this.data.heavenlyStem,
        earthlyBranch: this.data.earthlyBranch,
        imagePath: this.data.currentImagePath
      };
    }
  }
});

