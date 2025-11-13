// 云函数入口文件
const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV // 使用当前云环境
})

// Coze API 配置常量
const COZE_CONFIG = {
  token: 'sat_JBr8tgHf8a8IkpwoFMpNWiioLFdqdAWj9O8HVRZ7DFmYqQf2wKzf92vRqKjQQMdv',
  baseURL: 'https://api.coze.cn'
}

// 工作流类型枚举映射
const WORKFLOW_TYPES = {
  DRAW_CARD: '7565131575660003366',        // 抽卡牌工作流
  GEN_BAZI: '7544388114807095337',         // 生成八字工作流
  // 后续可以在这里添加更多工作流
  // WORKFLOW_NAME: 'workflow_id',
}

// 默认工作流类型
const DEFAULT_WORKFLOW_TYPE = 'DRAW_CARD'

/**
 * 调用Coze工作流
 * @param {Object} parameters - 工作流参数
 * @param {string} workflowId - 工作流ID
 * @returns {Promise} 返回工作流执行结果
 */
async function callCozeAPI(parameters, workflowId) {
  const finalWorkflowId = workflowId;
  
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
      timeout: 60000 // 30秒超时，给云函数留出处理时间（云函数默认超时60秒）
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
    // 安全地记录错误信息，避免序列化问题
    const errorInfo = {
      message: error?.message || '未知错误',
      code: error?.code,
      name: error?.name,
      stack: error?.stack
    };
    console.error('Coze API 请求失败:', JSON.stringify(errorInfo, null, 2));
    
    // 处理axios错误
    if (error.response) {
      // 服务器返回了错误状态码
      const status = error.response.status || '未知';
      const statusText = error.response.statusText || '未知';
      const responseData = error.response.data;
      const errorMessage = responseData?.message || responseData?.msg || statusText;
      throw new Error(`API请求失败: ${status} - ${errorMessage}`);
    } else if (error.request) {
      // 请求已发出但没有收到响应（可能是超时或网络问题）
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        throw new Error('请求超时，Coze API响应时间过长，请稍后重试');
      } else {
        throw new Error('网络请求失败，请检查网络连接');
      }
    } else {
      // 其他错误
      const errorMessage = error?.message || '请求配置错误';
      throw new Error(`请求配置错误: ${errorMessage}`);
    }
  }
}

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    console.log('=== cozeFunctions_v1_3 调用开始 ===');
    console.log('接收到的参数:', JSON.stringify(event, null, 2));
    
    const { workflowType, parameters } = event;
    
    // 验证必需参数
    if (!parameters) {
      return {
        success: false,
        error: '缺少必要参数: parameters',
        timestamp: new Date().getTime()
      };
    }
    
    // 确定工作流类型，使用传入的类型或默认类型
    const finalWorkflowType = workflowType || DEFAULT_WORKFLOW_TYPE;
    
    // 根据工作流类型获取对应的 workflowId
    const workflowId = WORKFLOW_TYPES[finalWorkflowType];
    
    if (!workflowId) {
      return {
        success: false,
        error: `不支持的工作流类型: ${finalWorkflowType}。支持的类型: ${Object.keys(WORKFLOW_TYPES).join(', ')}`,
        timestamp: new Date().getTime()
      };
    }
    
    console.log('工作流类型:', finalWorkflowType);
    console.log('工作流ID:', workflowId);
    console.log('传入参数:', JSON.stringify(parameters, null, 2));
    
    // 调用 Coze API
    const result = await callCozeAPI(parameters, workflowId);
    console.log('Coze API 调用成功');
    
    // 构建返回结果
    const response = {
      success: true,
      data: result.data,              // 原始 Coze 响应数据
      workflowType: finalWorkflowType,
      workflowId: workflowId,
      parameters: parameters,
      openid: wxContext.OPENID,
      appid: wxContext.APPID,
      unionid: wxContext.UNIONID,
      timestamp: new Date().getTime()
    };
    
    console.log('=== cozeFunctions_v1_3 调用成功 ===');
    return response;
    
  } catch (error) {
    console.error('=== cozeFunctions_v1_3 调用失败 ===');
    console.error('错误信息:', error.message);
    console.error('错误堆栈:', error.stack);
    
    return {
      success: false,
      error: error.message || 'Coze工作流调用失败',
      code: error.code,
      timestamp: new Date().getTime()
    };
  }
}

