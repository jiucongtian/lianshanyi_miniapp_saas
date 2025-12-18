/**
 * 反馈控制器
 * 负责反馈页面的业务逻辑处理
 */
const { feedbackService } = require('../services/FeedbackService');
const { createModuleLogger } = require('../utils/logger/index');

const log = createModuleLogger('FeedbackController');

class FeedbackController {
  /**
   * 构造函数
   * @param {Object} page - 页面实例
   */
  constructor(page) {
    this.page = page;
  }
  
  /**
   * 初始化
   */
  async initialize() {
    log.info('initialize', '初始化反馈控制器');
    
    // 初始化页面数据
    this.page.setData({
      feedbackType: 'other',
      title: '',
      content: '',
      submitting: false
    });
  }
  
  /**
   * 页面卸载
   */
  onUnload() {
    log.info('onUnload', '页面卸载');
  }
  
  /**
   * 选择反馈类型
   * @param {string} type - 反馈类型 (problem/suggestion/other)
   */
  selectFeedbackType(type) {
    log.info('selectFeedbackType', '选择反馈类型:', type);
    
    const validTypes = ['problem', 'suggestion', 'other'];
    if (!validTypes.includes(type)) {
      log.warn('selectFeedbackType', '无效的反馈类型:', type);
      return;
    }
    
    this.page.setData({
      feedbackType: type
    });
  }
  
  /**
   * 标题输入
   * @param {string} value - 输入值
   */
  onTitleInput(value) {
    this.page.setData({
      title: value
    });
  }
  
  /**
   * 内容输入
   * @param {string} value - 输入值
   */
  onContentInput(value) {
    this.page.setData({
      content: value
    });
  }
  
  /**
   * 验证表单数据
   * @returns {Object} { valid: boolean, message: string }
   */
  _validateForm() {
    const { feedbackType, title, content } = this.page.data;
    
    // 验证反馈类型
    const validTypes = ['problem', 'suggestion', 'other'];
    if (!validTypes.includes(feedbackType)) {
      return { valid: false, message: '请选择反馈类型' };
    }
    
    // 验证标题
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return { valid: false, message: '请输入反馈标题' };
    }
    
    if (trimmedTitle.length < 10) {
      return { valid: false, message: '标题至少需要10个字符' };
    }
    
    if (trimmedTitle.length > 50) {
      return { valid: false, message: '标题不能超过50个字符' };
    }
    
    // 验证内容
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      return { valid: false, message: '请输入反馈内容' };
    }
    
    if (trimmedContent.length < 20) {
      return { valid: false, message: '内容至少需要20个字符' };
    }
    
    if (trimmedContent.length > 500) {
      return { valid: false, message: '内容不能超过500个字符' };
    }
    
    return { valid: true };
  }
  
  /**
   * 提交反馈
   */
  async submitFeedback() {
    log.info('submitFeedback', '准备提交反馈');
    
    // 验证表单
    const validation = this._validateForm();
    if (!validation.valid) {
      this._showToast(validation.message, 'none');
      return;
    }
    
    const { feedbackType, title, content } = this.page.data;
    
    // 显示确认对话框
    const confirmed = await this._confirm(
      '确认提交',
      '确定要提交这条反馈吗？'
    );
    
    if (!confirmed) {
      log.info('submitFeedback', '用户取消提交');
      return;
    }
    
    // 设置提交状态
    this.page.setData({ submitting: true });
    
    wx.showLoading({
      title: '提交中...',
      mask: true
    });
    
    try {
      // 调用服务提交反馈
      const response = await feedbackService.submitFeedback({
        feedbackType,
        title: title.trim(),
        content: content.trim()
      });
      
      wx.hideLoading();
      
      if (response.success) {
        log.info('submitFeedback', '提交成功');
        
        // 显示成功提示
        await this._showModal(
          '提交成功',
          '感谢您的反馈！我们会认真处理您的意见。'
        );
        
        // 返回上一页
        wx.navigateBack();
      } else {
        log.error('submitFeedback', '提交失败:', response.error);
        this._showToast(response.error || '提交失败', 'error');
      }
    } catch (error) {
      log.error('submitFeedback', '提交异常:', error);
      wx.hideLoading();
      this._showToast('提交失败，请重试', 'error');
    } finally {
      this.page.setData({ submitting: false });
    }
  }
  
  /**
   * 显示Toast提示
   * @param {string} title - 提示文本
   * @param {string} icon - 图标类型
   */
  _showToast(title, icon = 'none') {
    wx.showToast({
      title,
      icon,
      duration: 2000
    });
  }
  
  /**
   * 显示确认对话框
   * @param {string} title - 标题
   * @param {string} content - 内容
   * @returns {Promise<boolean>}
   */
  _confirm(title, content) {
    return new Promise((resolve) => {
      wx.showModal({
        title,
        content,
        success: (res) => {
          resolve(res.confirm);
        },
        fail: () => {
          resolve(false);
        }
      });
    });
  }
  
  /**
   * 显示模态对话框
   * @param {string} title - 标题
   * @param {string} content - 内容
   * @returns {Promise<void>}
   */
  _showModal(title, content) {
    return new Promise((resolve) => {
      wx.showModal({
        title,
        content,
        showCancel: false,
        success: () => {
          resolve();
        }
      });
    });
  }
}

module.exports = {
  FeedbackController
};
