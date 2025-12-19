// 云函数入口文件
const cloud = require('wx-server-sdk');
const crypto = require('crypto');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV // 使用当前云环境
});

const db = cloud.database();

/**
 * 从文件读取私钥
 * @param {string} filename - 私钥文件名（默认：apiclient_key.pem）
 * @returns {string|null} 私钥内容或null
 */
function loadPrivateKeyFromFile(filename = 'apiclient_key.pem') {
  try {
    const keyPath = path.join(__dirname, filename);
    
    if (fs.existsSync(keyPath)) {
      const privateKey = fs.readFileSync(keyPath, 'utf8');
      console.log('[loadPrivateKeyFromFile] 成功从文件读取私钥:', filename);
      console.log('[loadPrivateKeyFromFile] 私钥长度:', privateKey.length);
      return privateKey;
    } else {
      console.log('[loadPrivateKeyFromFile] 私钥文件不存在:', keyPath);
      return null;
    }
  } catch (error) {
    console.error('[loadPrivateKeyFromFile] 读取私钥文件失败:', error);
    return null;
  }
}

/**
 * 获取私钥（优先从文件读取，否则从环境变量读取）
 * @returns {string|null} 私钥内容或null
 */
function getPrivateKey() {
  // 优先从文件读取
  let privateKey = loadPrivateKeyFromFile('apiclient_key.pem');
  
  if (privateKey) {
    console.log('[getPrivateKey] 使用文件中的私钥');
    return privateKey;
  }
  
  // 如果文件不存在，尝试从环境变量读取
  privateKey = process.env.WECHAT_PAY_PRIVATE_KEY;
  
  if (privateKey) {
    console.log('[getPrivateKey] 使用环境变量中的私钥');
    
    // 修复私钥格式：如果换行符被替换成了空格，恢复换行符
    if (!privateKey.includes('\n') && privateKey.includes(' ')) {
      console.log('[getPrivateKey] 检测到私钥格式问题（换行符被空格替换），自动修复...');
      
      // 提取BEGIN和END标记之间的Base64内容
      const beginMarker = '-----BEGIN PRIVATE KEY-----';
      const endMarker = '-----END PRIVATE KEY-----';
      
      // 移除所有空格，重新格式化
      const cleanKey = privateKey.replace(/\s+/g, '');
      const beginIndex = cleanKey.indexOf(beginMarker);
      const endIndex = cleanKey.indexOf(endMarker);
      
      if (beginIndex !== -1 && endIndex !== -1) {
        const base64Content = cleanKey.substring(beginIndex + beginMarker.length, endIndex);
        
        // 将Base64内容按每64个字符分行
        const lines = [beginMarker];
        for (let i = 0; i < base64Content.length; i += 64) {
          lines.push(base64Content.substring(i, i + 64));
        }
        lines.push(endMarker);
        
        privateKey = lines.join('\n');
        console.log('[getPrivateKey] 私钥格式已修复，共', lines.length, '行');
      } else {
        console.error('[getPrivateKey] 私钥格式修复失败：未找到BEGIN或END标记');
      }
    }
    
    return privateKey;
  }
  
  console.warn('[getPrivateKey] 未配置私钥（既无文件也无环境变量）');
  return null;
}

/**
 * 创建成功响应
 */
function success(data, message = '操作成功') {
  return {
    success: true,
    data: data,
    message: message,
    code: 0,
    timestamp: new Date().getTime()
  };
}

/**
 * 创建错误响应
 */
function error(errorMessage, code = -1, data = null) {
  return {
    success: false,
    error: errorMessage,
    code: code,
    data: data,
    timestamp: new Date().getTime()
  };
}

/**
 * 生成随机字符串
 */
