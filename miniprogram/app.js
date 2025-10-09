// app.js
import config from './config/index';
import Mock from './mock/index';
const eventBus = require('./utils/eventBus');
const { USER_EVENTS, PROFILE_EVENTS, SYSTEM_EVENTS } = require('./utils/eventTypes');
const { userManager } = require('./utils/userManager');
const { imageCacheManager } = require('./utils/imageCacheManager');
const { profileService } = require('./services/index');
const { profileManager } = require('./utils/profileManager');

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
    
    // 设置事件监听
    this.setupEventListeners();
    
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
    profilesLoaded: false, // 标记档案是否已加载
    version: '1.1.0', // 客户端版本
    profileManager: profileManager, // 全局档案管理器
  },

  /** 全局事件总线 */
  eventBus: eventBus,

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
        this.eventBus.emit(USER_EVENTS.USER_INFO_UPDATED, result.data);
        
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
        this.eventBus.emit(USER_EVENTS.USER_INFO_UPDATED, result.data);
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
   * 立即获取完整的profile列表并初始化ProfileManager
   */
  async initProfileData() {
    try {
      console.log('App: 开始初始化档案数据...');
      
      // 获取完整的profile列表
      await this.loadAllProfiles();
      
      // 从ProfileManager获取当前档案
      const currentProfile = profileManager.getCurrentProfile();
      if (currentProfile) {
        console.log('App: 找到当前档案:', currentProfile.profileName);
      } else {
        console.log('App: 没有当前档案，选择第一个档案');
        await this.selectFirstProfile();
      }
      
    } catch (error) {
      console.error('App: 初始化档案数据失败:', error);
    }
  },

  /**
   * 获取完整的profile列表并初始化ProfileManager
   */
  async loadAllProfiles() {
    try {
      console.log('App: 开始获取完整档案列表...');
      
      const result = await profileService.getProfiles({
        page: 1,
        limit: 100 // 获取所有档案
      });

      if (result.success) {
        const profiles = result.data.profiles || [];
        console.log('App: 获取到档案列表，数量:', profiles.length);
        
        // 初始化ProfileManager
        profileManager.initialize(profiles);
        
        console.log('App: ProfileManager初始化完成');
        
        // 触发ProfileManager初始化完成事件
        this.eventBus.emit(SYSTEM_EVENTS.PROFILE_MANAGER_READY);
      } else {
        console.log('App: 获取档案列表失败，初始化空的ProfileManager');
        profileManager.initialize([]);
      }
      
      this.globalData.profilesLoaded = true;
      
    } catch (error) {
      console.error('App: 获取档案列表失败:', error);
      profileManager.initialize([]);
      this.globalData.profilesLoaded = true;
    }
  },

  /**
   * 从ProfileManager中选择第一个档案
   */
  async selectFirstProfile() {
    try {
      const profileList = profileManager.getProfileList();
      
      if (profileList.length > 0) {
        const firstProfile = profileList[0];
        console.log('App: 选择第一个档案:', firstProfile._id);
        
        // 设置为当前档案
        this.setCurrentProfile(firstProfile);
        
        console.log('App: 已自动选择第一个档案作为当前档案');
      } else {
        console.log('App: 未找到任何档案，用户需要创建第一个档案');
      }
      
    } catch (error) {
      console.error('App: 选择第一个档案失败:', error);
    }
  },

  /**
   * 刷新ProfileManager数据
   * 当有档案增删改操作时调用
   */
  async refreshProfileManager() {
    try {
      console.log('App: 开始刷新ProfileManager数据...');
      await this.loadAllProfiles();
      console.log('App: ProfileManager数据刷新完成');
    } catch (error) {
      console.error('App: 刷新ProfileManager数据失败:', error);
    }
  },

  /**
   * 设置当前档案
   * @param {Object|ProfileBean} profileData 档案数据
   */
  setCurrentProfile(profileData) {
    if (!profileData) {
      console.log('App: 清除当前档案');
      // 清除ProfileManager的当前档案
      profileManager.setCurrentProfile(null);
      return;
    }
    
    console.log('App: 设置当前档案:', profileData._id);
    
    // 设置ProfileManager的当前档案
    profileManager.setCurrentProfile(profileData);
    
    // 触发档案更新事件
    this.eventBus.emit(PROFILE_EVENTS.PROFILE_UPDATED, {
      profileId: profileData._id,
      profileData: profileData
    });
    
    console.log('App: 当前档案设置完成');
  },


  /**
   * 获取当前档案数据
   * @returns {Object|null} 当前档案数据
   */
  getCurrentProfile() {
    return profileManager.getCurrentProfile();
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
   * 设置事件监听
   */
  setupEventListeners() {
    // 监听档案创建事件
    this.eventBus.on(PROFILE_EVENTS.PROFILE_CREATED, (profileData) => {
      console.log('App: 监听到档案创建事件');
      this.refreshProfileManager();
    });
    
    // 监听档案更新事件
    this.eventBus.on(PROFILE_EVENTS.PROFILE_UPDATED, (data) => {
      console.log('App: 监听到档案更新事件');
      // 更新ProfileManager中的档案数据
      if (data.profileId && data.updateData) {
        profileManager.updateProfile(data.profileId, data.updateData);
      }
    });
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
