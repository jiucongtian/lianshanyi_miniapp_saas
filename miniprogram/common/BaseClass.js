/**
 * BaseClass - 所有类的顶层基类
 * 
 * 提供所有类共用的基础功能：
 * - 统一的日志记录（带类名前缀）
 * - 类名获取和管理
 * - 性能监控
 * - 基础工具方法
 * - 错误处理辅助
 * 
 * 使用方式：
 * 1. 所有类都应该直接或间接继承BaseClass
 * 2. 子类可以使用this._log、this._warn、this._error等日志方法
 * 3. 使用this.className获取类名
 * 4. 使用性能监控方法追踪关键操作
 * 
 * 继承关系示例：
 * BaseClass
 *   ├── BaseService (服务层基类)
 *   │     ├── UserService
 *   │     └── ProfileService
 *   ├── BaseController (控制器层基类)
 *   │     ├── ProfileController
 *   │     └── CardController
 *   └── BaseBean (数据层基类)
 *         ├── UserBean
 *         └── ProfileBean
 */

class BaseClass {
  /**
   * 构造函数
   */
  constructor() {
    // 获取类名（用于日志前缀）
    this.className = this.constructor.name;
    
    // 创建时间戳（用于性能追踪）
    this._createdAt = Date.now();
    
    // 性能监控数据
    this._performanceMetrics = new Map();
    
    // 实例ID（用于调试）
    this._instanceId = this._generateInstanceId();
  }

  // ==================== 日志记录方法 ====================

  /**
   * 记录普通日志
   * @param {string} message - 日志消息
   * @param {...any} args - 其他参数
   */
  _log(message, ...args) {
    console.log(`[${this.className}]`, message, ...args);
  }

  /**
   * 记录信息日志（带时间戳）
   * @param {string} message - 日志消息
   * @param {...any} args - 其他参数
   */
  _info(message, ...args) {
    console.info(`[${this.className}][${this._getTimestamp()}]`, message, ...args);
  }

  /**
   * 记录警告日志
   * @param {string} message - 警告消息
   * @param {...any} args - 其他参数
   */
  _warn(message, ...args) {
    console.warn(`[${this.className}]⚠️`, message, ...args);
  }

  /**
   * 记录错误日志
   * @param {string} message - 错误消息
   * @param {Error|any} error - 错误对象
   * @param {...any} args - 其他参数
   */
  _error(message, error = null, ...args) {
    console.error(`[${this.className}]❌`, message, ...args);
    if (error) {
      console.error(`[${this.className}]❌ 错误详情:`, error);
      if (error.stack) {
        console.error(`[${this.className}]❌ 堆栈:`, error.stack);
      }
    }
  }

  /**
   * 记录调试日志（仅在调试模式下输出）
   * @param {string} message - 调试消息
   * @param {...any} args - 其他参数
   */
  _debug(message, ...args) {
    // 可以通过全局配置控制是否输出调试日志
    if (getApp().globalData?.debugMode) {
      console.log(`[${this.className}][DEBUG]`, message, ...args);
    }
  }

  /**
   * 记录方法调用日志
   * @param {string} methodName - 方法名
   * @param {Object} params - 参数
   */
  _logMethodCall(methodName, params = {}) {
    this._debug(`调用方法: ${methodName}`, params);
  }

  /**
   * 记录方法执行结果
   * @param {string} methodName - 方法名
   * @param {boolean} success - 是否成功
   * @param {any} result - 结果
   */
  _logMethodResult(methodName, success, result = null) {
    if (success) {
      this._debug(`方法 ${methodName} 执行成功`, result);
    } else {
      this._error(`方法 ${methodName} 执行失败`, result);
    }
  }

  // ==================== 性能监控方法 ====================

  /**
   * 开始性能监控
   * @param {string} operationName - 操作名称
   * @returns {string} 监控ID
   */
  _startPerformanceMonitor(operationName) {
    const monitorId = `${operationName}_${Date.now()}_${Math.random()}`;
    this._performanceMetrics.set(monitorId, {
      name: operationName,
      startTime: Date.now(),
      endTime: null,
      duration: null
    });
    
    this._debug(`性能监控开始: ${operationName}`, { monitorId });
    return monitorId;
  }

  /**
   * 结束性能监控
   * @param {string} monitorId - 监控ID
   * @returns {number|null} 执行时长（毫秒）
   */
  _endPerformanceMonitor(monitorId) {
    const metric = this._performanceMetrics.get(monitorId);
    if (!metric) {
      this._warn(`未找到性能监控记录: ${monitorId}`);
      return null;
    }
    
    metric.endTime = Date.now();
    metric.duration = metric.endTime - metric.startTime;
    
    this._debug(`性能监控结束: ${metric.name}`, {
      duration: `${metric.duration}ms`,
      monitorId
    });
    
    // 如果执行时间过长，记录警告
    if (metric.duration > 3000) {
      this._warn(`操作 ${metric.name} 执行时间过长: ${metric.duration}ms`);
    }
    
    return metric.duration;
  }

  /**
   * 获取性能监控数据
   * @param {string} monitorId - 监控ID
   * @returns {Object|null} 监控数据
   */
  _getPerformanceMetric(monitorId) {
    return this._performanceMetrics.get(monitorId) || null;
  }

  /**
   * 清除性能监控数据
   */
  _clearPerformanceMetrics() {
    this._performanceMetrics.clear();
  }

  // ==================== 工具方法 ====================

