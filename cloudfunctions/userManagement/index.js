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
      case 'updateUserLevel':
        return await updateUserLevel(wxContext, data)
      case 'getUsersByLevel':
        return await getUsersByLevel(wxContext, data)
      case 'getUserLevelStats':
        return await getUserLevelStats(wxContext)
      case 'upgradeUserType':
        return await upgradeUserType(wxContext, data)
      case 'checkUserQuota':
        return await checkUserQuota(wxContext)
      case 'updateUsedProfiles':
        return await updateUsedProfiles(wxContext, data)
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
  
  console.log('云函数 createUser 开始执行')
  console.log('OPENID:', OPENID)
  console.log('UNIONID:', UNIONID)
  console.log('userData:', userData)
  
  try {
    // 检查用户是否已存在
    console.log('正在查询用户是否存在...')
    const existingUser = await db.collection('users').where({
      openid: OPENID
    }).get()
    
    console.log('查询结果:', existingUser)
    
    if (existingUser.data.length > 0) {
      // 用户已存在，更新最后登录时间
      console.log('用户已存在，正在更新用户信息...')
      const updateResult = await db.collection('users').doc(existingUser.data[0]._id).update({
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
      
      console.log('用户信息更新结果:', updateResult)
      
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
      console.log('用户不存在，正在创建新用户...')
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
        userType: 'guest', // 新用户默认为临时用户
        userLevel: 'normal',
        registrationTime: null,
        upgradeTime: null,
        profileQuota: 1, // 临时用户默认配额为1
        usedProfiles: 0,
        permissions: ['view', 'create_limited'], // 临时用户权限
        isActive: true
      }
      
      console.log('准备插入的用户文档:', userDoc)
      const result = await db.collection('users').add({
        data: userDoc
      })
      
      console.log('用户创建结果:', result)
      
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

/**
 * 更新用户级别
 * 注意：此功能需要管理员权限，实际使用时应添加权限验证
 */
async function updateUserLevel(wxContext, data) {
  const { targetOpenid, newLevel, operatorOpenid } = data
  const now = new Date()
  
  // 验证级别有效性
  const validLevels = ['normal', 'primary', 'internal']
  if (!validLevels.includes(newLevel)) {
    return {
      success: false,
      error: '无效的用户级别，支持的级别：normal, primary, internal'
    }
  }
  
  try {
    // TODO: 这里应该添加操作员权限验证
    // 例如：验证operatorOpenid是否有管理员权限
    
    const result = await db.collection('users').where({
      openid: targetOpenid,
      isActive: true
    }).update({
      data: {
        userLevel: newLevel,
        updateTime: now
      }
    })
    
    if (result.stats.updated === 0) {
      return {
        success: false,
        error: '目标用户不存在或更新失败'
      }
    }
    
    return {
      success: true,
      message: `用户级别已更新为 ${newLevel}`,
      data: {
        targetOpenid,
        newLevel,
        updateTime: now
      }
    }
  } catch (error) {
    console.error('更新用户级别失败:', error)
    throw new Error('更新用户级别失败')
  }
}

/**
 * 按级别查询用户列表
 */
async function getUsersByLevel(wxContext, data) {
  const { level, limit = 20, skip = 0 } = data
  
  // 验证级别有效性
  const validLevels = ['normal', 'primary', 'internal']
  if (!validLevels.includes(level)) {
    return {
      success: false,
      error: '无效的用户级别，支持的级别：normal, primary, internal'
    }
  }
  
  try {
    const result = await db.collection('users')
      .where({
        userLevel: level,
        isActive: true
      })
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(limit)
      .get()
    
    return {
      success: true,
      data: {
        users: result.data,
        count: result.data.length,
        level
      }
    }
  } catch (error) {
    console.error('查询用户列表失败:', error)
    throw new Error('查询用户列表失败')
  }
}

/**
 * 获取用户级别统计
 */
async function getUserLevelStats(wxContext) {
  try {
    // 获取各级别用户数量
    const normalCount = await db.collection('users').where({
      userLevel: 'normal',
      isActive: true
    }).count()
    
    const primaryCount = await db.collection('users').where({
      userLevel: 'primary',
      isActive: true
    }).count()
    
    const internalCount = await db.collection('users').where({
      userLevel: 'internal',
      isActive: true
    }).count()
    
    const totalCount = await db.collection('users').where({
      isActive: true
    }).count()
    
    return {
      success: true,
      data: {
        stats: {
          normal: normalCount.total,
          primary: primaryCount.total,
          internal: internalCount.total,
          total: totalCount.total
        },
        timestamp: new Date()
      }
    }
  } catch (error) {
    console.error('获取用户级别统计失败:', error)
    throw new Error('获取用户级别统计失败')
  }
}

/**
 * 升级用户类型
 */
async function upgradeUserType(wxContext, data) {
  const { OPENID } = wxContext
  const { targetUserType, registrationData } = data
  const now = new Date()
  
  // 验证用户类型有效性
  const validUserTypes = ['guest', 'normal', 'premium']
  if (!validUserTypes.includes(targetUserType)) {
    return {
      success: false,
      error: '无效的用户类型，支持的类型：guest, normal, premium'
    }
  }
  
  try {
    // 获取当前用户信息
    const userResult = await db.collection('users').where({
      openid: OPENID,
      isActive: true
    }).get()
    
    if (userResult.data.length === 0) {
      return {
        success: false,
        error: '用户不存在'
      }
    }
    
    const currentUser = userResult.data[0]
    const currentUserType = currentUser.userType || 'guest'
    
    // 验证升级路径
    if (currentUserType === 'premium' && targetUserType !== 'premium') {
      return {
        success: false,
        error: '高级用户不能降级'
      }
    }
    
    // 准备更新数据
    let updateData = {
      userType: targetUserType,
      updateTime: now
    }
    
    // 设置权限和配额
    switch (targetUserType) {
      case 'guest':
        updateData.profileQuota = 1
        updateData.permissions = ['view', 'create_limited']
        break
      case 'normal':
        updateData.profileQuota = 20
        updateData.permissions = ['view', 'create', 'export', 'share']
        if (currentUserType === 'guest') {
          updateData.registrationTime = now
          // 如果有注册数据，更新用户信息
          if (registrationData) {
            updateData = { ...updateData, ...registrationData }
          }
        }
        break
      case 'premium':
        updateData.profileQuota = -1 // -1表示无限制
        updateData.permissions = ['all']
        if (currentUserType !== 'premium') {
          updateData.upgradeTime = now
        }
        break
    }
    
    // 执行更新
    const result = await db.collection('users').doc(currentUser._id).update({
      data: updateData
    })
    
    return {
      success: true,
      message: `用户类型已升级为 ${targetUserType}`,
      data: {
        oldUserType: currentUserType,
        newUserType: targetUserType,
        updateTime: now,
        profileQuota: updateData.profileQuota,
        permissions: updateData.permissions
      }
    }
  } catch (error) {
    console.error('升级用户类型失败:', error)
    throw new Error('升级用户类型失败')
  }
}

/**
 * 检查用户档案配额
 */
async function checkUserQuota(wxContext) {
  const { OPENID } = wxContext
  
  try {
    // 获取用户信息
    const userResult = await db.collection('users').where({
      openid: OPENID,
      isActive: true
    }).get()
    
    if (userResult.data.length === 0) {
      return {
        success: false,
        error: '用户不存在'
      }
    }
    
    const user = userResult.data[0]
    const userType = user.userType || 'guest'
    const profileQuota = user.profileQuota || 1
    const usedProfiles = user.usedProfiles || 0
    
    // 获取实际档案数量
    const profileCount = await db.collection('profiles').where({
      openid: OPENID,
      isActive: true
    }).count()
    
    // 更新用户的已使用档案数
    if (profileCount.total !== usedProfiles) {
      await db.collection('users').doc(user._id).update({
        data: {
          usedProfiles: profileCount.total,
          updateTime: new Date()
        }
      })
    }
    
    return {
      success: true,
      data: {
        userType,
        profileQuota,
        usedProfiles: profileCount.total,
        canCreateMore: profileQuota === -1 || profileCount.total < profileQuota,
        remainingQuota: profileQuota === -1 ? -1 : Math.max(0, profileQuota - profileCount.total)
      }
    }
  } catch (error) {
    console.error('检查用户配额失败:', error)
    throw new Error('检查用户配额失败')
  }
}

/**
 * 更新用户已使用档案数量
 */
async function updateUsedProfiles(wxContext, data) {
  const { OPENID } = wxContext
  const { increment = 0 } = data // increment可以是正数（增加）或负数（减少）
  
  try {
    // 获取用户信息
    const userResult = await db.collection('users').where({
      openid: OPENID,
      isActive: true
    }).get()
    
    if (userResult.data.length === 0) {
      return {
        success: false,
        error: '用户不存在'
      }
    }
    
    const user = userResult.data[0]
    const currentUsedProfiles = user.usedProfiles || 0
    const newUsedProfiles = Math.max(0, currentUsedProfiles + increment)
    
    // 更新已使用档案数
    await db.collection('users').doc(user._id).update({
      data: {
        usedProfiles: newUsedProfiles,
        updateTime: new Date()
      }
    })
    
    return {
      success: true,
      data: {
        oldUsedProfiles: currentUsedProfiles,
        newUsedProfiles: newUsedProfiles,
        increment
      }
    }
  } catch (error) {
    console.error('更新已使用档案数失败:', error)
    throw new Error('更新已使用档案数失败')
  }
}
