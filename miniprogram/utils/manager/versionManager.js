/**
 * 版本管理器
 * 负责管理客户端版本和云函数版本的映射关系
 */
const { createModuleLogger } = require('../logger/index');
const log = createModuleLogger('VersionManager');

class VersionManager {
  /**
   * 版本配置映射
   * 格式：{ 客户端版本: { 云函数名: 云函数版本 } }
   */
  static VERSION_CONFIG = {
    '1.0.0': {
      calculateBazi: 'v1_0',
      userManagement: 'v1_0',
      profileManagement: 'v1_0'
    },
    '1.1.0': {
      calculateBazi: 'v1_1',
      userManagement: 'v1_0',
      profileManagement: 'v1_1'
    },
    '1.2.0': {
      calculateBazi: 'v1_1',
      userManagement: 'v1_0',
      profileManagement: 'v1_2',
      cozeFunctions: 'v1_3'
    },
    '1.3.0': {
      calculateBazi: 'v1_1',
      userManagement: 'v1_3',
      profileManagement: 'v1_2',
      cozeFunctions: 'v1_3',
      feedbackManagement: 'v1_4'
    }
  };
  
  /**
   * 获取当前客户端版本
   * @returns {string|null} 当前版本号，如果无法获取则返回 null
   */
  static getCurrentVersion() {
    try {
      const appConfig = getApp();
      
      if (appConfig && appConfig.globalData && appConfig.globalData.version) {
        const version = appConfig.globalData.version;
        log.debug('getCurrentVersion', '成功获取版本', { version });
        return version;
      }
      
      // 如果无法获取版本信息，返回 null（由调用方决定如何处理）
      log.warn('getCurrentVersion', 'App实例未完全初始化，无法获取版本', {
        hasAppConfig: !!appConfig,
        hasGlobalData: !!(appConfig && appConfig.globalData)
      });
      return null;
    } catch (error) {
      log.error('getCurrentVersion', '获取版本信息失败', { error: error.message, errorStack: error.stack });
      return null;
    }
  }
  
  /**
   * 等待版本可用（轮询检查直到版本可用）
   * @param {number} maxRetries - 最大重试次数，默认 50 次
   * @param {number} interval - 每次检查间隔（毫秒），默认 100ms
   * @returns {Promise<string>} 版本号
   */
  static async waitForVersion(maxRetries = 50, interval = 100) {
    for (let i = 0; i < maxRetries; i++) {
      const version = this.getCurrentVersion();
      if (version) {
        log.debug('waitForVersion', '版本可用', { version, retries: i });
        return version;
      }
      
      // 等待一段时间后重试
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
    
    // 如果所有重试都失败，抛出错误
    throw new Error(`无法获取版本信息，已重试 ${maxRetries} 次`);
  }
  
  /**
   * 获取指定云函数的版本
   * @param {string} functionName - 云函数名称
   * @returns {string} 云函数版本
   */
  static getFunctionVersion(functionName) {
    const currentVersion = this.getCurrentVersion();
    
    // 如果无法获取版本，返回 null（由调用方处理）
    if (!currentVersion) {
      log.warn('getFunctionVersion', '无法获取客户端版本，无法确定云函数版本', { 
        functionName
      });
      return null;
    }
    
    const config = this.VERSION_CONFIG[currentVersion];
    
    log.debug('getFunctionVersion', '获取云函数版本', {
      functionName,
      currentVersion,
      hasConfig: !!config,
      functionVersion: config && config[functionName]
    });
    
    if (!config) {
      log.warn('getFunctionVersion', '未找到客户端版本的配置，使用默认版本 v1_0', { 
        currentVersion,
        availableVersions: Object.keys(this.VERSION_CONFIG)
      });
      return 'v1_0';
    }
    
    if (!config[functionName]) {
      log.warn('getFunctionVersion', '未找到函数的版本配置，使用默认版本 v1_0', { 
        functionName,
        currentVersion,
        availableFunctions: Object.keys(config)
      });
      return 'v1_0';
    }
    
    const functionVersion = config[functionName];
    log.debug('getFunctionVersion', '成功获取云函数版本', {
      functionName,
      currentVersion,
      functionVersion
    });
    
    return functionVersion;
  }
  
  /**
   * 获取完整的云函数名称（包含版本后缀）
   * @param {string} baseName - 云函数基础名称
   * @param {string} version - 指定版本（可选）
   * @returns {string|null} 完整的云函数名称，如果无法确定版本则返回 null
   */
  static getFunctionName(baseName, version = null) {
    const functionVersion = version || this.getFunctionVersion(baseName);
    
    // 如果无法获取版本，返回 null
    if (!functionVersion) {
      log.warn('getFunctionName', '无法确定云函数版本，无法生成完整函数名', { baseName });
      return null;
    }
    
    // v1_0 版本不加后缀，保持向后兼容
    if (functionVersion === 'v1_0') {
      return baseName;
    }
    
    return `${baseName}_${functionVersion}`;
  }
  
  /**
   * 获取所有支持的云函数版本
   * @returns {Object} 云函数版本映射
   */
  static getSupportedFunctionVersions() {
    const currentVersion = this.getCurrentVersion();
    return this.VERSION_CONFIG[currentVersion] || {};
  }
  
  /**
   * 检查云函数版本是否支持
   * @param {string} functionName - 云函数名称
   * @param {string} version - 版本号
   * @returns {boolean} 是否支持
   */
  static isFunctionVersionSupported(functionName, version) {
    const supportedVersions = this.getSupportedFunctionVersions();
    return supportedVersions[functionName] === version;
  }
  
  /**
   * 获取版本信息
   * @param {string} version - 版本号
   * @returns {Object} 版本信息
   */
  static getVersionInfo(version = null) {
    const targetVersion = version || this.getCurrentVersion();
    const config = this.VERSION_CONFIG[targetVersion];
    
    if (!config) {
      return null;
    }
    
    return {
      version: targetVersion,
      functions: config,
      supportedFunctions: Object.keys(config),
      isLatest: this.isLatestVersion(targetVersion)
    };
  }
  
  /**
   * 检查是否为最新版本
   * @param {string} version - 版本号
   * @returns {boolean} 是否为最新版本
   */
  static isLatestVersion(version) {
    const allVersions = Object.keys(this.VERSION_CONFIG);
    const sortedVersions = allVersions.sort((a, b) => {
      const aParts = a.split('.').map(Number);
      const bParts = b.split('.').map(Number);
      
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aPart = aParts[i] || 0;
        const bPart = bParts[i] || 0;
        
        if (aPart !== bPart) {
          return bPart - aPart;
        }
      }
      
      return 0;
    });
    
    return sortedVersions[0] === version;
  }
  
