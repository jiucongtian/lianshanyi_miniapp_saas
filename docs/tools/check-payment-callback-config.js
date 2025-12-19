/**
 * 检查支付回调配置
 * 
 * 用于检查支付回调相关的配置是否正确
 */

const log = {
  info: (tag, ...args) => console.log(`[${tag}]`, ...args),
  error: (tag, ...args) => console.error(`[${tag}]`, ...args),
  success: (tag, ...args) => console.log(`✅ [${tag}]`, ...args),
  warn: (tag, ...args) => console.warn(`⚠️ [${tag}]`, ...args)
};

/**
 * 检查支付回调配置
 */
async function checkPaymentCallbackConfig() {
  log.info('checkPaymentCallbackConfig', '开始检查支付回调配置');
  
  const checks = [];
  
  // 1. 检查云函数是否存在
  try {
    log.info('checkPaymentCallbackConfig', '步骤1: 检查云函数是否存在');
    
    const testResult = await wx.cloud.callFunction({
      name: 'paymentManagement_v1_3',
      data: {
        action: 'queryOrderStatus',
        data: {
          orderId: 'test'
        }
      }
    });
    
    if (testResult.errMsg === 'cloud.callFunction:ok') {
      checks.push({
        name: '云函数存在',
        status: '✅',
        message: 'paymentManagement_v1_3 云函数存在且可调用'
      });
    } else {
      checks.push({
        name: '云函数存在',
        status: '❌',
        message: 'paymentManagement_v1_3 云函数不存在或无法调用'
      });
    }
  } catch (error) {
    checks.push({
      name: '云函数存在',
      status: '❌',
      message: '检查失败: ' + error.message
    });
  }
  
  // 2. 检查订单查询功能
  try {
    log.info('checkPaymentCallbackConfig', '步骤2: 检查订单查询功能');
    
    // 查询最近的订单
    const db = wx.cloud.database();
    const orderResult = await db.collection('payment_orders')
      .orderBy('createTime', 'desc')
      .limit(1)
      .get();
    
    if (orderResult.data.length > 0) {
      const latestOrder = orderResult.data[0];
      checks.push({
        name: '订单查询',
        status: '✅',
        message: `找到最近订单: ${latestOrder.out_trade_no}, 状态: ${latestOrder.status}`
      });
      
      // 检查订单是否有 grantInfo
      if (latestOrder.grantInfo) {
        checks.push({
          name: '订单 grantInfo',
          status: '✅',
          message: `grantInfo 状态: ${latestOrder.grantInfo.status}`
        });
      } else {
        checks.push({
          name: '订单 grantInfo',
          status: '⚠️',
          message: '订单没有 grantInfo 字段（可能是旧订单）'
        });
      }
    } else {
      checks.push({
        name: '订单查询',
        status: '⚠️',
        message: '没有找到订单记录'
      });
    }
  } catch (error) {
    checks.push({
      name: '订单查询',
      status: '❌',
      message: '查询失败: ' + error.message
    });
  }
  
  // 3. 显示检查结果
  console.log('\n========== 支付回调配置检查结果 ==========');
  checks.forEach(check => {
    console.log(`${check.status} ${check.name}: ${check.message}`);
  });
  console.log('==========================================\n');
  
  // 4. 提供排查建议
  const hasError = checks.some(check => check.status === '❌');
  
  if (hasError) {
    log.warn('checkPaymentCallbackConfig', '发现配置问题，请检查以下项：');
    console.log('\n排查建议：');
    console.log('1. 检查云函数是否已部署');
    console.log('2. 检查 HTTP 触发器是否配置');
    console.log('   - 云函数 → paymentManagement_v1_3 → 触发器');
    console.log('   - 确认是否有 HTTP 触发器，路径为 /payment/notify');
    console.log('3. 检查回调 URL 环境变量');
    console.log('   - 云函数 → 环境变量 → WECHAT_PAY_NOTIFY_URL');
    console.log('   - 格式应为: https://你的域名/payment/notify');
    console.log('4. 检查微信支付商户平台');
    console.log('   - 登录微信支付商户平台');
    console.log('   - 查看订单详情，确认支付是否成功');
    console.log('   - 查看回调通知记录');
    console.log('5. 查看云函数日志');
    console.log('   - 搜索关键字: handlePaymentNotify');
    console.log('   - 选择支付发生的时间范围');
  } else {
    log.success('checkPaymentCallbackConfig', '配置检查通过');
    console.log('\n如果支付回调仍未到达，请检查：');
    console.log('1. HTTP 触发器配置');
    console.log('2. WECHAT_PAY_NOTIFY_URL 环境变量');
    console.log('3. 微信支付商户平台的回调通知记录');
  }
  
  return checks;
}

// 导出函数
module.exports = {
  checkPaymentCallbackConfig
};

// 如果在小程序页面中使用
if (typeof Page !== 'undefined') {
  // 可以在页面中调用
  // const { checkPaymentCallbackConfig } = require('../../docs/tools/check-payment-callback-config.js');
  // await checkPaymentCallbackConfig();
}

