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
  try {
    // 尝试从static_user_types表获取配置
    const configResult = await db.collection('static_user_types').where({
      typeCode: typeCode
    }).get()
    
    if (configResult.data.length > 0) {
      const config = configResult.data[0]
      return {
        typeCode: config.typeCode,
        typeName: config.typeName,
        displayName: config.displayName,
        description: config.description,
        profileQuota: config.profileQuota,
        permissions: config.permissions
      }
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
      permissions: ['view', 'create_limited']
    },
    'normal': {
      typeCode: 'normal',
      typeName: '探索者',
      displayName: '探索者',
      description: '已注册的普通用户，享受基础功能',
      profileQuota: 50,
      permissions: ['view', 'create']
    },
    'premium': {
      typeCode: 'premium',
      typeName: '高级用户',
      displayName: '高级用户',
      description: '付费高级用户，享受全部功能',
      profileQuota: -1,
      permissions: ['all']
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
  
  // 优先使用static_user_types表的配置
  const typeConfig = await getUserTypeConfig(userType)
  
  // 直接使用配置表的权限和配额，不再使用users表中的旧字段
  return {
    userType,
    typeName: typeConfig.typeName,
    displayName: typeConfig.displayName,
    description: typeConfig.description,
    profileQuota: typeConfig.profileQuota,
    permissions: typeConfig.permissions
  }
}

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { action, data } = event
  
  try {
    switch (action) {
      case 'createProfile':
        return await createProfile(wxContext, data)
      case 'getProfiles':
        return await getProfiles(wxContext, data)
      case 'getProfile':
        return await getProfile(wxContext, data)
      case 'updateProfile':
        return await updateProfile(wxContext, data)
      case 'deleteProfile':
        return await deleteProfile(wxContext, data)
      case 'searchProfile':
        return await searchProfile(wxContext, data)
      default:
        return {
          success: false,
          error: '未知操作类型'
        }
    }
  } catch (error) {
    console.error('档案管理云函数执行失败:', error)
    return {
      success: false,
      error: error.message || '操作失败'
    }
  }
}

/**
 * 创建八字档案
 */
async function createProfile(wxContext, profileData) {
  const { OPENID } = wxContext
  const now = new Date()
  
  try {
    // 验证必填字段
    if (!profileData.profileName || !profileData.birthDate || !profileData.baziData) {
      throw new Error('缺少必填字段：档案名称、生日信息或八字数据')
    }
    
    // 获取用户信息
    const userResult = await db.collection('users').where({
      openid: OPENID,
      isActive: true
    }).get()
    
    if (userResult.data.length === 0) {
      throw new Error('用户不存在，请先注册')
    }
    
    const user = userResult.data[0]
    const userId = user._id
    
    // 使用新的权限和配额获取方法
    const userPermissions = await getUserPermissionsAndQuota(user)
    const { userType, profileQuota, typeName } = userPermissions
    
    // 检查档案数量限制（高级用户无限制）
    if (profileQuota !== -1) {
      const existingProfileCount = await db.collection('profiles').where({
        openid: OPENID,
        isActive: true
      }).count()
      
      if (existingProfileCount.total >= profileQuota) {
        let errorMessage = `档案数量已达上限（${profileQuota}个）`
        if (userType === 'guest') {
          errorMessage += '，注册后可创建更多档案'
        } else if (userType === 'normal') {
          errorMessage += '，升级高级版可无限制创建档案'
        }
        return {
          success: false,
          error: errorMessage,
          code: 'QUOTA_EXCEEDED',
          data: {
            userType,
            typeName,
            currentCount: existingProfileCount.total,
            quota: profileQuota
          }
        }
      }
    }
    
    // 创建档案文档
    const profileDoc = {
      userId,
      openid: OPENID,
      profileName: profileData.profileName,
      birthDate: {
        year: profileData.birthDate.year,
        month: profileData.birthDate.month,
        day: profileData.birthDate.day,
        hour: profileData.birthDate.hour,
        minute: profileData.birthDate.minute || 0,
        isLunar: profileData.birthDate.isLunar || false
      },
      baziData: {
        year: {
          gan: profileData.baziData.year.gan,
          zhi: profileData.baziData.year.zhi,
          ganzhiIndex: profileData.baziData.year.ganzhiIndex
        },
        month: {
          gan: profileData.baziData.month.gan,
          zhi: profileData.baziData.month.zhi,
          ganzhiIndex: profileData.baziData.month.ganzhiIndex
        },
        day: {
          gan: profileData.baziData.day.gan,
          zhi: profileData.baziData.day.zhi,
          ganzhiIndex: profileData.baziData.day.ganzhiIndex
        },
        hour: {
          gan: profileData.baziData.hour.gan,
          zhi: profileData.baziData.hour.zhi,
          ganzhiIndex: profileData.baziData.hour.ganzhiIndex
        },
        ...(profileData.baziData.lunarDate && { lunarDate: profileData.baziData.lunarDate })
      },
      gender: profileData.gender || 0,
      isUncertainTime: profileData.isUncertainTime || false,
      description: profileData.description || '',
      createTime: now,
      updateTime: now,
      isActive: true
    }
    
    const result = await db.collection('profiles').add({
      data: profileDoc
    })
    
    return {
      success: true,
      message: '档案创建成功',
      data: {
        profileId: result._id,
        profile: {
          ...profileDoc,
          _id: result._id
        }
      }
    }
  } catch (error) {
    console.error('创建档案失败:', error)
    throw new Error(error.message || '档案创建失败')
  }
}

