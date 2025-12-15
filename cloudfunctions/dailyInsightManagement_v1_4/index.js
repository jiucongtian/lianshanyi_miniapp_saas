// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV // 使用当前云环境
})

const db = cloud.database()

/**
 * 获取北京时间（UTC+8）
 * @returns {Date} 北京时间
 */
function getBeijingTime() {
  const now = new Date()
  // 获取UTC时间戳（毫秒）
  const utcTime = now.getTime()
  // 获取UTC偏移量（分钟）
  const utcOffset = now.getTimezoneOffset()
  // 计算北京时间（UTC+8，即UTC+480分钟）
  const beijingOffset = 8 * 60 // 8小时 = 480分钟
  const beijingTime = new Date(utcTime + (utcOffset + beijingOffset) * 60 * 1000)
  return beijingTime
}

/**
 * 格式化日期为 YYYY-MM-DD
 * @param {Date} date - 日期对象
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 创建成功响应
 * @param {any} data - 响应数据
 * @param {string} message - 响应消息
 * @returns {Object} 成功响应对象
 */
function success(data, message = '操作成功') {
  return {
    success: true,
    data: data,
    message: message,
    code: 0,
    timestamp: new Date().getTime()
  }
}

/**
 * 创建错误响应
 * @param {string} errorMessage - 错误消息
 * @param {number} code - 错误码
 * @returns {Object} 错误响应对象
 */
function error(errorMessage, code = -1) {
  return {
    success: false,
    error: errorMessage,
    code: code,
    timestamp: new Date().getTime()
  }
}

/**
 * 获取今日卡牌
 * 服务器会自动获取当前服务器时间，转换为北京时间，根据北京时间确定对应的日期
 * @returns {Promise<Object>} 卡牌信息响应
 */
async function getTodayCard() {
  try {
    console.log('[getTodayCard] 开始获取今日卡牌')
    
    // 获取北京时间
    const beijingTime = getBeijingTime()
    console.log('[getTodayCard] 北京时间:', beijingTime.toISOString())
    
    // 格式化日期为 YYYY-MM-DD
    const dateStr = formatDate(beijingTime)
    console.log('[getTodayCard] 查询日期:', dateStr)
    
    // 查询该日期对应的卡牌数据
    const result = await db.collection('daily_insights')
      .where({
        date: dateStr,
        isActive: true
      })
      .get()
    
    console.log('[getTodayCard] 查询结果:', result)
    
    if (result.data.length === 0) {
      console.warn('[getTodayCard] 未找到日期对应的卡牌数据:', dateStr)
      return error(`未找到 ${dateStr} 的卡牌数据，请稍后再试`, -2)
    }
    
    const cardData = result.data[0]
    console.log('[getTodayCard] 找到卡牌数据:', cardData)
    
    // 返回卡牌信息和实际查询的日期
    return success({
      card: cardData,
      date: dateStr
    }, '获取成功')
  } catch (err) {
    console.error('[getTodayCard] 获取今日卡牌失败:', err)
    return error('获取今日卡牌失败: ' + err.message, -1)
  }
}

// 云函数入口函数
exports.main = async (event, context) => {
  const { action, data } = event
  
  console.log('[dailyInsightManagement] 云函数调用:', { action, data })
  
  try {
    switch (action) {
      case 'getTodayCard':
        return await getTodayCard()
      default:
        return error('未知操作类型', -3)
    }
  } catch (error) {
    console.error('[dailyInsightManagement] 云函数执行失败:', error)
    return error(error.message || '操作失败', -1)
  }
}

