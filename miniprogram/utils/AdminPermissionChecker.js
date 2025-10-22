/**
 * 管理员权限校验工具类
 * 用于检查用户的管理员权限级别
 */
const { ADMIN_ROLES } = require('../constants/adminRoles')

class AdminPermissionChecker {
  /**
   * 检查是否为管理员（任何级别）
   * @param {string} adminRole - 管理员角色
   * @returns {boolean}
   */
  static isAdmin(adminRole) {
    return adminRole === ADMIN_ROLES.ADMIN || adminRole === ADMIN_ROLES.SUPER_ADMIN
  }
  
  /**
   * 检查是否为超级管理员
   * @param {string} adminRole - 管理员角色
   * @returns {boolean}
   */
  static isSuperAdmin(adminRole) {
    return adminRole === ADMIN_ROLES.SUPER_ADMIN
  }
  
  /**
   * 检查是否为普通管理员
   * @param {string} adminRole - 管理员角色
   * @returns {boolean}
   */
  static isNormalAdmin(adminRole) {
    return adminRole === ADMIN_ROLES.ADMIN
  }
  
  /**
   * 检查是否为普通用户（非管理员）
   * @param {string} adminRole - 管理员角色
   * @returns {boolean}
   */
  static isNormalUser(adminRole) {
    return !adminRole || adminRole === ADMIN_ROLES.NONE
  }
  
  /**
   * 获取管理员角色的显示名称
   * @param {string} adminRole - 管理员角色
   * @returns {string}
   */
  static getAdminRoleName(adminRole) {
    switch (adminRole) {
      case ADMIN_ROLES.SUPER_ADMIN:
        return '超级管理员'
      case ADMIN_ROLES.ADMIN:
        return '普通管理员'
      case ADMIN_ROLES.NONE:
      default:
        return '普通用户'
    }
  }
}

module.exports = {
  AdminPermissionChecker
}


