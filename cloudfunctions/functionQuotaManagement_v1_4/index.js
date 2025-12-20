// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV // 使用当前云环境
});

const db = cloud.database();
const _ = db.command;

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
  
  try {
    console.log('[getUserTypeConfig] 从数据库获取配置:', typeCode);
    
    // 尝试从 static_user_types 表获取配置
    const result = await db.collection('static_user_types')
      .where({ typeCode: typeCode })
      .get();
    
    if (result.data.length > 0) {
      const config = result.data[0];
      
      // 更新缓存
      configCache[typeCode] = config;
      cacheTime[typeCode] = Date.now();
      
      console.log('[getUserTypeConfig] 成功获取配置:', typeCode);
      return config;
    }
  } catch (err) {
    console.error('[getUserTypeConfig] 获取配置失败:', err);
  }
  
  // 返回默认配置
  console.log('[getUserTypeConfig] 使用默认配置:', typeCode);
  return getDefaultConfig(typeCode);
}

/**
 * 获取默认配置
 */
function getDefaultConfig(typeCode) {
  const defaultConfigs = {
    guest: {
      typeCode: 'guest',
      typeName: '临时用户',
      displayName: '临时用户',
      dailyDrawQuota: 0,
      dailyAiReportQuota: 0
    },
    normal: {
      typeCode: 'normal',
      typeName: '探索者',
      displayName: '探索者',
      dailyDrawQuota: 1,
      dailyAiReportQuota: 1
    },
    premium: {
      typeCode: 'premium',
      typeName: '高级用户',
      displayName: '高级用户',
      dailyDrawQuota: -1,
      dailyAiReportQuota: -1
    }
  };
  
  return defaultConfigs[typeCode] || defaultConfigs.guest;
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
      throw new Error('用户不存在');
    }
    
    return result.data[0];
  } catch (err) {
    console.error('[getUserInfo] 获取用户信息失败:', err);
    throw err;
  }
}

/**
 * 统计今日免费使用次数
 */
async function getTodayUsageCount(openid, functionCode) {
  const today = new Date().toISOString().split('T')[0];
  
  try {
    const result = await db.collection('function_usage_records')
      .where({
        openid: openid,
        functionCode: functionCode,
        isPaid: false,
        usageDate: today
      })
      .count();
    
    console.log(`[getTodayUsageCount] ${functionCode} 今日免费使用次数:`, result.total);
    return result.total;
  } catch (err) {
    console.error('[getTodayUsageCount] 统计失败:', err);
    return 0;
  }
}

/**
 * 获取付费配额信息
 */
async function getPaidQuota(openid, functionCode) {
  try {
    const result = await db.collection('function_quotas')
      .where({ openid: openid })
      .get();
    
    if (result.data.length === 0) {
      return {
        paidTotal: 0,
        paidUsed: 0,
        paidRemaining: 0
      };
    }
    
    const quotaDoc = result.data[0];
    const quota = quotaDoc.quotas?.[functionCode] || {
      paidTotal: 0,
      paidUsed: 0,
      paidRemaining: 0
    };
    
    return quota;
  } catch (err) {
    console.error('[getPaidQuota] 获取付费配额失败:', err);
    return {
      paidTotal: 0,
      paidUsed: 0,
      paidRemaining: 0
    };
  }
}

/**
 * 获取功能对应的配额字段名
 */
function getQuotaFieldName(functionCode) {
  // 智慧洞见复用 dailyDrawQuota
  if (functionCode === 'wisdom_insight') {
    return 'dailyDrawQuota';
  }
  // AI出报告使用 dailyAiReportQuota
  if (functionCode === 'ai_report') {
    return 'dailyAiReportQuota';
  }
  // 其他功能默认返回 null（表示无免费配额）
  return null;
}

/**
 * 检查配额
 * action: checkQuota
 */
