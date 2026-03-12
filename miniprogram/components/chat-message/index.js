/**
 * 聊天消息组件
 */
Component({
  properties: {
    // 消息对象
    message: {
      type: Object,
      value: {}
    }
  },

  data: {
    // 是否为用户消息
    isUser: false
  },

  observers: {
    'message': function(message) {
      if (message) {
        this.setData({
          isUser: message.role === 'user'
        });
      }
    }
  },

  methods: {
    /**
     * 复制消息内容
     */
    onCopyContent() {
      const content = this.data.message?.content || this.data.message?.fullContent;
      if (content) {
        wx.setClipboardData({
          data: content,
          success: () => {
            wx.showToast({
              title: '已复制',
              icon: 'success'
            });
          }
        });
      }
    }
  }
});