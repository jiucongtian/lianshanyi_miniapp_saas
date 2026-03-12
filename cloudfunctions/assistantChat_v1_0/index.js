// 云函数入口文件 - 助学童子聊天功能（Coze Chat API v3）
const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const COZE_CONFIG = {
  token: 'sat_JBr8tgHf8a8IkpwoFMpNWiioLFdqdAWj9O8HVRZ7DFmYqQf2wKzf92vRqKjQQMdv',
  baseURL: 'https://api.coze.cn',
  botId: '7615870340559978548'
}

const COZE_HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${COZE_CONFIG.token}`
}

function success(data) {
  return { success: true, data, timestamp: Date.now() }
}

function fail(error, code = -1) {
  return { success: false, error, code, timestamp: Date.now() }
}

/**
 * action: startChat
 * 创建一轮对话，立即返回 chatId + conversationId，耗时 < 1秒
 */
async function startChat(event, wxContext) {
  const { message, conversationId } = event

  if (!message || typeof message !== 'string' || message.trim() === '') {
    return fail('消息内容不能为空', -1)
  }

  const requestBody = {
    bot_id: COZE_CONFIG.botId,
    user_id: wxContext.OPENID,
    stream: false,
    additional_messages: [
      { role: 'user', content: message.trim(), content_type: 'text' }
    ]
  }

  // 传入 conversation_id 可继续上一轮对话上下文
  if (conversationId) {
    requestBody.conversation_id = conversationId
  }

  console.log('[startChat] 创建对话:', {
    userId: wxContext.OPENID,
    messageLength: message.length,
    hasConversationId: !!conversationId
  })

  let response
  try {
    response = await axios({
      url: `${COZE_CONFIG.baseURL}/v3/chat`,
      method: 'POST',
      headers: COZE_HEADERS,
      data: requestBody,
      timeout: 15000
    })
  } catch (e) {
    const errMsg = (e.response && e.response.data && e.response.data.msg) || e.message || '创建对话请求失败'
    console.error('[startChat] 请求异常:', errMsg, e.response && e.response.data)
    return fail(`创建对话失败: ${errMsg}`, -2)
  }

  console.log('[startChat] Coze 原始响应:', JSON.stringify(response.data))

  if (response.data.code !== 0) {
    console.error('[startChat] Coze 返回错误:', response.data)
    return fail(response.data.msg || '创建对话失败', -3)
  }

  const chatData = response.data.data
  if (!chatData || !chatData.id) {
    console.error('[startChat] 响应数据格式异常:', response.data)
    return fail('响应数据格式异常', -4)
  }

  console.log('[startChat] 对话已创建:', { chatId: chatData.id, conversationId: chatData.conversation_id })

  return success({
    chatId: chatData.id,
    conversationId: chatData.conversation_id
  })
}

/**
 * action: getChatResult
 * 查询对话执行状态；若已完成则一并返回消息内容
 * 返回 status: 'running' | 'success' | 'fail'
 */
async function getChatResult(event) {
  const { chatId, conversationId } = event

  if (!chatId || !conversationId) {
    return fail('缺少 chatId 或 conversationId', -1)
  }

  // 查询对话状态
  let retrieveResponse
  try {
    retrieveResponse = await axios({
      url: `${COZE_CONFIG.baseURL}/v3/chat/retrieve`,
      method: 'GET',
      headers: COZE_HEADERS,
      params: { chat_id: chatId, conversation_id: conversationId },
      timeout: 10000
    })
  } catch (e) {
    const errMsg = (e.response && e.response.data && e.response.data.msg) || e.message || '查询状态请求失败'
    console.error('[getChatResult] 查询状态请求异常:', errMsg, e.response && e.response.data)
    return fail(`查询状态失败: ${errMsg}`, -2)
  }

  console.log('[getChatResult] retrieve 原始响应:', JSON.stringify(retrieveResponse.data))

  if (retrieveResponse.data.code !== 0) {
    console.error('[getChatResult] Coze 查询状态错误:', retrieveResponse.data)
    return fail(retrieveResponse.data.msg || '查询对话状态失败', -3)
  }

  const chatData = retrieveResponse.data.data
  const status = chatData && chatData.status

  console.log('[getChatResult] 当前状态:', status)

  if (!status || status === 'in_progress' || status === 'created') {
    return success({ status: 'running' })
  }

  if (status === 'failed' || status === 'requires_action') {
    return fail(`对话异常，状态: ${status}`, -4)
  }

  // status === 'completed'，获取消息列表
  let msgResponse
  try {
    msgResponse = await axios({
      url: `${COZE_CONFIG.baseURL}/v3/chat/message/list`,
      method: 'GET',
      headers: COZE_HEADERS,
      params: { chat_id: chatId, conversation_id: conversationId },
      timeout: 10000
    })
  } catch (e) {
    const errMsg = (e.response && e.response.data && e.response.data.msg) || e.message || '获取消息请求失败'
    console.error('[getChatResult] 获取消息请求异常:', errMsg, e.response && e.response.data)
    return fail(`获取消息失败: ${errMsg}`, -5)
  }

  console.log('[getChatResult] message/list 原始响应:', JSON.stringify(msgResponse.data))

  if (msgResponse.data.code !== 0) {
    console.error('[getChatResult] Coze 获取消息错误:', msgResponse.data)
    return fail(msgResponse.data.msg || '获取消息内容失败', -6)
  }

  // 兼容两种响应格式：data 直接是数组，或 data.messages 是数组
  const rawData = msgResponse.data.data
  const messages = Array.isArray(rawData) ? rawData : (rawData && rawData.messages) || []
  const content = extractContent(messages)

  console.log('[getChatResult] 对话完成，提取内容长度:', content.length, '消息数:', messages.length)

  return success({ status: 'success', content })
}

/**
 * 从消息列表中提取助手回复
 */
function extractContent(messages) {
  if (!Array.isArray(messages)) return ''

  const answers = messages
    .filter(msg => msg.role === 'assistant' && msg.type === 'answer')
    .map(msg => msg.content)
    .filter(Boolean)

  return answers.join('\n')
}

// 云函数入口
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { action } = event

  console.log('=== assistantChat_v1_0 ===', { action, openid: wxContext.OPENID })

  try {
    switch (action) {
      case 'startChat':
        return await startChat(event, wxContext)
      case 'getChatResult':
        return await getChatResult(event)
      default:
        return fail(`未知 action: ${action}`, -1)
    }
  } catch (error) {
    console.error('=== 云函数异常 ===', error.message)
    return fail(error.message || '服务异常', -5)
  }
}
