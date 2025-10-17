/**
 * 生辰八字计算器 - 使用示例
 */

const { calculateBazi } = require('./bazi-calculator');


// ============================================
// 示例2: 立春修正示例
// ============================================

// 立春前 - 应该算前一年
const person2a = calculateBazi(2025, 2, 3, 19, 34);
console.log('2025-2-3-19-34:', `${person2a.bazi.year} ${person2a.bazi.month} ${person2a.bazi.day} ${person2a.bazi.hour}`);
console.log();

// 立春后 - 算当年
const person2b = calculateBazi(2025, 2, 3, 22, 0);
console.log('2025-2-3-22-0:', `${person2b.bazi.year} ${person2b.bazi.month} ${person2b.bazi.day} ${person2b.bazi.hour}`);
console.log('\n---\n');

const person3b = calculateBazi(2025, 10, 8, 6, 0);
console.log('2025-10-8-6-0:', `${person3b.bazi.year} ${person3b.bazi.month} ${person3b.bazi.day} ${person3b.bazi.hour}`);
console.log('\n---\n');
const person4b = calculateBazi(2025, 10, 8, 8, 0);
console.log('2025-10-8-8-0:', `${person4b.bazi.year} ${person4b.bazi.month} ${person4b.bazi.day} ${person4b.bazi.hour}`);
console.log('\n---\n');

const person5b = calculateBazi(2022, 2, 4, 2, 0);
console.log('2022-2-4-2-0:', `${person5b.bazi.year} ${person5b.bazi.month} ${person5b.bazi.day} ${person5b.bazi.hour}`);
console.log('\n---\n');
const person6b = calculateBazi(2022, 2, 4, 3, 1);
console.log('2022-2-4-3-1:', `${person6b.bazi.year} ${person6b.bazi.month} ${person6b.bazi.day} ${person6b.bazi.hour}`);
console.log('\n---\n');
