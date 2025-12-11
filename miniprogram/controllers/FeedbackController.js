/**
 * 反馈控制器
 * 处理反馈提交页面的逻辑
 */
const { BaseController } = require('./BaseController');
const { feedbackService } = require('../services/FeedbackService');

class FeedbackController extends BaseController {
  constructor(page) {
    super(page);
    this.feedbackType = 'other'; // 默认反馈类型
  }
  
  /**
   * 初始化页面
   */
  async initialize() {
    this._log('initialize', '初始化反馈页面');
    
    this._setData({
      feedbackType: this.feedbackType,
      title: '',
      content: '',
      submitting: false,
      titleLength: 0,
      contentLength: 0
    });
  }
  
  /**
   * 选择反馈类型
   * @param {string} type - 反馈类型（problem/suggestion/other）
   */
  selectFeedbackType(type) {
    this._log('selectFeedbackType', '选择反馈类型', { type });
    
    const validTypes = ['problem', 'suggestion', 'other'];
    if (!validTypes.includes(type)) {
      this._error('selectFeedbackType', '无效的反馈类型', { type });
      this._showError('无效的反馈类型');
      return;
    }
    
    this.feedbackType = type;
    this._setData({ feedbackType: type });
  }
  
  /**
   * 标题输入处理
   * @param {string} title - 标题内容
   */
  onTitleInput(title) {
    this._log('onTitleInput', '标题输入', { length: title.length });
    
    this._setData({ 
      title: title,
      titleLength: title.length
    });
  }
  
  /**
   * 内容输入处理
   * @param {string} content - 内容
   */
  onContentInput(content) {
    this._log('onContentInput', '内容输入', { length: content.length });
    
    this._setData({ 
      content: content,
      contentLength: content.length
    });
  }
  
  /**
   * 验证表单数据
   * @returns {Object} 验证结果 { valid: boolean, message: string }
   */
  _validateForm() {
    const { title, content } = this.data;
    
    // 验证标题
    if (!title || title.trim().length === 0) {
      return { valid: false, message: '请输入反馈标题' };
    }
    
    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 10) {
      return { valid: false, message: `标题至少需要10个字符，当前${trimmedTitle.length}个字符` };
    }
    
    if (trimmedTitle.length > 50) {
      return { valid: false, message: `标题最多50个字符，当前${trimmedTitle.length}个字符` };
    }
    
    // 验证内容
    if (!content || content.trim().length === 0) {
      return { valid: false, message: '请输入反馈内容' };
    }
    
    const trimmedContent = content.trim();
    if (trimmedContent.length < 20) {
      return { valid: false, message: `内容至少需要20个字符，当前${trimmedContent.length}个字符` };
    }
    
    if (trimmedContent.length > 500) {
      return { valid: false, message: `内容最多500个字符，当前${trimmedContent.length}个字符` };
    }
    
    return { valid: true, message: '' };
  }
  
  /**
   * 提交反馈
   */
  async submitFeedback() {
    this._log('submitFeedback', '开始提交反馈');
    
    // 验证表单
    const validation = this._validateForm();
    if (!validation.valid) {
      this._error('submitFeedback', '表单验证失败', { message: validation.message });
      this._showError(validation.message);
      return;
    }
    
    const { title, content } = this.data;
    
    // 确认提交
    const confirmed = await this._confirm(
      '确认提交',
      '确定要提交这条反馈吗？',
      '确定',
      '取消'
    );
    
    if (!confirmed) {
      this._log('submitFeedback', '用户取消提交');
      return;
    }
    
    // 设置提交状态
    this._setData({ submitting: true });
    this._showLoading('提交中...');
    
    try {
      // 调用服务层提交反馈
      const response = await feedbackService.submitFeedback({
        feedbackType: this.feedbackType,
        title: title.trim(),
        content: content.trim()
      });
      
      this._hideLoading();
      
      if (response.success) {
        this._log('submitFeedback', '反馈提交成功', { 
          feedbackId: response.data._id 
        });
        
        // 显示成功提示
        this._showSuccess('反馈提交成功，感谢您的反馈！');
        
        // 延迟返回上一页
        setTimeout(() => {
          this._navigateBack();
        }, 1500);
      } else {
        this._error('submitFeedback', '反馈提交失败', { 
          error: response.error 
        });
        
        // 显示错误提示
        this._showError(response.error || '提交失败，请重试');
        
        // 重置提交状态
        this._setData({ submitting: false });
      }
    } catch (error) {
      this._hideLoading();
      this._error('submitFeedback', '提交反馈异常', error);
      this._showError('提交失败，请检查网络连接');
      this._setData({ submitting: false });
    }
  }
  
  /**
   * 重置表单
   */
  resetForm() {
    this._log('resetForm', '重置表单');
    
    this._setData({
      feedbackType: 'other',
      title: '',
      content: '',
      submitting: false,
      titleLength: 0,
      contentLength: 0
    });
    
    this.feedbackType = 'other';
  }
  
  /**
   * 页面卸载时的清理
   */
  onUnload() {
    super.onUnload();
    this._log('onUnload', '页面卸载');
  }
}

module.exports = { FeedbackController };
