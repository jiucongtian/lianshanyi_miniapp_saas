/**
 * 测试初始化脚本
 * 用途：在小程序端快速测试初始化云函数
 * 使用方式：将此代码复制到任意页面的 onLoad 或按钮点击事件中
 */

/**
 * 一键初始化（推荐）
 */
async function runInitAll() {
  console.log('='.repeat(50));
  console.log('开始执行一键初始化...');
  console.log('='.repeat(50));
  
  wx.showLoading({ title: '初始化中...', mask: true });
  
  try {
    const res = await wx.cloud.callFunction({
      name: 'tempInitFunctionPayment',
      data: {
        action: 'initAll'
      }
    });
    
    wx.hideLoading();
    
    console.log('\n📊 初始化完成！结果如下：');
    console.log('-'.repeat(50));
    
    const result = res.result;
    
    if (result.success) {
      console.log('✅ 初始化成功！\n');
      
      // 商品数据
      console.log('【功能商品】');
      console.log('  新增商品:', result.products.init.added.length);
      result.products.init.added.forEach(p => {
        console.log(`    - ${p.functionName}(${p.functionCode}): ${p.price}分`);
      });
      
      console.log('  跳过商品:', result.products.init.skipped.length);
      if (result.products.init.skipped.length > 0) {
        console.log('    ', result.products.init.skipped.join(', '));
      }
      
      console.log('  总商品数:', result.products.init.totalProducts);
      
      // 商品验证
      console.log('\n  商品验证:', result.products.validation.valid ? '✅ 通过' : '❌ 失败');
      if (!result.products.validation.valid) {
        console.error('  问题:', result.products.validation.issues);
      }
      
      // 用户类型
      console.log('\n【用户类型配置】');
      console.log('  使用集合:', result.userTypes.update.collection);
      console.log('  更新类型:', result.userTypes.update.updated.length);
      result.userTypes.update.updated.forEach(ut => {
        console.log(`    - ${ut.typeCode}: 智慧洞见=${ut.dailyWisdomInsightQuota}/天, AI报告=${ut.dailyAiReportQuota}/天`);
      });
      
      console.log('  跳过类型:', result.userTypes.update.skipped.length);
      if (result.userTypes.update.skipped.length > 0) {
        result.userTypes.update.skipped.forEach(s => {
          console.log(`    - ${s.typeCode}: ${s.reason}`);
        });
      }
      
      // 用户类型验证
      console.log('\n  配置验证:', result.userTypes.validation.valid ? '✅ 通过' : '❌ 失败');
      if (result.userTypes.validation.valid) {
        console.log('  用户类型列表:');
        result.userTypes.validation.userTypes.forEach(ut => {
          console.log(`    - ${ut.typeName}(${ut.typeCode}): 智慧洞见=${ut.dailyWisdomInsightQuota}/天, AI报告=${ut.dailyAiReportQuota}/天`);
        });
      } else {
        console.error('  问题:', result.userTypes.validation.issues);
      }
      
      console.log('\n' + '='.repeat(50));
      console.log('🎉 初始化全部完成！');
      console.log('='.repeat(50));
      
      wx.showModal({
        title: '初始化成功',
        content: `商品数据：${result.products.init.totalProducts}个\n用户类型：${result.userTypes.validation.userTypes.length}个\n\n详细结果请查看控制台`,
        showCancel: false
      });
      
    } else {
      console.error('❌ 初始化失败');
      console.error('错误信息:', result.error || '未知错误');
      
      wx.showModal({
        title: '初始化失败',
        content: result.error || '请查看控制台日志',
        showCancel: false
      });
    }
    
  } catch (error) {
    wx.hideLoading();
    console.error('❌ 调用云函数失败:', error);
    
    wx.showModal({
      title: '调用失败',
      content: error.errMsg || error.message || '未知错误',
      showCancel: false
    });
  }
}

/**
 * 仅初始化商品数据
 */
async function initProducts() {
  console.log('开始初始化商品数据...');
  
  try {
    const res = await wx.cloud.callFunction({
      name: 'tempInitFunctionPayment',
      data: { action: 'initProducts' }
    });
    
    console.log('商品初始化结果:', res.result);
    
    if (res.result.success) {
      console.log('✅ 成功');
      console.log('  新增:', res.result.added);
      console.log('  跳过:', res.result.skipped);
      console.log('  总数:', res.result.totalProducts);
    } else {
      console.error('❌ 失败:', res.result.errors);
    }
    
    return res.result;
  } catch (error) {
    console.error('❌ 调用失败:', error);
    throw error;
  }
}

