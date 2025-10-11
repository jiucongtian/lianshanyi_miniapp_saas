/**
 * 个人中心页面控制器
 * 处理个人中心相关的业务逻辑，包括用户信息管理、缓存清理、设置等
 * 
 * 使用方式：
 * 1. 在页面中创建MineController实例
 * 2. 调用initialize()方法初始化页面
 * 3. 使用各种方法处理用户交互
 * 
 * 示例：
 * ```javascript
 * const { MineController } = require('../../controllers/MineController');
 * 
 * Page({
 *   onLoad(options) {
 *     this.controller = new MineController(this);
 *     this.controller.initialize();
 *   }
 * });
 * ```
 */

const { BaseController } = require('./BaseController');
const { userService } = require('../services/UserService');
const { imageCacheManager } = require('../utils/imageCacheManager');
const { profileManager } = require('../utils/profileManager');

class MineController extends BaseController {
  /**
   * 构造函数
   * @param {Object} page - 页面实例
   */
  constructor(page) {
    super(page);
    
    // 用户信息
    this.userInfo = null;
    this.userTypeText = '';
    this.genderText = '';
    this.phoneNumberText = '';
    this.avatarUrl = '';
    
    // 页面状态
    this.loading = true;
    this.error = '';
  }

  // ==================== 公共方法 ====================

  /**
   * 初始化页面
   */
  async initialize() {
    console.log('[MineController] 开始初始化页面');
    
    try {
      // 加载用户信息
      await this.loadUserInfo();
      
      console.log('[MineController] 页面初始化完成');
    } catch (error) {
      console.error('[MineController] 页面初始化失败:', error);
      this._handleError(error, '页面初始化');
    }
  }

  /**
   * 加载用户信息
   */
  async loadUserInfo() {
    console.log('[MineController] 开始加载用户信息');
    
    try {
      this._setData({ loading: true, error: '' });
      
      const result = await userService.getUserInfo();
      
      if (result.success) {
        const userInfo = result.data;
        console.log('[MineController] 获取到用户信息:', userInfo);
        
        // 处理用户信息显示
        this._processUserInfo(userInfo);
        
        // 处理头像缓存
        await this._processAvatarCache(userInfo);
        
        this.userInfo = userInfo;
        this._setData({
          userInfo: userInfo,
          loading: false
        });
        
        console.log('[MineController] 用户信息加载成功');
      } else {
        console.error('[MineController] 获取用户信息失败:', result.error);
        this._setData({
          error: result.error || '获取用户信息失败',
          loading: false
        });
      }
    } catch (error) {
      console.error('[MineController] 加载用户信息出错:', error);
      this._setData({
        error: error.message || '加载失败',
        loading: false
      });
    }
  }

  /**
   * 更新用户信息
   * @param {Object} userData - 要更新的用户数据
   * @returns {Promise<boolean>} 是否更新成功
   */
  async updateUserInfo(userData) {
    console.log('[MineController] 开始更新用户信息:', userData);
    
    try {
      this._showLoading('更新中...', true);
      
      const result = await userService.updateUserInfo(userData);
      
      this._hideLoading();
      
      if (result.success) {
        console.log('[MineController] 用户信息更新成功');
        
        // 更新本地用户信息
        this.userInfo = result.data;
        this._processUserInfo(result.data);
        
        this._setData({
          userInfo: result.data,
          userTypeText: this.userTypeText,
          genderText: this.genderText,
          phoneNumberText: this.phoneNumberText
        });
        
        this._showSuccess('更新成功');
        return true;
      } else {
        console.error('[MineController] 更新用户信息失败:', result.error);
        this._showError('更新失败：' + (result.error || '未知错误'));
        return false;
      }
    } catch (error) {
      console.error('[MineController] 更新用户信息异常:', error);
      this._hideLoading();
      this._handleError(error, '更新用户信息');
      return false;
    }
  }

