// 云函数入口文件
const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV // 使用当前云环境
})

const db = cloud.database()

// 60甲子卡牌名称到编号的映射（用于根据卡牌名称获取编号）
const CARD_NAME_TO_NUMBER = {
  "甲子": 1, "乙丑": 2, "丙寅": 3, "丁卯": 4, "戊辰": 5, "己巳": 6,
  "庚午": 7, "辛未": 8, "壬申": 9, "癸酉": 10, "甲戌": 11, "乙亥": 12,
  "丙子": 13, "丁丑": 14, "戊寅": 15, "己卯": 16, "庚辰": 17, "辛巳": 18,
  "壬午": 19, "癸未": 20, "甲申": 21, "乙酉": 22, "丙戌": 23, "丁亥": 24,
  "戊子": 25, "己丑": 26, "庚寅": 27, "辛卯": 28, "壬辰": 29, "癸巳": 30,
  "甲午": 31, "乙未": 32, "丙申": 33, "丁酉": 34, "戊戌": 35, "己亥": 36,
  "庚子": 37, "辛丑": 38, "壬寅": 39, "癸卯": 40, "甲辰": 41, "乙巳": 42,
  "丙午": 43, "丁未": 44, "戊申": 45, "己酉": 46, "庚戌": 47, "辛亥": 48,
  "壬子": 49, "癸丑": 50, "甲寅": 51, "乙卯": 52, "丙辰": 53, "丁巳": 54,
  "戊午": 55, "己未": 56, "庚申": 57, "辛酉": 58, "壬戌": 59, "癸亥": 60
}

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
    
    // 如果是抽卡工作流且调用成功，自动记录到数据库并获取剩余抽卡次数
    let drawCardQuotaInfo = null;
    if (finalWorkflowType === 'DRAW_CARD' && result.success) {
      try {
        await recordDrawHistory(wxContext, parameters, result.data);
        console.log('[cozeFunctions_v1_3] 抽卡历史记录成功');
        
        // 记录成功后，获取更新后的抽卡配额信息
        try {
          drawCardQuotaInfo = await getDrawCardQuotaInfo(wxContext);
          console.log('[cozeFunctions_v1_3] 获取抽卡配额信息成功:', drawCardQuotaInfo);
        } catch (quotaError) {
          // 获取配额信息失败不影响主流程，只记录日志
          console.error('[cozeFunctions_v1_3] 获取抽卡配额信息失败（不影响使用）:', quotaError);
        }
      } catch (recordError) {
        // 记录失败不影响主流程，只记录日志
        console.error('[cozeFunctions_v1_3] 抽卡历史记录失败（不影响使用）:', recordError);
      }
    }
    
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
    
    // 如果是抽卡工作流，添加抽卡配额信息
    if (drawCardQuotaInfo) {
      response.drawCardQuota = drawCardQuotaInfo;
    }
    
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

/**
 * 记录抽卡历史
 * 从 drawCardManagement 云函数复制过来的逻辑
 * @param {Object} wxContext - 微信上下文
 * @param {Object} parameters - 工作流参数（包含 bazi_name 和 question）
 * @param {Object} cozeResult - Coze API 返回的结果
 */
