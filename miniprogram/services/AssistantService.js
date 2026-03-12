/**
 * 助学童子服务类
 * 处理聊天相关的业务逻辑，包括消息发送、历史缓存等
 *
 * 调用模式：客户端轮询 Coze Chat API v3
 *   1. startChat      → 云函数创建 Coze 对话，返回 chatId + conversationId（< 1秒）
 *   2. getChatResult（轮询）→ 云函数查询对话状态，完成后取消息内容
 * 优点：单次云函数调用均很短，不受 60 秒超时限制，支持任意长响应时间
 *
 * 本地存储：聊天记录持久化到小程序本地存储
 */
const { BaseService } = require('./BaseService');
const { ResponseBean } = require('../beans/ResponseBean');
const { AssistantMessageBean } = require('../beans/AssistantMessageBean');

const app = getApp();

// 轮询配置
const POLL_INTERVAL = 2000;     // 轮询间隔（毫秒）
const MAX_POLL_ATTEMPTS = 150;  // 最多轮询 150 次，约 5 分钟

// 本地存储配置
const STORAGE_KEYS = {
  CHAT_HISTORY: 'assistant_chat_history',      // 聊天记录
  CONVERSATION_ID: 'assistant_conversation_id' // 会话ID
};
const MAX_HISTORY_COUNT = 100;  // 最大保存消息数量
const MAX_CONTENT_LENGTH = 2000; // 单条消息最大内容长度（用于存储）

class AssistantService extends BaseService {
  constructor() {
    super();
    this._conversationId = null; // 当前会话ID
    this._memoryCache = null;    // 内存缓存（避免频繁读取存储）
  }

  /**
   * 发送消息
   * 步骤1：startChat → 获取 chatId + conversationId（< 1秒）
   * 步骤2：客户端轮询 getChatResult → 直到 status=success
   * @param {string} message - 用户消息内容
   * @returns {Promise<ResponseBean>} 响应，成功时 data 包含 content 和 conversationId
   */
  async sendMessage(message) {
    try {
      if (!message || typeof message !== 'string' || message.trim() === '') {
        return ResponseBean.error('消息内容不能为空', -1);
      }

      this._log('sendMessage', '发送消息', {
        messageLength: message.length,
        conversationId: this._conversationId
      });

      // 步骤 1：创建对话
      const startResponse = await this.callFunction('assistantChat', {
        action: 'startChat',
        message: message.trim(),
        conversationId: this._conversationId
      });

      if (!startResponse.success) {
        return startResponse;
      }

      const { chatId, conversationId } = startResponse.data;
      this._log('sendMessage', '对话已创建', { chatId, conversationId });

      // 步骤 2：轮询结果
      const content = await this._pollChatResult(chatId, conversationId);

      // 保存新的 conversationId（用于下一轮多轮对话）
      this._conversationId = conversationId;
      this._saveConversationIdToStorage(conversationId);

      const response = ResponseBean.success({ content, conversationId });
      this._logServiceCall('sendMessage', { messageLength: message.length }, response);
      return response;
    } catch (error) {
      this._error('sendMessage', '发送消息异常:', error);
      return ResponseBean.error('发送消息失败: ' + error.message, -1);
    }
  }

