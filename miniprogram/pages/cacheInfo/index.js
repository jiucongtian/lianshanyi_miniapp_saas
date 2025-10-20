/**
 * 缓存信息页面
 */
const { imageCacheManager } = require('../../utils/manager/imageCacheManager');
const { logger } = require('../../utils/logger/index');
const { createModuleLogger } = require('../../utils/logger/index');
const log = createModuleLogger('CacheInfoPage');

Page({
  data: {
    // 图片缓存信息
    imageCacheCount: 0,
    imageCacheSize: '0',
    cacheFiles: [],
    
    // 日志信息
    logDays: 0,
    logTotalCount: 0,
    logKeys: [],
    
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
      
      // 获取日志统计信息
      const logStats = logger.storage.getStats();
      const logKeysList = logStats.keys.map(key => {
        // 提取日期部分
        const dateKey = key.replace('app_logs_', '');
        const logs = wx.getStorageSync(key) || [];
        return {
          dateKey: dateKey,
          displayDate: dateKey.replace(/_/g, '-'),
          count: logs.length,
          key: key
        };
      });
      // 按日期排序（最新的在前）
      logKeysList.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
      
      // 获取本地存储统计
      const storageInfo = wx.getStorageInfoSync();
      const storageUsagePercent = ((storageInfo.currentSize / storageInfo.limitSize) * 100).toFixed(1);
      
      this.setData({
        imageCacheCount: imageCacheStats.count,
        imageCacheSize: imageCacheStats.totalSizeMB,
        cacheFiles: cacheFiles,
        logDays: logStats.days,
        logTotalCount: logStats.totalCount,
        logKeys: logKeysList,
        storageCurrentSize: (storageInfo.currentSize / 1024).toFixed(2),
        storageLimitSize: (storageInfo.limitSize / 1024).toFixed(2),
        storageUsagePercent: storageUsagePercent,
        storageKeysCount: storageInfo.keys.length,
        loading: false
      });
      
      log.info('loadCacheInfo', '缓存信息加载成功', {
        imageCacheCount: imageCacheStats.count,
        cacheFilesCount: cacheFiles.length,
        logDays: logStats.days,
        logTotalCount: logStats.totalCount
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
   * 查看日志详情
   */
  onViewLogs(e) {
    const { key, count } = e.currentTarget.dataset;
    const logs = wx.getStorageSync(key) || [];
    
    if (logs.length === 0) {
      wx.showToast({
        title: '没有日志',
        icon: 'none'
      });
      return;
    }
    
    // 格式化日志内容供查看
    const logContent = logs.slice(0, 50).map((log, index) => {
      const time = log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '';
      return `${index + 1}. [${log.level}] ${time}\n${log.module}: ${log.message}`;
    }).join('\n\n');
    
    wx.showModal({
      title: `日志预览 (前50条)`,
      content: logContent.length > 800 ? logContent.substring(0, 800) + '...' : logContent,
      showCancel: false,
      confirmText: '知道了'
    });
  },

  /**
   * 清除指定日期的日志
   */
  onClearDateLogs(e) {
    const { key, displayDate } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认清除',
      content: `确定要清除 ${displayDate} 的日志吗？`,
      success: (res) => {
        if (res.confirm) {
          try {
            wx.removeStorageSync(key);
            wx.showToast({
              title: '清除成功',
              icon: 'success'
            });
            this.loadCacheInfo();
          } catch (error) {
            wx.showToast({
              title: '清除失败',
              icon: 'error'
            });
          }
        }
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

