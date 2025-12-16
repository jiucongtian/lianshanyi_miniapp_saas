/**
 * 更新六十甲子卡牌数据中的 seasonMark、talentMark、abilityMark、pathMark 字段
 */

const fs = require('fs');
const path = require('path');
const { calculatedData, businessData } = require('./generator');

/**
 * 更新JSON文件中的字段
 */
function updateCardFields() {
  // 读取现有数据
  const dataPath = path.join(__dirname, '../../六十甲子卡牌完整数据.json');
  const cards = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  
  console.log(`开始更新 ${cards.length} 个卡牌的数据...\n`);
  
  let updatedCount = 0;
  let changedCount = 0;
  
  // 遍历每个卡牌
  cards.forEach((card, index) => {
    const ganZhi = card.cardName;
    const gan = ganZhi[0];
    const zhi = ganZhi[1];
    
    // 使用生成器方法计算字段
    const newSeasonMark = calculatedData.calculateSeasonMark(gan, zhi);
    const newTalentMark = businessData.getTalentMark(gan);
    const newAbilityMark = businessData.getAbilityMark(ganZhi);
    const newPathMark = businessData.getPathMark(ganZhi);
    
    // 检查是否有变化
    const hasChanges = 
      card.seasonMark !== newSeasonMark ||
      card.talentMark !== newTalentMark ||
      card.abilityMark !== newAbilityMark ||
      card.pathMark !== newPathMark;
    
    if (hasChanges) {
      console.log(`[${index + 1}] ${ganZhi}:`);
      
      if (card.seasonMark !== newSeasonMark) {
        console.log(`  seasonMark: "${card.seasonMark}" → "${newSeasonMark}"`);
        card.seasonMark = newSeasonMark;
      }
      
      if (card.talentMark !== newTalentMark) {
        console.log(`  talentMark: "${card.talentMark}" → "${newTalentMark}"`);
        card.talentMark = newTalentMark;
      }
      
      if (card.abilityMark !== newAbilityMark) {
        console.log(`  abilityMark: "${card.abilityMark}" → "${newAbilityMark}"`);
        card.abilityMark = newAbilityMark;
      }
      
      if (card.pathMark !== newPathMark) {
        console.log(`  pathMark: "${card.pathMark}" → "${newPathMark}"`);
        card.pathMark = newPathMark;
      }
      
      changedCount++;
      console.log('');
    }
    
    updatedCount++;
  });
  
  // 保存更新后的数据
  fs.writeFileSync(
    dataPath,
    JSON.stringify(cards, null, 2),
    'utf8'
  );
  
  console.log(`\n更新完成！`);
  console.log(`- 总共处理: ${updatedCount} 个卡牌`);
  console.log(`- 发生变化的: ${changedCount} 个卡牌`);
  console.log(`- 数据已保存到: ${dataPath}`);
}

// 运行更新
if (require.main === module) {
  try {
    updateCardFields();
  } catch (error) {
    console.error('更新失败:', error);
    process.exit(1);
  }
}

module.exports = {
  updateCardFields
};

