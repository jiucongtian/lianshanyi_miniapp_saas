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
   * 测试配额管理功能
   */
  async onTestQuotaManagement() {
    log.info('onTestQuotaManagement', '开始测试配额管理功能');
    
    // 显示测试选项
    const testOption = await new Promise((resolve) => {
      wx.showActionSheet({
        itemList: [
          '⚡ 快速测试（检查配额）',
          '🚀 完整测试（所有接口）',
          '📋 检查配额',
          '➕ 发放配额',
          '➖ 扣除配额',
          '↩️ 回滚配额',
          '📊 获取配额信息'
        ],
        success: (res) => resolve(res.tapIndex),
        fail: () => resolve(-1)
      });
    });

    if (testOption === -1) {
      return;
    }

    try {
      await this._executeQuotaTest(testOption);
    } catch (error) {
      log.error('onTestQuotaManagement', '测试执行失败', error);
      wx.showToast({
        title: '测试失败: ' + error.message,
        icon: 'error',
        duration: 3000
      });
    }
  },

  /**
   * 执行配额测试
   */
  async _executeQuotaTest(testOption) {
    const functionCode = 'wisdom_insight';
    
    switch (testOption) {
      case 0: // 快速测试
        await this._runQuickTest(functionCode);
        break;
      case 1: // 完整测试
        await this._runFullTest(functionCode);
        break;
      case 2: // 检查配额
        await this._testCheckQuota(functionCode);
        break;
      case 3: // 发放配额
        await this._testGrantQuota(functionCode, 10);
        break;
      case 4: // 扣除配额
        await this._testDeductQuota(functionCode, 1);
        break;
      case 5: // 回滚配额
        await this._testRollbackQuota(functionCode, false);
        break;
      case 6: // 获取配额信息
        await this._testGetQuotaInfo(functionCode);
        break;
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
  }
});

