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
  
  console.log('[drawCardManagement] 云函数调用:', { action, data })
  
  try {
    switch (action) {
      case 'recordDraw':
        return await recordDraw(wxContext, data)
      default:
        return {
          success: false,
          error: '未知操作类型',
          code: -1
        }
    }
  } catch (error) {
    console.error('[drawCardManagement] 云函数执行失败:', error)
    return {
      success: false,
      error: error.message || '操作失败',
      code: -1
    }
  }
}

/**
 * 记录抽卡历史
 * 注意：抽卡配额检查已集成到userManagement云函数的getUserInfo接口中
 */
async function recordDraw(wxContext, data) {
  const { OPENID } = wxContext
  
  console.log('[recordDraw] 开始记录抽卡历史, OPENID:', OPENID, 'data:', data)
  
  try {
    // 1. 验证必需参数
    if (!data || !data.cardNumber || !data.cardName || !data.aiAnswer) {
      console.error('[recordDraw] 缺少必需参数')
      return {
        success: false,
        error: '缺少必需参数: cardNumber, cardName, aiAnswer',
        code: -2
      }
    }
    
    // 2. 获取用户信息
    const userResult = await db.collection('users')
      .where({ openid: OPENID, isActive: true })
      .get()
    
    if (userResult.data.length === 0) {
      console.error('[recordDraw] 用户不存在')
      return {
        success: false,
        error: '用户不存在',
        code: 1001
      }
    }
    
    const user = userResult.data[0]
    const userType = user.userType || user.userTypeCode || 'guest'
    console.log('[recordDraw] 用户信息:', { userId: user._id, userType })
    
    // 3. 构建记录数据
    const now = new Date()
    const drawDate = now.toISOString().split('T')[0] // YYYY-MM-DD格式
    
    // drawTime 从参数传入，如果没有则使用当前时间
    let drawTime = now
    if (data.drawTime) {
      try {
        drawTime = new Date(data.drawTime)
        // 验证日期是否有效
        if (isNaN(drawTime.getTime())) {
          console.warn('[recordDraw] drawTime 无效，使用当前时间')
          drawTime = now
        }
      } catch (e) {
        console.warn('[recordDraw] drawTime 解析失败，使用当前时间:', e.message)
        drawTime = now
      }
    }
    
    const record = {
      userId: user._id,
      openid: OPENID,
      userTypeCode: userType, // 快照，记录抽卡时的用户类型
      question: data.question || '',
      cardNumber: data.cardNumber,
      cardName: data.cardName,
      aiAnswer: data.aiAnswer,
      drawTime: drawTime,
      interpretTime: now,
      drawDate: drawDate,
      isActive: true
    }
    
    // 如果有云函数版本号，也记录下来
    if (data.cloudFunctionVersion) {
      record.cloudFunctionVersion = data.cloudFunctionVersion
    }
    
    console.log('[recordDraw] 准备插入记录:', {
      userId: record.userId,
      cardNumber: record.cardNumber,
      cardName: record.cardName,
      drawDate: record.drawDate
    })
    
    // 4. 插入记录
    try {
      const addResult = await db.collection('draw_card_records').add({
        data: record
      })
      
      console.log('[recordDraw] 记录插入成功, _id:', addResult._id)
      
      return {
        success: true,
        message: '记录成功',
        data: {
          recordId: addResult._id
        }
      }
    } catch (addError) {
      console.error('[recordDraw] 插入记录失败:', addError)
      return {
        success: false,
        error: '记录失败: ' + addError.message,
        code: -1
      }
    }
  } catch (error) {
    console.error('[recordDraw] 记录抽卡历史失败:', error)
    throw new Error('记录抽卡历史失败: ' + error.message)
  }
}

