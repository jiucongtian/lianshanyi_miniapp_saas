// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV // 使用当前云环境
});

const db = cloud.database();
const _ = db.command;

/**
 * 错误码定义
 */
const ERROR_CODES = {
  INVALID_PARAMS: 'INVALID_PARAMS',
  FUNCTION_NOT_FOUND: 'FUNCTION_NOT_FOUND',
  INVALID_CONFIG: 'INVALID_CONFIG',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  CHECK_QUOTA_FAILED: 'CHECK_QUOTA_FAILED',
  QUOTA_INSUFFICIENT: 'QUOTA_INSUFFICIENT',
  DEDUCT_QUOTA_FAILED: 'DEDUCT_QUOTA_FAILED',
  FUNCTION_CALL_FAILED: 'FUNCTION_CALL_FAILED',
  RECORD_USAGE_FAILED: 'RECORD_USAGE_FAILED',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
};

/**
 * 创建成功响应
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
 */
function error(errorMessage, code = ERROR_CODES.INTERNAL_ERROR, data = null) {
  return {
    success: false,
    error: errorMessage,
    code: code,
    data: data,
    timestamp: new Date().getTime()
  };
}

/**
 * 获取用户信息
 */
async function getUserInfo(openid) {
  try {
    const result = await db.collection('users')
      .where({ openid: openid, isActive: true })
      .get();
    
    if (result.data.length === 0) {
      return null;
    }
    
    return result.data[0];
  } catch (err) {
    console.error('[getUserInfo] 获取用户信息失败:', err);
    throw err;
  }
}

/**
 * 获取用户类型配置（带缓存）
 */
let configCache = {};
let cacheTime = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

async function getUserTypeConfig(typeCode) {
  // 检查缓存
  if (configCache[typeCode] && cacheTime[typeCode]) {
    if (Date.now() - cacheTime[typeCode] < CACHE_DURATION) {
      console.log('[getUserTypeConfig] 使用缓存配置:', typeCode);
      return configCache[typeCode];
    }
  }
  
  console.log('[getUserTypeConfig] 从数据库获取配置:', typeCode);
  
  const result = await db.collection('static_user_types')
    .where({ typeCode: typeCode })
    .get();
  
  if (result.data.length === 0) {
    const errorMsg = `用户类型配置不存在: ${typeCode}，请在 static_user_types 表中添加配置`;
    console.error('[getUserTypeConfig]', errorMsg);
    throw new Error(errorMsg);
  }
  
  const config = result.data[0];
  
  // 更新缓存
  configCache[typeCode] = config;
  cacheTime[typeCode] = Date.now();
  
  return config;
}

/**
 * 检查用户权限
 */
async function checkUserPermission(openid, functionCode) {
  try {
    // 1. 获取用户信息
    const user = await getUserInfo(openid);
    if (!user) {
      return {
        allowed: false,
        message: '用户不存在',
        userType: null
      };
    }
    
    // 2. 获取用户类型配置
    const userType = user.userType || user.userTypeCode || 'guest';
    const typeConfig = await getUserTypeConfig(userType);
    
    // 3. 检查权限（目前所有用户都可以使用，后续可扩展）
    // 如果用户类型是 guest，可能需要限制某些功能
    // 这里暂时允许所有用户使用所有功能
    
    return {
      allowed: true,
      message: '权限检查通过',
      userType: userType,
      typeConfig: typeConfig
    };
  } catch (err) {
    console.error('[checkUserPermission] 权限检查失败:', err);
    return {
      allowed: false,
      message: '权限检查失败: ' + err.message,
      userType: null
    };
  }
}

/**
 * 从 function_products 查询功能配置
 */
async function getFunctionProduct(functionCode) {
  try {
    const result = await db.collection('function_products')
      .where({
        functionCode: functionCode,
        status: 'active'
      })
      .get();
    
    if (result.data.length === 0) {
      return null;
    }
    
    return result.data[0];
  } catch (err) {
    console.error('[getFunctionProduct] 查询功能商品失败:', err);
    throw err;
  }
}

/**
 * 调用配额管理云函数
 */
async function callQuotaManagement(action, data) {
  try {
    const result = await cloud.callFunction({
      name: 'functionQuotaManagement_v1_4',
      data: {
        action: action,
        data: data
      }
    });
    
    return result.result;
  } catch (err) {
    console.error(`[callQuotaManagement] 调用配额管理失败 (${action}):`, err);
    throw err;
  }
}

/**
 * 工作流类型映射
 * 将网关中的工作流类型映射为目标云函数支持的工作流类型
 */
function mapWorkflowType(workflowType) {
  const workflowMapping = {
    'WISDOM_INSIGHT': 'DRAW_CARD',  // 智慧洞见映射到抽卡牌工作流（两者是同一个功能）
    // 可以在这里添加更多映射
  };
  
  return workflowMapping[workflowType] || workflowType;
}

