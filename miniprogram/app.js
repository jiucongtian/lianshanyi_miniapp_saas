// app.js
import config from './config/index';
import Mock from './mock/index';
import createBus from './utils/eventBus';
const { userManager } = require('./utils/userManager');
const { convertProfileToCardData } = require('./utils/util');
const { imageCacheManager } = require('./utils/imageCacheManager');

if (config.useMock) {
  Mock();
}

App({
  onLaunch() {
    console.log('小程序启动，开始初始化...');
    
    // 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        // env 参数说明：
        //   env 参数决定接下来小程序发起的云开发调用（wx.cloud.xxx）会默认请求到哪个云环境的资源
        //   此处请填入环境 ID, 环境 ID 可打开云控制台查看
        //   如不填则使用默认环境（第一个创建的环境）
        env: 'cloudbase-8g06skyf81a65a87', // 云环境ID - 由构建脚本自动生成
        traceUser: true,
      })
    }

    // 自动保存用户信息
    this.autoSaveUser();
    
    // 初始化档案数据
    this.initProfileData();
    
    // 清理过期的图片缓存
    this.cleanExpiredImageCache();

    const updateManager = wx.getUpdateManager();

    updateManager.onCheckForUpdate((res) => {
      // console.log(res.hasUpdate)
    });

    updateManager.onUpdateReady(() => {
      wx.showModal({
        title: '更新提示',
        content: '新版本已经准备好，是否重启应用？',
        success(res) {
          if (res.confirm) {
            updateManager.applyUpdate();
          }
        },
      });
    });
  },

  onShow() {
    console.log('小程序进入前台');
    // 每次小程序进入前台时也更新用户信息
    this.autoSaveUser();
  },
  globalData: {
    userInfo: null,
    currentProfileId: null, // 当前选中的档案ID
    currentProfileData: null, // 当前选中的档案完整数据
    profilesLoaded: false, // 标记档案是否已加载
  },

  /** 全局事件总线 */
  eventBus: createBus(),

  /**
   * 自动保存用户信息到数据库
   */
  async autoSaveUser() {
    try {
      console.log('App: 开始自动保存用户信息...');
      
      // 使用用户管理器初始化用户
      const result = await userManager.initUser();
      
      if (result.success) {
        console.log('App: 用户信息保存成功:', result.message);
        
        // 更新全局用户信息
        this.globalData.userInfo = result.data;
        
        // 触发用户信息更新事件
        this.eventBus.emit('userInfoUpdated', result.data);
        
        // 显示欢迎信息
        console.log(`App: ${result.message}`);
      } else {
        console.error('App: 用户信息保存失败:', result.error);
      }
    } catch (error) {
      console.error('App: 自动保存用户信息出错:', error);
    }
  },

  /**
   * 获取当前用户信息
   * @returns {Object|null} 当前用户信息
   */
  getCurrentUser() {
    return userManager.getCurrentUser() || this.globalData.userInfo;
  },

  /**
   * 更新用户信息
   * @param {Object} updateData 要更新的用户数据
   * @returns {Promise<Object>} 更新结果
   */
  async updateUserInfo(updateData) {
    try {
      const result = await userManager.updateUserInfo(updateData);
      
      if (result.success) {
        // 更新全局数据
        this.globalData.userInfo = result.data;
        
        // 触发更新事件
        this.eventBus.emit('userInfoUpdated', result.data);
      }
      
      return result;
    } catch (error) {
      console.error('App: 更新用户信息失败:', error);
      return {
        success: false,
        error: error.message || '更新失败'
      };
    }
  },

  /**
   * 初始化档案数据
   * 检查是否有已保存的当前档案，如果没有则获取档案列表并选择第一个
   */
  async initProfileData() {
    try {
      console.log('App: 开始初始化档案数据...');
      
      // 从本地存储获取已保存的当前档案ID
      const savedProfileId = wx.getStorageSync('currentProfileId');
      
      if (savedProfileId) {
        console.log('App: 找到已保存的档案ID:', savedProfileId);
        this.globalData.currentProfileId = savedProfileId;
        
        // 获取该档案的详细数据
        await this.loadProfileData(savedProfileId);
      } else {
        console.log('App: 未找到已保存的档案ID，开始获取档案列表...');
        await this.loadFirstProfile();
      }
      
    } catch (error) {
      console.error('App: 初始化档案数据失败:', error);
    }
  },

  /**
   * 获取档案列表并选择第一个档案
   */
  async loadFirstProfile() {
    try {
      console.log('App: 开始获取档案列表...');
      
      const result = await wx.cloud.callFunction({
        name: 'profileManagement',
        data: {
          action: 'getProfiles',
          page: 1,
          limit: 1 // 只获取第一个档案
        }
      });

      if (result.result && result.result.success && result.result.data.profiles.length > 0) {
        const firstProfile = result.result.data.profiles[0];
        console.log('App: 找到第一个档案:', firstProfile._id);
        
        // 设置为当前档案
        this.setCurrentProfile(firstProfile);
        
        console.log('App: 已自动选择第一个档案作为当前档案');
      } else {
        console.log('App: 未找到任何档案，用户需要创建第一个档案');
      }
      
      this.globalData.profilesLoaded = true;
      
    } catch (error) {
      console.error('App: 获取档案列表失败:', error);
      this.globalData.profilesLoaded = true;
    }
  },

  /**
   * 加载指定档案的详细数据
   * @param {string} profileId 档案ID
   */
  async loadProfileData(profileId) {
    try {
      console.log('App: 开始加载档案详细数据:', profileId);
      
      const result = await wx.cloud.callFunction({
        name: 'profileManagement',
        data: {
          action: 'getProfile',
          data: { profileId }
        }
      });

      if (result.result && result.result.success) {
        const profileData = result.result.data;
        console.log('App: 档案数据加载成功:', profileData);
        
        // 设置为当前档案
        this.setCurrentProfile(profileData);
      } else {
        console.error('App: 档案数据加载失败:', result.result?.error);
        // 如果档案不存在，清除保存的ID并重新获取第一个档案
        wx.removeStorageSync('currentProfileId');
        this.globalData.currentProfileId = null;
        await this.loadFirstProfile();
      }
      
      this.globalData.profilesLoaded = true;
      
    } catch (error) {
      console.error('App: 加载档案详细数据失败:', error);
      this.globalData.profilesLoaded = true;
    }
  },

  /**
   * 设置当前档案
   * @param {Object} profileData 档案数据
   */
  setCurrentProfile(profileData) {
    console.log('App: 设置当前档案:', profileData._id);
    
    // 更新全局数据
    this.globalData.currentProfileId = profileData._id;
    this.globalData.currentProfileData = profileData;
    
    // 保存到本地存储
    wx.setStorageSync('currentProfileId', profileData._id);
    
    // 构建卡牌页面需要的数据格式
    this.updateCardData(profileData);
    
    // 触发档案更新事件
    this.eventBus.emit('profileUpdated', {
      profileId: profileData._id,
      profileData: profileData
    });
    
    console.log('App: 当前档案设置完成');
  },

  /**
   * 更新卡牌数据到全局变量
   * @param {Object} profileData 档案数据
   */
  updateCardData(profileData) {
    // 使用工具函数转换数据格式
    this.globalData.cardData = convertProfileToCardData(profileData);
    console.log('App: 卡牌数据已更新:', this.globalData.cardData);
  },

  /**
   * 获取当前档案数据
   * @returns {Object|null} 当前档案数据
   */
  getCurrentProfile() {
    return this.globalData.currentProfileData;
  },

  /**
   * 获取当前档案ID
   * @returns {string|null} 当前档案ID
   */
  getCurrentProfileId() {
    return this.globalData.currentProfileId;
  },

  /**
   * 清理过期的图片缓存
   * 在小程序启动时执行，清理超过30天的缓存文件
   */
  cleanExpiredImageCache() {
    try {
      console.log('App: 开始清理过期图片缓存...');
      
      // 获取缓存统计信息
      const stats = imageCacheManager.getCacheStats();
      console.log('App: 当前缓存统计:', stats);
      
      // 清理过期缓存
      imageCacheManager.cleanExpiredCache();
      
      // 再次获取统计信息
      const newStats = imageCacheManager.getCacheStats();
      console.log('App: 清理后缓存统计:', newStats);
      
    } catch (error) {
      console.error('App: 清理图片缓存失败:', error);
    }
  },

  /**
   * 获取图片缓存统计信息
   * @returns {Object} 缓存统计
   */
  getImageCacheStats() {
    return imageCacheManager.getCacheStats();
  },

  /**
   * 清空所有图片缓存
   * 供"我的"页面设置使用
   */
  clearAllImageCache() {
    imageCacheManager.clearAllCache();
    wx.showToast({
      title: '缓存已清空',
      icon: 'success'
    });
  }
});
