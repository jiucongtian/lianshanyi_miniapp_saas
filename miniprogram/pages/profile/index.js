// pages/profile/index.js
const { ProfileController } = require('../../controllers/ProfileController');
const { createModuleLogger } = require('../../utils/logger/index');
const log = createModuleLogger('ProfilePage');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    profileList: [],
    loading: false,
    currentProfileId: null,
    
    // 用户信息和权限
    userType: 'guest',
    userTypeName: '临时用户',
    profileQuota: 3,
    usedProfiles: 0,
    canCreateMore: true,
    upgradeHint: null,
    
    // 显示状态
    showUpgradeCard: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    log.info('onLoad', '页面加载');
    this.controller = new ProfileController(this);
    this.controller.initialize();
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {
    // 页面渲染完成，无需额外处理
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    log.debug('onShow', '页面显示');
    this.controller.onShow();
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {
    log.debug('onHide', '页面隐藏');
    this.controller.onHide();
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    log.debug('onUnload', '页面卸载');
    this.controller.onUnload();
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.controller.onPullDownRefresh();
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {
    this.controller.onReachBottom();
  },


  // ==================== 事件处理器 ====================

  /**
   * 点击档案项
   */
  onProfileTap(e) {
    const profileId = e.currentTarget.dataset.id;
    this.controller.selectProfile(profileId);
    
    // 跳转到卡牌页面显示档案的八字卡牌
    wx.switchTab({
      url: '/pages/card/index',
      success: () => {
        log.debug('navigateToCard', '成功跳转到卡牌页面');
      },
      fail: (error) => {
        log.error('navigateToCard', '跳转失败', { error: error.errMsg });
      }
    });
  },

  /**
   * 添加新档案
   */
  onAddProfile() {
    this.controller.addProfile();
  },

  /**
   * 编辑档案
   */
  onEditProfile(e) {
    const profileId = e.currentTarget.dataset.id;
    this.controller.editProfile(profileId);
  },

  /**
   * 删除档案
   */
  onDeleteProfile(e) {
    const profileId = e.currentTarget.dataset.id;
    this.controller.deleteProfile(profileId);
  },

  /**
   * 升级卡片点击处理
   */
  onUpgradeCardTap() {
    this.controller.showQuotaExceededDialog();
  },

  /**
   * 关闭升级卡片
   */
  onCloseUpgradeCard() {
    this.setData({ showUpgradeCard: false });
  }
})
