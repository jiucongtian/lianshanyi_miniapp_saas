/**
 * 档案页面控制器
 * 处理档案页面相关的业务逻辑，包括档案列表管理、用户信息管理、档案操作等
 * 
 * 使用方式：
 * 1. 在页面中创建ProfileController实例
 * 2. 调用initialize()方法初始化页面
 * 3. 使用各种方法处理用户交互
 * 
 * 示例：
 * ```javascript
 * const { ProfileController } = require('../../controllers/ProfileController');
 * 
 * Page({
 *   onLoad() {
 *     this.controller = new ProfileController(this);
 *     this.controller.initialize();
 *   }
 * });
 * ```
 */

const { BaseController } = require('./BaseController');
const { profileService } = require('../services/ProfileService');
const { profileManager } = require('../utils/manager/profileManager');
const eventBus = require('../utils/eventBus');
const { PROFILE_EVENTS, SYSTEM_EVENTS } = require('../utils/eventTypes');

class ProfileController extends BaseController {
  /**
   * 构造函数
   * @param {Object} page - 页面实例
   */
  constructor(page) {
    super(page);
    
    // 页面状态
    this.currentPage = 1;
    this.pageSize = 20;
    this.hasMore = true;
    this.isLoading = false;
    
    // 用户信息
    this.userInfo = null;
    
    // 档案列表
    this.profileList = [];
    this.currentProfileId = null;
    this.pendingSelectProfileId = null;
    
    // 绑定事件处理器
    this._bindEventHandlers();
  }

  // ==================== 公共方法 ====================

  /**
   * 初始化页面
   * 加载用户信息和档案列表
   */
  async initialize() {
    this._log('initialize', '开始初始化页面');
    
    try {
      // 并行加载用户信息和档案列表
      await Promise.all([
        this.loadUserInfo(),
        this.loadProfiles()
      ]);
      
      this._log('initialize', '页面初始化完成');
    } catch (error) {
      this._error('initialize', '页面初始化失败', error);
      this._handleError(error, '页面初始化');
    }
  }

  /**
   * 加载用户信息
   * @param {boolean} forceRefresh - 是否强制刷新，默认false
   * @returns {Promise<void>}
   */
  async loadUserInfo(forceRefresh = false) {
    this._log('loadUserInfo', '开始加载用户信息', { forceRefresh });
    
    try {
      // 使用 BaseController 的统一方法，它会使用 GlobalUserManager
      const userInfo = await super.loadUserInfo(forceRefresh);
      
      if (userInfo) {
        this.userInfo = userInfo; // 已经是UserBean实例
        
        // 更新页面数据
        this._setData({
          userType: this.userInfo.userType,
          userTypeName: this.userInfo.getDisplayName(),
          profileQuota: this.userInfo.profileQuota,
          usedProfiles: this.userInfo.usedProfiles,
          canCreateMore: this.userInfo.canCreateMore()
        });
        
        this._log('loadUserInfo', '用户信息加载成功', {
          userType: this.userInfo.userType,
          profileQuota: this.userInfo.profileQuota,
          usedProfiles: this.userInfo.usedProfiles
        });
      } else {
        this._error('loadUserInfo', '获取用户信息失败');
        this._showError('获取用户信息失败');
      }
    } catch (error) {
      this._error('loadUserInfo', '加载用户信息异常', error);
      this._handleError(error, '加载用户信息');
    }
  }

  /**
   * 加载档案列表
   * @param {number} page - 页码，默认1
   * @param {number} limit - 每页数量，默认20
   * @param {boolean} isRefresh - 是否为刷新操作，默认false
   * @returns {Promise<void>}
   */
  async loadProfiles(page = 1, limit = 20, isRefresh = false) {
    if (this.isLoading) {
      this._log('loadProfiles', '正在加载中，跳过重复请求');
      return;
    }
    
    this._log('loadProfiles', '开始加载档案列表', { page, limit });
    
    this.isLoading = true;
    this._setLoading(true, '加载中...');
    
    try {
      const response = await profileService.getProfiles({
        page: page,
        limit: limit
      });

      if (response.success && response.data) {
        const { profiles, hasMore } = response.data;
        
        // 更新ProfileManager
        if (isRefresh || page === 1) {
          profileManager.initialize(profiles);
          this.profileList = profileManager.getProfileList();
        } else {
          // 追加模式
          profiles.forEach(profile => profileManager.addProfile(profile));
          this.profileList = profileManager.getProfileList();
        }
        
        // 更新分页状态
        this.currentPage = page;
        this.hasMore = hasMore;
        
        // 更新页面数据
        this._setData({
          profileList: this.profileList,
          loading: false
        });
        
        // 处理档案选中逻辑
        this._handleProfileSelection();
        
        this._log('loadProfiles', '档案列表加载成功', { count: this.profileList.length });
      } else {
        this._error('loadProfiles', '获取档案列表失败', null, response.error);
        this._showError('获取档案列表失败：' + (response.error || '未知错误'));
      }
    } catch (error) {
      this._error('loadProfiles', '加载档案列表异常', error);
      this._handleError(error, '加载档案列表');
    } finally {
      this.isLoading = false;
      this._setLoading(false);
    }
  }

