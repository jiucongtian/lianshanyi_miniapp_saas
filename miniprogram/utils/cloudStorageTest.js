/**
 * 云存储配置测试工具
 * 用于验证云存储路径配置是否正确
 */

const config = require('../config/index.js').default;
const { getBaziImageById } = require('./baziImageMap');

/**
 * 测试单个云存储文件是否可访问
 * @param {string} fileID 云存储文件ID
 * @returns {Promise<Object>} 测试结果
 */
const testSingleFile = (fileID) => {
  return new Promise((resolve, reject) => {
    wx.cloud.getTempFileURL({
      fileList: [fileID],
      success: res => {
        const file = res.fileList[0];
        if (file.status === 0) {
          resolve({
            success: true,
            fileID: file.fileID,
            tempFileURL: file.tempFileURL,
            message: '文件访问成功'
          });
        } else {
          reject({
            success: false,
            fileID: file.fileID,
            errCode: file.errCode,
            message: '文件访问失败: ' + file.errMsg
          });
        }
      },
      fail: err => {
        reject({
          success: false,
          fileID: fileID,
          error: err,
          message: '请求失败: ' + err.errMsg
        });
      }
    });
  });
};

/**
 * 测试多个卡牌图片是否可访问
 * 默认测试前5张图片
 * @param {number} count 测试数量，默认5
 * @returns {Promise<Object>} 测试结果
 */
const testCardImages = async (count = 5) => {
  console.log('开始测试云存储卡牌图片...');
  console.log('云存储配置:', config.cloud);
  
  const results = {
    total: count,
    success: 0,
    failed: 0,
    details: []
  };
  
  for (let i = 1; i <= count; i++) {
    try {
      const imageInfo = getBaziImageById(i);
      console.log(`\n测试图片 ${i}: ${imageInfo.pinyin}`);
      console.log('fileID:', imageInfo.imagePath);
      
      const result = await testSingleFile(imageInfo.imagePath);
      results.success++;
      results.details.push({
        id: i,
        pinyin: imageInfo.pinyin,
        ...result
      });
      
      console.log('✅ 测试通过:', result.tempFileURL);
    } catch (error) {
      results.failed++;
      results.details.push({
        id: i,
        pinyin: imageInfo ? imageInfo.pinyin : 'unknown',
        ...error
      });
      
      console.error('❌ 测试失败:', error.message);
    }
  }
  
  console.log('\n=== 测试汇总 ===');
  console.log(`总计: ${results.total}, 成功: ${results.success}, 失败: ${results.failed}`);
  
  return results;
};

/**
 * 获取云存储文件列表
 * 用于验证文件是否已上传
 * @param {string} prefix 文件路径前缀，默认为 'cards'
 * @returns {Promise<Object>} 文件列表
 */
const listCloudFiles = (prefix = 'cards') => {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'testFunction', // 需要创建一个云函数来获取文件列表
      data: {
        action: 'listFiles',
        prefix: prefix
      },
      success: res => {
        resolve(res.result);
      },
      fail: err => {
        reject(err);
      }
    });
  });
};

/**
 * 验证云存储配置是否正确
 * 这是一个综合测试函数
 */
const validateCloudStorageConfig = async () => {
  console.log('=== 开始验证云存储配置 ===\n');
  
  // 1. 检查配置
  console.log('1. 检查配置...');
  console.log('环境ID:', config.cloud.envId);
  console.log('云存储桶ID:', config.cloud.cloudStorageId);
  console.log('图片路径:', config.cloud.cardImagesPath);
  
  // 2. 检查环境ID和存储桶ID是否相同（可能需要调整）
  if (config.cloud.envId === config.cloud.cloudStorageId) {
    console.warn('⚠️  警告: envId 和 cloudStorageId 相同，这可能不正确');
    console.warn('   请从云存储控制台获取实际的 fileID 格式');
  }
  
  // 3. 生成示例路径
  console.log('\n2. 示例图片路径:');
  const sampleImage = getBaziImageById(1);
  console.log('第一张卡牌:', sampleImage.imagePath);
  console.log('预期格式:', `cloud://${config.cloud.envId}.xxxxxxx/${config.cloud.cardImagesPath}/01_jiazi.png`);
  console.log('其中 xxxxxxx 需要替换为实际的云存储桶ID');
  
  // 4. 测试文件访问
  console.log('\n3. 测试文件访问...');
  try {
    const testResult = await testCardImages(3);
    
    if (testResult.success === testResult.total) {
      console.log('\n✅ 所有测试通过！云存储配置正确。');
      return {
        success: true,
        message: '云存储配置正确，所有图片可正常访问'
      };
    } else if (testResult.success > 0) {
      console.log('\n⚠️  部分测试通过，请检查失败的文件。');
      return {
        success: false,
        message: '部分图片可访问，请检查配置和文件上传情况',
        details: testResult
      };
    } else {
      console.log('\n❌ 所有测试失败！请检查配置。');
      return {
        success: false,
        message: '所有图片无法访问，请检查云存储配置',
        details: testResult
      };
    }
  } catch (error) {
    console.error('\n❌ 测试过程出错:', error);
    return {
      success: false,
      message: '测试过程出错: ' + error.message,
      error: error
    };
  }
};

/**
 * 获取正确的云存储 fileID 格式示例
 * 通过上传一个测试文件来获取实际的 fileID 格式
 */
const getFileIDFormat = async () => {
  console.log('=== 获取云存储 fileID 格式 ===\n');
  console.log('请按以下步骤操作：');
  console.log('1. 打开微信开发者工具的云开发控制台');
  console.log('2. 进入"存储"页面');
  console.log('3. 打开 "cards" 文件夹');
  console.log('4. 选择任意一个图片文件');
  console.log('5. 点击文件详情，复制 fileID');
  console.log('6. fileID 格式类似: cloud://环境ID.存储桶ID/cards/文件名.png');
  console.log('7. 将存储桶ID部分更新到 config/index.js 中的 cloudStorageId');
  console.log('\n示例 fileID:');
  console.log('cloud://cloudbase-8g06skyf81a65a87.cloudbase-8g06skyf81a65a87/cards/01_jiazi.png');
  console.log('                                    ^^^^^^^^^^^^^^^^^^^^^^^^');
  console.log('                                    这部分是云存储桶ID');
};

module.exports = {
  testSingleFile,
  testCardImages,
  listCloudFiles,
  validateCloudStorageConfig,
  getFileIDFormat
};

