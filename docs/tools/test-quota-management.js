/**
 * 配额管理云函数测试工具
 * 用途：在小程序端快速测试 functionQuotaManagement_v1_4 云函数的所有接口
 * 使用方式：将此代码复制到任意页面的 onLoad 或按钮点击事件中
 * 
 * 测试覆盖：
 * 1. checkQuota - 检查配额
 * 2. deductQuota - 扣除配额
 * 3. grantQuota - 发放配额
 * 4. rollbackQuota - 回滚配额
 * 5. getQuotaInfo - 获取配额信息
 */

/**
 * 测试1：检查配额（checkQuota）
 */
async function testCheckQuota(functionCode = 'wisdom_insight') {
  console.log('\n' + '='.repeat(60));
  console.log('【测试1】检查配额 - checkQuota');
  console.log('='.repeat(60));
  console.log('功能编码:', functionCode);
  
  wx.showLoading({ title: '检查配额中...', mask: true });
  
  try {
    const res = await wx.cloud.callFunction({
      name: 'functionQuotaManagement_v1_4',
      data: {
        action: 'checkQuota',
        data: {
          functionCode: functionCode
        }
      }
    });
    
    wx.hideLoading();
    
    console.log('\n📊 云函数返回结果:');
    console.log(JSON.stringify(res.result, null, 2));
    
    const result = res.result;
    
    if (result.success) {
      const quota = result.data;
      console.log('\n✅ 检查成功！配额信息：');
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
      console.error('\n❌ 检查失败:', result.error);
      console.error('错误码:', result.code);
      
      wx.showToast({
        title: '检查失败: ' + result.error,
        icon: 'error',
        duration: 3000
      });
      
      return null;
    }
  } catch (error) {
    wx.hideLoading();
    console.error('\n❌ 调用失败:', error);
    
    wx.showToast({
      title: '调用失败: ' + error.message,
      icon: 'error',
      duration: 3000
    });
    
    return null;
  }
}

/**
 * 测试2：扣除配额（deductQuota）
 */
async function testDeductQuota(functionCode = 'wisdom_insight', quantity = 1) {
  console.log('\n' + '='.repeat(60));
  console.log('【测试2】扣除配额 - deductQuota');
  console.log('='.repeat(60));
  console.log('功能编码:', functionCode);
  console.log('扣除数量:', quantity);
  
  const confirmResult = await new Promise((resolve) => {
    wx.showModal({
      title: '确认扣除配额',
      content: `确定要扣除 ${quantity} 次 ${functionCode} 的配额吗？`,
      success: (res) => resolve(res.confirm)
    });
  });
  
  if (!confirmResult) {
    console.log('用户取消操作');
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
    
    console.log('\n📊 云函数返回结果:');
    console.log(JSON.stringify(res.result, null, 2));
    
    const result = res.result;
    
    if (result.success) {
      const deductInfo = result.data;
      console.log('\n✅ 扣除成功！');
      console.log('  - 是否使用付费配额:', deductInfo.isPaid ? '✅ 是' : '❌ 否（使用免费配额）');
      console.log('  - 扣除数量:', deductInfo.quantity);
      console.log('\n  扣除前配额:');
      console.log('    - 免费剩余:', deductInfo.quotaBefore.freeRemaining);
      console.log('    - 付费剩余:', deductInfo.quotaBefore.paidRemaining);
      console.log('    - 总剩余:', deductInfo.quotaBefore.totalRemaining);
      console.log('\n  扣除后配额:');
      console.log('    - 免费剩余:', deductInfo.quotaAfter.freeRemaining);
      console.log('    - 付费剩余:', deductInfo.quotaAfter.paidRemaining);
      console.log('    - 总剩余:', deductInfo.quotaAfter.totalRemaining);
      
      wx.showToast({
        title: deductInfo.isPaid ? '已扣除付费配额' : '已扣除免费配额',
        icon: 'success',
        duration: 2000
      });
      
      return deductInfo;
    } else {
      console.error('\n❌ 扣除失败:', result.error);
      console.error('错误码:', result.code);
      
      if (result.code === 'QUOTA_INSUFFICIENT') {
        console.log('\n⚠️ 配额不足，建议：');
        console.log('  1. 先调用 grantQuota 发放配额');
        console.log('  2. 或者等待免费配额重置（每日重置）');
      }
      
      wx.showModal({
        title: '扣除失败',
        content: result.error + (result.code === 'QUOTA_INSUFFICIENT' ? '\n\n配额不足，请先发放配额' : ''),
        showCancel: false
      });
      
      return null;
    }
  } catch (error) {
    wx.hideLoading();
    console.error('\n❌ 调用失败:', error);
    
    wx.showToast({
      title: '调用失败: ' + error.message,
      icon: 'error',
      duration: 3000
    });
    
    return null;
  }
}

