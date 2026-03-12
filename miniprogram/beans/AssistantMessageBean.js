/**
 * 助学童子消息Bean
 * 用于存储和格式化聊天消息数据
 */
const { BaseClass } = require('../common/BaseClass');

class AssistantMessageBean extends BaseClass {
  /**
   * 构造函数
   * @param {Object} data - 消息数据
   */
  constructor(data = {}) {
    super();

    // 消息ID (用于前端唯一标识)
    this.id = data.id || this._generateId();

    // 消息角色: 'user' 或 'assistant'
    this.role = data.role || 'user';

    // 消息内容
    this.content = data.content || '';

    // 完整内容 (用于打字机效果，存储完整内容)
    this.fullContent = data.fullContent || data.content || '';

    // 是否正在显示 (打字机效果)
    this.isTyping = data.isTyping || false;

    // 消息时间戳
    this.timestamp = data.timestamp || new Date().getTime();

    // 格式化的时间显示
    this.displayTime = data.displayTime || this._formatTime(this.timestamp);

    // 会话ID (用于多轮对话)
    this.conversationId = data.conversationId || null;
  }

  /**
   * 生成唯一ID
   * @returns {string} 唯一ID
   * @private
   */
  _generateId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 格式化时间显示
   * @param {number} timestamp - 时间戳
   * @returns {string} 格式化的时间
   * @private
   */
  _formatTime(timestamp) {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * 创建用户消息
   * @param {string} content - 消息内容
   * @returns {AssistantMessageBean} 消息实例
   */
  static createUserMessage(content) {
    return new AssistantMessageBean({
      role: 'user',
      content: content,
      fullContent: content,
      isTyping: false
    });
  }

  /**
   * 创建助手消息
   * @param {string} content - 消息内容
   * @param {string} conversationId - 会话ID
   * @returns {AssistantMessageBean} 消息实例
   */
  static createAssistantMessage(content, conversationId = null) {
    return new AssistantMessageBean({
      role: 'assistant',
      content: '',
      fullContent: content,
      isTyping: true,
      conversationId: conversationId
    });
  }

  /**
   * 更新内容 (用于打字机效果)
   * @param {string} content - 当前显示的内容
   */
  updateContent(content) {
    this.content = content;
  }

  /**
   * 完成打字效果
   */
  finishTyping() {
    this.content = this.fullContent;
    this.isTyping = false;
  }

  /**
   * 检查是否为用户消息
   * @returns {boolean} 是否为用户消息
   */
  isUserMessage() {
    return this.role === 'user';
  }

  /**
   * 检查是否为助手消息
   * @returns {boolean} 是否为助手消息
   */
  isAssistantMessage() {
    return this.role === 'assistant';
  }

  /**
   * 转换为简单对象 (用于页面显示)
   * @returns {Object} 简单对象
   */
  toObject() {
    return {
      id: this.id,
      role: this.role,
      content: this.content,
      fullContent: this.fullContent,
      isTyping: this.isTyping,
      timestamp: this.timestamp,
      displayTime: this.displayTime,
      conversationId: this.conversationId
    };
  }

  /**
   * 转换为Coze API消息格式
   * @returns {Object} Coze API消息格式
   */
  toCozeFormat() {
    return {
      role: this.role,
      content: this.fullContent,
      content_type: 'text'
    };
  }

  /**
   * 从JSON数据创建消息实例
   * @param {Object} json - JSON数据
   * @returns {AssistantMessageBean} 消息实例
   */
  static fromJSON(json) {
    return new AssistantMessageBean(json);
  }

  /**
   * 批量从JSON数据创建消息实例
   * @param {Array} jsonArray - JSON数组
   * @returns {Array<AssistantMessageBean>} 消息实例数组
   */
  static fromJSONArray(jsonArray) {
    if (!Array.isArray(jsonArray)) {
      return [];
    }
    return jsonArray.map(json => AssistantMessageBean.fromJSON(json));
  }

  /**
   * 批量转换为简单对象数组
   * @param {Array<AssistantMessageBean>} messages - 消息实例数组
   * @returns {Array} 简单对象数组
   */
  static toObjectArray(messages) {
    if (!Array.isArray(messages)) {
      return [];
    }
    return messages.map(msg => msg.toObject());
  }
}

module.exports = { AssistantMessageBean };