/**
 * 档案服务类
 * 处理档案相关的业务逻辑，包括档案创建、查询、删除等
 */
const { BaseService } = require('./BaseService');
const { ProfileBean } = require('../beans/ProfileBean');

class ProfileService extends BaseService {
  constructor() {
    super();
  }

  /**
   * 获取档案列表
   * @param {Object} queryData - 查询参数
   * @returns {Promise<ResponseBean>} 档案列表响应
   */
  async getProfiles(queryData = {}) {
    try {
      const params = {
        action: 'getProfiles',
        data: queryData
      };
      
      const response = await this.callFunction('profileManagement', params);
      
      this._logServiceCall('getProfiles', params, response);
      
      // 成功时将data中的profiles转换为ProfileBean数组
      if (response.success && response.data && response.data.profiles) {
        response.data.profiles = response.data.profiles.map(profile => new ProfileBean(profile));
      }
      
      return response;
    } catch (error) {
      this._error('getProfiles', 'getProfiles 异常:', error);
      return ResponseBean.error('获取档案列表失败: ' + error.message, -1);
    }
  }

  /**
   * 获取单个档案详情
   * @param {string} profileId - 档案ID
   * @returns {Promise<ResponseBean>} 档案详情响应
   */
  async getProfile(profileId) {
    try {
      // 验证必需参数
      const validation = this._validateRequiredParams(
        { profileId }, 
        ['profileId']
      );
      
      if (!validation.valid) {
        return this._createValidationError(validation.missingFields);
      }
      
      const params = {
        action: 'getProfile',
        data: { profileId }
      };
      
      const response = await this.callFunction('profileManagement', params);
      
      this._logServiceCall('getProfile', params, response);
      
      // 成功时将data转换为ProfileBean
      if (response.success && response.data) {
        response.data = new ProfileBean(response.data);
      }
      
      return response;
    } catch (error) {
      this._error('getProfile', 'getProfile 异常:', error);
      return ResponseBean.error('获取档案详情失败: ' + error.message, -1);
    }
  }

  /**
   * 创建档案
   * @param {Object} profileData - 档案数据
   * @returns {Promise<ResponseBean>} 创建结果响应
   */
  async createProfile(profileData) {
    try {
      // 验证必需参数
      const validation = this._validateRequiredParams(
        { profileData }, 
        ['profileData']
      );
      
      if (!validation.valid) {
        return this._createValidationError(validation.missingFields);
      }
      
      const params = {
        action: 'createProfile',
        data: profileData
      };
      
      const response = await this.callFunction('profileManagement', params);
      
      this._logServiceCall('createProfile', params, response);
      
      // 成功时将data转换为ProfileBean
      if (response.success && response.data) {
        // 对于createProfile，需要特殊处理，因为返回的是 { profileId, profile }
        if (response.data.profile) {
          // 创建档案时，使用profile字段的数据创建ProfileBean
          this._log('createProfile', 'createProfile 原始profile数据:', response.data.profile);
          response.data.profile = new ProfileBean(response.data.profile);
          this._log('createProfile', 'createProfile ProfileBean创建完成');
        } else {
          // 其他情况，直接转换data
          response.data = new ProfileBean(response.data);
        }
      }
      
      return response;
    } catch (error) {
      this._error('createProfile', 'createProfile 异常:', error);
      return ResponseBean.error('创建档案失败: ' + error.message, -1);
    }
  }

  /**
   * 更新档案
   * @param {string} profileId - 档案ID
   * @param {Object} updateData - 更新数据
   * @returns {Promise<ResponseBean>} 更新结果响应
   */
  async updateProfile(profileId, updateData) {
    try {
      // 验证必需参数
      const validation = this._validateRequiredParams(
        { profileId, updateData }, 
        ['profileId', 'updateData']
      );
      
      if (!validation.valid) {
        return this._createValidationError(validation.missingFields);
      }
      
      const params = {
        action: 'updateProfile',
        data: {
          profileId,
          ...updateData
        }
      };
      
      const response = await this.callFunction('profileManagement', params);
      
      this._logServiceCall('updateProfile', params, response);
      
      // 成功时将data转换为ProfileBean
      if (response.success && response.data) {
        response.data = new ProfileBean(response.data);
      }
      
      return response;
    } catch (error) {
      this._error('updateProfile', 'updateProfile 异常:', error);
      return ResponseBean.error('更新档案失败: ' + error.message, -1);
    }
  }

  /**
   * 删除档案
   * @param {string} profileId - 档案ID
   * @returns {Promise<ResponseBean>} 删除结果响应
   */
  async deleteProfile(profileId) {
    try {
      // 验证必需参数
      const validation = this._validateRequiredParams(
        { profileId }, 
        ['profileId']
      );
      
      if (!validation.valid) {
        return this._createValidationError(validation.missingFields);
      }
      
      const params = {
        action: 'deleteProfile',
        data: { profileId }
      };
      
      const response = await this.callFunction('profileManagement', params);
      
      this._logServiceCall('deleteProfile', params, response);
      
      return response;
    } catch (error) {
      this._error('deleteProfile', 'deleteProfile 异常:', error);
      return ResponseBean.error('删除档案失败: ' + error.message, -1);
    }
  }

  /**
   * 搜索档案
   * @param {Object} searchData - 搜索条件
   * @returns {Promise<ResponseBean>} 搜索结果响应
   */
  async searchProfile(searchData) {
    try {
      // 验证必需参数
      const validation = this._validateRequiredParams(
        { searchData }, 
        ['searchData']
      );
      
      if (!validation.valid) {
        return this._createValidationError(validation.missingFields);
      }
      
      const params = {
        action: 'searchProfile',
        data: searchData
      };
      
      const response = await this.callFunction('profileManagement', params);
      
      this._logServiceCall('searchProfile', params, response);
      
      // 成功时将data中的profiles转换为ProfileBean数组
      if (response.success && response.data && response.data.profiles) {
        response.data.profiles = response.data.profiles.map(profile => new ProfileBean(profile));
      }
      
      return response;
    } catch (error) {
      this._error('searchProfile', 'searchProfile 异常:', error);
      return ResponseBean.error('搜索档案失败: ' + error.message, -1);
    }
  }
}

// 导出类和单例实例
module.exports = {
  ProfileService,
  profileService: new ProfileService()
};
