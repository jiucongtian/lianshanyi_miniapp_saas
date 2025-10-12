/**
 * 用户服务类
 * 处理用户相关的业务逻辑，包括用户信息获取、配额检查、用户类型升级等
 */
const { BaseService } = require('./BaseService');
const { UserBean } = require('../beans/UserBean');

class UserService extends BaseService {
  constructor() {
    super();
  }

  /**
   * 获取用户信息
   * @returns {Promise<ResponseBean>} 用户信息响应，成功时data为UserBean实例
   */
  async getUserInfo() {
    try {
      const response = await this.callFunction('userManagement', {
        action: 'getUserInfo'
      });
      
      // 记录服务调用日志
      this._logServiceCall('getUserInfo', {}, response);
      
      // 成功时将data转换为UserBean
      if (response.success && response.data) {
        response.data = new UserBean(response.data);
      }
      
      return response;
    } catch (error) {
      this._error('getUserInfo', 'getUserInfo 异常:', error);
      return ResponseBean.error('获取用户信息失败: ' + error.message, -1);
    }
  }

  /**
   * 检查用户配额
   * @returns {Promise<ResponseBean>} 配额信息响应
   */
  async checkQuota() {
    try {
      const response = await this.callFunction('userManagement', {
        action: 'checkUserQuota'
      });
      
      this._logServiceCall('checkQuota', {}, response);
      return response;
    } catch (error) {
      this._error('checkQuota', 'checkQuota 异常:', error);
      return ResponseBean.error('检查用户配额失败: ' + error.message, -1);
    }
  }

  /**
   * 升级用户类型
   * @param {string} targetUserType - 目标用户类型
   * @param {Object} registrationData - 注册数据（可选）
   * @returns {Promise<ResponseBean>} 升级结果响应
   */
  async upgradeUserType(targetUserType, registrationData = null) {
    try {
      // 验证必需参数
      const validation = this._validateRequiredParams(
        { targetUserType }, 
        ['targetUserType']
      );
      
      if (!validation.valid) {
        return this._createValidationError(validation.missingFields);
      }
      
      const params = {
        action: 'upgradeUserType',
        data: { 
          targetUserType,
          registrationData 
        }
      };
      
      const response = await this.callFunction('userManagement', params);
      
      this._logServiceCall('upgradeUserType', params, response);
      return response;
    } catch (error) {
      this._error('upgradeUserType', 'upgradeUserType 异常:', error);
      return ResponseBean.error('升级用户类型失败: ' + error.message, -1);
    }
  }

  /**
   * 更新用户信息
   * @param {Object} userData - 要更新的用户数据
   * @returns {Promise<ResponseBean>} 更新结果响应
   */
  async updateUserInfo(userData) {
    try {
      // 验证必需参数
      const validation = this._validateRequiredParams(
        { userData }, 
        ['userData']
      );
      
      if (!validation.valid) {
        return this._createValidationError(validation.missingFields);
      }
      
      const params = {
        action: 'updateUserInfo',
        data: userData
      };
      
      const response = await this.callFunction('userManagement', params);
      
      this._logServiceCall('updateUserInfo', params, response);
      
      // 成功时将data转换为UserBean
      if (response.success && response.data) {
        response.data = new UserBean(response.data);
      }
      
      return response;
    } catch (error) {
      this._error('updateUserInfo', 'updateUserInfo 异常:', error);
      return ResponseBean.error('更新用户信息失败: ' + error.message, -1);
    }
  }

  /**
   * 创建用户（首次注册）
   * @param {Object} userData - 用户数据
   * @returns {Promise<ResponseBean>} 创建结果响应
   */
  async createUser(userData = {}) {
    try {
      // 如果传入了userData，则验证必需参数
      if (userData && Object.keys(userData).length > 0) {
        const validation = this._validateRequiredParams(
          { userData }, 
          ['userData']
        );
        
        if (!validation.valid) {
          return this._createValidationError(validation.missingFields);
        }
      }
      
      const params = {
        action: 'createUser',
        data: userData
      };
      
      const response = await this.callFunction('userManagement', params);
      
      this._logServiceCall('createUser', params, response);
      
      // 如果创建成功，获取完整的用户信息
      if (response.success && response.data && response.data.userId) {
        const userInfoResponse = await this.getUserInfo();
        if (userInfoResponse.success) {
          response.data = userInfoResponse.data; // 使用完整的用户信息
        } else {
          this._warn('createUser', '获取用户信息失败，使用基础信息');
          // 如果获取完整信息失败，至少提供基础信息
          response.data = {
            _id: response.data.userId,
            openid: '', // 这个字段在云函数中无法获取，需要后续调用getUserInfo获取
            isNewUser: response.data.isNewUser
          };
        }
      }
      
      return response;
    } catch (error) {
      this._error('createUser', 'createUser 异常:', error);
      return ResponseBean.error('创建用户失败: ' + error.message, -1);
    }
  }

  /**
   * 检查用户是否存在
   * @returns {Promise<ResponseBean>} 检查结果响应
   */
  async checkUserExists() {
    try {
      const response = await this.callFunction('userManagement', {
        action: 'checkUserExists'
      });
      
      this._logServiceCall('checkUserExists', {}, response);
      return response;
    } catch (error) {
      this._error('checkUserExists', 'checkUserExists 异常:', error);
      return ResponseBean.error('检查用户是否存在失败: ' + error.message, -1);
    }
  }

  /**
   * 获取用户权限列表
   * @returns {Promise<ResponseBean>} 权限列表响应
   */
  async getUserPermissions() {
    try {
      const response = await this.callFunction('userManagement', {
        action: 'getUserPermissions'
      });
      
      this._logServiceCall('getUserPermissions', {}, response);
      return response;
    } catch (error) {
      this._error('getUserPermissions', 'getUserPermissions 异常:', error);
      return ResponseBean.error('获取用户权限失败: ' + error.message, -1);
    }
  }

  /**
   * 检查用户是否有特定权限
   * @param {string} permission - 权限名称
   * @returns {Promise<ResponseBean>} 权限检查结果响应
   */
  async checkPermission(permission) {
    try {
      // 验证必需参数
      const validation = this._validateRequiredParams(
        { permission }, 
        ['permission']
      );
      
      if (!validation.valid) {
        return this._createValidationError(validation.missingFields);
      }
      
      const params = {
        action: 'checkPermission',
        data: { permission }
      };
      
      const response = await this.callFunction('userManagement', params);
      
      this._logServiceCall('checkPermission', params, response);
      return response;
    } catch (error) {
      this._error('checkPermission', 'checkPermission 异常:', error);
      return ResponseBean.error('检查用户权限失败: ' + error.message, -1);
    }
  }
}

// 导出类和单例实例
module.exports = {
  UserService,
  userService: new UserService()
};
