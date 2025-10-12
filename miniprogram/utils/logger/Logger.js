/**
 * 日志管理器
 * @description 统一的日志打印和存储管理器，支持环境区分、本地存储、调用栈追踪
 */
const { LogLevel, LogLevelNames } = require('./LogLevel');
const { LogStorage } = require('./LogStorage');
const { config } = require('../../config/index');

class Logger {
  constructor() {
    // 从配置文件读取调试模式
    this.debugMode = config.debugMode || false;
    
    // 日志配置
    const loggerConfig = config.logger || {};
    
    // 初始化存储管理器
    this.storage = new LogStorage(loggerConfig.storage || {});
    
    // 获取当前环境配置
    this.envConfig = this.debugMode 
      ? (loggerConfig.development || {})
      : (loggerConfig.production || {});
    
    // 是否输出到控制台
    this.consoleEnabled = this.envConfig.console !== false;
    
    // 允许的日志级别
    this.allowedLevels = this.envConfig.levels || ['WARN', 'ERROR'];
    
    // 日志格式配置
    this.formatConfig = loggerConfig.format || {
      showDate: true,
      showTime: true,
      showLevel: true,
      showModule: true,
      showClass: true,
      showMethod: true
    };
    
    // 敏感字段列表
    this.sensitiveFields = ['password', 'token', 'openid', 'sessionKey', 'phoneNumber'];
    
    // 缓存系统信息（避免每次都调用已废弃的API）
    this.cachedDeviceInfo = this._getCachedDeviceInfo();
    
    console.log(`[Logger] 初始化完成 - 调试模式: ${this.debugMode}, 控制台输出: ${this.consoleEnabled}`);
  }
  
  /**
   * 获取并缓存设备信息（使用新API）
   * @private
   */
  _getCachedDeviceInfo() {
    try {
      // 使用新的API替代废弃的 wx.getSystemInfoSync
      const deviceInfo = wx.getDeviceInfo ? wx.getDeviceInfo() : {};
      const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : {};
      const appBaseInfo = wx.getAppBaseInfo ? wx.getAppBaseInfo() : {};
      
      return {
        model: deviceInfo.model || 'unknown',
        system: deviceInfo.system || 'unknown',
        platform: deviceInfo.platform || 'unknown',
        version: appBaseInfo.version || 'unknown',
        SDKVersion: appBaseInfo.SDKVersion || 'unknown'
      };
    } catch (error) {
      // 如果新API不存在，降级使用空对象
      return {
        model: 'unknown',
        system: 'unknown', 
        platform: 'unknown',
        version: 'unknown',
        SDKVersion: 'unknown'
      };
    }
  }

  /**
   * 调试日志（仅开发环境）
   * @param {string} module - 功能模块名
   * @param {string} message - 日志信息
   * @param {any} data - 附加数据（可选）
   * @param {string} caller - 调用者信息（可选，自动获取）
   */
  debug(module, message, data = undefined, caller = null) {
    this._log(LogLevel.DEBUG, module, message, data, caller);
  }

  /**
   * 信息日志
   * @param {string} module - 功能模块名
   * @param {string} message - 日志信息
   * @param {any} data - 附加数据（可选）
   * @param {string} caller - 调用者信息（可选，自动获取）
   */
  info(module, message, data = undefined, caller = null) {
    this._log(LogLevel.INFO, module, message, data, caller);
  }

  /**
   * 警告日志
   * @param {string} module - 功能模块名
   * @param {string} message - 日志信息
   * @param {any} data - 附加数据（可选）
   * @param {string} caller - 调用者信息（可选，自动获取）
   */
  warn(module, message, data = undefined, caller = null) {
    this._log(LogLevel.WARN, module, message, data, caller);
  }

  /**
   * 错误日志（总是打印并存储）
   * @param {string} module - 功能模块名
   * @param {string} message - 日志信息
   * @param {any} error - 错误对象或附加数据
   * @param {string} caller - 调用者信息（可选，自动获取）
   */
  error(module, message, error = undefined, caller = null) {
    this._log(LogLevel.ERROR, module, message, error, caller);
  }

