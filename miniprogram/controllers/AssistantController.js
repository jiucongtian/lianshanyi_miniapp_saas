/**
 * 助学童子控制器
 * 处理聊天页面的业务逻辑，包括消息发送、响应展示等
 */
const { BaseController } = require('./BaseController');
const { assistantService } = require('../services/AssistantService');
const { AssistantMessageBean } = require('../beans/AssistantMessageBean');
const { markdownToHtml } = require('../utils/markdownParser');

class AssistantController extends BaseController {
  /**
   * 构造函数
   * @param {Object} page - 页面实例
   */
  constructor(page) {
    super(page);

    // 消息列表
    this.messages = [];

    // 是否正在发送消息
    this._isSending = false;

    // 输入框内容
    this._inputValue = '';
  }

  // ==================== 公共方法 ====================

  /**
   * 初始化页面
   */
  async initialize() {
    this._log('initialize', '开始初始化聊天页面');

    try {
      this._setData({
        loading: false,
        messages: [],
        inputValue: '',
        sendDisabled: true,
        hasPermission: false,
        showUpgradeTip: false
      });

      const hasPermission = await this.checkPermission();

      if (!hasPermission) {
        this._setData({ showUpgradeTip: true, loading: false });
        return;
      }

      this._setData({ hasPermission: true });
      this._loadHistory();
      assistantService.loadConversationIdFromCache();

      this._log('initialize', '聊天页面初始化完成');
    } catch (error) {
      this._error('initialize', '初始化失败:', error);
      this._handleError(error, '初始化');
    }
  }

  /**
   * 检查用户权限
   * @returns {Promise<boolean>} 是否有权限
   */
  async checkPermission() {
    try {
      const user = await this.loadUserInfo();

      if (!user) {
        this._log('checkPermission', '无法获取用户信息');
        return false;
      }

      const hasPermission = user.isAdmin() || user.isStudent() || user.isPremium();

      this._log('checkPermission', '权限检查结果', {
        userType: user.userType,
        hasPermission
      });

      return hasPermission;
    } catch (error) {
      this._error('checkPermission', '权限检查失败:', error);
      return false;
    }
  }

  /**
   * 发送消息
   * @param {string} content - 消息内容
   */
  async sendMessage(content) {
    if (this._isSending) {
      this._log('sendMessage', '正在发送中，忽略重复请求');
      return;
    }

    if (!content || typeof content !== 'string' || content.trim() === '') {
      this._showMessage('请输入消息内容');
      return;
    }

    this._isSending = true;
    this._setData({ sendDisabled: true });

    // 创建并展示用户消息
    const userMessage = AssistantMessageBean.createUserMessage(content.trim());
    this._addMessage(userMessage);
    this._setData({ inputValue: '' });
    this._inputValue = '';

    // 添加加载占位消息
    const placeholder = AssistantMessageBean.createAssistantPlaceholder();
    this._addMessage(placeholder);

    try {
      const response = await assistantService.sendMessage(content.trim());

      if (response.success && response.data && response.data.content) {
        // 更新占位消息为完整内容
        placeholder.content = response.data.content;
        placeholder.isLoading = false;
        placeholder.conversationId = response.data.conversationId;

        assistantService.saveMessageToCache(userMessage);
        assistantService.saveMessageToCache(placeholder);

        this._updateMessage(placeholder.id, {
          content: placeholder.content,
          isLoading: false,
          conversationId: placeholder.conversationId
        });
      } else {
        this._removeMessage(placeholder.id);
        this._showError(response.error || '发送失败，请重试');
      }
    } catch (error) {
      this._error('sendMessage', '发送消息异常:', error);
      this._removeMessage(placeholder.id);
      this._showError('发送失败，请重试');
    } finally {
      this._setData({ sendDisabled: false });
      this._isSending = false;
    }
  }

  /**
   * 清除历史对话（保持会话ID）
   */
  async clearHistory() {
    const confirmed = await this._confirm(
      '清除对话',
      '确定要清除所有对话记录吗？\n清除后，AI 仍会记住之前的对话上下文。',
      '确定',
      '取消'
    );

    if (!confirmed) return;

    this.messages = [];
    assistantService.clearHistoryOnly();
    this._setData({ messages: [], sendDisabled: false });
    this._showSuccess('对话已清除');
    this._log('clearHistory', '对话历史已清除');
  }

  /**
   * 开启新会话（清除会话ID和历史记录）
   */
  async startNewConversation() {
    const confirmed = await this._confirm(
      '开启新会话',
      '确定要开启新会话吗？\n这将清除所有对话记录，AI 将不再记住之前的对话内容。',
      '确定',
      '取消'
    );

    if (!confirmed) return;

    this.messages = [];
    assistantService.startNewConversation();
    this._setData({ messages: [], sendDisabled: false });
    this._showSuccess('新会话已开启');
    this._log('startNewConversation', '新会话已开启');
  }

  /**
   * 更新输入框内容
   * @param {string} value - 输入内容
   */
  updateInputValue(value) {
    this._inputValue = value;
    this._setData({
      inputValue: value,
      sendDisabled: !value || value.trim() === ''
    });
  }

  /**
   * 返回上一页或跳转到升级页面
   */
  goBack() {
    if (this.data.showUpgradeTip) {
      this._switchTab('/pages/home/index');
    } else {
      this._navigateBack();
    }
  }

  // ==================== 私有方法 ====================

  /**
   * 加载历史消息
   * @private
   */
  _loadHistory() {
    const history = assistantService.loadHistoryFromCache();

    if (history.length > 0) {
      this.messages = history;
      this._setData({ messages: this._buildDisplayMessages(history) });
      this._log('_loadHistory', '加载历史消息', { count: history.length });
    }
  }

  /**
   * 添加消息到列表
   * @param {AssistantMessageBean} message - 消息实例
   * @private
   */
  _addMessage(message) {
    this.messages.push(message);
    this._setData({ messages: this._buildDisplayMessages() });
    this._scrollToBottom();
  }

  /**
   * 移除消息
   * @param {string} messageId - 消息ID
   * @private
   */
  _removeMessage(messageId) {
    const index = this.messages.findIndex(msg => msg.id === messageId);
    if (index !== -1) {
      this.messages.splice(index, 1);
      this._setData({ messages: this._buildDisplayMessages() });
    }
  }

  /**
   * 更新消息
   * @param {string} messageId - 消息ID
   * @param {Object} updates - 更新内容
   * @private
   */
  _updateMessage(messageId, updates) {
    const index = this.messages.findIndex(msg => msg.id === messageId);
    if (index !== -1) {
      Object.assign(this.messages[index], updates);
      this._setData({ messages: this._buildDisplayMessages() });
      this._scrollToBottom();
    }
  }

  /**
   * 将消息列表转为页面数据，为已完成的助手消息附加 htmlContent
   * @param {Array<AssistantMessageBean>} messagesArray - 消息实例数组，默认 this.messages
   * @returns {Array<Object>} 带 htmlContent 的消息对象数组
   * @private
   */
  _buildDisplayMessages(messagesArray) {
    const source = messagesArray || this.messages;
    const list = AssistantMessageBean.toObjectArray(source);
    for (const msg of list) {
      if (msg.role === 'user' || msg.isLoading || !msg.content) continue;
      try {
        msg.htmlContent = markdownToHtml(msg.content);
      } catch (e) {
        msg.htmlContent = '';
      }
    }
    return list;
  }

  /**
   * 滚动到底部
   * @private
   */
  _scrollToBottom() {
    wx.nextTick(() => {
      this.page.scrollToBottom && this.page.scrollToBottom();
    });
  }
}

module.exports = { AssistantController };
