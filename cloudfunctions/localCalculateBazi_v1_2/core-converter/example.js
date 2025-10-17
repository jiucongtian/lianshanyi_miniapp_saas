/**
 * 生辰八字计算器 - 使用示例
 */

const { calculateBazi } = require('./bazi-calculator');


// ============================================
// 示例2: 立春修正示例
// ============================================

// 立春前 - 应该算前一年
const person2a = calculateBazi(2025, 2, 3, 19, 34);
console.log('2025-2-3-19-34:', `${person2a.baziData.year.gan}${person2a.baziData.year.zhi} ${person2a.baziData.month.gan}${person2a.baziData.month.zhi} ${person2a.baziData.day.gan}${person2a.baziData.day.zhi} ${person2a.baziData.hour.gan}${person2a.baziData.hour.zhi}`);
console.log();

// 立春后 - 算当年
const person2b = calculateBazi(2025, 2, 3, 22, 0);
console.log('2025-2-3-22-0:', `${person2b.baziData.year.gan}${person2b.baziData.year.zhi} ${person2b.baziData.month.gan}${person2b.baziData.month.zhi} ${person2b.baziData.day.gan}${person2b.baziData.day.zhi} ${person2b.baziData.hour.gan}${person2b.baziData.hour.zhi}`);
console.log('\n---\n');

const person3b = calculateBazi(2025, 10, 8, 6, 0);
console.log('2025-10-8-6-0:', `${person3b.baziData.year.gan}${person3b.baziData.year.zhi} ${person3b.baziData.month.gan}${person3b.baziData.month.zhi} ${person3b.baziData.day.gan}${person3b.baziData.day.zhi} ${person3b.baziData.hour.gan}${person3b.baziData.hour.zhi}`);
console.log('\n---\n');
const person4b = calculateBazi(2025, 10, 8, 8, 0);
console.log('2025-10-8-8-0:', `${person4b.baziData.year.gan}${person4b.baziData.year.zhi} ${person4b.baziData.month.gan}${person4b.baziData.month.zhi} ${person4b.baziData.day.gan}${person4b.baziData.day.zhi} ${person4b.baziData.hour.gan}${person4b.baziData.hour.zhi}`);
console.log('\n---\n');

const person5b = calculateBazi(2022, 2, 4, 2, 0);
console.log('2022-2-4-2-0:', `${person5b.baziData.year.gan}${person5b.baziData.year.zhi} ${person5b.baziData.month.gan}${person5b.baziData.month.zhi} ${person5b.baziData.day.gan}${person5b.baziData.day.zhi} ${person5b.baziData.hour.gan}${person5b.baziData.hour.zhi}`);
console.log('\n---\n');
const person6b = calculateBazi(2022, 2, 4, 3, 1);
console.log('2022-2-4-3-1:', `${person6b.baziData.year.gan}${person6b.baziData.year.zhi} ${person6b.baziData.month.gan}${person6b.baziData.month.zhi} ${person6b.baziData.day.gan}${person6b.baziData.day.zhi} ${person6b.baziData.hour.gan}${person6b.baziData.hour.zhi}`);
console.log('\n---\n');
