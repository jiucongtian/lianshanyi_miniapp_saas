/**
 * 反馈数据Bean
 * 用于处理用户反馈相关的数据格式化和验证
 */
const { BaseBean } = require('./BaseBean');

class FeedbackBean extends BaseBean {
  constructor(data) {
    super(data); // 调用BaseBean构造函数
    
    // 使用BaseBean提供的_getField方法提取字段
    this._id = this._getField(this.data, '_id', '', 'string');
    this.userId = this._getField(this.data, 'userId', '', 'string');
    this.openid = this._getField(this.data, 'openid', '', 'string');
    this.feedbackType = this._getField(this.data, 'feedbackType', 'other', 'string');
    this.title = this._getField(this.data, 'title', '', 'string');
    this.content = this._getField(this.data, 'content', '', 'string');
    this.status = this._getField(this.data, 'status', 'pending', 'string');
    this.adminReply = this._getField(this.data, 'adminReply', null);
    this.adminId = this._getField(this.data, 'adminId', null);
    this.replyTime = this._getField(this.data, 'replyTime', null);
    this.createTime = this._getField(this.data, 'createTime', null);
    this.updateTime = this._getField(this.data, 'updateTime', null);
    this.isDeleted = this._getField(this.data, 'isDeleted', false, 'boolean');
    
    // 验证关键字段
    this._validate();
  }
  
  /**
   * 验证数据完整性
   */
  _validate() {
    // 验证必需字段
    this._validateRequiredField('_id', this._id);
    this._validateRequiredField('userId', this.userId);
    this._validateRequiredField('openid', this.openid);
    this._validateRequiredField('title', this.title);
    this._validateRequiredField('content', this.content);
    
    // 验证数据类型
    this._validateFieldType('feedbackType', this.feedbackType, 'string');
    this._validateFieldType('status', this.status, 'string');
    this._validateFieldType('isDeleted', this.isDeleted, 'boolean');
    
    // 验证反馈类型枚举
    const validTypes = ['problem', 'suggestion', 'other'];
    if (!validTypes.includes(this.feedbackType)) {
      this._addValidationError('feedbackType', `无效的反馈类型: ${this.feedbackType}`);
    }
    
    // 验证状态枚举
    const validStatuses = ['pending', 'processing', 'resolved', 'closed'];
    if (!validStatuses.includes(this.status)) {
      this._addValidationError('status', `无效的反馈状态: ${this.status}`);
    }
    
    // 验证标题长度
    if (this.title.length < 10 || this.title.length > 50) {
      this._addValidationError('title', `标题长度应为10-50个字符，实际: ${this.title.length}`);
    }
    
    // 验证内容长度
    if (this.content.length < 20 || this.content.length > 500) {
      this._addValidationError('content', `内容长度应为20-500个字符，实际: ${this.content.length}`);
    }
    
    // 标记为已验证
    this._isValidated = true;
  }
  
  /**
   * 获取反馈类型显示文本
   * @returns {string} 反馈类型文本
   */
  getTypeText() {
    const typeMap = {
      problem: '问题反馈',
      suggestion: '功能建议',
      other: '其他反馈'
    };
    return typeMap[this.feedbackType] || '其他反馈';
  }
  
  /**
   * 获取反馈状态显示文本
   * @returns {string} 状态文本
   */
  getStatusText() {
    const statusMap = {
      pending: '待处理',
      processing: '处理中',
      resolved: '已处理',
      closed: '已关闭'
    };
    return statusMap[this.status] || '未知';
  }
  
  /**
   * 获取格式化的创建时间
   * @returns {string} 格式化的时间字符串
   */
  getCreateTimeText() {
    if (!this.createTime) {
      return '未知';
    }
    
    const date = new Date(this.createTime);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hour}:${minute}`;
  }
  
  /**
   * 获取格式化的更新时间
   * @returns {string} 格式化的时间字符串
   */
  getUpdateTimeText() {
    if (!this.updateTime) {
      return '未知';
    }
    
    const date = new Date(this.updateTime);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hour}:${minute}`;
  }
  
  /**
   * 检查是否有管理员回复
   * @returns {boolean} 是否有回复
   */
  hasAdminReply() {
    return !!this.adminReply && this.adminReply.trim().length > 0;
  }
  
  /**
   * 检查是否为问题反馈
   * @returns {boolean} 是否为问题反馈
   */
  isProblem() {
    return this.feedbackType === 'problem';
  }
  
  /**
   * 检查是否为功能建议
   * @returns {boolean} 是否为功能建议
   */
  isSuggestion() {
    return this.feedbackType === 'suggestion';
  }
  
  /**
   * 检查是否为其他反馈
   * @returns {boolean} 是否为其他反馈
   */
  isOther() {
    return this.feedbackType === 'other';
  }
  
  /**
   * 检查是否为待处理状态
   * @returns {boolean} 是否待处理
   */
  isPending() {
    return this.status === 'pending';
  }
  
  /**
   * 检查是否为处理中状态
   * @returns {boolean} 是否处理中
   */
  isProcessing() {
    return this.status === 'processing';
  }
  
  /**
   * 检查是否已处理
   * @returns {boolean} 是否已处理
   */
  isResolved() {
    return this.status === 'resolved';
  }
  
  /**
   * 检查是否已关闭
   * @returns {boolean} 是否已关闭
   */
  isClosed() {
    return this.status === 'closed';
  }
  
  /**
   * 检查是否已删除
   * @returns {boolean} 是否已删除
   */
  isDeleted() {
    return this.isDeleted === true;
  }
  
  /**
   * 获取反馈摘要（用于列表显示）
   * @param {number} maxLength - 最大长度，默认50
   * @returns {string} 摘要文本
   */
  getSummary(maxLength = 50) {
    if (this.content.length <= maxLength) {
      return this.content;
    }
    return this.content.substring(0, maxLength) + '...';
  }
  
  /**
   * 转换为简单对象（用于调试或日志）
   * @returns {Object} 简化的反馈对象
   */
  toObject() {
    return {
      _id: this._id,
      userId: this.userId,
      openid: this.openid,
      feedbackType: this.feedbackType,
      typeText: this.getTypeText(),
      title: this.title,
      content: this.content,
      status: this.status,
      statusText: this.getStatusText(),
      hasAdminReply: this.hasAdminReply(),
      createTime: this.createTime,
      createTimeText: this.getCreateTimeText(),
      isDeleted: this.isDeleted
    };
  }
}

module.exports = { FeedbackBean };
