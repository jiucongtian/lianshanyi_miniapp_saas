/**
 * Service层统一导出文件
 * 提供所有Service类的统一访问入口
 */

// 导入所有Service类
const { BaseService } = require('./BaseService');
const { UserService, userService } = require('./UserService');
const { ProfileService, profileService } = require('./ProfileService');
const { FeedbackService, feedbackService } = require('./FeedbackService');

// 延迟加载 DrawCardService，避免初始化时的循环依赖问题
let DrawCardService = null;
let drawCardService = null;
try {
  const drawCardModule = require('./DrawCardService');
  DrawCardService = drawCardModule.DrawCardService;
  drawCardService = drawCardModule.drawCardService;
} catch (error) {
  console.error('[services/index] DrawCardService 加载失败:', error);
  // 即使加载失败，也提供一个占位符，避免其他地方使用时出错
  DrawCardService = class DrawCardServicePlaceholder {
    constructor() {
      console.warn('[DrawCardServicePlaceholder] DrawCardService 未正确加载，请检查模块依赖');
    }
  };
  drawCardService = new DrawCardService();
}

// 导出所有Service类
module.exports = {
  // 基础服务类
  BaseService,
  
  // 具体服务类
  UserService,
  ProfileService,
  DrawCardService,
  FeedbackService,
  
  // 服务单例实例
  userService,
  profileService,
  drawCardService,
  feedbackService,
  
  // 服务列表（用于批量操作）
  services: {
    userService,
    profileService,
    drawCardService,
    feedbackService
  }
};
