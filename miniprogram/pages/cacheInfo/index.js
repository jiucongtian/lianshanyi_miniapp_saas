/**
 * 缓存信息页面
 */
const { imageCacheManager } = require('../../utils/imageCacheManager');
const { createModuleLogger } = require('../../utils/logger/index');
const log = createModuleLogger('CacheInfoPage');

Page({
  data: {
    // 图片缓存信息
    imageCacheCount: 0,
    imageCacheSize: '0',
    cacheFiles: [],
    
    // 本地存储信息
    storageCurrentSize: '0',
    storageLimitSize: '0',
    storageUsagePercent: '0',
    storageKeysCount: 0,
    
    loading: true
  },

  onLoad(options) {
    log.info('onLoad', '页面加载');
    this.loadCacheInfo();
  },

  /**
   * 加载缓存信息
   */
  loadCacheInfo() {
    try {
      // 获取图片缓存统计
      const imageCacheStats = imageCacheManager.getCacheStats();
      
      // 获取缓存文件列表
      const cacheMap = imageCacheManager.cacheMap;
      const cacheFiles = Object.values(cacheMap).map(file => {
        let fileSize = '';
        let fileSizeKB = 0;
        try {
          const stat = imageCacheManager.fs.statSync(file.localPath);
          fileSizeKB = (stat.size / 1024).toFixed(1);
          fileSize = `${fileSizeKB}KB`;
        } catch (e) {
          fileSize = '未知';
        }
        
        // 格式化缓存时间
        const cacheDate = new Date(file.cacheTime);
        const cacheTimeStr = `${cacheDate.getMonth() + 1}/${cacheDate.getDate()} ${cacheDate.getHours()}:${String(cacheDate.getMinutes()).padStart(2, '0')}`;
        
        return {
          fileName: file.fileName,
          fileSize: fileSize,
          fileSizeKB: parseFloat(fileSizeKB),
          cacheTime: cacheTimeStr,
          cloudPath: file.cloudPath,
          localPath: file.localPath
        };
      });
      
      // 按文件大小排序（从大到小）
      cacheFiles.sort((a, b) => b.fileSizeKB - a.fileSizeKB);
      
      // 获取本地存储统计
      const storageInfo = wx.getStorageInfoSync();
      const storageUsagePercent = ((storageInfo.currentSize / storageInfo.limitSize) * 100).toFixed(1);
      
      this.setData({
        imageCacheCount: imageCacheStats.count,
        imageCacheSize: imageCacheStats.totalSizeMB,
        cacheFiles: cacheFiles,
        storageCurrentSize: (storageInfo.currentSize / 1024).toFixed(2),
        storageLimitSize: (storageInfo.limitSize / 1024).toFixed(2),
        storageUsagePercent: storageUsagePercent,
        storageKeysCount: storageInfo.keys.length,
        loading: false
      });
      
      log.info('loadCacheInfo', '缓存信息加载成功', {
        imageCacheCount: imageCacheStats.count,
        cacheFilesCount: cacheFiles.length
      });
    } catch (error) {
      log.error('loadCacheInfo', '加载缓存信息失败', { error: error.message });
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
      this.setData({ loading: false });
    }
  },

  /**
   * 复制文件路径
   */
  onCopyPath(e) {
    const path = e.currentTarget.dataset.path;
    wx.setClipboardData({
      data: path,
      success: () => {
        wx.showToast({
          title: '路径已复制',
          icon: 'success'
        });
      }
    });
  },

  /**
   * 刷新数据
   */
  onRefresh() {
    this.setData({ loading: true });
    this.loadCacheInfo();
  }
});

