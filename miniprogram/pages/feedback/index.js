/**
 * 反馈与建议页面
 * 使用FeedbackController处理业务逻辑
 */
const { FeedbackController } = require('../../controllers/FeedbackController');
const { createModuleLogger } = require('../../utils/logger/index');
const log = createModuleLogger('FeedbackPage');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    feedbackType: 'other',
    title: '',
    content: '',
    submitting: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    log.info('onLoad', '页面加载');
    this.controller = new FeedbackController(this);
    this.controller.initialize();
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    if (this.controller) {
      this.controller.onUnload();
    }
  },

  /**
   * 选择反馈类型
   */
  onTypeChange(e) {
    const type = e.currentTarget.dataset.type;
    log.info('onTypeChange', '选择反馈类型:', type);
    this.controller.selectFeedbackType(type);
  },

  /**
   * 标题输入
   */
  onTitleInput(e) {
    this.controller.onTitleInput(e.detail.value);
  },

  /**
   * 内容输入
   */
  onContentInput(e) {
    this.controller.onContentInput(e.detail.value);
  },

  /**
   * 提交反馈
   */
  onSubmit() {
    log.info('onSubmit', '提交反馈');
    this.controller.submitFeedback();
  }
});