/**
 * 测试3：发放配额（grantQuota）
 */
async function testGrantQuota(functionCode = 'wisdom_insight', quantity = 10) {
  console.log('\n' + '='.repeat(60));
  console.log('【测试3】发放配额 - grantQuota');
  console.log('='.repeat(60));
  console.log('功能编码:', functionCode);
  console.log('发放数量:', quantity);
  
  const confirmResult = await new Promise((resolve) => {
    wx.showModal({
      title: '确认发放配额',
      content: `确定要发放 ${quantity} 次 ${functionCode} 的配额吗？`,
      success: (res) => resolve(res.confirm)
    });
  });
  
  if (!confirmResult) {
    console.log('用户取消操作');
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
          orderId: 'test_order_' + Date.now() // 测试订单ID
        }
      }
    });
    
    wx.hideLoading();
    
    console.log('\n📊 云函数返回结果:');
    console.log(JSON.stringify(res.result, null, 2));
    
    const result = res.result;
    
    if (result.success) {
      console.log('\n✅ 发放成功！');
      console.log('  - 功能编码:', result.data.functionCode);
      console.log('  - 发放数量:', result.data.quantity);
      console.log('  - 订单ID:', result.data.orderId);
      
      wx.showToast({
        title: `已发放 ${quantity} 次配额`,
        icon: 'success',
        duration: 2000
      });
      
      // 发放后立即检查配额，验证发放是否成功
      console.log('\n🔍 验证发放结果...');
      setTimeout(() => {
        testCheckQuota(functionCode);
      }, 1000);
      
      return result.data;
    } else {
      console.error('\n❌ 发放失败:', result.error);
      console.error('错误码:', result.code);
      
      wx.showToast({
        title: '发放失败: ' + result.error,
        icon: 'error',
        duration: 3000
      });
      
      return null;
    }
  } catch (error) {
    wx.hideLoading();
    console.error('\n❌ 调用失败:', error);
    
    wx.showToast({
      title: '调用失败: ' + error.message,
      icon: 'error',
      duration: 3000
    });
    
    return null;
  }
}

/**
 * 测试4：回滚配额（rollbackQuota）
 */
