// 八字计算模块 - 调用本地计算云函数
const cloud = require('wx-server-sdk');

/**
 * 计算干支索引（简化版，实际应该使用完整的干支对照表）
 * @param {string} gan - 天干
 * @param {string} zhi - 地支
 * @returns {number} 干支索引
 */
function getGanZhiIndex(gan, zhi) {
  const ganMap = { '甲': 1, '乙': 2, '丙': 3, '丁': 4, '戊': 5, '己': 6, '庚': 7, '辛': 8, '壬': 9, '癸': 10 };
  const zhiMap = { '子': 1, '丑': 2, '寅': 3, '卯': 4, '辰': 5, '巳': 6, '午': 7, '未': 8, '申': 9, '酉': 10, '戌': 11, '亥': 12 };
  
  const ganIndex = ganMap[gan] || 1;
  const zhiIndex = zhiMap[zhi] || 1;
  
  // 简化的干支组合索引计算，实际应该使用六十甲子的准确对照
  return ((ganIndex - 1) * 6 + zhiIndex) % 60 || 60;
}

/**
 * 从出生日期信息提取参数
 * @param {Object} birthDate - 出生日期信息（北京时间）
 * @returns {Object} 参数对象 (北京时间，供Coze API使用)
 */
function extractTimeParams(birthDate) {
  // 直接使用北京时间参数，无需转换
  const { year, month, day, hour, minute = 0 } = birthDate;
  
  return {
    year,
    month,
    day,
    hour,
    min: minute
  };
}

/**
 * 解析Coze API返回的八字数据
 * @param {Object} cozeResponse - Coze API响应数据
 * @returns {Object} 标准化的八字数据结构
 */
function parseBaziData(cozeResponse) {
  try {
    console.log('=== 开始解析Coze八字数据 ===');
    console.log('Coze响应数据:', JSON.stringify(cozeResponse, null, 2));
    
    // 检查响应格式
    if (!cozeResponse) {
      throw new Error('Coze响应数据为空');
    }
    
    // 检查Coze API返回的数据结构
    if (!cozeResponse.data) {
      throw new Error('Coze响应数据格式不正确，缺少data字段');
    }
    
    // 解析data字段（JSON字符串）
    let parsedData;
    if (typeof cozeResponse.data === 'string') {
      try {
        parsedData = JSON.parse(cozeResponse.data);
      } catch (parseError) {
        console.error('解析data字段失败:', parseError);
        throw new Error(`data字段JSON解析失败: ${parseError.message}`);
      }
    } else {
      parsedData = cozeResponse.data;
    }
    
    console.log('解析后的数据:', JSON.stringify(parsedData, null, 2));
    
    // 检查输出格式
    if (!parsedData.output) {
      console.error('解析后的数据缺少output字段，可用字段:', Object.keys(parsedData));
      throw new Error('八字数据格式不正确，缺少output字段');
    }
    
    const output = parsedData.output;
    console.log('output字段内容:', JSON.stringify(output, null, 2));
    
    // 验证必需字段
    const requiredFields = ['year', 'month', 'day', 'hour'];
    for (const field of requiredFields) {
      if (!output[field]) {
        console.error(`缺少${field}字段，output内容:`, output);
        throw new Error(`八字数据格式不正确，缺少${field}字段`);
      }
      
      if (typeof output[field] !== 'string') {
        console.error(`${field}字段类型错误，期望string，实际:`, typeof output[field], '值:', output[field]);
        throw new Error(`八字数据格式不正确，${field}字段类型错误，期望字符串，实际: ${typeof output[field]}`);
      }
      
      if (output[field].length !== 2) {
        console.error(`${field}字段长度错误，期望2，实际:`, output[field].length, '值:', output[field]);
        throw new Error(`八字数据格式不正确，${field}字段长度错误，期望2个字符，实际: ${output[field].length}个字符`);
      }
    }
    
    // 构建档案格式的八字数据结构
    const baziData = {
      year: {
        gan: output.year[0],
        zhi: output.year[1],
        ganzhiIndex: getGanZhiIndex(output.year[0], output.year[1])
      },
      month: {
        gan: output.month[0],
        zhi: output.month[1],
        ganzhiIndex: getGanZhiIndex(output.month[0], output.month[1])
      },
      day: {
        gan: output.day[0],
        zhi: output.day[1],
        ganzhiIndex: getGanZhiIndex(output.day[0], output.day[1])
      },
      hour: {
        gan: output.hour[0],
        zhi: output.hour[1],
        ganzhiIndex: getGanZhiIndex(output.hour[0], output.hour[1])
      }
    };
    
    console.log('标准化八字数据:', JSON.stringify(baziData, null, 2));
    return baziData;
    
  } catch (error) {
    console.error('解析八字数据失败:', error);
    console.error('错误堆栈:', error.stack);
    throw new Error(`八字数据解析失败: ${error.message}`);
  }
}

