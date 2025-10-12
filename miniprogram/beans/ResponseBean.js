/**
 * 统一响应处理Bean
 * 用于处理所有云函数返回的数据，提供统一的数据格式化和验证
 */
const { BaseClass } = require('../common/BaseClass');

class ResponseBean extends BaseClass {
  constructor(cloudResult) {
    super(); // 调用BaseClass构造函数
    
    this._debug('构造函数被调用，传入参数:', cloudResult);
    this._debug('参数类型:', typeof cloudResult);
    
    this.success = false;
    this.data = null;
    this.error = null;
    this.code = 0;
    this.message = '';
    this.timestamp = new Date().getTime();
    
    // 只有当传入了有效的cloudResult时才进行解析
    if (cloudResult !== undefined) {
      this._parse(cloudResult);
    }
  }
  
  /**
   * 解析云函数返回结果
   * @param {Object} cloudResult - 云函数返回的原始结果
   */
  _parse(cloudResult) {
    this._debug('_parse 方法开始执行，参数:', cloudResult);
    
    // 1. 检查云函数调用是否成功
    if (!cloudResult || !cloudResult.result) {
      this._error('云函数调用失败', null, { cloudResult });
      this.error = '云函数调用失败';
      this.code = -1;
      return;
    }
    
    const result = cloudResult.result;
    
    // 2. 验证必需字段
    if (typeof result.success !== 'boolean') {
      this._error('响应格式错误，缺少success字段', null, { result });
      this.error = '响应格式错误：缺少success字段';
      this.code = -2;
      return;
    }
    
    // 3. 提取数据
    this.success = result.success;
    this.data = result.data || null;
    this.error = result.error || null;
    this.code = result.code || 0;
    this.message = result.message || '';
    
    // 4. 记录详细日志
    if (this.success) {
      this._log('云函数调用成功:', {
        code: this.code,
        message: this.message,
        hasData: !!this.data
      });
    } else {
      this._error('云函数调用失败', null, {
        code: this.code,
        error: this.error,
        message: this.message
      });
    }
  }
  
  /**
   * 静态工厂方法：从云函数结果创建ResponseBean
   * @param {Object} cloudResult - 云函数返回的原始结果
   * @returns {ResponseBean} ResponseBean实例
   */
  static fromCloudResult(cloudResult) {
    return new ResponseBean(cloudResult);
  }
  
  /**
   * 创建错误响应
   * @param {string} errorMessage - 错误消息
   * @param {number} code - 错误码，默认-1
   * @param {Object} data - 附加数据，可选
   * @returns {ResponseBean} 错误响应Bean
   */
  static error(errorMessage, code = -1, data = null) {
    const bean = new ResponseBean(undefined);
    bean.success = false;
    bean.error = errorMessage;
    bean.code = code;
    bean.data = data;
    bean.timestamp = new Date().getTime();
    return bean;
  }
  
  /**
   * 创建成功响应
   * @param {Object} data - 响应数据
   * @param {string} message - 成功消息，可选
   * @param {number} code - 响应码，默认0
   * @returns {ResponseBean} 成功响应Bean
   */
  static success(data, message = '操作成功', code = 0) {
    const bean = new ResponseBean(undefined);
    bean.success = true;
    bean.data = data;
    bean.message = message;
    bean.code = code;
    bean.timestamp = new Date().getTime();
    return bean;
  }
  
  /**
   * 检查响应是否成功
   * @returns {boolean} 是否成功
   */
  isSuccess() {
    return this.success === true;
  }
  
  /**
   * 检查响应是否失败
   * @returns {boolean} 是否失败
   */
  isError() {
    return this.success === false;
  }
  
  /**
   * 获取错误信息（如果失败）
   * @returns {string|null} 错误信息
   */
  getError() {
    return this.isError() ? this.error : null;
  }
  
  /**
   * 获取响应数据（如果成功）
   * @returns {Object|null} 响应数据
   */
  getData() {
    return this.isSuccess() ? this.data : null;
  }
  
  /**
   * 转换为简单对象（用于调试或日志）
   * @returns {Object} 简化的响应对象
   */
  toObject() {
    return {
      success: this.success,
      code: this.code,
      message: this.message,
      error: this.error,
      hasData: !!this.data,
      timestamp: this.timestamp
    };
  }
}

module.exports = { ResponseBean };
