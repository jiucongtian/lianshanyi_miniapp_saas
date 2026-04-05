/**
 * 用户数据Bean
 * 用于处理用户相关的数据格式化和验证
 */
const { BaseBean } = require('./BaseBean');

class UserBean extends BaseBean {
  constructor(data) {
    super(data); // 调用BaseBean构造函数
    
    // 使用BaseBean提供的_getField方法提取字段
    this._id = this._getField(this.data, '_id', '', 'string');
    this.openid = this._getField(this.data, 'openid', '', 'string');
    this.unionid = this._getField(this.data, 'unionid', '', 'string');
    this.nickName = this._getField(this.data, 'nickName', '微信用户', 'string');
    this.avatarUrl = this._getField(this.data, 'avatarUrl', '', 'string');
    this.gender = this._getField(this.data, 'gender', 0, 'number');
    this.phoneNumber = this._getField(this.data, 'phoneNumber', '', 'string');
    this.createTime = this._getField(this.data, 'createTime', null);
    this.updateTime = this._getField(this.data, 'updateTime', null);
    this.lastLoginTime = this._getField(this.data, 'lastLoginTime', null);
    this.userType = this._getField(this.data, 'userType', this.data.userTypeCode || 'guest', 'string');
    this.registrationTime = this._getField(this.data, 'registrationTime', null);
    this.upgradeTime = this._getField(this.data, 'upgradeTime', null);
    this.usedProfiles = this._getField(this.data, 'usedProfiles', 0, 'number');
    this.isActive = this.data.isActive !== undefined ? this.data.isActive : true;
    
    // 管理员角色字段
    this.adminRole = this._getField(this.data, 'adminRole', 'none', 'string');
    
    // 用户类型相关字段（从static_user_types表获取）
    this.typeName = this._getField(this.data, 'typeName', '', 'string');
    this.displayName = this._getField(this.data, 'displayName', '', 'string');
    this.description = this._getField(this.data, 'description', '', 'string');
    this.profileQuota = this._getField(this.data, 'profileQuota', 3, 'number');
    this.permissions = this._getField(this.data, 'permissions', []);
    
    // 抽卡配额相关字段（从static_user_types表获取，并在getUserInfo时计算）
    this.dailyDrawQuota = this._getField(this.data, 'dailyDrawQuota', 0, 'number');
    this.canDraw = this._getField(this.data, 'canDraw', false, 'boolean');
    this.drawCardRemainingQuota = this._getField(this.data, 'drawCardRemainingQuota', 0, 'number');
    this.drawCardTotalQuota = this._getField(this.data, 'drawCardTotalQuota', 0, 'number');
    this.drawCardUsedToday = this._getField(this.data, 'drawCardUsedToday', 0, 'number');
    
    // 计算字段（存储原始值，方法会重新计算）
    this._canCreateMoreValue = this._getField(this.data, 'canCreateMore');
    this._remainingQuotaValue = this._getField(this.data, 'remainingQuota');
    
    // 验证关键字段
    this._validate();
  }
  
  /**
   * 验证数据完整性
   */
  _validate() {
    // 验证必需字段
    this._validateRequiredField('_id', this._id);
    this._validateRequiredField('openid', this.openid);
    
    // 验证数据类型
    this._validateFieldType('profileQuota', this.profileQuota, 'number');
    this._validateArray('permissions', this.permissions);
    this._validateFieldType('usedProfiles', this.usedProfiles, 'number');
    this._validateFieldType('isActive', this.isActive, 'boolean');
    
    // 验证抽卡配额字段
    this._validateFieldType('dailyDrawQuota', this.dailyDrawQuota, 'number');
    this._validateFieldType('canDraw', this.canDraw, 'boolean');
    this._validateFieldType('drawCardRemainingQuota', this.drawCardRemainingQuota, 'number');
    this._validateFieldType('drawCardTotalQuota', this.drawCardTotalQuota, 'number');
    this._validateFieldType('drawCardUsedToday', this.drawCardUsedToday, 'number');
    
    // 验证用户类型
    const validUserTypes = ['guest', 'normal', 'student', 'premium'];
    if (!validUserTypes.includes(this.userType)) {
      this._addValidationError('userType', `无效的用户类型: ${this.userType}`);
    }
    
    // 验证性别
    if (this.gender !== 0 && this.gender !== 1 && this.gender !== 2) {
      this._addValidationError('gender', `无效的性别值: ${this.gender}`);
    }
    
    // 验证管理员角色
    const validAdminRoles = ['none', 'admin', 'super_admin'];
    if (!validAdminRoles.includes(this.adminRole)) {
      this._addValidationError('adminRole', `无效的管理员角色: ${this.adminRole}`);
    }
    
    // 标记为已验证
    this._isValidated = true;
  }
  
