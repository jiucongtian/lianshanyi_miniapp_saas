/**
 * 用户类型配置更新脚本
 * 用途：为 user_types 表（或 static_user_types）添加功能免费配额字段
 * 使用方式：
 *   1. 确认用户类型表名称（user_types 或 static_user_types）
 *   2. 在云开发控制台的云函数中运行此脚本
 *   或
 *   1. 复制脚本内容到临时云函数中执行
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 配置表名称（根据实际情况修改）
const USER_TYPES_COLLECTION = 'static_user_types';  // 或 'user_types'

// 用户类型免费配额配置
const userTypeQuotaConfig = {
  guest: {
    dailyWisdomInsightQuota: 1,  // 游客每天1次智慧洞见
    dailyAiReportQuota: 0        // 游客不可用AI出报告
  },
  normal: {
    dailyWisdomInsightQuota: 3,  // 普通用户每天3次智慧洞见
    dailyAiReportQuota: 1        // 普通用户每天1次AI出报告
  },
  premium: {
    dailyWisdomInsightQuota: -1, // 高级用户无限智慧洞见
    dailyAiReportQuota: -1       // 高级用户无限AI出报告
  }
};

/**
 * 更新用户类型配置
 */
async function updateUserTypesConfig() {
  console.log('[updateUserTypesConfig] 开始更新用户类型配置...');
  console.log('[updateUserTypesConfig] 使用集合:', USER_TYPES_COLLECTION);
  
  try {
    // 获取所有用户类型
    const userTypes = await db.collection(USER_TYPES_COLLECTION).get();
    
    if (userTypes.data.length === 0) {
      console.error('[updateUserTypesConfig] 错误：用户类型表为空！');
      return {
        success: false,
        error: '用户类型表为空'
      };
    }
    
    console.log(`[updateUserTypesConfig] 找到 ${userTypes.data.length} 个用户类型`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    // 逐个更新用户类型
    for (const userType of userTypes.data) {
      const typeCode = userType.typeCode;
      
      if (!typeCode) {
        console.warn(`[updateUserTypesConfig] 跳过：用户类型缺少 typeCode 字段`, userType._id);
        skippedCount++;
        continue;
      }
      
      // 获取配额配置
      const quotaConfig = userTypeQuotaConfig[typeCode];
      
      if (!quotaConfig) {
        console.warn(`[updateUserTypesConfig] 跳过：未找到 ${typeCode} 的配额配置`);
        skippedCount++;
        continue;
      }
      
      try {
        // 检查是否已经有配额配置
        if (userType.dailyWisdomInsightQuota !== undefined && userType.dailyAiReportQuota !== undefined) {
          console.log(`[updateUserTypesConfig] ${typeCode} 已有配额配置，跳过`);
          skippedCount++;
          continue;
        }
        
        // 更新用户类型配置
        const updateResult = await db.collection(USER_TYPES_COLLECTION)
          .doc(userType._id)
          .update({
            data: {
              dailyWisdomInsightQuota: quotaConfig.dailyWisdomInsightQuota,
              dailyAiReportQuota: quotaConfig.dailyAiReportQuota
            }
          });
        
        console.log(`[updateUserTypesConfig] ✅ 成功更新 ${typeCode}:`, {
          dailyWisdomInsightQuota: quotaConfig.dailyWisdomInsightQuota,
          dailyAiReportQuota: quotaConfig.dailyAiReportQuota
        });
        
        updatedCount++;
        
      } catch (error) {
        console.error(`[updateUserTypesConfig] 更新 ${typeCode} 失败:`, error);
      }
    }
    
    console.log('[updateUserTypesConfig] 更新完成！');
    console.log(`  - 成功更新: ${updatedCount}`);
    console.log(`  - 跳过: ${skippedCount}`);
    
    return {
      success: true,
      message: '用户类型配置更新完成',
      updatedCount: updatedCount,
      skippedCount: skippedCount
    };
    
  } catch (error) {
    console.error('[updateUserTypesConfig] 更新失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 验证配置是否正确
 */
async function validateConfig() {
  console.log('[validateConfig] 开始验证配置...');
  
  try {
    const userTypes = await db.collection(USER_TYPES_COLLECTION).get();
    
    if (userTypes.data.length === 0) {
      console.warn('[validateConfig] 警告：用户类型表为空！');
      return false;
    }
    
    let isValid = true;
    
    for (const userType of userTypes.data) {
      console.log(`[validateConfig] 验证用户类型: ${userType.typeCode}`);
      
      // 验证配额字段
      const hasWisdomQuota = userType.dailyWisdomInsightQuota !== undefined;
      const hasAiReportQuota = userType.dailyAiReportQuota !== undefined;
      
      if (!hasWisdomQuota) {
        console.error(`  ❌ 缺少 dailyWisdomInsightQuota 字段`);
        isValid = false;
      } else {
        console.log(`  ✅ dailyWisdomInsightQuota: ${userType.dailyWisdomInsightQuota}`);
      }
      
      if (!hasAiReportQuota) {
        console.error(`  ❌ 缺少 dailyAiReportQuota 字段`);
        isValid = false;
      } else {
        console.log(`  ✅ dailyAiReportQuota: ${userType.dailyAiReportQuota}`);
      }
      
      // 验证配额值是否合理
      if (hasWisdomQuota) {
        const quota = userType.dailyWisdomInsightQuota;
        if (quota !== -1 && quota !== 0 && (quota < 0 || !Number.isInteger(quota))) {
          console.error(`  ❌ dailyWisdomInsightQuota 值不合理: ${quota}`);
          isValid = false;
        }
      }
      
      if (hasAiReportQuota) {
        const quota = userType.dailyAiReportQuota;
        if (quota !== -1 && quota !== 0 && (quota < 0 || !Number.isInteger(quota))) {
          console.error(`  ❌ dailyAiReportQuota 值不合理: ${quota}`);
          isValid = false;
        }
      }
    }
    
    console.log(`[validateConfig] 验证${isValid ? '通过' : '失败'}`);
    return isValid;
    
  } catch (error) {
    console.error('[validateConfig] 验证失败:', error);
    return false;
  }
}

/**
 * 显示当前配置
 */
async function showCurrentConfig() {
  console.log('[showCurrentConfig] 当前配置:');
  console.log('-----------------------------------');
  
  try {
    const userTypes = await db.collection(USER_TYPES_COLLECTION)
      .orderBy('typeCode', 'asc')
      .get();
    
    for (const userType of userTypes.data) {
      console.log(`\n用户类型: ${userType.typeName} (${userType.typeCode})`);
      console.log(`  档案配额: ${userType.profileQuota === -1 ? '无限' : userType.profileQuota}`);
      console.log(`  抽卡配额: ${userType.dailyDrawQuota === -1 ? '无限' : userType.dailyDrawQuota}/天`);
      console.log(`  智慧洞见: ${userType.dailyWisdomInsightQuota === -1 ? '无限' : (userType.dailyWisdomInsightQuota || '未配置')}/天`);
      console.log(`  AI出报告: ${userType.dailyAiReportQuota === -1 ? '无限' : (userType.dailyAiReportQuota || '未配置')}/天`);
    }
    
    console.log('\n-----------------------------------');
    
    return {
      success: true,
      userTypes: userTypes.data
    };
    
  } catch (error) {
    console.error('[showCurrentConfig] 显示配置失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 回滚配置（删除新增的字段）
 */
async function rollbackConfig() {
  console.log('[rollbackConfig] 开始回滚配置...');
  console.log('⚠️ 警告：此操作将删除所有用户类型的功能配额字段');
  
  try {
    const userTypes = await db.collection(USER_TYPES_COLLECTION).get();
    
    let rolledBackCount = 0;
    
    for (const userType of userTypes.data) {
      try {
        await db.collection(USER_TYPES_COLLECTION)
          .doc(userType._id)
          .update({
            data: {
              dailyWisdomInsightQuota: db.command.remove(),
              dailyAiReportQuota: db.command.remove()
            }
          });
        
        console.log(`[rollbackConfig] ✅ 成功回滚 ${userType.typeCode}`);
        rolledBackCount++;
        
      } catch (error) {
        console.error(`[rollbackConfig] 回滚 ${userType.typeCode} 失败:`, error);
      }
    }
    
    console.log(`[rollbackConfig] 回滚完成，共回滚 ${rolledBackCount} 个用户类型`);
    
    return {
      success: true,
      message: '配置回滚完成',
      rolledBackCount: rolledBackCount
    };
    
  } catch (error) {
    console.error('[rollbackConfig] 回滚失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 云函数入口
 * 如果在云函数中使用，请导出 main 函数
 */
exports.main = async (event, context) => {
  console.log('[updateUserTypesConfig] 云函数开始执行');
  
  const action = event.action || 'update';
  
  if (action === 'update') {
    // 更新配置
    const result = await updateUserTypesConfig();
    return result;
  } else if (action === 'validate') {
    // 验证配置
    const isValid = await validateConfig();
    return {
      success: true,
      valid: isValid,
      message: isValid ? '配置验证通过' : '配置验证失败'
    };
  } else if (action === 'show') {
    // 显示当前配置
    const result = await showCurrentConfig();
    return result;
  } else if (action === 'rollback') {
    // 回滚配置
    const result = await rollbackConfig();
    return result;
  } else {
    return {
      success: false,
      error: '未知的操作类型',
      availableActions: ['update', 'validate', 'show', 'rollback']
    };
  }
};

/**
 * 本地测试
 * 如果需要在本地测试，取消下面的注释
 */
/*
(async () => {
  console.log('====== 开始更新用户类型配置 ======');
  
  // 显示当前配置
  await showCurrentConfig();
  
  // 更新配置
  const updateResult = await updateUserTypesConfig();
  console.log('更新结果:', updateResult);
  
  // 验证配置
  const validateResult = await validateConfig();
  console.log('验证结果:', validateResult ? '✅ 通过' : '❌ 失败');
  
  // 再次显示配置
  await showCurrentConfig();
  
  console.log('====== 完成 ======');
})();
*/

// 如果不是在云函数环境中，可以直接运行
if (typeof exports === 'undefined') {
  (async () => {
    await showCurrentConfig();
    await updateUserTypesConfig();
    await validateConfig();
    await showCurrentConfig();
  })();
}

