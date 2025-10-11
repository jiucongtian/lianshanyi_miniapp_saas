/**
 * 用户管理工具模块
 * 提供用户信息获取、保存、更新等功能
 * 注意：此模块已重构为使用Service层
 */

const { userService } = require('../services/index');
const { permissionManager } = require('./permissionManager');

/**
 * 用户管理器类
 */
class UserManager {
  constructor() {
    this.userInfo = null;
    this.isInitialized = false;
  }

  /**
   * 初始化用户信息
   * @returns {Promise<Object>} 用户信息
   */
  async initUser() {
    try {
      console.log('UserManager: 开始初始化用户信息...');
      
      // 获取用户基本信息（可选授权）
      const profileInfo = await this.getUserProfile();
      console.log('UserManager: 获取到的用户资料:', profileInfo);
      
      // 检查是否有有效的用户信息需要更新
      const hasValidUserData = this.hasValidUserData(profileInfo);
      console.log('UserManager: 是否有有效用户数据:', hasValidUserData);
      
      // 调用Service层保存/更新用户信息
      // 如果没有有效的用户数据，传递空对象，只更新登录时间
      const dataToSend = hasValidUserData ? profileInfo : {};
      console.log('UserManager: 准备调用UserService保存用户信息，传递数据:', dataToSend);
      const result = await userService.createUser(dataToSend);
      console.log('UserManager: UserService调用结果:', result);
      
      if (result.success) {
        // 获取完整的用户信息（从数据库）
        const fullUserInfo = await this.getFullUserInfo();
        if (fullUserInfo.success) {
          this.userInfo = {
            ...fullUserInfo.data,
            lastSaveTime: new Date().getTime()
          };
        } else {
          // 如果获取完整信息失败，使用基本信息
          this.userInfo = {
            ...profileInfo,
            userId: result.data._id || result.data.userId,
            isNewUser: result.data.isNewUser,
            lastSaveTime: new Date().getTime()
          };
        }
        
        // 设置权限管理器的用户信息
        permissionManager.setUserInfo(this.userInfo);
        
        this.isInitialized = true;
        console.log('UserManager: 用户信息初始化成功', this.userInfo);
        
        return {
          success: true,
          data: this.userInfo,
          message: result.data.isNewUser ? '欢迎新用户！' : '欢迎回来！'
        };
      } else {
        console.error('UserManager: 用户信息保存失败', result.error);
        return {
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      console.error('UserManager: 初始化用户信息失败', error);
      return {
        success: false,
        error: error.message || '初始化失败'
      };
    }
  }

  /**
   * 检查是否有有效的用户数据
   * @param {Object} userData 用户数据
   * @returns {boolean} 是否有有效数据
   */
  hasValidUserData(userData) {
    if (!userData || typeof userData !== 'object') {
      return false;
    }
    
    return !!(
      (userData.nickName && userData.nickName.trim() !== '' && userData.nickName !== '微信用户') ||
      (userData.avatarUrl && userData.avatarUrl.trim() !== '') ||
      (userData.gender !== undefined && userData.gender !== 0)
    );
  }

  /**
   * 获取用户个人资料信息
   * 注意：微信已废弃自动获取用户信息的API，现在只能在用户主动授权时获取
   * @returns {Promise<Object>} 用户资料
   */
  async getUserProfile() {
    try {
      console.log('UserManager: 开始获取用户资料...');
      
      // 微信政策变更：不再支持自动获取用户信息
      // wx.getUserInfo() 已废弃，只返回匿名信息
      // wx.getUserProfile() 必须用户主动点击触发
      // 因此，启动时不获取用户信息，返回空对象
      console.log('UserManager: 根据微信新政策，启动时不自动获取用户信息');
      
      return {};
    } catch (error) {
      console.log('UserManager: 获取用户信息失败，使用默认信息', error.message);
      return {};
    }
  }

  /**
   * 更新用户信息
   * @param {Object} updateData 更新的数据
   * @returns {Promise<Object>} 更新结果
   */
  async updateUserInfo(updateData) {
    try {
      console.log('UserManager: 更新用户信息', updateData);
      
      const result = await userService.updateUserInfo(updateData);
      
      if (result.success) {
        // 更新本地缓存 - 使用云函数返回的完整数据
        this.userInfo = {
          ...this.userInfo,
          ...result.data,  // 使用云函数返回的完整用户信息
          lastSaveTime: new Date().getTime()
        };
        
        // 更新权限管理器
        permissionManager.setUserInfo(this.userInfo);
        
        console.log('UserManager: 用户信息更新成功', this.userInfo);
        return {
          success: true,
          data: this.userInfo
        };
      } else {
        console.error('UserManager: 用户信息更新失败', result.error);
        return result;
      }
    } catch (error) {
      console.error('UserManager: 更新用户信息出错', error);
      return {
        success: false,
        error: error.message || '更新失败'
      };
    }
  }

  /**
   * 获取当前用户信息
   * @returns {Object|null} 当前用户信息
   */
  getCurrentUser() {
    return this.userInfo;
  }

  /**
   * 检查是否为新用户
   * @returns {boolean} 是否为新用户
   */
  isNewUser() {
    return this.userInfo?.isNewUser || false;
  }

  /**
   * 检查用户是否已初始化
   * @returns {boolean} 是否已初始化
   */
  isUserInitialized() {
    return this.isInitialized && this.userInfo !== null;
  }

  /**
   * 请求用户授权并更新用户信息
   * 此方法必须在用户点击事件中调用
   * @returns {Promise<Object>} 更新结果
   */
  async requestUserAuthorization() {
    try {
      console.log('UserManager: 请求用户授权...');
      
      // 调用新版API获取用户信息
      const userProfile = await this.requestUserProfile('用于完善您的个人资料');
      const userInfo = userProfile.userInfo;
      
      console.log('UserManager: 用户授权成功，获取到信息:', userInfo);
      
      // 更新用户信息到数据库
      const result = await this.updateUserInfo(userInfo);
      
      if (result.success) {
        console.log('UserManager: 用户信息更新成功');
        return {
          success: true,
          data: result.data,
          message: '用户信息更新成功'
        };
      } else {
        return result;
      }
    } catch (error) {
      console.error('UserManager: 用户授权失败:', error);
      return {
        success: false,
        error: error.message || '用户授权失败'
      };
    }
  }

  /**
   * 获取完整用户信息（包含权限数据）
   * @returns {Promise<Object>} 完整用户信息
   */
  async getFullUserInfo() {
    try {
      console.log('UserManager: 获取完整用户信息...');
      const result = await userService.getUserInfo();

      if (result.success) {
        const fullUserInfo = result.data;
        // 更新本地用户信息
        this.userInfo = {
          ...this.userInfo,
          ...fullUserInfo,
          lastSaveTime: new Date().getTime()
        };
        
        // 更新权限管理器
        permissionManager.setUserInfo(this.userInfo);
        
        console.log('UserManager: 完整用户信息获取成功', this.userInfo);
        return {
          success: true,
          data: this.userInfo
        };
      } else {
        console.error('UserManager: 获取完整用户信息失败', result.error);
        return result;
      }
    } catch (error) {
      console.error('UserManager: 获取完整用户信息出错', error);
      return {
        success: false,
        error: error.message || '获取用户信息失败'
      };
    }
  }

  /**
   * 升级用户类型
   * @param {string} targetUserType 目标用户类型
   * @param {Object} registrationData 注册数据（可选）
   * @returns {Promise<Object>} 升级结果
   */
  async upgradeUserType(targetUserType, registrationData = null) {
    try {
      console.log('UserManager: 升级用户类型', targetUserType, registrationData);
      const result = await userService.upgradeUserType(targetUserType, registrationData);

      if (result.success) {
        // 刷新用户信息
        await this.getFullUserInfo();
        console.log('UserManager: 用户类型升级成功');
        return result;
      } else {
        console.error('UserManager: 用户类型升级失败', result.error);
        return result;
      }
    } catch (error) {
      console.error('UserManager: 升级用户类型出错', error);
      return {
        success: false,
        error: error.message || '升级失败'
      };
    }
  }

  /**
   * 检查用户档案配额
   * @returns {Promise<Object>} 配额检查结果
   */
  async checkUserQuota() {
    try {
      console.log('UserManager: 检查用户配额...');
      const result = await userService.checkQuota();

      if (result.success) {
        console.log('UserManager: 配额检查成功', result.data);
        return result;
      } else {
        console.error('UserManager: 配额检查失败', result.error);
        return result;
      }
    } catch (error) {
      console.error('UserManager: 检查配额出错', error);
      return {
        success: false,
        error: error.message || '检查配额失败'
      };
    }
  }

  /**
   * 获取权限管理器实例
   * @returns {PermissionManager} 权限管理器
   */
  getPermissionManager() {
    return permissionManager;
  }

  /**
   * 清除用户信息缓存
   */
  clearUserInfo() {
    this.userInfo = null;
    this.isInitialized = false;
    permissionManager.setUserInfo(null);
    console.log('UserManager: 用户信息缓存已清除');
  }

  // 辅助方法：Promise化微信API

  /**
   * 获取用户设置
   * @returns {Promise<Object>} 设置信息
   */
  getSetting() {
    return new Promise((resolve, reject) => {
      wx.getSetting({
        success: resolve,
        fail: reject
      });
    });
  }


  /**
   * 获取用户资料（新版本API）
   * 注意：此方法必须在用户点击事件中调用，不能自动调用
   * @param {string} desc 申请理由
   * @returns {Promise<Object>} 用户资料
   */
  requestUserProfile(desc = '用于完善用户资料') {
    return new Promise((resolve, reject) => {
      wx.getUserProfile({
        desc,
        success: resolve,
        fail: reject
      });
    });
  }
}

// 创建单例实例
const userManager = new UserManager();

// 导出实例和类
module.exports = {
  userManager,
  UserManager
};
