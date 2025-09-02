/**
 * Coze API 调用模块
 * 适配微信小程序环境的Coze工作流调用
 */

const { extractTimeParams } = require('../utils/util');

const COZE_CONFIG = {
  token: 'sat_JBr8tgHf8a8IkpwoFMpNWiioLFdqdAWj9O8HVRZ7DFmYqQf2wKzf92vRqKjQQMdv',
  baseURL: 'https://api.coze.cn',
  workflowId: '7544388114807095337'
};

/**
 * 调用Coze工作流
 * @param {Object} parameters - 工作流参数
 * @param {number} parameters.year - 年份
 * @param {number} parameters.month - 月份
 * @param {number} parameters.day - 日期
 * @param {number} parameters.hour - 小时
 * @param {number} parameters.min - 分钟
 * @returns {Promise} 返回工作流执行结果
 */
function createWorkflowRun(parameters) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${COZE_CONFIG.baseURL}/v1/workflow/run`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${COZE_CONFIG.token}`
      },
      data: {
        workflow_id: COZE_CONFIG.workflowId,
        parameters: parameters
      },
      success(res) {
        console.log('Coze API 响应:', res);
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          reject({
            code: res.statusCode,
            message: res.data?.msg || '请求失败',
            data: res.data
          });
        }
      },
      fail(err) {
        console.error('Coze API 请求失败:', err);
        reject({
          code: -1,
          message: '网络请求失败',
          data: err
        });
      }
    });
  });
}

/**
 * 从日期时间戳提取Coze API所需的参数（使用通用工具函数）
 * @param {number} timestamp - 时间戳
 * @returns {Object} Coze API参数对象
 */
function extractTimeParameters(timestamp) {
  return extractTimeParams(timestamp);
}

/**
 * 调用生辰八字计算工作流
 * @param {number} timestamp - 时间戳
 * @returns {Promise} 返回计算结果
 */
async function calculateBazi(timestamp) {
  try {
    const parameters = extractTimeParameters(timestamp);
    console.log('调用Coze API，参数:', parameters);
    
    const result = await createWorkflowRun(parameters);
    console.log('Coze API 返回结果:', result);
    
    return {
      success: true,
      data: result,
      parameters
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

module.exports = {
  createWorkflowRun,
  extractTimeParameters,
  calculateBazi
};
