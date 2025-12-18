// 八字计算模块 - 调用本地计算云函数
const cloud = require('wx-server-sdk');

// 注意：以下函数已废弃并删除（之前用于 Coze API 路径）
// - getGanZhiIndex: 计算干支索引（计算逻辑有严重错误，60个测试用例中50个错误）
// - extractTimeParams: 从出生日期信息提取参数（供 Coze API 使用）
// - parseBaziData: 解析 Coze API 返回的八字数据
// 现在直接使用 localCalculateBazi_v1_2 云函数，不再需要这些函数

/**
 * 计算八字数据（主入口函数）
 * @param {Object} birthDate - 出生日期信息（北京时间）
 * @returns {Promise<Object>} 返回八字计算结果
 */
async function calculateBazi(birthDate) {
  try {
    console.log('=== 生辰八字计算开始执行（本地计算云函数） ===');
    console.log('接收到的birthDate:', birthDate);
    
    if (!birthDate) {
      throw new Error('缺少必要参数: birthDate');
    }





    
    // 验证birthDate参数
    const { year, month, day, hour, minute = 0, isLunar = false, isLeapMonth = false } = birthDate;
    if (!year || !month || !day || hour === undefined) {
      throw new Error('birthDate参数不完整，缺少必要字段');
    }

    console.log('=== 调用本地计算云函数 ===');
    console.log('参数:', { year, month, day, hour, minute, isLunar, isLeapMonth });
    
    // 判断日期类型
    if (isLunar) {
      console.log('检测到农历日期，将由本地计算云函数进行转换');
      if (isLeapMonth) {
        console.log('农历日期为闰月');
      }
    } else {
      console.log('使用公历日期进行计算');
    }
    
    // 调用本地计算云函数（支持农历和公历）
    const result = await cloud.callFunction({
      name: 'localCalculateBazi_v1_2',
      data: {
        year,
        month,
        day,
        hour,
        minute,
        isLunar,
        isLeapMonth
      }
    });
    
    console.log('本地计算云函数返回结果:', result);
    
    if (!result.result || !result.result.success) {
      throw new Error(result.result?.error || '本地计算云函数调用失败');
    }
    
    const localResult = result.result;
    console.log('本地计算结果:', localResult);
    
    // 直接使用本地云函数返回的标准化八字数据
    // 注意：baziData在localResult.data.baziData中
    const baziData = localResult.data.baziData;
    console.log('标准化八字数据:', baziData);
    
    console.log('=== 生辰八字计算成功，准备返回结果 ===');
    return {
      success: true,
      data: {
        baziData: baziData,  // 标准化的八字数据
        rawLocalData: localResult,  // 保留原始本地计算结果用于调试
        parameters: { year, month, day, hour, minute },
        birthDate: birthDate
      }
    };
  } catch (error) {
    console.error('=== 生辰八字计算失败 ===');
    console.error('错误信息:', error.message);
    console.error('错误堆栈:', error.stack);
    console.error('错误对象:', error);
    return {
      success: false,
      error: error.message || '计算失败',
      code: error.code
    };
  }
}

module.exports = {
  calculateBazi
};