async function testRollbackQuota(functionCode = 'wisdom_insight', isPaid = false) {
  console.log('\n' + '='.repeat(60));
  console.log('【测试4】回滚配额 - rollbackQuota');
  console.log('='.repeat(60));
  console.log('功能编码:', functionCode);
  console.log('是否付费配额:', isPaid ? '是' : '否（免费配额）');
  
  const confirmResult = await new Promise((resolve) => {
    wx.showModal({
      title: '确认回滚配额',
      content: `确定要回滚 ${isPaid ? '付费' : '免费'}配额吗？\n\n注意：此操作会恢复最近一次扣除的配额`,
      success: (res) => resolve(res.confirm)
    });
  });
  
  if (!confirmResult) {
    console.log('用户取消操作');
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
    
    console.log('\n📊 云函数返回结果:');
    console.log(JSON.stringify(res.result, null, 2));
    
    const result = res.result;
    
    if (result.success) {
      console.log('\n✅ 回滚成功！');
      console.log('  - 功能编码:', result.data.functionCode);
      console.log('  - 回滚数量:', result.data.quantity);
      console.log('  - 是否付费配额:', result.data.isPaid ? '是' : '否');
      
      wx.showToast({
        title: '配额已回滚',
        icon: 'success',
        duration: 2000
      });
      
      // 回滚后立即检查配额，验证回滚是否成功
      console.log('\n🔍 验证回滚结果...');
      setTimeout(() => {
        testCheckQuota(functionCode);
      }, 1000);
      
      return result.data;
    } else {
      console.error('\n❌ 回滚失败:', result.error);
      console.error('错误码:', result.code);
      
      wx.showToast({
        title: '回滚失败: ' + result.error,
        icon: 'error',
        duration: 3000
      });
      
      return null;
    }
  } catch (error) {
    wx.hideLoading();
    console.error('\n❌ 调用失败:', error);
    
    wx.showToast({
      title: '调用失败: ' + error.message,
      icon: 'error',
      duration: 3000
    });
    
    return null;
  }
}

/**
 * 测试5：获取配额信息（getQuotaInfo）
 */
async function testGetQuotaInfo(functionCode = null) {
  console.log('\n' + '='.repeat(60));
  console.log('【测试5】获取配额信息 - getQuotaInfo');
  console.log('='.repeat(60));
  if (functionCode) {
    console.log('功能编码:', functionCode);
  } else {
    console.log('查询所有功能的配额');
  }
  
  wx.showLoading({ title: '获取配额信息中...', mask: true });
  
  try {
    const res = await wx.cloud.callFunction({
      name: 'functionQuotaManagement_v1_4',
      data: {
        action: 'getQuotaInfo',
        data: functionCode ? { functionCode: functionCode } : {}
      }
    });
    
    wx.hideLoading();
    
    console.log('\n📊 云函数返回结果:');
    console.log(JSON.stringify(res.result, null, 2));
    
    const result = res.result;
    
    if (result.success) {
      console.log('\n✅ 获取成功！');
      
      if (functionCode) {
        // 单个功能
        const quota = result.data;
        console.log('配额信息:');
        console.log('  - 是否可用:', quota.canUse ? '✅ 是' : '❌ 否');
        console.log('  - 免费剩余:', quota.freeRemaining === Infinity ? '∞ (无限)' : quota.freeRemaining);
        console.log('  - 付费剩余:', quota.paidRemaining);
        console.log('  - 总剩余:', quota.totalRemaining === Infinity ? '∞ (无限)' : quota.totalRemaining);
        console.log('  - 每日免费配额:', quota.freeDailyQuota === -1 ? '∞ (无限)' : quota.freeDailyQuota);
        console.log('  - 今日已用免费次数:', quota.freeUsedToday);
      } else {
        // 所有功能
        const allQuotas = result.data;
        console.log('所有功能的配额信息:');
        for (const [code, quota] of Object.entries(allQuotas)) {
          console.log(`\n  【${code}】`);
          console.log('    - 是否可用:', quota.canUse ? '✅ 是' : '❌ 否');
          console.log('    - 免费剩余:', quota.freeRemaining === Infinity ? '∞ (无限)' : quota.freeRemaining);
          console.log('    - 付费剩余:', quota.paidRemaining);
          console.log('    - 总剩余:', quota.totalRemaining === Infinity ? '∞ (无限)' : quota.totalRemaining);
        }
      }
      
      wx.showToast({
        title: '获取成功',
        icon: 'success',
        duration: 2000
      });
      
      return result.data;
    } else {
      console.error('\n❌ 获取失败:', result.error);
      console.error('错误码:', result.code);
      
      wx.showToast({
        title: '获取失败: ' + result.error,
        icon: 'error',
        duration: 3000
      });
      
      return null;
    }
  } catch (error) {
    wx.hideLoading();
    console.error('\n❌ 调用失败:', error);
    
    wx.showToast({
      title: '调用失败: ' + error.message,
      icon: 'error',
      duration: 3000
    });
    
    return null;
  }
}