  /**
   * 刷新档案列表
   * @returns {Promise<void>}
   */
  async refreshProfiles() {
    this._log('refreshProfiles', '开始刷新档案列表');
    
    try {
      await this.loadProfiles(1, this.pageSize, true);
      
      // 停止下拉刷新
      wx.stopPullDownRefresh();
      this._showSuccess('刷新成功');
    } catch (error) {
      this._error('refreshProfiles', '刷新档案列表失败', error);
      wx.stopPullDownRefresh();
      this._showError('刷新失败');
    }
  }

  /**
   * 加载更多档案
   * @returns {Promise<void>}
   */
  async loadMoreProfiles() {
    if (!this.hasMore || this.isLoading) {
      this._log('loadMoreProfiles', '没有更多数据或正在加载中');
      return;
    }
    
    this._log('loadMoreProfiles', '开始加载更多档案', { page: this.currentPage + 1 });
    
    try {
      await this.loadProfiles(this.currentPage + 1, this.pageSize, false);
    } catch (error) {
      this._error('loadMoreProfiles', '加载更多档案失败', error);
      this._showError('加载更多失败');
    }
  }

  /**
   * 选择档案
   * @param {string} profileId - 档案ID
   * @returns {Promise<void>}
   */
  async selectProfile(profileId) {
    this._log('selectProfile', '选择档案', { profileId });
    
    try {
      // 从ProfileManager获取档案
      const selectedProfile = profileManager.getProfileById(profileId);
      
      if (!selectedProfile) {
        this._error('selectProfile', '未找到档案数据', null, profileId);
        this._showError('档案数据异常');
        return;
      }
      
      // 设置当前档案
      profileManager.setCurrentProfile(selectedProfile);
      this.currentProfileId = profileId;
      
      // 更新页面状态
      this._setData({ currentProfileId: profileId });
      
      this._log('selectProfile', '档案选择成功', { name: selectedProfile.profileName });
      
      // 触发档案选中事件
      eventBus.emit(PROFILE_EVENTS.PROFILE_SELECTED, {
        profileId: profileId,
        profile: selectedProfile
      });
      
    } catch (error) {
      this._error('selectProfile', '选择档案失败', error);
      this._handleError(error, '选择档案');
    }
  }

  /**
   * 删除档案
   * @param {string} profileId - 档案ID
   * @returns {Promise<void>}
   */
  async deleteProfile(profileId) {
    this._log('deleteProfile', '开始删除档案', { profileId });
    
    try {
      // 显示确认对话框
      const profile = profileManager.getProfileById(profileId);
      const profileName = profile ? profile.profileName : '未知档案';
      
      const confirmed = await this._confirm(
        '确认删除',
        `确定要删除档案"${profileName}"吗？删除后无法恢复。`,
        '删除',
        '取消'
      );
      
      if (!confirmed) {
        this._log('deleteProfile', '用户取消删除操作');
        return;
      }
      
      // 显示加载提示
      this._showLoading('删除中...', true);
      
      // 调用删除服务
      const response = await profileService.deleteProfile(profileId);
      
      this._hideLoading();
      
      if (response.success) {
        this._log('deleteProfile', '档案删除成功', { profileId });
        
        // 从ProfileManager中移除档案
        profileManager.removeProfile(profileId);
        
        // 更新本地列表
        this.profileList = profileManager.getProfileList();
        
        // 处理当前选中档案被删除的情况
        if (this.currentProfileId === profileId) {
          this._handleDeletedCurrentProfile();
        }
        
        // 更新页面数据
        this._setData({
          profileList: this.profileList,
          currentProfileId: this.currentProfileId
        });
        
        // 触发档案列表刷新事件
        eventBus.emit(PROFILE_EVENTS.PROFILE_LIST_REFRESH);
        
        this._showSuccess('删除成功');
      } else {
        this._error('deleteProfile', '删除档案失败', response.error);
        this._showError('删除失败：' + (response.error || '未知错误'));
      }
    } catch (error) {
      this._error('deleteProfile', '删除档案异常', error);
      this._hideLoading();
      this._handleError(error, '删除档案');
    }
  }

