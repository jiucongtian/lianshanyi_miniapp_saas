// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV // 使用当前云环境
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { action, data } = event
  
  try {
    switch (action) {
      case 'submitFeedback':
        return await submitFeedback(wxContext, data)
      case 'getUserFeedbacks':
        return await getUserFeedbacks(wxContext, data)
      case 'getFeedbackDetail':
        return await getFeedbackDetail(wxContext, data)
      default:
        return {
          success: false,
          error: '未知操作类型'
        }
    }
  } catch (error) {
    console.error('反馈管理云函数执行失败:', error)
    return {
      success: false,
      error: error.message || '操作失败'
    }
  }
}

/**
 * 提交用户反馈
 */
async function submitFeedback(wxContext, feedbackData) {
  const { OPENID } = wxContext
  const now = new Date()
  
  try {
    // 1. 验证必填字段
    if (!feedbackData.feedbackType || !feedbackData.title || !feedbackData.content) {
      return {
        success: false,
        error: '缺少必填字段：反馈类型、标题或内容',
        code: 'MISSING_REQUIRED_FIELDS'
      }
    }
    
    // 2. 验证反馈类型枚举值
    const validFeedbackTypes = ['problem', 'suggestion', 'other']
    if (!validFeedbackTypes.includes(feedbackData.feedbackType)) {
      return {
        success: false,
        error: '无效的反馈类型，支持的类型：problem（问题反馈）、suggestion（功能建议）、other（其他反馈）',
        code: 'INVALID_FEEDBACK_TYPE'
      }
    }
    
    // 3. 验证标题和内容长度
    const title = feedbackData.title.trim()
    const content = feedbackData.content.trim()
    
    if (title.length < 10 || title.length > 50) {
      return {
        success: false,
        error: '标题长度必须在10-50个字符之间',
        code: 'INVALID_TITLE_LENGTH'
      }
    }
    
    if (content.length < 20 || content.length > 500) {
      return {
        success: false,
        error: '内容长度必须在20-500个字符之间',
        code: 'INVALID_CONTENT_LENGTH'
      }
    }
    
    // 4. 获取用户信息（验证用户是否存在且激活）
    const userResult = await db.collection('users').where({
      openid: OPENID,
      isActive: true
    }).get()
    
    if (userResult.data.length === 0) {
      return {
        success: false,
        error: '用户不存在或未激活，请先登录',
        code: 'USER_NOT_FOUND'
      }
    }
    
    const user = userResult.data[0]
    const userId = user._id
    
    // 5. 创建反馈记录
    const feedbackDoc = {
      userId,
      openid: OPENID,
      feedbackType: feedbackData.feedbackType,
      title: title,
      content: content,
      status: 'pending', // 默认状态为待处理
      adminReply: null,
      adminId: null,
      replyTime: null,
      createTime: now,
      updateTime: now,
      isDeleted: false
    }
    
    console.log('[submitFeedback] 准备插入反馈记录:', feedbackDoc)
    
    const result = await db.collection('feedbacks').add({
      data: feedbackDoc
    })
    
    console.log('[submitFeedback] 反馈创建成功:', result)
    
    // 6. 构建完整的反馈数据返回
    const fullFeedbackData = {
      ...feedbackDoc,
      _id: result._id
    }
    
    return {
      success: true,
      message: '反馈提交成功',
      data: {
        feedbackId: result._id,
        feedback: fullFeedbackData
      }
    }
  } catch (error) {
    console.error('[submitFeedback] 提交反馈失败:', error)
    return {
      success: false,
      error: error.message || '提交反馈失败',
      code: 'SUBMIT_FAILED'
    }
  }
}

/**
 * 获取用户的反馈列表
 */
async function getUserFeedbacks(wxContext, queryData = {}) {
  const { OPENID } = wxContext
  const { page = 1, limit = 20, feedbackType = null, status = null } = queryData
  
  try {
    const skip = (page - 1) * limit
    
    // 构建查询条件
    let whereCondition = {
      openid: OPENID,
      isDeleted: false
    }
    
    // 可选过滤条件
    if (feedbackType) {
      whereCondition.feedbackType = feedbackType
    }
    
    if (status) {
      whereCondition.status = status
    }
    
    console.log('[getUserFeedbacks] 查询条件:', whereCondition)
    
    // 查询反馈列表
    const result = await db.collection('feedbacks')
      .where(whereCondition)
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(limit)
      .get()
    
    // 获取总数
    const countResult = await db.collection('feedbacks')
      .where(whereCondition)
      .count()
    
    console.log('[getUserFeedbacks] 查询成功，共', countResult.total, '条记录')
    
    return {
      success: true,
      data: {
        feedbacks: result.data,
        total: countResult.total,
        page,
        limit,
        hasMore: skip + result.data.length < countResult.total
      }
    }
  } catch (error) {
    console.error('[getUserFeedbacks] 获取反馈列表失败:', error)
    return {
      success: false,
      error: error.message || '获取反馈列表失败',
      code: 'GET_LIST_FAILED'
    }
  }
}

/**
 * 获取单条反馈详情
 */
async function getFeedbackDetail(wxContext, queryData) {
  const { OPENID } = wxContext
  const { feedbackId } = queryData
  
  if (!feedbackId) {
    return {
      success: false,
      error: '缺少反馈ID',
      code: 'MISSING_FEEDBACK_ID'
    }
  }
  
  try {
    console.log('[getFeedbackDetail] 查询反馈详情:', feedbackId)
    
    const result = await db.collection('feedbacks')
      .where({
        _id: feedbackId,
        openid: OPENID,
        isDeleted: false
      })
      .get()
    
    if (result.data.length === 0) {
      return {
        success: false,
        error: '反馈不存在',
        code: 'FEEDBACK_NOT_FOUND'
      }
    }
    
    console.log('[getFeedbackDetail] 查询成功')
    
    return {
      success: true,
      data: result.data[0]
    }
  } catch (error) {
    console.error('[getFeedbackDetail] 获取反馈详情失败:', error)
    return {
      success: false,
      error: error.message || '获取反馈详情失败',
      code: 'GET_DETAIL_FAILED'
    }
  }
}

