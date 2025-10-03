Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 按钮主题
    theme: {
      type: String,
      value: 'primary'
    },
    // 按钮尺寸
    size: {
      type: String,
      value: 'medium'
    },
    // 是否块级按钮
    block: {
      type: Boolean,
      value: false
    },
    // 是否禁用
    disabled: {
      type: Boolean,
      value: false
    },
    // 按钮文本
    buttonText: {
      type: String,
      value: '按钮'
    },
    // 加载中的文本
    loadingText: {
      type: String,
      value: '处理中...'
    },
    // 自定义样式类
    customClass: {
      type: String,
      value: ''
    },
    // 是否自动防重复点击
    preventDuplicate: {
      type: Boolean,
      value: true
    },
    // 防重复点击的冷却时间（毫秒）
    cooldownTime: {
      type: Number,
      value: 1000
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    loading: false
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 按钮点击事件
     */
    onButtonTap() {
      // 如果禁用或正在加载中，直接返回
      if (this.data.disabled || this.data.loading) {
        return;
      }

      // 如果启用防重复点击
      if (this.data.preventDuplicate) {
        this.setData({
          loading: true
        });
      }

      // 触发父组件的点击事件
      this.triggerEvent('tap', {
        loading: this.data.loading
      });
    },

    /**
     * 开始加载状态
     */
    startLoading() {
      this.setData({
        loading: true
      });
    },

    /**
     * 结束加载状态
     */
    stopLoading() {
      this.setData({
        loading: false
      });
    },

    /**
     * 重置按钮状态（用于错误处理）
     */
    reset() {
      this.setData({
        loading: false
      });
    }
  }
});
