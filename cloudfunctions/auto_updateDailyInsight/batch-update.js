/**
 * 批量更新日报数据脚本
 * 
 * 使用场景：
 * 1. 初始化日报数据（生成未来30天、60天的数据）
 * 2. 补充缺失的历史数据
 * 3. 重新生成某个时间段的数据
 * 
 * 使用方式：
 * 1. 在小程序管理后台或开发工具中运行
 * 2. 通过云函数调用此脚本的导出函数
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

/**
 * 批量更新日报数据
 * @param {string} startDate - 开始日期（YYYY-MM-DD）
 * @param {number} days - 生成天数
 * @param {number} delayMs - 每次调用间隔（毫秒），避免频繁调用
 * @returns {Promise<Object>} 批量更新结果
 */
async function batchUpdateDailyInsight(startDate, days, delayMs = 2000) {
  console.log('[batchUpdateDailyInsight] 开始批量更新');
  console.log('[batchUpdateDailyInsight] 开始日期:', startDate);
  console.log('[batchUpdateDailyInsight] 生成天数:', days);
  console.log('[batchUpdateDailyInsight] 调用间隔:', delayMs, 'ms');
  
  const results = [];
  const errors = [];
  
  const startTime = Date.now();
  
  for (let i = 0; i < days; i++) {
    try {
      // 计算当前日期
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + i);
      const dateStr = formatDate(currentDate);
      
      console.log(`\n[${i + 1}/${days}] 开始处理日期: ${dateStr}`);
      
      // 调用 auto_updateDailyInsight 云函数
      const result = await cloud.callFunction({
        name: 'auto_updateDailyInsight',
        data: {
          date: dateStr
        }
      });
      
      if (result.result && result.result.success) {
        console.log(`[${i + 1}/${days}] ✅ 成功:`, dateStr, '操作:', result.result.data.action);
        results.push({
          date: dateStr,
          success: true,
          action: result.result.data.action,
          cardName: result.result.data.cardName
        });
      } else {
        const errorMsg = result.result?.error || '未知错误';
        console.error(`[${i + 1}/${days}] ❌ 失败:`, dateStr, '错误:', errorMsg);
        errors.push({
          date: dateStr,
          error: errorMsg
        });
      }
      
      // 延迟（避免过快调用 Coze API）
      if (i < days - 1) {
        console.log(`等待 ${delayMs}ms...`);
        await delay(delayMs);
      }
    } catch (error) {
      console.error(`[${i + 1}/${days}] ⚠️ 异常:`, error);
      errors.push({
        date: dateStr,
        error: error.message || '调用异常'
      });
    }
  }
  
  const endTime = Date.now();
  const totalTime = ((endTime - startTime) / 1000).toFixed(2);
  
  console.log('\n========================================');
  console.log('[batchUpdateDailyInsight] 批量更新完成');
  console.log('[batchUpdateDailyInsight] 总耗时:', totalTime, '秒');
  console.log('[batchUpdateDailyInsight] 成功:', results.length);
  console.log('[batchUpdateDailyInsight] 失败:', errors.length);
  console.log('========================================');
  
  return {
    success: errors.length === 0,
    message: `批量更新完成，成功${results.length}条，失败${errors.length}条`,
    totalTime: totalTime,
    successCount: results.length,
    errorCount: errors.length,
    results: results,
    errors: errors
  };
}

/**
 * 格式化日期
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 延迟函数
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 云函数入口（可选）
 * 如果将此脚本部署为独立云函数，可以通过这个入口调用
 */
exports.main = async (event, context) => {
  const {
    startDate = formatDate(new Date()), // 默认今天
    days = 7,                            // 默认生成7天
    delayMs = 2000                       // 默认间隔2秒
  } = event;
  
  try {
    const result = await batchUpdateDailyInsight(startDate, days, delayMs);
    return result;
  } catch (error) {
    console.error('[batchUpdate] 批量更新失败:', error);
    return {
      success: false,
      error: error.message || '批量更新失败'
    };
  }
};

module.exports = {
  batchUpdateDailyInsight
};

