/**
 * 错误码定义
 */
const ERROR_CODES = {
  // 通用错误码
  UNKNOWN_ERROR: -1,
  INVALID_PARAMETER: -2,
  MISSING_REQUIRED_FIELD: -3,
  VALIDATION_FAILED: -4,
  
  // 用户相关错误码
  USER_NOT_FOUND: -100,
  USER_NOT_ACTIVE: -101,
  USER_QUOTA_EXCEEDED: -102,
  USER_PERMISSION_DENIED: -103,
  
  // 档案相关错误码
  PROFILE_NOT_FOUND: -200,
  PROFILE_CREATE_FAILED: -201,
  PROFILE_UPDATE_FAILED: -202,
  PROFILE_DELETE_FAILED: -203,
  PROFILE_QUOTA_EXCEEDED: -204,
  
  // 八字计算相关错误码
  BAZI_CALCULATION_FAILED: -300,
  BAZI_API_ERROR: -301,
  BAZI_INVALID_DATE: -302,
  
  // 数据库相关错误码
  DATABASE_ERROR: -400,
  DATABASE_CONNECTION_FAILED: -401,
  DATABASE_QUERY_FAILED: -402,
  
  // 网络相关错误码
  NETWORK_ERROR: -500,
  API_TIMEOUT: -501,
  EXTERNAL_API_ERROR: -502
};

/**
 * 错误消息映射
 */
const ERROR_MESSAGES = {
  [ERROR_CODES.UNKNOWN_ERROR]: '未知错误',
  [ERROR_CODES.INVALID_PARAMETER]: '参数无效',
  [ERROR_CODES.MISSING_REQUIRED_FIELD]: '缺少必填字段',
  [ERROR_CODES.VALIDATION_FAILED]: '数据验证失败',
  
  [ERROR_CODES.USER_NOT_FOUND]: '用户不存在',
  [ERROR_CODES.USER_NOT_ACTIVE]: '用户未激活',
  [ERROR_CODES.USER_QUOTA_EXCEEDED]: '用户配额已超限',
  [ERROR_CODES.USER_PERMISSION_DENIED]: '用户权限不足',
  
  [ERROR_CODES.PROFILE_NOT_FOUND]: '档案不存在',
  [ERROR_CODES.PROFILE_CREATE_FAILED]: '档案创建失败',
  [ERROR_CODES.PROFILE_UPDATE_FAILED]: '档案更新失败',
  [ERROR_CODES.PROFILE_DELETE_FAILED]: '档案删除失败',
  [ERROR_CODES.PROFILE_QUOTA_EXCEEDED]: '档案数量已达上限',
  
  [ERROR_CODES.BAZI_CALCULATION_FAILED]: '八字计算失败',
  [ERROR_CODES.BAZI_API_ERROR]: '八字API调用失败',
  [ERROR_CODES.BAZI_INVALID_DATE]: '出生日期无效',
  
  [ERROR_CODES.DATABASE_ERROR]: '数据库操作失败',
  [ERROR_CODES.DATABASE_CONNECTION_FAILED]: '数据库连接失败',
  [ERROR_CODES.DATABASE_QUERY_FAILED]: '数据库查询失败',
  
  [ERROR_CODES.NETWORK_ERROR]: '网络错误',
  [ERROR_CODES.API_TIMEOUT]: 'API调用超时',
  [ERROR_CODES.EXTERNAL_API_ERROR]: '外部API调用失败'
};

/**
 * 获取错误消息
 * @param {number} errorCode - 错误码
 * @param {string} customMessage - 自定义错误消息
 * @returns {string} 错误消息
 */
function getErrorMessage(errorCode, customMessage = null) {
  if (customMessage) {
    return customMessage;
  }
  
  return ERROR_MESSAGES[errorCode] || ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR];
}

/**
 * 创建标准错误对象
 * @param {number} errorCode - 错误码
 * @param {string} customMessage - 自定义错误消息
 * @param {any} data - 附加数据
 * @returns {Object} 标准错误对象
 */
function createError(errorCode, customMessage = null, data = null) {
  return {
    success: false,
    error: getErrorMessage(errorCode, customMessage),
    code: errorCode,
    data: data,
    timestamp: new Date().getTime()
  };
}

/**
 * 检查是否为已知错误码
 * @param {number} errorCode - 错误码
 * @returns {boolean} 是否为已知错误码
 */
function isValidErrorCode(errorCode) {
  return Object.values(ERROR_CODES).includes(errorCode);
}

module.exports = {
  ERROR_CODES,
  ERROR_MESSAGES,
  getErrorMessage,
  createError,
  isValidErrorCode
};