  /**
   * 核心日志方法
   * @private
   */
  _log(level, module, message, data, caller) {
    // 检查是否应该记录此级别的日志
    if (!this.shouldLog(level)) {
      return;
    }

    try {
      // 获取调用者信息（如果提供了 caller 字符串，需要解析）
      let callerInfo;
      if (caller) {
        // caller 格式为 "ClassName:methodName" 或 "methodName"
        const parts = caller.split(':');
        if (parts.length === 2) {
          callerInfo = { className: parts[0], methodName: parts[1] };
        } else {
          callerInfo = { className: '', methodName: parts[0] };
        }
      } else {
        callerInfo = this.getCallerInfo();
      }
      
      // 构建日志对象
      const logData = {
        timestamp: Date.now(),
        level: LogLevelNames[level],
        module: module,
        className: callerInfo.className,
        methodName: callerInfo.methodName,
        message: message,
        data: this.formatData(data)
      };

      // 输出到控制台
      if (this.consoleEnabled) {
        this.printToConsole(level, logData);
      }

      // 保存到本地存储
      this.saveToStorage(logData);
    } catch (e) {
      // 日志记录失败不应影响主流程
      console.error('[Logger] 记录日志失败:', e);
    }
  }

  /**
   * 判断是否应该记录此级别的日志
   * @private
   */
  shouldLog(level) {
    const levelName = LogLevelNames[level];
    
    // 开发模式：记录所有级别
    if (this.debugMode) {
      return true;
    }
    
    // 生产模式：只记录配置中允许的级别
    return this.allowedLevels.includes(levelName);
  }

  /**
   * 输出到控制台
   * @private
   */
  printToConsole(level, logData) {
    // 根据配置动态构建前缀
    const prefixParts = [];
    
    // 日期时间
    if (this.formatConfig.showDate || this.formatConfig.showTime) {
      const formattedTime = this.formatTime(logData.timestamp);
      if (this.formatConfig.showDate && this.formatConfig.showTime) {
        // 显示完整日期时间
        prefixParts.push(formattedTime);
      } else if (this.formatConfig.showDate) {
        // 仅显示日期部分（年-月-日）
        prefixParts.push(formattedTime.split(' ')[0]);
      } else if (this.formatConfig.showTime) {
        // 仅显示时间部分（时:分:秒.毫秒）
        prefixParts.push(formattedTime.split(' ')[1]);
      }
    }
    
    // 日志级别
    if (this.formatConfig.showLevel) {
      prefixParts.push(logData.level);
    }
    
    // 模块名
    if (this.formatConfig.showModule) {
      prefixParts.push(logData.module);
    }
    
    // 类名和方法名
    const callerParts = [];
    if (this.formatConfig.showClass && logData.className) {
      callerParts.push(logData.className);
    }
    if (this.formatConfig.showMethod && logData.methodName) {
      callerParts.push(logData.methodName);
    }
    if (callerParts.length > 0) {
      prefixParts.push(callerParts.join(':'));
    }
    
    // 构建最终前缀
    const prefix = prefixParts.map(part => `[${part}]`).join(' ');
    
    const message = logData.data !== undefined 
      ? `${logData.message}:`
      : logData.message;

    // 根据级别选择对应的console方法，便于在控制台筛选器中过滤
    switch (level) {
      case LogLevel.DEBUG:
        // 使用console.debug，如果不支持则降级到console.log
        if (logData.data !== undefined) {
          (console.debug || console.log).call(console, prefix, message, logData.data);
        } else {
          (console.debug || console.log).call(console, prefix, message);
        }
        break;
      case LogLevel.INFO:
        // 使用console.info
        if (logData.data !== undefined) {
          console.info(prefix, message, logData.data);
        } else {
          console.info(prefix, message);
        }
        break;
      case LogLevel.WARN:
        // 使用console.warn
        if (logData.data !== undefined) {
          console.warn(prefix, message, logData.data);
        } else {
          console.warn(prefix, message);
        }
        break;
      case LogLevel.ERROR:
        // 使用console.error
        if (logData.data !== undefined) {
          console.error(prefix, message, logData.data);
        } else {
          console.error(prefix, message);
        }
        break;
    }
  }

  /**
   * 保存到本地存储
   * @private
   */
  saveToStorage(logData) {
    try {
      // 使用缓存的设备信息（避免每次都调用API）
      const storageData = {
        ...logData,
        deviceInfo: this.cachedDeviceInfo
      };
      
      this.storage.save(storageData);
    } catch (e) {
      // 存储失败不影响主流程
      console.error('[Logger] 保存日志到本地失败:', e);
    }
  }

