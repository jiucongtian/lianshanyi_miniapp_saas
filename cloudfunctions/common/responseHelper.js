/**
 * 创建成功响应
 * @param {any} data - 响应数据
 * @param {string} message - 响应消息
 * @returns {Object} 成功响应对象
 */
function success(data, message = '操作成功') {
  return {
    success: true,
    data: data,
    message: message,
    code: 0,
    timestamp: new Date().getTime()
  };
}

/**
 * 创建错误响应
 * @param {string} errorMessage - 错误消息
 * @param {number} code - 错误码
 * @param {any} data - 附加数据
 * @returns {Object} 错误响应对象
 */
function error(errorMessage, code = -1, data = null) {
  return {
    success: false,
    error: errorMessage,
    code: code,
    data: data,
    timestamp: new Date().getTime()
  };
}

/**
 * 创建分页响应
 * @param {Array} items - 数据项数组
 * @param {number} total - 总数量
 * @param {number} page - 当前页码
 * @param {number} limit - 每页数量
 * @param {string} message - 响应消息
 * @returns {Object} 分页响应对象
 */
function paginated(items, total, page, limit, message = '获取数据成功') {
  return success({
    items: items,
    total: total,
    page: page,
    limit: limit,
    hasMore: (page * limit) < total
  }, message);
}

/**
 * 创建档案列表响应（兼容现有接口）
 * @param {Array} profiles - 档案数组
 * @param {number} total - 总数量
 * @param {number} page - 当前页码
 * @param {number} limit - 每页数量
 * @returns {Object} 档案列表响应对象
 */
function profileListResponse(profiles, total, page, limit) {
  return success({
    profiles: profiles,
    total: total,
    page: page,
    limit: limit,
    hasMore: (page * limit) < total
  }, '获取档案列表成功');
}

/**
 * 创建配额超限响应
 * @param {string} userType - 用户类型
 * @param {string} typeName - 类型名称
 * @param {number} currentCount - 当前数量
 * @param {number} quota - 配额限制
 * @returns {Object} 配额超限响应对象
 */
function quotaExceededResponse(userType, typeName, currentCount, quota) {
  let errorMessage = `档案数量已达上限（${quota}个）`;
  if (userType === 'guest') {
    errorMessage += '，注册后可创建更多档案';
  } else if (userType === 'normal') {
    errorMessage += '，升级高级版可无限制创建档案';
  }
  
  return error(errorMessage, 'QUOTA_EXCEEDED', {
    userType,
    typeName,
    currentCount,
    quota
  });
}

module.exports = {
  success,
  error,
  paginated,
  profileListResponse,
  quotaExceededResponse
};
