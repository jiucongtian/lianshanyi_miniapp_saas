/**
 * 支付服务类
 * 处理支付相关的业务逻辑，包括创建订单、调起支付、查询订单状态等
 */
const { BaseService } = require('./BaseService');
const { PaymentBean } = require('../beans/PaymentBean');
const { ResponseBean } = require('../beans/ResponseBean');

class PaymentService extends BaseService {
  constructor() {
    super();
  }

  /**
   * 创建支付订单
   * @param {Object} orderInfo - 订单信息
   * @param {string} orderInfo.description - 商品描述
   * @param {number} orderInfo.amount - 订单金额（分）
   * @param {string} orderInfo.orderType - 订单类型（可选）
   * @param {Object} orderInfo.orderData - 订单附加数据（可选）
   * @returns {Promise<ResponseBean>} 订单创建结果，成功时data为PaymentBean实例
   */
  async createPaymentOrder(orderInfo) {
    try {
      // 验证必需参数
      const validation = this._validateRequiredParams(
        orderInfo,
        ['description', 'amount']
      );

      if (!validation.valid) {
        return this._createValidationError(validation.missingFields);
      }

      // 验证金额
      if (typeof orderInfo.amount !== 'number' || orderInfo.amount <= 0) {
        return ResponseBean.error('订单金额必须大于0', -3);
      }

      const params = {
        action: 'createPaymentOrder',
        data: {
          description: orderInfo.description,
          amount: orderInfo.amount,
          orderType: orderInfo.orderType || 'default',
          orderData: orderInfo.orderData || {}
        }
      };

      const response = await this.callFunction('paymentManagement', params);

      this._logServiceCall('createPaymentOrder', params, response);

      // 成功时将data转换为PaymentBean
      if (response.success && response.data) {
        response.data = new PaymentBean(response.data);
      }

      return response;
    } catch (error) {
      this._error('createPaymentOrder', 'createPaymentOrder 异常:', error);
      return ResponseBean.error('创建支付订单失败: ' + error.message, -1);
    }
  }

  /**
   * 查询订单状态
   * @param {string} out_trade_no - 商户订单号（可选）
   * @param {string} orderId - 订单ID（可选）
   * @returns {Promise<ResponseBean>} 订单状态查询结果，成功时data为PaymentBean实例
   */
  async queryOrderStatus(out_trade_no = null, orderId = null) {
    try {
      if (!out_trade_no && !orderId) {
        return ResponseBean.error('缺少订单标识：out_trade_no或orderId', -3);
      }

      const params = {
        action: 'queryOrderStatus',
        data: {
          out_trade_no: out_trade_no,
          orderId: orderId
        }
      };

      const response = await this.callFunction('paymentManagement', params);

      this._logServiceCall('queryOrderStatus', params, response);

      // 成功时将data转换为PaymentBean
      if (response.success && response.data) {
        response.data = new PaymentBean(response.data);
      }

      return response;
    } catch (error) {
      this._error('queryOrderStatus', 'queryOrderStatus 异常:', error);
      return ResponseBean.error('查询订单状态失败: ' + error.message, -1);
    }
  }

  /**
   * 调起微信支付
   * @param {PaymentBean} paymentBean - 支付订单Bean
   * @returns {Promise<ResponseBean>} 支付结果
   */
  async requestPayment(paymentBean) {
    try {
      if (!paymentBean || !(paymentBean instanceof PaymentBean)) {
        return ResponseBean.error('无效的支付订单', -3);
      }

      if (!paymentBean.canPay()) {
        return ResponseBean.error('订单状态不允许支付', -3);
      }

      const paymentParams = paymentBean.getPaymentParams();
      if (!paymentParams) {
        return ResponseBean.error('支付参数不完整', -3);
      }

      this._log('requestPayment', '准备调起支付', {
        out_trade_no: paymentBean.out_trade_no,
        amount: paymentBean.amount
      });

      // 调用小程序支付API
      return new Promise((resolve) => {
        wx.requestPayment({
          timeStamp: paymentParams.timeStamp,
          nonceStr: paymentParams.nonceStr,
          package: paymentParams.package,
          signType: paymentParams.signType,
          paySign: paymentParams.paySign,
          success: (res) => {
            this._log('requestPayment', '支付调起成功', res);
            // 支付调起成功，需要查询订单状态确认支付结果
            resolve(ResponseBean.success({
              out_trade_no: paymentBean.out_trade_no,
              orderId: paymentBean.orderId,
              message: '支付调起成功，请查询订单状态确认支付结果'
            }, '支付调起成功'));
          },
          fail: (err) => {
            this._error('requestPayment', '支付调起失败', err);
            
            // 用户取消支付
            if (err.errMsg && err.errMsg.includes('cancel')) {
              resolve(ResponseBean.error('用户取消支付', -2));
            } else {
              resolve(ResponseBean.error('支付调起失败: ' + (err.errMsg || '未知错误'), -1));
            }
          }
        });
      });
    } catch (error) {
      this._error('requestPayment', 'requestPayment 异常:', error);
      return ResponseBean.error('调起支付失败: ' + error.message, -1);
    }
  }

  /**
   * 创建订单并调起支付（完整流程）
   * @param {Object} orderInfo - 订单信息
   * @param {string} orderInfo.description - 商品描述
   * @param {number} orderInfo.amount - 订单金额（分）
   * @param {string} orderInfo.orderType - 订单类型（可选）
   * @param {Object} orderInfo.orderData - 订单附加数据（可选）
   * @returns {Promise<ResponseBean>} 支付结果
   */
  async createOrderAndPay(orderInfo) {
    try {
      // 1. 创建支付订单
      const createResult = await this.createPaymentOrder(orderInfo);

      if (!createResult.success) {
        return createResult;
      }

      const paymentBean = createResult.data;

      // 2. 调起支付
      const payResult = await this.requestPayment(paymentBean);

      // 3. 如果支付调起成功，延迟查询订单状态
      if (payResult.success) {
        // 延迟1秒后查询订单状态（给支付系统处理时间）
        setTimeout(async () => {
          const queryResult = await this.queryOrderStatus(paymentBean.out_trade_no);
          this._log('createOrderAndPay', '订单状态查询结果', {
            out_trade_no: paymentBean.out_trade_no,
            status: queryResult.success ? queryResult.data?.status : '查询失败'
          });
        }, 1000);
      }

      return payResult;
    } catch (error) {
      this._error('createOrderAndPay', 'createOrderAndPay 异常:', error);
      return ResponseBean.error('创建订单并支付失败: ' + error.message, -1);
    }
  }
}

// 导出类和单例实例
module.exports = {
  PaymentService,
  paymentService: new PaymentService()
};

