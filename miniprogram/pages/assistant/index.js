/**
 * 助学童子聊天页面
 */
const { AssistantController } = require('../../controllers/AssistantController');
const { createModuleLogger } = require('../../utils/logger/index');
const log = createModuleLogger('AssistantPage');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    messages: [],
    inputValue: '',
    isTyping: false,
    sendDisabled: true,
    hasPermission: false,
    showUpgradeTip: false,
    loading: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    log.info('onLoad', '页面加载');
    this.controller = new AssistantController(this);
    this.controller.initialize();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    log.info('onShow', '页面显示');
    if (this.controller) {
      this.controller.onShow && this.controller.onShow();
    }
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {
    log.info('onHide', '页面隐藏');
    if (this.controller) {
      this.controller.onHide();
    }
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    log.info('onUnload', '页面卸载');
    if (this.controller) {
      this.controller.onUnload();
    }
  },

  /**
   * 滚动到底部
   */
  scrollToBottom() {
    wx.createSelectorQuery()
      .select('.message-list')
      .boundingClientRect((rect) => {
        if (rect) {
          wx.pageScrollTo({
            scrollTop: rect.height + 1000,
            duration: 300
          });
        }
      })
      .exec();
  },

  /**
   * 输入框内容变化
   */
  onInputChange(e) {
    const value = e.detail.value;
    if (this.controller) {
      this.controller.updateInputValue(value);
    }
  },

  /**
   * 发送消息
   */
  onSend(e) {
    const value = e.detail?.value || this.data.inputValue;
    if (this.controller && value) {
      this.controller.sendMessage(value);
    }
  },

  /**
   * 清除历史
   */
  onClearHistory() {
    if (this.controller) {
      this.controller.clearHistory();
    }
  },

  /**
   * 返回
   */
  onBack() {
    if (this.controller) {
      this.controller.goBack();
    } else {
      wx.navigateBack();
    }
  },

  /**
   * 前往升级
   */
  onUpgrade() {
    wx.switchTab({
      url: '/pages/mine/index'
    });
  }
});