  /**
   * 获取调用者信息（类名和方法名）
   * @private
   * @returns {Object} 格式：{ className: string, methodName: string }
   */
  getCallerInfo() {
    try {
      const stack = new Error().stack;
      if (!stack) return { className: '', methodName: 'Unknown' };
      
      const lines = stack.split('\n');
      
      // 跳过前面的内部调用，找到实际调用者
      // 调用链示例：Error -> getCallerInfo -> _log -> info -> BaseClass._info -> BaseBean.method -> UserBean.method
      // 目标：跳过所有框架层级，返回最顶层的业务代码调用位置
      for (let i = 2; i < lines.length; i++) {
        const line = lines[i];
        
        // 跳过 Logger 内部调用和所有 Base 类调用（框架层级）
        if (line.includes('Logger.js') || 
            line.includes('logger/') || 
            line.includes('BaseClass.js') ||
            line.includes('BaseService.js') ||
            line.includes('BaseController.js') ||
            line.includes('BaseBean.js')) {
          continue;
        }
        
        // 解析调用栈行（不包含行号）
        const info = this.parseStackLine(line);
        if (info) {
          return info;
        }
      }
      
      return { className: '', methodName: 'Unknown' };
    } catch (e) {
      return { className: '', methodName: 'Unknown' };
    }
  }

  /**
   * 解析调用栈行，提取类名、方法名（不包含行号）
   * @private
   * @returns {Object|null} { className: string, methodName: string } 或 null
   */
  parseStackLine(line) {
    try {
      // 微信小程序的调用栈格式示例：
      // at UserService.getUserInfo (UserService.js:125:10)
      // at Object.getUserInfo (pages/index/index.js:45:20)
      // at UserService.getUserInfo (weapp:///...UserService.js?t=wechat&s=xxx:24:14)
      
      // 匹配模式1: at ClassName.methodName (file:line:col)
      let match = line.match(/at\s+(\w+)\.(\w+)\s+\(/);
      if (match) {
        const className = match[1];
        const methodName = match[2];
        return { className, methodName };
      }
      
      // 匹配模式2: at Object.methodName (file:line:col)
      match = line.match(/at\s+Object\.(\w+)\s+\(/);
      if (match) {
        const methodName = match[1];
        return { className: 'Object', methodName };
      }
      
      // 匹配模式3: at methodName (file:line:col)
      match = line.match(/at\s+(\w+)\s+\(/);
      if (match) {
        const methodName = match[1];
        return { className: '', methodName };
      }
      
      // 匹配模式4: at file:line:col（提取纯文件名，去掉路径和查询参数）
      match = line.match(/at\s+(.+):(\d+):\d+/);
      if (match) {
        let filePath = match[1];
        // 去掉查询参数
        filePath = filePath.split('?')[0];
        // 提取文件名
        const fileName = filePath.split('/').pop();
        // 去掉扩展名
        const fileNameWithoutExt = fileName.replace(/\.(js|ts|jsx|tsx)$/, '');
        return { className: '', methodName: fileNameWithoutExt };
      }
      
      return null;
    } catch (e) {
      return null;
    }
  }

  /**
   * 格式化数据，处理敏感信息和大对象
   * @private
   */
  formatData(data) {
    if (data === undefined || data === null) {
      return undefined;
    }

    try {
      // 过滤敏感信息
      const filtered = this.filterSensitiveData(data);
      
      // 检查大小并截断
      const str = JSON.stringify(filtered);
      if (str.length > 5120) { // 5KB
        return str.substring(0, 5120) + '...[truncated]';
      }
      
      return filtered;
    } catch (e) {
      // 无法序列化的对象（如循环引用）
      return '[Complex or Circular Object]';
    }
  }

  /**
   * 过滤敏感数据
   * @private
   */
  filterSensitiveData(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    try {
      // 深拷贝
      const filtered = JSON.parse(JSON.stringify(data));
      
      // 递归过滤
      const filter = (obj) => {
        for (let key in obj) {
          if (this.sensitiveFields.includes(key)) {
            obj[key] = '***';
          } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            filter(obj[key]);
          }
        }
      };
      
      filter(filtered);
      return filtered;
    } catch (e) {
      return data;
    }
  }

  /**
   * 格式化时间戳
   * @private
   */
  formatTime(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    const ms = String(date.getMilliseconds()).padStart(3, '0');
    
    return `${year}-${month}-${day} ${hour}:${minute}:${second}.${ms}`;
  }

  /**
   * 获取日志统计信息
   */
  getStats() {
    return this.storage.getStats();
  }

  /**
   * 清除所有日志
   */
  clearLogs() {
    this.storage.clear();
  }

  /**
   * 获取最近的日志
   * @param {number} days - 天数
   */
  getRecentLogs(days = 7) {
    return this.storage.getLogs(days);
  }
}

// 导出单例
const logger = new Logger();

module.exports = logger;
module.exports.Logger = Logger;

