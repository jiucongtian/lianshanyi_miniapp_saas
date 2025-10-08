/**
 * 用户数据Bean
 * 用于处理用户相关的数据格式化和验证
 */
class UserBean {
  constructor(data) {
    // 提供默认值，避免程序崩溃
    this._id = data._id || '';
    this.openid = data.openid || '';
    this.unionid = data.unionid || '';
    this.nickName = data.nickName || '微信用户';
    this.avatarUrl = data.avatarUrl || '';
    this.gender = data.gender || 0;
    this.phoneNumber = data.phoneNumber || '';
    this.createTime = data.createTime || null;
    this.updateTime = data.updateTime || null;
    this.lastLoginTime = data.lastLoginTime || null;
    this.userType = data.userType || data.userTypeCode || 'guest';
    this.registrationTime = data.registrationTime || null;
    this.upgradeTime = data.upgradeTime || null;
    this.usedProfiles = data.usedProfiles || 0;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    
    // 用户类型相关字段（从static_user_types表获取）
    this.typeName = data.typeName || '';
    this.displayName = data.displayName || '';
    this.description = data.description || '';
    this.profileQuota = data.profileQuota || 3;
    this.permissions = data.permissions || [];
    
    // 计算字段（存储原始值，方法会重新计算）
    this._canCreateMoreValue = data.canCreateMore;
    this._remainingQuotaValue = data.remainingQuota;
    
    // 验证关键字段
    this._validate(data);
  }
  
  /**
   * 验证数据完整性
   * @param {Object} data - 原始数据
   */
  _validate(data) {
    // 验证必需字段
    if (!data._id) {
      console.warn('[UserBean] 缺少_id字段');
    }
    
    if (!data.openid) {
      console.warn('[UserBean] 缺少openid字段');
    }
    
    // 验证数据类型
    if (typeof this.profileQuota !== 'number') {
      console.error('[UserBean] profileQuota字段类型错误:', typeof this.profileQuota);
    }
    
    if (!Array.isArray(this.permissions)) {
      console.error('[UserBean] permissions字段类型错误，期望数组，实际:', typeof this.permissions);
    }
    
    if (typeof this.usedProfiles !== 'number') {
      console.error('[UserBean] usedProfiles字段类型错误:', typeof this.usedProfiles);
    }
    
    if (typeof this.isActive !== 'boolean') {
      console.error('[UserBean] isActive字段类型错误:', typeof this.isActive);
    }
    
    // 验证用户类型
    const validUserTypes = ['guest', 'normal', 'premium'];
    if (!validUserTypes.includes(this.userType)) {
      console.warn('[UserBean] 无效的用户类型:', this.userType);
    }
    
    // 验证性别
    if (this.gender !== 0 && this.gender !== 1 && this.gender !== 2) {
      console.warn('[UserBean] 无效的性别值:', this.gender);
    }
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
   * 获取用户状态描述
   * @returns {string} 状态描述
   */
  getStatusDescription() {
    if (this.isPremium()) {
      return '高级用户，无限制创建档案';
    } else if (this.isNormal()) {
      return `探索者，可创建${this.profileQuota}个档案`;
    } else {
      return `临时用户，可创建${this.profileQuota}个档案`;
    }
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
      isActive: this.isActive
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
