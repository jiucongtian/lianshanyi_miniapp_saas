/**
 * 基础服务类
 * 提供统一的云函数调用、错误处理、重试机制、版本管理等功能
 * 所有具体Service类都应该继承此类
 */
const { ResponseBean } = require('../beans/ResponseBean');
const { VersionManager } = require('../utils/versionManager');

class BaseService {
  constructor() {
    this.serviceName = this.constructor.name;
  }

  /**
   * 调用云函数（带错误处理和版本管理）
   * @param {string} name - 云函数基础名称
   * @param {Object} data - 传递给云函数的数据
   * @param {string} version - 指定版本（可选，不指定则使用默认版本）
   * @returns {Promise<ResponseBean>} 统一格式的响应
   */
  async callFunction(name, data = {}, version = null) {
    try {
      // 获取实际的云函数名称（包含版本后缀）
      const actualFunctionName = VersionManager.getFunctionName(name, version);
      
      console.log(`[${this.serviceName}] 调用云函数 ${actualFunctionName} (基础名称: ${name}):`, data);
      
      const result = await wx.cloud.callFunction({ 
        name: actualFunctionName, 
        data 
      });
      
      console.log(`[${this.serviceName}] 云函数 ${actualFunctionName} 返回:`, result);
      console.log(`[${this.serviceName}] 准备创建 ResponseBean，传入参数:`, result);
      const responseBean = ResponseBean.fromCloudResult(result);
      console.log(`[${this.serviceName}] ResponseBean 创建完成:`, responseBean);
      return responseBean;
    } catch (error) {
      console.error(`[${this.serviceName}] 云函数 ${name} 调用失败:`, error);
      console.log(`[${this.serviceName}] 创建错误 ResponseBean，传入参数:`, error.message || '网络错误', -1);
      return ResponseBean.error(error.message || '网络错误', -1);
    }
  }

  /**
   * 带重试的云函数调用（支持版本管理）
   * @param {string} name - 云函数基础名称
   * @param {Object} data - 传递给云函数的数据
   * @param {number} retryCount - 重试次数，默认3次
   * @param {string} version - 指定版本（可选）
   * @returns {Promise<ResponseBean>} 统一格式的响应
   */
  async callFunctionWithRetry(name, data = {}, retryCount = 3, version = null) {
    for (let i = 0; i < retryCount; i++) {
      try {
        const result = await this.callFunction(name, data, version);
        
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

  /**
   * 获取云函数版本信息
   * @param {string} functionName - 云函数基础名称
   * @returns {string} 版本号
   */
  getFunctionVersion(functionName) {
    return VersionManager.getFunctionVersion(functionName);
  }

  /**
   * 检查云函数版本是否支持
   * @param {string} functionName - 云函数基础名称
   * @param {string} version - 版本号
   * @returns {boolean} 是否支持
   */
  isVersionSupported(functionName, version) {
    return VersionManager.isFunctionVersionSupported(functionName, version);
  }

  /**
   * 批量调用云函数（支持版本管理）
   * @param {Array} calls - 调用配置数组
   * @returns {Promise<Array>} 调用结果数组
   */
  async callFunctionsBatch(calls) {
    const promises = calls.map(call => {
      const { functionName, data, version } = call;
      return this.callFunction(functionName, data, version);
    });
    
    try {
      const results = await Promise.all(promises);
      return results;
    } catch (error) {
      console.error(`[${this.serviceName}] 批量调用失败:`, error);
      throw error;
    }
  }
}

module.exports = { BaseService };
