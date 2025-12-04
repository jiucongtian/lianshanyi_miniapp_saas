// 云函数入口文件
const cloud = require('wx-server-sdk');
const crypto = require('crypto');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV // 使用当前云环境
});

const db = cloud.database();

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
 * 生成签名
 * @param {Object} params - 参数对象
 * @param {string} key - API密钥
 * @returns {string} 签名
 */
function generateSignature(params, key) {
  // 1. 参数名ASCII码从小到大排序（字典序）
  const sortedKeys = Object.keys(params).sort();
  
  // 2. 如果参数的值为空不参与签名
  const signParams = {};
  for (const k of sortedKeys) {
    if (params[k] !== null && params[k] !== undefined && params[k] !== '') {
      signParams[k] = params[k];
    }
  }
  
  // 3. 参数名=参数值，用&连接
  const stringA = Object.keys(signParams)
    .map(k => `${k}=${signParams[k]}`)
    .join('&');
  
  // 4. stringA拼接API密钥
  const stringSignTemp = `${stringA}&key=${key}`;
  
  // 5. MD5加密并转大写
  const sign = crypto.createHash('md5').update(stringSignTemp, 'utf8').digest('hex').toUpperCase();
  
  return sign;
}

/**
 * 调用微信支付统一下单接口
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
  
  // 从环境变量获取API密钥
  const apiKey = process.env.WECHAT_PAY_API_KEY;
  if (!apiKey) {
    throw new Error('未配置微信支付API密钥，请在云函数环境变量中配置WECHAT_PAY_API_KEY');
  }
  
  // 构建请求参数
  const params = {
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
    },
    time_expire: null // 可选，支付过期时间
  };
  
  // 生成签名
  const sign = generateSignature({
    appid: params.appid,
    mchid: params.mchid,
    description: params.description,
    out_trade_no: params.out_trade_no,
    notify_url: params.notify_url,
    amount: params.amount.total,
    payer: params.payer.openid,
    nonce_str: generateNonceStr()
  }, apiKey);
  
  // 注意：微信支付V3 API使用不同的签名方式，这里简化处理
  // 实际应该使用微信支付V3的签名算法（RSA-SHA256）
  // 这里先实现基础结构，后续需要根据实际API文档调整
  
  console.log('[createOrder] 准备调用微信支付统一下单接口', {
    out_trade_no,
    amount,
    openid
  });
  
  // TODO: 实际调用微信支付API
  // 这里需要根据微信支付V3 API文档实现
  // 参考文档：https://pay.weixin.qq.com/docs/merchant/apis/jsapi-payment/direct-jsapi.html
  
  // 临时返回模拟数据，实际应该调用微信支付API
  return {
    prepay_id: 'wx' + generateNonceStr(28),
    code_url: null
  };
}

/**
 * 生成小程序支付参数
 * @param {string} prepayId - 预支付交易会话ID
 * @param {string} appid - 小程序appid
 * @param {string} apiKey - API密钥
 * @returns {Object} 支付参数
 */
function generatePaymentParams(prepayId, appid, apiKey) {
  const timeStamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = generateNonceStr();
  const packageValue = `prepay_id=${prepayId}`;
  
  // 生成签名
  const signParams = {
    appId: appid,
    timeStamp: timeStamp,
    nonceStr: nonceStr,
    package: packageValue,
    signType: 'RSA' // 微信支付V3使用RSA签名
  };
  
  // 注意：微信支付V3使用RSA-SHA256签名，这里需要配置商户私钥
  // 实际实现需要：
  // 1. 从环境变量获取商户私钥
  // 2. 使用RSA-SHA256算法签名
  // 3. 返回签名后的参数
  
  // 临时返回，实际需要正确签名
  return {
    timeStamp: timeStamp,
    nonceStr: nonceStr,
    package: packageValue,
    signType: 'RSA',
    paySign: '临时签名，需要实现RSA-SHA256签名'
  };
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
    orderData        // 订单附加数据
  } = data;
  
  try {
    // 验证必需参数
    if (!description || !amount || amount <= 0) {
      return error('订单参数不完整：description和amount为必填项，且amount必须大于0');
    }
    
    // 从环境变量获取配置
    const mchid = process.env.WECHAT_PAY_MCHID;
    const apiKey = process.env.WECHAT_PAY_API_KEY;
    const notifyUrl = process.env.WECHAT_PAY_NOTIFY_URL || `https://${cloud.getWXContext().ENV}.cloudbaseapp.com/payment/notify`;
    
    if (!mchid || !apiKey) {
      console.error('[createPaymentOrder] 微信支付配置缺失', {
        hasMchid: !!mchid,
        hasApiKey: !!apiKey
      });
      return error('微信支付配置不完整，请联系管理员');
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
      createTime: new Date(),
      updateTime: new Date()
    };
    
    // 保存订单到数据库
    const dbResult = await db.collection('payment_orders').add({
      data: orderRecord
    });
    
    console.log('[createPaymentOrder] 订单记录已创建', {
      orderId: dbResult._id,
      out_trade_no
    });
    
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
    const paymentParams = generatePaymentParams(wechatOrderResult.prepay_id, APPID, apiKey);
    
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
      openid: OPENID,
      isActive: true
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
      return error('订单不存在');
    }
    
    const order = orderResult.data[0];
    
    // TODO: 如果订单状态为NOTPAY，可以调用微信支付查询接口确认最新状态
    // 参考文档：https://pay.weixin.qq.com/docs/merchant/apis/china-transaction-query/query-by-out-trade-no.html
    
    return success({
      orderId: order._id,
      out_trade_no: order.out_trade_no,
      status: order.status,
      amount: order.amount,
      description: order.description,
      createTime: order.createTime,
      updateTime: order.updateTime,
      payTime: order.payTime || null
    }, '查询成功');
    
  } catch (err) {
    console.error('[queryOrderStatus] 查询订单状态失败:', err);
    return error('查询订单状态失败: ' + err.message);
  }
}

/**
 * 处理支付回调
 * 注意：此接口需要配置为HTTP触发器，接收微信支付的回调通知
 */
async function handlePaymentNotify(event) {
  try {
    // 微信支付回调数据在event.body中
    const notifyData = event.body || event;
    
    console.log('[handlePaymentNotify] 收到支付回调', notifyData);
    
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
      console.error('[handlePaymentNotify] 回调数据缺少订单号');
      return error('回调数据不完整');
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
      return error('订单不存在');
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
    
    // TODO: 根据订单类型执行相应的业务逻辑
    // 例如：升级用户类型、增加配额等
    
    // 返回成功响应给微信支付
    return {
      code: 'SUCCESS',
      message: '成功'
    };
    
  } catch (err) {
    console.error('[handlePaymentNotify] 处理支付回调失败:', err);
    return {
      code: 'FAIL',
      message: err.message || '处理失败'
    };
  }
}

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { action, data } = event;
  
  try {
    switch (action) {
      case 'createPaymentOrder':
        return await createPaymentOrder(wxContext, data);
      case 'queryOrderStatus':
        return await queryOrderStatus(wxContext, data);
      case 'handlePaymentNotify':
        return await handlePaymentNotify(event);
      default:
        return error('未知操作类型');
    }
  } catch (err) {
    console.error('[paymentManagement] 云函数执行失败:', err);
    return error(err.message || '操作失败');
  }
};

