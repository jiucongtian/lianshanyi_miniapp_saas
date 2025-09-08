// 云函数入口文件
const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV // 使用当前云环境
})

/**
 * 从日期时间戳提取参数
 * @param {number} timestamp - 时间戳
 * @returns {Object} 参数对象
 */
function extractTimeParams(timestamp) {
  const date = new Date(timestamp);
  
  // 问题分析：
  // 1. 用户选择的是北京时间 2025-09-08 11:00 (午时)
  // 2. 但Coze API返回的是寅时(3-5点)对应的八字
  // 3. 这表明Coze API可能使用UTC时间计算八字
  // 4. 北京时间11:00 = UTC时间03:00，3点确实对应寅时
  
  // 解决方案：传递北京时间给Coze API，让它按照中国时区计算八字
  // 但如果Coze API内部使用UTC，我们需要调整参数
  
  const localParams = {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: date.getHours(),
    min: date.getMinutes()
  };
  
  // 添加时区信息用于调试
  const utcParams = {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    min: date.getUTCMinutes()
  };
  
  console.log('=== 时间参数调试信息 ===');
  console.log('原始时间戳:', timestamp);
  console.log('北京时间:', date.toString());
  console.log('UTC时间:', date.toUTCString());
  console.log('北京时间参数:', localParams);
  console.log('UTC时间参数:', utcParams);
  console.log('北京时间', localParams.hour, '点应该对应午时');
  console.log('UTC时间', utcParams.hour, '点对应寅时');
  console.log('========================');
  
  // 时区补偿方案：
  // 如果Coze API使用UTC时间计算，我们需要传递调整后的时间
  // 使北京时间的小时数能够在UTC环境下得到正确的八字结果
  
  // 方案1：直接使用北京时间参数（当前方案）
  // 如果这样还是错误，说明Coze API确实使用UTC时间
  
  // 方案2：传递UTC+8的时间，让Coze API在UTC环境下计算出正确的北京时间八字
  // 但这可能会影响日期，需要谨慎处理
  
  // 临时解决方案：添加一个时区补偿标志
  const TIMEZONE_COMPENSATION = true; // 可以通过环境变量控制
  
  if (TIMEZONE_COMPENSATION) {
    // 如果需要时区补偿，我们传递一个调整后的时间戳
    // 让Coze API在UTC环境下计算时能得到正确的北京时间结果
    const compensatedTimestamp = timestamp + (8 * 60 * 60 * 1000); // 加8小时
    const compensatedDate = new Date(compensatedTimestamp);
    
    const compensatedParams = {
      year: compensatedDate.getUTCFullYear(),
      month: compensatedDate.getUTCMonth() + 1,
      day: compensatedDate.getUTCDate(),
      hour: compensatedDate.getUTCHours(),
      min: compensatedDate.getUTCMinutes()
    };
    
    console.log('使用时区补偿参数:', compensatedParams);
    console.log('补偿后UTC时间:', compensatedDate.toUTCString());
    
    return compensatedParams;
  }
  
  return localParams;
}

/**
 * 调用Coze工作流
 * @param {Object} parameters - 工作流参数
 * @returns {Promise} 返回工作流执行结果
 */
async function callCozeAPI(parameters) {
  // 从环境变量中读取配置，提高安全性
  const COZE_CONFIG = {
    token: process.env.COZE_TOKEN || 'sat_JBr8tgHf8a8IkpwoFMpNWiioLFdqdAWj9O8HVRZ7DFmYqQf2wKzf92vRqKjQQMdv', // 兜底值
    baseURL: process.env.COZE_BASE_URL || 'https://api.coze.cn',
    workflowId: process.env.COZE_WORKFLOW_ID || '7544388114807095337'
  };

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
      timeout: 30000 // 30秒超时
    });

    console.log('=== Coze API 完整响应 ===');
    console.log('响应状态:', response.status);
    console.log('响应头:', response.headers);
    console.log('响应数据完整结构:', JSON.stringify(response.data, null, 2));
    console.log('响应数据类型:', typeof response.data);
    
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
    
    return {
      success: true,
      data: result.data,
      parameters,
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
