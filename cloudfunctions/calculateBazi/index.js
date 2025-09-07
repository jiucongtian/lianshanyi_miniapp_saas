// 云函数入口文件
const cloud = require('wx-server-sdk')

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
  const COZE_CONFIG = {
    token: 'sat_JBr8tgHf8a8IkpwoFMpNWiioLFdqdAWj9O8HVRZ7DFmYqQf2wKzf92vRqKjQQMdv',
    baseURL: 'https://api.coze.cn',
    workflowId: '7544388114807095337'
  };

  try {
    const response = await cloud.httpsCall({
      url: `${COZE_CONFIG.baseURL}/v1/workflow/run`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${COZE_CONFIG.token}`
      },
      data: {
        workflow_id: COZE_CONFIG.workflowId,
        parameters: parameters
      }
    });

    console.log('Coze API 响应:', response);
    
    if (response.statusCode === 200) {
      return {
        success: true,
        data: response.data,
        parameters
      };
    } else {
      throw new Error(`API请求失败: ${response.statusCode}`);
    }
  } catch (error) {
    console.error('Coze API 请求失败:', error);
    throw error;
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
