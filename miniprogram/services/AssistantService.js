/**
 * 助学童子服务类
 * 处理聊天相关的业务逻辑，包括消息发送、历史缓存等
 */
const { BaseService } = require('./BaseService');
const { ResponseBean } = require('../beans/ResponseBean');
const { AssistantMessageBean } = require('../beans/AssistantMessageBean');

const app = getApp();

class AssistantService extends BaseService {
  constructor() {
    super();
    this._conversationId = null; // 当前会话ID
  }

  /**
   * 发送消息
   * @param {string} message - 用户消息内容
   * @returns {Promise<ResponseBean>} 响应，成功时data包含reply和conversationId
   */
  async sendMessage(message) {
    try {
      // 验证参数
      if (!message || typeof message !== 'string' || message.trim() === '') {
        return ResponseBean.error('消息内容不能为空', -1);
      }

      this._log('sendMessage', '发送消息', {
        messageLength: message.length,
        conversationId: this._conversationId
      });

      const response = await this.callFunction('assistantChat', {
        message: message.trim(),
        conversationId: this._conversationId
      });

      this._logServiceCall('sendMessage', { messageLength: message.length }, response);

      // 成功时保存会话ID
      if (response.success && response.data) {
        this._conversationId = response.data.conversationId;

        // 保存到globalData缓存
        this._saveConversationId(this._conversationId);
      }

      return response;
    } catch (error) {
      this._error('sendMessage', '发送消息异常:', error);
      return ResponseBean.error('发送消息失败: ' + error.message, -1);
    }
  }

  /**
   * 获取当前会话ID
   * @returns {string|null} 会话ID
   */
  getConversationId() {
    return this._conversationId;
  }

  /**
   * 设置会话ID
   * @param {string} conversationId - 会话ID
   */
  setConversationId(conversationId) {
    this._conversationId = conversationId;
    this._saveConversationId(conversationId);
  }

  /**
   * 清除会话 (开始新对话)
   */
  clearConversation() {
    this._conversationId = null;
    this._clearHistoryCache();
    this._log('clearConversation', '会话已清除');
  }

  /**
   * 从缓存加载对话历史
   * @returns {Array<AssistantMessageBean>} 消息列表
   */
  loadHistoryFromCache() {
    try {
      const history = app.globalData?.assistantChatHistory || [];

      if (!Array.isArray(history) || history.length === 0) {
        return [];
      }

      // 转换为Bean实例
      const messages = AssistantMessageBean.fromJSONArray(history);

      this._log('loadHistoryFromCache', '加载历史消息', { count: messages.length });

      return messages;
    } catch (error) {
      this._error('loadHistoryFromCache', '加载历史消息失败:', error);
      return [];
    }
  }

  /**
   * 保存消息到缓存
   * @param {AssistantMessageBean} message - 消息实例
   */
  saveMessageToCache(message) {
    try {
      if (!message) {
        return;
      }

      // 初始化缓存
      if (!app.globalData.assistantChatHistory) {
        app.globalData.assistantChatHistory = [];
      }

      // 添加消息
      app.globalData.assistantChatHistory.push(message.toObject());

      this._log('saveMessageToCache', '保存消息到缓存', {
        messageId: message.id,
        role: message.role
      });
    } catch (error) {
      this._error('saveMessageToCache', '保存消息到缓存失败:', error);
    }
  }

  /**
   * 更新缓存中的消息
   * @param {string} messageId - 消息ID
   * @param {Object} updates - 更新内容
   */
  updateMessageInCache(messageId, updates) {
    try {
      const history = app.globalData?.assistantChatHistory || [];
      const index = history.findIndex(msg => msg.id === messageId);

      if (index !== -1) {
        app.globalData.assistantChatHistory[index] = {
          ...history[index],
          ...updates
        };
        this._log('updateMessageInCache', '更新消息', { messageId });
      }
    } catch (error) {
      this._error('updateMessageInCache', '更新消息失败:', error);
    }
  }

  /**
   * 保存会话ID到缓存
   * @param {string} conversationId - 会话ID
   * @private
   */
  _saveConversationId(conversationId) {
    try {
      if (!app.globalData) {
        return;
      }
      app.globalData.assistantConversationId = conversationId;
    } catch (error) {
      this._error('_saveConversationId', '保存会话ID失败:', error);
    }
  }

  /**
   * 从缓存加载会话ID
   * @returns {string|null} 会话ID
   */
  loadConversationIdFromCache() {
    const conversationId = app.globalData?.assistantConversationId || null;

    if (conversationId) {
      this._conversationId = conversationId;
      this._log('loadConversationIdFromCache', '加载会话ID', { conversationId });
    }

    return this._conversationId;
  }

  /**
   * 清除历史缓存
   * @private
   */
  _clearHistoryCache() {
    try {
      if (app.globalData) {
        app.globalData.assistantChatHistory = [];
        app.globalData.assistantConversationId = null;
      }
    } catch (error) {
      this._error('_clearHistoryCache', '清除历史缓存失败:', error);
    }
  }

  /**
   * 检查是否有历史消息
   * @returns {boolean} 是否有历史消息
   */
  hasHistory() {
    const history = app.globalData?.assistantChatHistory || [];
    return Array.isArray(history) && history.length > 0;
  }

  /**
   * 获取历史消息数量
   * @returns {number} 消息数量
   */
  getHistoryCount() {
    const history = app.globalData?.assistantChatHistory || [];
    return Array.isArray(history) ? history.length : 0;
  }
}

// 导出类和单例实例
module.exports = {
  AssistantService,
  assistantService: new AssistantService()
};