/**
 * 将本地计算结果转换为标准化的八字数据结构
 * @param {Object} localResult - 本地计算结果
 * @returns {Object} 标准化的八字数据结构
 */
function convertLocalResultToStandardFormat(localResult) {
  try {
    console.log('=== 开始转换本地计算结果 ===');
    console.log('本地计算结果:', localResult);
    
    if (!localResult.bazi) {
      throw new Error('本地计算结果缺少bazi字段');
    }
    
    const { bazi } = localResult;
    
    // 验证必需字段
    const requiredFields = ['year', 'month', 'day', 'hour'];
    for (const field of requiredFields) {
      if (!bazi[field] || typeof bazi[field] !== 'string' || bazi[field].length !== 2) {
        throw new Error(`bazi.${field}字段格式错误，期望2个字符的干支字符串`);
      }
    }
    
    // 构建档案格式的八字数据结构
    const baziData = {
      year: {
        gan: bazi.year[0],
        zhi: bazi.year[1],
        ganzhiIndex: getGanZhiIndex(bazi.year[0], bazi.year[1])
      },
      month: {
        gan: bazi.month[0],
        zhi: bazi.month[1],
        ganzhiIndex: getGanZhiIndex(bazi.month[0], bazi.month[1])
      },
      day: {
        gan: bazi.day[0],
        zhi: bazi.day[1],
        ganzhiIndex: getGanZhiIndex(bazi.day[0], bazi.day[1])
      },
      hour: {
        gan: bazi.hour[0],
        zhi: bazi.hour[1],
        ganzhiIndex: getGanZhiIndex(bazi.hour[0], bazi.hour[1])
      }
    };
    
    console.log('转换后的标准化八字数据:', baziData);
    return baziData;
    
  } catch (error) {
    console.error('转换本地计算结果失败:', error);
    console.error('错误堆栈:', error.stack);
    throw new Error(`本地结果转换失败: ${error.message}`);
  }
}

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
    const { year, month, day, hour, minute = 0 } = birthDate;
    if (!year || !month || !day || hour === undefined) {
      throw new Error('birthDate参数不完整，缺少必要字段');
    }

    console.log('=== 调用本地计算云函数 ===');
    console.log('参数:', { year, month, day, hour, minute });
    
    // 调用本地计算云函数
    const result = await cloud.callFunction({
      name: 'v1_2_localCalculateBazi',
      data: {
        year,
        month,
        day,
        hour,
        minute
      }
    });
    
    console.log('本地计算云函数返回结果:', result);
    
    if (!result.result || !result.result.success) {
      throw new Error(result.result?.error || '本地计算云函数调用失败');
    }
    
    const localResult = result.result;
    console.log('本地计算结果:', localResult);
    
    // 将本地计算结果转换为标准化的八字数据结构
    const baziData = convertLocalResultToStandardFormat(localResult);
    console.log('转换后的标准化八字数据:', baziData);
    
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
  calculateBazi,
  convertLocalResultToStandardFormat,
  getGanZhiIndex
};
