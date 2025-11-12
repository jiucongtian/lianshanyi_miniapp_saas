/**
 * 日志文件存储管理器
 * @description 负责将日志保存到文件系统，使用内存缓存和定期批量写入机制
 */
class LogStorage {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    
    // 文件系统管理器
    this.fs = wx.getFileSystemManager();
    
    // 日志文件目录
    this.logDir = `${wx.env.USER_DATA_PATH}/logs`;
    
    // 内存缓存
    this.cache = [];
    this.cacheSize = 0; // 缓存大小（字节数估算）
    
    // 配置参数
    this.maxCacheSize = options.maxCacheSize || 100 * 1024; // 最大缓存大小，默认100KB
    this.flushInterval = options.flushInterval || 5000; // 刷新间隔（毫秒），默认5秒
    this.maxFileSize = options.maxFileSize || 2 * 1024 * 1024; // 单个文件最大大小，默认2MB
    
    // 定时器
    this.flushTimer = null;
    
    // 是否正在写入
    this.isWriting = false;
    
    // 初始化
    this._init();
  }

  /**
   * 初始化文件系统
   * @private
   */
  _init() {
    if (!this.enabled) return;
    
    try {
      // 确保日志目录存在
      this._ensureLogDir();
      
      // 启动定时刷新
      this._startFlushTimer();
      
      console.log('[LogStorage] 初始化完成，日志目录:', this.logDir);
    } catch (e) {
      console.error('[LogStorage] 初始化失败:', e);
      // 初始化失败时禁用存储
      this.enabled = false;
    }
  }

  /**
   * 确保日志目录存在
   * @private
   */
  _ensureLogDir() {
    try {
      // 先检查目录是否存在
      this.fs.accessSync(this.logDir);
      // 目录已存在，直接返回
    } catch (e) {
      // 目录不存在，尝试创建
      try {
        this.fs.mkdirSync(this.logDir, true);
      } catch (mkdirError) {
        // 如果创建失败，检查是否是因为目录已存在（并发创建的情况）
        if (mkdirError.message && mkdirError.message.includes('already exists')) {
          // 目录已存在，忽略错误
          return;
        }
        // 其他错误，重新抛出
        throw mkdirError;
      }
    }
  }

  /**
   * 启动定时刷新器
   * @private
   */
  _startFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  /**
   * 停止定时刷新器
   * @private
   */
  _stopFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * 保存日志到内存缓存
   * @param {Object} logData - 日志数据对象
   */
  save(logData) {
    if (!this.enabled) return;

    try {
      // 添加到内存缓存
      this.cache.push(logData);
      
      // 估算日志大小（JSON字符串长度）
      const logSize = JSON.stringify(logData).length;
      this.cacheSize += logSize;
      
      // 检查是否需要立即刷新（只按缓存大小判断）
      if (this.cacheSize >= this.maxCacheSize) {
        // 异步刷新，不阻塞当前操作
        setTimeout(() => {
          this.flush();
        }, 0);
      }
    } catch (e) {
      // 缓存失败时静默处理，不影响主流程
      console.error('[LogStorage] 缓存日志失败:', e);
    }
  }

  /**
   * 将内存缓存刷新到文件
   * @param {boolean} force - 是否强制刷新（即使正在写入）
   * @returns {Promise<void>}
   */
  async flush(force = false) {
    if (!this.enabled || this.cache.length === 0) {
      return;
    }

    if (this.isWriting && !force) {
      return;
    }

    this.isWriting = true;
    
    let logsToWrite = [];
    
    try {
      // 复制缓存并清空
      logsToWrite = [...this.cache];
      this.cache = [];
      this.cacheSize = 0;
      
      // 按日期分组
      const logsByDate = {};
      logsToWrite.forEach(log => {
        const dateKey = this.getDateKey(log.timestamp);
        if (!logsByDate[dateKey]) {
          logsByDate[dateKey] = [];
        }
        logsByDate[dateKey].push(log);
      });
      
      // 写入每个日期的文件
      const writePromises = Object.keys(logsByDate).map(dateKey => {
        return this._appendToFile(dateKey, logsByDate[dateKey]);
      });
      
      await Promise.all(writePromises);
      
      console.log(`[LogStorage] 已刷新 ${logsToWrite.length} 条日志到文件`);
    } catch (e) {
      console.error('[LogStorage] 刷新日志到文件失败:', e);
      // 如果写入失败，将日志重新放回缓存（避免丢失）
      if (logsToWrite.length > 0) {
        this.cache.unshift(...logsToWrite);
        // 重新计算缓存大小
        this.cacheSize = this.cache.reduce((sum, log) => {
          return sum + JSON.stringify(log).length;
        }, 0);
      }
    } finally {
      this.isWriting = false;
    }
  }

  /**
   * 强制刷新缓存（小程序关闭时调用）
   * @returns {Promise<void>}
   */
  async forceFlush() {
    // 停止定时器
    this._stopFlushTimer();
    
    // 强制刷新
    await this.flush(true);
  }

  /**
   * 追加日志到文件（支持循环覆盖）
   * @param {string} dateKey - 日期键（格式：2024_01_15）
   * @param {Array} logs - 日志数组
   * @returns {Promise<void>}
   * @private
   */
  async _appendToFile(dateKey, logs) {
    return new Promise((resolve, reject) => {
      const filePath = `${this.logDir}/${dateKey}.log`;
      const content = logs.map(log => JSON.stringify(log)).join('\n') + '\n';
      // 估算内容大小（UTF-8编码，中文字符占3字节，英文字符占1字节）
      const contentSize = this._estimateByteLength(content);
      
      // 检查文件是否存在
      this.fs.access({
        path: filePath,
        success: async () => {
          // 文件存在，检查文件大小
          try {
            const fileInfo = await this._getFileInfo(filePath);
            const currentSize = fileInfo.size || 0;
            const newSize = currentSize + contentSize;
            
            // 如果文件超过最大大小，进行循环覆盖
            if (newSize > this.maxFileSize) {
              await this._rotateFile(filePath, content);
            } else {
              // 文件未超过限制，直接追加
              this.fs.appendFile({
                filePath: filePath,
                data: content,
                encoding: 'utf8',
                success: () => resolve(),
                fail: (err) => {
                  console.error(`[LogStorage] 追加日志到文件失败: ${filePath}`, err);
                  reject(err);
                }
              });
            }
          } catch (err) {
            // 获取文件信息失败，尝试直接追加
            this.fs.appendFile({
              filePath: filePath,
              data: content,
              encoding: 'utf8',
              success: () => resolve(),
              fail: (err) => {
                console.error(`[LogStorage] 追加日志到文件失败: ${filePath}`, err);
                reject(err);
              }
            });
          }
        },
        fail: () => {
          // 文件不存在，创建新文件
          this.fs.writeFile({
            filePath: filePath,
            data: content,
            encoding: 'utf8',
            success: () => resolve(),
            fail: (err) => {
              console.error(`[LogStorage] 创建日志文件失败: ${filePath}`, err);
              reject(err);
            }
          });
        }
      });
    });
  }

  /**
   * 估算字符串的字节长度（UTF-8编码）
   * @param {string} str - 字符串
   * @returns {number} 字节长度
   * @private
   */
  _estimateByteLength(str) {
    // UTF-8编码：ASCII字符1字节，中文等字符3-4字节
    // 简单估算：使用 encodeURIComponent 计算
    try {
      return encodeURIComponent(str).replace(/%../g, 'x').length;
    } catch (e) {
      // 如果失败，使用字符数 * 2 作为估算（保守估计）
      return str.length * 2;
    }
  }

  /**
   * 获取文件信息
   * @param {string} filePath - 文件路径
   * @returns {Promise<Object>} 文件信息 { size: number }
   * @private
   */
  async _getFileInfo(filePath) {
    return new Promise((resolve, reject) => {
      this.fs.stat({
        path: filePath,
        success: (res) => {
          resolve({ size: res.size || 0 });
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  }

  /**
   * 循环覆盖文件（删除最旧的日志，保留最新的）
   * @param {string} filePath - 文件路径
   * @param {string} newContent - 新日志内容
   * @returns {Promise<void>}
   * @private
   */
  async _rotateFile(filePath, newContent) {
    return new Promise((resolve, reject) => {
      // 读取现有文件内容
      this.fs.readFile({
        filePath: filePath,
        encoding: 'utf8',
        success: (res) => {
          try {
            const existingContent = res.data || '';
            const existingLines = existingContent.split('\n').filter(line => line.trim());
            const newLines = newContent.split('\n').filter(line => line.trim());
            
            // 合并现有日志和新日志
            const allLines = [...existingLines, ...newLines];
            
            // 计算总大小，如果超过限制，删除最旧的日志
            let totalSize = 0;
            let keepFromIndex = 0;
            
            // 从最新日志开始计算，保留最新的日志
            for (let i = allLines.length - 1; i >= 0; i--) {
              const lineSize = this._estimateByteLength(allLines[i] + '\n');
              if (totalSize + lineSize > this.maxFileSize) {
                keepFromIndex = i + 1;
                break;
              }
              totalSize += lineSize;
            }
            
            // 保留从 keepFromIndex 开始的日志
            const keptLines = allLines.slice(keepFromIndex);
            const finalContent = keptLines.join('\n') + '\n';
            
            // 写入文件（覆盖）
            this.fs.writeFile({
              filePath: filePath,
              data: finalContent,
              encoding: 'utf8',
              success: () => {
                if (keepFromIndex > 0) {
                  console.log(`[LogStorage] 文件已循环覆盖，删除了 ${keepFromIndex} 条旧日志`);
                }
                resolve();
              },
              fail: (err) => {
                console.error(`[LogStorage] 循环覆盖文件失败: ${filePath}`, err);
                reject(err);
              }
            });
          } catch (e) {
            console.error(`[LogStorage] 处理文件内容失败: ${filePath}`, e);
            // 如果处理失败，直接覆盖为新内容
            this.fs.writeFile({
              filePath: filePath,
              data: newContent,
              encoding: 'utf8',
              success: () => resolve(),
              fail: (err) => reject(err)
            });
          }
        },
        fail: () => {
          // 读取失败，直接创建新文件
          this.fs.writeFile({
            filePath: filePath,
            data: newContent,
            encoding: 'utf8',
            success: () => resolve(),
            fail: (err) => reject(err)
          });
        }
      });
    });
  }

  /**
   * 从文件读取日志
   * @param {string} filePath - 文件路径
   * @returns {Promise<Array>} 日志数组
   * @private
   */
  async _readLogFile(filePath) {
    return new Promise((resolve) => {
      this.fs.readFile({
        filePath: filePath,
        encoding: 'utf8',
        success: (res) => {
          try {
            // 按行分割，解析每行JSON
            const lines = res.data.split('\n').filter(line => line.trim());
            const logs = lines.map(line => {
              try {
                return JSON.parse(line);
              } catch (e) {
                return null;
              }
            }).filter(log => log !== null);
            resolve(logs);
          } catch (e) {
            console.error(`[LogStorage] 解析日志文件失败: ${filePath}`, e);
            resolve([]);
          }
        },
        fail: () => {
          // 文件不存在或读取失败，返回空数组
          resolve([]);
        }
      });
    });
  }

  /**
   * 获取指定天数内的日志
   * @param {number} days - 天数，默认30天
   * @returns {Promise<Array>} 日志数组
   */
  async getLogs(days = 30) {
    // 先刷新缓存，确保最新日志已写入
    await this.flush();
    
    const logs = [];
    const today = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = this.formatDate(date);
      const filePath = `${this.logDir}/${dateKey}.log`;
      
      try {
        const dayLogs = await this._readLogFile(filePath);
        if (dayLogs && dayLogs.length > 0) {
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
   * @returns {Promise<Array>} 日志数组
   */
  async getLogsByDate(dateKey) {
    // 先刷新缓存，确保最新日志已写入
    await this.flush();
    
    try {
      const filePath = `${this.logDir}/${dateKey}.log`;
      return await this._readLogFile(filePath);
    } catch (e) {
      console.error(`[LogStorage] 读取${dateKey}日志失败:`, e);
      return [];
    }
  }

  /**
   * 清除所有日志
   */
  async clear() {
    try {
      // 先刷新缓存
      await this.forceFlush();
      
      // 获取所有日志文件
      const files = await this._listLogFiles();
      
      // 删除所有文件
      const deletePromises = files.map(file => {
        return new Promise((resolve) => {
          this.fs.unlink({
            filePath: file,
            success: () => resolve(),
            fail: () => resolve() // 忽略删除失败
          });
        });
      });
      
      await Promise.all(deletePromises);
      console.log('[LogStorage] 已清除所有日志');
    } catch (e) {
      console.error('[LogStorage] 清除日志失败:', e);
    }
  }

  /**
   * 删除指定日期的日志
   * @param {string} dateKey - 日期键
   */
  async removeLogsByDate(dateKey) {
    try {
      const filePath = `${this.logDir}/${dateKey}.log`;
      await new Promise((resolve) => {
        this.fs.unlink({
          filePath: filePath,
          success: () => resolve(),
          fail: () => resolve() // 忽略删除失败
        });
      });
    } catch (e) {
      console.error(`[LogStorage] 删除${dateKey}日志失败:`, e);
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
   * 获取所有日志的存储键（日期键）
   * @returns {Promise<Array>} 日期键数组
   */
  async getAllLogKeys() {
    try {
      const files = await this._listLogFiles();
      return files.map(file => {
        // 从文件路径提取日期键：/logs/2024_01_15.log -> 2024_01_15
        const fileName = file.split('/').pop();
        return fileName.replace('.log', '');
      });
    } catch (e) {
      console.error('[LogStorage] 获取日志键失败:', e);
      return [];
    }
  }

  /**
   * 获取日志统计信息
   * @returns {Promise<Object>} 统计信息
   */
  async getStats() {
    try {
      // 先刷新缓存
      await this.flush();
      
      const keys = await this.getAllLogKeys();
      let totalCount = 0;
      
      for (const dateKey of keys) {
        const filePath = `${this.logDir}/${dateKey}.log`;
        const logs = await this._readLogFile(filePath);
        totalCount += logs.length;
      }
      
      return {
        days: keys.length,
        totalCount: totalCount,
        keys: keys,
        cacheCount: this.cache.length,
        cacheSize: this.cacheSize
      };
    } catch (e) {
      console.error('[LogStorage] 获取统计信息失败:', e);
      return { days: 0, totalCount: 0, keys: [], cacheCount: this.cache.length, cacheSize: this.cacheSize };
    }
  }

  /**
   * 获取当前日期的存储键
   * @param {number} timestamp - 时间戳（可选，默认当前时间）
   * @returns {string} 格式：2024_01_15
   */
  getDateKey(timestamp = null) {
    const date = timestamp ? new Date(timestamp) : new Date();
    return this.formatDate(date);
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

