/**
 * Service层统一导出文件
 * 提供所有Service类的统一访问入口
 */

// 导入所有Service类
const { BaseService } = require('./BaseService');
const { UserService, userService } = require('./UserService');
const { ProfileService, profileService } = require('./ProfileService');
const { BaziService, baziService } = require('./BaziService');

// 导出所有Service类
module.exports = {
  // 基础服务类
  BaseService,
  
  // 具体服务类
  UserService,
  ProfileService,
  BaziService,
  
  // 服务单例实例
  userService,
  profileService,
  baziService,
  
  // 服务列表（用于批量操作）
  services: {
    userService,
    profileService,
    baziService
  }
};
