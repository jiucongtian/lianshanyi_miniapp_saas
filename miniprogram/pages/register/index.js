// pages/register/index.js
const { RegisterController } = require('../../controllers/RegisterController');
const { createModuleLogger } = require('../../utils/logger/index');
const log = createModuleLogger('RegisterPage');

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
    
    // 临时文件路径（用于上传）
    tempAvatarPath: '',
    
    // 原始用户数据（用于变更检测）
    originalUserInfo: null,
    
    // 性别选项
    genderOptions: [],
    
    // 来源参数
    source: '', // 来源页面或功能
    returnUrl: '' // 注册成功后跳转的页面
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    log.info('onLoad', '页面加载', { options });
    this.controller = new RegisterController(this);
    this.controller.initialize(options);
  },

  /**
   * 选择头像回调
   */
  onChooseAvatar(e) {
    this.controller.onChooseAvatar(e);
  },

  /**
   * 昵称输入处理
   */
  onNickNameInput(e) {
    this.controller.onNickNameInput(e);
  },

  /**
   * 性别选择处理
   */
  onGenderChange(e) {
    this.controller.onGenderChange(e);
  },

  /**
   * 手机号输入处理
   */
  onPhoneNumberInput(e) {
    this.controller.onPhoneNumberInput(e);
  },

  /**
   * 用户协议同意状态切换
   */
  onAgreeTermsChange(e) {
    this.controller.onAgreeTermsChange(e);
  },

  /**
   * 查看用户协议
   */
  onViewTerms() {
    this.controller.onViewTerms();
  },

  /**
   * 提交注册
   */
  async onSubmitRegister() {
    await this.controller.submitRegister();
  },

  /**
   * 跳过注册（继续使用临时账户）
   */
  onSkipRegister() {
    this.controller.skipRegister();
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    return {
      title: '生命智慧卡牌 - 智慧分析',
      path: '/pages/profile/index'
    };
  }
})
