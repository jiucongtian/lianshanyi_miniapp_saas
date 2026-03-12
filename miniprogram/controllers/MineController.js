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
const { imageCacheManager } = require('../utils/manager/imageCacheManager');
const { profileManager } = require('../utils/manager/profileManager');
const { AdminPermissionChecker } = require('../utils/AdminPermissionChecker');

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
    
    // 管理员菜单配置
    this.adminMenus = [
      {
        id: 'admin_dashboard',
        title: '管理后台',
        icon: 'dashboard',
        show: false
      },
      {
        id: 'admin_users',
        title: '用户管理',
        icon: 'user',
        show: false
      },
      {
        id: 'admin_profiles',
        title: '档案管理',
        icon: 'folder',
        show: false
      },
      {
        id: 'admin_statistics',
        title: '数据统计',
        icon: 'chart',
        show: false
      }
    ];
  }

  // ==================== 公共方法 ====================

  /**
   * 初始化页面
   */
  async initialize() {
    this._log('initialize', '开始初始化页面');
    
    try {
      // 设置加载状态
      this._setData({ loading: true, error: '' });
      
      // 加载用户信息
      await this.loadUserInfo();
      
      // 更新页面显示
      this._updateUserInfoToPage();
      
      this._log('initialize', '页面初始化完成');
    } catch (error) {
      this._error('initialize', '页面初始化失败:', error);
      // 确保加载状态被清除
      this._setData({ loading: false });
      this._handleError(error, '页面初始化');
    }
  }

  /**
   * 更新用户信息到页面（MineController特有的处理）
   * @private
   */
  _updateUserInfoToPage() {
    if (!this.userInfo) {
      this._log('_updateUserInfoToPage', '用户信息为空，显示默认状态');
      
      // 理论上不应该走到这里，因为globalUserManager会自动创建用户
      // 但为了容错，还是提供默认显示
      this._setData({
        userInfo: null,
        userTypeText: '临时用户',
        genderText: '未知',
        phoneNumberText: '未设置',
        avatarUrl: '/static/icons/default-avatar.png',
        loading: false,
        error: ''
      });
      return;
    }
    
    try {
      // 处理用户信息显示
      this._processUserInfo(this.userInfo);
      
      // 处理头像缓存
      this._processAvatarCache(this.userInfo);
      
      // 处理管理员菜单显示
      this._updateAdminMenus(this.userInfo);
      
      // 判断是否显示助学童子入口：管理员或高级用户
        const showAssistantEntry = this.userInfo.userType === 'admin' ||
                                    this.userInfo.userType === 'super_admin' ||
                                    this.userInfo.userType === 'premium';

        this._setData({
          userInfo: this.userInfo,
          userTypeText: this.userTypeText,
          genderText: this.genderText,
          phoneNumberText: this.phoneNumberText,
          adminMenus: this.adminMenus,
          isAdmin: this.userInfo.isAdmin(),
          adminRoleName: this.userInfo.getAdminRoleName(),
          showAssistantEntry: showAssistantEntry,
          loading: false,
          error: ''
        });
      
      this._log('_updateUserInfoToPage', '用户信息已更新到页面');
    } catch (error) {
      this._error('_updateUserInfoToPage', '更新用户信息到页面失败:', error);
      // 即使出错，也要清除加载状态
      this._setData({ loading: false });
    }
  }

  /**
   * 更新用户信息
   * @param {Object} userData - 要更新的用户数据
   * @returns {Promise<boolean>} 是否更新成功
   */
  async updateUserInfo(userData) {
    this._log('updateUserInfo', '开始更新用户信息:', userData);
    
    try {
      this._showLoading('更新中...', true);
      
      const result = await userService.updateUserInfo(userData);
      
      this._hideLoading();
      
      if (result.success) {
        this._log('updateUserInfo', '用户信息更新成功');
        
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
        this._error('updateUserInfo', '更新用户信息失败:', result.error);
        this._showError('更新失败：' + (result.error || '未知错误'));
        return false;
      }
    } catch (error) {
      this._error('updateUserInfo', '更新用户信息异常:', error);
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
    this._log('clearCache', '开始清理缓存');
    
    try {
      this._showLoading('清理缓存中...', true);
      
      // 清理图片缓存
      await imageCacheManager.clearAllCache();
      
      // 清理ProfileManager缓存
      profileManager.clearCache();
      
      // 清理本地存储中的临时数据
      try {
        wx.removeStorageSync('userDateTime');
        wx.removeStorageSync('editingProfile');
        this._log('clearCache', '本地存储清理完成');
      } catch (error) {
        this._error('clearCache', '清理本地存储失败:', error);
      }
      
      this._hideLoading();
      this._showSuccess('缓存清理完成');
      
      this._log('clearCache', '缓存清理成功');
      return true;
    } catch (error) {
      this._error('clearCache', '清理缓存异常:', error);
      this._hideLoading();
      this._handleError(error, '清理缓存');
      return false;
    }
  }

  /**
   * 显示设置
   */
  showSettings() {
    this._log('showSettings', '显示设置');
    
    // 所有用户显示相同的菜单项
    const itemList = [
      '编辑用户资料',
      '查看缓存信息',
      '清理缓存',
      '用户协议'
    ];
    
    wx.showActionSheet({
      itemList: itemList,
      success: (res) => {
        const index = res.tapIndex;
        
        switch (index) {
          case 0:
            this.onEditProfile();
            break;
          case 1:
            this._showCacheInfo();
            break;
          case 2:
            this._handleClearCache();
            break;
          case 3:
            this._showUserAgreement();
            break;
        }
      }
    });
  }

  /**
   * 跳转到注册页面
   */
  onRegister() {
    this._log('onRegister', '用户点击注册按钮');
    this._navigateTo('/pages/register/index', {
      source: 'mine',
      returnUrl: '/pages/mine/index'
    });
  }

  /**
   * 编辑用户资料
   */
  onEditProfile() {
    this._log('onEditProfile', '用户点击编辑资料按钮');
    this._navigateTo('/pages/register/index', {
      source: 'edit',
      returnUrl: '/pages/mine/index'
    });
  }

  /**
   * 处理管理员菜单点击事件
   * @param {string} menuId - 菜单ID
   */
  onAdminMenuTap(menuId) {
    this._log('onAdminMenuTap', '管理员菜单点击:', menuId);
    
    // 检查权限
    if (!this.userInfo || !this.userInfo.isAdmin()) {
      this._showError('无权限访问管理功能');
      return;
    }
    
    // 暂时显示提示，后续实现具体功能
    const menu = this.adminMenus.find(m => m.id === menuId);
    const menuTitle = menu ? menu.title : menuId;
    
    wx.showModal({
      title: '功能开发中',
      content: `${menuTitle}功能正在开发中，敬请期待。`,
      showCancel: false,
      confirmText: '知道了'
    });
  }

  /**
   * 跳转到微信小店
   */
  onStoreTap() {
    this._log('onStoreTap', '用户点击微信小店入口');
    this._navigateTo('/pages/store/index');
  }

  /**
   * 打开用户使用手册
   */
  onUserManualTap() {
    this._log('onUserManualTap', '用户点击使用手册入口');
    
    const { config } = require('../config/index');
    
    // 构建静态托管URL
    const staticHostingUrl = config.staticHosting?.baseUrl || '';
    const manualPath = config.staticHosting?.userManualPath || '/user-manual.html';
    
    if (!staticHostingUrl) {
      this._showError('静态托管URL未配置，请联系管理员');
      this._error('onUserManualTap', '静态托管URL未配置');
      return;
    }
    
    const manualUrl = `${staticHostingUrl}${manualPath}`;
    
    this._log('onUserManualTap', '跳转到使用手册:', manualUrl);
    
    // 跳转到webview页面
    // 注意：不需要手动编码，_navigateTo方法会自动处理
    this._navigateTo('/pages/webview/index', {
      url: manualUrl,
      title: '使用手册'
    });
  }

  /**
   * 刷新页面数据
   */
  async onRefresh() {
    this._log('onRefresh', '刷新页面数据');
    
    // 使用父类的刷新方法
    await this.refreshUserInfo();
    
    // 更新页面数据
    this._updateUserInfoToPage();
    
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
      'premium': '高级用户',
      'admin': '管理员'
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
        this._log('_processAvatarCache', '用户未设置头像，使用默认头像');
        this.avatarUrl = '/static/icons/default-avatar.png';
        this._setData({ avatarUrl: this.avatarUrl });
        return;
      }

      // 检查是否是云存储路径
      if (userInfo.avatarUrl.startsWith('cloud://')) {
        this._log('_processAvatarCache', '检测到云存储头像，开始缓存处理:', userInfo.avatarUrl);
        
        // 使用云端的文件名
        const fileName = userInfo.avatarUrl.split('/').pop() || 'avatar.jpg';
        
        // 获取缓存后的头像路径
        const cachedAvatarPath = await imageCacheManager.getImagePath(
          userInfo.avatarUrl, 
          fileName
        );
        
        this._log('_processAvatarCache', '头像缓存处理完成:', cachedAvatarPath);
        this.avatarUrl = cachedAvatarPath;
        this._setData({ avatarUrl: this.avatarUrl });
      } else {
        // 非云存储路径，直接使用
        this._log('_processAvatarCache', '使用非云存储头像:', userInfo.avatarUrl);
        this.avatarUrl = userInfo.avatarUrl;
        this._setData({ avatarUrl: this.avatarUrl });
      }
    } catch (error) {
      this._error('_processAvatarCache', '头像缓存处理失败:', error);
      // 缓存失败时使用原始路径
      this.avatarUrl = userInfo.avatarUrl || '/static/icons/default-avatar.png';
      this._setData({ avatarUrl: this.avatarUrl });
    }
  }

  /**
   * 显示缓存信息
   * @private
   */
  _showCacheInfo() {
    this._log('_showCacheInfo', '跳转到缓存信息页面');
    this._navigateTo('/pages/cacheInfo/index');
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
   * 更新管理员菜单显示状态
   * @param {Object} userInfo - 用户信息
   * @private
   */
  _updateAdminMenus(userInfo) {
    if (!userInfo) {
      this._log('_updateAdminMenus', '用户信息为空，隐藏所有管理员菜单');
      this.adminMenus = this.adminMenus.map(menu => ({
        ...menu,
        show: false
      }));
      return;
    }
    
    // 检查是否为管理员（任何级别的管理员都显示菜单）
    const isAdmin = AdminPermissionChecker.isAdmin(userInfo.adminRole);
    
    this._log('_updateAdminMenus', `用户管理员角色: ${userInfo.adminRole}, 是否为管理员: ${isAdmin}`);
    
    // 根据管理员权限显示菜单
    this.adminMenus = this.adminMenus.map(menu => ({
      ...menu,
      show: isAdmin
    }));
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
  async onShow() {
    this._log('onShow', '页面显示');
    
    // 调用父类的onShow，会自动加载用户信息
    await super.onShow();
    
    // 更新页面数据（如果需要特殊处理）
    this._updateUserInfoToPage();
  }

  /**
   * 页面隐藏时的处理
   */
  onHide() {
    this._log('onHide', '页面隐藏');
    super.onHide();
  }

  /**
   * 页面卸载时的清理
   */
  onUnload() {
    this._log('onUnload', '页面卸载');
    super.onUnload();
  }

  /**
   * 下拉刷新处理
   */
  onPullDownRefresh() {
    this.onRefresh();
  }

}

module.exports = { MineController };