/**
 * 仅更新用户类型配置
 */
async function updateUserTypes() {
  console.log('开始更新用户类型配置...');
  
  try {
    const res = await wx.cloud.callFunction({
      name: 'tempInitFunctionPayment',
      data: { action: 'updateUserTypes' }
    });
    
    console.log('用户类型更新结果:', res.result);
    
    if (res.result.success) {
      console.log('✅ 成功');
      console.log('  集合:', res.result.collection);
      console.log('  更新:', res.result.updated);
      console.log('  跳过:', res.result.skipped);
    } else {
      console.error('❌ 失败:', res.result.error);
    }
    
    return res.result;
  } catch (error) {
    console.error('❌ 调用失败:', error);
    throw error;
  }
}

/**
 * 验证所有数据
 */
async function validateAll() {
  console.log('开始验证数据...');
  
  try {
    const res = await wx.cloud.callFunction({
      name: 'tempInitFunctionPayment',
      data: { action: 'validateAll' }
    });
    
    console.log('验证结果:', res.result);
    
    if (res.result.success) {
      console.log('✅ 所有数据验证通过');
      console.log('\n商品列表:');
      res.result.products.products.forEach(p => {
        console.log(`  ${p.valid ? '✅' : '❌'} ${p.functionName}(${p.functionCode})`);
        if (p.issues.length > 0) {
          console.log('     问题:', p.issues);
        }
      });
      
      console.log('\n用户类型:');
      res.result.userTypes.userTypes.forEach(ut => {
        console.log(`  ${ut.valid ? '✅' : '❌'} ${ut.typeName}(${ut.typeCode})`);
        console.log(`     智慧洞见: ${ut.dailyWisdomInsightQuota}/天`);
        console.log(`     AI报告: ${ut.dailyAiReportQuota}/天`);
        if (ut.issues.length > 0) {
          console.log('     问题:', ut.issues);
        }
      });
    } else {
      console.error('❌ 验证失败');
      console.error('商品问题:', res.result.products.issues);
      console.error('用户类型问题:', res.result.userTypes.issues);
    }
    
    return res.result;
  } catch (error) {
    console.error('❌ 调用失败:', error);
    throw error;
  }
}

/**
 * 分步执行（适合调试）
 */
async function stepByStepInit() {
  console.log('='.repeat(50));
  console.log('开始分步执行初始化...');
  console.log('='.repeat(50));
  
  try {
    // 步骤1：初始化商品
    console.log('\n【步骤1/4】初始化商品数据');
    await initProducts();
    
    // 步骤2：验证商品
    console.log('\n【步骤2/4】验证商品数据');
    const productsValid = await wx.cloud.callFunction({
      name: 'tempInitFunctionPayment',
      data: { action: 'validateProducts' }
    });
    console.log('商品验证:', productsValid.result.valid ? '✅ 通过' : '❌ 失败');
    
    // 步骤3：更新用户类型
    console.log('\n【步骤3/4】更新用户类型配置');
    await updateUserTypes();
    
    // 步骤4：验证用户类型
    console.log('\n【步骤4/4】验证用户类型配置');
    const userTypesValid = await wx.cloud.callFunction({
      name: 'tempInitFunctionPayment',
      data: { action: 'validateUserTypes' }
    });
    console.log('用户类型验证:', userTypesValid.result.valid ? '✅ 通过' : '❌ 失败');
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 分步初始化完成！');
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('❌ 分步执行失败:', error);
  }
}

// ==================== 导出函数 ====================

module.exports = {
  // 推荐使用
  runInitAll,
  
  // 单独执行
  initProducts,
  updateUserTypes,
  validateAll,
  
  // 分步执行
  stepByStepInit
};

// ==================== 使用示例 ====================

/*
// 在页面的 onLoad 中调用：

Page({
  async onLoad() {
    // 方式1：一键初始化（推荐）
    await runInitAll();
    
    // 方式2：分步执行（调试用）
    // await stepByStepInit();
    
    // 方式3：仅验证
    // await validateAll();
  }
});

// 或者绑定到按钮：

Page({
  data: {},
  
  onInitAll() {
    runInitAll();
  },
  
  onValidateAll() {
    validateAll();
  }
});

// WXML:
<button bindtap="onInitAll">一键初始化</button>
<button bindtap="onValidateAll">验证数据</button>

*/

