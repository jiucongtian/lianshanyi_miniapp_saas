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
 * 获取当天的干支名称
 * 通过调用 localCalculateBazi_v1_2 云函数，输入日期及子时的时间先得到八字，然后取其中日柱的干支
 * @returns {Promise<Object>} 干支名称响应
 */
async function getTodayGanZhi() {
  try {
    console.log('[getTodayGanZhi] 开始获取当天干支名称')
    
    // 获取北京时间
    const beijingTime = getBeijingTime()
    console.log('[getTodayGanZhi] 北京时间:', beijingTime.toISOString())
    
    // 提取年月日
    const year = beijingTime.getFullYear()
    const month = beijingTime.getMonth() + 1 // getMonth() 返回 0-11
    const day = beijingTime.getDate()
    const hour = 23 // 子时开始时间
    const minute = 0
    
    console.log('[getTodayGanZhi] 调用八字计算，参数:', { year, month, day, hour, minute })
    
    // 调用 localCalculateBazi_v1_2 云函数
    const baziResult = await cloud.callFunction({
      name: 'localCalculateBazi_v1_2',
      data: {
        year,
        month,
        day,
        hour,
        minute,
        isLunar: false
      }
    })
    
    console.log('[getTodayGanZhi] 八字计算结果:', baziResult)
    
    // 检查调用是否成功
    if (!baziResult.result || !baziResult.result.success) {
      console.error('[getTodayGanZhi] 八字计算失败:', baziResult.result?.error)
      return error('获取干支名称失败: ' + (baziResult.result?.error || '八字计算失败'), -2)
    }
    
    // 提取日柱干支
    const baziData = baziResult.result.data?.baziData
    if (!baziData || !baziData.day) {
      console.error('[getTodayGanZhi] 八字数据格式错误:', baziData)
      return error('获取干支名称失败: 八字数据格式错误', -3)
    }
    
    const dayGan = baziData.day.gan || ''
    const dayZhi = baziData.day.zhi || ''
    const ganZhiName = dayGan + dayZhi
    
    console.log('[getTodayGanZhi] 提取的日柱干支:', { dayGan, dayZhi, ganZhiName })
    
    if (!dayGan || !dayZhi) {
      console.error('[getTodayGanZhi] 日柱干支数据不完整')
      return error('获取干支名称失败: 日柱干支数据不完整', -4)
    }
    
    // 返回干支名称
    return success({
      ganZhi: ganZhiName,
      gan: dayGan,
      zhi: dayZhi,
      date: formatDate(beijingTime)
    }, '获取成功')
  } catch (err) {
    console.error('[getTodayGanZhi] 获取当天干支名称失败:', err)
    return error('获取当天干支名称失败: ' + err.message, -1)
  }
}

/**
 * 获取今日卡牌
 * 通过获取当天的干支名称，然后使用对应的cardNumber来查询日报数据
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
    
    // 提取年月日，用于计算八字
    const year = beijingTime.getFullYear()
    const month = beijingTime.getMonth() + 1 // getMonth() 返回 0-11
    const day = beijingTime.getDate()
    const hour = 23 // 子时开始时间
    const minute = 0
    
    console.log('[getTodayCard] 调用八字计算，参数:', { year, month, day, hour, minute })
    
    // 调用 localCalculateBazi_v1_2 云函数获取当天的干支
    const baziResult = await cloud.callFunction({
      name: 'localCalculateBazi_v1_2',
      data: {
        year,
        month,
        day,
        hour,
        minute,
        isLunar: false
      }
    })
    
    console.log('[getTodayCard] 八字计算结果:', baziResult)
    
    // 检查调用是否成功
    if (!baziResult.result || !baziResult.result.success) {
      console.error('[getTodayCard] 八字计算失败:', baziResult.result?.error)
      return error('获取今日卡牌失败: ' + (baziResult.result?.error || '八字计算失败'), -2)
    }
    
    // 提取日柱干支索引（cardNumber）
    const baziData = baziResult.result.data?.baziData
    if (!baziData || !baziData.day) {
      console.error('[getTodayCard] 八字数据格式错误:', baziData)
      return error('获取今日卡牌失败: 八字数据格式错误', -3)
    }
    
    const cardNumber = baziData.day.ganzhiIndex
    const dayGan = baziData.day.gan || ''
    const dayZhi = baziData.day.zhi || ''
    const ganZhiName = dayGan + dayZhi
    
    console.log('[getTodayCard] 提取的日柱干支:', { ganZhiName, cardNumber })
    
    if (!cardNumber || cardNumber < 1 || cardNumber > 60) {
      console.error('[getTodayCard] 卡牌编号无效:', cardNumber)
      return error('获取今日卡牌失败: 卡牌编号无效', -4)
    }
    
    // 使用cardNumber查询对应的卡牌数据
    const result = await db.collection('daily_insights')
      .where({
        cardNumber: cardNumber,
        isActive: true
      })
      .get()
    
    console.log('[getTodayCard] 查询结果:', result)
    
    if (result.data.length === 0) {
      console.warn('[getTodayCard] 未找到cardNumber对应的卡牌数据:', cardNumber)
      return error(`未找到 ${ganZhiName}（编号${cardNumber}）的卡牌数据，请稍后再试`, -5)
    }
    
    const cardData = result.data[0]
    console.log('[getTodayCard] 找到卡牌数据:', cardData)
    
    // 返回卡牌信息、实际查询的日期和干支信息
    return success({
      card: cardData,
      date: dateStr,
      ganZhi: ganZhiName,
      cardNumber: cardNumber
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
      case 'getTodayGanZhi':
        return await getTodayGanZhi()
      default:
        return error('未知操作类型', -3)
    }
  } catch (error) {
    console.error('[dailyInsightManagement] 云函数执行失败:', error)
    return error(error.message || '操作失败', -1)
  }
}