async function checkQuota(wxContext, data) {
  const { OPENID } = wxContext;
  const { functionCode } = data;
  
  console.log('[checkQuota] 开始检查配额:', { openid: OPENID, functionCode });
  
  if (!functionCode) {
    return error('缺少 functionCode 参数', 'INVALID_PARAMS');
  }
  
  try {
    // 1. 获取用户信息
    const user = await getUserInfo(OPENID);
    const userType = user.userType || user.userTypeCode || 'guest';
    
    // 2. 获取用户类型配置（免费配额）
    const typeConfig = await getUserTypeConfig(userType);
    const quotaFieldName = getQuotaFieldName(functionCode);
    
    let freeDailyQuota = 0;
    if (quotaFieldName && typeConfig[quotaFieldName] !== undefined) {
      freeDailyQuota = typeConfig[quotaFieldName];
    }
    
    console.log('[checkQuota] 免费每日配额:', freeDailyQuota);
    
    // 3. 统计今日免费使用次数
    const freeUsedToday = await getTodayUsageCount(OPENID, functionCode);
    
    // 4. 计算免费剩余配额
    let freeRemaining;
    if (freeDailyQuota === -1) {
      freeRemaining = Infinity;
    } else {
      freeRemaining = Math.max(0, freeDailyQuota - freeUsedToday);
    }
    
    // 5. 获取付费配额
    const paidQuota = await getPaidQuota(OPENID, functionCode);
    const paidRemaining = paidQuota.paidRemaining;
    
    // 6. 计算总可用配额
    let totalRemaining;
    if (freeRemaining === Infinity || paidRemaining === Infinity) {
      totalRemaining = Infinity;
    } else {
      totalRemaining = freeRemaining + paidRemaining;
    }
    
    const canUse = totalRemaining > 0 || totalRemaining === Infinity;
    
    console.log('[checkQuota] 配额检查结果:', {
      canUse,
      freeRemaining,
      paidRemaining,
      totalRemaining
    });
    
    return success({
      functionCode: functionCode,  // 添加 functionCode
      canUse: canUse,
      freeRemaining: freeRemaining === Infinity ? -1 : freeRemaining,
      paidRemaining: paidRemaining,
      totalRemaining: totalRemaining === Infinity ? -1 : totalRemaining,
      freeDailyQuota: freeDailyQuota,
      freeUsedToday: freeUsedToday
    }, '配额检查完成');
    
  } catch (err) {
    console.error('[checkQuota] 检查配额失败:', err);
    return error('检查配额失败: ' + err.message, 'CHECK_QUOTA_FAILED');
  }
}

/**
 * 扣除配额（原子操作）
 * action: deductQuota
 */
async function deductQuota(wxContext, data) {
  const { OPENID } = wxContext;
  const { functionCode, quantity = 1 } = data;
  
  console.log('[deductQuota] 开始扣除配额:', { openid: OPENID, functionCode, quantity });
  
  if (!functionCode) {
    return error('缺少 functionCode 参数', 'INVALID_PARAMS');
  }
  
  try {
    // 1. 先检查配额是否充足
    const checkResult = await checkQuota(wxContext, { functionCode });
    if (!checkResult.success) {
      return checkResult;
    }
    
    const quotaInfo = checkResult.data;
    if (!quotaInfo.canUse) {
      return error('配额不足', 'QUOTA_INSUFFICIENT', quotaInfo);
    }
    
    const quotaBefore = {
      freeRemaining: quotaInfo.freeRemaining,
      paidRemaining: quotaInfo.paidRemaining,
      totalRemaining: quotaInfo.totalRemaining
    };
    
    let isPaid = false;
    const today = new Date().toISOString().split('T')[0];
    
    // 2. 优先扣除免费配额
    if (quotaInfo.freeRemaining > 0 || quotaInfo.freeRemaining === -1) {
      console.log('[deductQuota] 扣除免费配额');
      
      // 插入使用记录（表示使用了免费配额）
      await db.collection('function_usage_records').add({
        data: {
          openid: OPENID,
          userId: (await getUserInfo(OPENID))._id,
          functionCode: functionCode,
          functionName: data.functionName || functionCode,
          isPaid: false,
          orderId: null,
          quotaBefore: quotaBefore,
          usageTime: new Date(),
          usageDate: today,
          createTime: new Date()
        }
      });
      
      isPaid = false;
      
    } else {
      // 3. 免费配额用完，扣除付费配额
      console.log('[deductQuota] 扣除付费配额');
      
      // 使用原子操作扣除付费配额
      const updateResult = await db.collection('function_quotas')
        .where({
          openid: OPENID,
          [`quotas.${functionCode}.paidRemaining`]: _.gt(0)
        })
        .update({
          data: {
            [`quotas.${functionCode}.paidUsed`]: _.inc(quantity),
            [`quotas.${functionCode}.paidRemaining`]: _.inc(-quantity),
            [`quotas.${functionCode}.lastUsedTime`]: new Date(),
            updateTime: new Date()
          }
        });
      
      if (updateResult.stats.updated === 0) {
        return error('付费配额不足或扣除失败', 'DEDUCT_QUOTA_FAILED', quotaInfo);
      }
      
      isPaid = true;
      
      // 插入使用记录（表示使用了付费配额）
      await db.collection('function_usage_records').add({
        data: {
          openid: OPENID,
          userId: (await getUserInfo(OPENID))._id,
          functionCode: functionCode,
          functionName: data.functionName || functionCode,
          isPaid: true,
          orderId: data.orderId || null,
          quotaBefore: quotaBefore,
          usageTime: new Date(),
          usageDate: today,
          createTime: new Date()
        }
      });
    }
    
    // 4. 获取扣除后的配额信息
    const checkAfter = await checkQuota(wxContext, { functionCode });
    const quotaAfter = {
      freeRemaining: checkAfter.data.freeRemaining,
      paidRemaining: checkAfter.data.paidRemaining,
      totalRemaining: checkAfter.data.totalRemaining
    };
    
    console.log('[deductQuota] 配额扣除成功:', { isPaid, quotaBefore, quotaAfter });
    
    return success({
      isPaid: isPaid,
      quantity: quantity,
      quotaBefore: quotaBefore,
      quotaAfter: quotaAfter
    }, '配额扣除成功');
    
  } catch (err) {
    console.error('[deductQuota] 扣除配额失败:', err);
    return error('扣除配额失败: ' + err.message, 'DEDUCT_QUOTA_FAILED');
  }
}