/**
 * 调用目标云函数
 */
async function callTargetFunction(callConfig, functionParams) {
  try {
    const { targetFunction, targetAction, workflowType, parameters = {} } = callConfig;
    
    if (!targetFunction) {
      throw new Error('callConfig.targetFunction 不能为空');
    }
    
    // 映射工作流类型（如 WISDOM_INSIGHT -> DRAW_CARD）
    const mappedWorkflowType = workflowType ? mapWorkflowType(workflowType) : workflowType;
    
    // 合并默认参数和用户参数
    const mergedParameters = {
      ...parameters,
      ...(functionParams.parameters || {})
    };
    
    // 构建调用参数
    let callData = {};
    
    if (targetAction) {
      // 如果目标云函数使用 action 格式
      callData = {
        action: targetAction,
        data: {
          workflowType: mappedWorkflowType,
          parameters: mergedParameters
        }
      };
    } else {
      // 直接调用格式（如 cozeFunctions）
      callData = {
        workflowType: mappedWorkflowType,
        parameters: mergedParameters
      };
    }
    
    console.log(`[callTargetFunction] 调用云函数: ${targetFunction}`);
    console.log(`[callTargetFunction] 工作流类型映射: ${workflowType} -> ${mappedWorkflowType}`);
    console.log('[callTargetFunction] 调用参数:', JSON.stringify(callData, null, 2));
    
    const result = await cloud.callFunction({
      name: targetFunction,
      data: callData
    });
    
    console.log(`[callTargetFunction] 云函数返回:`, result.result);
    
    return result.result;
  } catch (err) {
    console.error('[callTargetFunction] 调用目标云函数失败:', err);
    throw err;
  }
}

/**
 * 记录功能使用
 */
async function recordFunctionUsage(openid, functionCode, functionName, usageData, result, isPaid, quotaBefore, quotaAfter, orderId = null) {
  try {
    const usageDate = new Date();
    usageDate.setHours(0, 0, 0, 0);
    
    const record = {
      openid: openid,
      functionCode: functionCode,
      functionName: functionName,
      usageTime: new Date(),
      usageDate: usageDate,
      usageData: usageData || {},
      result: result || {},
      isPaid: isPaid,
      quotaBefore: quotaBefore || {},
      quotaAfter: quotaAfter || {},
      orderId: orderId || null
    };
    
    await db.collection('function_usage_records').add({
      data: record
    });
    
    console.log('[recordFunctionUsage] 使用记录已保存:', functionCode);
    return true;
  } catch (err) {
    // 记录失败不影响主流程，只记录日志
    console.error('[recordFunctionUsage] 记录使用失败:', err);
    return false;
  }
}

/**
 * 判断功能是否为免费功能
 */
function isFreeFunction(product) {
  // 如果功能不在商品表中，认为是免费功能（如 GEN_BAZI）
  if (!product) {
    return true;
  }
  
  // 如果 functionType 为 'free'，认为是免费功能
  if (product.functionType === 'free') {
    return true;
  }
  
  // 如果 price 为 0 或未设置，认为是免费功能
  if (!product.price || product.price === 0) {
    return true;
  }
  
  return false;
}

/**
 * 统一调用接口
 */