  /**
   * 计算是否可以创建更多档案
   * @returns {boolean} 是否可以创建更多档案
   */
  _calculateCanCreateMore() {
    if (this.profileQuota === -1) {
      return true; // 高级用户无限制
    }
    return this.usedProfiles < this.profileQuota;
  }
  
  /**
   * 计算剩余配额
   * @returns {number} 剩余配额，-1表示无限制
   */
  _calculateRemainingQuota() {
    if (this.profileQuota === -1) {
      return -1; // 高级用户无限制
    }
    return Math.max(0, this.profileQuota - this.usedProfiles);
  }
  
  /**
   * 检查是否可以创建更多档案
   * @returns {boolean} 是否可以创建更多档案
   */
  canCreateMore() {
    // 如果传入了预计算值，使用预计算值，否则重新计算
    if (this._canCreateMoreValue !== undefined) {
      return this._canCreateMoreValue;
    }
    return this._calculateCanCreateMore();
  }
  
  /**
   * 获取剩余配额
   * @returns {number} 剩余配额
   */
  getRemainingQuota() {
    // 如果传入了预计算值，使用预计算值，否则重新计算
    if (this._remainingQuotaValue !== undefined) {
      return this._remainingQuotaValue;
    }
    return this._calculateRemainingQuota();
  }
  
  /**
   * 检查用户类型
   * @param {string} userType - 要检查的用户类型
   * @returns {boolean} 是否匹配
   */
  isUserType(userType) {
    return this.userType === userType;
  }
  
  /**
   * 检查是否为临时用户
   * @returns {boolean} 是否为临时用户
   */
  isGuest() {
    return this.userType === 'guest';
  }
  
  /**
   * 检查是否为普通用户
   * @returns {boolean} 是否为普通用户
   */
  isNormal() {
    return this.userType === 'normal';
  }
  
  /**
   * 检查是否为学员
   * @returns {boolean} 是否为学员
   */
  isStudent() {
    return this.userType === 'student';
  }

  /**
   * 检查是否为高级用户
   * @returns {boolean} 是否为高级用户
   */
  isPremium() {
    return this.userType === 'premium';
  }
  
  /**
   * 检查是否有特定权限
   * @param {string} permission - 权限名称
   * @returns {boolean} 是否有权限
   */
  hasPermission(permission) {
    if (this.permissions.includes('all')) {
      return true; // 高级用户拥有所有权限
    }
    return this.permissions.includes(permission);
  }
  
  /**
   * 检查是否可以查看档案
   * @returns {boolean} 是否可以查看档案
   */
  canView() {
    return this.hasPermission('view') || this.hasPermission('all');
  }
  
  /**
   * 检查是否可以创建档案
   * @returns {boolean} 是否可以创建档案
   */
  canCreate() {
    return this.hasPermission('create') || this.hasPermission('create_limited') || this.hasPermission('all');
  }
  
  /**
   * 检查是否可以创建受限档案（临时用户）
   * @returns {boolean} 是否可以创建受限档案
   */
  canCreateLimited() {
    return this.hasPermission('create_limited');
  }
  
  /**
   * 获取用户显示名称
   * @returns {string} 显示名称
   */
  getDisplayName() {
    return this.displayName || this.typeName || this.userType;
  }
  
  /**
   * 获取用户昵称（用于显示）
   * @returns {string} 用户昵称
   */
  getNickName() {
    return this.nickName || '微信用户';
  }
  
  /**
   * 获取性别文本
   * @returns {string} 性别文本
   */
  getGenderText() {
    switch (this.gender) {
      case 1:
        return '男';
      case 2:
        return '女';
      default:
        return '未知';
    }
  }
  
  /**
   * 检查是否为新用户
   * @returns {boolean} 是否为新用户
   */
  isNewUser() {
    return this.usedProfiles === 0 && this.isGuest();
  }
  
  /**
   * 检查用户是否已注册
   * @returns {boolean} 是否已注册
   */
  isRegistered() {
    return this.userType !== 'guest';
  }
  
  /**
   * 检查是否为管理员（任何级别）
   * @returns {boolean} 是否为管理员
   */
  isAdmin() {
    return this.adminRole === 'admin' || this.adminRole === 'super_admin';
  }
  
