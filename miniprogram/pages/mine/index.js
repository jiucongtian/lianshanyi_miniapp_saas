/**
 * 个人中心页面
 * 使用MineController处理业务逻辑
 */
const { MineController } = require('../../controllers/MineController');
const { createModuleLogger } = require('../../utils/logger/index');
const log = createModuleLogger('MinePage');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    userInfo: {},
    loading: true,
    error: '',
    userTypeText: '',
    genderText: '',
    phoneNumberText: '',
    avatarUrl: '',
    adminMenus: [],
    isAdmin: false,
    isSuperAdmin: false,
    adminRoleName: '普通用户',
    showAssistantEntry: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    log.info('onLoad', '页面加载');
    this.controller = new MineController(this);
    this.controller.initialize();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    if (this.controller) {
      this.controller.onShow();
    }
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {
    if (this.controller) {
      this.controller.onHide();
    }
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    if (this.controller) {
      this.controller.onUnload();
    }
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    if (this.controller) {
      this.controller.onPullDownRefresh();
    }
  },


  /**
   * 跳转到注册页面
   */
  onRegister() {
    if (this.controller) {
      this.controller.onRegister();
    }
  },

  /**
   * 编辑用户资料
   */
  onEditProfile() {
    if (this.controller) {
      this.controller.onEditProfile();
    }
  },

  /**
   * 点击设置按钮
   */
  onSettingsTap() {
    if (this.controller) {
      this.controller.showSettings();
    }
  },

  /**
   * 管理员菜单点击事件
   */
  onAdminMenuTap(e) {
    const menuId = e.currentTarget.dataset.id;
    log.info('onAdminMenuTap', '管理员菜单点击:', menuId);
    
    if (this.controller) {
      this.controller.onAdminMenuTap(menuId);
    }
  },

  /**
   * 点击微信小店入口
   */
  onStoreTap() {
    if (this.controller) {
      this.controller.onStoreTap();
    }
  },

  /**
   * 点击卡牌查看器
   */
  onCardViewerTap() {
    wx.navigateTo({
      url: '/pages/cardViewer/index'
    });
  },

  /**
   * 点击助学童子
   */
  onAssistantTap() {
    wx.navigateTo({
      url: '/pages/assistant/index'
    });
  },

  /**
   * 点击使用手册
   */
  onUserManualTap() {
    if (this.controller) {
      this.controller.onUserManualTap();
    }
  },

  /**
   * 点击反馈与建议
   */
  onFeedbackTap() {
    log.info('onFeedbackTap', '跳转到反馈页面');
    wx.navigateTo({
      url: '/pages/feedback/index'
    });
  },

  /**
   * 跳转到调试页面（仅管理员可访问）
   */
  onDebugTap() {
    log.info('onDebugTap', '跳转到调试页面');
    
    // 权限检查：只有超级管理员可以访问调试页面
    if (!this.data.userInfo || !this.data.userInfo.isSuperAdmin()) {
      log.warn('onDebugTap', '非管理员用户尝试访问调试页面');
      wx.showToast({
        title: '无权限访问',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    wx.navigateTo({
      url: '/pages/debug/index'
    });
  }
})