async function callFunction(openid, functionCode, functionParams = {}) {
  try {
    console.log('[callFunction] 开始调用功能:', { openid, functionCode, functionParams });
    
    // 1. 验证参数
    if (!functionCode) {
      return error('缺少必要参数: functionCode', ERROR_CODES.INVALID_PARAMS);
    }
    
    // 2. 查询功能配置（如果功能不在商品表中，允许直接调用，认为是免费功能）
    const product = await getFunctionProduct(functionCode);
    
    // 如果功能不在商品表中，需要从 functionParams 中获取调用配置
    let callConfig = null;
    let functionName = functionCode;
    
    if (product) {
      // 功能在商品表中，使用商品配置
      callConfig = product.callConfig;
      functionName = product.functionName;
      
      // 验证配置
      if (!callConfig || !callConfig.targetFunction) {
        return error(`功能配置错误: ${functionCode}`, ERROR_CODES.INVALID_CONFIG);
      }
    } else {
      // 功能不在商品表中，尝试从 functionParams 中获取调用配置
      if (!functionParams.callConfig || !functionParams.callConfig.targetFunction) {
        return error(`功能不存在或未配置: ${functionCode}`, ERROR_CODES.FUNCTION_NOT_FOUND);
      }
      callConfig = functionParams.callConfig;
    }
    
    // 3. 检查用户权限
    const permissionResult = await checkUserPermission(openid, functionCode);
    if (!permissionResult.allowed) {
      return error(permissionResult.message, ERROR_CODES.PERMISSION_DENIED, {
        userType: permissionResult.userType
      });
    }
    
    // 4. 判断是否为免费功能
    const isFree = isFreeFunction(product);
    
    let quotaInfo = null;
    let deductInfo = null;
    let isPaid = false;
    let quotaBefore = null;
    let quotaAfter = null;
    
    // 5. 如果不是免费功能，检查并扣除配额
    if (!isFree) {
      // 5.1 检查配额
      const checkQuotaResult = await callQuotaManagement('checkQuota', {
        functionCode: functionCode
      });
      
      if (!checkQuotaResult.success) {
        return error('检查配额失败: ' + checkQuotaResult.error, ERROR_CODES.CHECK_QUOTA_FAILED);
      }
      
      quotaInfo = checkQuotaResult.data;
      if (!quotaInfo.canUse) {
        return error('配额不足', ERROR_CODES.QUOTA_INSUFFICIENT, {
          quotaInfo: quotaInfo
        });
      }
      
      // 5.2 扣除配额
      const deductResult = await callQuotaManagement('deductQuota', {
        functionCode: functionCode,
        quantity: 1,
        functionName: functionName
      });
      
      if (!deductResult.success) {
        return error('扣除配额失败: ' + deductResult.error, ERROR_CODES.DEDUCT_QUOTA_FAILED, {
          quotaInfo: quotaInfo
        });
      }
      
      deductInfo = deductResult.data;
      isPaid = deductInfo.isPaid;
      quotaBefore = deductInfo.quotaBefore;
      quotaAfter = deductInfo.quotaAfter;
      
      console.log('[callFunction] 配额扣除成功:', { isPaid, quotaBefore, quotaAfter });
    } else {
      console.log('[callFunction] 免费功能，跳过配额检查');
    }
    
    // 6. 调用目标功能
    let functionResult = null;
    let functionError = null;
    
    try {
      functionResult = await callTargetFunction(callConfig, functionParams);
      
      if (!functionResult || !functionResult.success) {
        functionError = functionResult?.error || '功能调用失败';
        throw new Error(functionError);
      }
    } catch (err) {
      console.error('[callFunction] 功能调用失败:', err);
      functionError = err.message || '功能调用失败';
      
      // 如果不是免费功能，回滚配额
      if (!isFree) {
        try {
          const rollbackResult = await callQuotaManagement('rollbackQuota', {
            functionCode: functionCode,
            quantity: 1,
            isPaid: isPaid
          });
          
          if (rollbackResult.success) {
            console.log('[callFunction] 配额回滚成功');
          } else {
            console.error('[callFunction] 配额回滚失败:', rollbackResult.error);
          }
        } catch (rollbackErr) {
          console.error('[callFunction] 配额回滚异常:', rollbackErr);
        }
      }
      
      return error(functionError, ERROR_CODES.FUNCTION_CALL_FAILED, {
        quotaInfo: quotaInfo
      });
    }
    
    // 7. 记录使用（异步，失败不影响主流程）
    // 免费功能也记录使用，isPaid=false
    recordFunctionUsage(
      openid,
      functionCode,
      functionName,
      functionParams,
      functionResult.data,
      isPaid,
      quotaBefore,
      quotaAfter
    ).catch(err => {
      console.error('[callFunction] 记录使用失败（不影响主流程）:', err);
    });
    
    // 8. 返回成功结果
    const resultData = {
      functionResult: functionResult.data
    };
    
    // 如果不是免费功能，返回配额信息
    if (!isFree) {
      resultData.quotaInfo = {
        before: quotaBefore,
        after: quotaAfter,
        isPaid: isPaid
      };
    }
    
    return success(resultData, '功能调用成功');
    
  } catch (err) {
    console.error('[callFunction] 统一调用异常:', err);
    return error('内部错误: ' + err.message, ERROR_CODES.INTERNAL_ERROR);
  }
}

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { action, data } = event;
  
  console.log('[functionCallGateway] 收到请求:', { action, data });
  
  try {
    switch (action) {
      case 'callFunction':
        if (!data || !data.functionCode) {
          return error('缺少必要参数: functionCode', ERROR_CODES.INVALID_PARAMS);
        }
        
        return await callFunction(
          wxContext.OPENID,
          data.functionCode,
          data.functionParams || {}
        );
      
      default:
        return error(`未知操作类型: ${action}`, ERROR_CODES.INVALID_PARAMS);
    }
  } catch (err) {
    console.error('[functionCallGateway] 云函数执行失败:', err);
    return error('云函数执行失败: ' + err.message, ERROR_CODES.INTERNAL_ERROR);
  }
};

