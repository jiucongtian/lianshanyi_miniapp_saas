// 云函数入口文件
const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV // 使用当前云环境
})

/**
 * 从日期时间戳提取参数
 * @param {number} timestamp - 时间戳 (北京时间)
 * @returns {Object} 参数对象 (UTC时间，供Coze API使用)
 */
function extractTimeParams(timestamp) {
  // Coze API使用UTC时间计算八字，需要将北京时间转换为UTC时间
  // 北京时间 + 8小时偏移，然后提取UTC时间参数
  const compensatedTimestamp = timestamp + (8 * 60 * 60 * 1000);
  const date = new Date(compensatedTimestamp);
  
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    min: date.getUTCMinutes()
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
    
    // 构建标准化的八字数据结构
    const baziData = {
      yearPillar: {
        heavenlyStem: output.year[0],
        earthlyBranch: output.year[1]
      },
      monthPillar: {
        heavenlyStem: output.month[0],
        earthlyBranch: output.month[1]
      },
      dayPillar: {
        heavenlyStem: output.day[0],
        earthlyBranch: output.day[1]
      },
      timePillar: {
        heavenlyStem: output.hour[0],
        earthlyBranch: output.hour[1]
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
  // 从环境变量中读取配置
  const COZE_CONFIG = {
    token: process.env.COZE_TOKEN,
    baseURL: process.env.COZE_BASE_URL || 'https://api.coze.cn',
    workflowId: process.env.COZE_WORKFLOW_ID
  };

  // 检查必需的环境变量
  if (!COZE_CONFIG.token) {
    throw new Error('缺少必需的环境变量 COZE_TOKEN，请在 cloudbase/cloudbaserc.json 中的 envVariables 中配置');
  }
  
  if (!COZE_CONFIG.workflowId) {
    throw new Error('缺少必需的环境变量 COZE_WORKFLOW_ID，请在 cloudbase/cloudbaserc.json 中的 envVariables 中配置');
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

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    const { timestamp } = event;
    
    if (!timestamp) {
      return {
        success: false,
        error: '缺少必要参数: timestamp'
      };
    }

    // 提取时间参数
    const parameters = extractTimeParams(timestamp);
    console.log('调用Coze API，参数:', parameters);
    
    // 调用Coze API
    const result = await callCozeAPI(parameters);
    console.log('Coze API 返回结果:', result);
    
    // 解析Coze数据为标准化的八字数据结构
    let baziData;
    try {
      baziData = parseBaziData(result.data);
      console.log('解析后的八字数据:', baziData);
      
      if (!baziData) {
        throw new Error('parseBaziData返回了空值');
      }
    } catch (parseError) {
      console.error('解析八字数据失败:', parseError);
      return {
        success: false,
        error: `八字数据解析失败: ${parseError.message}`,
        rawCozeData: result.data,  // 保留原始coze数据用于调试
        parameters,
        timestamp: event.timestamp,
        openid: wxContext.OPENID,
        appid: wxContext.APPID,
        unionid: wxContext.UNIONID,
      };
    }
    
    return {
      success: true,
      baziData: baziData,  // 标准化的八字数据
      rawCozeData: result.data,  // 保留原始coze数据用于调试
      parameters,
      timestamp: event.timestamp,
      openid: wxContext.OPENID,
      appid: wxContext.APPID,
      unionid: wxContext.UNIONID,
    };
  } catch (error) {
    console.error('生辰八字计算失败:', error);
    return {
      success: false,
      error: error.message || '计算失败',
      code: error.code
    };
  }
}

