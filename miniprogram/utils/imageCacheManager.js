/**
 * 通用图片缓存管理器
 * 支持不同类型的图片缓存（头像、卡牌等）
 */

/**
 * 图片缓存管理器类
 * 可以为不同类型的图片创建独立的缓存实例
 */
class ImageCacheManager {
  /**
   * @param {Object} config 缓存配置
   * @param {string} config.cacheDir - 缓存目录名（如 'avatars', 'cardImages'）
   * @param {number} config.expireTime - 缓存过期时间（毫秒）
   * @param {number} config.maxCacheCount - 最大缓存数量
   * @param {string} config.cacheMapKey - 缓存映射表的 storage key
   */
  constructor(config) {
    this.config = {
      cacheDir: config.cacheDir || 'images',
      expireTime: config.expireTime || 30 * 24 * 60 * 60 * 1000, // 默认30天
      maxCacheCount: config.maxCacheCount || 100,
      cacheMapKey: config.cacheMapKey || 'imageCacheMap'
    };
    
    this.fs = wx.getFileSystemManager();
    this.cacheDir = `${wx.env.USER_DATA_PATH}/${this.config.cacheDir}`;
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
        console.log(`缓存目录创建成功: ${this.cacheDir}`);
      } catch (err) {
        console.error(`创建缓存目录失败: ${this.cacheDir}`, err);
      }
    }
  }

  /**
   * 加载缓存映射表
   * @returns {Object} 缓存映射表
   */
  loadCacheMap() {
    try {
      const cacheMap = wx.getStorageSync(this.config.cacheMapKey);
      return cacheMap || {};
    } catch (e) {
      console.error('加载缓存映射表失败:', e);
      return {};
    }
  }

  /**
   * 保存缓存映射表
   */
  saveCacheMap() {
    try {
      wx.setStorageSync(this.config.cacheMapKey, this.cacheMap);
    } catch (e) {
      console.error('保存缓存映射表失败:', e);
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
    if (now - cacheInfo.cacheTime > this.config.expireTime) {
      console.log('缓存已过期:', cloudPath);
      this.removeCacheFile(cloudPath);
      return null;
    }

    // 检查文件是否存在
    try {
      this.fs.accessSync(cacheInfo.localPath);
      return cacheInfo;
    } catch (e) {
      console.log('缓存文件不存在:', cacheInfo.localPath);
      delete this.cacheMap[cloudPath];
      this.saveCacheMap();
      return null;
    }
  }

  /**
   * 获取图片路径（优先使用缓存）
   * @param {string} cloudPath 云存储路径
   * @param {string} fileName 文件名
   * @returns {Promise<string>} 图片路径（本地缓存或云存储）
   */
  async getImagePath(cloudPath, fileName) {
    // 1. 检查缓存
    const cacheInfo = this.getCacheInfo(cloudPath);
    if (cacheInfo) {
      console.log('使用缓存图片:', fileName);
      return cacheInfo.localPath;
    }

    // 2. 缓存不存在，需要下载
    console.log('下载并缓存图片:', fileName);
    try {
      const localPath = await this.downloadAndCache(cloudPath, fileName);
      return localPath;
    } catch (error) {
      console.error('下载图片失败:', error);
      // 下载失败，返回云存储路径，让微信自动处理
      return cloudPath;
    }
  }

  /**
   * 下载图片并缓存到本地
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
                  
                  console.log('图片缓存成功:', fileName);
                  resolve(localPath);
                } catch (saveError) {
                  console.error('保存文件失败:', saveError);
                  reject(saveError);
                }
              } else {
                reject(new Error('下载失败，状态码: ' + downloadRes.statusCode));
              }
            },
            fail: err => {
              console.error('下载文件失败:', err);
              reject(err);
            }
          });
        },
        fail: err => {
          console.error('获取临时链接失败:', err);
          reject(err);
        }
      });
    });
  }

  /**
   * 预加载多个图片
   * @param {Array} imageList 图片列表 [{cloudPath, fileName}, ...]
   * @returns {Promise<Object>} 加载结果统计
   */
  async preloadImages(imageList) {
    console.log(`开始预加载 ${imageList.length} 张图片...`);
    
    const results = {
      total: imageList.length,
      cached: 0,
      downloaded: 0,
      failed: 0
    };

    for (const image of imageList) {
      try {
        // 检查是否已缓存
        const cacheInfo = this.getCacheInfo(image.cloudPath);
        if (cacheInfo) {
          results.cached++;
        } else {
          // 下载并缓存
          await this.downloadAndCache(image.cloudPath, image.fileName);
          results.downloaded++;
        }
      } catch (error) {
        console.error(`预加载失败: ${image.fileName}`, error);
        results.failed++;
      }
    }

    console.log('预加载完成:', results);
    return results;
  }

  /**
   * 批量获取图片路径（优先使用缓存）
   * @param {Array} imageList 图片列表 [{cloudPath, fileName}, ...]
   * @returns {Promise<Array>} 图片路径列表
   */
  async batchGetImagePaths(imageList) {
    const paths = [];
    
    for (const image of imageList) {
      try {
        const path = await this.getImagePath(image.cloudPath, image.fileName);
        paths.push({
          cloudPath: image.cloudPath,
          fileName: image.fileName,
          localPath: path
        });
      } catch (error) {
        console.error(`获取图片路径失败: ${image.fileName}`, error);
        paths.push({
          cloudPath: image.cloudPath,
          fileName: image.fileName,
          localPath: image.cloudPath, // 失败时使用云路径
          error: error.message
        });
      }
    }
    
    return paths;
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
      console.log('删除缓存文件:', cacheInfo.fileName);
    } catch (e) {
      console.error('删除缓存文件失败:', e);
    }

    delete this.cacheMap[cloudPath];
    this.saveCacheMap();
  }

  /**
   * 清理过期缓存
   */
  cleanExpiredCache() {
    console.log('开始清理过期缓存...');
    
    const now = Date.now();
    let cleanCount = 0;

    Object.keys(this.cacheMap).forEach(cloudPath => {
      const cacheInfo = this.cacheMap[cloudPath];
      if (now - cacheInfo.cacheTime > this.config.expireTime) {
        this.removeCacheFile(cloudPath);
        cleanCount++;
      }
    });

    console.log(`清理完成，共清理 ${cleanCount} 个过期缓存`);
  }

  /**
   * 清空所有缓存
   */
  clearAllCache() {
    console.log('清空所有缓存...');
    
    Object.keys(this.cacheMap).forEach(cloudPath => {
      this.removeCacheFile(cloudPath);
    });

    this.cacheMap = {};
    this.saveCacheMap();
    
    console.log('缓存已清空');
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
      cacheDir: this.cacheDir,
      expireTime: this.config.expireTime,
      maxCacheCount: this.config.maxCacheCount
    };
  }
}

// 创建预配置的缓存实例

// 卡牌图片缓存实例
const cardImageCache = new ImageCacheManager({
  cacheDir: 'cardImages',
  expireTime: 30 * 24 * 60 * 60 * 1000, // 30天
  maxCacheCount: 100,
  cacheMapKey: 'cardImageCacheMap'
});

// 头像图片缓存实例
const avatarImageCache = new ImageCacheManager({
  cacheDir: 'avatars',
  expireTime: 7 * 24 * 60 * 60 * 1000, // 7天
  maxCacheCount: 20,
  cacheMapKey: 'avatarCacheMap'
});

module.exports = {
  ImageCacheManager,
  cardImageCache,
  avatarImageCache
};