  /**
   * 清理缓存
   * @returns {Promise<boolean>} 是否清理成功
   */
  async clearCache() {
    console.log('[MineController] 开始清理缓存');
    
    try {
      this._showLoading('清理缓存中...', true);
      
      // 清理图片缓存
      await imageCacheManager.clearCache();
      
      // 清理ProfileManager缓存
      profileManager.clearCache();
      
      // 清理本地存储中的临时数据
      try {
        wx.removeStorageSync('userDateTime');
        wx.removeStorageSync('editingProfile');
        console.log('[MineController] 本地存储清理完成');
      } catch (error) {
        console.error('[MineController] 清理本地存储失败:', error);
      }
      
      this._hideLoading();
      this._showSuccess('缓存清理完成');
      
      console.log('[MineController] 缓存清理成功');
      return true;
    } catch (error) {
      console.error('[MineController] 清理缓存异常:', error);
      this._hideLoading();
      this._handleError(error, '清理缓存');
      return false;
    }
  }

  /**
   * 显示设置
   */
  showSettings() {
    console.log('[MineController] 显示设置');
    
    const itemList = [
      '清理缓存',
      '关于我们',
      '用户协议',
      '隐私政策'
    ];
    
    wx.showActionSheet({
      itemList: itemList,
      success: (res) => {
        const index = res.tapIndex;
        switch (index) {
          case 0:
            this._handleClearCache();
            break;
          case 1:
            this._showAboutUs();
            break;
          case 2:
            this._showUserAgreement();
            break;
          case 3:
            this._showPrivacyPolicy();
            break;
        }
      }
    });
  }

  /**
   * 跳转到注册页面
   */
  onRegister() {
    console.log('[MineController] 用户点击注册按钮');
    this._navigateTo('/pages/register/index', {
      source: 'mine',
      returnUrl: '/pages/mine/index'
    });
  }

  /**
   * 编辑用户资料
   */
  onEditProfile() {
    console.log('[MineController] 用户点击编辑资料按钮');
    this._navigateTo('/pages/register/index', {
      source: 'edit',
      returnUrl: '/pages/mine/index'
    });
  }

  /**
   * 刷新页面数据
   */
  async onRefresh() {
    console.log('[MineController] 刷新页面数据');
    await this.loadUserInfo();
    wx.stopPullDownRefresh();
  }

  // ==================== 私有方法 ====================

  /**
   * 处理用户信息，格式化显示文本
   * @param {Object} userInfo - 用户信息
   * @private
   */
  _processUserInfo(userInfo) {
    // 处理用户类型（使用userType字段，与profile页面保持一致）
    const typeMap = {
      'guest': '临时用户',
      'normal': '探索者',
      'premium': '高级用户'
    };
    this.userTypeText = typeMap[userInfo.userType] || '临时用户';

    // 处理性别
    const genderMap = {
      0: '未知',
      1: '男',
      2: '女'
    };
    this.genderText = genderMap[userInfo.gender] || '未知';

    // 处理手机号
    this.phoneNumberText = userInfo.phoneNumber && userInfo.phoneNumber.trim() !== '' 
      ? userInfo.phoneNumber 
      : '未设置';
  }

  /**
   * 处理头像缓存
   * @param {Object} userInfo - 用户信息
   * @private
   */
  async _processAvatarCache(userInfo) {
    try {
      // 检查是否有头像URL
      if (!userInfo.avatarUrl || userInfo.avatarUrl.trim() === '') {
        console.log('[MineController] 用户未设置头像，使用默认头像');
        this.avatarUrl = '/static/icons/default-avatar.png';
        this._setData({ avatarUrl: this.avatarUrl });
        return;
      }

      // 检查是否是云存储路径
      if (userInfo.avatarUrl.startsWith('cloud://')) {
        console.log('[MineController] 检测到云存储头像，开始缓存处理:', userInfo.avatarUrl);
        
        // 使用云端的文件名
        const fileName = userInfo.avatarUrl.split('/').pop() || 'avatar.jpg';
        
        // 获取缓存后的头像路径
        const cachedAvatarPath = await imageCacheManager.getImagePath(
          userInfo.avatarUrl, 
          fileName
        );
        
        console.log('[MineController] 头像缓存处理完成:', cachedAvatarPath);
        this.avatarUrl = cachedAvatarPath;
        this._setData({ avatarUrl: this.avatarUrl });
      } else {
        // 非云存储路径，直接使用
        console.log('[MineController] 使用非云存储头像:', userInfo.avatarUrl);
        this.avatarUrl = userInfo.avatarUrl;
        this._setData({ avatarUrl: this.avatarUrl });
      }
    } catch (error) {
      console.error('[MineController] 头像缓存处理失败:', error);
      // 缓存失败时使用原始路径
      this.avatarUrl = userInfo.avatarUrl || '/static/icons/default-avatar.png';
      this._setData({ avatarUrl: this.avatarUrl });
    }
  }

