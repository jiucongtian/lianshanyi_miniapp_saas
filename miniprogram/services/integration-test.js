/**
 * 集成测试文件
 * 测试所有修改后的API调用是否正常工作
 * 注意：此文件仅用于开发测试，不应包含在生产代码中
 */

const { userService, profileService } = require('./index');

class IntegrationTest {
  constructor() {
    this.testResults = [];
  }

  /**
   * 运行所有集成测试
   */
  async runAllTests() {
    console.log('🚀 开始集成测试...');
    
    const tests = [
      { name: 'UserService.getUserInfo', method: () => userService.getUserInfo() },
      { name: 'UserService.checkQuota', method: () => userService.checkQuota() },
      { name: 'UserService.checkUserExists', method: () => userService.checkUserExists() },
      { name: 'UserService.getUserPermissions', method: () => userService.getUserPermissions() },
      { name: 'ProfileService.getProfiles', method: () => profileService.getProfiles({ page: 1, limit: 10 }) },
      { name: 'ProfileService.searchProfile', method: () => profileService.searchProfile({ name: '测试' }) }
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
        dataType: result.data ? typeof result.data : 'null',
        hasData: !!result.data
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
        dataType: 'error',
        hasData: false
      });
    }
  }

  /**
   * 打印测试结果
   */
  printResults() {
    console.log('\n📊 集成测试结果汇总:');
    console.log('='.repeat(60));
    
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
      const dataInfo = result.hasData ? '有数据' : '无数据';
      console.log(`${status} ${result.name.padEnd(30)} ${duration.padStart(8)} ${dataInfo.padStart(6)} ${result.success ? '成功' : `失败(${result.code})`}`);
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

    // 性能分析
    const avgDuration = this.testResults.reduce((sum, r) => sum + r.duration, 0) / totalCount;
    console.log(`\n⚡ 性能分析:`);
    console.log(`   平均响应时间: ${avgDuration.toFixed(2)}ms`);
    
    const slowTests = this.testResults.filter(r => r.duration > 1000);
    if (slowTests.length > 0) {
      console.log(`   慢查询 (>1s): ${slowTests.length} 个`);
      slowTests.forEach(test => {
        console.log(`     - ${test.name}: ${test.duration}ms`);
      });
    }
  }

  /**
   * 测试ResponseBean格式
   */
  async testResponseBeanFormat() {
    console.log('\n🧪 测试ResponseBean格式...');
    
    const result = await userService.getUserInfo();
    
    // 检查必需字段
    const requiredFields = ['success', 'data', 'error', 'code', 'timestamp'];
    const missingFields = requiredFields.filter(field => !(field in result));
    
    if (missingFields.length === 0) {
      console.log('✅ ResponseBean格式正确，包含所有必需字段');
    } else {
      console.log('❌ ResponseBean格式错误，缺少字段:', missingFields.join(', '));
    }
    
    // 检查数据类型
    const typeChecks = [
      { field: 'success', expected: 'boolean', actual: typeof result.success },
      { field: 'code', expected: 'number', actual: typeof result.code },
      { field: 'timestamp', expected: 'number', actual: typeof result.timestamp }
    ];
    
    typeChecks.forEach(check => {
      if (check.actual === check.expected) {
        console.log(`✅ ${check.field} 类型正确: ${check.actual}`);
      } else {
        console.log(`❌ ${check.field} 类型错误: 期望 ${check.expected}, 实际 ${check.actual}`);
      }
    });
  }

  /**
   * 测试Bean类转换
   */
  async testBeanConversion() {
    console.log('\n🧪 测试Bean类转换...');
    
    const result = await userService.getUserInfo();
    
    if (result.success && result.data) {
      // 检查UserBean转换
      if (result.data.constructor && result.data.constructor.name === 'UserBean') {
        console.log('✅ UserBean转换成功');
      } else {
        console.log('❌ UserBean转换失败，数据类型:', typeof result.data);
      }
    }
    
    const profileResult = await profileService.getProfiles({ page: 1, limit: 1 });
    
    if (profileResult.success && profileResult.data && profileResult.data.profiles) {
      const profiles = profileResult.data.profiles;
      if (profiles.length > 0) {
        const firstProfile = profiles[0];
        if (firstProfile.constructor && firstProfile.constructor.name === 'ProfileBean') {
          console.log('✅ ProfileBean转换成功');
        } else {
          console.log('❌ ProfileBean转换失败，数据类型:', typeof firstProfile);
        }
      }
    }
  }
}

// 导出测试类
module.exports = { IntegrationTest };

// 如果直接运行此文件，执行测试
if (typeof wx !== 'undefined') {
  // 在小程序环境中
  const test = new IntegrationTest();
  
  // 在页面加载时运行测试
  Page({
    async onLoad() {
      console.log('开始集成测试...');
      await test.runAllTests();
      await test.testResponseBeanFormat();
      await test.testBeanConversion();
    }
  });
} else {
  // 在Node.js环境中
  console.log('集成测试文件已加载，请在小程序环境中运行测试');
}
