/**
 * 头像缓存管理器
 * 基于现有的图片缓存管理器，专门用于用户头像的本地缓存
 */

// 缓存配置
const CACHE_CONFIG = {
  // 缓存目录名
  CACHE_DIR: 'avatars',
  // 缓存过期时间（毫秒），默认7天
  CACHE_EXPIRE_TIME: 7 * 24 * 60 * 60 * 1000,
  // 最大缓存数量
  MAX_CACHE_COUNT: 20,
  // 缓存映射表的 storage key
  CACHE_MAP_KEY: 'avatarCacheMap'
};

class AvatarCacheManager {
  constructor() {
    this.fs = wx.getFileSystemManager();
    this.cacheDir = `${wx.env.USER_DATA_PATH}/${CACHE_CONFIG.CACHE_DIR}`;
    this.cacheMap = this.loadCacheMap();
    this.initCacheDir();
  }

  /**
   * 初始化缓存目录
   */
  initCacheDir() {
    try {
      // 检查目录是否存在
      this.fs.accessSync(this.cacheDir);
    } catch (e) {
      // 目录不存在，创建目录
      try {
        this.fs.mkdirSync(this.cacheDir, true);
        console.log('头像缓存目录创建成功:', this.cacheDir);
      } catch (err) {
        console.error('创建头像缓存目录失败:', err);
      }
    }
  }

  /**
   * 加载缓存映射表
   * @returns {Object} 缓存映射表
   */
  loadCacheMap() {
    try {
      const cacheMap = wx.getStorageSync(CACHE_CONFIG.CACHE_MAP_KEY);
      return cacheMap || {};
    } catch (e) {
      console.error('加载头像缓存映射表失败:', e);
      return {};
    }
  }

  /**
   * 保存缓存映射表
   */
  saveCacheMap() {
    try {
      wx.setStorageSync(CACHE_CONFIG.CACHE_MAP_KEY, this.cacheMap);
    } catch (e) {
      console.error('保存头像缓存映射表失败:', e);
    }
  }

  /**
   * 生成缓存文件路径
   * @param {string} fileName 文件名
   * @returns {string} 缓存文件完整路径
   */
  getCacheFilePath(fileName) {
    return `${this.cacheDir}/${fileName}`;
  }

  /**
   * 检查缓存是否存在且有效
   * @param {string} cloudPath 云存储路径
   * @returns {Object|null} 缓存信息或null
   */
  getCacheInfo(cloudPath) {
    const cacheInfo = this.cacheMap[cloudPath];
    
    if (!cacheInfo) {
      return null;
    }

    // 检查缓存是否过期
    const now = Date.now();
    if (now - cacheInfo.cacheTime > CACHE_CONFIG.CACHE_EXPIRE_TIME) {
      console.log('头像缓存已过期:', cloudPath);
      this.removeCacheFile(cloudPath);
      return null;
    }

    // 检查文件是否存在
    try {
      this.fs.accessSync(cacheInfo.localPath);
      return cacheInfo;
    } catch (e) {
      console.log('头像缓存文件不存在:', cacheInfo.localPath);
      delete this.cacheMap[cloudPath];
      this.saveCacheMap();
      return null;
    }
  }

  /**
   * 获取头像路径（优先使用缓存）
   * @param {string} cloudPath 云存储路径
   * @param {string} fileName 文件名
   * @returns {Promise<string>} 头像路径（本地缓存或云存储）
   */
  async getAvatarPath(cloudPath, fileName) {
    // 1. 检查缓存
    const cacheInfo = this.getCacheInfo(cloudPath);
    if (cacheInfo) {
      console.log('使用缓存头像:', fileName);
      return cacheInfo.localPath;
    }

    // 2. 缓存不存在，需要下载
    console.log('下载并缓存头像:', fileName);
    try {
      const localPath = await this.downloadAndCache(cloudPath, fileName);
      return localPath;
    } catch (error) {
      console.error('下载头像失败:', error);
      // 下载失败，返回云存储路径，让微信自动处理
      return cloudPath;
    }
  }

