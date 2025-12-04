/**
 * 支付数据Bean
 * 用于处理支付相关的数据格式化和验证
 */
const { BaseBean } = require('./BaseBean');

class PaymentBean extends BaseBean {
  constructor(data) {
    super(data);
    
    // 订单基本信息
    this.orderId = data?.orderId || data?._id || '';
    this.out_trade_no = data?.out_trade_no || '';
    this.prepay_id = data?.prepay_id || '';
    
    // 订单金额和描述
    this.amount = data?.amount || 0; // 金额（分）
    this.description = data?.description || '';
    this.orderType = data?.orderType || 'default';
    this.orderData = data?.orderData || {};
    
    // 订单状态
    this.status = data?.status || 'NOTPAY'; // NOTPAY, SUCCESS, CLOSED, REFUND等
    
    // 时间信息
    this.createTime = data?.createTime || null;
    this.updateTime = data?.updateTime || null;
    this.payTime = data?.payTime || null;
    
    // 支付参数（用于调起支付）
    this.paymentParams = data?.paymentParams || null;
    
    // 交易信息
    this.transaction_id = data?.transaction_id || '';
    
    // 验证数据
    this._validate();
  }
  
  /**
   * 验证数据完整性
   */
  _validate() {
    if (!this.out_trade_no) {
      this._warn('_validate', '缺少订单号');
    }
    
    if (this.amount <= 0) {
      this._warn('_validate', '订单金额无效', { amount: this.amount });
    }
    
    if (!this.description) {
      this._warn('_validate', '缺少订单描述');
    }
  }
  
  /**
   * 检查订单是否已支付
   * @returns {boolean} 是否已支付
   */
  isPaid() {
    return this.status === 'SUCCESS';
  }
  
  /**
   * 检查订单是否已关闭
   * @returns {boolean} 是否已关闭
   */
  isClosed() {
    return this.status === 'CLOSED';
  }
  
  /**
   * 检查订单是否未支付
   * @returns {boolean} 是否未支付
   */
  isNotPaid() {
    return this.status === 'NOTPAY';
  }
  
  /**
   * 获取金额（元）
   * @returns {number} 金额（元）
   */
  getAmountInYuan() {
    return (this.amount / 100).toFixed(2);
  }
  
  /**
   * 获取格式化金额字符串
   * @returns {string} 格式化金额，如"¥10.00"
   */
  getFormattedAmount() {
    return `¥${this.getAmountInYuan()}`;
  }
  
  /**
   * 获取订单状态文本
   * @returns {string} 状态文本
   */
  getStatusText() {
    const statusMap = {
      'NOTPAY': '未支付',
      'SUCCESS': '支付成功',
      'CLOSED': '已关闭',
      'REFUND': '已退款',
      'REVOKED': '已撤销',
      'USERPAYING': '用户支付中',
      'PAYERROR': '支付失败'
    };
    
    return statusMap[this.status] || '未知状态';
  }
  
  /**
   * 检查是否可以调起支付
   * @returns {boolean} 是否可以支付
   */
  canPay() {
    return this.isNotPaid() && this.paymentParams !== null;
  }
  
  /**
   * 获取支付参数（用于wx.requestPayment）
   * @returns {Object|null} 支付参数
   */
  getPaymentParams() {
    if (!this.paymentParams) {
      return null;
    }
    
    return {
      timeStamp: this.paymentParams.timeStamp,
      nonceStr: this.paymentParams.nonceStr,
      package: this.paymentParams.package,
      signType: this.paymentParams.signType,
      paySign: this.paymentParams.paySign
    };
  }
}

module.exports = { PaymentBean };

