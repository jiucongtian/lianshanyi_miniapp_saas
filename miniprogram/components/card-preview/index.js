/**
 * 卡牌预览组件
 * 通用的卡牌放大预览功能，支持3D倾斜效果
 * 
 * 使用方式：
 * ```xml
 * <card-preview
 *   show="{{showPreview}}"
 *   image-path="{{imagePath}}"
 *   description="{{description}}"
 *   bind:close="onClosePreview"
 * />
 * ```
 */

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 是否显示预览
    show: {
      type: Boolean,
      value: false
    },
    
    // 预览图片路径
    imagePath: {
      type: String,
      value: ''
    },
    
    // 卡牌描述信息（可选）
    description: {
      type: Object,
      value: null
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    // 3D倾斜效果相关
    previewImageTransformStyle: '',
    previewImageTouching: false,
    touchStartX: 0,
    touchStartY: 0,
    isTouching: false
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 关闭预览
     */
    closePreview() {
      // 重置3D倾斜效果
      this.setData({
        previewImageTransformStyle: '',
        previewImageTouching: false,
        isTouching: false
      });
      
      // 触发关闭事件
      this.triggerEvent('close');
    },

    /**
     * 预览图片触摸开始
     */
    onPreviewTouchStart(e) {
      if (!e.touches || e.touches.length === 0) return;
      
      // 阻止事件冒泡，避免触发关闭预览
      if (e.stopPropagation) {
        e.stopPropagation();
      }
      
      const touch = e.touches[0];
      this.setData({
        touchStartX: touch.clientX,
        touchStartY: touch.clientY,
        isTouching: true,
        previewImageTouching: true
      });
    },

    /**
     * 预览图片触摸移动
     */
    onPreviewTouchMove(e) {
      if (!this.data.isTouching || !e.touches || e.touches.length === 0) return;
      
      // 阻止事件冒泡，避免触发关闭预览
      if (e.stopPropagation) {
        e.stopPropagation();
      }
      
      const touch = e.touches[0];
      const currentX = touch.clientX;
      const currentY = touch.clientY;
      
      // 获取屏幕尺寸
      const windowInfo = wx.getWindowInfo();
      const screenWidth = windowInfo.windowWidth;
      const screenHeight = windowInfo.windowHeight;
      
      // 图片占据90%的屏幕，计算图片中心位置
      const imageWidth = screenWidth * 0.9;
      const imageHeight = screenHeight * 0.9;
      const centerX = screenWidth / 2;
      const centerY = screenHeight / 2;
      
      // 计算触摸点相对于图片中心的偏移（归一化到-1到1之间）
      const deltaX = (currentX - centerX) / (imageWidth / 2);
      const deltaY = (currentY - centerY) / (imageHeight / 2);
      
      // 限制偏移范围在-1到1之间
      const clampedDeltaX = Math.max(-1, Math.min(1, deltaX));
      const clampedDeltaY = Math.max(-1, Math.min(1, deltaY));
      
      // 计算倾斜角度（最大15度）
      const maxTilt = 15;
      const rotateY = clampedDeltaX * maxTilt;
      const rotateX = -clampedDeltaY * maxTilt; // Y轴方向相反，所以取负值
      
      // 计算透视距离，使效果更自然
      const perspective = 1000;
      
      // 构建3D变换样式
      const transformStyle = `perspective(${perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      
      this.setData({
        previewImageTransformStyle: transformStyle
      });
    },

    /**
     * 预览图片触摸结束
     */
    onPreviewTouchEnd(e) {
      if (!this.data.isTouching) return;
      
      // 阻止事件冒泡
      if (e.stopPropagation) {
        e.stopPropagation();
      }
      
      // 移除触摸中类名，启用过渡效果
      // 平滑恢复到原始状态
      this.setData({
        previewImageTransformStyle: '',
        previewImageTouching: false,
        isTouching: false
      });
    },

    /**
     * 图片加载成功
     */
    onImageLoad() {
      // 可以在这里添加一些逻辑
    },

    /**
     * 图片加载失败
     */
    onImageError() {
      // 可以在这里添加一些逻辑
    }
  }
});

