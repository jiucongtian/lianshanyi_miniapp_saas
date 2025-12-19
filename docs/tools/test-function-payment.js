/**
 * 功能付费订单测试脚本
 * 
 * 用于测试 Phase 4 的功能付费订单创建、支付回调、配额发放等功能
 * 
 * 使用方法：
 * 1. 在小程序页面中引入此文件
 * 2. 调用对应的测试函数
 * 3. 查看控制台输出和数据库验证结果
 */

const log = {
  info: (tag, ...args) => console.log(`[${tag}]`, ...args),
  error: (tag, ...args) => console.error(`[${tag}]`, ...args),
  success: (tag, ...args) => console.log(`✅ [${tag}]`, ...args),
  warn: (tag, ...args) => console.warn(`⚠️ [${tag}]`, ...args)
};

/**
 * 测试1：创建功能付费订单
 * @param {string} functionCode - 功能编码（wisdom_insight 或 ai_report）
 */
async function testCreateFunctionOrder(functionCode = 'wisdom_insight') {
  log.info('testCreateFunctionOrder', `开始测试创建功能付费订单: ${functionCode}`);
  
  try {
    // 调用云函数创建订单
    const result = await wx.cloud.callFunction({
      name: 'paymentManagement_v1_3',
      data: {
        action: 'createFunctionOrder',
        data: {
          functionCode: functionCode
        }
      }
    });
    
    log.info('testCreateFunctionOrder', '云函数返回:', result);
    
    if (!result.result) {
      log.error('testCreateFunctionOrder', '云函数返回结果为空');
      return { success: false, error: '云函数返回结果为空' };
    }
    
    const response = result.result;
    
    // 验证返回结果
    if (!response.success) {
      log.error('testCreateFunctionOrder', '创建订单失败:', response.error);
      return { success: false, error: response.error };
    }
    
    const orderData = response.data;
    
    // 验证必需字段
    const requiredFields = ['orderId', 'out_trade_no', 'prepay_id', 'paymentParams', 'functionCode', 'functionName', 'price'];
    const missingFields = requiredFields.filter(field => !orderData[field]);
    
    if (missingFields.length > 0) {
      log.error('testCreateFunctionOrder', '缺少必需字段:', missingFields);
      return { success: false, error: `缺少必需字段: ${missingFields.join(', ')}` };
    }
    
    // 验证支付参数
    const paymentParams = orderData.paymentParams;
    const requiredPaymentParams = ['timeStamp', 'nonceStr', 'package', 'signType', 'paySign'];
    const missingPaymentParams = requiredPaymentParams.filter(param => !paymentParams[param]);
    
    if (missingPaymentParams.length > 0) {
      log.error('testCreateFunctionOrder', '支付参数不完整:', missingPaymentParams);
      return { success: false, error: `支付参数不完整: ${missingPaymentParams.join(', ')}` };
    }
    
    log.success('testCreateFunctionOrder', '✅ 订单创建成功！');
    log.info('testCreateFunctionOrder', '订单信息:', {
      orderId: orderData.orderId,
      out_trade_no: orderData.out_trade_no,
      functionCode: orderData.functionCode,
      functionName: orderData.functionName,
      price: orderData.price,
      prepay_id: orderData.prepay_id
    });
    
    // 返回订单信息，用于后续测试
    return {
      success: true,
      data: orderData
    };
    
  } catch (error) {
    log.error('testCreateFunctionOrder', '测试异常:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 测试2：查询订单状态（验证 grantInfo 字段）
 * @param {string} orderId - 订单ID
 * @param {string} out_trade_no - 商户订单号（可选）
 */
async function testQueryOrderStatus(orderId, out_trade_no = null) {
  log.info('testQueryOrderStatus', '开始测试查询订单状态', { orderId, out_trade_no });
  
  try {
    const queryData = orderId ? { orderId } : { out_trade_no };
    
    const result = await wx.cloud.callFunction({
      name: 'paymentManagement_v1_3',
      data: {
        action: 'queryOrderStatus',
        data: queryData
      }
    });
    
    log.info('testQueryOrderStatus', '云函数返回:', result);
    
    if (!result.result) {
      log.error('testQueryOrderStatus', '云函数返回结果为空');
      return { success: false, error: '云函数返回结果为空' };
    }
    
    const response = result.result;
    
    if (!response.success) {
      log.error('testQueryOrderStatus', '查询订单失败:', response.error);
      return { success: false, error: response.error };
    }
    
    const orderData = response.data;
    
    // 验证功能付费订单字段
    if (orderData.functionCode) {
      log.info('testQueryOrderStatus', '功能付费订单字段:', {
        functionCode: orderData.functionCode,
        functionName: orderData.functionName,
        hasGrantData: !!orderData.grantData,
        hasGrantInfo: !!orderData.grantInfo
      });
      
      // 验证 grantInfo 字段
      if (orderData.grantInfo) {
        log.info('testQueryOrderStatus', 'grantInfo 详情:', orderData.grantInfo);
        
        const grantInfoFields = ['status', 'grantTime', 'grantResult', 'errorMessage'];
        const missingGrantFields = grantInfoFields.filter(field => !(field in orderData.grantInfo));
        
        if (missingGrantFields.length > 0) {
          log.warn('testQueryOrderStatus', 'grantInfo 缺少字段:', missingGrantFields);
        } else {
          log.success('testQueryOrderStatus', '✅ grantInfo 字段完整');
        }
      } else {
        log.warn('testQueryOrderStatus', '⚠️ grantInfo 字段不存在（订单可能未支付）');
      }
    }
    
    log.success('testQueryOrderStatus', '✅ 订单查询成功！');
    log.info('testQueryOrderStatus', '订单状态:', orderData.status);
    
    return {
      success: true,
      data: orderData
    };
    
  } catch (error) {
    log.error('testQueryOrderStatus', '测试异常:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 测试3：验证配额发放（支付成功后）
 * @param {string} functionCode - 功能编码
 */
async function testVerifyQuotaGrant(functionCode = 'wisdom_insight') {
  log.info('testVerifyQuotaGrant', `开始验证配额发放: ${functionCode}`);
  
  try {
    // 1. 查询配额信息（发放前）
    log.info('testVerifyQuotaGrant', '步骤1: 查询发放前的配额');
    const quotaBeforeResult = await wx.cloud.callFunction({
      name: 'functionQuotaManagement_v1_4',
      data: {
        action: 'getQuotaInfo',
        data: { functionCode }
      }
    });
    
    if (!quotaBeforeResult.result || !quotaBeforeResult.result.success) {
      log.error('testVerifyQuotaGrant', '查询配额失败');
      return { success: false, error: '查询配额失败' };
    }
    
    const quotaBefore = quotaBeforeResult.result.data;
    log.info('testVerifyQuotaGrant', '发放前配额:', quotaBefore);
    
    // 2. 手动发放配额（模拟支付成功后的发放）
    log.info('testVerifyQuotaGrant', '步骤2: 手动发放配额（模拟支付成功）');
    const grantResult = await wx.cloud.callFunction({
      name: 'functionQuotaManagement_v1_4',
      data: {
        action: 'grantQuota',
        data: {
          functionCode: functionCode,
          quantity: 1,
          orderId: 'test_order_' + Date.now()
        }
      }
    });
    
    if (!grantResult.result || !grantResult.result.success) {
      log.error('testVerifyQuotaGrant', '发放配额失败:', grantResult.result?.error);
      return { success: false, error: grantResult.result?.error || '发放配额失败' };
    }
    
    log.success('testVerifyQuotaGrant', '✅ 配额发放成功');
    log.info('testVerifyQuotaGrant', '发放结果:', grantResult.result.data);
    
    // 3. 查询配额信息（发放后）
    log.info('testVerifyQuotaGrant', '步骤3: 查询发放后的配额');
    const quotaAfterResult = await wx.cloud.callFunction({
      name: 'functionQuotaManagement_v1_4',
      data: {
        action: 'getQuotaInfo',
        data: { functionCode }
      }
    });
    
    if (!quotaAfterResult.result || !quotaAfterResult.result.success) {
      log.error('testVerifyQuotaGrant', '查询配额失败');
      return { success: false, error: '查询配额失败' };
    }
    
    const quotaAfter = quotaAfterResult.result.data;
    log.info('testVerifyQuotaGrant', '发放后配额:', quotaAfter);
    
    // 4. 验证配额变化
    const paidRemainingBefore = quotaBefore.paidRemaining || 0;
    const paidRemainingAfter = quotaAfter.paidRemaining || 0;
    
    if (paidRemainingAfter === paidRemainingBefore + 1) {
      log.success('testVerifyQuotaGrant', '✅ 配额增加正确（+1）');
    } else {
      log.error('testVerifyQuotaGrant', '❌ 配额增加不正确', {
        before: paidRemainingBefore,
        after: paidRemainingAfter,
        expected: paidRemainingBefore + 1
      });
      return { success: false, error: '配额增加不正确' };
    }
    
    return {
      success: true,
      data: {
        quotaBefore,
        quotaAfter,
        grantResult: grantResult.result.data
      }
    };
    
  } catch (error) {
    log.error('testVerifyQuotaGrant', '测试异常:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 测试4：完整流程测试（创建订单 -> 查询订单 -> 验证 grantInfo）
 * @param {string} functionCode - 功能编码
 */
async function testFullFlow(functionCode = 'wisdom_insight') {
  log.info('testFullFlow', `开始完整流程测试: ${functionCode}`);
  
  try {
    // 步骤1：创建订单
    log.info('testFullFlow', '========== 步骤1: 创建功能付费订单 ==========');
    const createResult = await testCreateFunctionOrder(functionCode);
    
    if (!createResult.success) {
      log.error('testFullFlow', '创建订单失败，停止测试');
      return { success: false, error: '创建订单失败: ' + createResult.error };
    }
    
    const orderData = createResult.data;
    const orderId = orderData.orderId;
    const out_trade_no = orderData.out_trade_no;
    
    // 步骤2：查询订单（验证 grantInfo 初始状态）
    log.info('testFullFlow', '========== 步骤2: 查询订单（验证 grantInfo） ==========');
    const queryResult1 = await testQueryOrderStatus(orderId);
    
    if (!queryResult1.success) {
      log.error('testFullFlow', '查询订单失败');
      return { success: false, error: '查询订单失败' };
    }
    
    const orderInfo = queryResult1.data;
    
    // 验证 grantInfo 初始状态
    if (orderInfo.grantInfo && orderInfo.grantInfo.status === 'pending') {
      log.success('testFullFlow', '✅ grantInfo 初始状态正确（pending）');
    } else {
      log.warn('testFullFlow', '⚠️ grantInfo 初始状态异常:', orderInfo.grantInfo);
    }
    
    // 步骤3：验证配额发放（模拟支付成功）
    log.info('testFullFlow', '========== 步骤3: 验证配额发放 ==========');
    log.warn('testFullFlow', '⚠️ 注意：此步骤需要实际支付或手动触发支付回调');
    log.warn('testFullFlow', '⚠️ 可以手动调用 grantQuota 接口模拟发放');
    
    const quotaGrantResult = await testVerifyQuotaGrant(functionCode);
    
    if (!quotaGrantResult.success) {
      log.error('testFullFlow', '配额发放验证失败');
      return { success: false, error: '配额发放验证失败' };
    }
    
    // 步骤4：再次查询订单（验证 grantInfo 更新）
    log.info('testFullFlow', '========== 步骤4: 再次查询订单（验证 grantInfo 更新） ==========');
    log.warn('testFullFlow', '⚠️ 注意：此步骤需要支付回调已处理，grantInfo 才会更新');
    log.warn('testFullFlow', '⚠️ 如果 grantInfo 未更新，请检查支付回调是否正常处理');
    
    const queryResult2 = await testQueryOrderStatus(orderId);
    
    if (!queryResult2.success) {
      log.error('testFullFlow', '再次查询订单失败');
      return { success: false, error: '再次查询订单失败' };
    }
    
    const orderInfoAfter = queryResult2.data;
    
    if (orderInfoAfter.grantInfo) {
      log.info('testFullFlow', 'grantInfo 当前状态:', orderInfoAfter.grantInfo);
      
      if (orderInfoAfter.grantInfo.status === 'granted') {
        log.success('testFullFlow', '✅ grantInfo 状态已更新为 granted');
      } else if (orderInfoAfter.grantInfo.status === 'failed') {
        log.error('testFullFlow', '❌ grantInfo 状态为 failed:', orderInfoAfter.grantInfo.errorMessage);
      } else {
        log.warn('testFullFlow', '⚠️ grantInfo 状态仍为 pending（支付回调可能未处理）');
      }
    }
    
    log.success('testFullFlow', '========== 完整流程测试完成 ==========');
    
    return {
      success: true,
      data: {
        orderId,
        out_trade_no,
        orderInfo,
        orderInfoAfter,
        quotaGrantResult: quotaGrantResult.data
      }
    };
    
  } catch (error) {
    log.error('testFullFlow', '测试异常:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 快速测试：创建订单并查询
 */
async function runQuickTest() {
  log.info('runQuickTest', '========== 快速测试开始 ==========');
  
  const functionCode = 'wisdom_insight';
  
  // 1. 创建订单
  const createResult = await testCreateFunctionOrder(functionCode);
  if (!createResult.success) {
    log.error('runQuickTest', '创建订单失败');
    return;
  }
  
  // 2. 查询订单
  const queryResult = await testQueryOrderStatus(createResult.data.orderId);
  if (!queryResult.success) {
    log.error('runQuickTest', '查询订单失败');
    return;
  }
  
  log.success('runQuickTest', '========== 快速测试完成 ==========');
}

// 导出测试函数
module.exports = {
  testCreateFunctionOrder,
  testQueryOrderStatus,
  testVerifyQuotaGrant,
  testFullFlow,
  runQuickTest
};

