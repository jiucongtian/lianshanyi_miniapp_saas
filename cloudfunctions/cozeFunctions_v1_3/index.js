// 云函数入口文件
const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV // 使用当前云环境
})

// Coze API 配置常量
const COZE_CONFIG = {
  token: 'sat_JBr8tgHf8a8IkpwoFMpNWiioLFdqdAWj9O8HVRZ7DFmYqQf2wKzf92vRqKjQQMdv',
  baseURL: 'https://api.coze.cn',
  defaultWorkflowId: '7565131575660003366'  // 抽卡牌工作流
}

/**
 * 调用Coze工作流
 * @param {Object} parameters - 工作流参数
 * @param {string} workflowId - 工作流ID（可选，如果不传则使用默认值）
 * @returns {Promise} 返回工作流执行结果
 */
async function callCozeAPI(parameters, workflowId = null) {
  // 使用传入的 workflowId 或默认值
  const finalWorkflowId = workflowId || COZE_CONFIG.defaultWorkflowId;
  
  // 检查必需的参数
  if (!COZE_CONFIG.token) {
    throw new Error('缺少 Coze API Token 配置');
  }
  
  if (!finalWorkflowId) {
    throw new Error('缺少 workflowId 参数');
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
        workflow_id: finalWorkflowId,
        parameters: parameters
      },
      timeout: 25000 // 25秒超时，给云函数留出处理时间
    });

    console.log('=== Coze API 完整响应 ===');
    console.log('使用的 WorkflowId:', finalWorkflowId);
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
      parameters,
      workflowId: finalWorkflowId
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
    console.log('=== cozeFunctions_v1_3 抽卡牌调用开始 ===');
    console.log('接收到的参数:', JSON.stringify(event, null, 2));
    
    const { bazi_name, question, workflowId } = event;
    
    // 验证必需参数
    if (!bazi_name) {
      return {
        success: false,
        error: '缺少必要参数: bazi_name (八字组合名)',
        timestamp: new Date().getTime()
      };
    }
    
    // 构建 Coze 工作流参数
    const cozeParameters = {
      bazi_name: bazi_name,
      question: question || ''  // 问题可以为空
    };
    
    console.log('八字组合名:', bazi_name);
    console.log('咨询问题:', question || '(无)');
    console.log('WorkflowId:', workflowId || COZE_CONFIG.defaultWorkflowId);
    
    // 调用 Coze API
    const result = await callCozeAPI(cozeParameters, workflowId);
    console.log('Coze API 调用成功');
    
    // 构建返回结果
    const response = {
      success: true,
      data: result.data,              // 原始 Coze 响应数据
      workflowId: result.workflowId,
      bazi_name: bazi_name,
      question: question || null,
      openid: wxContext.OPENID,
      appid: wxContext.APPID,
      unionid: wxContext.UNIONID,
      timestamp: new Date().getTime()
    };
    
    console.log('=== cozeFunctions_v1_3 抽卡牌调用成功 ===');
    return response;
    
  } catch (error) {
    console.error('=== cozeFunctions_v1_3 抽卡牌调用失败 ===');
    console.error('错误信息:', error.message);
    console.error('错误堆栈:', error.stack);
    
    return {
      success: false,
      error: error.message || '抽卡牌失败',
      code: error.code,
      timestamp: new Date().getTime()
    };
  }
}

