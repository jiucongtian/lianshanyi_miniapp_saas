/**
 * 日志系统使用示例
 * 演示如何在不同场景中使用日志管理器
 */

const logger = require('./Logger');

// ============ 示例 1: Service 层使用 ============
class UserService {
  async getUserInfo() {
    // 开始操作时记录 DEBUG 日志
    logger.debug('user', '开始获取用户信息');
    
    try {
      // 模拟 API 调用
      const result = await wx.cloud.callFunction({
        name: 'userManagement',
        data: { action: 'getUserInfo' }
      });
      
      // 成功时记录 INFO 日志
      logger.info('user', '获取用户信息成功', { 
        userId: result.data._id,
        userType: result.data.userType 
      });
      
      return result;
    } catch (error) {
      // 失败时记录 ERROR 日志
      logger.error('user', '获取用户信息失败', error);
      throw error;
    }
  }
  
  async updateUserInfo(updateData) {
    logger.debug('user', '更新用户信息', updateData);
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'userManagement',
        data: { 
          action: 'updateUser',
          updateData 
        }
      });
      
      logger.info('user', '用户信息更新成功');
      return result;
    } catch (error) {
      logger.error('user', '用户信息更新失败', error);
      throw error;
    }
  }
}

// ============ 示例 2: Controller 层使用 ============
class ProfileController {
  constructor(page) {
    this.page = page;
  }
  
  async initialize() {
    logger.debug('profile', 'ProfileController 初始化开始');
    
    try {
      await Promise.all([
        this.loadUserInfo(),
        this.loadProfiles()
      ]);
      
      logger.info('profile', 'ProfileController 初始化完成');
    } catch (error) {
      logger.error('profile', 'ProfileController 初始化失败', error);
      this.showError('初始化失败');
    }
  }
  
  async loadProfiles() {
    logger.debug('profile', '加载档案列表');
    
    this.page.setData({ loading: true });
    
    try {
      const result = await profileService.getProfiles({
        page: 1,
        limit: 20
      });
      
      if (result.success) {
        logger.info('profile', '档案列表加载成功', { 
          count: result.data.profiles.length 
        });
        
        this.page.setData({
          profileList: result.data.profiles,
          loading: false
        });
      } else {
        logger.warn('profile', '档案列表加载失败', { 
          error: result.error 
        });
        this.showError(result.error);
      }
    } catch (error) {
      logger.error('profile', '加载档案列表异常', error);
      this.showError('加载失败');
    }
  }
  
  showError(message) {
    wx.showToast({
      title: message,
      icon: 'error'
    });
  }
}

// ============ 示例 3: 网络请求封装 ============
class BaseService {
  async callFunction(name, data) {
    logger.debug('network', `调用云函数: ${name}`, data);
    
    const startTime = Date.now();
    
    try {
      const result = await wx.cloud.callFunction({ name, data });
      const duration = Date.now() - startTime;
      
      // 请求较慢时记录警告
      if (duration > 2000) {
        logger.warn('network', `云函数响应较慢: ${name}`, { 
          duration,
          functionName: name 
        });
      } else {
        logger.debug('network', `云函数调用成功: ${name}`, { duration });
      }
      
      return result;
    } catch (error) {
      logger.error('network', `云函数调用失败: ${name}`, {
        error: error.message,
        functionName: name,
        requestData: data
      });
      throw error;
    }
  }
}

// ============ 示例 4: 数据验证和警告 ============
class DataValidator {
  validateProfile(profileData) {
    logger.debug('bazi', '验证档案数据', { profileId: profileData._id });
    
    const warnings = [];
    
    if (!profileData.profileName) {
      warnings.push('缺少档案名称');
    }
    
    if (!profileData.birthYear || !profileData.birthMonth || !profileData.birthDay) {
      warnings.push('出生日期不完整');
    }
    
    if (warnings.length > 0) {
      logger.warn('bazi', '档案数据验证发现问题', {
        profileId: profileData._id,
        warnings: warnings
      });
    } else {
      logger.debug('bazi', '档案数据验证通过');
    }
    
    return warnings;
  }
}

// ============ 示例 5: 缓存管理 ============
class CacheManager {
  getFromCache(key) {
    logger.debug('storage', '从缓存读取', { key });
    
    try {
      const data = wx.getStorageSync(key);
      
      if (data) {
        logger.debug('storage', '缓存命中', { key });
        return data;
      } else {
        logger.debug('storage', '缓存未命中', { key });
        return null;
      }
    } catch (error) {
      logger.error('storage', '读取缓存失败', {
        key,
        error: error.message
      });
      return null;
    }
  }
  
  saveToCache(key, data) {
    logger.debug('storage', '保存到缓存', { key });
    
    try {
      wx.setStorageSync(key, data);
      logger.debug('storage', '缓存保存成功', { key });
    } catch (error) {
      logger.error('storage', '保存缓存失败', {
        key,
        error: error.message
      });
    }
  }
}

// ============ 示例 6: Page 层使用 ============
Page({
  onLoad(options) {
    logger.debug('page', 'profile 页面加载', options);
    
    this.controller = new ProfileController(this);
    this.controller.initialize();
  },
  
  onShow() {
    logger.debug('page', 'profile 页面显示');
  },
  
  onHide() {
    logger.debug('page', 'profile 页面隐藏');
  },
  
  onUnload() {
    logger.debug('page', 'profile 页面卸载');
  },
  
  onPullDownRefresh() {
    logger.debug('page', '用户触发下拉刷新');
    
    this.controller.loadProfiles().then(() => {
      wx.stopPullDownRefresh();
      logger.info('page', '下拉刷新完成');
    });
  }
});

// ============ 示例 7: 错误边界处理 ============
class ErrorBoundary {
  handleError(error, context) {
    logger.error('system', `全局错误捕获: ${context}`, {
      message: error.message,
      stack: error.stack,
      context: context
    });
    
    // 显示用户友好的错误提示
    wx.showToast({
      title: '操作失败，请稍后重试',
      icon: 'error'
    });
  }
}

// ============ 示例 8: 性能监控 ============
class PerformanceMonitor {
  measureOperation(name, operation) {
    const startTime = Date.now();
    
    logger.debug('system', `开始执行: ${name}`);
    
    return operation().then(result => {
      const duration = Date.now() - startTime;
      
      if (duration > 1000) {
        logger.warn('system', `操作耗时过长: ${name}`, { duration });
      } else {
        logger.debug('system', `操作完成: ${name}`, { duration });
      }
      
      return result;
    }).catch(error => {
      const duration = Date.now() - startTime;
      logger.error('system', `操作失败: ${name}`, {
        duration,
        error: error.message
      });
      throw error;
    });
  }
}

// ============ 导出示例类 ============
module.exports = {
  UserService,
  ProfileController,
  BaseService,
  DataValidator,
  CacheManager,
  ErrorBoundary,
  PerformanceMonitor
};

