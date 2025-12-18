// app.js
import config from './config/index.js';
const eventBus = require('./utils/eventBus');
const { PROFILE_EVENTS, SYSTEM_EVENTS } = require('./utils/eventTypes');
const { globalUserManager } = require('./utils/manager/globalUserManager');
const { userService } = require('./services/UserService');
const { imageCacheManager } = require('./utils/manager/imageCacheManager');
const { profileService } = require('./services/ProfileService');
const { profileManager } = require('./utils/manager/profileManager');
const logger = require('./utils/logger/Logger');
const { LogCleaner } = require('./utils/logger/LogCleaner');
const { createModuleLogger } = require('./utils/logger/index');
const { getAllBaziImages } = require('./utils/baziImageMap');
const log = createModuleLogger('App');

App({
  globalData: {
    profilesLoaded: false, // 标记档案是否已加载
    version: '1.4.0', // 客户端版本
    profileManager: profileManager, // 全局档案管理器
    globalUserManager: globalUserManager, // 全局用户管理器
  },

  /** 全局事件总线 */
  eventBus: eventBus,

  onLaunch() {
    log.info('onLaunch', '小程序启动，开始初始化');
    
    // 初始化日志清理器
    this.initLogCleaner();
    
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
    
    // 预加载所有卡牌图片（后台异步执行，不阻塞启动）
    this.preloadCardImages();

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
    log.info('onShow', '小程序进入前台');
    // 每次小程序进入前台时也更新用户信息
    this.autoSaveUser();
  },

  onHide() {
    log.info('onHide', '小程序进入后台');
    // 小程序进入后台时，刷新日志缓存到文件
    this.flushLogs();
  },

  onUnload() {
    log.info('onUnload', '小程序卸载');
    // 小程序卸载时，强制刷新日志缓存到文件
    this.flushLogs(true);
  },

  /**
   * 刷新日志缓存到文件
   * @param {boolean} force - 是否强制刷新
   */
  async flushLogs(force = false) {
    try {
      if (force) {
        await logger.forceFlush();
      } else {
        // 非强制刷新，只刷新缓存（不停止定时器）
        if (logger.storage && typeof logger.storage.flush === 'function') {
          await logger.storage.flush();
        }
      }
    } catch (error) {
      console.error('[App] 刷新日志失败:', error);
    }
  },

  /**
   * 自动保存用户信息到数据库
   */
  async autoSaveUser() {
    try {
      log.info('autoSaveUser', '开始自动保存用户信息');
      
      // 使用全局用户管理器初始化用户信息
      const result = await this.globalData.globalUserManager.initialize();
      
      if (result.success) {
        log.info('autoSaveUser', '用户信息初始化成功', { message: result.message });
        
        // 用户信息更新完成，无需发送事件（当前无监听器）
        
        // 显示欢迎信息
        log.info('autoSaveUser', result.message || '用户信息初始化成功');
      } else {
        log.error('autoSaveUser', '用户信息初始化失败', { error: result.error });
      }
    } catch (error) {
      log.error('autoSaveUser', '自动保存用户信息出错', { error: error.message });
    }
  },

  /**
   * 获取当前用户信息
   * @returns {Object|null} 当前用户信息
   */
  getCurrentUser() {
    return this.globalData.globalUserManager.getCachedUserInfo();
  },

  /**
   * 更新用户信息
   * @param {Object} updateData 要更新的用户数据
   * @returns {Promise<Object>} 更新结果
   */
  async updateUserInfo(updateData) {
    try {
      const result = await userService.updateUserInfo(updateData);
      
      if (result.success) {
        // 刷新 globalUserManager 缓存
        await this.globalData.globalUserManager.refreshUserInfo();
        
        // 用户信息更新完成，无需发送事件（当前无监听器）
      }
      
      return result;
    } catch (error) {
      log.error('updateUserInfo', '更新用户信息失败', { error: error.message });
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
      log.info('initProfileData', '开始初始化档案数据');
      
      // 获取完整的profile列表
      await this.loadAllProfiles();
      
      // 从ProfileManager获取当前档案
      const currentProfile = profileManager.getCurrentProfile();
      if (currentProfile) {
        log.info('initProfileData', '找到当前档案', { profileName: currentProfile.profileName });
      } else {
        log.info('initProfileData', '没有当前档案，选择第一个档案');
        await this.selectFirstProfile();
      }
      
    } catch (error) {
      log.error('initProfileData', '初始化档案数据失败', { error: error.message });
    }
  },

  /**
   * 获取完整的profile列表并初始化ProfileManager
   */
  async loadAllProfiles() {
    try {
      log.info('loadAllProfiles', '开始获取完整档案列表');
      
      const result = await profileService.getProfiles({
        page: 1,
        limit: 100 // 获取所有档案
      });

      if (result.success) {
        const profiles = result.data.profiles || [];
        log.info('loadAllProfiles', '获取到档案列表', { count: profiles.length });
        
        // 初始化ProfileManager
        profileManager.initialize(profiles);
        
        log.info('loadAllProfiles', 'ProfileManager初始化完成');
        
        // 触发ProfileManager初始化完成事件（静默模式：允许没有监听器）
        this.eventBus.emit(SYSTEM_EVENTS.PROFILE_MANAGER_READY, { __emitOptions__: true, silent: true });
      } else {
        log.warn('loadAllProfiles', '获取档案列表失败，初始化空的ProfileManager');
        profileManager.initialize([]);
      }
      
      this.globalData.profilesLoaded = true;
      
    } catch (error) {
      log.error('loadAllProfiles', '获取档案列表失败', { error: error.message });
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
        log.info('selectFirstProfile', '选择第一个档案', { profileId: firstProfile._id });
        
        // 设置为当前档案
        this.setCurrentProfile(firstProfile);
        
        log.info('selectFirstProfile', '已自动选择第一个档案作为当前档案');
      } else {
        log.info('selectFirstProfile', '未找到任何档案，用户需要创建第一个档案');
      }
      
    } catch (error) {
      log.error('selectFirstProfile', '选择第一个档案失败', { error: error.message });
    }
  },

  /**
   * 刷新ProfileManager数据
   * 当有档案增删改操作时调用
   */
  async refreshProfileManager() {
    try {
      log.info('refreshProfileManager', '开始刷新ProfileManager数据');
      await this.loadAllProfiles();
      log.info('refreshProfileManager', 'ProfileManager数据刷新完成');
    } catch (error) {
      log.error('refreshProfileManager', '刷新ProfileManager数据失败', { error: error.message });
    }
  },

  /**
   * 设置当前档案
   * @param {Object|ProfileBean} profileData 档案数据
   */
  setCurrentProfile(profileData) {
    if (!profileData) {
      log.info('setCurrentProfile', '清除当前档案');
      // 清除ProfileManager的当前档案
      profileManager.setCurrentProfile(null);
      return;
    }
    
    log.info('setCurrentProfile', '设置当前档案', { profileId: profileData._id });
    
    // 设置ProfileManager的当前档案
    profileManager.setCurrentProfile(profileData);
    
    // 触发档案更新事件
    this.eventBus.emit(PROFILE_EVENTS.PROFILE_UPDATED, {
      profileId: profileData._id,
      profileData: profileData
    });
    
    log.info('setCurrentProfile', '当前档案设置完成');
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
      log.info('cleanExpiredImageCache', '开始清理过期图片缓存');
      
      // 获取缓存统计信息
      const stats = imageCacheManager.getCacheStats();
      log.debug('cleanExpiredImageCache', '当前缓存统计', stats);
      
      // 清理过期缓存
      imageCacheManager.cleanExpiredCache();
      
      // 再次获取统计信息
      const newStats = imageCacheManager.getCacheStats();
      log.info('cleanExpiredImageCache', '清理后缓存统计', newStats);
      
    } catch (error) {
      log.error('cleanExpiredImageCache', '清理图片缓存失败', { error: error.message });
    }
  },

  /**
   * 预加载所有卡牌图片
   * 在小程序启动时后台异步执行，只下载未缓存的图片
   * 不阻塞启动流程，静默执行
   * 
   * 优化策略：
   * 1. 延迟2秒后开始预加载，避免影响启动速度
   * 2. 只下载未缓存的图片，已有缓存直接跳过
   * 3. 后台静默执行，不影响用户体验
   */
  async preloadCardImages() {
    try {
      // 延迟2秒后开始预加载，让启动流程先完成
      setTimeout(async () => {
        try {
          log.info('preloadCardImages', '开始预加载卡牌图片');
          
          // 获取所有60张卡牌图片信息
          const allBaziImages = getAllBaziImages();
          
          if (!allBaziImages || allBaziImages.length === 0) {
            log.warn('preloadCardImages', '未找到卡牌图片数据');
            return;
          }
          
          // 转换为预加载所需的格式
          const imageList = allBaziImages.map(image => ({
            cloudPath: image.imagePath,
            fileName: image.fileName
          }));
          
          log.info('preloadCardImages', '准备预加载卡牌图片', { count: imageList.length });
          
          // 异步预加载（不阻塞启动）
          // preloadImages 方法会自动检查缓存，只下载未缓存的图片
          const results = await imageCacheManager.preloadImages(imageList);
          
          log.info('preloadCardImages', '卡牌图片预加载完成', {
            total: imageList.length,
            cached: results.cached,
            downloaded: results.downloaded,
            failed: results.failed
          });
          
        } catch (error) {
          log.error('preloadCardImages', '预加载卡牌图片失败', { error: error.message });
        }
      }, 2000); // 延迟2秒
      
    } catch (error) {
      log.error('preloadCardImages', '预加载卡牌图片出错', { error: error.message });
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
      log.info('setupEventListeners', '监听到档案创建事件');
      this.refreshProfileManager();
    });
    
    // 监听档案更新事件
    this.eventBus.on(PROFILE_EVENTS.PROFILE_UPDATED, (data) => {
      log.debug('setupEventListeners', '监听到档案更新事件');
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
  },

  /**
   * 初始化日志清理器
   * 启动时自动清理过期日志
   */
  initLogCleaner() {
    try {
      const loggerConfig = config.logger || {};
      const storageConfig = loggerConfig.storage || {};
      
      const logCleaner = new LogCleaner({
        retentionDays: storageConfig.retentionDays || 30,
        autoCleanEnabled: storageConfig.enabled !== false
      });
      
      // 启动自动清理（异步执行，不阻塞启动）
      logCleaner.autoClean();
      
      log.info('initLogCleaner', '日志清理器初始化完成');
    } catch (error) {
      log.error('initLogCleaner', '初始化日志清理器失败', { error: error.message });
    }
  },

  /**
   * 获取日志统计信息
   * 供"我的"页面使用
   * @returns {Promise<Object>} 统计信息
   */
  async getLogStats() {
    return await logger.getStats();
  },

  /**
   * 清空所有日志
   * 供"我的"页面设置使用
   */
  async clearAllLogs() {
    await logger.clearLogs();
    wx.showToast({
      title: '日志已清空',
      icon: 'success'
    });
  }
});