  /**
   * 检查是否为超级管理员
   * @returns {boolean} 是否为超级管理员
   */
  isSuperAdmin() {
    return this.adminRole === 'super_admin';
  }
  
  /**
   * 检查是否为普通管理员
   * @returns {boolean} 是否为普通管理员
   */
  isNormalAdmin() {
    return this.adminRole === 'admin';
  }
  
  /**
   * 获取管理员角色显示名称
   * @returns {string} 管理员角色显示名称
   */
  getAdminRoleName() {
    switch (this.adminRole) {
      case 'super_admin':
        return '超级管理员';
      case 'admin':
        return '普通管理员';
      case 'none':
      default:
        return '普通用户';
    }
  }
  
  /**
   * 获取用户状态描述
   * @returns {string} 状态描述
   */
  getStatusDescription() {
    if (this.isPremium()) {
      return '高级用户，无限制创建档案';
    } else if (this.isStudent()) {
      return `学员，可创建${this.profileQuota}个档案`;
    } else if (this.isNormal()) {
      return `探索者，可创建${this.profileQuota}个档案`;
    } else {
      return `临时用户，可创建${this.profileQuota}个档案`;
    }
  }
  
  /**
   * 检查是否可以抽卡
   * @returns {boolean} 是否可以抽卡
   */
  canDrawCard() {
    return this.canDraw === true;
  }
  
  /**
   * 获取抽卡剩余配额
   * @returns {number} 剩余配额，-1表示无限
   */
  getDrawCardRemainingQuota() {
    return this.drawCardRemainingQuota;
  }
  
  /**
   * 获取抽卡总配额
   * @returns {number} 总配额，-1表示无限
   */
  getDrawCardTotalQuota() {
    return this.drawCardTotalQuota;
  }
  
  /**
   * 获取今日已使用抽卡次数
   * @returns {number} 已使用次数
   */
  getDrawCardUsedToday() {
    return this.drawCardUsedToday;
  }
  
  /**
   * 是否无限抽卡配额
   * @returns {boolean} 是否无限
   */
  isDrawCardUnlimited() {
    return this.drawCardTotalQuota === -1;
  }
  
  /**
   * 获取抽卡配额描述
   * @returns {string} 配额描述
   */
  getDrawCardQuotaDescription() {
    if (this.isDrawCardUnlimited()) {
      return '无限次';
    }
    return `今日剩余 ${this.drawCardRemainingQuota}/${this.drawCardTotalQuota} 次`;
  }
  
  /**
   * 转换为简单对象（用于调试或日志）
   * @returns {Object} 简化的用户对象
   */
  toObject() {
    return {
      _id: this._id,
      openid: this.openid,
      nickName: this.nickName,
      userType: this.userType,
      typeName: this.typeName,
      displayName: this.displayName,
      profileQuota: this.profileQuota,
      usedProfiles: this.usedProfiles,
      canCreateMore: this.canCreateMore,
      remainingQuota: this.remainingQuota,
      isActive: this.isActive,
      adminRole: this.adminRole
    };
  }
  
  /**
   * 更新用户信息
   * @param {Object} updateData - 更新数据
   */
  update(updateData) {
    // 更新基本字段
    if (updateData.nickName !== undefined) {
      this.nickName = updateData.nickName;
    }
    if (updateData.avatarUrl !== undefined) {
      this.avatarUrl = updateData.avatarUrl;
    }
    if (updateData.gender !== undefined) {
      this.gender = updateData.gender;
    }
    if (updateData.phoneNumber !== undefined) {
      this.phoneNumber = updateData.phoneNumber;
    }
    
    // 更新用户类型相关字段
    if (updateData.userType !== undefined) {
      this.userType = updateData.userType;
    }
    if (updateData.typeName !== undefined) {
      this.typeName = updateData.typeName;
    }
    if (updateData.displayName !== undefined) {
      this.displayName = updateData.displayName;
    }
    if (updateData.profileQuota !== undefined) {
      this.profileQuota = updateData.profileQuota;
    }
    if (updateData.permissions !== undefined) {
      this.permissions = updateData.permissions;
    }
    if (updateData.usedProfiles !== undefined) {
      this.usedProfiles = updateData.usedProfiles;
    }
    
    // 重新计算计算字段（清除预计算值，让方法重新计算）
    this._canCreateMoreValue = undefined;
    this._remainingQuotaValue = undefined;
    
    // 更新时间戳
    this.updateTime = new Date();
  }
}

module.exports = { UserBean };
