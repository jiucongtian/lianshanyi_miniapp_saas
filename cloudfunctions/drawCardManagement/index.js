// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV // 使用当前云环境
})

const db = cloud.database()

/**
 * 获取用户类型配置
 * 优先从static_user_types表获取，如果不存在则使用默认配置
 * 包含 dailyDrawQuota 字段
 */
async function getUserTypeConfig(typeCode) {
  console.log('[getUserTypeConfig] 获取用户类型配置:', typeCode)
  try {
    // 尝试从static_user_types表获取配置
    const configResult = await db.collection('static_user_types').where({
      typeCode: typeCode
    }).get()
    
    console.log('[getUserTypeConfig] static_user_types查询结果:', configResult)
    
    if (configResult.data.length > 0) {
      const config = configResult.data[0]
      console.log('[getUserTypeConfig] 找到配置数据:', config)
      return {
        typeCode: config.typeCode,
        typeName: config.typeName,
        displayName: config.displayName,
        description: config.description,
        profileQuota: config.profileQuota,
        permissions: config.permissions,
        dailyDrawQuota: config.dailyDrawQuota !== undefined ? config.dailyDrawQuota : 0 // 新增字段，默认0
      }
    } else {
      console.log('[getUserTypeConfig] static_user_types表中未找到配置，使用默认配置')
    }
  } catch (error) {
    console.warn('[getUserTypeConfig] 从static_user_types表获取配置失败，使用默认配置:', error.message)
  }
  
  // 如果获取失败或不存在，使用默认配置
  const defaultConfigs = {
    'guest': {
      typeCode: 'guest',
      typeName: '临时用户',
      displayName: '临时用户',
      description: '未注册的临时用户，功能受限',
      profileQuota: 3,
      permissions: ['view', 'create_limited'],
      dailyDrawQuota: 0 // 临时用户不可用抽卡功能
    },
    'normal': {
      typeCode: 'normal',
      typeName: '探索者',
      displayName: '探索者',
      description: '已注册的普通用户，享受基础功能',
      profileQuota: 50,
      permissions: ['view', 'create'],
      dailyDrawQuota: 3 // 普通用户每天3次
    },
    'premium': {
      typeCode: 'premium',
      typeName: '高级用户',
      displayName: '高级用户',
      description: '付费高级用户，享受全部功能',
      profileQuota: -1,
      permissions: ['all'],
      dailyDrawQuota: -1 // 高级用户无限次
    }
  }
  
  return defaultConfigs[typeCode] || defaultConfigs['guest']
}

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { action, data } = event
  
  console.log('[drawCardManagement] 云函数调用:', { action, data })
  
  try {
    switch (action) {
      case 'checkQuota':
        return await checkQuota(wxContext)
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
 * 检查用户抽卡配额
 */
async function checkQuota(wxContext) {
  const { OPENID } = wxContext
  
  console.log('[checkQuota] 开始检查配额, OPENID:', OPENID)
  
  try {
    // 1. 获取用户信息
    const userResult = await db.collection('users')
      .where({ openid: OPENID, isActive: true })
      .get()
    
    if (userResult.data.length === 0) {
      console.log('[checkQuota] 用户不存在')
      return {
        success: false,
        error: '用户不存在',
        code: 1001,
        data: {
          canDraw: false,
          userTypeCode: 'guest',
          remainingQuota: 0,
          totalQuota: 0,
          usedToday: 0
        }
      }
    }
    
    const user = userResult.data[0]
    const userType = user.userType || user.userTypeCode || 'guest'
    console.log('[checkQuota] 用户类型:', userType)
    
    // 2. 获取用户类型配置
    const typeConfig = await getUserTypeConfig(userType)
    console.log('[checkQuota] 用户类型配置:', typeConfig)
    
    // 3. 检查用户类型配额
    const dailyDrawQuota = typeConfig.dailyDrawQuota !== undefined ? typeConfig.dailyDrawQuota : 0
    
    if (dailyDrawQuota === 0) {
      console.log('[checkQuota] 用户类型不支持抽卡功能, dailyDrawQuota:', dailyDrawQuota)
      return {
        success: false,
        error: '请先注册后使用抽卡功能',
        code: 1001,
        data: {
          canDraw: false,
          userTypeCode: userType,
          remainingQuota: 0,
          totalQuota: 0,
          usedToday: 0
        }
      }
    }
    
    // 4. 查询今日已使用次数
    const now = new Date()
    const today = now.toISOString().split('T')[0] // YYYY-MM-DD格式
    console.log('[checkQuota] 查询今日记录, userId:', user._id, 'drawDate:', today)
    
    const countResult = await db.collection('draw_card_records')
      .where({
        userId: user._id,
        drawDate: today,
        isActive: true
      })
      .count()
    
    const usedToday = countResult.total
    console.log('[checkQuota] 今日已使用次数:', usedToday)
    
    // 5. 计算剩余配额
    const totalQuota = dailyDrawQuota
    const remainingQuota = totalQuota === -1 ? -1 : Math.max(0, totalQuota - usedToday)
    const canDraw = totalQuota === -1 || remainingQuota > 0
    
    console.log('[checkQuota] 配额计算结果:', {
      totalQuota,
      usedToday,
      remainingQuota,
      canDraw
    })
    
    // 6. 如果配额用完，返回错误
    if (!canDraw) {
      console.log('[checkQuota] 配额已用完')
      return {
        success: false,
        error: '今日抽卡次数已用完',
        code: 1003,
        data: {
          canDraw: false,
          userTypeCode: userType,
          remainingQuota: 0,
          totalQuota: totalQuota,
          usedToday: usedToday
        }
      }
    }
    
    // 7. 返回成功响应
    console.log('[checkQuota] 配额检查通过')
    return {
      success: true,
      data: {
        canDraw: true,
        userTypeCode: userType,
        remainingQuota: remainingQuota,
        totalQuota: totalQuota,
        usedToday: usedToday
      }
    }
  } catch (error) {
    console.error('[checkQuota] 检查配额失败:', error)
    throw new Error('检查配额失败: ' + error.message)
  }
}

/**
 * 记录抽卡历史
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

