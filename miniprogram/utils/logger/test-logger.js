/**
 * 日志系统测试文件
 * 用于验证日志功能是否正常工作
 * 
 * 使用方法：
 * 1. 在任意页面的 onLoad 中引入并执行：
 *    const testLogger = require('../../utils/logger/test-logger');
 *    testLogger.runTests();
 * 
 * 2. 查看控制台输出，验证日志格式是否正确
 * 3. 检查存储中的日志数据（使用 testLogger.checkStorage()）
 */

const logger = require('./Logger');
const { LogStorage } = require('./LogStorage');
const { LogCleaner } = require('./LogCleaner');

/**
 * 运行所有测试
 */
function runTests() {
  console.log('\n========== 开始测试日志系统 ==========\n');
  
  testBasicLogging();
  testDifferentModules();
  testWithData();
  testErrorLogging();
  testSensitiveData();
  testCallerInfo();
  
  console.log('\n========== 日志系统测试完成 ==========\n');
  console.log('请检查上方输出，验证日志格式是否正确');
  console.log('调用 testLogger.checkStorage() 查看本地存储');
}

/**
 * 测试基本日志功能
 */
function testBasicLogging() {
  console.log('\n--- 测试1: 基本日志功能 ---');
  
  logger.debug('test', '这是一条DEBUG日志');
  logger.info('test', '这是一条INFO日志');
  logger.warn('test', '这是一条WARN日志');
  logger.error('test', '这是一条ERROR日志');
}

/**
 * 测试不同模块的日志
 */
function testDifferentModules() {
  console.log('\n--- 测试2: 不同模块的日志 ---');
  
  logger.debug('user', '用户模块日志');
  logger.info('profile', '档案模块日志');
  logger.warn('card', '卡牌模块日志');
  logger.error('network', '网络模块日志');
}

/**
 * 测试带数据的日志
 */
function testWithData() {
  console.log('\n--- 测试3: 带数据的日志 ---');
  
  const userData = {
    id: '12345',
    name: '测试用户',
    age: 25
  };
  
  logger.debug('user', '用户信息', userData);
  logger.info('profile', '档案创建成功', { profileId: 'abc123', timestamp: Date.now() });
  logger.warn('network', '网络请求较慢', { duration: 3000, url: '/api/user' });
  
  const error = new Error('测试错误');
  logger.error('system', '发生错误', error);
}

/**
 * 测试错误日志
 */
function testErrorLogging() {
  console.log('\n--- 测试4: 错误日志 ---');
  
  try {
    throw new Error('模拟的错误');
  } catch (error) {
    logger.error('test', '捕获到错误', error);
  }
  
  logger.error('test', '手动记录的错误', {
    code: 500,
    message: '服务器内部错误'
  });
}

/**
 * 测试敏感数据过滤
 */
function testSensitiveData() {
  console.log('\n--- 测试5: 敏感数据过滤 ---');
  
  const sensitiveData = {
    username: '张三',
    password: 'secret123',
    token: 'abc123xyz',
    openid: 'oxxx123456',
    phoneNumber: '13800138000'
  };
  
  logger.debug('user', '包含敏感信息的数据', sensitiveData);
  console.log('提示: password、token、openid、phoneNumber应该被替换为***');
}

/**
 * 测试调用者信息获取
 */
function testCallerInfo() {
  console.log('\n--- 测试6: 调用者信息获取 ---');
  
  // 在类中调用
  class TestClass {
    testMethod() {
      logger.debug('test', '从类方法中调用');
    }
  }
  
  const instance = new TestClass();
  instance.testMethod();
  
  // 在普通函数中调用
  function testFunction() {
    logger.info('test', '从普通函数中调用');
  }
  
  testFunction();
  
  // 手动指定调用者
  logger.warn('test', '手动指定调用者', null, 'TestClass.customMethod');
}

/**
 * 检查本地存储
 */
function checkStorage() {
  console.log('\n========== 检查本地存储 ==========\n');
  
  const stats = logger.getStats();
  console.log('日志统计信息:', stats);
  
  const recentLogs = logger.getRecentLogs(1);
  console.log(`\n今天的日志数量: ${recentLogs.length}`);
  
  if (recentLogs.length > 0) {
    console.log('\n最近的3条日志:');
    recentLogs.slice(-3).forEach((log, index) => {
      console.log(`\n[${index + 1}]`, log);
    });
  }
  
  return stats;
}

/**
 * 清理测试数据
 */
function cleanupTestData() {
  console.log('\n--- 清理测试数据 ---');
  
  const stats = logger.getStats();
  console.log('清理前:', stats);
  
  logger.clearLogs();
  
  const newStats = logger.getStats();
  console.log('清理后:', newStats);
}

/**
 * 测试日志清理器
 */
function testLogCleaner() {
  console.log('\n========== 测试日志清理器 ==========\n');
  
  const logCleaner = new LogCleaner({
    retentionDays: 30,
    autoCleanEnabled: true
  });
  
  // 获取过期日志键（不执行清理）
  const expiredKeys = logCleaner.getExpiredLogKeys();
  console.log('过期日志键:', expiredKeys);
  
  // 执行清理
  const result = logCleaner.cleanExpiredLogs();
  console.log('清理结果:', result);
}

/**
 * 测试日志存储
 */
function testLogStorage() {
  console.log('\n========== 测试日志存储 ==========\n');
  
  const storage = new LogStorage({
    maxLogsPerDay: 500,
    enabled: true
  });
  
  // 测试保存日志
  storage.save({
    timestamp: Date.now(),
    level: 'TEST',
    module: 'test',
    caller: 'test:testMethod:1',
    message: '测试存储功能',
    data: { test: true }
  });
  
  // 获取统计信息
  const stats = storage.getStats();
  console.log('存储统计:', stats);
  
  // 获取今天的日志
  const dateKey = storage.getDateKey();
  const todayLogs = storage.getLogsByDate(dateKey);
  console.log(`今天的日志数量: ${todayLogs.length}`);
}

/**
 * 性能测试
 */
function performanceTest() {
  console.log('\n========== 性能测试 ==========\n');
  
  const count = 1000;
  
  // 测试 DEBUG 日志性能（生产模式应该很快）
  console.time('DEBUG日志性能');
  for (let i = 0; i < count; i++) {
    logger.debug('test', '性能测试', { index: i });
  }
  console.timeEnd('DEBUG日志性能');
  
  // 测试 ERROR 日志性能
  console.time('ERROR日志性能');
  for (let i = 0; i < count; i++) {
    logger.error('test', '性能测试', { index: i });
  }
  console.timeEnd('ERROR日志性能');
  
  console.log(`\n提示: 在生产模式下，DEBUG日志应该非常快（几乎零开销）`);
}

// 导出测试函数
module.exports = {
  runTests,
  checkStorage,
  cleanupTestData,
  testLogCleaner,
  testLogStorage,
  performanceTest
};

