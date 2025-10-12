/**
 * 日志模块统一导出文件
 */

const logger = require('./Logger');
const { LogLevel, LogLevelNames, getLevelByName } = require('./LogLevel');
const { LogStorage } = require('./LogStorage');
const { LogCleaner } = require('./LogCleaner');

module.exports = {
  // 默认导出 logger 实例
  default: logger,
  logger,
  
  // 导出类和工具
  LogLevel,
  LogLevelNames,
  getLevelByName,
  LogStorage,
  LogCleaner
};

