/**
 * 日志清理器
 * @description 负责清理过期日志，释放存储空间
 */
class LogCleaner {
  constructor(options = {}) {
    this.retentionDays = options.retentionDays || 30;
    this.autoCleanEnabled = options.autoCleanEnabled !== false;
    
    // 文件系统管理器
    this.fs = wx.getFileSystemManager();
    this.logDir = `${wx.env.USER_DATA_PATH}/logs`;
  }

  /**
   * 清理过期日志
   * @returns {Promise<Object>} 清理结果 { cleaned: number, failed: number }
   */
  async cleanExpiredLogs() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);
      
      // 获取所有日志文件
      const files = await this._listLogFiles();
      
      let cleaned = 0;
      let failed = 0;
      
      for (const filePath of files) {
        try {
          // 从文件名提取日期
          const fileName = filePath.split('/').pop();
          const dateStr = fileName.replace('.log', '');
          const logDate = this.parseDate(dateStr);
          
          if (logDate < cutoffDate) {
            await this._deleteFile(filePath);
            cleaned++;
            console.log(`[LogCleaner] 清理过期日志: ${filePath}`);
          }
        } catch (e) {
          failed++;
          console.error(`[LogCleaner] 清理日志失败: ${filePath}`, e);
        }
      }
      
      const result = { cleaned, failed };
      console.log(`[LogCleaner] 清理完成:`, result);
      return result;
    } catch (e) {
      console.error('[LogCleaner] 清理过期日志失败:', e);
      return { cleaned: 0, failed: 0 };
    }
  }

  /**
   * 列出所有日志文件
   * @returns {Promise<Array>} 文件路径数组
   * @private
   */
  async _listLogFiles() {
    return new Promise((resolve) => {
      this.fs.readdir({
        dirPath: this.logDir,
        success: (res) => {
          const logFiles = res.files
            .filter(file => file.endsWith('.log'))
            .map(file => `${this.logDir}/${file}`);
          resolve(logFiles);
        },
        fail: () => {
          resolve([]);
        }
      });
    });
  }

  /**
   * 删除文件
   * @param {string} filePath - 文件路径
   * @returns {Promise<void>}
   * @private
   */
  async _deleteFile(filePath) {
    return new Promise((resolve, reject) => {
      this.fs.unlink({
        filePath: filePath,
        success: () => resolve(),
        fail: (err) => reject(err)
      });
    });
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
      
      setTimeout(async () => {
        console.log('[LogCleaner] 开始自动清理过期日志');
        await this.cleanExpiredLogs();
      }, delay);
    } catch (e) {
      console.error('[LogCleaner] 自动清理失败:', e);
    }
  }

  /**
   * 清理所有日志（慎用）
   * @returns {Promise<number>} 清理的日志文件数
   */
  async cleanAllLogs() {
    try {
      const files = await this._listLogFiles();
      let count = 0;
      
      for (const filePath of files) {
        try {
          await this._deleteFile(filePath);
          count++;
        } catch (e) {
          console.error(`[LogCleaner] 删除文件失败: ${filePath}`, e);
        }
      }
      
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
   * @returns {Promise<Object>} 清理结果
   */
  async cleanByFilter(filter) {
    try {
      const files = await this._listLogFiles();
      let cleaned = 0;
      let failed = 0;
      
      for (const filePath of files) {
        try {
          const fileName = filePath.split('/').pop();
          const dateStr = fileName.replace('.log', '');
          const logDate = this.parseDate(dateStr);
          
          if (filter(logDate, filePath)) {
            await this._deleteFile(filePath);
            cleaned++;
          }
        } catch (e) {
          failed++;
          console.error(`[LogCleaner] 清理日志失败: ${filePath}`, e);
        }
      }
      
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
   * 获取需要清理的日志文件列表（不执行清理）
   * @returns {Promise<Array>} 需要清理的文件路径列表
   */
  async getExpiredLogKeys() {
    try {
      const files = await this._listLogFiles();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);
      
      const expiredFiles = [];
      
      for (const filePath of files) {
        try {
          const fileName = filePath.split('/').pop();
          const dateStr = fileName.replace('.log', '');
          const logDate = this.parseDate(dateStr);
          
          if (logDate < cutoffDate) {
            expiredFiles.push(filePath);
          }
        } catch (e) {
          console.error(`[LogCleaner] 解析文件日期失败: ${filePath}`, e);
        }
      }
      
      return expiredFiles;
    } catch (e) {
      console.error('[LogCleaner] 获取过期日志文件失败:', e);
      return [];
    }
  }
}

module.exports = { LogCleaner };