function generateNonceStr(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 微信支付V3 API配置
 */
const WECHAT_PAY_CONFIG = {
  baseURL: 'https://api.mch.weixin.qq.com',
  version: 'v3'
};

/**
 * 生成微信支付V3签名
 * 参考文档：https://pay.weixin.qq.com/docs/merchant/apis/jsapi-payment/direct-jsapi.html
 * @param {string} method - HTTP方法（GET/POST等）
 * @param {string} url - 请求URL（不包含域名）
 * @param {number} timestamp - 时间戳（秒）
 * @param {string} nonceStr - 随机字符串
 * @param {string} body - 请求体（JSON字符串，GET请求为空字符串）
 * @param {string} privateKey - 商户私钥（PEM格式）
 * @returns {string} 签名
 */
function generateWechatPayV3Signature(method, url, timestamp, nonceStr, body, privateKey) {
  // 构建签名字符串
  const signStr = `${method}\n${url}\n${timestamp}\n${nonceStr}\n${body}\n`;
  
  // 使用RSA-SHA256签名
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signStr, 'utf8');
  sign.end();
  
  // 使用私钥签名并转换为Base64
  const signature = sign.sign(privateKey, 'base64');
  
  return signature;
}

/**
 * 生成微信支付V3请求头
 * @param {string} method - HTTP方法
 * @param {string} url - 请求URL
 * @param {string} body - 请求体
 * @param {string} mchid - 商户号
 * @param {string} serialNo - 证书序列号
 * @param {string} privateKey - 商户私钥
 * @returns {Object} 请求头
 */
function generateWechatPayV3Headers(method, url, body, mchid, serialNo, privateKey) {
  const timestamp = Math.floor(Date.now() / 1000);
  const nonceStr = generateNonceStr();
  
  // 生成签名
  const signature = generateWechatPayV3Signature(method, url, timestamp, nonceStr, body, privateKey);
  
  // 构建Authorization头
  const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${mchid}",nonce_str="${nonceStr}",timestamp="${timestamp}",serial_no="${serialNo}",signature="${signature}"`;
  
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': authorization,
    'User-Agent': 'WechatPay-APIv3-NodeJS'
  };
}

/**
 * 调用微信支付统一下单接口（V3 API）
 * 参考文档：https://pay.weixin.qq.com/docs/merchant/apis/jsapi-payment/direct-jsapi.html
 * @param {Object} orderData - 订单数据
 * @returns {Promise<Object>} 下单结果
 */
