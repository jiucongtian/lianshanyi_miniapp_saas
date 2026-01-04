/**
 * 临时云函数：初始化功能付费系统数据
 * 用途：执行 Phase 1 的数据库初始化
 * 注意：初始化完成后可以删除此云函数
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * ==================== 功能商品初始化 ====================
 */

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
  
  const results = {
    success: true,
    added: [],
    skipped: [],
    errors: []
  };
  
  try {
    // 逐个添加商品
    for (const product of products) {
      try {
        // 检查商品是否已存在
        const existingProduct = await db.collection('function_products')
          .where({ functionCode: product.functionCode })
          .get();
        
        if (existingProduct.data.length > 0) {
          console.log(`[initFunctionProducts] 商品 ${product.functionCode} 已存在，跳过`);
          results.skipped.push(product.functionCode);
          continue;
        }
        
        // 添加商品
        const result = await db.collection('function_products').add({
          data: product
        });
        
        console.log(`[initFunctionProducts] ✅ 成功添加商品: ${product.functionCode}`);
        results.added.push({
          functionCode: product.functionCode,
          functionName: product.functionName,
          price: product.price,
          _id: result._id
        });
        
      } catch (error) {
        console.error(`[initFunctionProducts] 添加商品 ${product.functionCode} 失败:`, error);
        results.errors.push({
          functionCode: product.functionCode,
          error: error.message
        });
        results.success = false;
      }
    }
    
    // 查询并显示所有商品
    const allProducts = await db.collection('function_products')
      .orderBy('sortOrder', 'asc')
      .get();
    
    console.log(`[initFunctionProducts] 当前商品列表（共${allProducts.data.length}个）:`);
    allProducts.data.forEach(p => {
      console.log(`  - ${p.functionName} (${p.functionCode}): ${p.price}分, 状态: ${p.status}`);
    });
    
    results.totalProducts = allProducts.data.length;
    
  } catch (error) {
    console.error('[initFunctionProducts] 初始化失败:', error);
    results.success = false;
    results.error = error.message;
  }
  
  return results;
}

/**
 * 验证商品数据
 */
async function validateProducts() {
  console.log('[validateProducts] 开始验证商品数据...');
  
  const results = {
    valid: true,
    issues: [],
    products: []
  };
  
  try {
    const products = await db.collection('function_products').get();
    
    if (products.data.length === 0) {
      results.valid = false;
      results.issues.push('商品表为空');
      return results;
    }
    
    for (const product of products.data) {
      const productIssues = [];
      
      // 验证必填字段
      const requiredFields = [
        'functionCode', 'functionName', 'functionType', 
        'price', 'callConfig', 'grantData', 'status'
      ];
      
      for (const field of requiredFields) {
        if (!product[field]) {
          productIssues.push(`缺少必填字段: ${field}`);
        }
      }
      
      // 验证 callConfig
      if (product.callConfig && !product.callConfig.targetFunction) {
        productIssues.push('callConfig.targetFunction 为空');
      }
      
      // 验证 grantData
      if (product.grantData) {
        if (!product.grantData.type || !product.grantData.functionCode) {
          productIssues.push('grantData 配置不完整');
        }
      }
      
      results.products.push({
        functionCode: product.functionCode,
        functionName: product.functionName,
        valid: productIssues.length === 0,
        issues: productIssues
      });
      
      if (productIssues.length > 0) {
        results.valid = false;
        results.issues.push(...productIssues.map(issue => 
          `${product.functionCode}: ${issue}`
        ));
      }
    }
    
  } catch (error) {
    console.error('[validateProducts] 验证失败:', error);
    results.valid = false;
    results.issues.push(error.message);
  }
  
  return results;
}

/**
 * ==================== 用户类型配置更新 ====================
 */

// 配置表名称（根据实际情况自动检测）
let USER_TYPES_COLLECTION = null;

// 用户类型免费配额配置
// 注意：智慧洞见复用 dailyDrawQuota 字段，不需要新增 dailyWisdomInsightQuota
// 只需要新增 dailyAiReportQuota 字段
const userTypeQuotaConfig = {
  guest: {
    dailyAiReportQuota: 0  // 只添加 AI出报告配额，智慧洞见使用现有的 dailyDrawQuota
  },
  normal: {
    dailyAiReportQuota: 1  // 只添加 AI出报告配额，智慧洞见使用现有的 dailyDrawQuota
  },
  premium: {
    dailyAiReportQuota: -1  // 只添加 AI出报告配额，智慧洞见使用现有的 dailyDrawQuota
  }
};

