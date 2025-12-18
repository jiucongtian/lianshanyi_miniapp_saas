/**
 * 六十甲子卡牌生成器使用示例
 * 
 * 演示如何使用生成器生成卡牌数据
 */

const fs = require('fs');
const path = require('path');
const { generateAllCards, extractCustomData } = require('./generator');

// 示例1: 从现有JSON数据中提取自定义数据，然后重新生成
function example1() {
  console.log('=== 示例1: 从现有数据提取并重新生成 ===\n');
  
  // 读取现有数据
  const existingDataPath = path.join(__dirname, '../../六十甲子卡牌完整数据.json');
  const existingData = JSON.parse(fs.readFileSync(existingDataPath, 'utf8'));
  
  // 提取自定义数据（central、blessing、tip等）
  const customData = extractCustomData(existingData);
  
  // 使用生成器重新生成所有卡牌数据
  const generatedCards = generateAllCards({
    customData: customData,
    generateId: false  // 保留原有的_id
  });
  
  // 输出前3个卡牌作为示例
  console.log('生成的前3个卡牌:');
  generatedCards.slice(0, 3).forEach(card => {
    console.log(JSON.stringify(card, null, 2));
    console.log('---');
  });
  
  // 保存完整数据
  const outputPath = path.join(__dirname, 'generated-cards.json');
  fs.writeFileSync(outputPath, JSON.stringify(generatedCards, null, 2), 'utf8');
  console.log(`\n完整数据已保存到: ${outputPath}`);
}

// 示例2: 只生成可查表/计算的部分，保留文本字段为空
function example2() {
  console.log('\n=== 示例2: 只生成可查表/计算的部分 ===\n');
  
  const generatedCards = generateAllCards({
    generateId: true
  });
  
  // 输出前3个卡牌作为示例
  console.log('生成的前3个卡牌（只包含可查表/计算的数据）:');
  generatedCards.slice(0, 3).forEach(card => {
    console.log(JSON.stringify(card, null, 2));
    console.log('---');
  });
}

// 示例3: 生成单个卡牌
function example3() {
  console.log('\n=== 示例3: 生成单个卡牌 ===\n');
  
  const { generateCardData } = require('./generator');
  
  const card = generateCardData('甲子', {
    generateId: true
  });
  
  console.log('生成的甲子卡牌:');
  console.log(JSON.stringify(card, null, 2));
}

// 运行示例
if (require.main === module) {
  try {
    example1();
    example2();
    example3();
  } catch (error) {
    console.error('错误:', error);
  }
}

module.exports = {
  example1,
  example2,
  example3
};

