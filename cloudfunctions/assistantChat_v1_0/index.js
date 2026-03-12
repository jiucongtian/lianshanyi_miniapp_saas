// 云函数入口文件 - 助学童子聊天功能
const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV // 使用当前云环境
})

// Coze API 配置
const COZE_CONFIG = {
  token: 'sat_JBr8tgHf8a8IkpwoFMpNWiioLFdqdAWj9O8HVRZ7DFmYqQf2wKzf92vRqKjQQMdv',
  baseURL: 'https://api.coze.cn',
  botId: '7615870340559978548'
}

/**
 * 调用 Coze Chat API
 * @param {string} userId - 用户ID (使用OPENID)
 * @param {string} message - 用户消息内容
 * @param {string} conversationId - 会话ID (可选，用于多轮对话)
 * @returns {Promise<Object>} 聊天结果
 */
async function callCozeChatAPI(userId, message, conversationId = null) {
  try {
    // 构建请求体
    const requestBody = {
      bot_id: COZE_CONFIG.botId,
      user_id: userId,
      stream: false, // 非流式模式
      additional_messages: [
        {
          role: 'user',
          content: message,
          content_type: 'text'
        }
      ]
    }

    // 如果有会话ID，添加到请求体（用于多轮对话）
    if (conversationId) {
      requestBody.conversation_id = conversationId
    }

    console.log('[assistantChat] 请求参数:', JSON.stringify({
      userId,
      message: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
      hasConversationId: !!conversationId
    }, null, 2))

    const response = await axios({
      url: `${COZE_CONFIG.baseURL}/v3/chat`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${COZE_CONFIG.token}`
      },
      data: requestBody,
      timeout: 60000 // 60秒超时
    })

    console.log('[assistantChat] Coze API 响应状态:', response.status)

    // 检查API响应
    if (response.data.code !== 0) {
      console.error('[assistantChat] Coze API 返回错误:', response.data)
      const errorMsg = response.data.msg || 'Coze API调用失败'
      throw new Error(errorMsg)
    }

    return {
      success: true,
      data: response.data.data
    }
  } catch (error) {
    console.error('[assistantChat] Coze Chat API 调用失败:', error.message)

    // 处理不同类型的错误
    if (error.response) {
      const status = error.response.status
      const responseData = error.response.data
      const errorMsg = responseData?.msg || responseData?.message || `HTTP ${status}`
      throw new Error(`API请求失败: ${errorMsg}`)
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('请求超时，请稍后重试')
    } else {
      throw new Error(error.message || '网络请求失败')
    }
  }
}

/**
 * 从Coze响应中提取消息内容
 * @param {Object} chatData - Coze API返回的chat数据
 * @returns {string} 提取的消息内容
 */
function extractMessageContent(chatData) {
  try {
    if (!chatData) {
      return ''
    }

    // Coze v3 API 响应结构
    // chatData.messages 是消息数组
    // 我们需要找到 role === 'assistant' 的消息
    if (chatData.messages && Array.isArray(chatData.messages)) {
      const assistantMessages = chatData.messages
        .filter(msg => msg.role === 'assistant' && msg.type === 'answer')
        .map(msg => msg.content)
        .filter(content => content)

      if (assistantMessages.length > 0) {
        return assistantMessages.join('\n')
      }
    }

    // 备选：检查其他可能的字段
    if (chatData.content) {
      return chatData.content
    }

    if (chatData.answer) {
      return chatData.answer
    }

    console.warn('[assistantChat] 无法从响应中提取消息内容:', JSON.stringify(chatData, null, 2))
    return ''
  } catch (error) {
    console.error('[assistantChat] 提取消息内容失败:', error)
    return ''
  }
}

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()

  try {
    console.log('=== assistantChat_v1_0 调用开始 ===')
    console.log('接收到的参数:', JSON.stringify({
      action: event.action,
      hasMessage: !!event.message,
      conversationId: event.conversationId
    }, null, 2))

    const { action, message, conversationId } = event

    // 验证必需参数
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return {
        success: false,
        error: '消息内容不能为空',
        code: -1,
        timestamp: new Date().getTime()
      }
    }

    // 获取用户ID (使用OPENID)
    const userId = wxContext.OPENID

    if (!userId) {
      return {
        success: false,
        error: '无法获取用户信息',
        code: -2,
        timestamp: new Date().getTime()
      }
    }

    // 调用 Coze Chat API
    const result = await callCozeChatAPI(userId, message.trim(), conversationId)

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Coze API调用失败',
        code: -3,
        timestamp: new Date().getTime()
      }
    }

    // 提取消息内容
    const replyContent = extractMessageContent(result.data)

    // 构建返回结果
    const response = {
      success: true,
      data: {
        content: replyContent,
        conversationId: result.data.id || result.data.conversation_id || null,
        userId: userId
      },
      openid: wxContext.OPENID,
      timestamp: new Date().getTime()
    }

    console.log('=== assistantChat_v1_0 调用成功 ===')
    return response

  } catch (error) {
    console.error('=== assistantChat_v1_0 调用失败 ===')
    console.error('错误信息:', error.message)
    console.error('错误堆栈:', error.stack)

    return {
      success: false,
      error: error.message || '聊天服务暂时不可用',
      code: -4,
      timestamp: new Date().getTime()
    }
  }
}