/**
 * 自动检测用户类型表名称
 */
async function detectUserTypesCollection() {
  try {
    // 尝试 static_user_types
    const staticResult = await db.collection('static_user_types').limit(1).get();
    if (staticResult.data.length > 0) {
      USER_TYPES_COLLECTION = 'static_user_types';
      return 'static_user_types';
    }
  } catch (e) {
    // 集合不存在
  }
  
  try {
    // 尝试 user_types
    const normalResult = await db.collection('user_types').limit(1).get();
    if (normalResult.data.length > 0) {
      USER_TYPES_COLLECTION = 'user_types';
      return 'user_types';
    }
  } catch (e) {
    // 集合不存在
  }
  
  return null;
}

/**
 * 更新用户类型配置
 */
async function updateUserTypesConfig() {
  console.log('[updateUserTypesConfig] 开始更新用户类型配置...');
  
  const results = {
    success: true,
    updated: [],
    skipped: [],
    errors: []
  };
  
  try {
    // 自动检测表名
    const collectionName = await detectUserTypesCollection();
    
    if (!collectionName) {
      return {
        success: false,
        error: '未找到用户类型表（static_user_types 或 user_types）'
      };
    }
    
    console.log(`[updateUserTypesConfig] 使用集合: ${collectionName}`);
    results.collection = collectionName;
    
    // 获取所有用户类型
    const userTypes = await db.collection(collectionName).get();
    
    if (userTypes.data.length === 0) {
      return {
        success: false,
        error: '用户类型表为空'
      };
    }
    
    console.log(`[updateUserTypesConfig] 找到 ${userTypes.data.length} 个用户类型`);
    
    // 逐个更新用户类型
    for (const userType of userTypes.data) {
      const typeCode = userType.typeCode;
      
      if (!typeCode) {
        results.skipped.push({
          _id: userType._id,
          reason: '缺少 typeCode 字段'
        });
        continue;
      }
      
      const quotaConfig = userTypeQuotaConfig[typeCode];
      
      if (!quotaConfig) {
        results.skipped.push({
          typeCode: typeCode,
          reason: `未找到配额配置`
        });
        continue;
      }
      
      try {
        // 检查是否已经有 dailyAiReportQuota 配置
        // 注意：智慧洞见使用现有的 dailyDrawQuota，不需要检查
        if (userType.dailyAiReportQuota !== undefined) {
          console.log(`[updateUserTypesConfig] ${typeCode} 已有 dailyAiReportQuota 配置，跳过`);
          results.skipped.push({
            typeCode: typeCode,
            reason: '已有 dailyAiReportQuota 配置'
          });
          continue;
        }
        
        // 更新用户类型配置（只添加 dailyAiReportQuota）
        // 智慧洞见配额使用现有的 dailyDrawQuota 字段
        await db.collection(collectionName)
          .doc(userType._id)
          .update({
            data: {
              dailyAiReportQuota: quotaConfig.dailyAiReportQuota
            }
          });
        
        console.log(`[updateUserTypesConfig] ✅ 成功更新 ${typeCode}`);
        results.updated.push({
          typeCode: typeCode,
          dailyAiReportQuota: quotaConfig.dailyAiReportQuota,
          note: '智慧洞见使用现有的 dailyDrawQuota 字段'
        });
        
      } catch (error) {
        console.error(`[updateUserTypesConfig] 更新 ${typeCode} 失败:`, error);
        results.errors.push({
          typeCode: typeCode,
          error: error.message
        });
        results.success = false;
      }
    }
    
  } catch (error) {
    console.error('[updateUserTypesConfig] 更新失败:', error);
    results.success = false;
    results.error = error.message;
  }
  
  return results;
}

/**
 * 验证用户类型配置
 */
