// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV // 使用当前云环境
})

const db = cloud.database()

/**
 * 获取用户类型配置
 * 优先从static_user_types表获取，如果不存在则使用默认配置
 */
async function getUserTypeConfig(typeCode) {
  console.log('获取用户类型配置:', typeCode)
  try {
    // 尝试从static_user_types表获取配置
    const configResult = await db.collection('static_user_types').where({
      typeCode: typeCode
    }).get()
    
    console.log('static_user_types查询结果:', configResult)
    
    if (configResult.data.length > 0) {
      const config = configResult.data[0]
      console.log('找到配置数据:', config)
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
      console.log('static_user_types表中未找到配置，使用默认配置')
    }
  } catch (error) {
    console.warn('从static_user_types表获取配置失败，使用默认配置:', error.message)
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

/**
 * 获取用户权限和配额信息
 * 优先使用static_user_types表的配置，不再使用users表中的旧字段
 */
async function getUserPermissionsAndQuota(user) {
  const userType = user.userType || user.userTypeCode || 'guest'
  console.log('获取用户权限和配额，用户类型:', userType)
  
  // 优先使用static_user_types表的配置
  const typeConfig = await getUserTypeConfig(userType)
  console.log('获取到的类型配置:', typeConfig)
  
  // 直接使用配置表的权限和配额，不再使用users表中的旧字段
  return {
    userType,
    typeName: typeConfig.typeName,
    displayName: typeConfig.displayName,
    description: typeConfig.description,
    profileQuota: typeConfig.profileQuota,
    permissions: typeConfig.permissions,
    dailyDrawQuota: typeConfig.dailyDrawQuota !== undefined ? typeConfig.dailyDrawQuota : 0 // 新增字段
  }
}

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
      case 'upgradeUserType':
        return await upgradeUserType(wxContext, data)
      case 'checkUserQuota':
        return await checkUserQuota(wxContext)
      case 'updateUsedProfiles':
        return await updateUsedProfiles(wxContext, data)
      case 'deleteUsers':
        return await deleteUsers(wxContext, data)
      case 'deleteInactiveUsers':
        return await deleteInactiveUsers(wxContext, data)
      case 'updateGuestUserQuota':
        return await updateGuestUserQuota(wxContext)
      case 'getUserTypeConfig':
        return await getUserTypeConfigAction(data)
      case 'getUserPermissionsAndQuota':
        return await getUserPermissionsAndQuotaAction(wxContext)
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
 * 使用upsert模式防止并发创建重复用户
 */
async function createUser(wxContext, userData = {}) {
  const { OPENID, UNIONID } = wxContext
  const now = new Date()
  
  console.log('云函数 createUser 开始执行')
  console.log('OPENID:', OPENID)
  console.log('UNIONID:', UNIONID)
  console.log('userData:', userData)
  
  try {
    // 先尝试更新现有用户，如果不存在则创建新用户
    // 这种方式可以避免并发创建重复用户的问题
    console.log('尝试更新现有用户信息...')
    
    // 构建更新数据，只更新有值的字段，避免覆盖已有数据
    const updateData = {
      lastLoginTime: now,
      updateTime: now,
      ...(UNIONID && { unionid: UNIONID }) // 如果有unionid则更新
    }
    
    // 只有当传入的用户数据不为空且不是默认值时才更新对应字段
    if (userData.nickName && userData.nickName.trim() !== '' && userData.nickName !== '微信用户') {
      updateData.nickName = userData.nickName
    }
    if (userData.avatarUrl && userData.avatarUrl.trim() !== '') {
      updateData.avatarUrl = userData.avatarUrl
    }
    if (userData.gender !== undefined && userData.gender !== 0) {
      updateData.gender = userData.gender
    }
    if (userData.phoneNumber !== undefined) {
      updateData.phoneNumber = userData.phoneNumber
    }
    
    const updateResult = await db.collection('users').where({
      openid: OPENID,
      isActive: true
    }).update({
      data: updateData
    })
    
    console.log('更新结果:', updateResult)
    
    if (updateResult.stats.updated > 0) {
      // 用户已存在并更新成功，获取用户信息
      console.log('用户已存在，更新成功')
      const userResult = await db.collection('users').where({
        openid: OPENID,
        isActive: true
      }).get()
      
      return {
        success: true,
        message: '用户信息已更新',
        data: {
          userId: userResult.data[0]._id,
          isNewUser: false
        }
      }
    } else {
      // 用户不存在，创建新用户
      console.log('用户不存在，正在创建新用户...')
      
      // 再次检查是否存在（防止并发创建）
      const existingUser = await db.collection('users').where({
        openid: OPENID
      }).get()
      
      if (existingUser.data.length > 0) {
        // 如果在创建前发现已存在用户（可能是并发创建的），直接返回现有用户
        console.log('发现并发创建的用户，返回现有用户信息')
        const existingUserData = existingUser.data[0]
        
        // 更新最后登录时间
        await db.collection('users').doc(existingUserData._id).update({
          data: {
            lastLoginTime: now,
            updateTime: now
          }
        })
        
        return {
          success: true,
          message: '用户信息已更新',
          data: {
            userId: existingUserData._id,
            isNewUser: false
          }
        }
      }
      
      const userDoc = {
        openid: OPENID,
        ...(UNIONID && { unionid: UNIONID }),
        nickName: userData.nickName || '',
        avatarUrl: userData.avatarUrl || '',
        gender: userData.gender || 0,
        phoneNumber: userData.phoneNumber || '',
        createTime: now,
        updateTime: now,
        lastLoginTime: now,
        userType: 'guest', // 新用户默认为临时用户
        registrationTime: null,
        upgradeTime: null,
        usedProfiles: 0,
        isActive: true,
        adminRole: 'none' // 新用户默认为普通用户（非管理员）
        // 不再存储 profileQuota 和 permissions，统一从 static_user_types 表获取
      }
      
      console.log('准备插入的用户文档:', userDoc)
      
      try {
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
      } catch (createError) {
        // 如果创建失败（可能是因为并发创建导致的重复），再次查询现有用户
        console.log('用户创建失败，可能是并发创建，再次查询现有用户:', createError)
        
        const retryUser = await db.collection('users').where({
          openid: OPENID
        }).get()
        
        if (retryUser.data.length > 0) {
          console.log('找到并发创建的用户，返回现有用户信息')
          return {
            success: true,
            message: '用户信息已更新',
            data: {
              userId: retryUser.data[0]._id,
              isNewUser: false
            }
          }
        } else {
          // 如果还是没有找到用户，抛出原始错误
          throw createError
        }
      }
    }
  } catch (error) {
    console.error('创建/更新用户失败:', error)
    throw new Error('用户操作失败: ' + error.message)
  }
}

/**
 * 获取抽卡配额信息
 * @param {string} userId - 用户ID
 * @param {number} dailyDrawQuota - 每日抽卡配额（从用户类型配置获取）
 * @returns {Object} 抽卡配额信息
 */
async function getDrawCardQuotaInfo(userId, dailyDrawQuota) {
  try {
    // 如果配额为0，说明不可用
    if (dailyDrawQuota === 0) {
      return {
        canDraw: false,
        drawCardRemainingQuota: 0,
        drawCardTotalQuota: 0,
        drawCardUsedToday: 0
      }
    }
    
    // 查询今日已使用次数
    const now = new Date()
    const today = now.toISOString().split('T')[0] // YYYY-MM-DD格式
    
    const countResult = await db.collection('draw_card_records')
      .where({
        userId: userId,
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
    console.error('获取抽卡配额信息失败:', error)
    // 出错时返回默认值，不影响用户信息获取
    return {
      canDraw: false,
      drawCardRemainingQuota: 0,
      drawCardTotalQuota: dailyDrawQuota || 0,
      drawCardUsedToday: 0
    }
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
    
    const user = result.data[0]
    
    // 获取用户权限和配额信息
    const userPermissions = await getUserPermissionsAndQuota(user)
    
    // 获取实际档案数量
    const profileCount = await db.collection('profiles').where({
      openid: OPENID,
      isActive: true
    }).count()
    
    // 更新用户的已使用档案数
    if (profileCount.total !== (user.usedProfiles || 0)) {
      await db.collection('users').doc(user._id).update({
        data: {
          usedProfiles: profileCount.total,
          updateTime: new Date()
        }
      })
    }
    
    // 获取抽卡配额信息
    const drawCardQuota = await getDrawCardQuotaInfo(user._id, userPermissions.dailyDrawQuota)
    
    return {
      success: true,
      data: {
        ...user,
        ...userPermissions,
        usedProfiles: profileCount.total,
        canCreateMore: userPermissions.profileQuota === -1 || profileCount.total < userPermissions.profileQuota,
        remainingQuota: userPermissions.profileQuota === -1 ? -1 : Math.max(0, userPermissions.profileQuota - profileCount.total),
        adminRole: user.adminRole || 'none', // 添加管理员角色字段
        // 抽卡配额信息
        ...drawCardQuota
      }
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
      ...(userData.phoneNumber !== undefined && { phoneNumber: userData.phoneNumber }),
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
    
    // 获取更新后的完整用户信息
    const userResult = await db.collection('users').where({
      openid: OPENID,
      isActive: true
    }).get()
    
    if (userResult.data.length === 0) {
      return {
        success: false,
        error: '获取更新后的用户信息失败'
      }
    }
    
    const updatedUser = userResult.data[0]
    
    // 获取用户权限和配额信息
    const permissionsAndQuota = await getUserPermissionsAndQuota(updatedUser)
    
    // 组装完整的用户信息
    const fullUserInfo = {
      _id: updatedUser._id,
      openid: updatedUser.openid,
      unionid: updatedUser.unionid,
      nickName: updatedUser.nickName,
      avatarUrl: updatedUser.avatarUrl,
      gender: updatedUser.gender,
      phoneNumber: updatedUser.phoneNumber,
      userType: permissionsAndQuota.userType,
      typeName: permissionsAndQuota.typeName,
      displayName: permissionsAndQuota.displayName,
      profileQuota: permissionsAndQuota.profileQuota,
      usedProfiles: updatedUser.usedProfiles || 0,
      permissions: permissionsAndQuota.permissions,
      createTime: updatedUser.createTime,
      updateTime: updatedUser.updateTime,
      lastLoginTime: updatedUser.lastLoginTime
    }
    
    return {
      success: true,
      data: fullUserInfo,
      message: '用户信息更新成功'
    }
  } catch (error) {
    console.error('更新用户信息失败:', error)
    throw new Error('更新用户信息失败')
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
      // 不再更新 profileQuota 和 permissions，统一从 static_user_types 表获取
    }
    
    // 处理特殊逻辑
    if (targetUserType === 'normal' && currentUserType === 'guest') {
      updateData.registrationTime = now
      // 如果有注册数据，更新用户信息
      if (registrationData) {
        updateData = { ...updateData, ...registrationData }
      }
    } else if (targetUserType === 'premium' && currentUserType !== 'premium') {
      updateData.upgradeTime = now
    }
    
    // 执行更新
    const result = await db.collection('users').doc(currentUser._id).update({
      data: updateData
    })
    
    // 获取目标用户类型的配置信息用于返回
    const targetConfig = await getUserTypeConfig(targetUserType)
    
    return {
      success: true,
      message: `用户类型已升级为 ${targetConfig.displayName}`,
      data: {
        oldUserType: currentUserType,
        newUserType: targetUserType,
        typeName: targetConfig.typeName,
        displayName: targetConfig.displayName,
        updateTime: now,
        profileQuota: targetConfig.profileQuota,
        permissions: targetConfig.permissions
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
    
    // 使用新的权限和配额获取方法
    const userPermissions = await getUserPermissionsAndQuota(user)
    const { userType, profileQuota } = userPermissions
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

/**
 * 批量删除用户（根据条件）
 * 注意：此功能需要管理员权限，实际使用时应添加权限验证
 */
async function deleteUsers(wxContext, data) {
  const { conditions, operatorOpenid } = data
  
  // TODO: 这里应该添加操作员权限验证
  // 例如：验证operatorOpenid是否有管理员权限
  
  try {
    // 构建删除条件
    const deleteConditions = {
      isActive: true, // 只删除活跃用户
      ...conditions // 合并传入的条件
    }
    
    console.log('准备删除用户，条件:', deleteConditions)
    
    // 先查询要删除的用户数量
    const countResult = await db.collection('users').where(deleteConditions).count()
    console.log(`找到 ${countResult.total} 个符合条件的用户`)
    
    if (countResult.total === 0) {
      return {
        success: true,
        message: '没有找到符合条件的用户',
        data: {
          deletedCount: 0
        }
      }
    }
    
    // 执行批量删除
    const deleteResult = await db.collection('users').where(deleteConditions).remove()
    
    console.log('删除结果:', deleteResult)
    
    return {
      success: true,
      message: `成功删除 ${deleteResult.stats.removed} 个用户`,
      data: {
        deletedCount: deleteResult.stats.removed,
        conditions: deleteConditions
      }
    }
  } catch (error) {
    console.error('批量删除用户失败:', error)
    throw new Error('批量删除用户失败: ' + error.message)
  }
}

/**
 * 删除非活跃用户（软删除）
 * 将 isActive 设为 false，而不是真正删除记录
 */
async function deleteInactiveUsers(wxContext, data) {
  const { operatorOpenid, daysInactive = 30 } = data
  
  // TODO: 这里应该添加操作员权限验证
  
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysInactive)
    
    console.log(`准备软删除 ${daysInactive} 天前未活跃的用户，截止日期: ${cutoffDate}`)
    
    // 查找需要软删除的用户
    const inactiveUsers = await db.collection('users').where({
      isActive: true,
      lastLoginTime: db.command.lt(cutoffDate) // 小于截止日期
    }).get()
    
    console.log(`找到 ${inactiveUsers.data.length} 个非活跃用户`)
    
    if (inactiveUsers.data.length === 0) {
      return {
        success: true,
        message: '没有找到非活跃用户',
        data: {
          softDeletedCount: 0
        }
      }
    }
    
    // 批量软删除（更新 isActive 为 false）
    const updateResult = await db.collection('users').where({
      isActive: true,
      lastLoginTime: db.command.lt(cutoffDate)
    }).update({
      data: {
        isActive: false,
        deactivateTime: new Date(),
        updateTime: new Date()
      }
    })
    
    console.log('软删除结果:', updateResult)
    
    return {
      success: true,
      message: `成功软删除 ${updateResult.stats.updated} 个非活跃用户`,
      data: {
        softDeletedCount: updateResult.stats.updated,
        cutoffDate: cutoffDate,
        daysInactive: daysInactive
      }
    }
  } catch (error) {
    console.error('软删除非活跃用户失败:', error)
    throw new Error('软删除非活跃用户失败: ' + error.message)
  }
}

/**
 * 更新临时用户的档案配额为3
 */
async function updateGuestUserQuota(wxContext) {
  const { OPENID } = wxContext
  
  try {
    console.log('开始更新临时用户档案配额...')
    
    // 查找当前用户
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
    const userType = user.userType || user.userTypeCode || 'guest'
    
    // 只更新临时用户的配额
    if (userType !== 'guest') {
      return {
        success: false,
        error: '只有临时用户需要更新配额'
      }
    }
    
    // 更新临时用户的最后更新时间
    const updateResult = await db.collection('users').doc(user._id).update({
      data: {
        updateTime: new Date()
        // 不再更新 profileQuota 和 permissions，统一从 static_user_types 表获取
      }
    })
    
    console.log('更新临时用户配额结果:', updateResult)
    
    // 获取guest用户类型的配置信息
    const guestConfig = await getUserTypeConfig('guest')
    
    return {
      success: true,
      message: `临时用户档案配额已更新为${guestConfig.profileQuota}个`,
      data: {
        userId: user._id,
        userType: userType,
        typeName: guestConfig.typeName,
        displayName: guestConfig.displayName,
        profileQuota: guestConfig.profileQuota,
        permissions: guestConfig.permissions
      }
    }
  } catch (error) {
    console.error('更新临时用户配额失败:', error)
    throw new Error('更新临时用户配额失败: ' + error.message)
  }
}

/**
 * 获取用户类型配置
 */
async function getUserTypeConfigAction(data) {
  const { typeCode } = data
  
  if (!typeCode) {
    return {
      success: false,
      error: '缺少typeCode参数'
    }
  }
  
  try {
    const config = await getUserTypeConfig(typeCode)
    return {
      success: true,
      data: config
    }
  } catch (error) {
    console.error('获取用户类型配置失败:', error)
    return {
      success: false,
      error: '获取用户类型配置失败'
    }
  }
}

/**
 * 获取当前用户的权限和配额信息
 */
async function getUserPermissionsAndQuotaAction(wxContext) {
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
    const userPermissions = await getUserPermissionsAndQuota(user)
    
    return {
      success: true,
      data: userPermissions
    }
  } catch (error) {
    console.error('获取用户权限和配额失败:', error)
    return {
      success: false,
      error: '获取用户权限和配额失败'
    }
  }
}