  /**
   * 显示配额超限对话框
   */
  showQuotaExceededDialog() {
    if (!this.userInfo) {
      this._warn('showQuotaExceededDialog', '用户信息未加载，无法显示配额对话框');
      return;
    }
    
    const { profileQuota, userType } = this.userInfo;
    
    let content = `档案数量已达上限（${profileQuota}个）`;
    let confirmText = '我知道了';
    let showUpgrade = false;
    
    // 根据用户类型显示不同的升级提示
    if (userType === 'guest') {
      content += '\n注册成为探索者可创建50个档案';
      confirmText = '立即注册';
      showUpgrade = true;
    } else if (userType === 'normal') {
      content += '\n升级高级版可无限制创建档案';
      confirmText = '了解详情';
      showUpgrade = true;
    }
    
    wx.showModal({
      title: '档案数量限制',
      content: content,
      confirmText: confirmText,
      cancelText: '取消',
      success: (res) => {
        if (res.confirm && showUpgrade) {
          this._handleUpgradeAction();
        }
      }
    });
  }

  /**
   * 添加新档案
   */
  addProfile() {
    // 检查是否可以创建更多档案
    if (!this.userInfo || !this.userInfo.canCreateMore()) {
      this.showQuotaExceededDialog();
      return;
    }
    
    this._log('addProfile', '跳转到添加档案页面');
    this._navigateTo('/pages/addProfile/index');
  }

  /**
   * 编辑档案
   * @param {string} profileId - 档案ID
   */
  editProfile(profileId) {
    this._log('editProfile', '编辑档案', { profileId });
    
    try {
      // 从ProfileManager获取档案数据
      const profile = profileManager.getProfileById(profileId);
      
      if (!profile) {
        this._error('editProfile', '未找到要编辑的档案数据', null, profileId);
        this._showError('档案数据异常');
        return;
      }
      
      // 将档案数据存储到本地存储，供编辑页面使用
      wx.setStorageSync('editingProfile', profile.toObject());
      
      this._log('editProfile', '档案数据已存储，准备跳转到编辑页面');
      
      this._navigateTo('/pages/addProfile/index', { mode: 'edit' });
      
    } catch (error) {
      this._error('editProfile', '编辑档案失败', error);
      this._handleError(error, '编辑档案');
    }
  }

  // ==================== 私有方法 ====================

  /**
   * 绑定事件处理器
   * @private
   */
  _bindEventHandlers() {
    // 保存绑定后的函数引用，以便后续解绑
    this._boundHandlers = {
      profileSelected: this._handleSelectProfileEvent.bind(this),
      profileListRefresh: this._handleProfileListRefreshEvent.bind(this),
      profileManagerReady: this._handleProfileManagerReady.bind(this)
    };
    
    // 监听档案选中事件
    eventBus.on(PROFILE_EVENTS.PROFILE_SELECTED, this._boundHandlers.profileSelected);
    
    // 监听档案列表刷新事件
    eventBus.on(PROFILE_EVENTS.PROFILE_LIST_REFRESH, this._boundHandlers.profileListRefresh);
    
    // 监听ProfileManager初始化完成事件
    eventBus.once(SYSTEM_EVENTS.PROFILE_MANAGER_READY, this._boundHandlers.profileManagerReady);
  }

  /**
   * 处理档案选中事件
   * @param {Object} data - 事件数据
   * @private
   */
  _handleSelectProfileEvent(data) {
    this._log('_handleSelectProfileEvent', '收到档案选中事件', data);
    
    if (data && data.profileId) {
      this.pendingSelectProfileId = data.profileId;
      this._handleProfileSelection();
    }
  }