  /**
   * 轮询对话执行结果，直到完成或超时
   * @param {string} chatId
   * @param {string} conversationId
   * @returns {Promise<string>} 助手回复内容
   * @private
   */
  async _pollChatResult(chatId, conversationId) {
    for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));

      const response = await this.callFunction('assistantChat', {
        action: 'getChatResult',
        chatId,
        conversationId
      });

      if (!response.success) {
        const errMsg = response.error || '查询结果失败';
        this._error('_pollChatResult', `第 ${i + 1} 次轮询失败: ${errMsg}`);
        throw new Error(errMsg);
      }

      const { status, content } = response.data;

      this._log('_pollChatResult', `轮询进度 (${i + 1}/${MAX_POLL_ATTEMPTS})`, { status });

      if (status === 'success') {
        return content || '';
      }
      // status === 'running'，继续轮询
    }

    throw new Error('等待响应超时（超过5分钟）');
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
    this._saveConversationIdToStorage(conversationId);
  }

  /**
   * 清除会话 (开始新对话)
   */
  clearConversation() {
    this._conversationId = null;
    this._memoryCache = null;
    this._clearHistoryStorage();
    this._log('clearConversation', '会话已清除');
  }

  // ==================== 本地存储相关方法 ====================

  /**
   * 从本地存储加载对话历史
   * @returns {Array<AssistantMessageBean>} 消息列表
   */
  loadHistoryFromCache() {
    try {
      // 优先使用内存缓存
      if (this._memoryCache !== null) {
        const messages = AssistantMessageBean.fromJSONArray(this._memoryCache);
        this._log('loadHistoryFromCache', '从内存缓存加载', { count: messages.length });
        return messages;
      }

      // 从本地存储加载
      const history = wx.getStorageSync(STORAGE_KEYS.CHAT_HISTORY);

      if (!Array.isArray(history) || history.length === 0) {
        this._memoryCache = [];
        return [];
      }

      // 更新内存缓存
      this._memoryCache = history;

      // 转换为Bean实例
      const messages = AssistantMessageBean.fromJSONArray(history);
      this._log('loadHistoryFromCache', '从本地存储加载', { count: messages.length });

      return messages;
    } catch (error) {
      this._error('loadHistoryFromCache', '加载历史消息失败:', error);
      this._memoryCache = [];
      return [];
    }
  }

  /**
   * 保存消息到本地存储
   * @param {AssistantMessageBean} message - 消息实例
   */
  saveMessageToCache(message) {
    try {
      if (!message) {
        return;
      }

      // 确保内存缓存已初始化
      if (this._memoryCache === null) {
        this._memoryCache = wx.getStorageSync(STORAGE_KEYS.CHAT_HISTORY) || [];
      }

      // 构造存储对象（截断过长内容以节省空间）
      const messageObj = this._truncateMessageContent(message.toObject());

      // 添加到内存缓存
      this._memoryCache.push(messageObj);

      // 限制消息数量
      if (this._memoryCache.length > MAX_HISTORY_COUNT) {
        // 移除最早的消息对（用户+助手）
        const removeCount = this._memoryCache.length - MAX_HISTORY_COUNT + 10; // 多移除一些避免频繁裁剪
        this._memoryCache = this._memoryCache.slice(removeCount);
        this._log('saveMessageToCache', '裁剪历史消息', { removeCount });
      }

      // 同步到本地存储
      wx.setStorageSync(STORAGE_KEYS.CHAT_HISTORY, this._memoryCache);

      // 同步到 globalData（兼容旧逻辑）
      if (app.globalData) {
        app.globalData.assistantChatHistory = this._memoryCache;
      }

      this._log('saveMessageToCache', '保存消息到本地存储', {
        messageId: message.id,
        role: message.role,
        total: this._memoryCache.length
      });
    } catch (error) {
      this._error('saveMessageToCache', '保存消息失败:', error);
      // 存储失败时尝试清理
      if (error.errMsg && error.errMsg.includes('exceed')) {
        this._handleStorageExceed();
      }
    }
  }

  /**
   * 更新缓存中的消息
   * @param {string} messageId - 消息ID
   * @param {Object} updates - 更新内容
   */
  updateMessageInCache(messageId, updates) {
    try {
      // 确保内存缓存已初始化
      if (this._memoryCache === null) {
        this._memoryCache = wx.getStorageSync(STORAGE_KEYS.CHAT_HISTORY) || [];
      }

      const index = this._memoryCache.findIndex(msg => msg.id === messageId);

      if (index !== -1) {
        // 更新内存缓存
        this._memoryCache[index] = {
          ...this._memoryCache[index],
          ...updates
        };

        // 同步到本地存储
        wx.setStorageSync(STORAGE_KEYS.CHAT_HISTORY, this._memoryCache);

        // 同步到 globalData
        if (app.globalData) {
          app.globalData.assistantChatHistory = this._memoryCache;
        }

        this._log('updateMessageInCache', '更新消息', { messageId });
      }
    } catch (error) {
      this._error('updateMessageInCache', '更新消息失败:', error);
    }
  }

  /**
   * 保存会话ID到本地存储
   * @param {string} conversationId - 会话ID
   * @private
   */
  _saveConversationIdToStorage(conversationId) {
    try {
      wx.setStorageSync(STORAGE_KEYS.CONVERSATION_ID, conversationId);

      // 同步到 globalData
      if (app.globalData) {
        app.globalData.assistantConversationId = conversationId;
      }

      this._log('_saveConversationIdToStorage', '会话ID已保存', { conversationId });
    } catch (error) {
      this._error('_saveConversationIdToStorage', '保存会话ID失败:', error);
    }
  }

  /**
   * 从本地存储加载会话ID
   * @returns {string|null} 会话ID
   */
  loadConversationIdFromCache() {
    try {
      const conversationId = wx.getStorageSync(STORAGE_KEYS.CONVERSATION_ID);

      if (conversationId) {
        this._conversationId = conversationId;

        // 同步到 globalData
        if (app.globalData) {
          app.globalData.assistantConversationId = conversationId;
        }

        this._log('loadConversationIdFromCache', '加载会话ID', { conversationId });
      }

      return this._conversationId;
    } catch (error) {
      this._error('loadConversationIdFromCache', '加载会话ID失败:', error);
      return null;
    }
  }

  /**
   * 清除本地存储的历史记录
   * @private
   */
  _clearHistoryStorage() {
    try {
      // 清除本地存储
      wx.removeStorageSync(STORAGE_KEYS.CHAT_HISTORY);
      wx.removeStorageSync(STORAGE_KEYS.CONVERSATION_ID);

      // 清除内存缓存
      this._memoryCache = [];

      // 清除 globalData
      if (app.globalData) {
        app.globalData.assistantChatHistory = [];
        app.globalData.assistantConversationId = null;
      }

      this._log('_clearHistoryStorage', '本地存储已清除');
    } catch (error) {
      this._error('_clearHistoryStorage', '清除本地存储失败:', error);
    }
  }

  /**
   * 截断消息内容（用于存储优化）
   * @param {Object} messageObj - 消息对象
   * @returns {Object} 处理后的消息对象
   * @private
   */
  _truncateMessageContent(messageObj) {
    if (!messageObj || !messageObj.content) {
      return messageObj;
    }

    // 截断过长的内容
    if (messageObj.content.length > MAX_CONTENT_LENGTH) {
      return {
        ...messageObj,
        content: messageObj.content.substring(0, MAX_CONTENT_LENGTH) + '...',
        fullContent: messageObj.content.substring(0, MAX_CONTENT_LENGTH) + '...',
        truncated: true
      };
    }

    return messageObj;
  }

  /**
   * 处理存储超限
   * @private
   */
  _handleStorageExceed() {
    this._log('_handleStorageExceed', '存储超限，清理旧消息');

    try {
      // 只保留最近的一半消息
      if (this._memoryCache && this._memoryCache.length > 20) {
        this._memoryCache = this._memoryCache.slice(-Math.floor(this._memoryCache.length / 2));
        wx.setStorageSync(STORAGE_KEYS.CHAT_HISTORY, this._memoryCache);

        if (app.globalData) {
          app.globalData.assistantChatHistory = this._memoryCache;
        }
      }
    } catch (error) {
      this._error('_handleStorageExceed', '清理失败:', error);
    }
  }

  /**
   * 检查是否有历史消息
   * @returns {boolean} 是否有历史消息
   */
  hasHistory() {
    if (this._memoryCache !== null) {
      return this._memoryCache.length > 0;
    }

    try {
      const history = wx.getStorageSync(STORAGE_KEYS.CHAT_HISTORY);
      return Array.isArray(history) && history.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取历史消息数量
   * @returns {number} 消息数量
   */
  getHistoryCount() {
    if (this._memoryCache !== null) {
      return this._memoryCache.length;
    }

    try {
      const history = wx.getStorageSync(STORAGE_KEYS.CHAT_HISTORY);
      return Array.isArray(history) ? history.length : 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * 获取存储使用情况
   * @returns {Object} 存储信息
   */
  getStorageInfo() {
    try {
      const history = wx.getStorageSync(STORAGE_KEYS.CHAT_HISTORY) || [];
      const conversationId = wx.getStorageSync(STORAGE_KEYS.CONVERSATION_ID);

      // 估算存储大小
      const historySize = JSON.stringify(history).length;
      const conversationIdSize = conversationId ? conversationId.length : 0;

      return {
        messageCount: history.length,
        historySizeKB: Math.round(historySize / 1024),
        conversationId: conversationId || null,
        maxSize: MAX_HISTORY_COUNT
      };
    } catch (error) {
      return {
        messageCount: 0,
        historySizeKB: 0,
        conversationId: null,
        maxSize: MAX_HISTORY_COUNT,
        error: error.message
      };
    }
  }
}

// 导出类和单例实例
module.exports = {
  AssistantService,
  assistantService: new AssistantService()
};