/**
 * 完整测试流程（推荐）
 * 按顺序测试所有接口，模拟真实使用场景
 */
async function runFullTest() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 开始完整测试流程');
  console.log('='.repeat(60));
  
  const functionCode = 'wisdom_insight';
  
  try {
    // 步骤1：检查初始配额
    console.log('\n📋 步骤1：检查初始配额');
    const initialQuota = await testCheckQuota(functionCode);
    if (!initialQuota) {
      console.error('❌ 初始配额检查失败，终止测试');
      return;
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 步骤2：发放测试配额（如果付费配额为0）
    if (initialQuota.paidRemaining === 0) {
      console.log('\n📋 步骤2：发放测试配额（10次）');
      await testGrantQuota(functionCode, 10);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // 步骤3：扣除配额（使用免费配额）
    console.log('\n📋 步骤3：扣除配额（应该使用免费配额）');
    const deductResult1 = await testDeductQuota(functionCode, 1);
    if (!deductResult1) {
      console.error('❌ 扣除配额失败，终止测试');
      return;
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 步骤4：验证扣除后的配额
    console.log('\n📋 步骤4：验证扣除后的配额');
    await testCheckQuota(functionCode);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 步骤5：回滚配额
    console.log('\n📋 步骤5：回滚配额');
    await testRollbackQuota(functionCode, deductResult1.isPaid);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 步骤6：验证回滚后的配额
    console.log('\n📋 步骤6：验证回滚后的配额');
    await testCheckQuota(functionCode);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 步骤7：获取所有功能的配额信息
    console.log('\n📋 步骤7：获取所有功能的配额信息');
    await testGetQuotaInfo();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ 完整测试流程结束');
    console.log('='.repeat(60));
    
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
}

/**
 * 快速测试（仅测试核心接口）
 */
async function runQuickTest() {
  console.log('\n' + '='.repeat(60));
  console.log('⚡ 快速测试');
  console.log('='.repeat(60));
  
  const functionCode = 'wisdom_insight';
  
  try {
    // 1. 检查配额
    await testCheckQuota(functionCode);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // 2. 获取配额信息
    await testGetQuotaInfo(functionCode);
    
    console.log('\n✅ 快速测试完成');
    
  } catch (error) {
    console.error('\n❌ 快速测试异常:', error);
  }
}

// 导出测试函数（如果需要在其他文件中使用）
// module.exports = {
//   testCheckQuota,
//   testDeductQuota,
//   testGrantQuota,
//   testRollbackQuota,
//   testGetQuotaInfo,
//   runFullTest,
//   runQuickTest
// };

/**
 * 使用说明：
 * 
 * 方式1：在小程序页面中直接调用
 * 
 * // pages/test/index.js
 * Page({
 *   onLoad() {
 *     // 复制上面的测试函数到当前文件
 *     // 然后调用
 *     runFullTest();  // 完整测试
 *     // 或
 *     runQuickTest(); // 快速测试
 *   }
 * });
 * 
 * 方式2：在按钮点击事件中调用
 * 
 * // pages/test/index.js
 * Page({
 *   async onTestButtonTap() {
 *     await testCheckQuota('wisdom_insight');
 *   }
 * });
 * 
 * 方式3：在开发者工具的控制台中调用
 * 
 * 1. 打开小程序开发者工具
 * 2. 在控制台输入：
 *    testCheckQuota('wisdom_insight')
 * 
 * 测试建议：
 * 1. 先运行 runQuickTest() 快速验证基本功能
 * 2. 再运行 runFullTest() 完整测试所有场景
 * 3. 测试不同功能编码：'wisdom_insight' 和 'ai_report'
 * 4. 测试边界条件：配额为0、配额不足等
 */

