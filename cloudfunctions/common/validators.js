/**
 * 验证档案数据
 * @param {Object} profileData - 档案数据
 * @returns {Object} 验证结果 { isValid: boolean, errors: Array }
 */
function validateProfileData(profileData) {
  const errors = [];
  
  // 验证必填字段
  if (!profileData.profileName || typeof profileData.profileName !== 'string' || profileData.profileName.trim() === '') {
    errors.push('档案名称不能为空');
  }
  
  if (!profileData.birthDate) {
    errors.push('出生日期不能为空');
  } else {
    // 验证出生日期格式
    const { year, month, day, hour, minute } = profileData.birthDate;
    
    if (!year || !month || !day || hour === undefined) {
      errors.push('出生日期信息不完整');
    } else {
      // 验证年份范围
      if (year < 1900 || year > 2100) {
        errors.push('出生年份超出有效范围（1900-2100）');
      }
      
      // 验证月份范围
      if (month < 1 || month > 12) {
        errors.push('出生月份超出有效范围（1-12）');
      }
      
      // 验证日期范围
      if (day < 1 || day > 31) {
        errors.push('出生日期超出有效范围（1-31）');
      }
      
      // 验证小时范围
      if (hour < 0 || hour > 23) {
        errors.push('出生小时超出有效范围（0-23）');
      }
      
      // 验证分钟范围
      if (minute !== undefined && (minute < 0 || minute > 59)) {
        errors.push('出生分钟超出有效范围（0-59）');
      }
    }
  }
  
  // 验证性别（可选）
  if (profileData.gender !== undefined && ![0, 1].includes(profileData.gender)) {
    errors.push('性别值无效（0-女，1-男）');
  }
  
  // 验证档案名称长度
  if (profileData.profileName && profileData.profileName.length > 50) {
    errors.push('档案名称不能超过50个字符');
  }
  
  // 验证描述长度
  if (profileData.description && profileData.description.length > 500) {
    errors.push('档案描述不能超过500个字符');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * 验证用户数据
 * @param {Object} userData - 用户数据
 * @returns {Object} 验证结果 { isValid: boolean, errors: Array }
 */
function validateUserData(userData) {
  const errors = [];
  
  // 验证openid
  if (!userData.openid || typeof userData.openid !== 'string') {
    errors.push('用户openid不能为空');
  }
  
  // 验证用户类型
  if (userData.userType && !['guest', 'normal', 'premium'].includes(userData.userType)) {
    errors.push('用户类型无效');
  }
  
  // 验证昵称长度
  if (userData.nickName && userData.nickName.length > 100) {
    errors.push('用户昵称不能超过100个字符');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * 验证分页参数
 * @param {Object} queryData - 查询数据
 * @returns {Object} 验证结果 { isValid: boolean, errors: Array, normalizedData: Object }
 */
function validatePaginationParams(queryData) {
  const errors = [];
  const normalizedData = {};
  
  // 验证页码
  const page = parseInt(queryData.page) || 1;
  if (page < 1) {
    errors.push('页码必须大于0');
  }
  normalizedData.page = page;
  
  // 验证每页数量
  const limit = parseInt(queryData.limit) || 20;
  if (limit < 1 || limit > 100) {
    errors.push('每页数量必须在1-100之间');
  }
  normalizedData.limit = limit;
  
  return {
    isValid: errors.length === 0,
    errors: errors,
    normalizedData: normalizedData
  };
}

/**
 * 验证档案ID
 * @param {string} profileId - 档案ID
 * @returns {Object} 验证结果 { isValid: boolean, error: string }
 */
function validateProfileId(profileId) {
  if (!profileId || typeof profileId !== 'string' || profileId.trim() === '') {
    return {
      isValid: false,
      error: '档案ID不能为空'
    };
  }
  
  return {
    isValid: true,
    error: null
  };
}

/**
 * 验证出生日期对象
 * @param {Object} birthDate - 出生日期对象
 * @returns {Object} 验证结果 { isValid: boolean, errors: Array }
 */
function validateBirthDate(birthDate) {
  const errors = [];
  
  if (!birthDate) {
    errors.push('出生日期不能为空');
    return { isValid: false, errors };
  }
  
  const { year, month, day, hour, minute } = birthDate;
  
  // 验证必需字段
  if (year === undefined || month === undefined || day === undefined || hour === undefined) {
    errors.push('出生日期信息不完整');
  } else {
    // 验证数值范围
    if (year < 1900 || year > 2100) {
      errors.push('出生年份超出有效范围（1900-2100）');
    }
    
    if (month < 1 || month > 12) {
      errors.push('出生月份超出有效范围（1-12）');
    }
    
    if (day < 1 || day > 31) {
      errors.push('出生日期超出有效范围（1-31）');
    }
    
    if (hour < 0 || hour > 23) {
      errors.push('出生小时超出有效范围（0-23）');
    }
    
    if (minute !== undefined && (minute < 0 || minute > 59)) {
      errors.push('出生分钟超出有效范围（0-59）');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

module.exports = {
  validateProfileData,
  validateUserData,
  validatePaginationParams,
  validateProfileId,
  validateBirthDate
};
