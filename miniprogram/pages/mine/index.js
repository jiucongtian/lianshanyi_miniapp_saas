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
    locationText: '',
    createTimeText: '',
    lastLoginTimeText: ''
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

    // 处理地区（已移除相关字段）
    let locationText = '未设置';

    // 处理时间格式
    const createTimeText = this.formatDateTime(userInfo.createTime);
    const lastLoginTimeText = userInfo.lastLoginTime ? 
      this.formatDateTime(userInfo.lastLoginTime) : '从未登录';

    this.setData({
      userTypeText,
      genderText,
      locationText,
      createTimeText,
      lastLoginTimeText
    });
  },

  /**
   * 格式化日期时间
   */
  formatDateTime(dateString) {
    if (!dateString) return '未知';
    
    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    } catch (error) {
      console.error('日期格式化失败:', error);
      return '格式错误';
    }
  },

  /**
   * 刷新用户信息
   */
  refreshUserInfo() {
    console.log('刷新用户信息');
    this.loadUserInfo();
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
