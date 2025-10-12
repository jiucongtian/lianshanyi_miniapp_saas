/**
 * 日志模块统一导出文件
 */

const logger = require('./Logger');
const { LogLevel, LogLevelNames, getLevelByName } = require('./LogLevel');
const { LogStorage } = require('./LogStorage');
const { LogCleaner } = require('./LogCleaner');

/**
 * 为指定模块创建 logger 包装器
 * @param {string} moduleName - 模块名称
 * @returns {Object} logger 包装对象
 * 
 * @example
 * // 在非类文件中使用
 * const { createModuleLogger } = require('@logger/');
 * const log = createModuleLogger('UserManager');
 * 
 * log.info('getUserInfo', '用户登录成功', { userId: 123 });
 * log.error('login', '用户登录失败', { error: err.message });
 */
function createModuleLogger(moduleName) {
  return {
    debug: (methodName, message, data = undefined) => {
      const caller = `${moduleName}:${methodName}`;
      logger.debug(moduleName, message, data, caller);
    },
    info: (methodName, message, data = undefined) => {
      const caller = `${moduleName}:${methodName}`;
      logger.info(moduleName, message, data, caller);
    },
    warn: (methodName, message, data = undefined) => {
      const caller = `${moduleName}:${methodName}`;
      logger.warn(moduleName, message, data, caller);
    },
    error: (methodName, message, data = undefined) => {
      const caller = `${moduleName}:${methodName}`;
      logger.error(moduleName, message, data, caller);
    },
    
    // 性能追踪方法
    timeStart: (label) => logger.timeStart(label),
    timeEnd: (label) => logger.timeEnd(label),
    
    // 提供对原始 logger 的访问
    _logger: logger
  };
}

module.exports = {
  // 默认导出 logger 实例
  default: logger,
  logger,
  
  // 模块 logger 工厂函数
  createModuleLogger,
  
  // 导出类和工具
  LogLevel,
  LogLevelNames,
  getLevelByName,
  LogStorage,
  LogCleaner
};

