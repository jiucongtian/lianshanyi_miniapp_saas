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
 * log.info('用户登录成功', { userId: 123 });
 * log.error('用户登录失败', { error: err.message });
 */
function createModuleLogger(moduleName) {
  return {
    debug: (message, data, caller) => logger.debug(moduleName, message, data, caller),
    info: (message, data, caller) => logger.info(moduleName, message, data, caller),
    warn: (message, data, caller) => logger.warn(moduleName, message, data, caller),
    error: (message, data, caller) => logger.error(moduleName, message, data, caller),
    
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