  /**
   * 获取最新版本号
   * @returns {string} 最新版本号
   */
  static getLatestVersion() {
    const allVersions = Object.keys(this.VERSION_CONFIG);
    const sortedVersions = allVersions.sort((a, b) => {
      const aParts = a.split('.').map(Number);
      const bParts = b.split('.').map(Number);
      
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aPart = aParts[i] || 0;
        const bPart = bParts[i] || 0;
        
        if (aPart !== bPart) {
          return bPart - aPart;
        }
      }
      
      return 0;
    });
    
    return sortedVersions[0];
  }
  
  /**
   * 检查是否需要更新
   * @returns {boolean} 是否需要更新
   */
  static needsUpdate() {
    const currentVersion = this.getCurrentVersion();
    const latestVersion = this.getLatestVersion();
    return currentVersion !== latestVersion;
  }
  
  /**
   * 获取版本更新信息
   * @returns {Object} 更新信息
   */
  static getUpdateInfo() {
    const currentVersion = this.getCurrentVersion();
    const latestVersion = this.getLatestVersion();
    const needsUpdate = this.needsUpdate();
    
    return {
      currentVersion,
      latestVersion,
      needsUpdate,
      canUpdate: needsUpdate,
      updateAvailable: needsUpdate
    };
  }
  
  /**
   * 比较版本号
   * @param {string} version1 - 版本1
   * @param {string} version2 - 版本2
   * @returns {number} 比较结果 (-1: version1 < version2, 0: 相等, 1: version1 > version2)
   */
  static compareVersions(version1, version2) {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part !== v2Part) {
        return v1Part > v2Part ? 1 : -1;
      }
    }
    
    return 0;
  }
  
  /**
   * 获取版本历史
   * @returns {Array} 版本历史列表
   */
  static getVersionHistory() {
    return Object.keys(this.VERSION_CONFIG).sort((a, b) => {
      return this.compareVersions(b, a); // 降序排列
    });
  }
  
  /**
   * 设置版本（用于测试或特殊场景）
   * @param {string} version - 版本号
   */
  static setVersion(version) {
    if (!this.VERSION_CONFIG[version]) {
      throw new Error(`不支持的版本: ${version}`);
    }
    
    try {
      const appConfig = getApp();
      if (appConfig && appConfig.globalData) {
        appConfig.globalData.version = version;
        log.info('setVersion', '版本已设置', { version });
      } else {
        log.warn('setVersion', '无法设置版本，App实例或globalData不存在');
      }
    } catch (error) {
      log.error('setVersion', '设置版本失败', { error: error.message });
    }
  }
  
  /**
   * 重置为默认版本
   */
  static resetToDefault() {
    try {
      const appConfig = getApp();
      if (appConfig && appConfig.globalData) {
        delete appConfig.globalData.version;
        log.info('resetToDefault', '版本已重置为默认值');
      } else {
        log.warn('resetToDefault', '无法重置版本，App实例或globalData不存在');
      }
    } catch (error) {
      log.error('resetToDefault', '重置版本失败', { error: error.message });
    }
  }
}

module.exports = { VersionManager };


