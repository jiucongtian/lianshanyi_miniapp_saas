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
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: date.getHours(),
    min: date.getMinutes()
  };
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
