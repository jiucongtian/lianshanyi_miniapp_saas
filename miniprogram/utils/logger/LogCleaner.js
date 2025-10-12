/**
 * 日志清理器
 * @description 负责清理过期日志，释放存储空间
 */
class LogCleaner {
  constructor(options = {}) {
    this.retentionDays = options.retentionDays || 30;
    this.storagePrefix = 'app_logs_';
    this.autoCleanEnabled = options.autoCleanEnabled !== false;
  }

  /**
   * 清理过期日志
   * @returns {Object} 清理结果 { cleaned: number, failed: number }
   */
  cleanExpiredLogs() {
    try {
      const { keys } = wx.getStorageInfoSync();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);
      
      let cleaned = 0;
      let failed = 0;
      
      keys.forEach(key => {
        if (key.startsWith(this.storagePrefix)) {
          try {
            const dateStr = key.replace(this.storagePrefix, '');
            const logDate = this.parseDate(dateStr);
            
            if (logDate < cutoffDate) {
              wx.removeStorageSync(key);
              cleaned++;
              console.log(`[LogCleaner] 清理过期日志: ${key}`);
            }
          } catch (e) {
            failed++;
            console.error(`[LogCleaner] 清理日志失败: ${key}`, e);
          }
        }
      });
      
      const result = { cleaned, failed };
      console.log(`[LogCleaner] 清理完成:`, result);
      return result;
    } catch (e) {
      console.error('[LogCleaner] 清理过期日志失败:', e);
      return { cleaned: 0, failed: 0 };
    }
  }

  /**
   * 自动清理（异步执行，不阻塞启动）
   * 在App启动时调用
   */
  autoClean() {
    if (!this.autoCleanEnabled) {
      return;
    }

    try {
      // 随机延迟1-6秒，避免影响启动性能
      const delay = Math.random() * 5000 + 1000;
      
      setTimeout(() => {
        console.log('[LogCleaner] 开始自动清理过期日志');
        this.cleanExpiredLogs();
      }, delay);
    } catch (e) {
      console.error('[LogCleaner] 自动清理失败:', e);
    }
  }

  /**
   * 清理所有日志（慎用）
   * @returns {number} 清理的日志文件数
   */
  cleanAllLogs() {
    try {
      const { keys } = wx.getStorageInfoSync();
      let count = 0;
      
      keys.forEach(key => {
        if (key.startsWith(this.storagePrefix)) {
          wx.removeStorageSync(key);
          count++;
        }
      });
      
      console.log(`[LogCleaner] 已清理所有日志，共${count}个文件`);
      return count;
    } catch (e) {
      console.error('[LogCleaner] 清理所有日志失败:', e);
      return 0;
    }
  }

  /**
   * 按条件清理日志
   * @param {Function} filter - 过滤函数，返回true表示需要清理
   * @returns {Object} 清理结果
   */
  cleanByFilter(filter) {
    try {
      const { keys } = wx.getStorageInfoSync();
      let cleaned = 0;
      let failed = 0;
      
      keys.forEach(key => {
        if (key.startsWith(this.storagePrefix)) {
          try {
            const dateStr = key.replace(this.storagePrefix, '');
            const logDate = this.parseDate(dateStr);
            
            if (filter(logDate, key)) {
              wx.removeStorageSync(key);
              cleaned++;
            }
          } catch (e) {
            failed++;
            console.error(`[LogCleaner] 清理日志失败: ${key}`, e);
          }
        }
      });
      
      return { cleaned, failed };
    } catch (e) {
      console.error('[LogCleaner] 按条件清理日志失败:', e);
      return { cleaned: 0, failed: 0 };
    }
  }

  /**
   * 解析日期键为Date对象
   * @param {string} dateStr - 日期字符串（格式：2024_01_15）
   * @returns {Date} 日期对象
   */
  parseDate(dateStr) {
    const parts = dateStr.split('_');
    if (parts.length !== 3) {
      return new Date();
    }
    return new Date(
      parseInt(parts[0]), 
      parseInt(parts[1]) - 1, 
      parseInt(parts[2])
    );
  }

  /**
   * 获取需要清理的日志键列表（不执行清理）
   * @returns {Array} 需要清理的键列表
   */
  getExpiredLogKeys() {
    try {
      const { keys } = wx.getStorageInfoSync();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);
      
      const expiredKeys = [];
      
      keys.forEach(key => {
        if (key.startsWith(this.storagePrefix)) {
          const dateStr = key.replace(this.storagePrefix, '');
          const logDate = this.parseDate(dateStr);
          
          if (logDate < cutoffDate) {
            expiredKeys.push(key);
          }
        }
      });
      
      return expiredKeys;
    } catch (e) {
      console.error('[LogCleaner] 获取过期日志键失败:', e);
      return [];
    }
  }
}

module.exports = { LogCleaner };

