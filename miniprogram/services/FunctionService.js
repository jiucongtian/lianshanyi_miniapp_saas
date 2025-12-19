/**
 * 功能服务类
 * 处理功能调用、配额查询、功能购买等业务逻辑
 */
const { BaseService } = require('./BaseService');
const { FunctionQuotaBean } = require('../beans/FunctionQuotaBean');
const { FunctionProductBean } = require('../beans/FunctionProductBean');
const { ResponseBean } = require('../beans/ResponseBean');

class FunctionService extends BaseService {
  constructor() {
    super();
  }

  /**
   * 检查配额（预检查，用于UI提示）
   * @param {string} functionCode - 功能编码
   * @returns {Promise<ResponseBean>} 配额信息响应，成功时data为FunctionQuotaBean实例
   */
  async checkQuota(functionCode) {
    try {
      // 验证必需参数
      const validation = this._validateRequiredParams(
        { functionCode },
        ['functionCode']
      );

      if (!validation.valid) {
        return this._createValidationError(validation.missingFields);
      }

      const params = {
        action: 'checkQuota',
        data: {
          functionCode: functionCode
        }
      };

      const response = await this.callFunction('functionQuotaManagement', params);

      this._logServiceCall('checkQuota', params, response);

      // 成功时将data转换为FunctionQuotaBean
      if (response.success && response.data) {
        response.data = new FunctionQuotaBean(response.data);
      }

      return response;
    } catch (error) {
      this._error('checkQuota', 'checkQuota 异常:', error);
      return ResponseBean.error('检查配额失败: ' + error.message, -1);
    }
  }

  /**
   * 调用功能（通过统一网关）
   * @param {string} functionCode - 功能编码
   * @param {Object} functionParams - 功能参数
   * @returns {Promise<ResponseBean>} 功能调用结果
   */
  async useFunction(functionCode, functionParams = {}) {
    try {
      // 验证必需参数
      const validation = this._validateRequiredParams(
        { functionCode },
        ['functionCode']
      );

      if (!validation.valid) {
        return this._createValidationError(validation.missingFields);
      }

      const params = {
        action: 'callFunction',
        data: {
          functionCode: functionCode,
          functionParams: functionParams
        }
      };

      const response = await this.callFunction('functionCallGateway', params);

      this._logServiceCall('useFunction', params, response);

      // 如果成功，将配额信息转换为Bean
      if (response.success && response.data && response.data.quotaInfo) {
        const quotaInfo = response.data.quotaInfo;
        if (quotaInfo.after) {
          response.data.quotaInfo.after = new FunctionQuotaBean({
            functionCode: functionCode,
            ...quotaInfo.after
          });
        }
        if (quotaInfo.before) {
          response.data.quotaInfo.before = new FunctionQuotaBean({
            functionCode: functionCode,
            ...quotaInfo.before
          });
        }
      }

      return response;
    } catch (error) {
      this._error('useFunction', 'useFunction 异常:', error);
      return ResponseBean.error('调用功能失败: ' + error.message, -1);
    }
  }

  /**
   * 购买功能（创建功能付费订单）
   * @param {string} functionCode - 功能编码
   * @returns {Promise<ResponseBean>} 订单创建结果，成功时data包含支付参数
   */
  async purchaseFunction(functionCode) {
    try {
      // 验证必需参数
      const validation = this._validateRequiredParams(
        { functionCode },
        ['functionCode']
      );

      if (!validation.valid) {
        return this._createValidationError(validation.missingFields);
      }

      const params = {
        action: 'createFunctionOrder',
        data: {
          functionCode: functionCode
        }
      };

      const response = await this.callFunction('paymentManagement', params);

      this._logServiceCall('purchaseFunction', params, response);

      // 成功时将商品信息转换为Bean（如果存在）
      if (response.success && response.data) {
        if (response.data.functionCode && response.data.functionName) {
          // 创建商品Bean用于显示
          response.data.product = new FunctionProductBean({
            functionCode: response.data.functionCode,
            functionName: response.data.functionName,
            price: response.data.price || 0
          });
        }
      }

      return response;
    } catch (error) {
      this._error('purchaseFunction', 'purchaseFunction 异常:', error);
      return ResponseBean.error('购买功能失败: ' + error.message, -1);
    }
  }

  /**
   * 获取配额信息（单个功能或所有功能）
   * @param {string} functionCode - 功能编码（可选，不传则返回所有功能的配额）
   * @returns {Promise<ResponseBean>} 配额信息响应
   */
  async getQuotaInfo(functionCode = null) {
    try {
      const params = {
        action: 'getQuotaInfo',
        data: functionCode ? { functionCode } : {}
      };

      const response = await this.callFunction('functionQuotaManagement', params);

      this._logServiceCall('getQuotaInfo', params, response);

      // 成功时将data转换为Bean
      if (response.success && response.data) {
        if (functionCode) {
          // 单个功能配额
          response.data = new FunctionQuotaBean({
            functionCode: functionCode,
            ...response.data
          });
        } else {
          // 所有功能配额（对象）
          const quotaMap = {};
          for (const [code, quotaData] of Object.entries(response.data)) {
            quotaMap[code] = new FunctionQuotaBean({
              functionCode: code,
              ...quotaData
            });
          }
          response.data = quotaMap;
        }
      }

      return response;
    } catch (error) {
      this._error('getQuotaInfo', 'getQuotaInfo 异常:', error);
      return ResponseBean.error('获取配额信息失败: ' + error.message, -1);
    }
  }

  /**
   * 获取功能商品列表
   * @param {string} status - 商品状态（可选，默认'active'）
   * @returns {Promise<ResponseBean>} 商品列表响应
   */
  async getFunctionProducts(status = 'active') {
    try {
      // 从数据库查询商品列表（这里需要云函数支持，暂时返回空）
      // TODO: 如果云函数支持查询商品列表，可以调用云函数
      // 目前商品信息在购买时从订单中获取
      
      this._warn('getFunctionProducts', '获取商品列表功能暂未实现，商品信息在购买时获取');
      return ResponseBean.success([], '商品列表功能暂未实现');
    } catch (error) {
      this._error('getFunctionProducts', 'getFunctionProducts 异常:', error);
      return ResponseBean.error('获取商品列表失败: ' + error.message, -1);
    }
  }
}

// 导出类和单例实例
module.exports = {
  FunctionService,
  functionService: new FunctionService()
};

