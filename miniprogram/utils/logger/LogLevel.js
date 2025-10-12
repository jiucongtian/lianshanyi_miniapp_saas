/**
 * 日志级别枚举
 * @description 定义系统支持的日志级别
 */
const LogLevel = {
  DEBUG: 0,   // 调试信息，仅开发环境
  INFO: 1,    // 一般信息，开发环境 + 部分生产环境
  WARN: 2,    // 警告信息，所有环境
  ERROR: 3,   // 错误信息，所有环境
  NONE: 999   // 不打印任何日志
};

/**
 * 日志级别名称映射
 */
const LogLevelNames = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.NONE]: 'NONE'
};

/**
 * 根据名称获取日志级别
 * @param {string} name - 级别名称
 * @returns {number} 日志级别
 */
function getLevelByName(name) {
  const upperName = name.toUpperCase();
  for (let level in LogLevelNames) {
    if (LogLevelNames[level] === upperName) {
      return parseInt(level);
    }
  }
  return LogLevel.DEBUG;
}

module.exports = {
  LogLevel,
  LogLevelNames,
  getLevelByName
};

