/**
 * 用户权限管理工具模块
 * 提供用户权限验证、配额检查等功能
 */

/**
 * 用户类型定义
 */
const USER_TYPES = {
  GUEST: 'guest',
  NORMAL: 'normal',
  PREMIUM: 'premium'
}

/**
 * 权限定义
 */
const PERMISSIONS = {
  VIEW: 'view',
  CREATE_LIMITED: 'create_limited',
  CREATE: 'create',
  EXPORT: 'export',
  SHARE: 'share',
  ALL: 'all'
}

/**
 * 用户类型权限配置
 */
const USER_TYPE_PERMISSIONS = {
  [USER_TYPES.GUEST]: [PERMISSIONS.VIEW, PERMISSIONS.CREATE_LIMITED],
  [USER_TYPES.NORMAL]: [PERMISSIONS.VIEW, PERMISSIONS.CREATE, PERMISSIONS.EXPORT, PERMISSIONS.SHARE],
  [USER_TYPES.PREMIUM]: [PERMISSIONS.ALL]
}

/**
 * 用户类型配额配置
 */
const USER_TYPE_QUOTAS = {
  [USER_TYPES.GUEST]: 3,
  [USER_TYPES.NORMAL]: 20,
  [USER_TYPES.PREMIUM]: -1 // -1表示无限制
}

/**
 * 用户类型显示名称
 */
const USER_TYPE_NAMES = {
  [USER_TYPES.GUEST]: '临时用户',
  [USER_TYPES.NORMAL]: '普通用户',
  [USER_TYPES.PREMIUM]: '高级用户'
}

/**
 * 权限管理器类
 */
class PermissionManager {
  constructor() {
    this.userInfo = null
  }

  /**
   * 设置用户信息
   * @param {Object} userInfo 用户信息
   */
  setUserInfo(userInfo) {
    this.userInfo = userInfo
  }

  /**
   * 获取当前用户类型
   * @returns {string} 用户类型
   */
  getUserType() {
    return this.userInfo?.userType || USER_TYPES.GUEST
  }

  /**
   * 获取用户类型显示名称
   * @param {string} userType 用户类型，不传则使用当前用户类型
   * @returns {string} 显示名称
   */
  getUserTypeName(userType = null) {
    const type = userType || this.getUserType()
    return USER_TYPE_NAMES[type] || '未知用户'
  }

  /**
   * 检查用户是否有指定权限
   * @param {string} permission 权限名称
   * @param {string} userType 用户类型，不传则使用当前用户类型
   * @returns {boolean} 是否有权限
   */
  hasPermission(permission, userType = null) {
    const type = userType || this.getUserType()
    const permissions = USER_TYPE_PERMISSIONS[type] || []
    
    // 如果有ALL权限，则拥有所有权限
    if (permissions.includes(PERMISSIONS.ALL)) {
      return true
    }
    
    return permissions.includes(permission)
  }

  /**
   * 检查用户是否可以创建档案
   * @returns {boolean} 是否可以创建
   */
  canCreateProfile() {
    return this.hasPermission(PERMISSIONS.CREATE_LIMITED) || this.hasPermission(PERMISSIONS.CREATE)
  }

  /**
   * 检查用户是否可以导出档案
   * @returns {boolean} 是否可以导出
   */
  canExportProfile() {
    return this.hasPermission(PERMISSIONS.EXPORT)
  }

  /**
   * 检查用户是否可以分享档案
   * @returns {boolean} 是否可以分享
   */
  canShareProfile() {
    return this.hasPermission(PERMISSIONS.SHARE)
  }

  /**
   * 获取用户档案配额
   * @param {string} userType 用户类型，不传则使用当前用户类型
   * @returns {number} 配额数量，-1表示无限制
   */
  getProfileQuota(userType = null) {
    const type = userType || this.getUserType()
    return USER_TYPE_QUOTAS[type] || 1
  }

  /**
   * 检查用户是否可以创建更多档案
   * @param {number} currentCount 当前档案数量
   * @returns {Object} 检查结果
   */
  canCreateMoreProfiles(currentCount) {
    const quota = this.getProfileQuota()
    const canCreate = quota === -1 || currentCount < quota
    const remaining = quota === -1 ? -1 : Math.max(0, quota - currentCount)
    
    return {
      canCreate,
      quota,
      currentCount,
      remaining,
      isUnlimited: quota === -1
    }
  }

  /**
   * 获取升级提示信息
   * @returns {Object|null} 升级提示信息，null表示无需升级
   */
  getUpgradeHint() {
    const userType = this.getUserType()
    
    switch (userType) {
      case USER_TYPES.GUEST:
        return {
          targetType: USER_TYPES.NORMAL,
          targetName: USER_TYPE_NAMES[USER_TYPES.NORMAL],
          benefits: [
            '创建20个档案',
            '导出档案数据',
            '分享给好友'
          ],
          action: '立即注册'
        }
      case USER_TYPES.NORMAL:
        return {
          targetType: USER_TYPES.PREMIUM,
          targetName: USER_TYPE_NAMES[USER_TYPES.PREMIUM],
          benefits: [
            '无限档案创建',
            '高级智慧分析',
            '专属客服支持'
          ],
          action: '了解详情'
        }
      case USER_TYPES.PREMIUM:
        return null // 高级用户无需升级
      default:
        return null
    }
  }

  /**
   * 获取功能限制信息
   * @param {string} feature 功能名称
   * @returns {Object|null} 限制信息，null表示无限制
   */
  getFeatureRestriction(feature) {
    const userType = this.getUserType()
    
    // 高级用户无限制
    if (userType === USER_TYPES.PREMIUM) {
      return null
    }
    
    const restrictions = {
      [PERMISSIONS.CREATE]: {
        guest: {
          restricted: false, // 临时用户可以创建，但有数量限制
          message: '临时用户最多创建3个档案',
          upgradeHint: '注册后可创建20个档案'
        }
      },
      [PERMISSIONS.EXPORT]: {
        guest: {
          restricted: true,
          message: '导出功能需要注册后使用',
          upgradeHint: '注册即可使用导出功能'
        }
      },
      [PERMISSIONS.SHARE]: {
        guest: {
          restricted: true,
          message: '分享功能需要注册后使用',
          upgradeHint: '注册即可使用分享功能'
        }
      }
    }
    
    const featureRestrictions = restrictions[feature]
    if (!featureRestrictions || !featureRestrictions[userType]) {
      return null
    }
    
    return featureRestrictions[userType]
  }

  /**
   * 格式化档案数量显示
   * @param {number} currentCount 当前档案数量
   * @returns {string} 格式化后的显示文本
   */
  formatProfileCount(currentCount) {
    const quota = this.getProfileQuota()
    
    if (quota === -1) {
      return `${currentCount}个`
    }
    
    return `${currentCount}/${quota}`
  }
}

// 创建单例实例
const permissionManager = new PermissionManager()

// 导出常量和实例
module.exports = {
  permissionManager,
  PermissionManager,
  USER_TYPES,
  PERMISSIONS,
  USER_TYPE_PERMISSIONS,
  USER_TYPE_QUOTAS,
  USER_TYPE_NAMES
}
