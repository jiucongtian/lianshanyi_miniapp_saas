/**
 * 调试页面
 * 用于测试各种功能，包括配额管理、支付等
 */
const { createModuleLogger } = require('../../utils/logger/index');
const log = createModuleLogger('DebugPage');

Page({
  data: {
    currentTest: '', // 当前执行的测试
    testResults: [] // 测试结果列表
  },

  onLoad(options) {
    log.info('onLoad', '调试页面加载');
  },

  /**
   * 配额管理 - 完整测试
   */
  async onQuotaFullTest() {
    log.info('onQuotaFullTest', '开始完整测试');
    try {
      await this._runFullTest('wisdom_insight');
    } catch (error) {
      log.error('onQuotaFullTest', '测试执行失败', error);
      wx.showToast({
        title: '测试失败: ' + (error.message || '未知错误'),
        icon: 'error',
        duration: 3000
      });
    }
  },

  /**
   * 配额管理 - 快速测试
   */
  async onQuotaQuickTest() {
    log.info('onQuotaQuickTest', '开始快速测试');
    try {
      await this._runQuickTest('wisdom_insight');
    } catch (error) {
      log.error('onQuotaQuickTest', '测试执行失败', error);
      wx.showToast({
        title: '测试失败: ' + (error.message || '未知错误'),
        icon: 'error',
        duration: 3000
      });
    }
  },

  /**
   * 配额管理 - 检查配额
   */
  async onQuotaCheck() {
    log.info('onQuotaCheck', '开始检查配额');
    try {
      await this._testCheckQuota('wisdom_insight');
    } catch (error) {
      log.error('onQuotaCheck', '测试执行失败', error);
      wx.showToast({
        title: '测试失败: ' + (error.message || '未知错误'),
        icon: 'error',
        duration: 3000
      });
    }
  },

  /**
   * 配额管理 - 发放配额
   */
  async onQuotaGrant() {
    log.info('onQuotaGrant', '开始发放配额');
    try {
      await this._testGrantQuota('wisdom_insight', 10);
    } catch (error) {
      log.error('onQuotaGrant', '测试执行失败', error);
      wx.showToast({
        title: '测试失败: ' + (error.message || '未知错误'),
        icon: 'error',
        duration: 3000
      });
    }
  },

  /**
   * 配额管理 - 扣除配额
   */
  async onQuotaDeduct() {
    log.info('onQuotaDeduct', '开始扣除配额');
    try {
      await this._testDeductQuota('wisdom_insight', 1);
    } catch (error) {
      log.error('onQuotaDeduct', '测试执行失败', error);
      wx.showToast({
        title: '测试失败: ' + (error.message || '未知错误'),
        icon: 'error',
        duration: 3000
      });
    }
  },

  /**
   * 配额管理 - 回滚配额
   */
  async onQuotaRollback() {
    log.info('onQuotaRollback', '开始回滚配额');
    try {
      await this._testRollbackQuota('wisdom_insight', false);
    } catch (error) {
      log.error('onQuotaRollback', '测试执行失败', error);
      wx.showToast({
        title: '测试失败: ' + (error.message || '未知错误'),
        icon: 'error',
        duration: 3000
      });
    }
  },

  /**
   * 快速测试
   */
  async _runQuickTest(functionCode) {
    console.log('\n⚡ 快速测试');
    await this._testCheckQuota(functionCode);
    await new Promise(resolve => setTimeout(resolve, 1500));
    await this._testGetQuotaInfo(functionCode);
    console.log('\n✅ 快速测试完成');
  },

  /**
   * 完整测试流程
   */
  async _runFullTest(functionCode) {
    console.log('\n🚀 开始完整测试流程');
    
    try {
      // 步骤1：检查初始配额
      console.log('\n📋 步骤1：检查初始配额');
      const initialQuota = await this._testCheckQuota(functionCode);
      if (!initialQuota) {
        console.error('❌ 初始配额检查失败，终止测试');
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 步骤2：发放测试配额（如果付费配额为0）
      if (initialQuota.paidRemaining === 0) {
        console.log('\n📋 步骤2：发放测试配额（10次）');
        await this._testGrantQuota(functionCode, 10);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // 步骤3：扣除配额
      console.log('\n📋 步骤3：扣除配额');
      const deductResult = await this._testDeductQuota(functionCode, 1);
      if (!deductResult) {
        console.error('❌ 扣除配额失败，终止测试');
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 步骤4：验证扣除后的配额
      console.log('\n📋 步骤4：验证扣除后的配额');
      await this._testCheckQuota(functionCode);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 步骤5：回滚配额
      console.log('\n📋 步骤5：回滚配额');
      await this._testRollbackQuota(functionCode, deductResult.isPaid);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 步骤6：验证回滚后的配额
      console.log('\n📋 步骤6：验证回滚后的配额');
      await this._testCheckQuota(functionCode);
      
      console.log('\n✅ 完整测试流程结束');
      
      wx.showModal({
        title: '测试完成',
        content: '所有测试已完成，请查看控制台日志',
        showCancel: false
      });
      
    } catch (error) {
      console.error('\n❌ 测试流程异常:', error);
      wx.showToast({
        title: '测试异常: ' + error.message,
        icon: 'error',
        duration: 3000
      });
    }
  },

  /**
   * 测试1：检查配额
   */
  async _testCheckQuota(functionCode) {
    console.log('\n【测试1】检查配额 - checkQuota');
    console.log('功能编码:', functionCode);
    
    wx.showLoading({ title: '检查配额中...', mask: true });
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'functionQuotaManagement_v1_4',
        data: {
          action: 'checkQuota',
          data: { functionCode: functionCode }
        }
      });
      
      wx.hideLoading();
      
      console.log('📊 云函数返回结果:', JSON.stringify(res.result, null, 2));
      
      const result = res.result;
      
      if (result.success) {
        const quota = result.data;
        console.log('✅ 检查成功！配额信息：');
        console.log('  - 是否可用:', quota.canUse ? '✅ 是' : '❌ 否');
        console.log('  - 免费剩余:', quota.freeRemaining === Infinity ? '∞ (无限)' : quota.freeRemaining);
        console.log('  - 付费剩余:', quota.paidRemaining);
        console.log('  - 总剩余:', quota.totalRemaining === Infinity ? '∞ (无限)' : quota.totalRemaining);
        console.log('  - 每日免费配额:', quota.freeDailyQuota === -1 ? '∞ (无限)' : quota.freeDailyQuota);
        console.log('  - 今日已用免费次数:', quota.freeUsedToday);
        
        wx.showToast({
          title: `可用: ${quota.totalRemaining === Infinity ? '∞' : quota.totalRemaining}次`,
          icon: 'success',
          duration: 2000
        });
        
        return quota;
      } else {
        console.error('❌ 检查失败:', result.error);
        wx.showToast({
          title: '检查失败: ' + result.error,
          icon: 'error',
          duration: 3000
        });
        return null;
      }
    } catch (error) {
      wx.hideLoading();
      console.error('❌ 调用失败:', error);
      wx.showToast({
        title: '调用失败: ' + error.message,
        icon: 'error',
        duration: 3000
      });
      return null;
    }
  },

  /**
   * 测试2：扣除配额
   */
  async _testDeductQuota(functionCode, quantity) {
    console.log('\n【测试2】扣除配额 - deductQuota');
    
    const confirmResult = await new Promise((resolve) => {
      wx.showModal({
        title: '确认扣除配额',
        content: `确定要扣除 ${quantity} 次 ${functionCode} 的配额吗？`,
        success: (res) => resolve(res.confirm)
      });
    });
    
    if (!confirmResult) {
      return null;
    }
    
    wx.showLoading({ title: '扣除配额中...', mask: true });
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'functionQuotaManagement_v1_4',
        data: {
          action: 'deductQuota',
          data: {
            functionCode: functionCode,
            quantity: quantity,
            functionName: functionCode === 'wisdom_insight' ? '智慧洞见' : 'AI出报告'
          }
        }
      });
      
      wx.hideLoading();
      
      console.log('📊 云函数返回结果:', JSON.stringify(res.result, null, 2));
      
      const result = res.result;
      
      if (result.success) {
        const deductInfo = result.data;
        console.log('✅ 扣除成功！');
        console.log('  - 是否使用付费配额:', deductInfo.isPaid ? '✅ 是' : '❌ 否（使用免费配额）');
        console.log('  - 扣除前配额:', deductInfo.quotaBefore);
        console.log('  - 扣除后配额:', deductInfo.quotaAfter);
        
        wx.showToast({
          title: deductInfo.isPaid ? '已扣除付费配额' : '已扣除免费配额',
          icon: 'success',
          duration: 2000
        });
        
        return deductInfo;
      } else {
        console.error('❌ 扣除失败:', result.error);
        wx.showModal({
          title: '扣除失败',
          content: result.error + (result.code === 'QUOTA_INSUFFICIENT' ? '\n\n配额不足，请先发放配额' : ''),
          showCancel: false
        });
        return null;
      }
    } catch (error) {
      wx.hideLoading();
      console.error('❌ 调用失败:', error);
      wx.showToast({
        title: '调用失败: ' + error.message,
        icon: 'error',
        duration: 3000
      });
      return null;
    }
  },

  /**
   * 测试3：发放配额
   */
  async _testGrantQuota(functionCode, quantity) {
    console.log('\n【测试3】发放配额 - grantQuota');
    
    const confirmResult = await new Promise((resolve) => {
      wx.showModal({
        title: '确认发放配额',
        content: `确定要发放 ${quantity} 次 ${functionCode} 的配额吗？`,
        success: (res) => resolve(res.confirm)
      });
    });
    
    if (!confirmResult) {
      return null;
    }
    
    wx.showLoading({ title: '发放配额中...', mask: true });
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'functionQuotaManagement_v1_4',
        data: {
          action: 'grantQuota',
          data: {
            functionCode: functionCode,
            quantity: quantity,
            orderId: 'test_order_' + Date.now()
          }
        }
      });
      
      wx.hideLoading();
      
      console.log('📊 云函数返回结果:', JSON.stringify(res.result, null, 2));
      
      const result = res.result;
      
      if (result.success) {
        console.log('✅ 发放成功！');
        console.log('  - 功能编码:', result.data.functionCode);
        console.log('  - 发放数量:', result.data.quantity);
        
        wx.showToast({
          title: `已发放 ${quantity} 次配额`,
          icon: 'success',
          duration: 2000
        });
        
        // 发放后立即检查配额，验证发放是否成功
        setTimeout(() => {
          this._testCheckQuota(functionCode);
        }, 1000);
        
        return result.data;
      } else {
        console.error('❌ 发放失败:', result.error);
        wx.showToast({
          title: '发放失败: ' + result.error,
          icon: 'error',
          duration: 3000
        });
        return null;
      }
    } catch (error) {
      wx.hideLoading();
      console.error('❌ 调用失败:', error);
      wx.showToast({
        title: '调用失败: ' + error.message,
        icon: 'error',
        duration: 3000
      });
      return null;
    }
  },

  /**
   * 测试4：回滚配额
   */
  async _testRollbackQuota(functionCode, isPaid) {
    console.log('\n【测试4】回滚配额 - rollbackQuota');
    
    const confirmResult = await new Promise((resolve) => {
      wx.showModal({
        title: '确认回滚配额',
        content: `确定要回滚 ${isPaid ? '付费' : '免费'}配额吗？\n\n注意：此操作会恢复最近一次扣除的配额`,
        success: (res) => resolve(res.confirm)
      });
    });
    
    if (!confirmResult) {
      return null;
    }
    
    wx.showLoading({ title: '回滚配额中...', mask: true });
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'functionQuotaManagement_v1_4',
        data: {
          action: 'rollbackQuota',
          data: {
            functionCode: functionCode,
            quantity: 1,
            isPaid: isPaid
          }
        }
      });
      
      wx.hideLoading();
      
      console.log('📊 云函数返回结果:', JSON.stringify(res.result, null, 2));
      
      const result = res.result;
      
      if (result.success) {
        console.log('✅ 回滚成功！');
        
        wx.showToast({
          title: '配额已回滚',
          icon: 'success',
          duration: 2000
        });
        
        // 回滚后立即检查配额，验证回滚是否成功
        setTimeout(() => {
          this._testCheckQuota(functionCode);
        }, 1000);
        
        return result.data;
      } else {
        console.error('❌ 回滚失败:', result.error);
        wx.showToast({
          title: '回滚失败: ' + result.error,
          icon: 'error',
          duration: 3000
        });
        return null;
      }
    } catch (error) {
      wx.hideLoading();
      console.error('❌ 调用失败:', error);
      wx.showToast({
        title: '调用失败: ' + error.message,
        icon: 'error',
        duration: 3000
      });
      return null;
    }
  },

  /**
   * 测试5：获取配额信息
   */
  async _testGetQuotaInfo(functionCode) {
    console.log('\n【测试5】获取配额信息 - getQuotaInfo');
    
    wx.showLoading({ title: '获取配额信息中...', mask: true });
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'functionQuotaManagement_v1_4',
        data: {
          action: 'getQuotaInfo',
          data: { functionCode: functionCode }
        }
      });
      
      wx.hideLoading();
      
      console.log('📊 云函数返回结果:', JSON.stringify(res.result, null, 2));
      
      const result = res.result;
      
      if (result.success) {
        const quota = result.data;
        console.log('✅ 获取成功！配额信息:');
        console.log('  - 是否可用:', quota.canUse ? '✅ 是' : '❌ 否');
        console.log('  - 免费剩余:', quota.freeRemaining === Infinity ? '∞ (无限)' : quota.freeRemaining);
        console.log('  - 付费剩余:', quota.paidRemaining);
        console.log('  - 总剩余:', quota.totalRemaining === Infinity ? '∞ (无限)' : quota.totalRemaining);
        
        wx.showToast({
          title: '获取成功',
          icon: 'success',
          duration: 2000
        });
        
        return quota;
      } else {
        console.error('❌ 获取失败:', result.error);
        wx.showToast({
          title: '获取失败: ' + result.error,
          icon: 'error',
          duration: 3000
        });
        return null;
      }
    } catch (error) {
      wx.hideLoading();
      console.error('❌ 调用失败:', error);
      wx.showToast({
        title: '调用失败: ' + error.message,
        icon: 'error',
        duration: 3000
      });
      return null;
    }
  },

  /**
   * 测试支付功能（方案二：微信支付V3 API）
   */
  async onTestPayment() {
    log.info('onTestPayment', '开始测试支付流程');
    
    // 显示确认对话框
    const confirmResult = await new Promise((resolve) => {
      wx.showModal({
        title: '支付测试',
        content: '将创建一个0.01元的测试订单，确认要继续吗？',
        confirmText: '继续测试',
        cancelText: '取消',
        success: (res) => resolve(res.confirm)
      });
    });
    
    if (!confirmResult) {
      log.info('onTestPayment', '用户取消测试');
      return;
    }
    
    // 显示加载提示
    wx.showLoading({
      title: '创建订单中...',
      mask: true
    });
    
    try {
      // 步骤1：创建支付订单
      log.info('onTestPayment', '步骤1: 调用云函数创建订单');
      
      const createOrderResult = await wx.cloud.callFunction({
        name: 'paymentManagement_v1_3',
        data: {
          action: 'createPaymentOrder',
          data: {
            description: '测试订单 - 升级高级用户',
            amount: 1,  // 0.01元（单位：分）
            orderType: 'upgrade_premium',
            orderData: {
              targetUserType: 'premium'
            }
          }
        }
      });
      
      log.info('onTestPayment', '云函数返回结果:', createOrderResult);
      log.info('onTestPayment', '云函数result字段:', createOrderResult.result);
      
      // 检查云函数调用结果
      if (!createOrderResult.result) {
        log.error('onTestPayment', '云函数返回结果为空');
        throw new Error('云函数调用失败：返回结果为空');
      }
      
      const result = createOrderResult.result;
      
      log.info('onTestPayment', '解析result.success:', result.success);
      log.info('onTestPayment', '解析result.error:', result.error);
      log.info('onTestPayment', '解析result.data:', result.data);
      
      if (!result.success) {
        log.error('onTestPayment', '订单创建失败', {
          success: result.success,
          error: result.error,
          code: result.code,
          fullResult: result
        });
        throw new Error(result.error || '创建订单失败');
      }
      
      // 获取支付参数和订单信息
      const { orderId, out_trade_no, paymentParams, prepay_id } = result.data;
      const orderAmount = 1; // 订单金额（分）
      
      log.info('onTestPayment', '订单创建成功', {
        orderId,
        out_trade_no,
        prepay_id,
        orderAmount,
        paymentParams
      });
      
      // 检查支付参数
      if (!paymentParams) {
        throw new Error('支付参数为空');
      }
      
      // 验证支付参数完整性
      const requiredFields = ['timeStamp', 'nonceStr', 'package', 'signType', 'paySign'];
      const missingFields = requiredFields.filter(field => !paymentParams[field]);
      if (missingFields.length > 0) {
        log.error('onTestPayment', '支付参数不完整，缺少字段:', missingFields);
        throw new Error('支付参数不完整：' + missingFields.join(', '));
      }
      
      wx.hideLoading();
      
      // 显示订单信息
      await new Promise((resolve) => {
        wx.showModal({
          title: '订单创建成功',
          content: `订单号：${out_trade_no}\n金额：¥0.01\nprepay_id: ${prepay_id.substring(0, 20)}...\n\n即将调起微信支付...`,
          showCancel: false,
          confirmText: '确定',
          success: () => resolve()
        });
      });
      
      // 步骤2：调起微信支付
      log.info('onTestPayment', '步骤2: 调起微信支付', paymentParams);
      
      wx.showLoading({
        title: '调起支付中...',
        mask: true
      });
      
      // 延迟一下，让用户看到提示
      await new Promise(resolve => setTimeout(resolve, 500));
      
      wx.hideLoading();
      
      // 准备支付参数
      const requestPaymentParams = {
        timeStamp: paymentParams.timeStamp,
        nonceStr: paymentParams.nonceStr,
        package: paymentParams.package,
        signType: paymentParams.signType,
        paySign: paymentParams.paySign
      };
      
      log.info('onTestPayment', '调起支付参数:', requestPaymentParams);
      
      // 调用微信支付API
      const paymentResult = await new Promise((resolve, reject) => {
        wx.requestPayment({
          ...requestPaymentParams,
          success: (res) => {
            log.info('onTestPayment', '支付成功', res);
            resolve(res);
          },
          fail: (err) => {
            log.error('onTestPayment', '支付失败', err);
            reject(err);
          }
        });
      });
      
      // 步骤3：支付成功处理
      log.info('onTestPayment', '步骤3: 支付成功，等待回调处理');
      
      wx.showLoading({
        title: '处理中...',
        mask: true
      });
      
      // 等待3秒，让支付回调有时间处理
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      wx.hideLoading();
      
      // 步骤4：查询订单状态
      log.info('onTestPayment', '步骤4: 查询订单状态');
      
      const queryResult = await wx.cloud.callFunction({
        name: 'paymentManagement_v1_3',
        data: {
          action: 'queryOrderStatus',
          data: {
            out_trade_no: out_trade_no
          }
        }
      });
      
      log.info('onTestPayment', '订单状态查询结果:', queryResult);
      
      // 步骤5：验证用户是否已升级
      log.info('onTestPayment', '步骤5: 验证用户类型');
      
      const userInfoResult = await wx.cloud.callFunction({
        name: 'userManagement_v1_3',
        data: {
          action: 'getUserInfo'
        }
      });
      
      log.info('onTestPayment', '用户信息:', userInfoResult);
      
      const userType = userInfoResult.result?.data?.userType || 'unknown';
      const orderStatus = queryResult.result?.data?.status || 'unknown';
      
      // 显示测试结果
      wx.showModal({
        title: '✅ 支付测试完成',
        content: `订单状态：${orderStatus}\n用户类型：${userType}\n\n请检查：\n1. 云函数日志\n2. payment_orders 数据表\n3. users 数据表`,
        showCancel: false,
        confirmText: '知道了'
      });
      
    } catch (error) {
      wx.hideLoading();
      
      log.error('onTestPayment', '支付流程失败', error);
      
      // 判断错误类型
      let errorMessage = '支付失败';
      let errorDetail = '';
      
      if (error.errMsg) {
        if (error.errMsg.includes('cancel')) {
          errorMessage = '支付已取消';
          errorDetail = '如果看到"缺少totalfee"等错误提示，可能是：\n\n1. 商户号配置问题\n2. 小程序未在微信支付商户平台关联\n3. 证书序列号配置错误\n\n请检查云函数日志查看详细错误';
        } else if (error.errMsg.includes('param')) {
          errorMessage = '支付参数错误';
          errorDetail = '请检查云函数配置和环境变量';
        } else {
          errorMessage = error.errMsg;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      wx.showModal({
        title: '❌ 支付失败',
        content: errorMessage + (errorDetail ? '\n\n' + errorDetail : '') + '\n\n请查看控制台日志获取详细信息',
        showCancel: false,
        confirmText: '知道了'
      });
    }
  },

  /**
   * 功能付费订单 - 完整流程测试
   */
  async onFunctionPaymentFullTest() {
    log.info('onFunctionPaymentFullTest', '开始完整流程测试');
    try {
      await this._testFullFunctionPaymentFlow('wisdom_insight');
    } catch (error) {
      log.error('onFunctionPaymentFullTest', '测试执行失败', error);
      wx.showToast({
        title: '测试失败: ' + (error.message || '未知错误'),
        icon: 'error',
        duration: 3000
      });
    }
  },

  /**
   * 功能付费订单 - 快速测试
   */
  async onFunctionPaymentQuickTest() {
    log.info('onFunctionPaymentQuickTest', '开始快速测试');
    try {
      await this._testQuickFunctionPayment('wisdom_insight');
    } catch (error) {
      log.error('onFunctionPaymentQuickTest', '测试执行失败', error);
      wx.showToast({
        title: '测试失败: ' + (error.message || '未知错误'),
        icon: 'error',
        duration: 3000
      });
    }
  },

  /**
   * 功能付费订单 - 创建订单
   */
  async onFunctionPaymentCreate() {
    log.info('onFunctionPaymentCreate', '开始创建订单');
    try {
      await this._testCreateFunctionOrder('wisdom_insight');
    } catch (error) {
      log.error('onFunctionPaymentCreate', '测试执行失败', error);
      wx.showToast({
        title: '测试失败: ' + (error.message || '未知错误'),
        icon: 'error',
        duration: 3000
      });
    }
  },

  /**
   * 功能付费订单 - 查询订单
   */
  async onFunctionPaymentQuery() {
    log.info('onFunctionPaymentQuery', '开始查询订单');
    try {
      await this._testQueryFunctionOrder();
    } catch (error) {
      log.error('onFunctionPaymentQuery', '测试执行失败', error);
      wx.showToast({
        title: '测试失败: ' + (error.message || '未知错误'),
        icon: 'error',
        duration: 3000
      });
    }
  },

  /**
   * 功能付费订单 - 验证配额发放
   */
  async onFunctionPaymentVerifyQuota() {
    log.info('onFunctionPaymentVerifyQuota', '开始验证配额发放');
    try {
      await this._testVerifyQuotaGrant('wisdom_insight');
    } catch (error) {
      log.error('onFunctionPaymentVerifyQuota', '测试执行失败', error);
      wx.showToast({
        title: '测试失败: ' + (error.message || '未知错误'),
        icon: 'error',
        duration: 3000
      });
    }
  },

  /**
   * 功能付费订单 - 查看配额信息
   */
  async onFunctionPaymentQuotaInfo() {
    log.info('onFunctionPaymentQuotaInfo', '开始查看配额信息');
    try {
      await this._testGetQuotaInfo('wisdom_insight');
    } catch (error) {
      log.error('onFunctionPaymentQuotaInfo', '测试执行失败', error);
      wx.showToast({
        title: '测试失败: ' + (error.message || '未知错误'),
        icon: 'error',
        duration: 3000
      });
    }
  },

  /**
   * 完整流程测试
   */
  async _testFullFunctionPaymentFlow(functionCode) {
    wx.showLoading({ title: '完整流程测试中...', mask: true });
    
    try {
      console.log('========== 步骤1: 创建功能付费订单 ==========');
      const createResult = await this._testCreateFunctionOrder(functionCode, false);
      
      if (!createResult || !createResult.success) {
        throw new Error('创建订单失败');
      }
      
      const orderId = createResult.data.orderId;
      const out_trade_no = createResult.data.out_trade_no;
      
      console.log('========== 步骤2: 查询订单（验证 grantInfo） ==========');
      const queryResult1 = await this._testQueryFunctionOrder(orderId, null, false);
      
      if (!queryResult1 || !queryResult1.success) {
        throw new Error('查询订单失败');
      }
      
      const orderInfo = queryResult1.data;
      console.log('订单信息:', orderInfo);
      
      if (orderInfo.grantInfo && orderInfo.grantInfo.status === 'pending') {
        console.log('✅ grantInfo 初始状态正确（pending）');
      }
      
      console.log('========== 步骤3: 调起真实支付 ==========');
      console.log('⚠️ 注意：此步骤将调起真实的微信支付，请完成支付');
      
      const paymentResult = await this._testRealPayment(createResult.data);
      
      if (!paymentResult || !paymentResult.success) {
        console.warn('⚠️ 支付失败或取消，但继续测试');
        wx.hideLoading();
        wx.showModal({
          title: '⚠️ 支付未完成',
          content: '支付未完成，无法验证后续流程。\n\n如需完整测试，请重新运行测试并完成支付。',
          showCancel: false,
          confirmText: '知道了'
        });
        return;
      }
      
      console.log('✅ 支付成功，等待支付回调处理...');
      
      // 等待支付回调处理（通常需要几秒钟）
      console.log('========== 步骤4: 等待支付回调处理 ==========');
      wx.showLoading({ title: '等待回调处理中...', mask: true });
      
      // 等待5秒，让支付回调有时间处理
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      wx.hideLoading();
      
      console.log('========== 步骤5: 查询订单（验证 grantInfo 更新） ==========');
      
      // 多次查询，直到 grantInfo 更新或超时
      let queryAttempts = 0;
      const maxAttempts = 6; // 最多查询6次（30秒）
      let orderInfoAfter = null;
      
      while (queryAttempts < maxAttempts) {
        queryAttempts++;
        console.log(`查询订单（第 ${queryAttempts} 次）...`);
        
        const queryResult = await this._testQueryFunctionOrder(orderId, null, false);
        
        if (queryResult && queryResult.success) {
          orderInfoAfter = queryResult.data;
          
          if (orderInfoAfter.status === 'SUCCESS') {
            console.log('✅ 订单状态已更新为 SUCCESS');
            
            if (orderInfoAfter.grantInfo) {
              console.log('grantInfo 当前状态:', orderInfoAfter.grantInfo);
              
              if (orderInfoAfter.grantInfo.status === 'granted') {
                console.log('✅ grantInfo 状态已更新为 granted');
                break; // 成功，退出循环
              } else if (orderInfoAfter.grantInfo.status === 'failed') {
                console.error('❌ grantInfo 状态为 failed:', orderInfoAfter.grantInfo.errorMessage);
                break; // 失败，退出循环
              } else {
                console.log('grantInfo 状态仍为 pending，继续等待...');
              }
            } else {
              console.log('grantInfo 字段不存在，继续等待...');
            }
          } else {
            console.log(`订单状态仍为 ${orderInfoAfter.status}，继续等待...`);
          }
        }
        
        // 如果不是最后一次，等待5秒后继续查询
        if (queryAttempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
      
      console.log('========== 步骤6: 验证配额发放 ==========');
      
      // 查询当前配额，验证是否已经发放（而不是手动发放）
      const quotaBeforeTest = await wx.cloud.callFunction({
        name: 'functionQuotaManagement_v1_4',
        data: {
          action: 'getQuotaInfo',
          data: { functionCode }
        }
      });
      
      if (quotaBeforeTest.result && quotaBeforeTest.result.success) {
        const currentQuota = quotaBeforeTest.result.data;
        console.log('当前配额:', currentQuota);
        
        if (orderInfoAfter && orderInfoAfter.status === 'SUCCESS' && orderInfoAfter.grantInfo?.status === 'granted') {
          console.log('✅ 支付回调已处理，配额应该已经发放');
          console.log('当前付费配额:', currentQuota.paidRemaining);
        } else {
          console.warn('⚠️ 支付回调未处理或处理失败，配额可能未发放');
          console.warn('⚠️ 请检查：');
          console.warn('1. 云函数是否配置了 HTTP 触发器');
          console.warn('2. WECHAT_PAY_NOTIFY_URL 环境变量是否正确配置');
          console.warn('3. 支付回调日志中是否有错误');
        }
      }
      
      wx.hideLoading();
      
      // 构建测试结果内容
      let resultContent = `订单号：${out_trade_no}\n订单ID：${orderId}\n\n`;
      
      if (orderInfoAfter) {
        resultContent += `订单状态：${orderInfoAfter.status}\n`;
        
        if (orderInfoAfter.status === 'SUCCESS') {
          resultContent += `✅ 支付回调已处理\n`;
        } else {
          resultContent += `❌ 支付回调未处理（状态仍为 ${orderInfoAfter.status}）\n`;
        }
        
        if (orderInfoAfter.grantInfo) {
          resultContent += `grantInfo状态：${orderInfoAfter.grantInfo.status}\n`;
          if (orderInfoAfter.grantInfo.status === 'granted') {
            resultContent += `✅ 权益发放成功\n`;
            resultContent += `发放时间：${orderInfoAfter.grantInfo.grantTime ? new Date(orderInfoAfter.grantInfo.grantTime).toLocaleString() : '未知'}\n`;
          } else if (orderInfoAfter.grantInfo.status === 'failed') {
            resultContent += `❌ 权益发放失败\n`;
            resultContent += `错误信息：${orderInfoAfter.grantInfo.errorMessage || '未知'}\n`;
          } else {
            resultContent += `⚠️ grantInfo 仍为 pending（支付回调可能未处理）\n`;
          }
        } else {
          resultContent += `grantInfo：未更新（可能回调未处理）\n`;
        }
      } else {
        resultContent += `订单状态：查询失败\n`;
      }
      
      // 添加排查建议
      if (!orderInfoAfter || orderInfoAfter.status !== 'SUCCESS' || orderInfoAfter.grantInfo?.status !== 'granted') {
        resultContent += `\n⚠️ 排查建议：\n`;
        resultContent += `1. 检查云函数是否配置了 HTTP 触发器\n`;
        resultContent += `2. 检查 WECHAT_PAY_NOTIFY_URL 环境变量\n`;
        resultContent += `3. 查看云函数日志中的支付回调记录\n`;
        resultContent += `4. 确认支付是否真的成功（微信支付记录）\n`;
      }
      
      resultContent += `\n请检查：\n1. 云函数日志\n2. payment_orders 数据表\n3. function_quotas 数据表`;
      
      wx.showModal({
        title: orderInfoAfter?.status === 'SUCCESS' && orderInfoAfter?.grantInfo?.status === 'granted' ? '✅ 完整流程测试完成' : '⚠️ 测试完成（请检查结果）',
        content: resultContent,
        showCancel: false,
        confirmText: '知道了'
      });
      
    } catch (error) {
      wx.hideLoading();
      console.error('完整流程测试失败:', error);
      wx.showModal({
        title: '❌ 测试失败',
        content: error.message || '未知错误',
        showCancel: false,
        confirmText: '知道了'
      });
    }
  },

  /**
   * 快速测试（创建订单 + 查询订单）
   */
  async _testQuickFunctionPayment(functionCode) {
    wx.showLoading({ title: '快速测试中...', mask: true });
    
    try {
      // 创建订单
      const createResult = await this._testCreateFunctionOrder(functionCode, false);
      
      if (!createResult || !createResult.success) {
        throw new Error('创建订单失败');
      }
      
      // 查询订单
      const queryResult = await this._testQueryFunctionOrder(createResult.data.orderId, null, false);
      
      wx.hideLoading();
      
      if (queryResult && queryResult.success) {
        wx.showModal({
          title: '✅ 快速测试完成',
          content: `订单创建成功\n订单号：${createResult.data.out_trade_no}\n\n请查看控制台日志获取详细信息`,
          showCancel: false,
          confirmText: '知道了'
        });
      }
      
    } catch (error) {
      wx.hideLoading();
      console.error('快速测试失败:', error);
      wx.showModal({
        title: '❌ 测试失败',
        content: error.message || '未知错误',
        showCancel: false,
        confirmText: '知道了'
      });
    }
  },

  /**
   * 创建功能付费订单
   */
  async _testCreateFunctionOrder(functionCode, showLoading = true) {
    if (showLoading) {
      wx.showLoading({ title: '创建订单中...', mask: true });
    }
    
    try {
      console.log('[testCreateFunctionOrder] 开始创建功能付费订单:', functionCode);
      
      const result = await wx.cloud.callFunction({
        name: 'paymentManagement_v1_3',
        data: {
          action: 'createFunctionOrder',
          data: {
            functionCode: functionCode
          }
        }
      });
      
      console.log('[testCreateFunctionOrder] 云函数返回:', result);
      
      if (!result.result) {
        throw new Error('云函数返回结果为空');
      }
      
      const response = result.result;
      
      if (!response.success) {
        throw new Error(response.error || '创建订单失败');
      }
      
      const orderData = response.data;
      
      // 验证必需字段
      const requiredFields = ['orderId', 'out_trade_no', 'prepay_id', 'paymentParams', 'functionCode', 'functionName', 'price'];
      const missingFields = requiredFields.filter(field => !orderData[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`缺少必需字段: ${missingFields.join(', ')}`);
      }
      
      console.log('✅ 订单创建成功！');
      console.log('订单信息:', {
        orderId: orderData.orderId,
        out_trade_no: orderData.out_trade_no,
        functionCode: orderData.functionCode,
        functionName: orderData.functionName,
        price: orderData.price,
        prepay_id: orderData.prepay_id
      });
      
      if (showLoading) {
        wx.hideLoading();
        wx.showModal({
          title: '✅ 订单创建成功',
          content: `功能：${orderData.functionName}\n价格：¥${(orderData.price / 100).toFixed(2)}\n订单号：${orderData.out_trade_no}\n\n请查看控制台日志获取详细信息`,
          showCancel: false,
          confirmText: '知道了'
        });
      }
      
      return {
        success: true,
        data: orderData
      };
      
    } catch (error) {
      if (showLoading) {
        wx.hideLoading();
      }
      console.error('[testCreateFunctionOrder] 测试异常:', error);
      
      if (showLoading) {
        wx.showModal({
          title: '❌ 创建订单失败',
          content: error.message || '未知错误',
          showCancel: false,
          confirmText: '知道了'
        });
      }
      
      return { success: false, error: error.message };
    }
  },

  /**
   * 查询订单状态
   */
  async _testQueryFunctionOrder(orderId = null, out_trade_no = null, showLoading = true) {
    // 如果没有提供订单ID或订单号，提示用户输入
    if (!orderId && !out_trade_no) {
      const inputResult = await new Promise((resolve) => {
        wx.showModal({
          title: '查询订单',
          content: '请输入订单ID或订单号',
          editable: true,
          placeholderText: '订单ID或订单号',
          success: (res) => {
            if (res.confirm && res.content) {
              resolve(res.content);
            } else {
              resolve(null);
            }
          }
        });
      });
      
      if (!inputResult) {
        return { success: false, error: '用户取消输入' };
      }
      
      // 判断是订单ID还是订单号（订单号通常以 ORDER_ 开头）
      if (inputResult.startsWith('ORDER_')) {
        out_trade_no = inputResult;
      } else {
        orderId = inputResult;
      }
    }
    
    if (showLoading) {
      wx.showLoading({ title: '查询订单中...', mask: true });
    }
    
    try {
      const queryData = orderId ? { orderId } : { out_trade_no };
      
      console.log('[testQueryOrderStatus] 查询订单:', queryData);
      
      const result = await wx.cloud.callFunction({
        name: 'paymentManagement_v1_3',
        data: {
          action: 'queryOrderStatus',
          data: queryData
        }
      });
      
      console.log('[testQueryOrderStatus] 云函数返回:', result);
      
      if (!result.result) {
        throw new Error('云函数返回结果为空');
      }
      
      const response = result.result;
      
      if (!response.success) {
        throw new Error(response.error || '查询订单失败');
      }
      
      const orderData = response.data;
      
      // 验证功能付费订单字段
      if (orderData.functionCode) {
        console.log('功能付费订单字段:', {
          functionCode: orderData.functionCode,
          functionName: orderData.functionName,
          hasGrantData: !!orderData.grantData,
          hasGrantInfo: !!orderData.grantInfo
        });
        
        if (orderData.grantInfo) {
          console.log('grantInfo 详情:', orderData.grantInfo);
        }
      }
      
      console.log('✅ 订单查询成功！');
      console.log('订单状态:', orderData.status);
      
      if (showLoading) {
        wx.hideLoading();
        
        let content = `订单状态：${orderData.status}\n订单金额：¥${(orderData.amount / 100).toFixed(2)}`;
        
        if (orderData.functionCode) {
          content += `\n功能：${orderData.functionName}`;
          if (orderData.grantInfo) {
            content += `\ngrantInfo状态：${orderData.grantInfo.status}`;
          }
        }
        
        wx.showModal({
          title: '✅ 订单查询成功',
          content: content + '\n\n请查看控制台日志获取详细信息',
          showCancel: false,
          confirmText: '知道了'
        });
      }
      
      return {
        success: true,
        data: orderData
      };
      
    } catch (error) {
      if (showLoading) {
        wx.hideLoading();
      }
      console.error('[testQueryOrderStatus] 测试异常:', error);
      
      if (showLoading) {
        wx.showModal({
          title: '❌ 查询订单失败',
          content: error.message || '未知错误',
          showCancel: false,
          confirmText: '知道了'
        });
      }
      
      return { success: false, error: error.message };
    }
  },

  /**
   * 验证配额发放
   */
  async _testVerifyQuotaGrant(functionCode, showLoading = true) {
    if (showLoading) {
      wx.showLoading({ title: '验证配额发放中...', mask: true });
    }
    
    try {
      console.log('[testVerifyQuotaGrant] 开始验证配额发放:', functionCode);
      
      // 1. 查询发放前的配额
      console.log('步骤1: 查询发放前的配额');
      const quotaBeforeResult = await wx.cloud.callFunction({
        name: 'functionQuotaManagement_v1_4',
        data: {
          action: 'getQuotaInfo',
          data: { functionCode }
        }
      });
      
      if (!quotaBeforeResult.result || !quotaBeforeResult.result.success) {
        throw new Error('查询配额失败');
      }
      
      const quotaBefore = quotaBeforeResult.result.data;
      console.log('发放前配额:', quotaBefore);
      
      // 2. 手动发放配额（模拟支付成功后的发放）
      console.log('步骤2: 手动发放配额（模拟支付成功）');
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
        throw new Error(grantResult.result?.error || '发放配额失败');
      }
      
      console.log('✅ 配额发放成功');
      console.log('发放结果:', grantResult.result.data);
      
      // 3. 查询发放后的配额
      console.log('步骤3: 查询发放后的配额');
      const quotaAfterResult = await wx.cloud.callFunction({
        name: 'functionQuotaManagement_v1_4',
        data: {
          action: 'getQuotaInfo',
          data: { functionCode }
        }
      });
      
      if (!quotaAfterResult.result || !quotaAfterResult.result.success) {
        throw new Error('查询配额失败');
      }
      
      const quotaAfter = quotaAfterResult.result.data;
      console.log('发放后配额:', quotaAfter);
      
      // 4. 验证配额变化
      const paidRemainingBefore = quotaBefore.paidRemaining || 0;
      const paidRemainingAfter = quotaAfter.paidRemaining || 0;
      
      if (paidRemainingAfter === paidRemainingBefore + 1) {
        console.log('✅ 配额增加正确（+1）');
      } else {
        console.error('❌ 配额增加不正确', {
          before: paidRemainingBefore,
          after: paidRemainingAfter,
          expected: paidRemainingBefore + 1
        });
        throw new Error('配额增加不正确');
      }
      
      if (showLoading) {
        wx.hideLoading();
        wx.showModal({
          title: '✅ 配额发放验证成功',
          content: `发放前：${paidRemainingBefore}次\n发放后：${paidRemainingAfter}次\n增加：+1次\n\n请查看控制台日志获取详细信息`,
          showCancel: false,
          confirmText: '知道了'
        });
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
      if (showLoading) {
        wx.hideLoading();
      }
      console.error('[testVerifyQuotaGrant] 测试异常:', error);
      
      if (showLoading) {
        wx.showModal({
          title: '❌ 配额发放验证失败',
          content: error.message || '未知错误',
          showCancel: false,
          confirmText: '知道了'
        });
      }
      
      return { success: false, error: error.message };
    }
  },

  /**
   * 查询用户抽卡配额（使用 queryCode 方式）
   */
  async onQueryUserDrawCardQuota() {
    log.info('onQueryUserDrawCardQuota', '开始查询用户抽卡配额');
    
    try {
      // 1. 提示用户输入用户名或openid
      const inputResult = await new Promise((resolve) => {
        wx.showModal({
          title: '查询用户抽卡配额',
          content: '请输入用户名（nickName）或 openid',
          editable: true,
          placeholderText: '用户名或openid',
          success: (res) => {
            if (res.confirm && res.content) {
              resolve(res.content.trim());
            } else {
              resolve(null);
            }
          }
        });
      });
      
      if (!inputResult) {
        log.info('onQueryUserDrawCardQuota', '用户取消输入');
        return;
      }
      
      wx.showLoading({ title: '查询中...', mask: true });
      
      // 2. 构建查询代码
      // 先查询用户，然后查询配额信息
      const today = new Date().toISOString().split('T')[0];
      
      // 转义输入值中的特殊字符，防止注入
      const escapedInput = inputResult.replace(/'/g, "\\'").replace(/"/g, '\\"');
      
      const queryCode = `
        // 第一步：查询用户信息（先尝试 openid，再尝试 nickName）
        let userResult = await db.collection('users')
          .where({
            openid: '${escapedInput}',
            isActive: true
          })
          .get();
        
        if (userResult.data.length === 0) {
          // 如果 openid 查询失败，尝试 nickName
          userResult = await db.collection('users')
            .where({
              nickName: '${escapedInput}',
              isActive: true
            })
            .get();
        }
        
        if (userResult.data.length === 0) {
          throw new Error('用户不存在');
        }
        
        const user = userResult.data[0];
        const userOpenid = user.openid;
        const userType = user.userType || 'guest';
        
        // 第二步：获取用户类型配置（免费配额）
        const typeConfigResult = await db.collection('static_user_types')
          .where({ typeCode: userType })
          .get();
        
        const typeConfig = typeConfigResult.data.length > 0 
          ? typeConfigResult.data[0] 
          : { dailyDrawQuota: 0, typeName: userType };
        
        const dailyDrawQuota = typeConfig.dailyDrawQuota !== undefined ? typeConfig.dailyDrawQuota : 0;
        
        // 第三步：统计今日免费使用次数
        const freeUsedTodayResult = await db.collection('function_usage_records')
          .where({
            openid: userOpenid,
            functionCode: 'wisdom_insight',
            isPaid: false,
            usageDate: '${today}'
          })
          .count();
        
        const freeUsedToday = freeUsedTodayResult.total;
        
        // 第四步：计算免费剩余配额
        const freeRemaining = dailyDrawQuota === -1 
          ? -1 
          : Math.max(0, dailyDrawQuota - freeUsedToday);
        
        // 第五步：获取付费配额
        const paidQuotaResult = await db.collection('function_quotas')
          .where({ openid: userOpenid })
          .get();
        
        let paidTotal = 0;
        let paidUsed = 0;
        let paidRemaining = 0;
        
        if (paidQuotaResult.data.length > 0) {
          const quotaDoc = paidQuotaResult.data[0];
          const wisdomQuota = quotaDoc.quotas?.wisdom_insight || {};
          paidTotal = wisdomQuota.paidTotal || 0;
          paidUsed = wisdomQuota.paidUsed || 0;
          paidRemaining = wisdomQuota.paidRemaining || 0;
        }
        
        // 返回结果
        return {
          user: {
            _id: user._id,
            openid: userOpenid,
            nickName: user.nickName,
            userType: userType,
            typeName: typeConfig.typeName || userType
          },
          quota: {
            free: {
              dailyQuota: dailyDrawQuota === -1 ? -1 : dailyDrawQuota,
              usedToday: freeUsedToday,
              remaining: freeRemaining
            },
            paid: {
              total: paidTotal,
              used: paidUsed,
              remaining: paidRemaining
            },
            total: {
              remaining: (freeRemaining === -1 || paidRemaining === -1) 
                ? -1 
                : freeRemaining + paidRemaining
            }
          }
        };
      `;
      
      // 3. 调用云函数执行查询代码
      console.log('[onQueryUserDrawCardQuota] 准备调用云函数，查询代码长度:', queryCode.length);
      
      const result = await wx.cloud.callFunction({
        name: 'debug_database_v1_0',
        data: {
          queryCode: queryCode
        }
      });
      
      wx.hideLoading();
      
      console.log('[onQueryUserDrawCardQuota] 云函数返回完整结果:', JSON.stringify(result, null, 2));
      
      if (!result) {
        console.error('[onQueryUserDrawCardQuota] 云函数调用失败，result 为空');
        throw new Error('云函数调用失败');
      }
      
      if (!result.result) {
        console.error('[onQueryUserDrawCardQuota] 云函数返回结果为空:', result);
        throw new Error('云函数返回结果为空，请查看云函数日志');
      }
      
      const response = result.result;
      
      console.log('[onQueryUserDrawCardQuota] 响应数据:', JSON.stringify(response, null, 2));
      
      if (!response.success) {
        const errorMsg = response.error || response.message || '查询失败';
        const errorData = response.data || {};
        console.error('[onQueryUserDrawCardQuota] 查询失败:', {
          error: errorMsg,
          code: response.code,
          data: errorData
        });
        throw new Error(errorMsg + (errorData.error ? ': ' + errorData.error : ''));
      }
      
      // queryCode 方式返回的数据结构：{ type: 'result', data: {...} }
      let quotaData;
      if (response.data && response.data.type === 'result') {
        quotaData = response.data.data;
      } else if (response.data && response.data.data) {
        quotaData = response.data.data;
      } else {
        quotaData = response.data;
      }
      
      console.log('[onQueryUserDrawCardQuota] 解析后的配额数据:', quotaData);
      
      if (!quotaData || !quotaData.user || !quotaData.quota) {
        console.error('[onQueryUserDrawCardQuota] 数据格式错误:', quotaData);
        throw new Error('返回数据格式错误');
      }
      
      const user = quotaData.user;
      const quota = quotaData.quota;
      
      // 4. 格式化显示结果
      const formatQuota = (value) => {
        if (value === -1) return '∞ (无限)';
        return value.toString();
      };
      
      const content = `用户信息：
昵称：${user.nickName || '未设置'}
OpenID：${user.openid}
用户类型：${user.typeName || user.userType}

免费配额：
每日配额：${formatQuota(quota.free.dailyQuota)}次
今日已用：${quota.free.usedToday}次
剩余免费：${formatQuota(quota.free.remaining)}次

付费配额：
总配额：${quota.paid.total}次
已使用：${quota.paid.used}次
剩余付费：${quota.paid.remaining}次

总剩余配额：${formatQuota(quota.total.remaining)}次`;
      
      console.log('✅ 查询成功！配额信息：');
      console.log('用户:', user);
      console.log('配额:', quota);
      
      wx.showModal({
        title: '✅ 查询成功',
        content: content,
        showCancel: false,
        confirmText: '知道了'
      });
      
    } catch (error) {
      wx.hideLoading();
      log.error('onQueryUserDrawCardQuota', '查询失败', error);
      
      wx.showModal({
        title: '❌ 查询失败',
        content: error.message || '未知错误',
        showCancel: false,
        confirmText: '知道了'
      });
    }
  },

  /**
   * 调起真实支付
   */
  async _testRealPayment(orderData) {
    console.log('[testRealPayment] 开始调起真实支付:', orderData);
    
    try {
      const { paymentParams, functionName, price, out_trade_no } = orderData;
      
      // 验证支付参数
      if (!paymentParams) {
        throw new Error('支付参数为空');
      }
      
      const requiredFields = ['timeStamp', 'nonceStr', 'package', 'signType', 'paySign'];
      const missingFields = requiredFields.filter(field => !paymentParams[field]);
      
      if (missingFields.length > 0) {
        throw new Error('支付参数不完整：' + missingFields.join(', '));
      }
      
      // 显示确认对话框
      const confirmResult = await new Promise((resolve) => {
        wx.showModal({
          title: '确认支付',
          content: `功能：${functionName}\n金额：¥${(price / 100).toFixed(2)}\n订单号：${out_trade_no}\n\n确认要调起微信支付吗？`,
          confirmText: '确认支付',
          cancelText: '取消',
          success: (res) => resolve(res.confirm)
        });
      });
      
      if (!confirmResult) {
        console.log('用户取消支付');
        return { success: false, error: '用户取消支付' };
      }
      
      wx.showLoading({ title: '调起支付中...', mask: true });
      
      // 延迟一下，让用户看到提示
      await new Promise(resolve => setTimeout(resolve, 500));
      
      wx.hideLoading();
      
      // 调起微信支付
      const paymentResult = await new Promise((resolve, reject) => {
        wx.requestPayment({
          timeStamp: paymentParams.timeStamp,
          nonceStr: paymentParams.nonceStr,
          package: paymentParams.package,
          signType: paymentParams.signType,
          paySign: paymentParams.paySign,
          success: (res) => {
            console.log('✅ 支付成功', res);
            resolve({ success: true, data: res });
          },
          fail: (err) => {
            console.error('❌ 支付失败', err);
            if (err.errMsg && err.errMsg.includes('cancel')) {
              resolve({ success: false, error: '用户取消支付' });
            } else {
              resolve({ success: false, error: err.errMsg || '支付失败' });
            }
          }
        });
      });
      
      return paymentResult;
      
    } catch (error) {
      console.error('[testRealPayment] 测试异常:', error);
      return { success: false, error: error.message };
    }
  }
});

