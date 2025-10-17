// 八字计算模块
const axios = require('axios')

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
 * 调用Coze工作流
 * @param {Object} parameters - 工作流参数
 * @returns {Promise} 返回工作流执行结果
 */
async function callCozeAPI(parameters) {
  // 硬编码配置（仅个人使用，无泄漏风险）
  const COZE_CONFIG = {
    token: 'sat_JBr8tgHf8a8IkpwoFMpNWiioLFdqdAWj9O8HVRZ7DFmYqQf2wKzf92vRqKjQQMdv',
    baseURL: 'https://api.coze.cn',
    workflowId: '7544388114807095337'
  };

  // 验证配置
  if (!COZE_CONFIG.token) {
    throw new Error('Coze配置错误：缺少token');
  }
  
  if (!COZE_CONFIG.workflowId) {
    throw new Error('Coze配置错误：缺少workflowId');
  }

  try {
    const response = await axios({
      url: `${COZE_CONFIG.baseURL}/v1/workflow/run`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${COZE_CONFIG.token}`
      },
      data: {
        workflow_id: COZE_CONFIG.workflowId,
        parameters: parameters
      },
      timeout: 25000 // 25秒超时，给云函数留出处理时间
    });

    console.log('=== Coze API 完整响应 ===');
    console.log('响应状态:', response.status);
    console.log('响应头:', response.headers);
    console.log('响应数据完整结构:', JSON.stringify(response.data, null, 2));
    console.log('响应数据类型:', typeof response.data);
    
    // 检查Coze API是否返回了错误
    if (response.data.code !== 0) {
      console.error('Coze API 返回错误:', response.data);
      
      // 根据错误码提供更友好的错误信息
      let friendlyMessage = response.data.msg || '未知错误';
      
      if (response.data.code === 4028) {
        friendlyMessage = '免费配额已用完，请升级到付费计划或稍后再试';
      } else if (response.data.code === 401) {
        friendlyMessage = 'API认证失败，请检查token配置';
      } else if (response.data.code === 429) {
        friendlyMessage = '请求过于频繁，请稍后再试';
      }
      
      throw new Error(friendlyMessage);
    }
    
    return {
      success: true,
      data: response.data,
      parameters
    };
  } catch (error) {
    console.error('Coze API 请求失败:', error);
    
    // 处理axios错误
    if (error.response) {
      // 服务器返回了错误状态码
      throw new Error(`API请求失败: ${error.response.status} - ${error.response.data?.message || error.response.statusText}`);
    } else if (error.request) {
      // 请求已发出但没有收到响应
      throw new Error('网络请求失败，请检查网络连接');
    } else {
      // 其他错误
      throw new Error(`请求配置错误: ${error.message}`);
    }
  }
}

/**
 * 计算八字数据（主入口函数）
 * @param {Object} birthDate - 出生日期信息（北京时间）
 * @returns {Promise<Object>} 返回八字计算结果
 */
async function calculateBazi(birthDate) {
  try {
    console.log('=== 生辰八字计算开始执行 ===');
    console.log('接收到的birthDate:', birthDate);
    
    if (!birthDate) {
      throw new Error('缺少必要参数: birthDate');
    }

    // 验证birthDate参数
    const { year, month, day, hour, minute = 0 } = birthDate;
    if (!year || !month || !day || hour === undefined) {
      throw new Error('birthDate参数不完整，缺少必要字段');
    }

    // 提取时间参数
    const parameters = extractTimeParams(birthDate);
    console.log('=== 时间参数提取详情 ===');
    console.log('输入出生日期（北京时间）:', birthDate);
    console.log('提取的Coze API参数:', parameters);
    console.log('=== 开始调用Coze API ===');
    
    // 调用Coze API
    console.log('开始调用Coze API...');
    let result;
    try {
      result = await callCozeAPI(parameters);
      console.log('Coze API 调用成功，返回结果:', result);
    } catch (apiError) {
      console.error('Coze API 调用失败:', apiError);
      console.error('API错误堆栈:', apiError.stack);
      throw apiError; // 重新抛出异常，让外层catch处理
    }
    
    // 解析Coze数据为标准化的八字数据结构
    console.log('开始解析Coze数据...');
    let baziData;
    try {
      baziData = parseBaziData(result.data);
      console.log('解析后的八字数据:', baziData);
      
      if (!baziData) {
        console.error('parseBaziData返回了空值');
        throw new Error('parseBaziData返回了空值');
      }
    } catch (parseError) {
      console.error('解析八字数据失败:', parseError);
      console.error('解析错误堆栈:', parseError.stack);
      throw new Error(`八字数据解析失败: ${parseError.message}`);
    }
    
    console.log('=== 生辰八字计算成功，准备返回结果 ===');
    return {
      success: true,
      data: {
        baziData: baziData,  // 标准化的八字数据
        rawCozeData: result.data,  // 保留原始coze数据用于调试
        parameters,
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
  extractTimeParams,
  parseBaziData,
  callCozeAPI,
  getGanZhiIndex
};
