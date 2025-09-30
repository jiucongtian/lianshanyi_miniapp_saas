// pages/mine/index.js
const { userManager } = require('../../utils/userManager');

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
    phoneNumberText: ''
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
      
      // 调用云函数获取用户信息
      const result = await this.callUserManagementCloudFunction('getUserInfo');
      
      if (result.success) {
        const userInfo = result.data;
        console.log('获取到用户信息:', userInfo);
        
        // 处理用户信息显示
        this.processUserInfo(userInfo);
        
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
      'normal': '普通用户',
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


  /**
   * 调用用户管理云函数
   */
  async callUserManagementCloudFunction(action, data = {}) {
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'userManagement',
        data: {
          action: action,
          data: data
        },
        success: (res) => {
          console.log('云函数调用成功:', res);
          resolve(res.result);
        },
        fail: (error) => {
          console.error('云函数调用失败:', error);
          reject(error);
        }
      });
    });
  }
})
