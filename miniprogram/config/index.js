/** 应用配置 */
export const config = {
  // 调试模式：开启后不使用缓存，每次都从网络获取八字数据
  // 同时控制日志系统的行为（true=开发模式，false=生产模式）
  debugMode: true,
  // 云环境配置
  cloud: {
    envId: 'cloudbase-8g06skyf81a65a87', // 云环境ID
    // 云存储桶ID（需要从云存储控制台获取实际的fileID来确定）
    // 获取方法：上传一个测试文件到云存储，复制其fileID，提取格式中的存储桶ID部分
    // fileID格式：cloud://环境ID.存储桶ID/路径/文件名
    cloudStorageId: '636c-cloudbase-8g06skyf81a65a87-1378890368', // 临时使用环境ID，需要根据实际情况调整
    // 卡牌图片云存储路径
    cardImagesPath: 'cards', // 云存储中卡牌图片的文件夹路径
  },
  // 日志配置
  logger: {
    // 本地存储配置
    storage: {
      enabled: true,                  // 是否启用本地存储
      retentionDays: 30,             // 日志保留天数
    },
    // 日志格式配置
    format: {
      showDate: true,                // 显示日期（年-月-日）
      showTime: true,                // 显示时间（时:分:秒.毫秒）
      showLevel: false,               // 显示日志类型（DEBUG/INFO/WARN/ERROR）
      showModule: false,              // 显示模块名
      showClass: false,               // 显示类名
      showMethod: false,              // 显示方法名
    },
    // 开发模式配置（debugMode: true）
    development: {
      console: true,                 // 是否输出到控制台
      levels: ['DEBUG', 'INFO', 'WARN', 'ERROR']  // 记录所有级别
    },
    // 生产模式配置（debugMode: false）
    production: {
      console: false,                // 生产环境不输出到控制台
      levels: ['WARN', 'ERROR']      // 只记录警告和错误
    }
  },
};

// 同时提供默认导出以兼容现有代码
export default config;