  /**
   * 处理档案列表刷新事件
   * @private
   */
  _handleProfileListRefreshEvent() {
    this._log('_handleProfileListRefreshEvent', '收到档案列表刷新事件');
    
    // 从ProfileManager获取最新数据
    this.profileList = profileManager.getProfileList();
    
    // 更新已使用档案数量和配额信息
    const usedProfiles = this.profileList.length;
    const profileQuota = this.userInfo ? this.userInfo.profileQuota : 3;
    const canCreateMore = profileQuota === -1 || usedProfiles < profileQuota;
    
    this._setData({ 
      profileList: this.profileList,
      usedProfiles: usedProfiles,
      canCreateMore: canCreateMore
    });
    
    this._log('_handleProfileListRefreshEvent', '档案列表和配额信息已更新', {
      usedProfiles,
      profileQuota,
      canCreateMore
    });
  }

  /**
   * 处理ProfileManager初始化完成事件
   * @private
   */
  _handleProfileManagerReady() {
    this._log('_handleProfileManagerReady', 'ProfileManager初始化完成');
    
    // 如果ProfileManager已初始化，直接加载数据
    if (profileManager.isReady()) {
      this.loadDataFromProfileManager();
    }
  }


  /**
   * 从ProfileManager加载数据
   * @private
   */
  loadDataFromProfileManager() {
    this._log('loadDataFromProfileManager', '从ProfileManager加载档案数据');
    
    // 从ProfileManager获取档案列表
    this.profileList = profileManager.getProfileList();
    
    // 更新已使用档案数量
    const usedProfiles = this.profileList.length;
    const profileQuota = this.userInfo ? this.userInfo.profileQuota : 3;
    const canCreateMore = profileQuota === -1 || usedProfiles < profileQuota;
    
    // 更新页面数据
    this._setData({
      profileList: this.profileList,
      usedProfiles: usedProfiles,
      canCreateMore: canCreateMore,
      loading: false
    });
    
    // 处理档案选中逻辑
    this._handleProfileSelection();
  }

  /**
   * 处理档案选中逻辑
   * @private
   */
  _handleProfileSelection() {
    if (!this.profileList || this.profileList.length === 0) {
      // 如果没有档案，清除当前选中
      this._clearCurrentSelection();
      return;
    }

    // 优先处理待选中的档案（从其他页面传递过来的）
    if (this.pendingSelectProfileId) {
      const pendingProfile = this.profileList.find(profile => profile._id === this.pendingSelectProfileId);
      if (pendingProfile) {
        this._log('_handleProfileSelection', '选中待选中的档案', { name: pendingProfile.profileName });
        profileManager.setCurrentProfile(pendingProfile);
        this.currentProfileId = pendingProfile._id;
        this.pendingSelectProfileId = null;
        
        this._setData({ 
          currentProfileId: this.currentProfileId,
          pendingSelectProfileId: null
        });
        return;
      } else {
        // 如果待选中的档案不存在，清除标记
        this.pendingSelectProfileId = null;
      }
    }
    
    // 检查当前选中的档案是否还存在于列表中
    const currentProfileExists = this.currentProfileId && 
      this.profileList.some(profile => profile._id === this.currentProfileId);
    
    if (!currentProfileExists) {
      // 如果当前选中的档案不存在，自动选中第一个档案
      this._autoSelectFirstProfile();
    } else {
      // 如果当前选中的档案存在，确保页面数据正确显示高亮状态
      this._log('_handleProfileSelection', '当前选中的档案存在，确保高亮状态正确', { currentProfileId: this.currentProfileId });
      this._setData({ currentProfileId: this.currentProfileId });
    }
  }

  /**
   * 自动选中第一个档案
   * @private
   */
  _autoSelectFirstProfile() {
    if (!this.profileList || this.profileList.length === 0) {
      this._clearCurrentSelection();
      return;
    }

    const firstProfile = this.profileList[0];
    this._log('_autoSelectFirstProfile', '自动选中第一个档案', { id: firstProfile._id, name: firstProfile.profileName });
    
    // 使用ProfileManager设置当前档案
    profileManager.setCurrentProfile(firstProfile);
    this.currentProfileId = firstProfile._id;
    
    // 更新页面状态
    this._setData({ currentProfileId: this.currentProfileId });
  }

