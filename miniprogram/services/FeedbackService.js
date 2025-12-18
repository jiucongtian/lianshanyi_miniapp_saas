/**
 * 反馈服务类
 * 负责反馈相关的业务逻辑和云函数调用
 */
const { BaseService } = require('./BaseService');
const { ResponseBean } = require('../beans/ResponseBean');
const { VersionManager } = require('../utils/manager/versionManager');
const { createModuleLogger } = require('../utils/logger/index');

const log = createModuleLogger('FeedbackService');

class FeedbackService extends BaseService {
  /**
   * 提交用户反馈
   * @param {Object} feedbackData - 反馈数据
   * @param {string} feedbackData.feedbackType - 反馈类型 (problem/suggestion/other)
   * @param {string} feedbackData.title - 反馈标题 (10-50字符)
   * @param {string} feedbackData.content - 反馈内容 (20-500字符)
   * @returns {Promise<ResponseBean>}
   */
  async submitFeedback(feedbackData) {
    try {
      log.info('submitFeedback', '提交反馈', feedbackData);
      
      // 获取云函数名称
      const functionName = VersionManager.getFunctionName('feedbackManagement');
      
      if (!functionName) {
        log.error('submitFeedback', '无法获取云函数名称');
        return ResponseBean.error('系统初始化失败，请稍后重试');
      }
      
      log.debug('submitFeedback', '调用云函数:', functionName);
      
      // 调用云函数
      const result = await wx.cloud.callFunction({
        name: functionName,
        data: {
          action: 'submitFeedback',
          data: feedbackData
        }
      });
      
      log.debug('submitFeedback', '云函数返回:', result);
      
      // 转换为ResponseBean
      const response = ResponseBean.fromCloudResult(result);
      
      if (response.success) {
        log.info('submitFeedback', '提交成功');
      } else {
        log.error('submitFeedback', '提交失败:', response.error);
      }
      
      return response;
    } catch (error) {
      log.error('submitFeedback', '提交反馈失败:', error);
      return ResponseBean.error(error.message || '提交反馈失败');
    }
  }
  
  /**
   * 获取用户反馈列表
   * @param {Object} queryData - 查询参数
   * @param {number} queryData.page - 页码
   * @param {number} queryData.limit - 每页数量
   * @param {string} queryData.feedbackType - 反馈类型筛选
   * @param {string} queryData.status - 状态筛选
   * @returns {Promise<ResponseBean>}
   */
  async getUserFeedbacks(queryData = {}) {
    try {
      log.info('getUserFeedbacks', '获取反馈列表', queryData);
      
      const functionName = VersionManager.getFunctionName('feedbackManagement');
      
      if (!functionName) {
        log.error('getUserFeedbacks', '无法获取云函数名称');
        return ResponseBean.error('系统初始化失败，请稍后重试');
      }
      
      const result = await wx.cloud.callFunction({
        name: functionName,
        data: {
          action: 'getUserFeedbacks',
          data: queryData
        }
      });
      
      const response = ResponseBean.fromCloudResult(result);
      
      if (response.success) {
        log.info('getUserFeedbacks', '获取成功，共', response.data.total, '条记录');
      } else {
        log.error('getUserFeedbacks', '获取失败:', response.error);
      }
      
      return response;
    } catch (error) {
      log.error('getUserFeedbacks', '获取反馈列表失败:', error);
      return ResponseBean.error(error.message || '获取反馈列表失败');
    }
  }
  
  /**
   * 获取反馈详情
   * @param {string} feedbackId - 反馈ID
   * @returns {Promise<ResponseBean>}
   */
  async getFeedbackDetail(feedbackId) {
    try {
      log.info('getFeedbackDetail', '获取反馈详情:', feedbackId);
      
      const functionName = VersionManager.getFunctionName('feedbackManagement');
      
      if (!functionName) {
        log.error('getFeedbackDetail', '无法获取云函数名称');
        return ResponseBean.error('系统初始化失败，请稍后重试');
      }
      
      const result = await wx.cloud.callFunction({
        name: functionName,
        data: {
          action: 'getFeedbackDetail',
          data: { feedbackId }
        }
      });
      
      const response = ResponseBean.fromCloudResult(result);
      
      if (response.success) {
        log.info('getFeedbackDetail', '获取成功');
      } else {
        log.error('getFeedbackDetail', '获取失败:', response.error);
      }
      
      return response;
    } catch (error) {
      log.error('getFeedbackDetail', '获取反馈详情失败:', error);
      return ResponseBean.error(error.message || '获取反馈详情失败');
    }
  }
}

// 导出单例
const feedbackService = new FeedbackService();

module.exports = {
  FeedbackService,
  feedbackService
};