/**
 * 发放配额
 * action: grantQuota
 */
async function grantQuota(wxContext, data) {
  const { OPENID } = wxContext;
  const { functionCode, quantity, orderId } = data;
  
  console.log('[grantQuota] 开始发放配额:', { openid: OPENID, functionCode, quantity, orderId });
  
  if (!functionCode || !quantity) {
    return error('缺少必需参数', 'INVALID_PARAMS');
  }
  
  try {
    const user = await getUserInfo(OPENID);
    
    // 1. 检查用户是否已有配额记录
    const existingResult = await db.collection('function_quotas')
      .where({ openid: OPENID })
      .get();
    
    if (existingResult.data.length === 0) {
      // 2. 没有记录，创建新记录
      console.log('[grantQuota] 创建新配额记录');
      
      await db.collection('function_quotas').add({
        data: {
          openid: OPENID,
          userId: user._id,
          quotas: {
            [functionCode]: {
              paidTotal: quantity,
              paidUsed: 0,
              paidRemaining: quantity,
              lastUsedTime: null,
              lastGrantTime: new Date()
            }
          },
          createTime: new Date(),
          updateTime: new Date()
        }
      });
      
    } else {
      // 3. 已有记录，检查是否已有该功能的配额
      const quotaDoc = existingResult.data[0];
      
      if (quotaDoc.quotas && quotaDoc.quotas[functionCode]) {
        // 已有该功能配额，追加
        console.log('[grantQuota] 追加配额到现有记录');
        
        await db.collection('function_quotas')
          .where({ openid: OPENID })
          .update({
            data: {
              [`quotas.${functionCode}.paidTotal`]: _.inc(quantity),
              [`quotas.${functionCode}.paidRemaining`]: _.inc(quantity),
              [`quotas.${functionCode}.lastGrantTime`]: new Date(),
              updateTime: new Date()
            }
          });
        
      } else {
        // 没有该功能配额，创建新字段
        console.log('[grantQuota] 为现有记录添加新功能配额');
        
        await db.collection('function_quotas')
          .where({ openid: OPENID })
          .update({
            data: {
              [`quotas.${functionCode}`]: {
                paidTotal: quantity,
                paidUsed: 0,
                paidRemaining: quantity,
                lastUsedTime: null,
                lastGrantTime: new Date()
              },
              updateTime: new Date()
            }
          });
      }
    }
    
    console.log('[grantQuota] 配额发放成功');
    
    return success({
      functionCode: functionCode,
      quantity: quantity,
      orderId: orderId
    }, '配额发放成功');
    
  } catch (err) {
    console.error('[grantQuota] 发放配额失败:', err);
    return error('发放配额失败: ' + err.message, 'GRANT_QUOTA_FAILED');
  }
}

/**
 * 回滚配额
 * action: rollbackQuota
 */
