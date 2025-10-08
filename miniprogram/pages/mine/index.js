// pages/mine/index.js
const { userManager } = require('../../utils/userManager');
const { userService } = require('../../services/index');
const { imageCacheManager } = require('../../utils/imageCacheManager');

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
    avatarUrl: '' // 缓存后的头像路径
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    console.log('我的页面加载');
    this.loadUserInfo();
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 每次显示页面时刷新用户信息
    this.loadUserInfo();
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.loadUserInfo();
    wx.stopPullDownRefresh();
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  /**
   * 加载用户信息
   */
  async loadUserInfo() {
    try {
      this.setData({ loading: true, error: '' });
      
      console.log('开始加载用户信息...');
      
      // 调用UserService获取用户信息
      const result = await userService.getUserInfo();
      
      if (result.success) {
        const userInfo = result.data;
        console.log('获取到用户信息:', userInfo);
        
        // 处理用户信息显示
        this.processUserInfo(userInfo);
        
        // 处理头像缓存
        await this.processAvatarCache(userInfo);
        
        this.setData({
          userInfo: userInfo,
          loading: false
        });
      } else {
        console.error('获取用户信息失败:', result.error);
        this.setData({
          error: result.error || '获取用户信息失败',
          loading: false
        });
      }
    } catch (error) {
      console.error('加载用户信息出错:', error);
      this.setData({
        error: error.message || '加载失败',
        loading: false
      });
    }
  },

  /**
   * 处理用户信息，格式化显示文本
   */
  processUserInfo(userInfo) {
    // 处理用户类型（使用userType字段，与profile页面保持一致）
    const typeMap = {
      'guest': '临时用户',
      'normal': '探索者',
      'premium': '高级用户'
    };
    const userTypeText = typeMap[userInfo.userType] || '临时用户';

    // 处理性别
    const genderMap = {
      0: '未知',
      1: '男',
      2: '女'
    };
    const genderText = genderMap[userInfo.gender] || '未知';

    // 处理手机号
    const phoneNumberText = userInfo.phoneNumber && userInfo.phoneNumber.trim() !== '' 
      ? userInfo.phoneNumber 
      : '未设置';

    this.setData({
      userTypeText,
      genderText,
      phoneNumberText
    });
  },

  /**
   * 处理头像缓存
   * @param {Object} userInfo 用户信息
   */
  async processAvatarCache(userInfo) {
    try {
      // 检查是否有头像URL
      if (!userInfo.avatarUrl || userInfo.avatarUrl.trim() === '') {
        console.log('用户未设置头像，使用默认头像');
        this.setData({
          avatarUrl: '/static/icons/default-avatar.png'
        });
        return;
      }

      // 检查是否是云存储路径
      if (userInfo.avatarUrl.startsWith('cloud://')) {
        console.log('检测到云存储头像，开始缓存处理:', userInfo.avatarUrl);
        
        // 使用云端的文件名
        const fileName = userInfo.avatarUrl.split('/').pop() || 'avatar.jpg';
        
        // 获取缓存后的头像路径
        const cachedAvatarPath = await imageCacheManager.getImagePath(
          userInfo.avatarUrl, 
          fileName
        );
        
        console.log('头像缓存处理完成:', cachedAvatarPath);
        this.setData({
          avatarUrl: cachedAvatarPath
        });
      } else {
        // 非云存储路径，直接使用
        console.log('使用非云存储头像:', userInfo.avatarUrl);
        this.setData({
          avatarUrl: userInfo.avatarUrl
        });
      }
    } catch (error) {
      console.error('头像缓存处理失败:', error);
      // 缓存失败时使用原始路径
      this.setData({
        avatarUrl: userInfo.avatarUrl || '/static/icons/default-avatar.png'
      });
    }
  },

  /**
   * 跳转到注册页面
   */
  onRegister() {
    console.log('用户点击注册按钮');
    wx.navigateTo({
      url: '/pages/register/index?source=mine&returnUrl=/pages/mine/index',
      fail: (error) => {
        console.error('跳转注册页面失败:', error);
        wx.showToast({
          title: '跳转失败',
          icon: 'error'
        });
      }
    });
  },

  /**
   * 编辑用户资料
   */
  onEditProfile() {
    console.log('用户点击编辑资料按钮');
    wx.navigateTo({
      url: '/pages/register/index?source=edit&returnUrl=/pages/mine/index',
      fail: (error) => {
        console.error('跳转编辑页面失败:', error);
        wx.showToast({
          title: '跳转失败',
          icon: 'error'
        });
      }
    });
  },


})
