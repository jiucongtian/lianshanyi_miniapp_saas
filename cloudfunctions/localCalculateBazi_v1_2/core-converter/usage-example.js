/**
 * 节气数据管理工具使用示例
 * 
 * 本文件演示如何使用solar-terms-compressed-original.js中的新增功能
 */

const solarTerms = require('./solar-terms-compressed-original');
const fs = require('fs');
const path = require('path');

// ============================================
// 功能1：读取节气时间并格式化
// ============================================
console.log('=== 功能1：读取节气时间 ===\n');

// 1.1 获取Date对象
const date1 = solarTerms.getSolarTermTime(2000, 0);  // 2000年小寒
console.log('2000年小寒（Date对象）:', date1);

// 1.2 使用节气名称
const date2 = solarTerms.getSolarTermTime(2000, '立春');
console.log('2000年立春（Date对象）:', date2);

// 1.3 获取格式化字符串
const str1 = solarTerms.getSolarTermTimeString(2000, 0);
console.log('2000年小寒（默认格式）:', str1);

const str2 = solarTerms.getSolarTermTimeString(2000, '立春', 'iso');
console.log('2000年立春（ISO格式）:', str2);

const str3 = solarTerms.getSolarTermTimeString(2000, '立春', 'short');
console.log('2000年立春（简短格式）:', str3);

// 1.4 获取某年所有节气
const allTerms = solarTerms.getAllSolarTerms(2000);
console.log('\n2000年所有节气（前3个）:');
console.log(allTerms);

console.log('\n');


/*


// ============================================
// 功能2：修改节气时间
// ============================================
console.log('=== 功能2：修改节气时间 ===\n');

// 2.1 使用Date对象修改
console.log('修改前 2000年小寒:', solarTerms.getSolarTermTimeString(2000, 0));

const success1 = solarTerms.updateSolarTermTime(
  2000, 
  0, 
  new Date(2000, 0, 6, 10, 0) // 修改为 2000年1月6日10时0分
);

if (success1) {
  console.log('修改后 2000年小寒:', solarTerms.getSolarTermTimeString(2000, 0));
}

// 2.2 使用对象修改
console.log('\n修改前 2000年立春:', solarTerms.getSolarTermTimeString(2000, '立春'));

const success2 = solarTerms.updateSolarTermTime(
  2000,
  '立春',
  { year: 2000, month: 2, day: 4, hour: 21, minute: 0 } // 修改为 2000年2月4日21时0分
);

if (success2) {
  console.log('修改后 2000年立春:', solarTerms.getSolarTermTimeString(2000, '立春'));
}

console.log('\n');

// ============================================
// 功能3：从原始数据重新生成
// ============================================
console.log('=== 功能3：从原始数据重新生成 ===\n');

// 3.1 读取原始数据文件
const originalDataPath = path.join(__dirname, 'original_24jieqi.md');

try {
  const originalData = fs.readFileSync(originalDataPath, 'utf-8');
  
  console.log('正在从原始数据重新生成压缩数据...');
  const newCompressedData = solarTerms.regenerateFromOriginalData(originalData);
  
  console.log(`成功生成 ${newCompressedData.length} 年的压缩数据`);
  console.log('示例（1583年）:', newCompressedData[0]);
  console.log('示例（2000年）:', newCompressedData[2000 - 1583]);
  
  // 3.2 导出为JavaScript代码
  console.log('\n正在生成JavaScript代码...');
  const jsCode = solarTerms.exportToJavaScript();
  
  // 保存到文件（可选）
  const outputPath = path.join(__dirname, 'solar-terms-regenerated.js');
  fs.writeFileSync(outputPath, jsCode, 'utf-8');
  console.log(`已保存到: ${outputPath}`);
  
  console.log('\n代码预览（前300字符）:');
  console.log(jsCode.substring(0, 300) + '...');
  
} catch (error) {
  console.error('处理原始数据时出错:', error.message);
}

console.log('\n');

// ============================================
// 实用工具函数示例
// ============================================
console.log('=== 实用工具函数 ===\n');

// 辅助函数：将Date转换为分钟数
const testDate = new Date(2000, 0, 6, 9, 1);
const minutes = solarTerms.dateToMinutesFromYearStart(testDate);
console.log(`2000年1月6日9时1分 = ${minutes} 分钟`);

// 辅助函数：分钟数转十六进制
const hex = solarTerms.minutesToHex(minutes);
console.log(`${minutes} 分钟 = 0x${hex}`);

// 反向验证：将十六进制转回时间
const minutesBack = parseInt(hex, 16);
const dateBack = new Date(2000, 0, 1, 0, 0);
dateBack.setMinutes(dateBack.getMinutes() + minutesBack);
console.log(`0x${hex} = ${dateBack.toLocaleString('zh-CN')}`);

console.log('\n');

// ============================================
// 批量操作示例
// ============================================
console.log('=== 批量操作示例 ===\n');

// 批量获取某个节气在多年的时间
console.log('立春在不同年份的时间:');
for (let year = 2020; year <= 2025; year++) {
  const lichunTime = solarTerms.getSolarTermTimeString(year, '立春', 'short');
  console.log(`  ${year}: ${lichunTime}`);
}

console.log('\n所有功能演示完成！');
*/
