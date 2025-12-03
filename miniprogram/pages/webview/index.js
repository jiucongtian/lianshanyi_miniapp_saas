/**
 * Web页面加载器
 * 用于加载外部或内部的Web页面
 */
const { createModuleLogger } = require('../../utils/logger/index');
const log = createModuleLogger('WebViewPage');

Page({
  data: {
    webUrl: '',
    pageTitle: '加载中...'
  },

  onLoad(options) {
    log.info('onLoad', '页面加载', options);
    
    const { url, title } = options;
    
    if (!url) {
      log.error('onLoad', '缺少url参数');
      wx.showToast({
        title: '页面地址错误',
        icon: 'error'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    // URL参数已经被_buildQueryString编码过一次，这里解码回来
    const decodedUrl = decodeURIComponent(url);
    const pageTitle = title ? decodeURIComponent(title) : '详情';

    log.info('onLoad', '解码后的URL:', decodedUrl);
    log.info('onLoad', '页面标题:', pageTitle);

    // 设置导航栏标题
    wx.setNavigationBarTitle({
      title: pageTitle
    });

    this.setData({
      webUrl: decodedUrl,
      pageTitle: pageTitle
    });
  },

  /**
   * webview消息处理
   */
  onMessage(e) {
    log.info('onMessage', '收到webview消息:', e.detail);
  },

  /**
   * webview加载完成
   */
  onWebViewLoad(e) {
    log.info('onWebViewLoad', 'webview加载完成');
  },

  /**
   * webview加载失败
   */
  onWebViewError(e) {
    log.error('onWebViewError', 'webview加载失败:', e.detail);
    wx.showToast({
      title: '页面加载失败',
      icon: 'error'
    });
  }
});

