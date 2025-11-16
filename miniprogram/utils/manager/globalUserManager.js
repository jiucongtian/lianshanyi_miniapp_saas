/**
 * 全局用户信息管理器
 * 负责统一管理用户信息的加载、缓存和更新
 * 
 * 设计原则：
 * 1. 应用启动时加载一次用户信息
 * 2. 只有在业务操作（如修改用户信息）时才重新加载
 * 3. 提供事件机制通知其他组件用户信息更新
 * 4. 避免重复请求，提高性能
 */

const { userService } = require('../../services/UserService');
const { createModuleLogger } = require('../logger/index');
const eventBus = require('../eventBus');
// 不再需要导入USER_EVENTS，因为不再发送用户信息更新事件

const log = createModuleLogger('GlobalUserManager');

class GlobalUserManager {
  constructor() {
    this.userInfo = null;
    this.isInitialized = false;
    this.isLoading = false;
    this.lastUpdateTime = 0;
  }

  /**
   * 初始化用户信息（应用启动时调用）
   * @returns {Promise<Object>} 初始化结果
   */
  async initialize() {
    if (this.isInitialized) {
      log.info('initialize', '用户信息已初始化，直接返回');
      return {
        success: true,
        data: this.userInfo,
        message: '用户信息已存在'
      };
    }

    if (this.isLoading) {
      log.info('initialize', '用户信息正在加载中，等待完成');
      return this._waitForLoading();
    }

    return this._loadUserInfo('initialize');
  }

  /**
   * 获取用户信息（优先使用缓存）
   * @param {boolean} forceRefresh - 是否强制刷新，默认false
   * @returns {Promise<Object>} 用户信息
   */
  async getUserInfo(forceRefresh = false) {
    // 如果未初始化，先初始化
    if (!this.isInitialized) {
      log.info('getUserInfo', '用户信息未初始化，先初始化');
      const result = await this.initialize();
      if (!result.success) {
        return result;
      }
    }

    // 如果强制刷新或用户信息为空，重新加载
    if (forceRefresh || !this.userInfo) {
      log.info('getUserInfo', '重新加载用户信息', { forceRefresh, hasUserInfo: !!this.userInfo });
      return this._loadUserInfo('getUserInfo');
    }

    // 返回缓存的用户信息
    log.debug('getUserInfo', '返回缓存的用户信息');
    return {
      success: true,
      data: this.userInfo
    };
  }

  /**
   * 刷新用户信息（业务操作后调用）
   * @returns {Promise<Object>} 刷新结果
   */
  async refreshUserInfo() {
    log.info('refreshUserInfo', '业务操作后刷新用户信息');
    
    // 清除 UserService 的缓存，确保获取最新数据
    userService.clearUserInfoCache();
    
    return this._loadUserInfo('refreshUserInfo');
  }

  /**
   * 清除用户信息缓存
   */
  clearCache() {
    log.info('clearCache', '清除用户信息缓存');
    this.userInfo = null;
    this.isInitialized = false;
    this.lastUpdateTime = 0;
  }

  /**
   * 获取缓存的用户信息（同步方法）
   * @returns {Object|null} 缓存的用户信息
   */
  getCachedUserInfo() {
    return this.userInfo;
  }

  /**
   * 检查是否已初始化
   * @returns {boolean} 是否已初始化
   */
  isReady() {
    return this.isInitialized && this.userInfo !== null;
  }

  /**
   * 内部方法：加载用户信息
   * @param {string} source - 调用来源
   * @returns {Promise<Object>} 加载结果
   */
  async _loadUserInfo(source) {
    if (this.isLoading) {
      log.info('_loadUserInfo', '用户信息正在加载中，等待完成', { source });
      return this._waitForLoading();
    }

    this.isLoading = true;
    log.info('_loadUserInfo', '开始加载用户信息', { source });

    try {
      let response = await userService.getUserInfo(true); // 强制刷新

      // 如果用户不存在，自动创建用户（guest级别）
      if (!response.success && response.error && response.error.includes('用户不存在')) {
        log.info('_loadUserInfo', '用户不存在，自动创建guest用户', { source });
        
        // 调用createUser创建新用户（云端会自动创建guest级别用户）
        const createResult = await userService.createUser({});
        
        if (createResult.success) {
          log.info('_loadUserInfo', '用户创建成功，重新获取用户信息', { source });
          
          // 用户创建成功后，createUser已经返回了完整的用户信息
          response = createResult;
          response.data.isNewUser = true; // 标记为新用户
        } else {
          log.error('_loadUserInfo', '自动创建用户失败', { source, error: createResult.error });
          return {
            success: false,
            error: createResult.error || '创建用户失败'
          };
        }
      }

      if (response.success && response.data) {
        this.userInfo = response.data;
        this.isInitialized = true;
        this.lastUpdateTime = Date.now();

        // 用户信息更新完成，无需发送事件（当前无监听器）

        log.info('_loadUserInfo', '用户信息加载成功', {
          source,
          userType: this.userInfo.userType,
          profileQuota: this.userInfo.profileQuota,
          usedProfiles: this.userInfo.usedProfiles,
          isNewUser: this.userInfo.isNewUser || false
        });

        return {
          success: true,
          data: this.userInfo,
          message: this.userInfo.isNewUser ? '欢迎新用户！' : '欢迎回来！'
        };
      } else {
        log.error('_loadUserInfo', '用户信息加载失败', { source, error: response.error });
        return {
          success: false,
          error: response.error || '加载用户信息失败'
        };
      }
    } catch (error) {
      log.error('_loadUserInfo', '加载用户信息异常', { source, error: error.message });
      return {
        success: false,
        error: error.message || '加载用户信息失败'
      };
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 等待加载完成
   * @returns {Promise<Object>} 等待结果
   */
  async _waitForLoading() {
    return new Promise((resolve) => {
      const checkLoading = () => {
        if (!this.isLoading) {
          if (this.isInitialized && this.userInfo) {
            resolve({
              success: true,
              data: this.userInfo
            });
          } else {
            resolve({
              success: false,
              error: '用户信息加载失败'
            });
          }
        } else {
          setTimeout(checkLoading, 100);
        }
      };
      checkLoading();
    });
  }
}

// 导出单例实例
module.exports = {
  GlobalUserManager,
  globalUserManager: new GlobalUserManager()
};