  /**
   * 处理清理缓存操作
   * @private
   */
  async _handleClearCache() {
    const confirmed = await this._confirm(
      '清理缓存',
      '确定要清理所有缓存数据吗？这将删除已下载的图片和临时数据。',
      '确定清理',
      '取消'
    );
    
    if (confirmed) {
      await this.clearCache();
    }
  }

  /**
   * 显示关于我们
   * @private
   */
  _showAboutUs() {
    wx.showModal({
      title: '关于我们',
      content: '生命智慧卡牌\n版本：1.0.0\n\n通过八字分析，探索生命智慧，发现更好的自己。',
      showCancel: false,
      confirmText: '知道了'
    });
  }

  /**
   * 显示用户协议
   * @private
   */
  _showUserAgreement() {
    this._navigateTo('/pages/agreement/index', {
      type: 'user'
    });
  }

  /**
   * 显示隐私政策
   * @private
   */
  _showPrivacyPolicy() {
    this._navigateTo('/pages/agreement/index', {
      type: 'privacy'
    });
  }

  /**
   * 获取用户状态描述
   * @returns {string} 状态描述
   * @private
   */
  _getUserStatusDescription() {
    if (!this.userInfo) {
      return '用户信息加载中...';
    }
    
    if (this.userInfo.isPremium()) {
      return '高级用户，无限制创建档案';
    } else if (this.userInfo.isNormal()) {
      return `探索者，可创建${this.userInfo.profileQuota}个档案`;
    } else {
      return `临时用户，可创建${this.userInfo.profileQuota}个档案`;
    }
  }

  /**
   * 获取用户配额信息
   * @returns {Object} 配额信息
   * @private
   */
  _getQuotaInfo() {
    if (!this.userInfo) {
      return {
        used: 0,
        total: 0,
        remaining: 0,
        isUnlimited: false
      };
    }
    
    const used = this.userInfo.usedProfiles;
    const total = this.userInfo.profileQuota;
    const remaining = this.userInfo.getRemainingQuota();
    const isUnlimited = total === -1;
    
    return {
      used,
      total: isUnlimited ? '∞' : total,
      remaining: isUnlimited ? '∞' : remaining,
      isUnlimited
    };
  }

  // ==================== 生命周期方法 ====================

  /**
   * 页面显示时的处理
   */
  onShow() {
    console.log('[MineController] 页面显示');
    
    // 每次显示页面时刷新用户信息
    this.loadUserInfo();
    
    super.onShow();
  }

  /**
   * 页面隐藏时的处理
   */
  onHide() {
    console.log('[MineController] 页面隐藏');
    super.onHide();
  }

  /**
   * 页面卸载时的清理
   */
  onUnload() {
    console.log('[MineController] 页面卸载');
    super.onUnload();
  }

  /**
   * 下拉刷新处理
   */
  onPullDownRefresh() {
    this.onRefresh();
  }

  /**
   * 分享功能
   */
  onShareAppMessage() {
    return {
      title: '生命智慧卡牌',
      path: '/pages/addProfile/index',
      imageUrl: ''
    };
  }
}

module.exports = { MineController };