  /**
   * 下载头像并缓存到本地
   * @param {string} cloudPath 云存储路径
   * @param {string} fileName 文件名
   * @returns {Promise<string>} 本地文件路径
   */
  downloadAndCache(cloudPath, fileName) {
    return new Promise((resolve, reject) => {
      // 先获取云存储文件的临时链接
      wx.cloud.getTempFileURL({
        fileList: [cloudPath],
        success: res => {
          const file = res.fileList[0];
          if (file.status !== 0) {
            reject(new Error('获取临时链接失败: ' + file.errMsg));
            return;
          }

          const tempFileURL = file.tempFileURL;
          const localPath = this.getCacheFilePath(fileName);

          // 下载文件到本地
          wx.downloadFile({
            url: tempFileURL,
            success: downloadRes => {
              if (downloadRes.statusCode === 200) {
                // 保存到缓存目录
                try {
                  this.fs.saveFileSync(downloadRes.tempFilePath, localPath);
                  
                  // 更新缓存映射表
                  this.cacheMap[cloudPath] = {
                    cloudPath: cloudPath,
                    localPath: localPath,
                    fileName: fileName,
                    cacheTime: Date.now()
                  };
                  this.saveCacheMap();
                  
                  console.log('头像缓存成功:', fileName);
                  resolve(localPath);
                } catch (saveError) {
                  console.error('保存头像文件失败:', saveError);
                  reject(saveError);
                }
              } else {
                reject(new Error('下载失败，状态码: ' + downloadRes.statusCode));
              }
            },
            fail: err => {
              console.error('下载头像文件失败:', err);
              reject(err);
            }
          });
        },
        fail: err => {
          console.error('获取头像临时链接失败:', err);
          reject(err);
        }
      });
    });
  }

  /**
   * 删除指定缓存文件
   * @param {string} cloudPath 云存储路径
   */
  removeCacheFile(cloudPath) {
    const cacheInfo = this.cacheMap[cloudPath];
    if (!cacheInfo) {
      return;
    }

    try {
      this.fs.unlinkSync(cacheInfo.localPath);
      console.log('删除头像缓存文件:', cacheInfo.fileName);
    } catch (e) {
      console.error('删除头像缓存文件失败:', e);
    }

    delete this.cacheMap[cloudPath];
    this.saveCacheMap();
  }

  /**
   * 清理过期缓存
   */
  cleanExpiredCache() {
    console.log('开始清理过期头像缓存...');
    
    const now = Date.now();
    let cleanCount = 0;

    Object.keys(this.cacheMap).forEach(cloudPath => {
      const cacheInfo = this.cacheMap[cloudPath];
      if (now - cacheInfo.cacheTime > CACHE_CONFIG.CACHE_EXPIRE_TIME) {
        this.removeCacheFile(cloudPath);
        cleanCount++;
      }
    });

    console.log(`头像缓存清理完成，共清理 ${cleanCount} 个过期缓存`);
  }

  /**
   * 清空所有头像缓存
   */
  clearAllCache() {
    console.log('清空所有头像缓存...');
    
    Object.keys(this.cacheMap).forEach(cloudPath => {
      this.removeCacheFile(cloudPath);
    });

    this.cacheMap = {};
    this.saveCacheMap();
    
    console.log('头像缓存已清空');
  }

  /**
   * 获取缓存统计信息
   * @returns {Object} 缓存统计
   */
  getCacheStats() {
    const cacheCount = Object.keys(this.cacheMap).length;
    let totalSize = 0;

    Object.values(this.cacheMap).forEach(cacheInfo => {
      try {
        const stat = this.fs.statSync(cacheInfo.localPath);
        totalSize += stat.size;
      } catch (e) {
        // 文件不存在或读取失败
      }
    });

    return {
      count: cacheCount,
      totalSize: totalSize,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
      cacheDir: this.cacheDir
    };
  }

  /**
   * 生成头像文件名
   * @param {string} openid 用户openid
   * @param {string} originalFileName 原始文件名
   * @returns {string} 缓存文件名
   */
  generateAvatarFileName(openid, originalFileName) {
    const ext = originalFileName.split('.').pop() || 'jpg';
    return `avatar_${openid}.${ext}`;
  }
}

// 创建单例
const avatarCacheManager = new AvatarCacheManager();

module.exports = {
  avatarCacheManager,
  AvatarCacheManager
};