/**
 * 获取用户的所有档案
 */
async function getProfiles(wxContext, queryData = {}) {
  const { OPENID } = wxContext
  const { page = 1, limit = 20 } = queryData
  
  try {
    const skip = (page - 1) * limit
    
    // 查询用户的档案列表
    const result = await db.collection('profiles')
      .where({
        openid: OPENID,
        isActive: true
      })
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(limit)
      .get()
    
    // 获取总数
    const countResult = await db.collection('profiles')
      .where({
        openid: OPENID,
        isActive: true
      })
      .count()
    
    return {
      success: true,
      data: {
        profiles: result.data,
        total: countResult.total,
        page,
        limit,
        hasMore: skip + result.data.length < countResult.total
      }
    }
  } catch (error) {
    console.error('获取档案列表失败:', error)
    throw new Error('获取档案列表失败')
  }
}

/**
 * 获取单个档案详情
 */
async function getProfile(wxContext, queryData) {
  const { OPENID } = wxContext
  const { profileId } = queryData
  
  if (!profileId) {
    throw new Error('缺少档案ID')
  }
  
  try {
    const result = await db.collection('profiles')
      .where({
        _id: profileId,
        openid: OPENID,
        isActive: true
      })
      .get()
    
    if (result.data.length === 0) {
      return {
        success: false,
        error: '档案不存在'
      }
    }
    
    return {
      success: true,
      data: result.data[0]
    }
  } catch (error) {
    console.error('获取档案详情失败:', error)
    throw new Error('获取档案详情失败')
  }
}

/**
 * 更新档案
 */
async function updateProfile(wxContext, updateData) {
  const { OPENID } = wxContext
  const { profileId, ...profileData } = updateData
  
  if (!profileId) {
    throw new Error('缺少档案ID')
  }
  
  try {
    const now = new Date()
    
    const updateDoc = {
      updateTime: now,
      ...(profileData.profileName && { profileName: profileData.profileName }),
      ...(profileData.birthDate && { birthDate: profileData.birthDate }),
      ...(profileData.baziData && { baziData: profileData.baziData }),
      ...(profileData.gender !== undefined && { gender: profileData.gender }),
      ...(profileData.isUncertainTime !== undefined && { isUncertainTime: profileData.isUncertainTime }),
      ...(profileData.description !== undefined && { description: profileData.description })
    }
    
    // 强制包含 isUncertainTime 字段（如果存在）
    if (profileData.isUncertainTime !== undefined) {
      updateDoc.isUncertainTime = profileData.isUncertainTime;
    }
    
    const result = await db.collection('profiles')
      .where({
        _id: profileId,
        openid: OPENID,
        isActive: true
      })
      .update({
        data: updateDoc
      })
    
    if (result.stats.updated === 0) {
      return {
        success: false,
        error: '档案不存在或更新失败'
      }
    }
    
    // 获取更新后的档案数据
    const updatedProfile = await db.collection('profiles')
      .where({
        _id: profileId,
        openid: OPENID,
        isActive: true
      })
      .get()
    
    if (updatedProfile.data.length === 0) {
      return {
        success: false,
        error: '获取更新后的档案数据失败'
      }
    }
    
    return {
      success: true,
      message: '档案更新成功',
      data: updatedProfile.data[0]
    }
  } catch (error) {
    console.error('更新档案失败:', error)
    throw new Error('更新档案失败')
  }
}

/**
 * 删除档案（软删除）
 */
async function deleteProfile(wxContext, deleteData) {
  const { OPENID } = wxContext
  const { profileId } = deleteData
  
  if (!profileId) {
    throw new Error('缺少档案ID')
  }
  
  try {
    const result = await db.collection('profiles')
      .where({
        _id: profileId,
        openid: OPENID,
        isActive: true
      })
      .update({
        data: {
          isActive: false,
          updateTime: new Date()
        }
      })
    
    if (result.stats.updated === 0) {
      return {
        success: false,
        error: '档案不存在或删除失败'
      }
    }
    
    return {
      success: true,
      message: '档案删除成功'
    }
  } catch (error) {
    console.error('删除档案失败:', error)
    throw new Error('删除档案失败')
  }
}

/**
 * 根据生日和八字搜索已有档案
 */
async function searchProfile(wxContext, searchData) {
  const { OPENID } = wxContext
  const { birthDate, baziData } = searchData
  
  try {
    let whereCondition = {
      openid: OPENID,
      isActive: true
    }
    
    // 根据生日搜索
    if (birthDate) {
      whereCondition = {
        ...whereCondition,
        'birthDate.year': birthDate.year,
        'birthDate.month': birthDate.month,
        'birthDate.day': birthDate.day,
        'birthDate.hour': birthDate.hour
      }
    }
    
    const result = await db.collection('profiles')
      .where(whereCondition)
      .orderBy('createTime', 'desc')
      .get()
    
    return {
      success: true,
      data: {
        profiles: result.data,
        count: result.data.length
      }
    }
  } catch (error) {
    console.error('搜索档案失败:', error)
    throw new Error('搜索档案失败')
  }
}
