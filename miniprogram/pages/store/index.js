/**
 * 身心游小店页面
 */
const { createModuleLogger } = require('../../utils/logger/index');
const { config } = require('../../config/index');
const log = createModuleLogger('StorePage');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    storeAppid: '', // 小店 appid
    productList: [], // 商品列表
    hasProducts: false, // 是否有商品
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    log.info('onLoad', '页面加载');
    
    // 从配置中获取小店配置
    const storeAppid = config.store?.appid || '';
    const productIds = config.store?.productIds || [];
    
    if (!storeAppid) {
      log.warn('onLoad', '小店 appid 未配置，请前往 config/index.js 配置');
      wx.showModal({
        title: '配置提示',
        content: '请先在 config/index.js 中配置小店 appid',
        showCancel: false,
        confirmText: '知道了'
      });
      return;
    }
    
    // 构建商品列表数据（确保 product-id 是字符串类型）
    const productList = productIds.map((productId, index) => ({
      id: String(productId), // store-product 组件要求 product-id 为字符串类型
      key: `product-${index}-${productId}`
    }));
    
    this.setData({
      storeAppid: storeAppid,
      productList: productList,
      hasProducts: productList.length > 0
    });
    
    log.info('onLoad', '小店页面初始化完成', { 
      storeAppid, 
      productCount: productList.length 
    });
    
    // 如果没有配置商品，提示用户
    if (productList.length === 0) {
      log.warn('onLoad', '未配置商品 ID，请前往 config/index.js 配置 productIds');
      wx.showToast({
        title: '未配置商品',
        icon: 'none',
        duration: 2000
      });
    }
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    log.info('onShow', '页面显示');
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {
    log.info('onHide', '页面隐藏');
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    log.info('onUnload', '页面卸载');
  },

  /**
   * 商品跳转成功回调
   */
  onProductEnterSuccess() {
    log.info('onProductEnterSuccess', '商品跳转成功');
  },

  /**
   * 商品跳转失败回调
   */
  onProductEnterError(e) {
    const { code, message } = e.detail || {};
    log.error('onProductEnterError', '商品跳转失败', { code, message });
    
    // 根据错误码显示提示
    const errorMessages = {
      '-1': '系统失败，请重试',
      '10001': '无效的媒体ID',
      '10002': '无效的媒体ID',
      '10003': '文件正在上传中，请等待',
      '10004': '上传的文件存在风险，请重新上传',
      '20001': '该商品因违规已下架',
      '60001': '正在加载中',
      '60002': '正在渲染中',
      '60004': '加载异常',
      '60005': '加载失败'
    };
    
    const errorMsg = errorMessages[String(code)] || message || '未知错误';
    wx.showToast({
      title: errorMsg,
      icon: 'none',
      duration: 2000
    });
  }
});