async function rollbackQuota(wxContext, data) {
  const { OPENID } = wxContext;
  const { functionCode, quantity = 1, isPaid = false, recordId } = data;
  
  console.log('[rollbackQuota] 开始回滚配额:', { openid: OPENID, functionCode, quantity, isPaid });
  
  if (!functionCode) {
    return error('缺少 functionCode 参数', 'INVALID_PARAMS');
  }
  
  try {
    if (!isPaid) {
      // 1. 回滚免费配额：删除使用记录
      console.log('[rollbackQuota] 回滚免费配额，删除使用记录');
      
      const today = new Date().toISOString().split('T')[0];
      
      // 查找最近的一条使用记录
      const records = await db.collection('function_usage_records')
        .where({
          openid: OPENID,
          functionCode: functionCode,
          isPaid: false,
          usageDate: today
        })
        .orderBy('usageTime', 'desc')
        .limit(1)
        .get();
      
      if (records.data.length > 0) {
        await db.collection('function_usage_records')
          .doc(records.data[0]._id)
          .remove();
        
        console.log('[rollbackQuota] 免费配额回滚成功');
      } else {
        console.warn('[rollbackQuota] 未找到需要回滚的免费使用记录');
      }
      
    } else {
      // 2. 回滚付费配额：恢复配额
      console.log('[rollbackQuota] 回滚付费配额');
      
      const updateResult = await db.collection('function_quotas')
        .where({ openid: OPENID })
        .update({
          data: {
            [`quotas.${functionCode}.paidUsed`]: _.inc(-quantity),
            [`quotas.${functionCode}.paidRemaining`]: _.inc(quantity),
            updateTime: new Date()
          }
        });
      
      if (updateResult.stats.updated === 0) {
        return error('付费配额回滚失败', 'ROLLBACK_QUOTA_FAILED');
      }
      
      // 删除对应的使用记录
      if (recordId) {
        await db.collection('function_usage_records')
          .doc(recordId)
          .remove();
      }
      
      console.log('[rollbackQuota] 付费配额回滚成功');
    }
    
    return success({
      functionCode: functionCode,
      quantity: quantity,
      isPaid: isPaid
    }, '配额回滚成功');
    
  } catch (err) {
    console.error('[rollbackQuota] 回滚配额失败:', err);
    return error('回滚配额失败: ' + err.message, 'ROLLBACK_QUOTA_FAILED');
  }
}

/**
 * 获取配额信息
 * action: getQuotaInfo
 */
async function getQuotaInfo(wxContext, data) {
  const { OPENID } = wxContext;
  const { functionCode } = data;
  
  console.log('[getQuotaInfo] 获取配额信息:', { openid: OPENID, functionCode });
  
  try {
    if (functionCode) {
      // 获取单个功能的配额
      const result = await checkQuota(wxContext, { functionCode });
      return result;
      
    } else {
      // 获取所有功能的配额
      const user = await getUserInfo(OPENID);
      const userType = user.userType || user.userTypeCode || 'guest';
      const typeConfig = await getUserTypeConfig(userType);
      
      // 获取付费配额
      const paidQuotaResult = await db.collection('function_quotas')
        .where({ openid: OPENID })
        .get();
      
      const paidQuotas = paidQuotaResult.data.length > 0
        ? paidQuotaResult.data[0].quotas
        : {};
      
      // 构建所有功能的配额信息
      const allQuotas = {};
      
      // 智慧洞见
      const wisdomInsightCheck = await checkQuota(wxContext, { functionCode: 'wisdom_insight' });
      allQuotas.wisdom_insight = wisdomInsightCheck.data;
      
      // AI出报告
      const aiReportCheck = await checkQuota(wxContext, { functionCode: 'ai_report' });
      allQuotas.ai_report = aiReportCheck.data;
      
      return success(allQuotas, '获取配额信息成功');
    }
    
  } catch (err) {
    console.error('[getQuotaInfo] 获取配额信息失败:', err);
    return error('获取配额信息失败: ' + err.message, 'GET_QUOTA_INFO_FAILED');
  }
}

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { action, data } = event;
  
  console.log('[functionQuotaManagement] 云函数调用:', { action, openid: wxContext.OPENID });
  
  try {
    switch (action) {
      case 'checkQuota':
        return await checkQuota(wxContext, data);
      
      case 'deductQuota':
        return await deductQuota(wxContext, data);
      
      case 'grantQuota':
        return await grantQuota(wxContext, data);
      
      case 'rollbackQuota':
        return await rollbackQuota(wxContext, data);
      
      case 'getQuotaInfo':
        return await getQuotaInfo(wxContext, data);
      
      default:
        return error('未知操作类型: ' + action, 'INVALID_ACTION');
    }
  } catch (err) {
    console.error('[functionQuotaManagement] 云函数执行失败:', err);
    return error('操作失败: ' + err.message, 'INTERNAL_ERROR');
  }
};

