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
    // 二维码图片路径（支持 HTTP URL、云存储 fileID 或静态资源路径）
    qrCodePath: 'https://636c-cloudbase-8g06skyf81a65a87-1378890368.tcb.qcloud.la/res-img/erweima.jpg', // 二维码图片 URL
  },
  // 微信小店配置
  store: {
    // 小店 appid，从 [小店后台](https://store.weixin.qq.com/shop/setting/home) - 店铺管理 - 基础信息 - 账号信息 - 微信小店ID 获取
    appid: 'wx25a1da5e0a978940', // 请在此处填写您的小店 appid
    // 商品 ID 列表，从 [小店后台](https://store.weixin.qq.com/shop/goods/list) - 商品管理 - 商品列表 - 规格/编码 获取
    // 也可以通过 API 获取商品列表：https://developers.weixin.qq.com/doc/store/API/product/get.html
    productIds: [10000319374901,10000319244356], // 例如：['product-id-1', 'product-id-2']
  },
  // 静态托管配置
  staticHosting: {
    // 静态托管基础URL，需要在云开发控制台获取
    // 控制台地址：https://console.cloud.tencent.com/tcb/hosting
    // 获取后请填写完整的域名，例如：https://your-env-id.tcloudbaseapp.com
    baseUrl: 'https://cloudbase-8g06skyf81a65a87-1378890368.tcloudbaseapp.com', // 静态托管域名（不需要末尾的斜杠）
    // 用户手册路径
    userManualPath: '/user-manual/index.html',
  },
  // 日志配置
  logger: {
    // 文件存储配置
    storage: {
      enabled: false,                 // 是否启用文件存储
      retentionDays: 30,              // 日志保留天数
      maxCacheSize: 100 * 1024,       // 最大缓存大小（字节），默认100KB
      flushInterval: 5000,             // 刷新间隔（毫秒），默认5秒
      maxFileSize: 2 * 1024 * 1024,   // 单个文件最大大小（字节），默认2MB，超过此大小会循环覆盖
    },
    // 日志格式配置
    format: {
      showDate: true,                // 显示日期（年-月-日）
      showTime: true,                // 显示时间（时:分:秒.毫秒）
      showLevel: false,               // 显示日志类型（DEBUG/INFO/WARN/ERROR）
      showModule: false,              // 显示模块名
      showClass: true,               // 显示类名
      showMethod: true,              // 显示方法名
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

// 同时提供 CommonJS 导出以兼容 require
module.exports = { config, default: config };
