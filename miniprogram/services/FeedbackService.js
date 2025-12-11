/**
 * 反馈服务类
 * 提供反馈相关的业务逻辑和云函数调用
 */
const { BaseService } = require('./BaseService');
const { FeedbackBean } = require('../beans/FeedbackBean');

class FeedbackService extends BaseService {
  constructor() {
    super();
    this.serviceName = 'FeedbackService';
  }
  
  /**
   * 提交反馈
   * @param {Object} feedbackData - 反馈数据
   * @param {string} feedbackData.feedbackType - 反馈类型（problem/suggestion/other）
   * @param {string} feedbackData.title - 反馈标题
   * @param {string} feedbackData.content - 反馈内容
   * @returns {Promise<ResponseBean>} 提交结果响应
   */
  async submitFeedback(feedbackData) {
    this._log('submitFeedback', '开始提交反馈', feedbackData);
    
    // 验证必需参数
    const validation = this._validateRequiredParams(feedbackData, ['feedbackType', 'title', 'content']);
    if (!validation.valid) {
      this._error('submitFeedback', '参数验证失败', { missingFields: validation.missingFields });
      return this._createValidationError(validation.missingFields);
    }
    
    // 验证反馈类型
    const validTypes = ['problem', 'suggestion', 'other'];
    if (!validTypes.includes(feedbackData.feedbackType)) {
      this._error('submitFeedback', '反馈类型无效', { feedbackType: feedbackData.feedbackType });
      return this._createValidationError(['feedbackType: 必须是 problem、suggestion 或 other']);
    }
    
    // 验证标题长度
    const title = feedbackData.title.trim();
    if (title.length < 10 || title.length > 50) {
      this._error('submitFeedback', '标题长度不符合要求', { length: title.length });
      return this._createValidationError(['title: 长度必须为10-50个字符']);
    }
    
    // 验证内容长度
    const content = feedbackData.content.trim();
    if (content.length < 20 || content.length > 500) {
      this._error('submitFeedback', '内容长度不符合要求', { length: content.length });
      return this._createValidationError(['content: 长度必须为20-500个字符']);
    }
    
    try {
      // 调用云函数
      const response = await this.callFunction('feedbackManagement', {
        action: 'submitFeedback',
        data: {
          feedbackType: feedbackData.feedbackType,
          title: title,
          content: content
        }
      });
      
      // 如果成功，将data转换为FeedbackBean
      if (response.success && response.data) {
        this._log('submitFeedback', '反馈提交成功', { feedbackId: response.data._id });
        response.data = new FeedbackBean(response.data);
      } else {
        this._error('submitFeedback', '反馈提交失败', { error: response.error });
      }
      
      // 记录服务调用日志
      this._logServiceCall('submitFeedback', feedbackData, response);
      
      return response;
    } catch (error) {
      this._error('submitFeedback', '提交反馈异常', error);
      throw error;
    }
  }
  
  /**
   * 获取用户反馈列表（预留接口，后续扩展）
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码，默认1
   * @param {number} params.limit - 每页数量，默认20
   * @param {string} params.feedbackType - 反馈类型筛选，可选
   * @param {string} params.status - 状态筛选，可选
   * @returns {Promise<ResponseBean>} 反馈列表响应
   */
  async getFeedbackList(params = {}) {
    this._log('getFeedbackList', '获取反馈列表', params);
    
    const { page = 1, limit = 20, feedbackType, status } = params;
    
    try {
      const response = await this.callFunction('feedbackManagement', {
        action: 'getFeedbackList',
        data: {
          page,
          limit,
          feedbackType,
          status
        }
      });
      
      // 如果成功，将列表中的每个项转换为FeedbackBean
      if (response.success && response.data && response.data.items) {
        this._log('getFeedbackList', '反馈列表获取成功', { 
          count: response.data.items.length,
          total: response.data.total 
        });
        
        response.data.items = response.data.items.map(item => new FeedbackBean(item));
      } else {
        this._error('getFeedbackList', '获取反馈列表失败', { error: response.error });
      }
      
      this._logServiceCall('getFeedbackList', params, response);
      
      return response;
    } catch (error) {
      this._error('getFeedbackList', '获取反馈列表异常', error);
      throw error;
    }
  }
  
  /**
   * 获取反馈详情（预留接口，后续扩展）
   * @param {string} feedbackId - 反馈ID
   * @returns {Promise<ResponseBean>} 反馈详情响应
   */
  async getFeedbackDetail(feedbackId) {
    this._log('getFeedbackDetail', '获取反馈详情', { feedbackId });
    
    // 验证参数
    if (!feedbackId) {
      this._error('getFeedbackDetail', '缺少反馈ID');
      return this._createValidationError(['feedbackId']);
    }
    
    try {
      const response = await this.callFunction('feedbackManagement', {
        action: 'getFeedbackDetail',
        data: { feedbackId }
      });
      
      // 如果成功，将data转换为FeedbackBean
      if (response.success && response.data) {
        this._log('getFeedbackDetail', '反馈详情获取成功', { feedbackId });
        response.data = new FeedbackBean(response.data);
      } else {
        this._error('getFeedbackDetail', '获取反馈详情失败', { error: response.error });
      }
      
      this._logServiceCall('getFeedbackDetail', { feedbackId }, response);
      
      return response;
    } catch (error) {
      this._error('getFeedbackDetail', '获取反馈详情异常', error);
      throw error;
    }
  }
  
  /**
   * 删除反馈（预留接口，后续扩展）
   * @param {string} feedbackId - 反馈ID
   * @returns {Promise<ResponseBean>} 删除结果响应
   */
  async deleteFeedback(feedbackId) {
    this._log('deleteFeedback', '删除反馈', { feedbackId });
    
    // 验证参数
    if (!feedbackId) {
      this._error('deleteFeedback', '缺少反馈ID');
      return this._createValidationError(['feedbackId']);
    }
    
    try {
      const response = await this.callFunction('feedbackManagement', {
        action: 'deleteFeedback',
        data: { feedbackId }
      });
      
      this._logServiceCall('deleteFeedback', { feedbackId }, response);
      
      return response;
    } catch (error) {
      this._error('deleteFeedback', '删除反馈异常', error);
      throw error;
    }
  }
}

// 导出类和单例
module.exports = {
  FeedbackService,
  feedbackService: new FeedbackService()
};
