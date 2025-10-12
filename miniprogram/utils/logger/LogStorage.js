/**
 * 日志本地存储管理器
 * @description 负责将日志保存到小程序本地存储，按天分组管理
 */
class LogStorage {
  constructor(options = {}) {
    this.storagePrefix = 'app_logs_';
    this.enabled = options.enabled !== false;
  }

  /**
   * 保存日志到本地存储
   * @param {Object} logData - 日志数据对象
   */
  save(logData) {
    if (!this.enabled) return;

    try {
      const dateKey = this.getDateKey();
      const key = this.storagePrefix + dateKey;
      
      let logs = wx.getStorageSync(key) || [];
      logs.push(logData);
      
      wx.setStorageSync(key, logs);
    } catch (e) {
      // 存储失败时静默处理，不影响主流程
      console.error('[LogStorage] 保存日志失败:', e);
    }
  }

  /**
   * 获取指定天数内的日志
   * @param {number} days - 天数，默认30天
   * @returns {Array} 日志数组
   */
  getLogs(days = 30) {
    const logs = [];
    const today = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = this.formatDate(date);
      const key = this.storagePrefix + dateKey;
      
      try {
        const dayLogs = wx.getStorageSync(key);
        if (dayLogs && Array.isArray(dayLogs) && dayLogs.length > 0) {
          logs.push(...dayLogs);
        }
      } catch (e) {
        console.error(`[LogStorage] 读取${dateKey}日志失败:`, e);
      }
    }
    
    return logs;
  }

  /**
   * 获取指定日期的日志
   * @param {string} dateKey - 日期键（格式：2024_01_15）
   * @returns {Array} 日志数组
   */
  getLogsByDate(dateKey) {
    try {
      const key = this.storagePrefix + dateKey;
      return wx.getStorageSync(key) || [];
    } catch (e) {
      console.error(`[LogStorage] 读取${dateKey}日志失败:`, e);
      return [];
    }
  }

  /**
   * 清除所有日志
   */
  clear() {
    try {
      const { keys } = wx.getStorageInfoSync();
      keys.forEach(key => {
        if (key.startsWith(this.storagePrefix)) {
          wx.removeStorageSync(key);
        }
      });
      console.log('[LogStorage] 已清除所有日志');
    } catch (e) {
      console.error('[LogStorage] 清除日志失败:', e);
    }
  }

  /**
   * 删除指定日期的日志
   * @param {string} dateKey - 日期键
   */
  removeLogsByDate(dateKey) {
    try {
      const key = this.storagePrefix + dateKey;
      wx.removeStorageSync(key);
    } catch (e) {
      console.error(`[LogStorage] 删除${dateKey}日志失败:`, e);
    }
  }

  /**
   * 获取所有日志的存储键
   * @returns {Array} 存储键数组
   */
  getAllLogKeys() {
    try {
      const { keys } = wx.getStorageInfoSync();
      return keys.filter(key => key.startsWith(this.storagePrefix));
    } catch (e) {
      console.error('[LogStorage] 获取日志键失败:', e);
      return [];
    }
  }

  /**
   * 获取日志统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    try {
      const keys = this.getAllLogKeys();
      let totalCount = 0;
      
      keys.forEach(key => {
        const logs = wx.getStorageSync(key) || [];
        totalCount += logs.length;
      });
      
      return {
        days: keys.length,
        totalCount: totalCount,
        keys: keys
      };
    } catch (e) {
      console.error('[LogStorage] 获取统计信息失败:', e);
      return { days: 0, totalCount: 0, keys: [] };
    }
  }

  /**
   * 获取当前日期的存储键
   * @returns {string} 格式：2024_01_15
   */
  getDateKey() {
    return this.formatDate(new Date());
  }

  /**
   * 格式化日期为存储键
   * @param {Date} date - 日期对象
   * @returns {string} 格式：2024_01_15
   */
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}_${month}_${day}`;
  }

  /**
   * 解析日期键为Date对象
   * @param {string} dateKey - 日期键（格式：2024_01_15）
   * @returns {Date} 日期对象
   */
  parseDate(dateKey) {
    const parts = dateKey.split('_');
    if (parts.length !== 3) {
      return new Date();
    }
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  }
}

module.exports = { LogStorage };