  /**
   * 获取当前时间戳字符串
   * @returns {string} 格式化的时间戳
   */
  _getTimestamp() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    return `${hours}:${minutes}:${seconds}.${ms}`;
  }

  /**
   * 生成实例ID
   * @returns {string} 实例ID
   * @private
   */
  _generateInstanceId() {
    return `${this.className}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取实例ID
   * @returns {string} 实例ID
   */
  getInstanceId() {
    return this._instanceId;
  }

  /**
   * 深拷贝对象
   * @param {any} obj - 要拷贝的对象
   * @returns {any} 拷贝后的对象
   */
  _deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (obj instanceof Date) {
      return new Date(obj);
    }
    
    if (obj instanceof Array) {
      return obj.map(item => this._deepClone(item));
    }
    
    if (obj instanceof Object) {
      const clonedObj = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = this._deepClone(obj[key]);
        }
      }
      return clonedObj;
    }
  }

  /**
   * 安全的JSON解析
   * @param {string} jsonString - JSON字符串
   * @param {any} defaultValue - 解析失败时的默认值
   * @returns {any} 解析结果
   */
  _safeJsonParse(jsonString, defaultValue = null) {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      this._error('JSON解析失败', error, { jsonString });
      return defaultValue;
    }
  }

  /**
   * 安全的JSON序列化
   * @param {any} obj - 要序列化的对象
   * @param {string} defaultValue - 序列化失败时的默认值
   * @returns {string} JSON字符串
   */
  _safeJsonStringify(obj, defaultValue = '{}') {
    try {
      return JSON.stringify(obj);
    } catch (error) {
      this._error('JSON序列化失败', error, { obj });
      return defaultValue;
    }
  }

  /**
   * 延迟执行
   * @param {number} ms - 延迟毫秒数
   * @returns {Promise<void>}
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 重试执行函数
   * @param {Function} fn - 要执行的函数
   * @param {number} maxRetries - 最大重试次数
   * @param {number} delayMs - 重试延迟（毫秒）
   * @returns {Promise<any>} 执行结果
   */
  async _retryAsync(fn, maxRetries = 3, delayMs = 1000) {
    let lastError = null;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        this._warn(`第${i + 1}次执行失败，${i < maxRetries - 1 ? `${delayMs}ms后重试` : '已达最大重试次数'}`);
        
        if (i < maxRetries - 1) {
          await this._delay(delayMs * (i + 1)); // 递增延迟
        }
      }
    }
    
    throw lastError;
  }

  // ==================== 错误处理方法 ====================

  /**
   * 包装异步方法，自动捕获错误
   * @param {Function} fn - 异步函数
   * @param {string} errorMessage - 错误消息
   * @returns {Promise<any>} 执行结果
   */
  async _wrapAsync(fn, errorMessage = '操作失败') {
    try {
      return await fn();
    } catch (error) {
      this._error(errorMessage, error);
      throw error;
    }
  }

  /**
   * 安全执行函数（不抛出异常）
   * @param {Function} fn - 要执行的函数
   * @param {any} defaultValue - 出错时的默认返回值
   * @returns {any} 执行结果或默认值
   */
  _safeExecute(fn, defaultValue = null) {
    try {
      return fn();
    } catch (error) {
      this._error('安全执行函数时出错', error);
      return defaultValue;
    }
  }

  /**
   * 安全执行异步函数（不抛出异常）
   * @param {Function} fn - 要执行的异步函数
   * @param {any} defaultValue - 出错时的默认返回值
   * @returns {Promise<any>} 执行结果或默认值
   */
  async _safeExecuteAsync(fn, defaultValue = null) {
    try {
      return await fn();
    } catch (error) {
      this._error('安全执行异步函数时出错', error);
      return defaultValue;
    }
  }

  // ==================== 数据验证方法 ====================

  /**
   * 检查值是否为空
   * @param {any} value - 要检查的值
   * @returns {boolean} 是否为空
   */
  _isEmpty(value) {
    if (value === null || value === undefined) {
      return true;
    }
    
    if (typeof value === 'string') {
      return value.trim() === '';
    }
    
    if (Array.isArray(value)) {
      return value.length === 0;
    }
    
    if (typeof value === 'object') {
      return Object.keys(value).length === 0;
    }
    
    return false;
  }

  /**
   * 检查是否为有效的对象
   * @param {any} value - 要检查的值
   * @returns {boolean} 是否为有效对象
   */
  _isValidObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  /**
   * 检查是否为有效的数组
   * @param {any} value - 要检查的值
   * @returns {boolean} 是否为有效数组
   */
  _isValidArray(value) {
    return Array.isArray(value) && value.length > 0;
  }

  // ==================== 生命周期方法 ====================

  /**
   * 类实例销毁时的清理工作
   * 子类可以重写此方法进行自定义清理
   */
  destroy() {
    this._log('销毁实例');
    this._clearPerformanceMetrics();
  }

  /**
   * 获取类的创建时间
   * @returns {number} 创建时间戳
   */
  getCreatedAt() {
    return this._createdAt;
  }

  /**
   * 获取类的存活时间
   * @returns {number} 存活时间（毫秒）
   */
  getLifetime() {
    return Date.now() - this._createdAt;
  }

  // ==================== 调试辅助方法 ====================

  /**
   * 打印类的基本信息
   */
  _printInfo() {
    this._log('类信息:', {
      className: this.className,
      instanceId: this._instanceId,
      createdAt: new Date(this._createdAt).toISOString(),
      lifetime: `${this.getLifetime()}ms`,
      performanceMetricsCount: this._performanceMetrics.size
    });
  }

  /**
   * 转换为字符串（用于调试）
   * @returns {string} 字符串表示
   */
  toString() {
    return `[${this.className}#${this._instanceId}]`;
  }
}

module.exports = { BaseClass };
