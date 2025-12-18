/**
 * 功能商品初始化脚本
 * 用途：初始化 function_products 表，添加智慧洞见和AI出报告两个功能商品
 * 使用方式：
 *   1. 在云开发控制台创建 function_products 集合
 *   2. 在控制台的云函数中运行此脚本
 *   或
 *   1. 复制脚本内容到临时云函数中执行
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 功能商品配置
const products = [
  {
    functionCode: "wisdom_insight",
    functionName: "智慧洞见",
    functionType: "per_use",
    description: "AI智慧洞见，为您解答人生疑问",
    price: 190,  // 1.9元
    originalPrice: 190,
    callConfig: {
      targetFunction: "cozeFunctions_v1_3",
      targetAction: null,
      workflowType: "WISDOM_INSIGHT",
      parameters: {}
    },
    grantData: {
      type: "grant_function_quota",
      functionCode: "wisdom_insight",
      quantity: 1
    },
    status: "active",
    sortOrder: 1,
    createTime: new Date(),
    updateTime: new Date()
  },
  {
    functionCode: "ai_report",
    functionName: "AI出报告",
    functionType: "per_use",
    description: "AI深度解读卡牌，生成专业命理报告",
    price: 990,  // 9.9元
    originalPrice: 990,
    callConfig: {
      targetFunction: "cozeFunctions_v1_3",
      targetAction: null,
      workflowType: "AI_REPORT",
      parameters: {}
    },
    grantData: {
      type: "grant_function_quota",
      functionCode: "ai_report",
      quantity: 1
    },
    status: "active",
    sortOrder: 2,
    createTime: new Date(),
    updateTime: new Date()
  }
];

/**
 * 初始化功能商品数据
 */
async function initFunctionProducts() {
  console.log('[initFunctionProducts] 开始初始化功能商品数据...');
  
  try {
    // 检查集合是否存在
    const collections = await db.collection('function_products').get();
    console.log('[initFunctionProducts] function_products集合已存在');
    
    // 逐个添加商品
    for (const product of products) {
      try {
        // 检查商品是否已存在
        const existingProduct = await db.collection('function_products')
          .where({ functionCode: product.functionCode })
          .get();
        
        if (existingProduct.data.length > 0) {
          console.log(`[initFunctionProducts] 商品 ${product.functionCode} 已存在，跳过`);
          continue;
        }
        
        // 添加商品
        const result = await db.collection('function_products').add({
          data: product
        });
        
        console.log(`[initFunctionProducts] 成功添加商品: ${product.functionCode}`, result);
        
      } catch (error) {
        console.error(`[initFunctionProducts] 添加商品 ${product.functionCode} 失败:`, error);
      }
    }
    
    console.log('[initFunctionProducts] 功能商品数据初始化完成！');
    
    // 查询并显示所有商品
    const allProducts = await db.collection('function_products')
      .orderBy('sortOrder', 'asc')
      .get();
    
    console.log('[initFunctionProducts] 当前商品列表:');
    allProducts.data.forEach(p => {
      console.log(`  - ${p.functionName} (${p.functionCode}): ${p.price}分, 状态: ${p.status}`);
    });
    
    return {
      success: true,
      message: '功能商品数据初始化完成',
      totalProducts: allProducts.data.length
    };
    
  } catch (error) {
    console.error('[initFunctionProducts] 初始化失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 验证商品数据
 */
async function validateProducts() {
  console.log('[validateProducts] 开始验证商品数据...');
  
  try {
    const products = await db.collection('function_products').get();
    
    if (products.data.length === 0) {
      console.warn('[validateProducts] 警告：商品表为空！');
      return false;
    }
    
    let isValid = true;
    
    for (const product of products.data) {
      console.log(`[validateProducts] 验证商品: ${product.functionCode}`);
      
      // 验证必填字段
      const requiredFields = [
        'functionCode', 'functionName', 'functionType', 
        'price', 'callConfig', 'grantData', 'status'
      ];
      
      for (const field of requiredFields) {
        if (!product[field]) {
          console.error(`  ❌ 缺少必填字段: ${field}`);
          isValid = false;
        }
      }
      
      // 验证 callConfig
      if (product.callConfig) {
        if (!product.callConfig.targetFunction) {
          console.error('  ❌ callConfig.targetFunction 为空');
          isValid = false;
        }
      }
      
      // 验证 grantData
      if (product.grantData) {
        if (!product.grantData.type || !product.grantData.functionCode) {
          console.error('  ❌ grantData 配置不完整');
          isValid = false;
        }
      }
      
      if (isValid) {
        console.log('  ✅ 验证通过');
      }
    }
    
    return isValid;
    
  } catch (error) {
    console.error('[validateProducts] 验证失败:', error);
    return false;
  }
}

/**
 * 云函数入口
 * 如果在云函数中使用，请导出 main 函数
 */
exports.main = async (event, context) => {
  console.log('[initFunctionProducts] 云函数开始执行');
  
  const action = event.action || 'init';
  
  if (action === 'init') {
    // 初始化商品数据
    const result = await initFunctionProducts();
    return result;
  } else if (action === 'validate') {
    // 验证商品数据
    const isValid = await validateProducts();
    return {
      success: true,
      valid: isValid,
      message: isValid ? '商品数据验证通过' : '商品数据验证失败'
    };
  } else {
    return {
      success: false,
      error: '未知的操作类型',
      availableActions: ['init', 'validate']
    };
  }
};

/**
 * 本地测试
 * 如果需要在本地测试，取消下面的注释
 */
/*
(async () => {
  console.log('====== 开始初始化功能商品数据 ======');
  
  // 初始化
  const initResult = await initFunctionProducts();
  console.log('初始化结果:', initResult);
  
  // 验证
  const validateResult = await validateProducts();
  console.log('验证结果:', validateResult ? '✅ 通过' : '❌ 失败');
  
  console.log('====== 完成 ======');
})();
*/

// 如果不是在云函数环境中，可以直接运行
if (typeof exports === 'undefined') {
  (async () => {
    await initFunctionProducts();
    await validateProducts();
  })();
}