async function validateUserTypesConfig() {
  console.log('[validateUserTypesConfig] 开始验证配置...');
  
  const results = {
    valid: true,
    issues: [],
    userTypes: []
  };
  
  try {
    const collectionName = await detectUserTypesCollection();
    
    if (!collectionName) {
      results.valid = false;
      results.issues.push('未找到用户类型表');
      return results;
    }
    
    results.collection = collectionName;
    
    const userTypes = await db.collection(collectionName).get();
    
    if (userTypes.data.length === 0) {
      results.valid = false;
      results.issues.push('用户类型表为空');
      return results;
    }
    
    for (const userType of userTypes.data) {
      const typeIssues = [];
      
      // 验证配额字段
      // 注意：智慧洞见使用现有的 dailyDrawQuota，不需要验证 dailyWisdomInsightQuota
      if (userType.dailyAiReportQuota === undefined) {
        typeIssues.push('缺少 dailyAiReportQuota 字段');
      }
      
      // 验证 dailyDrawQuota（智慧洞见配额）
      if (userType.dailyDrawQuota === undefined) {
        typeIssues.push('缺少 dailyDrawQuota 字段（智慧洞见配额）');
      } else {
        const quota = userType.dailyDrawQuota;
        if (quota !== -1 && quota !== 0 && (quota < 0 || !Number.isInteger(quota))) {
          typeIssues.push(`dailyDrawQuota 值不合理: ${quota}`);
        }
      }
      
      // 验证 dailyAiReportQuota
      if (userType.dailyAiReportQuota !== undefined) {
        const quota = userType.dailyAiReportQuota;
        if (quota !== -1 && quota !== 0 && (quota < 0 || !Number.isInteger(quota))) {
          typeIssues.push(`dailyAiReportQuota 值不合理: ${quota}`);
        }
      }
      
      results.userTypes.push({
        typeCode: userType.typeCode,
        typeName: userType.typeName,
        dailyDrawQuota: userType.dailyDrawQuota,  // 智慧洞见配额（复用现有字段）
        dailyAiReportQuota: userType.dailyAiReportQuota,  // AI出报告配额（新增字段）
        valid: typeIssues.length === 0,
        issues: typeIssues
      });
      
      if (typeIssues.length > 0) {
        results.valid = false;
        results.issues.push(...typeIssues.map(issue => 
          `${userType.typeCode}: ${issue}`
        ));
      }
    }
    
  } catch (error) {
    console.error('[validateUserTypesConfig] 验证失败:', error);
    results.valid = false;
    results.issues.push(error.message);
  }
  
  return results;
}

/**
 * ==================== 云函数入口 ====================
 */

exports.main = async (event, context) => {
  console.log('[tempInitFunctionPayment] 云函数开始执行');
  console.log('[tempInitFunctionPayment] 参数:', event);
  
  const { action } = event;
  
  try {
    switch (action) {
      // 初始化商品数据
      case 'initProducts':
        return await initFunctionProducts();
      
      // 验证商品数据
      case 'validateProducts':
        return await validateProducts();
      
      // 更新用户类型配置
      case 'updateUserTypes':
        return await updateUserTypesConfig();
      
      // 验证用户类型配置
      case 'validateUserTypes':
        return await validateUserTypesConfig();
      
      // 一键初始化（执行所有操作）
      case 'initAll':
        const productsResult = await initFunctionProducts();
        const userTypesResult = await updateUserTypesConfig();
        const productsValidation = await validateProducts();
        const userTypesValidation = await validateUserTypesConfig();
        
        return {
          success: productsResult.success && userTypesResult.success,
          products: {
            init: productsResult,
            validation: productsValidation
          },
          userTypes: {
            update: userTypesResult,
            validation: userTypesValidation
          }
        };
      
      // 验证所有
      case 'validateAll':
        const pValidation = await validateProducts();
        const utValidation = await validateUserTypesConfig();
        
        return {
          success: pValidation.valid && utValidation.valid,
          products: pValidation,
          userTypes: utValidation
        };
      
      default:
        return {
          success: false,
          error: '未知的操作类型',
          availableActions: [
            'initProducts',        // 初始化商品数据
            'validateProducts',    // 验证商品数据
            'updateUserTypes',     // 更新用户类型配置
            'validateUserTypes',   // 验证用户类型配置
            'initAll',            // 一键初始化所有
            'validateAll'         // 验证所有
          ]
        };
    }
  } catch (error) {
    console.error('[tempInitFunctionPayment] 执行失败:', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
};