async function createOrder(orderData) {
  const {
    appid,           // 小程序appid
    mchid,           // 商户号
    description,     // 商品描述
    out_trade_no,    // 商户订单号
    notify_url,      // 通知地址
    amount,          // 订单金额（分）
    openid           // 用户openid
  } = orderData;
  
  // 从环境变量获取配置
  const apiKey = process.env.WECHAT_PAY_API_KEY;
  const privateKey = getPrivateKey(); // 优先从文件读取，否则从环境变量读取
  const serialNo = process.env.WECHAT_PAY_SERIAL_NO; // 证书序列号
  
  if (!apiKey) {
    throw new Error('未配置微信支付API密钥，请在云函数环境变量中配置WECHAT_PAY_API_KEY');
  }
  
  // 如果没有配置私钥和序列号，使用模拟数据（仅用于开发测试）
  if (!privateKey || !serialNo) {
    console.warn('[createOrder] 未配置商户私钥或证书序列号，使用模拟数据');
    console.warn('[createOrder] 生产环境必须配置商户私钥文件(apiclient_key.pem)和WECHAT_PAY_SERIAL_NO');
    
    // 返回模拟数据（仅用于开发测试）
    return {
      prepay_id: 'wx' + generateNonceStr(28),
      code_url: null
    };
  }
  
  // 构建请求参数
  const requestBody = {
    appid: appid,
    mchid: mchid,
    description: description,
    out_trade_no: out_trade_no,
    notify_url: notify_url,
    amount: {
      total: amount,
      currency: 'CNY'
    },
    payer: {
      openid: openid
    }
    // time_expire: 可选，支付过期时间（ISO 8601格式）
  };
  
  const bodyStr = JSON.stringify(requestBody);
  const url = '/v3/pay/transactions/jsapi';
  
  // 生成请求头
  const headers = generateWechatPayV3Headers('POST', url, bodyStr, mchid, serialNo, privateKey);
  
  console.log('[createOrder] 准备调用微信支付统一下单接口', {
    out_trade_no,
    amount,
    openid,
    url: WECHAT_PAY_CONFIG.baseURL + url
  });
  
  try {
    // 调用微信支付V3 API
    const response = await axios({
      method: 'POST',
      url: WECHAT_PAY_CONFIG.baseURL + url,
      headers: headers,
      data: requestBody,
      timeout: 10000 // 10秒超时
    });
    
    console.log('[createOrder] 微信支付API调用成功', {
      status: response.status,
      prepay_id: response.data?.prepay_id
    });
    
    if (response.data && response.data.prepay_id) {
      return {
        prepay_id: response.data.prepay_id,
        code_url: response.data.code_url || null
      };
    } else {
      throw new Error('微信支付API返回数据格式错误');
    }
  } catch (error) {
    console.error('[createOrder] 微信支付API调用失败', {
      error: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
    // 如果是开发环境，返回模拟数据
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[createOrder] 开发环境返回模拟数据');
      return {
        prepay_id: 'wx' + generateNonceStr(28),
        code_url: null
      };
    }
    
    throw new Error(`微信支付API调用失败: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * 生成小程序支付参数
 * 参考文档：https://pay.weixin.qq.com/docs/merchant/apis/jsapi-payment/direct-jsapi.html
 * @param {string} prepayId - 预支付交易会话ID
 * @param {string} appid - 小程序appid
 * @param {string} privateKey - 商户私钥（PEM格式）
 * @returns {Object} 支付参数
 */
function generatePaymentParams(prepayId, appid, privateKey) {
  const timeStamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = generateNonceStr();
  const packageValue = `prepay_id=${prepayId}`;
  
  // 如果没有配置私钥，返回未签名的参数（仅用于开发测试）
  if (!privateKey) {
    console.warn('[generatePaymentParams] 未配置商户私钥，返回未签名参数');
    return {
      timeStamp: timeStamp,
      nonceStr: nonceStr,
      package: packageValue,
      signType: 'RSA',
      paySign: '开发环境未签名'
    };
  }
  
  // 构建签名字符串（注意：小程序支付参数的签名方式与统一下单不同）
  // 签名字符串格式：appId + "\n" + timeStamp + "\n" + nonceStr + "\n" + package + "\n"
  const signStr = `${appid}\n${timeStamp}\n${nonceStr}\n${packageValue}\n`;
  
  // 使用RSA-SHA256签名
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signStr, 'utf8');
  sign.end();
  
  // 使用私钥签名并转换为Base64
  const paySign = sign.sign(privateKey, 'base64');
  
  return {
    timeStamp: timeStamp,
    nonceStr: nonceStr,
    package: packageValue,
    signType: 'RSA',
    paySign: paySign
  };
}

/**
 * 创建功能付费订单
 * @param {Object} wxContext - 微信上下文
 * @param {Object} data - 订单数据
 * @returns {Promise<Object>} 订单创建结果
 */
async function createFunctionOrder(wxContext, data) {
  const { OPENID, APPID } = wxContext;
  const { functionCode } = data;
  
  console.log('[createFunctionOrder] 开始创建功能付费订单', { functionCode, openid: OPENID });
  
  try {
    // 1. 验证参数
    if (!functionCode) {
      return error('缺少必需参数：functionCode');
    }
    
    // 2. 从 function_products 查询商品信息
    const productResult = await db.collection('function_products')
      .where({
        functionCode: functionCode,
        status: 'active'
      })
      .get();
    
    if (productResult.data.length === 0) {
      console.error('[createFunctionOrder] 商品不存在或已下架', { functionCode });
      return error('功能商品不存在或已下架');
    }
    
    const product = productResult.data[0];
    console.log('[createFunctionOrder] 查询到商品信息', {
      functionCode: product.functionCode,
      functionName: product.functionName,
      price: product.price
    });
    
    // 3. 创建订单（使用 createPaymentOrder 的通用逻辑）
    const orderData = {
      description: product.functionName || product.description || `购买${product.functionName}`,
      amount: product.price,
      orderType: 'function_payment',
      orderData: {},
      functionCode: product.functionCode,
      functionName: product.functionName,
      grantData: product.grantData,  // 快照商品信息
      callConfig: product.callConfig  // 快照调用配置（可选，用于记录）
    };
    
    // 初始化 grantInfo
    orderData.grantInfo = {
      status: 'pending',
      grantTime: null,
      grantResult: null,
      errorMessage: ''
    };
    
    // 调用通用的创建订单函数
    const createResult = await createPaymentOrder(wxContext, orderData);
    
    if (!createResult.success) {
      return createResult;
    }
    
    console.log('[createFunctionOrder] 功能付费订单创建成功', {
      orderId: createResult.data.orderId,
      functionCode
    });
    
    return success({
      orderId: createResult.data.orderId,
      out_trade_no: createResult.data.out_trade_no,
      prepay_id: createResult.data.prepay_id,
      paymentParams: createResult.data.paymentParams,
      functionCode: product.functionCode,
      functionName: product.functionName,
      price: product.price
    }, '功能付费订单创建成功');
    
  } catch (err) {
    console.error('[createFunctionOrder] 创建功能付费订单失败:', err);
    return error('创建功能付费订单失败: ' + err.message);
  }
}

/**
 * 创建支付订单
 */
async function createPaymentOrder(wxContext, data) {
  const { OPENID, APPID } = wxContext;
  const {
    description,     // 商品描述
    amount,          // 订单金额（分）
    orderType,       // 订单类型（用于业务区分）
    orderData,       // 订单附加数据
    functionCode,   // 功能编码（功能付费订单）
    functionName,   // 功能名称（功能付费订单）
    grantData,       // 权益发放配置（功能付费订单）
    grantInfo,       // 权益发放信息（功能付费订单）
    callConfig       // 调用配置（功能付费订单，可选）
  } = data;
  
  try {
    // 验证必需参数
    if (!description || !amount || amount <= 0) {
      return error('订单参数不完整：description和amount为必填项，且amount必须大于0');
    }
    
    // 从环境变量获取配置
    const mchid = process.env.WECHAT_PAY_MCHID;
    const apiKey = process.env.WECHAT_PAY_API_KEY;
    const privateKey = getPrivateKey(); // 优先从文件读取，否则从环境变量读取
    const serialNo = process.env.WECHAT_PAY_SERIAL_NO;
    const notifyUrl = process.env.WECHAT_PAY_NOTIFY_URL || `https://${cloud.getWXContext().ENV}.cloudbaseapp.com/payment/notify`;
    
    if (!mchid || !apiKey) {
      console.error('[createPaymentOrder] 微信支付配置缺失', {
        hasMchid: !!mchid,
        hasApiKey: !!apiKey
      });
      return error('微信支付配置不完整，请联系管理员');
    }
    
    // 私钥和序列号用于生产环境，开发环境可以暂时不配置
    if (!privateKey) {
      console.warn('[createPaymentOrder] 未配置商户私钥，将使用模拟数据（仅开发环境）');
    }
    
    // 生成商户订单号
    const out_trade_no = `ORDER_${Date.now()}_${generateNonceStr(8)}`;
    
    // 创建订单记录
    const orderRecord = {
      openid: OPENID,
      appid: APPID,
      out_trade_no: out_trade_no,
      description: description,
      amount: amount,
      orderType: orderType || 'default',
      orderData: orderData || {},
      status: 'NOTPAY', // 未支付
      isActive: true, // 订单有效
      createTime: new Date(),
      updateTime: new Date()
    };
    
    // 功能付费订单专用字段
    if (orderType === 'function_payment') {
      if (functionCode) orderRecord.functionCode = functionCode;
      if (functionName) orderRecord.functionName = functionName;
      if (grantData) orderRecord.grantData = grantData;
      if (grantInfo) orderRecord.grantInfo = grantInfo;
      if (callConfig) orderRecord.callConfig = callConfig; // 可选，用于记录
    }
    
    // 保存订单到数据库
    const dbResult = await db.collection('payment_orders').add({
      data: orderRecord
    });
    
    console.log('[createPaymentOrder] 订单记录已创建', {
      orderId: dbResult._id,
      out_trade_no
    });
    
    // 诊断私钥配置
    console.log('[createPaymentOrder] 私钥配置诊断:');
    console.log('  - 是否配置私钥:', !!privateKey);
    console.log('  - 私钥长度:', privateKey ? privateKey.length : 0);
    console.log('  - 私钥前50个字符:', privateKey ? privateKey.substring(0, 50) : 'null');
    console.log('  - 私钥后50个字符:', privateKey ? privateKey.substring(privateKey.length - 50) : 'null');
    console.log('  - 是否包含BEGIN标记:', privateKey ? privateKey.includes('-----BEGIN') : false);
    console.log('  - 是否包含END标记:', privateKey ? privateKey.includes('-----END') : false);
    console.log('  - 私钥类型:', privateKey ? (privateKey.includes('BEGIN PRIVATE KEY') ? 'PRIVATE KEY' : privateKey.includes('BEGIN RSA PRIVATE KEY') ? 'RSA PRIVATE KEY' : 'Unknown') : 'null');
    
    // 调用微信支付统一下单接口
    const orderDataForWechat = {
      appid: APPID,
      mchid: mchid,
      description: description,
      out_trade_no: out_trade_no,
      notify_url: notifyUrl,
      amount: amount,
      openid: OPENID
    };
    
    const wechatOrderResult = await createOrder(orderDataForWechat);
    
    if (!wechatOrderResult || !wechatOrderResult.prepay_id) {
      return error('调用微信支付接口失败');
    }
    
    // 更新订单记录，保存prepay_id
    await db.collection('payment_orders').doc(dbResult._id).update({
      data: {
        prepay_id: wechatOrderResult.prepay_id,
        updateTime: new Date()
      }
    });
    
    // 生成小程序支付参数
    const paymentParams = generatePaymentParams(wechatOrderResult.prepay_id, APPID, privateKey);
    
    return success({
      orderId: dbResult._id,
      out_trade_no: out_trade_no,
      prepay_id: wechatOrderResult.prepay_id,
      paymentParams: paymentParams
    }, '订单创建成功');
    
  } catch (err) {
    console.error('[createPaymentOrder] 创建支付订单失败:', err);
    return error('创建支付订单失败: ' + err.message);
  }
}

/**
 * 查询订单状态
 */
async function queryOrderStatus(wxContext, data) {
  const { OPENID } = wxContext;
  const { out_trade_no, orderId } = data;
  
  try {
    if (!out_trade_no && !orderId) {
      return error('缺少订单标识：out_trade_no或orderId');
    }
    
    // 构建查询条件
    const query = {
      openid: OPENID
    };
    
    if (out_trade_no) {
      query.out_trade_no = out_trade_no;
    } else if (orderId) {
      query._id = orderId;
    }
    
    // 从数据库查询订单
    const orderResult = await db.collection('payment_orders')
      .where(query)
      .get();
    
    if (orderResult.data.length === 0) {
      console.log('[queryOrderStatus] 未找到订单', {
        openid: OPENID,
        out_trade_no,
        orderId,
        query
      });
      return error('订单不存在');
    }
    
    console.log('[queryOrderStatus] 找到订单', {
      orderId: orderResult.data[0]._id,
      status: orderResult.data[0].status
    });
    
    const order = orderResult.data[0];
    
    // TODO: 如果订单状态为NOTPAY，可以调用微信支付查询接口确认最新状态
    // 参考文档：https://pay.weixin.qq.com/docs/merchant/apis/china-transaction-query/query-by-out-trade-no.html
    
    // 构建返回数据
    const orderData = {
      orderId: order._id,
      out_trade_no: order.out_trade_no,
      status: order.status,
      amount: order.amount,
      description: order.description,
      createTime: order.createTime,
      updateTime: order.updateTime,
      payTime: order.payTime || null
    };
    
    // 功能付费订单专用字段
    if (order.orderType === 'function_payment') {
      if (order.functionCode) orderData.functionCode = order.functionCode;
      if (order.functionName) orderData.functionName = order.functionName;
      if (order.grantData) orderData.grantData = order.grantData;
      if (order.grantInfo) orderData.grantInfo = order.grantInfo;
    }
    
    return success(orderData, '查询成功');
    
  } catch (err) {
    console.error('[queryOrderStatus] 查询订单状态失败:', err);
    return error('查询订单状态失败: ' + err.message);
  }
}

/**
 * 处理支付成功后的业务逻辑
 * @param {Object} order - 订单对象
 */
async function handlePaymentSuccess(order) {
  const { orderType, orderData, openid, grantData, grantInfo, _id } = order;
  
  console.log('[handlePaymentSuccess] 开始处理支付成功业务逻辑', {
    orderType,
    orderData,
    openid,
    hasGrantData: !!grantData
  });
  
  try {
    switch (orderType) {
      case 'upgrade_premium':
        // 升级为高级用户
        if (orderData && orderData.targetUserType) {
          await upgradeUserToPremium(openid, orderData.targetUserType);
        } else {
          await upgradeUserToPremium(openid, 'premium');
        }
        break;
        
      case 'recharge_quota':
        // 充值配额（如果需要实现）
        console.log('[handlePaymentSuccess] 充值配额功能待实现', { orderData });
        break;
        
      case 'function_payment':
        // 功能付费订单：发放功能配额
        if (grantData && grantData.type === 'grant_function_quota') {
          await grantFunctionQuota(openid, grantData, _id);
        } else {
          console.warn('[handlePaymentSuccess] 功能付费订单缺少 grantData 或 type 不正确', {
            grantData,
            orderId: _id
          });
        }
        break;
        
      default:
        console.log('[handlePaymentSuccess] 未知订单类型，跳过业务逻辑处理', { orderType });
    }
  } catch (error) {
    console.error('[handlePaymentSuccess] 业务逻辑处理失败', {
      orderType,
      error: error.message
    });
    throw error;
  }
}

/**
 * 发放功能配额
 * @param {string} openid - 用户openid
 * @param {Object} grantData - 权益发放配置
 * @param {string} orderId - 订单ID
 */
async function grantFunctionQuota(openid, grantData, orderId) {
  const { functionCode, quantity } = grantData;
  
  console.log('[grantFunctionQuota] 开始发放功能配额', {
    openid,
    functionCode,
    quantity,
    orderId
  });
  
  if (!functionCode || !quantity) {
    throw new Error('grantData 缺少必需字段：functionCode 或 quantity');
  }
  
  try {
    // 调用配额管理云函数发放配额
    const grantResult = await cloud.callFunction({
      name: 'functionQuotaManagement_v1_4',
      data: {
        action: 'grantQuota',
        data: {
          functionCode: functionCode,
          quantity: quantity,
          orderId: orderId
        }
      }
    });
    
    const result = grantResult.result;
    
    if (!result || !result.success) {
      const errorMsg = result?.error || '发放配额失败';
      console.error('[grantFunctionQuota] 配额发放失败', {
        functionCode,
        quantity,
        error: errorMsg
      });
      
      // 更新订单的 grantInfo 为失败状态
      await updateGrantInfo(orderId, {
        status: 'failed',
        grantTime: new Date(),
        grantResult: {
          success: false,
          message: errorMsg
        },
        errorMessage: errorMsg
      });
      
      throw new Error(errorMsg);
    }
    
    console.log('[grantFunctionQuota] 配额发放成功', {
      functionCode,
      quantity,
      result: result.data
    });
    
    // 更新订单的 grantInfo 为成功状态
    await updateGrantInfo(orderId, {
      status: 'granted',
      grantTime: new Date(),
      grantResult: {
        success: true,
        message: '配额发放成功'
      },
      errorMessage: ''
    });
    
  } catch (error) {
    console.error('[grantFunctionQuota] 发放功能配额异常', {
      functionCode,
      quantity,
      error: error.message
    });
    
    // 更新订单的 grantInfo 为失败状态
    try {
      await updateGrantInfo(orderId, {
        status: 'failed',
        grantTime: new Date(),
        grantResult: {
          success: false,
          message: error.message
        },
        errorMessage: error.message
      });
    } catch (updateError) {
      console.error('[grantFunctionQuota] 更新 grantInfo 失败', updateError);
    }
    
    throw error;
  }
}

/**
 * 更新订单的 grantInfo 字段
 * @param {string} orderId - 订单ID
 * @param {Object} grantInfo - 权益发放信息
 */
async function updateGrantInfo(orderId, grantInfo) {
  try {
    await db.collection('payment_orders').doc(orderId).update({
      data: {
        grantInfo: grantInfo,
        updateTime: new Date()
      }
    });
    
    console.log('[updateGrantInfo] grantInfo 更新成功', {
      orderId,
      status: grantInfo.status
    });
  } catch (error) {
    console.error('[updateGrantInfo] 更新 grantInfo 失败', {
      orderId,
      error: error.message
    });
    throw error;
  }
}


/**
 * 升级用户为高级用户
 * @param {string} openid - 用户openid
 * @param {string} targetUserType - 目标用户类型
 */
async function upgradeUserToPremium(openid, targetUserType) {
  try {
    console.log('[upgradeUserToPremium] 开始升级用户', { openid, targetUserType });
    
    // 调用userManagement云函数升级用户类型
    // 注意：这里需要调用云函数，不能直接操作数据库（跨云函数调用）
    // 由于云函数间调用比较复杂，这里先直接更新数据库
    // 生产环境建议通过云函数调用userManagement云函数
    
    const userResult = await db.collection('users')
      .where({ openid: openid, isActive: true })
      .get();
    
    if (userResult.data.length === 0) {
      console.error('[upgradeUserToPremium] 用户不存在', { openid });
      throw new Error('用户不存在');
    }
    
    const user = userResult.data[0];
    const now = new Date();
    
    // 更新用户类型
    const updateData = {
      userType: targetUserType,
      upgradeTime: now,
      updateTime: now
    };
    
    await db.collection('users').doc(user._id).update({
      data: updateData
    });
    
    console.log('[upgradeUserToPremium] 用户升级成功', {
      openid,
      oldUserType: user.userType,
      newUserType: targetUserType
    });
  } catch (error) {
    console.error('[upgradeUserToPremium] 升级用户失败', {
      openid,
      targetUserType,
      error: error.message
    });
    throw error;
  }
}

/**
 * 处理支付回调
 * 注意：此接口需要配置为HTTP触发器，接收微信支付的回调通知
 */
async function handlePaymentNotify(event) {
  try {
    // HTTP触发器调用时，微信支付回调数据在event.body中
    // 如果event.body是字符串，需要解析为JSON
    let notifyData;
    if (typeof event.body === 'string') {
      try {
        notifyData = JSON.parse(event.body);
      } catch (parseError) {
        console.error('[handlePaymentNotify] 解析回调数据失败', parseError);
        return {
          statusCode: 400,
          body: JSON.stringify({
            code: 'FAIL',
            message: '回调数据格式错误'
          })
        };
      }
    } else {
      notifyData = event.body || event;
    }
    
    console.log('[handlePaymentNotify] 收到支付回调', {
      headers: event.headers,
      body: notifyData
    });
    
    // TODO: 验证回调签名
    // 1. 获取回调头部的签名信息
    // 2. 使用微信支付平台证书验证签名
    // 3. 验证通过后才处理业务逻辑
    
    // TODO: 解密回调数据（如果使用了加密）
    
    // 解析订单号
    const out_trade_no = notifyData.out_trade_no;
    const transaction_id = notifyData.transaction_id;
    const trade_state = notifyData.trade_state; // SUCCESS, NOTPAY, CLOSED等
    
    if (!out_trade_no) {
      console.error('[handlePaymentNotify] 回调数据缺少订单号', notifyData);
      return {
        statusCode: 400,
        body: JSON.stringify({
          code: 'FAIL',
          message: '回调数据不完整：缺少订单号'
        })
      };
    }
    
    // 查询订单
    const orderResult = await db.collection('payment_orders')
      .where({
        out_trade_no: out_trade_no,
        isActive: true
      })
      .get();
    
    if (orderResult.data.length === 0) {
      console.error('[handlePaymentNotify] 订单不存在', { out_trade_no });
      return {
        statusCode: 404,
        body: JSON.stringify({
          code: 'FAIL',
          message: '订单不存在'
        })
      };
    }
    
    const order = orderResult.data[0];
    
    // 更新订单状态
    const updateData = {
      status: trade_state,
      updateTime: new Date()
    };
    
    if (trade_state === 'SUCCESS') {
      updateData.payTime = new Date();
      updateData.transaction_id = transaction_id;
    }
    
    await db.collection('payment_orders').doc(order._id).update({
      data: updateData
    });
    
    console.log('[handlePaymentNotify] 订单状态已更新', {
      out_trade_no,
      oldStatus: order.status,
      newStatus: trade_state
    });
    
    // 根据订单类型执行相应的业务逻辑
    if (trade_state === 'SUCCESS') {
      try {
        // 重新查询订单，获取最新的订单数据（包含 grantData）
        const updatedOrderResult = await db.collection('payment_orders')
          .doc(order._id)
          .get();
        
        const updatedOrder = updatedOrderResult.data;
        
        console.log('[handlePaymentNotify] 准备处理支付成功业务逻辑', {
          orderId: order._id,
          orderType: updatedOrder.orderType,
          hasGrantData: !!updatedOrder.grantData
        });
        
        await handlePaymentSuccess(updatedOrder);
        
        console.log('[handlePaymentNotify] 支付成功业务逻辑处理完成', {
          orderId: order._id
        });
      } catch (businessError) {
        console.error('[handlePaymentNotify] 业务逻辑处理失败', {
          out_trade_no,
          orderId: order._id,
          error: businessError.message,
          stack: businessError.stack
        });
        // 业务逻辑失败不影响支付回调响应，记录日志即可
      }
    }
    
    // 返回成功响应给微信支付（HTTP触发器需要返回HTTP响应格式）
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code: 'SUCCESS',
        message: '成功'
      })
    };
    
  } catch (err) {
    console.error('[handlePaymentNotify] 处理支付回调失败:', err);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code: 'FAIL',
        message: err.message || '处理失败'
      })
    };
  }
}

