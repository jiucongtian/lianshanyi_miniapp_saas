/**
 * 助学童子控制器
 * 处理聊天页面的业务逻辑，包括消息发送、打字机效果等
 */
const { BaseController } = require('./BaseController');
const { assistantService } = require('../services/AssistantService');
const { AssistantMessageBean } = require('../beans/AssistantMessageBean');

// 打字机效果配置
const TYPING_CONFIG = {
  charsPerTick: 3,      // 每次显示的字符数
  interval: 50,         // 每次显示的间隔（毫秒）
  maxRetries: 3         // 发送失败最大重试次数
};

class AssistantController extends BaseController {
  /**
   * 构造函数
   * @param {Object} page - 页面实例
   */
  constructor(page) {
    super(page);

    // 消息列表
    this.messages = [];

    // 打字机定时器
    this._typingTimer = null;

    // 当前正在显示的消息ID
    this._currentTypingMessageId = null;

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
      // 设置初始状态
      this._setData({
        loading: false,
        messages: [],
        inputValue: '',
        isTyping: false,
        sendDisabled: true,
        hasPermission: false,
        showUpgradeTip: false
      });

      // 检查权限
      const hasPermission = await this.checkPermission();

      if (!hasPermission) {
        this._setData({
          showUpgradeTip: true,
          loading: false
        });
        return;
      }

      // 有权限，加载历史消息
      this._setData({ hasPermission: true });

      // 加载历史消息
      this._loadHistory();

      // 加载会话ID
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
      // 加载用户信息
      const user = await this.loadUserInfo();

      if (!user) {
        this._log('checkPermission', '无法获取用户信息');
        return false;
      }

      // 检查是否为管理员（任意级别）
      const hasPermission = user.isAdmin();

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
    // 防止重复发送
    if (this._isSending) {
      this._log('sendMessage', '正在发送中，忽略重复请求');
      return;
    }

    // 验证内容
    if (!content || typeof content !== 'string' || content.trim() === '') {
      this._showMessage('请输入消息内容');
      return;
    }

    this._isSending = true;
    this._setData({ sendDisabled: true });

    try {
      // 创建用户消息
      const userMessage = AssistantMessageBean.createUserMessage(content.trim());

      // 添加用户消息到列表
      this._addMessage(userMessage);

      // 清空输入框
      this._setData({ inputValue: '' });
      this._inputValue = '';

      // 创建助手消息（先显示加载状态）
      const assistantMessage = AssistantMessageBean.createAssistantMessage('');
      this._addMessage(assistantMessage);

      // 更新UI显示加载中
      this._setData({ isTyping: true });

      // 发送请求
      const response = await assistantService.sendMessage(content.trim());

      if (response.success && response.data && response.data.content) {
        // 更新助手消息内容
        assistantMessage.fullContent = response.data.content;
        assistantMessage.conversationId = response.data.conversationId;

        // 保存消息到缓存
        assistantService.saveMessageToCache(userMessage);
        assistantService.saveMessageToCache(assistantMessage);

        // 开始打字机效果
        this._startTypingEffect(assistantMessage);
      } else {
        // 发送失败
        this._removeMessage(assistantMessage.id);
        this._showError(response.error || '发送失败，请重试');
        this._setData({ isTyping: false, sendDisabled: false });
        this._isSending = false;
      }
    } catch (error) {
      this._error('sendMessage', '发送消息异常:', error);
      this._showError('发送失败，请重试');
      this._setData({ isTyping: false, sendDisabled: false });
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

    if (!confirmed) {
      return;
    }

    // 停止打字机效果
    this._stopTypingEffect();

    // 清除消息
    this.messages = [];

    // 只清除历史记录，保持会话ID
    assistantService.clearHistoryOnly();

    // 更新UI
    this._setData({
      messages: [],
      isTyping: false,
      sendDisabled: false
    });

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

    if (!confirmed) {
      return;
    }

    // 停止打字机效果
    this._stopTypingEffect();

    // 清除消息
    this.messages = [];

    // 清除会话ID和历史记录
    assistantService.startNewConversation();

    // 更新UI
    this._setData({
      messages: [],
      isTyping: false,
      sendDisabled: false
    });

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
   * 页面卸载时清理
   */
  onUnload() {
    this._stopTypingEffect();
    super.onUnload();
  }

  /**
   * 页面隐藏时清理
   */
  onHide() {
    // 页面隐藏时停止打字机效果，但不清除数据
    this._stopTypingEffect();
    super.onHide();
  }

  /**
   * 返回上一页或跳转到升级页面
   */
  goBack() {
    if (this.data.showUpgradeTip) {
      // 没有权限，跳转到首页
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
      this._setData({
        messages: AssistantMessageBean.toObjectArray(history)
      });
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
    this._setData({
      messages: AssistantMessageBean.toObjectArray(this.messages)
    });

    // 滚动到底部
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
      this._setData({
        messages: AssistantMessageBean.toObjectArray(this.messages)
      });
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
      this._setData({
        messages: AssistantMessageBean.toObjectArray(this.messages)
      });
    }
  }

  /**
   * 开始打字机效果
   * @param {AssistantMessageBean} message - 消息实例
   * @private
   */
  _startTypingEffect(message) {
    this._stopTypingEffect();

    this._currentTypingMessageId = message.id;
    const fullContent = message.fullContent;
    let currentIndex = 0;

    this._typingTimer = setInterval(() => {
      currentIndex += TYPING_CONFIG.charsPerTick;

      if (currentIndex >= fullContent.length) {
        // 打字完成
        this._stopTypingEffect();
        message.finishTyping();
        this._updateMessage(message.id, {
          content: message.content,
          isTyping: false
        });
        this._setData({
          isTyping: false,
          sendDisabled: false
        });
        this._isSending = false;
      } else {
        // 继续打字
        const currentContent = fullContent.substring(0, currentIndex);
        message.updateContent(currentContent);
        this._updateMessage(message.id, {
          content: currentContent
        });
      }

      // 滚动到底部
      this._scrollToBottom();
    }, TYPING_CONFIG.interval);
  }

  /**
   * 停止打字机效果
   * @private
   */
  _stopTypingEffect() {
    if (this._typingTimer) {
      clearInterval(this._typingTimer);
      this._typingTimer = null;
    }
    this._currentTypingMessageId = null;
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