async function recordDrawHistory(wxContext, parameters, cozeResult) {
  const { OPENID } = wxContext
  const { bazi_name, question } = parameters
  
  console.log('[recordDrawHistory] 开始记录抽卡历史, OPENID:', OPENID, 'bazi_name:', bazi_name)
  
  try {
    // 1. 验证必需参数
    if (!bazi_name) {
      console.error('[recordDrawHistory] 缺少必需参数: bazi_name')
      return // 静默失败，不影响主流程
    }
    
    // 2. 从卡牌名称获取卡牌编号
    const cardName = bazi_name
    const cardNumber = CARD_NAME_TO_NUMBER[cardName]
    
    if (!cardNumber) {
      console.error('[recordDrawHistory] 无效的卡牌名称:', cardName)
      return // 静默失败
    }
    
    // 3. 从 Coze 返回结果中提取 AI 解读内容
    let aiAnswer = ''
    if (cozeResult && cozeResult.data) {
      try {
        // data.data 是一个 JSON 字符串，需要先解析
        const parsedData = typeof cozeResult.data === 'string' 
          ? JSON.parse(cozeResult.data) 
          : cozeResult.data
        
        // 从解析后的对象中提取 data 字段（这是实际的解读内容）
        if (parsedData && parsedData.data) {
          aiAnswer = parsedData.data
          
          // 处理转义字符
          aiAnswer = aiAnswer
            .replace(/\\n/g, '\n')            // 换行符
            .replace(/\\"/g, '"')             // 双引号
            .replace(/\\'/g, "'")             // 单引号
            .replace(/\\t/g, '\t')            // 制表符
            .replace(/\\r/g, '\r')             // 回车符
            .replace(/\\\\/g, '\\')            // 最后处理双反斜杠
        } else {
          // 如果解析后没有 data 字段，尝试其他字段
          aiAnswer = parsedData.output || parsedData.result || parsedData.text || JSON.stringify(parsedData)
        }
      } catch (parseError) {
        console.error('[recordDrawHistory] 解析AI解读结果失败:', parseError)
        // 如果解析失败，尝试直接使用原始数据
        aiAnswer = typeof cozeResult.data === 'string' 
          ? cozeResult.data 
          : JSON.stringify(cozeResult.data)
      }
    }
    
    if (!aiAnswer) {
      console.warn('[recordDrawHistory] AI解读结果为空，跳过记录')
      return // 静默失败
    }
    
    // 4. 获取用户信息
    const userResult = await db.collection('users')
      .where({ openid: OPENID, isActive: true })
      .get()
    
    if (userResult.data.length === 0) {
      console.error('[recordDrawHistory] 用户不存在')
      return // 静默失败
    }
    
    const user = userResult.data[0]
    const userType = user.userType || user.userTypeCode || 'guest'
    console.log('[recordDrawHistory] 用户信息:', { userId: user._id, userType })
    
    // 5. 构建记录数据
    const now = new Date()
    const drawDate = now.toISOString().split('T')[0] // YYYY-MM-DD格式
    
    const record = {
      userId: user._id,
      openid: OPENID,
      userTypeCode: userType, // 快照，记录抽卡时的用户类型
      question: question || '',
      cardNumber: cardNumber,
      cardName: cardName,
      aiAnswer: aiAnswer,
      drawTime: now, // 使用当前时间作为抽卡时间
      interpretTime: now,
      drawDate: drawDate,
      cloudFunctionVersion: 'cozeFunctions_v1_3', // 记录云函数版本号
      isActive: true
    }
    
    console.log('[recordDrawHistory] 准备插入记录:', {
      userId: record.userId,
      cardNumber: record.cardNumber,
      cardName: record.cardName,
      drawDate: record.drawDate
    })
    
    // 6. 插入记录
    const addResult = await db.collection('draw_card_records').add({
      data: record
    })
    
    console.log('[recordDrawHistory] 记录插入成功, _id:', addResult._id)
  } catch (error) {
    console.error('[recordDrawHistory] 记录抽卡历史失败:', error)
    // 静默失败，不影响主流程
  }
}

/**
 * 获取抽卡配额信息
 * 从 userManagement 云函数复制过来的逻辑
 * @param {Object} wxContext - 微信上下文
 * @returns {Object} 抽卡配额信息
 */
async function getDrawCardQuotaInfo(wxContext) {
  const { OPENID } = wxContext
  
  try {
    // 1. 获取用户信息
    const userResult = await db.collection('users')
      .where({ openid: OPENID, isActive: true })
      .get()
    
    if (userResult.data.length === 0) {
      console.error('[getDrawCardQuotaInfo] 用户不存在')
      return null
    }
    
    const user = userResult.data[0]
    const userType = user.userType || user.userTypeCode || 'guest'
    
    // 2. 获取用户类型配置（包含 dailyDrawQuota）
    const typeConfig = await getUserTypeConfig(userType)
    const dailyDrawQuota = typeConfig.dailyDrawQuota !== undefined ? typeConfig.dailyDrawQuota : 0
    
    // 如果配额为0，说明不可用
    if (dailyDrawQuota === 0) {
      return {
        canDraw: false,
        drawCardRemainingQuota: 0,
        drawCardTotalQuota: 0,
        drawCardUsedToday: 0
      }
    }
    
    // 3. 查询今日已使用次数
    const now = new Date()
    const today = now.toISOString().split('T')[0] // YYYY-MM-DD格式
    
    const countResult = await db.collection('draw_card_records')
      .where({
        userId: user._id,
        drawDate: today,
        isActive: true
      })
      .count()
    
    const usedToday = countResult.total
    const totalQuota = dailyDrawQuota
    const remainingQuota = totalQuota === -1 ? -1 : Math.max(0, totalQuota - usedToday)
    const canDraw = totalQuota === -1 || remainingQuota > 0
    
    return {
      canDraw: canDraw,
      drawCardRemainingQuota: remainingQuota,
      drawCardTotalQuota: totalQuota,
      drawCardUsedToday: usedToday
    }
  } catch (error) {
    console.error('[getDrawCardQuotaInfo] 获取抽卡配额信息失败:', error)
    return null
  }
}

/**
 * 获取用户类型配置
 * 从 userManagement 云函数复制过来的逻辑
 * @param {string} typeCode - 用户类型代码
 * @returns {Object} 用户类型配置
 */
async function getUserTypeConfig(typeCode) {
  try {
    // 尝试从static_user_types表获取配置
    const configResult = await db.collection('static_user_types')
      .where({ typeCode: typeCode })
      .get()
    
    if (configResult.data.length > 0) {
      const config = configResult.data[0]
      return {
        typeCode: config.typeCode,
        typeName: config.typeName,
        displayName: config.displayName,
        description: config.description,
        profileQuota: config.profileQuota,
        permissions: config.permissions,
        dailyDrawQuota: config.dailyDrawQuota !== undefined ? config.dailyDrawQuota : 0
      }
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
      dailyDrawQuota: 0
    },
    'normal': {
      typeCode: 'normal',
      typeName: '探索者',
      displayName: '探索者',
      description: '已注册的普通用户，享受基础功能',
      profileQuota: 50,
      permissions: ['view', 'create'],
      dailyDrawQuota: 3
    },
    'premium': {
      typeCode: 'premium',
      typeName: '高级用户',
      displayName: '高级用户',
      description: '付费高级用户，享受全部功能',
      profileQuota: -1,
      permissions: ['all'],
      dailyDrawQuota: -1
    }
  }
  
  return defaultConfigs[typeCode] || defaultConfigs['guest']
}

