/**
 * 初始化抽卡配额系统数据库
 * 用于阶段一：数据库准备
 * 
 * 功能：
 * 1. 更新 static_user_types 表，添加 dailyDrawQuota 字段
 * 2. 验证 draw_card_records 集合是否存在（需要手动创建）
 * 
 * 使用方法：
 * 1. 在云开发控制台创建此云函数
 * 2. 部署云函数
 * 3. 调用云函数执行初始化
 * 4. 检查执行结果
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  console.log('[initDrawCardDatabase] 开始初始化数据库');
  
  const results = {
    userTypes: { success: false, message: '' },
    drawCardRecords: { success: false, message: '' }
  };
  
  try {
    // 1. 更新 static_user_types 表
    console.log('[initDrawCardDatabase] 开始更新 static_user_types 表');
    const userTypesResult = await updateUserTypes();
    results.userTypes = userTypesResult;
    
    // 2. 检查 draw_card_records 集合
    console.log('[initDrawCardDatabase] 开始检查 draw_card_records 集合');
    const drawCardRecordsResult = await checkDrawCardRecordsCollection();
    results.drawCardRecords = drawCardRecordsResult;
    
    return {
      success: true,
      message: '数据库初始化完成',
      results: results
    };
  } catch (error) {
    console.error('[initDrawCardDatabase] 初始化失败:', error);
    return {
      success: false,
      error: error.message || '初始化失败',
      results: results
    };
  }
};

/**
 * 更新 static_user_types 表，添加 dailyDrawQuota 字段
 */
async function updateUserTypes() {
  const userTypes = [
    {
      typeCode: 'guest',
      dailyDrawQuota: 0
    },
    {
      typeCode: 'normal',
      dailyDrawQuota: 3
    },
    {
      typeCode: 'premium',
      dailyDrawQuota: -1
    }
  ];
  
  const updateResults = [];
  
  for (const userType of userTypes) {
    try {
      // 查询现有记录
      const existing = await db.collection('static_user_types')
        .where({ typeCode: userType.typeCode })
        .get();
      
      if (existing.data.length === 0) {
        updateResults.push({
          typeCode: userType.typeCode,
          status: 'skip',
          message: `用户类型 ${userType.typeCode} 不存在，跳过更新`
        });
        continue;
      }
      
      const record = existing.data[0];
      
      // 检查是否已有 dailyDrawQuota 字段
      if (record.dailyDrawQuota !== undefined) {
        // 如果值不正确，更新它
        if (record.dailyDrawQuota !== userType.dailyDrawQuota) {
          await db.collection('static_user_types')
            .doc(record._id)
            .update({
              data: {
                dailyDrawQuota: userType.dailyDrawQuota
              }
            });
          updateResults.push({
            typeCode: userType.typeCode,
            status: 'updated',
            message: `已更新 dailyDrawQuota: ${userType.dailyDrawQuota}`
          });
        } else {
          updateResults.push({
            typeCode: userType.typeCode,
            status: 'ok',
            message: `dailyDrawQuota 已存在且值正确: ${userType.dailyDrawQuota}`
          });
        }
      } else {
        // 添加字段
        await db.collection('static_user_types')
          .doc(record._id)
          .update({
            data: {
              dailyDrawQuota: userType.dailyDrawQuota
            }
          });
        updateResults.push({
          typeCode: userType.typeCode,
          status: 'added',
          message: `已添加 dailyDrawQuota: ${userType.dailyDrawQuota}`
        });
      }
    } catch (error) {
      updateResults.push({
        typeCode: userType.typeCode,
        status: 'error',
        message: `更新失败: ${error.message}`
      });
    }
  }
  
  const successCount = updateResults.filter(r => r.status === 'ok' || r.status === 'added' || r.status === 'updated').length;
  const errorCount = updateResults.filter(r => r.status === 'error').length;
  
  return {
    success: errorCount === 0,
    message: `更新完成：成功 ${successCount} 条，失败 ${errorCount} 条`,
    details: updateResults
  };
}

/**
 * 检查 draw_card_records 集合是否存在
 * 注意：此函数只能检查集合是否存在，无法创建集合（需要在控制台手动创建）
 */
async function checkDrawCardRecordsCollection() {
  try {
    // 尝试查询集合（如果不存在会报错）
    const result = await db.collection('draw_card_records')
      .limit(1)
      .get();
    
    return {
      success: true,
      message: 'draw_card_records 集合已存在',
      recordCount: result.data.length
    };
  } catch (error) {
    if (error.errCode === -1 || error.message.includes('not exist')) {
      return {
        success: false,
        message: 'draw_card_records 集合不存在，请在控制台手动创建',
        instruction: '请在云开发控制台 → 数据库 → 添加集合，集合名称：draw_card_records'
      };
    } else {
      return {
        success: false,
        message: `检查集合时出错: ${error.message}`
      };
    }
  }
}

