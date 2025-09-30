// pages/register/index.js
const { userManager } = require('../../utils/userManager');
const { permissionManager, USER_TYPES } = require('../../utils/permissionManager');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 用户信息
    userInfo: {
      nickName: '',
      avatarUrl: '',
      gender: 0, // 0:保密, 1:男, 2:女
      phoneNumber: ''
    },
    
    // 表单状态
    formValid: false,
    agreeTerms: false,
    loading: false,
    
    // 性别选项
    genderOptions: [
      { label: '保密', value: 0 },
      { label: '男', value: 1 },
      { label: '女', value: 2 }
    ],
    
    // 来源参数
    source: '', // 来源页面或功能
    returnUrl: '' // 注册成功后跳转的页面
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    console.log('注册页面加载，参数:', options);
    
    // 保存来源信息
    this.setData({
      source: options.source || '',
      returnUrl: options.returnUrl || ''
    });
    
    // 根据来源设置页面标题
    if (options.source === 'edit') {
      wx.setNavigationBarTitle({
        title: '编辑资料'
      });
    }
    
    // 尝试获取用户已有信息
    this.loadExistingUserInfo();
  },

  /**
   * 加载用户已有信息
   */
  async loadExistingUserInfo() {
    try {
      const currentUser = userManager.getCurrentUser();
      if (currentUser) {
        this.setData({
          'userInfo.nickName': currentUser.nickName || '',
          'userInfo.avatarUrl': currentUser.avatarUrl || '',
          'userInfo.gender': currentUser.gender || 0,
          'userInfo.phoneNumber': currentUser.phoneNumber || ''
        });
        this.validateForm();
      }
    } catch (error) {
      console.error('加载用户信息失败:', error);
    }
  },

  /**
   * 选择头像回调
   */
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    console.log('用户选择的头像:', avatarUrl);
    
    this.setData({
      'userInfo.avatarUrl': avatarUrl
    });
    
    this.validateForm();
    
    wx.showToast({
      title: '头像选择成功',
      icon: 'success',
      duration: 1500
    });
  },

  /**
   * 昵称输入处理
   */
  onNickNameInput(e) {
    this.setData({
      'userInfo.nickName': e.detail.value
    });
    this.validateForm();
  },

  /**
   * 性别选择处理
   */
  onGenderChange(e) {
    this.setData({
      'userInfo.gender': parseInt(e.detail.value)
    });
    this.validateForm();
  },

  /**
   * 手机号输入处理
   */
  onPhoneNumberInput(e) {
    this.setData({
      'userInfo.phoneNumber': e.detail.value
    });
    this.validateForm();
  },


  /**
   * 用户协议同意状态切换
   */
  onAgreeTermsChange(e) {
    this.setData({
      agreeTerms: e.detail.value
    });
    this.validateForm();
  },

  /**
   * 表单验证
   */
  validateForm() {
    const { userInfo, agreeTerms } = this.data;
    const isNickNameValid = userInfo.nickName.trim().length > 0;
    const isPhoneValid = this.validatePhoneNumber(userInfo.phoneNumber);
    const isValid = isNickNameValid && isPhoneValid && agreeTerms;
    
    this.setData({ formValid: isValid });
  },

  /**
   * 验证手机号格式
   */
  validatePhoneNumber(phoneNumber) {
    if (!phoneNumber || phoneNumber.trim() === '') {
      return true; // 手机号不是必填项
    }
    
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phoneNumber);
  },

  /**
   * 查看用户协议
   */
  onViewTerms() {
    wx.showModal({
      title: '用户协议',
      content: '这里是用户协议内容，包含用户权利义务、隐私保护等条款...',
      showCancel: false,
      confirmText: '我知道了'
    });
  },

  /**
   * 提交注册
   */
  async onSubmitRegister() {
    if (!this.data.formValid) {
      wx.showToast({
        title: '请完善信息',
        icon: 'error'
      });
      return;
    }

    try {
      this.setData({ loading: true });
      
      // 准备注册数据
      const { userInfo, source } = this.data;
      const registrationData = {
        nickName: userInfo.nickName.trim(),
        gender: userInfo.gender,
        avatarUrl: userInfo.avatarUrl || '',
        phoneNumber: userInfo.phoneNumber.trim() || ''
      };
      
      console.log('提交注册数据:', registrationData);
      
      let result;
      if (source === 'edit') {
        // 编辑模式：更新用户信息
        result = await userManager.updateUserInfo(registrationData);
      } else {
        // 注册模式：升级用户类型为普通用户
        result = await userManager.upgradeUserType(USER_TYPES.NORMAL, registrationData);
      }
      
      this.setData({ loading: false });
      
      if (result.success) {
        wx.showToast({
          title: source === 'edit' ? '更新成功！' : '注册成功！',
          icon: 'success',
          duration: 2000
        });
        
        // 延迟跳转，让用户看到成功提示
        setTimeout(() => {
          this.handleRegistrationSuccess();
        }, 2000);
      } else {
        console.error('操作失败:', result);
        wx.showToast({
          title: result.error || (source === 'edit' ? '更新失败' : '注册失败'),
          icon: 'error',
          duration: 3000
        });
      }
    } catch (error) {
      console.error('操作过程出错:', error);
      this.setData({ loading: false });
      wx.showToast({
        title: this.data.source === 'edit' ? '更新失败，请重试' : '注册失败，请重试',
        icon: 'error'
      });
    }
  },

  /**
   * 处理注册成功后的跳转
   */
  handleRegistrationSuccess() {
    const { returnUrl, source } = this.data;
    
    if (returnUrl) {
      // 如果有指定返回页面，跳转到指定页面
      wx.navigateTo({
        url: returnUrl,
        fail: () => {
          // 如果跳转失败，回到首页
          wx.switchTab({
            url: '/pages/profile/index'
          });
        }
      });
    } else if (source === 'profile_limit') {
      // 如果来源是档案数量限制，跳转到档案页面
      wx.switchTab({
        url: '/pages/profile/index'
      });
    } else {
      // 默认跳转到档案页面
      wx.switchTab({
        url: '/pages/profile/index'
      });
    }
  },

  /**
   * 跳过注册（继续使用临时账户）
   */
  onSkipRegister() {
    wx.showModal({
      title: '确认跳过注册？',
      content: '跳过注册将继续使用临时账户，功能受限。建议完成注册以获得完整体验。',
      confirmText: '跳过',
      cancelText: '继续注册',
      success: (res) => {
        if (res.confirm) {
          // 用户确认跳过，返回上一页或首页
          if (getCurrentPages().length > 1) {
            wx.navigateBack();
          } else {
            wx.switchTab({
              url: '/pages/profile/index'
            });
          }
        }
      }
    });
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
    return {
      title: '连山易 - 生辰八字智能分析',
      path: '/pages/profile/index'
    };
  }
})
