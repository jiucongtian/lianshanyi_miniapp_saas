/**
 * UserService测试文件
 * 用于测试所有UserService方法的功能
 * 注意：此文件仅用于开发测试，不应包含在生产代码中
 */

const { userService } = require('./index');

class UserServiceTest {
  constructor() {
    this.testResults = [];
  }

  /**
   * 运行所有测试
   */
  async runAllTests() {
    console.log('🚀 开始UserService测试...');
    
    const tests = [
      { name: 'getUserInfo', method: () => userService.getUserInfo() },
      { name: 'checkQuota', method: () => userService.checkQuota() },
      { name: 'checkUserExists', method: () => userService.checkUserExists() },
      { name: 'getUserPermissions', method: () => userService.getUserPermissions() },
      { name: 'upgradeUserType', method: () => userService.upgradeUserType('normal') },
      { name: 'checkPermission', method: () => userService.checkPermission('view') },
      { name: 'updateUserInfo', method: () => userService.updateUserInfo({ nickName: '测试用户' }) },
      { name: 'createUser', method: () => userService.createUser({ nickName: '新用户' }) }
    ];

    for (const test of tests) {
      await this.runTest(test.name, test.method);
    }

    this.printResults();
  }

  /**
   * 运行单个测试
   */
  async runTest(testName, testMethod) {
    console.log(`\n📋 测试 ${testName}...`);
    
    try {
      const startTime = Date.now();
      const result = await testMethod();
      const endTime = Date.now();
      
      const testResult = {
        name: testName,
        success: result.success,
        code: result.code,
        error: result.error,
        duration: endTime - startTime,
        dataType: result.data ? typeof result.data : 'null'
      };

      this.testResults.push(testResult);

      if (result.success) {
        console.log(`✅ ${testName} 成功 (${testResult.duration}ms)`);
        console.log(`   数据类型: ${testResult.dataType}`);
        if (result.data && typeof result.data === 'object') {
          console.log(`   数据字段: ${Object.keys(result.data).join(', ')}`);
        }
      } else {
        console.log(`❌ ${testName} 失败 (${testResult.duration}ms)`);
        console.log(`   错误码: ${testResult.code}`);
        console.log(`   错误信息: ${testResult.error}`);
      }
    } catch (error) {
      console.log(`💥 ${testName} 异常:`, error.message);
      
      this.testResults.push({
        name: testName,
        success: false,
        code: -999,
        error: error.message,
        duration: 0,
        dataType: 'error'
      });
    }
  }

  /**
   * 打印测试结果
   */
  printResults() {
    console.log('\n📊 测试结果汇总:');
    console.log('='.repeat(50));
    
    const successCount = this.testResults.filter(r => r.success).length;
    const totalCount = this.testResults.length;
    const successRate = ((successCount / totalCount) * 100).toFixed(1);
    
    console.log(`总测试数: ${totalCount}`);
    console.log(`成功数: ${successCount}`);
    console.log(`失败数: ${totalCount - successCount}`);
    console.log(`成功率: ${successRate}%`);
    
    console.log('\n详细结果:');
    this.testResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const duration = `${result.duration}ms`;
      console.log(`${status} ${result.name.padEnd(20)} ${duration.padStart(8)} ${result.success ? '成功' : `失败(${result.code})`}`);
    });

    // 分析失败原因
    const failures = this.testResults.filter(r => !r.success);
    if (failures.length > 0) {
      console.log('\n🔍 失败分析:');
      const errorCodes = {};
      failures.forEach(f => {
        errorCodes[f.code] = (errorCodes[f.code] || 0) + 1;
      });
      
      Object.entries(errorCodes).forEach(([code, count]) => {
        console.log(`   错误码 ${code}: ${count} 次`);
      });
    }
  }

  /**
   * 测试参数验证
   */
  async testParameterValidation() {
    console.log('\n🧪 测试参数验证...');
    
    // 测试缺少必需参数
    const result1 = await userService.upgradeUserType();
    console.log('缺少targetUserType参数:', result1.success ? '❌ 应该失败' : '✅ 正确失败');
    
    const result2 = await userService.checkPermission();
    console.log('缺少permission参数:', result2.success ? '❌ 应该失败' : '✅ 正确失败');
    
    const result3 = await userService.updateUserInfo();
    console.log('缺少userData参数:', result3.success ? '❌ 应该失败' : '✅ 正确失败');
  }

  /**
   * 测试重试机制
   */
  async testRetryMechanism() {
    console.log('\n🔄 测试重试机制...');
    
    // 测试重试机制（使用一个不存在的云函数）
    const startTime = Date.now();
    const result = await userService.callFunctionWithRetry('nonExistentFunction', {}, 2);
    const endTime = Date.now();
    
    console.log(`重试测试结果: ${result.success ? '成功' : '失败'}`);
    console.log(`重试耗时: ${endTime - startTime}ms`);
    console.log(`错误信息: ${result.error}`);
  }
}

// 导出测试类
module.exports = { UserServiceTest };

// 如果直接运行此文件，执行测试
if (typeof wx !== 'undefined') {
  // 在小程序环境中
  const test = new UserServiceTest();
  
  // 在页面加载时运行测试
  Page({
    async onLoad() {
      console.log('开始UserService测试...');
      await test.runAllTests();
      await test.testParameterValidation();
      await test.testRetryMechanism();
    }
  });
} else {
  // 在Node.js环境中
  console.log('UserService测试文件已加载，请在小程序环境中运行测试');
}
