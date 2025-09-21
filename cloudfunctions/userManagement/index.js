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
      case 'createUser':
        return await createUser(wxContext, data)
      case 'getUserInfo':
        return await getUserInfo(wxContext)
      case 'updateUserInfo':
        return await updateUserInfo(wxContext, data)
      default:
        return {
          success: false,
          error: '未知操作类型'
        }
    }
  } catch (error) {
    console.error('用户管理云函数执行失败:', error)
    return {
      success: false,
      error: error.message || '操作失败'
    }
  }
}

/**
 * 创建或更新用户信息
 */
async function createUser(wxContext, userData = {}) {
  const { OPENID, UNIONID } = wxContext
  const now = new Date()
  
  try {
    // 检查用户是否已存在
    const existingUser = await db.collection('users').where({
      openid: OPENID
    }).get()
    
    if (existingUser.data.length > 0) {
      // 用户已存在，更新最后登录时间
      await db.collection('users').doc(existingUser.data[0]._id).update({
        data: {
          lastLoginTime: now,
          updateTime: now,
          ...(UNIONID && { unionid: UNIONID }), // 如果有unionid则更新
          ...(userData.nickName && { nickName: userData.nickName }),
          ...(userData.avatarUrl && { avatarUrl: userData.avatarUrl }),
          ...(userData.gender !== undefined && { gender: userData.gender }),
          ...(userData.country && { country: userData.country }),
          ...(userData.province && { province: userData.province }),
          ...(userData.city && { city: userData.city }),
          ...(userData.language && { language: userData.language })
        }
      })
      
      return {
        success: true,
        message: '用户信息已更新',
        data: {
          userId: existingUser.data[0]._id,
          isNewUser: false
        }
      }
    } else {
      // 创建新用户
      const userDoc = {
        openid: OPENID,
        ...(UNIONID && { unionid: UNIONID }),
        nickName: userData.nickName || '',
        avatarUrl: userData.avatarUrl || '',
        gender: userData.gender || 0,
        country: userData.country || '',
        province: userData.province || '',
        city: userData.city || '',
        language: userData.language || 'zh_CN',
        createTime: now,
        updateTime: now,
        lastLoginTime: now,
        isActive: true
      }
      
      const result = await db.collection('users').add({
        data: userDoc
      })
      
      return {
        success: true,
        message: '用户创建成功',
        data: {
          userId: result._id,
          isNewUser: true
        }
      }
    }
  } catch (error) {
    console.error('创建/更新用户失败:', error)
    throw new Error('用户操作失败')
  }
}

/**
 * 获取用户信息
 */
async function getUserInfo(wxContext) {
  const { OPENID } = wxContext
  
  try {
    const result = await db.collection('users').where({
      openid: OPENID,
      isActive: true
    }).get()
    
    if (result.data.length === 0) {
      return {
        success: false,
        error: '用户不存在'
      }
    }
    
    return {
      success: true,
      data: result.data[0]
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
    throw new Error('获取用户信息失败')
  }
}

/**
 * 更新用户信息
 */
async function updateUserInfo(wxContext, userData) {
  const { OPENID } = wxContext
  const now = new Date()
  
  try {
    const updateData = {
      updateTime: now,
      ...(userData.nickName !== undefined && { nickName: userData.nickName }),
      ...(userData.avatarUrl !== undefined && { avatarUrl: userData.avatarUrl }),
      ...(userData.gender !== undefined && { gender: userData.gender }),
      ...(userData.country !== undefined && { country: userData.country }),
      ...(userData.province !== undefined && { province: userData.province }),
      ...(userData.city !== undefined && { city: userData.city }),
      ...(userData.language !== undefined && { language: userData.language })
    }
    
    const result = await db.collection('users').where({
      openid: OPENID,
      isActive: true
    }).update({
      data: updateData
    })
    
    if (result.stats.updated === 0) {
      return {
        success: false,
        error: '用户不存在或更新失败'
      }
    }
    
    return {
      success: true,
      message: '用户信息更新成功'
    }
  } catch (error) {
    console.error('更新用户信息失败:', error)
    throw new Error('更新用户信息失败')
  }
}
