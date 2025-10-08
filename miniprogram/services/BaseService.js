/**
 * 基础服务类
 * 提供统一的云函数调用、错误处理、重试机制等功能
 * 所有具体Service类都应该继承此类
 */
const { ResponseBean } = require('../beans/ResponseBean');

class BaseService {
  constructor() {
    this.serviceName = this.constructor.name;
  }

  /**
   * 调用云函数（带错误处理）
   * @param {string} name - 云函数名称
   * @param {Object} data - 传递给云函数的数据
   * @returns {Promise<ResponseBean>} 统一格式的响应
   */
  async callFunction(name, data = {}) {
    try {
      console.log(`[${this.serviceName}] 调用云函数 ${name}:`, data);
      
      const result = await wx.cloud.callFunction({ 
        name, 
        data 
      });
      
      console.log(`[${this.serviceName}] 云函数 ${name} 返回:`, result);
      return ResponseBean.fromCloudResult(result);
    } catch (error) {
      console.error(`[${this.serviceName}] 云函数 ${name} 调用失败:`, error);
      return ResponseBean.error(error.message || '网络错误', -1);
    }
  }

  /**
   * 带重试的云函数调用
   * @param {string} name - 云函数名称
   * @param {Object} data - 传递给云函数的数据
   * @param {number} retryCount - 重试次数，默认3次
   * @returns {Promise<ResponseBean>} 统一格式的响应
   */
  async callFunctionWithRetry(name, data = {}, retryCount = 3) {
    for (let i = 0; i < retryCount; i++) {
      try {
        const result = await this.callFunction(name, data);
        
        // 如果成功，直接返回
        if (result.success) {
          return result;
        }
        
        // 失败但未到最后一次，延迟后重试
        if (i < retryCount - 1) {
          const delay = 1000 * (i + 1); // 递增延迟：1s, 2s, 3s
          console.log(`[${this.serviceName}] 第${i + 1}次调用失败，${delay}ms后重试`);
          await this._delay(delay);
        }
      } catch (error) {
        console.error(`[${this.serviceName}] 第${i + 1}次调用异常:`, error);
        
        // 如果是最后一次重试，返回错误
        if (i === retryCount - 1) {
          return ResponseBean.error(error.message || '重试失败', -1);
        }
        
        // 延迟后继续重试
        const delay = 1000 * (i + 1);
        await this._delay(delay);
      }
    }
    
    return ResponseBean.error('重试失败', -1);
  }

  /**
   * 延迟辅助方法
   * @param {number} ms - 延迟毫秒数
   * @returns {Promise<void>}
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 验证必需参数
   * @param {Object} params - 参数对象
   * @param {Array<string>} requiredFields - 必需字段数组
   * @returns {Object} 验证结果 { valid: boolean, missingFields: Array<string> }
   */
  _validateRequiredParams(params, requiredFields) {
    const missingFields = [];
    
    for (const field of requiredFields) {
      if (params[field] === undefined || params[field] === null || params[field] === '') {
        missingFields.push(field);
      }
    }
    
    return {
      valid: missingFields.length === 0,
      missingFields
    };
  }

  /**
   * 创建参数验证错误响应
   * @param {Array<string>} missingFields - 缺失的字段
   * @returns {ResponseBean} 错误响应
   */
  _createValidationError(missingFields) {
    const message = `缺少必需参数: ${missingFields.join(', ')}`;
    return ResponseBean.error(message, -3);
  }

  /**
   * 记录服务调用日志
   * @param {string} method - 方法名
   * @param {Object} params - 参数
   * @param {ResponseBean} result - 结果
   */
  _logServiceCall(method, params, result) {
    const logData = {
      service: this.serviceName,
      method,
      params,
      success: result.success,
      code: result.code,
      timestamp: new Date().toISOString()
    };
    
    if (result.success) {
      console.log(`[${this.serviceName}] ${method} 成功:`, logData);
    } else {
      console.error(`[${this.serviceName}] ${method} 失败:`, logData, result.error);
    }
  }
}

module.exports = { BaseService };