// 云函数入口函数
exports.main = async (event, context) => {
  // 判断是否为HTTP触发器调用（支付回调）
  // 云开发HTTP触发器调用时，event可能包含以下字段：
  // - path, httpMethod (标准格式)
  // - requestContext.path, requestContext.httpMethod (某些版本)
  // - 或者直接通过URL路径判断
  
  // 记录event信息用于调试
  console.log('[main] 收到请求', {
    hasPath: !!event.path,
    hasHttpMethod: !!event.httpMethod,
    hasRequestContext: !!event.requestContext,
    path: event.path,
    httpMethod: event.httpMethod,
    requestContext: event.requestContext,
    body: typeof event.body === 'string' ? event.body.substring(0, 100) : event.body,
    keys: Object.keys(event)
  });
  
  // 判断是否为HTTP触发器调用
  const isHttpTrigger = 
    (event.path && event.httpMethod) ||  // 标准格式
    (event.requestContext && event.requestContext.path) ||  // 某些版本格式
    (event.requestContext && event.requestContext.httpMethod) ||  // 某些版本格式
    (context && context.requestId);  // HTTP触发器通常有requestId
  
  if (isHttpTrigger) {
    // 获取路径和HTTP方法
    const path = event.path || (event.requestContext && event.requestContext.path) || '';
    const httpMethod = event.httpMethod || (event.requestContext && event.requestContext.httpMethod) || '';
    
    console.log('[main] 识别为HTTP触发器', { path, httpMethod });
    
    // HTTP触发器调用：处理支付回调
    if (path === '/payment/notify' || path.endsWith('/payment/notify')) {
      if (httpMethod === 'POST' || !httpMethod) {  // 如果没有httpMethod，默认处理POST
        return await handlePaymentNotify(event);
      } else {
        return {
          statusCode: 405,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            code: 'METHOD_NOT_ALLOWED',
            message: '只支持POST方法'
          })
        };
      }
    } else {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: 'NOT_FOUND',
          message: '路径不存在: ' + path
        })
      };
    }
  }
  
  // 普通云函数调用：处理业务逻辑
  const wxContext = cloud.getWXContext();
  const { action, data } = event;
  
  try {
    switch (action) {
      case 'createPaymentOrder':
        return await createPaymentOrder(wxContext, data);
      case 'createFunctionOrder':
        return await createFunctionOrder(wxContext, data);
      case 'queryOrderStatus':
        return await queryOrderStatus(wxContext, data);
      default:
        return error('未知操作类型');
    }
  } catch (err) {
    console.error('[paymentManagement] 云函数执行失败:', err);
    return error(err.message || '操作失败');
  }
};

