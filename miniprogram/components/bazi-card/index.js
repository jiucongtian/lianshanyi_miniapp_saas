/**
 * 八字卡牌组件
 * 负责单张卡牌的显示、翻转、图片加载等功能
 */
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 卡牌标题（例如："年柱"）
    title: {
      type: String,
      value: ''
    },
    
    // 柱子名称（year/month/day/time）
    pillarName: {
      type: String,
      value: ''
    },
    
    // 天干
    heavenlyStem: {
      type: String,
      value: ''
    },
    
    // 地支
    earthlyBranch: {
      type: String,
      value: ''
    },
    
    // 八字图片ID
    baziImageId: {
      type: String,
      value: ''
    },
    
    // 是否默认显示正面（日柱为true）
    defaultShowFront: {
      type: Boolean,
      value: false
    },
    
    // 背面图片路径
    cardBackImage: {
      type: String,
      value: ''
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
    state: 'loading'
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
    },
    
    detached() {
      console.log('[BaziCard] 组件卸载:', this.data.pillarName);
    }
  },

  /**
   * 组件方法列表
   */
  methods: {
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
      
      // 设置翻转状态
      this.setData({
        isFlipped: true,
        state: 'flipped'
      });
      
      // 触发状态变化事件
      this.triggerEvent('statechange', {
        pillarName: this.data.pillarName,
        state: 'flipped'
      });
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

