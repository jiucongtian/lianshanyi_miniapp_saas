// 云函数入口文件
const cloud = require('wx-server-sdk')
const { calculateBazi } = require('./baziCalculator')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV // 使用当前云环境
})

const db = cloud.database()

/**
 * 调用八字计算模块
 * @param {Object} birthDate - 出生日期信息（北京时间）
 * @returns {Promise<Object>} 返回八字计算结果
 */
async function callBaziCalculation(birthDate) {
  try {
    console.log('=== 开始调用八字计算模块 ===');
    console.log('出生日期信息（北京时间）:', birthDate);
    
    // 提取所有参数，包括农历相关字段
    const { year, month, day, hour, minute = 0, isLunar = false, isLeapMonth = false } = birthDate;
    
    console.log('传递参数给八字计算模块:', { 
      year, 
      month, 
      day, 
      hour, 
      minute,
      isLunar,
      isLeapMonth 
    });
    
    // 调用八字计算模块（支持农历和公历）
    const result = await calculateBazi({
      year,
      month,
      day,
      hour,
      minute,
      isLunar,
      isLeapMonth
    });
    
    console.log('八字计算模块返回结果:', result);
    
    if (result.success) {
      return {
        success: true,
        baziData: result.data.baziData,
        rawCozeData: result.data.rawCozeData,
        rawLocalData: result.data.rawLocalData, // 保留本地计算结果
        parameters: result.data.parameters,
        birthDate: { year, month, day, hour, minute, isLunar, isLeapMonth }
      };
    } else {
      throw new Error(result.error || '八字计算失败');
    }
  } catch (error) {
    console.error('=== 调用八字计算模块失败 ===');
    console.error('错误信息:', error.message);
    console.error('错误堆栈:', error.stack);
    throw new Error(`八字计算失败: ${error.message}`);
  }
}

/**
 * 获取用户类型配置
 * 从static_user_types表获取，如果不存在则抛出异常
 */
async function getUserTypeConfig(typeCode) {
  // 从static_user_types表获取配置
  const configResult = await db.collection('static_user_types').where({
    typeCode: typeCode
  }).get()
  
  if (configResult.data.length === 0) {
    const errorMsg = `用户类型配置不存在: ${typeCode}，请在 static_user_types 表中添加配置`
    console.error('[getUserTypeConfig]', errorMsg)
    throw new Error(errorMsg)
  }
  
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
    // 1️⃣ 验证必填字段
    if (!profileData.profileName || !profileData.birthDate) {
      throw new Error('缺少必填字段：档案名称或生日信息')
    }
    
    // 2️⃣ 获取用户信息（优先检查，避免浪费计算资源）
    const userResult = await db.collection('users').where({
      openid: OPENID,
      isActive: true
    }).get()
    
    if (userResult.data.length === 0) {
      throw new Error('用户不存在，请先注册')
    }
    
    const user = userResult.data[0]
    const userId = user._id
    
    // 3️⃣ 获取权限和配额配置
    const userPermissions = await getUserPermissionsAndQuota(user)
    const { userType, profileQuota, typeName } = userPermissions
    
    // 4️⃣ 检查档案数量限制（在计算八字之前检查，避免浪费资源）
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
    
    // 5️⃣ 配额检查通过后，才开始计算八字（耗时操作）
    console.log('配额检查通过，开始计算八字数据...');
    const baziResult = await callBaziCalculation(profileData.birthDate);
    
    if (!baziResult.success || !baziResult.baziData) {
      throw new Error(`八字计算失败: ${baziResult.error || '未知错误'}`);
    }
    
    console.log('八字计算成功，数据:', baziResult.baziData);
    
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
        isLunar: profileData.birthDate.isLunar || false,
        isLeapMonth: profileData.birthDate.isLeapMonth || false // 农历闰月标记
      },
      baziData: baziResult.baziData, // 使用计算出的八字数据
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
    
    // 构建完整的档案数据（包含所有字段）
    const fullProfileData = {
      ...profileDoc,
      _id: result._id
    }
    
    return {
      success: true,
      message: '档案创建成功',
      data: {
        profileId: result._id,
        profile: fullProfileData
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
    
    // 如果更新了出生日期，需要重新计算八字
    let baziData = null;
    if (profileData.birthDate) {
      console.log('检测到出生日期更新，开始重新计算八字...');
      const baziResult = await callBaziCalculation(profileData.birthDate);
      
      if (!baziResult.success || !baziResult.baziData) {
        throw new Error(`八字计算失败: ${baziResult.error || '未知错误'}`);
      }
      
      baziData = baziResult.baziData;
      console.log('八字重新计算成功，数据:', baziData);
    }
    
    const updateDoc = {
      updateTime: now,
      ...(profileData.profileName && { profileName: profileData.profileName }),
      ...(profileData.birthDate && { 
        birthDate: {
          ...profileData.birthDate,
          isLunar: profileData.birthDate.isLunar || false,
          isLeapMonth: profileData.birthDate.isLeapMonth || false
        }
      }),
      ...(baziData && { baziData: baziData }), // 使用重新计算的八字数据
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
