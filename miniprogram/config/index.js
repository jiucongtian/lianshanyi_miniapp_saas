/** 应用配置 */
export const config = {
  useMock: false,
  // 调试模式：开启后不使用缓存，每次都从网络获取八字数据
  debugMode: false,
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
};

// 同时提供默认导出以兼容现有代码
export default config;