  /**
   * 清除当前选中状态
   * @private
   */
  _clearCurrentSelection() {
    this._log('_clearCurrentSelection', '清除当前选中状态');
    
    // 使用ProfileManager清除当前档案
    profileManager.setCurrentProfile(null);
    this.currentProfileId = null;
    
    this._setData({ currentProfileId: null });
  }

  /**
   * 处理当前选中档案被删除后的选中逻辑
   * @private
   */
  _handleDeletedCurrentProfile() {
    if (this.profileList.length > 0) {
      // 如果还有其他档案，自动选中第一个
      this._autoSelectFirstProfile();
      this._log('_handleDeletedCurrentProfile', '删除当前选中档案后，自动选中第一个档案');
    } else {
      // 如果没有档案了，清除选中状态
      this._clearCurrentSelection();
      this._log('_handleDeletedCurrentProfile', '删除最后一个档案，清除选中状态');
    }
  }

  /**
   * 处理升级操作
   * @private
   */
  _handleUpgradeAction() {
    if (!this.userInfo) {
      this._warn('_handleUpgradeAction', '用户信息未加载，无法处理升级操作');
      return;
    }
    
    const { userType } = this.userInfo;
    
    if (userType === 'guest') {
      // 临时用户跳转到注册页面
      this._navigateTo('/pages/register/index', {
        source: 'profile_limit',
        returnUrl: '/pages/profile/index'
      });
    } else if (userType === 'normal') {
      // 普通用户显示高级版介绍
      this._showPremiumInfo();
    }
  }

  /**
   * 显示高级版信息
   * @private
   */
  _showPremiumInfo() {
    wx.showModal({
      title: '升级高级版',
      content: '高级版功能：\n• 无限档案创建\n• 高级智慧分析\n• 专属客服支持\n• 数据云端备份',
      confirmText: '了解详情',
      cancelText: '暂不升级',
      success: (res) => {
        if (res.confirm) {
          // TODO: 跳转到高级版购买页面
          this._showMessage('功能开发中');
        }
      }
    });
  }

  // ==================== 生命周期方法 ====================

  /**
   * 页面显示时的处理
   */
  async onShow() {
    this._log('onShow', '页面显示');
    
    // 使用ProfileManager获取当前档案ID
    const currentProfile = profileManager.getCurrentProfile();
    this.currentProfileId = currentProfile ? currentProfile._id : null;
    this._log('onShow', '从ProfileManager获取当前档案ID', { 
      currentProfileId: this.currentProfileId,
      profileName: currentProfile ? currentProfile.profileName : 'null'
    });
    this._setData({ currentProfileId: this.currentProfileId });
    
    // 使用全局缓存的用户信息（应用启动时已初始化，注册成功后已更新）
    const app = getApp();
    const globalUserManager = app.globalData.globalUserManager;
    const cachedUserInfo = globalUserManager.getCachedUserInfo();
    
    // 应用启动时已初始化，注册成功后已更新，所以缓存应该总是存在
    this._log('onShow', '使用全局缓存的用户信息');
    this.userInfo = cachedUserInfo;
    this._setData({
      userType: this.userInfo.userType,
      userTypeName: this.userInfo.getDisplayName(),
      profileQuota: this.userInfo.profileQuota,
      usedProfiles: this.userInfo.usedProfiles,
      canCreateMore: this.userInfo.canCreateMore()
    });
    
    // 检查ProfileManager是否已初始化，避免重复请求
    if (profileManager.isReady()) {
      this._log('onShow', 'ProfileManager已初始化，直接加载数据');
      this.loadDataFromProfileManager();
    } else {
      this._log('onShow', 'ProfileManager未初始化，等待初始化完成');
    }
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
    
    // 清理事件监听（使用保存的绑定函数引用）
    if (this._boundHandlers) {
      if (this._boundHandlers.profileSelected) {
        eventBus.off(PROFILE_EVENTS.PROFILE_SELECTED, this._boundHandlers.profileSelected);
      }
      if (this._boundHandlers.profileListRefresh) {
        eventBus.off(PROFILE_EVENTS.PROFILE_LIST_REFRESH, this._boundHandlers.profileListRefresh);
      }
    }
    
    super.onUnload();
  }

  /**
   * 下拉刷新处理
   */
  onPullDownRefresh() {
    this.refreshProfiles();
  }

  /**
   * 上拉触底处理
   */
  onReachBottom() {
    this.loadMoreProfiles();
  }
}

module.exports = { ProfileController };
