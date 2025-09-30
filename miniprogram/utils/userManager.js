/**
 * 用户管理工具模块
 * 提供用户信息获取、保存、更新等功能
 */

const { createUser, getUserInfo } = require('../api/cloud');
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
      
      // 调用云函数保存/更新用户信息
      console.log('UserManager: 准备调用云函数保存用户信息...');
      const result = await createUser(profileInfo);
      console.log('UserManager: 云函数调用结果:', result);
      
      if (result.success) {
        this.userInfo = {
          ...profileInfo,
          userId: result.data.userId,
          isNewUser: result.data.isNewUser,
          lastSaveTime: new Date().getTime()
        };
        
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
   * 获取用户个人资料信息
   * @returns {Promise<Object>} 用户资料
   */
  async getUserProfile() {
    try {
      console.log('UserManager: 开始获取用户资料...');
      let userInfo = {};
      
      // 检查用户授权状态
      console.log('UserManager: 检查用户授权状态...');
      const setting = await this.getSetting();
      console.log('UserManager: 用户授权设置:', setting);
      
      // 检查是否已经通过旧版API授权过用户信息
      if (setting.authSetting['scope.userInfo']) {
        try {
          // 已授权，使用旧版API获取用户信息
          console.log('UserManager: 用户已授权，使用旧版API获取用户信息...');
          const userProfile = await this.getUserInfo();
          userInfo = userProfile.userInfo;
          console.log('UserManager: 获取到用户授权信息', userInfo);
        } catch (error) {
          console.log('UserManager: 旧版API获取用户信息失败:', error.message);
        }
      } else {
        console.log('UserManager: 用户未授权个人信息，仅使用openid识别');
      }
      
      return userInfo;
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
      
      const result = await createUser(updateData);
      
      if (result.success) {
        // 更新本地缓存
        this.userInfo = {
          ...this.userInfo,
          ...updateData,
          lastSaveTime: new Date().getTime()
        };
        
        console.log('UserManager: 用户信息更新成功');
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
      const result = await wx.cloud.callFunction({
        name: 'userManagement',
        data: {
          action: 'getUserInfo'
        }
      });

      if (result.result.success) {
        const fullUserInfo = result.result.data;
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
        console.error('UserManager: 获取完整用户信息失败', result.result.error);
        return result.result;
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
      const result = await wx.cloud.callFunction({
        name: 'userManagement',
        data: {
          action: 'upgradeUserType',
          data: {
            targetUserType,
            registrationData
          }
        }
      });

      if (result.result.success) {
        // 刷新用户信息
        await this.getFullUserInfo();
        console.log('UserManager: 用户类型升级成功');
        return result.result;
      } else {
        console.error('UserManager: 用户类型升级失败', result.result.error);
        return result.result;
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
      const result = await wx.cloud.callFunction({
        name: 'userManagement',
        data: {
          action: 'checkUserQuota'
        }
      });

      if (result.result.success) {
        console.log('UserManager: 配额检查成功', result.result.data);
        return result.result;
      } else {
        console.error('UserManager: 配额检查失败', result.result.error);
        return result.result;
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
   * 获取用户信息
   * @returns {Promise<Object>} 用户信息
   */
  getUserInfo() {
    return new Promise((resolve, reject) => {
      wx.getUserInfo({
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
