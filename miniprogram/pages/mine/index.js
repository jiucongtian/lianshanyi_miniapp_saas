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
    adminRoleName: '普通用户'
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
  }
})
