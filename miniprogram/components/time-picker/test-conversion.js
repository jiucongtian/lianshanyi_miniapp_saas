/**
 * 时间选择器历法转换功能测试
 * 用于验证公历和农历之间的转换是否正确
 */

const calendar = require('../../utils/js-calendar-converter.js');

// 测试用例
const testCases = [
  {
    name: '公历转农历测试',
    input: { year: 2024, month: 1, day: 1, hour: 0, minute: 1 },
    calendarType: 'solar'
  },
  {
    name: '农历转公历测试',
    input: { year: 2023, month: 11, day: 22, hour: 12, minute: 1 },
    calendarType: 'lunar'
  },
  {
    name: '闰月测试',
    input: { year: 2020, month: 4, day: 15, hour: 8, minute: 1 },
    calendarType: 'lunar',
    isLeapMonth: true
  },
  {
    name: '公历转农历闰月测试',
    input: { year: 2020, month: 6, day: 6, hour: 8, minute: 1 },
    calendarType: 'solar'
  }
];

// 执行测试
function runTests() {
  console.log('开始历法转换测试...\n');
  
  testCases.forEach((testCase, index) => {
    console.log(`测试 ${index + 1}: ${testCase.name}`);
    console.log('输入:', testCase.input);
    
    try {
      let result;
      
      if (testCase.calendarType === 'solar') {
        // 公历转农历
        result = calendar.solar2lunar(
          testCase.input.year, 
          testCase.input.month, 
          testCase.input.day
        );
        
        if (result === -1) {
          console.log('❌ 转换失败: 公历日期无效');
        } else {
          console.log('✅ 转换成功:');
          const leapPrefix = result.isLeap ? '闰' : '';
          console.log('  农历:', `${leapPrefix}${result.lYear}年${result.IMonthCn}${result.IDayCn}`);
          console.log('  公历:', `${result.cYear}年${result.cMonth}月${result.cDay}日`);
          if (result.isLeap) {
            console.log('  📅 闰月信息: 是闰月');
          }
        }
        
      } else if (testCase.calendarType === 'lunar') {
        // 农历转公历
        result = calendar.lunar2solar(
          testCase.input.year, 
          testCase.input.month, 
          testCase.input.day,
          testCase.isLeapMonth || false
        );
        
        if (result === -1) {
          console.log('❌ 转换失败: 农历日期无效');
        } else {
          console.log('✅ 转换成功:');
          const leapPrefix = testCase.isLeapMonth ? '闰' : '';
          console.log('  农历:', `${leapPrefix}${testCase.input.year}年${testCase.input.month}月${testCase.input.day}日`);
          console.log('  公历:', `${result.cYear}年${result.cMonth}月${result.cDay}日`);
          if (testCase.isLeapMonth) {
            console.log('  📅 闰月信息: 是闰月');
          }
        }
      }
      
    } catch (error) {
      console.log('❌ 测试失败:', error.message);
    }
    
    console.log('---\n');
  });
  
  console.log('测试完成！');
}

// 如果直接运行此文件，执行测试
if (typeof module !== 'undefined' && require.main === module) {
  runTests();
}

module.exports = { runTests, testCases };
