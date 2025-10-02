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
      case 'getCardDescription':
        return await getCardDescription(wxContext, data)
      case 'getCardDescriptionsByNumbers':
        return await getCardDescriptionsByNumbers(wxContext, data)
      case 'getCardDescriptionsByCategory':
        return await getCardDescriptionsByCategory(wxContext, data)
      case 'searchCardDescriptions':
        return await searchCardDescriptions(wxContext, data)
      case 'getAllCardDescriptions':
        return await getAllCardDescriptions(wxContext, data)
      default:
        return {
          success: false,
          error: '未知操作类型'
        }
    }
  } catch (error) {
    console.error('卡牌描述云函数执行失败:', error)
    return {
      success: false,
      error: error.message || '操作失败'
    }
  }
}

/**
 * 根据卡牌序号获取单张卡牌描述
 */
async function getCardDescription(wxContext, queryData) {
  const { cardNumber } = queryData
  
  if (!cardNumber) {
    return {
      success: false,
      error: '缺少卡牌序号'
    }
  }
  
  // 验证卡牌序号范围
  if (cardNumber < 1 || cardNumber > 60) {
    return {
      success: false,
      error: '卡牌序号必须在1-60范围内'
    }
  }
  
  try {
    const result = await db.collection('cardDescriptions')
      .where({
        cardNumber: cardNumber
      })
      .get()
    
    if (result.data.length === 0) {
      return {
        success: false,
        error: '卡牌描述不存在'
      }
    }
    
    return {
      success: true,
      data: result.data[0]
    }
  } catch (error) {
    console.error('获取卡牌描述失败:', error)
    throw new Error('获取卡牌描述失败')
  }
}

/**
 * 根据卡牌序号数组批量获取卡牌描述
 */
async function getCardDescriptionsByNumbers(wxContext, queryData) {
  const { cardNumbers } = queryData
  
  if (!cardNumbers || !Array.isArray(cardNumbers) || cardNumbers.length === 0) {
    return {
      success: false,
      error: '缺少卡牌序号数组'
    }
  }
  
  // 验证卡牌序号范围
  const invalidNumbers = cardNumbers.filter(num => num < 1 || num > 60)
  if (invalidNumbers.length > 0) {
    return {
      success: false,
      error: `卡牌序号必须在1-60范围内，无效序号：${invalidNumbers.join(', ')}`
    }
  }
  
  try {
    const result = await db.collection('cardDescriptions')
      .where({
        cardNumber: db.command.in(cardNumbers)
      })
      .orderBy('cardNumber', 'asc')
      .get()
    
    return {
      success: true,
      data: result.data
    }
  } catch (error) {
    console.error('批量获取卡牌描述失败:', error)
    throw new Error('批量获取卡牌描述失败')
  }
}

/**
 * 根据分类获取卡牌描述
 */
async function getCardDescriptionsByCategory(wxContext, queryData) {
  const { category, page = 1, limit = 20 } = queryData
  
  if (!category) {
    return {
      success: false,
      error: '缺少分类参数'
    }
  }
  
  // 验证分类值
  const validCategories = ['年柱', '月柱', '日柱', '时柱']
  if (!validCategories.includes(category)) {
    return {
      success: false,
      error: `无效的分类，支持的分类：${validCategories.join(', ')}`
    }
  }
  
  try {
    const skip = (page - 1) * limit
    
    const result = await db.collection('cardDescriptions')
      .where({
        category: category
      })
      .orderBy('cardNumber', 'asc')
      .skip(skip)
      .limit(limit)
      .get()
    
    // 获取总数
    const countResult = await db.collection('cardDescriptions')
      .where({
        category: category
      })
      .count()
    
    return {
      success: true,
      data: {
        descriptions: result.data,
        total: countResult.total,
        page,
        limit,
        hasMore: skip + result.data.length < countResult.total
      }
    }
  } catch (error) {
    console.error('按分类获取卡牌描述失败:', error)
    throw new Error('按分类获取卡牌描述失败')
  }
}

/**
 * 根据关键词搜索卡牌描述
 */
async function searchCardDescriptions(wxContext, queryData) {
  const { keyword, page = 1, limit = 20 } = queryData
  
  if (!keyword || keyword.trim() === '') {
    return {
      success: false,
      error: '缺少搜索关键词'
    }
  }
  
  try {
    const skip = (page - 1) * limit
    
    // 使用正则表达式进行模糊搜索
    const result = await db.collection('cardDescriptions')
      .where({
        $or: [
          { cardName: db.command.regex(new RegExp(keyword, 'i')) },
          { pinyin: db.command.regex(new RegExp(keyword, 'i')) },
          { description: db.command.regex(new RegExp(keyword, 'i')) },
          { keywords: db.command.in([keyword]) }
        ]
      })
      .orderBy('cardNumber', 'asc')
      .skip(skip)
      .limit(limit)
      .get()
    
    // 获取总数
    const countResult = await db.collection('cardDescriptions')
      .where({
        $or: [
          { cardName: db.command.regex(new RegExp(keyword, 'i')) },
          { pinyin: db.command.regex(new RegExp(keyword, 'i')) },
          { description: db.command.regex(new RegExp(keyword, 'i')) },
          { keywords: db.command.in([keyword]) }
        ]
      })
      .count()
    
    return {
      success: true,
      data: {
        descriptions: result.data,
        total: countResult.total,
        page,
        limit,
        hasMore: skip + result.data.length < countResult.total,
        keyword
      }
    }
  } catch (error) {
    console.error('搜索卡牌描述失败:', error)
    throw new Error('搜索卡牌描述失败')
  }
}

/**
 * 获取所有卡牌描述（分页）
 */
async function getAllCardDescriptions(wxContext, queryData) {
  const { page = 1, limit = 60 } = queryData
  
  try {
    const skip = (page - 1) * limit
    
    const result = await db.collection('cardDescriptions')
      .orderBy('cardNumber', 'asc')
      .skip(skip)
      .limit(limit)
      .get()
    
    // 获取总数
    const countResult = await db.collection('cardDescriptions')
      .count()
    
    return {
      success: true,
      data: {
        descriptions: result.data,
        total: countResult.total,
        page,
        limit,
        hasMore: skip + result.data.length < countResult.total
      }
    }
  } catch (error) {
    console.error('获取所有卡牌描述失败:', error)
    throw new Error('获取所有卡牌描述失败')
  }
}
