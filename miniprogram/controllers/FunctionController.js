/**
 * 功能控制器
 * 处理功能调用、配额检查、支付流程等业务逻辑
 * 
 * 使用方式：
 * ```javascript
 * const { FunctionController } = require('../../controllers/FunctionController');
 * 
 * Page({
 *   onLoad() {
 *     this.functionController = new FunctionController(this);
 *   },
 *   
 *   onUseFunctionTap() {
 *     this.functionController.useFunction('wisdom_insight', {
 *       parameters: { question: '我应该换工作吗？' }
 *     });
 *   }
 * });
 * ```
 */

const { BaseController } = require('./BaseController');
const { functionService } = require('../services/FunctionService');
const { paymentService } = require('../services/PaymentService');

/**
 * 功能代码与工作流类型映射
 * 客户端本来就知道每个功能对应的工作流类型
 */
const FUNCTION_WORKFLOW_MAP = {
  'wisdom_insight': 'DRAW_CARD',
  'ai_report': 'AI_REPORT'
};

class FunctionController extends BaseController {
  /**
   * 构造函数
   * @param {Object} page - 页面实例
   */
  constructor(page) {
    super(page);
    
    // 配额信息缓存
    this.quotaCache = {};
    this.quotaCacheTime = {};
    this.quotaCacheDuration = 30000; // 30秒缓存
    
    // 支付状态标志（防止重复点击）
    this._isPaymentInProgress = false;
    
    // 支付信息（用于页面显示时恢复加载提示）
    this._paymentInfo = null;
  }

  /**
   * 使用功能（统一入口）
   * 在原有调用基础上增加配额管理逻辑
   * 
   * @param {string} functionCode - 功能编码
   * @param {Object} functionParams - 功能参数
   * @param {Object} options - 可选配置
   * @param {boolean} options.showLoading - 是否显示加载提示，默认true
   * @param {boolean} options.autoPayment - 配额不足时是否自动弹出支付，默认true
   * @param {Function} options.onSuccess - 成功回调
   * @param {Function} options.onError - 错误回调
   * @param {Function} options.onQuotaInsufficient - 配额不足回调
   * @returns {Promise<Object|null>} 功能返回结果，失败返回null
   */
  async useFunction(functionCode, functionParams = {}, options = {}) {
    const {
      showLoading = true,
      autoPayment = true,
      onSuccess = null,
      onError = null,
      onQuotaInsufficient = null
    } = options;
    
    this._log('useFunction', '开始调用功能', { functionCode, functionParams });
    
    try {
      // 显示加载提示
      if (showLoading) {
        this._showLoading('处理中...');
      }
      
      // 1. 检查配额
      const quotaCheck = await functionService.checkQuota(functionCode);
      
      if (!quotaCheck.success || !quotaCheck.data) {
        this._error('useFunction', '检查配额失败', null, quotaCheck.error);
        if (showLoading) {
          this._hideLoading();
        }
        this._showError('检查配额失败');
        if (onError) {
          onError(quotaCheck);
        }
        return null;
      }
      
      const quotaInfo = quotaCheck.data;
      
      // 2. 检查是否有可用配额
      if (!quotaInfo.canUse) {
        if (showLoading) {
          this._hideLoading();
        }
        this._handleQuotaInsufficient(functionCode, {
          success: false,
          code: 'QUOTA_INSUFFICIENT',
          error: '配额不足',
          data: { quotaInfo: quotaInfo }
        }, autoPayment, onQuotaInsufficient);
        return null;
      }
      
      // 3. 扣除配额
      const deductResult = await functionService.deductQuota(functionCode);
      
      if (!deductResult.success) {
        this._error('useFunction', '扣除配额失败', null, deductResult.error);
        if (showLoading) {
          this._hideLoading();
        }
        this._showError('扣除配额失败');
        if (onError) {
          onError(deductResult);
        }
        return null;
      }
      
      const deductData = deductResult.data;
      const isPaid = deductData.isPaid || false;
      const quotaBefore = deductData.quotaBefore || null;
      const quotaAfter = deductData.quotaAfter || null;
      
      // 更新配额缓存
      if (quotaAfter) {
        this._updateQuotaCache(functionCode, quotaAfter);
      }
      
      // 4. 直接调用云函数（就像以前一样）
      const workflowType = FUNCTION_WORKFLOW_MAP[functionCode];
      
      if (!workflowType) {
        this._error('useFunction', '未知的功能编码', { functionCode });
        // 回滚配额
        await functionService.rollbackQuota(functionCode, isPaid);
        if (showLoading) {
          this._hideLoading();
        }
        this._showError('功能配置错误');
        if (onError) {
          onError({ error: '未知的功能编码' });
        }
        return null;
      }
      
      this._log('useFunction', '调用云函数', {
        functionCode,
        workflowType
      });
      
      const parameters = functionParams.parameters || {};
      const response = await functionService.callCozeFunctionDirectly(workflowType, parameters);
      
      if (!response.success) {
        // 调用失败，回滚配额
        this._log('useFunction', '功能调用失败，回滚配额', {
          functionCode,
          error: response.error
        });
        await functionService.rollbackQuota(functionCode, isPaid);
        
        if (showLoading) {
          this._hideLoading();
        }
        
        const errorMessage = response.error || '功能调用失败';
        this._showError(errorMessage);
        
        if (onError) {
          onError(response);
        }
        
        return null;
      }
      
      // 5. 调用成功
      if (showLoading) {
        this._hideLoading();
      }
      
      this._log('useFunction', '功能调用成功', { functionCode });
      
      // 构建返回数据
      const resultData = {
        functionResult: response.data,
        quotaInfo: {
          before: quotaBefore,
          after: quotaAfter,
          isPaid: isPaid
        }
      };
      
      // 执行成功回调
      if (onSuccess) {
        onSuccess(resultData);
      }
      
      return resultData;
      
    } catch (error) {
      this._error('useFunction', '功能调用异常', error);
      
      if (showLoading) {
        this._hideLoading();
      }
      
      this._showError('功能调用失败');
      
      if (onError) {
        onError({ error: error.message });
      }
      
      return null;
    }
  }

  /**
   * 检查配额（用于UI显示）
   * @param {string} functionCode - 功能编码
   * @param {boolean} useCache - 是否使用缓存，默认true
   * @returns {Promise<Object|null>} 配额信息（FunctionQuotaBean），失败返回null
   */
  async checkQuota(functionCode, useCache = true) {
    this._log('checkQuota', '检查配额', { functionCode, useCache });
    
    try {
      // 检查缓存
      if (useCache && this._isQuotaCacheValid(functionCode)) {
        this._log('checkQuota', '使用缓存的配额信息', { functionCode });
        return this.quotaCache[functionCode];
      }
      
      // 调用配额检查接口
      const response = await functionService.checkQuota(functionCode);
      
      if (response.success && response.data) {
        this._log('checkQuota', '配额检查成功', { functionCode, canUse: response.data.canUse });
        
        // 更新缓存
        this._updateQuotaCache(functionCode, response.data);
        
        return response.data;
      }
      
      this._error('checkQuota', '配额检查失败', null, response.error);
      return null;
    } catch (error) {
      this._error('checkQuota', '配额检查异常', error);
      return null;
    }
  }

  /**
   * 购买功能
   * @param {string} functionCode - 功能编码
   * @param {Object} options - 可选配置
   * @param {Function} options.onSuccess - 支付成功回调
   * @param {Function} options.onCancel - 用户取消回调
   * @param {Function} options.onError - 支付失败回调
   * @returns {Promise<boolean>} 支付是否成功
   */
  async purchaseFunction(functionCode, options = {}) {
    const { onSuccess = null, onCancel = null, onError = null } = options;
    
    // 防止重复点击：如果正在支付中，直接返回
    if (this._isPaymentInProgress) {
      this._log('purchaseFunction', '支付正在进行中，忽略重复点击', { functionCode });
      return false;
    }
    
    this._isPaymentInProgress = true; // 标记支付进行中
    this._log('purchaseFunction', '开始购买功能', { functionCode });
    
    try {
      // 显示支付悬浮窗
      this._showPaymentModal();
      
      // 创建订单
      const orderResponse = await functionService.purchaseFunction(functionCode);
      
      if (!orderResponse.success) {
        this._hidePaymentModal();
        this._isPaymentInProgress = false; // 重置标志
        this._error('purchaseFunction', '创建订单失败', null, orderResponse.error);
        this._showError(orderResponse.error || '创建订单失败');
        
        if (onError) {
          onError(orderResponse);
        }
        
        return false;
      }
      
      this._log('purchaseFunction', '订单创建成功', { 
        orderId: orderResponse.data.orderId,
        out_trade_no: orderResponse.data.out_trade_no 
      });
      
      // 保存支付信息（用于页面显示时恢复悬浮窗）
      this._paymentInfo = {
        orderId: orderResponse.data.orderId,
        out_trade_no: orderResponse.data.out_trade_no,
        functionCode: functionCode,
        onSuccess,
        onError,
        onCancel
      };
      
      // 调起支付（悬浮窗保持不变）
      const paymentResult = await this._requestPayment(orderResponse.data);
      
      // 支付窗口关闭后，确保悬浮窗仍然显示
      // 因为用户可能跳转到微信支付页面，返回时悬浮窗可能被隐藏
      this._showPaymentModal();
      
      // 支付成功或用户关闭窗口（可能是支付成功后才关闭的）
      // 两种情况都需要轮询查询订单状态，确认实际支付结果
      if (paymentResult.success || paymentResult.code === -2) {
        const isCancel = paymentResult.code === -2;
        
        this._log('purchaseFunction', isCancel ? '用户关闭支付窗口，开始轮询查询订单状态' : '支付调起成功，开始轮询查询订单状态', { 
          functionCode,
          orderId: orderResponse.data.orderId,
          out_trade_no: orderResponse.data.out_trade_no,
          isCancel
        });
        
        // 自动轮询查询订单状态（延迟2秒开始，每2秒查询一次，最多5次）
        // 即使关闭窗口，也可能已经支付成功，需要通过轮询确认
        // 悬浮窗保持不变，直到轮询完成
        this._pollOrderStatus(orderResponse.data.orderId, orderResponse.data.out_trade_no, functionCode, {
          onSuccess,
          onError,
          onCancel: isCancel ? onCancel : null // 如果是关闭窗口，轮询失败时调用取消回调
        });
        
        // 清除配额缓存（稍后轮询成功后会刷新）
        this._clearQuotaCache(functionCode);
        
        return true; // 返回true，表示已启动轮询，等待结果
      }
      
      // 其他支付失败情况（非取消）
      this._paymentInfo = null; // 清除支付信息
      this._hidePaymentModal();
      this._isPaymentInProgress = false; // 重置标志
      this._error('purchaseFunction', '支付失败', null, paymentResult.error);
      this._showError(paymentResult.error || '支付失败');
      
      if (onError) {
        onError(paymentResult);
      }
      
      return false;
    } catch (error) {
      this._paymentInfo = null; // 清除支付信息
      this._hidePaymentModal();
      this._isPaymentInProgress = false; // 重置标志
      this._error('purchaseFunction', '购买功能异常', error);
      this._showError('购买失败');
      
      if (onError) {
        onError({ error: error.message });
      }
      
      return false;
    }
  }

  /**
   * 获取配额信息（用于显示）
   * @param {string} functionCode - 功能编码
   * @returns {Promise<Object|null>} 配额信息
   */
  async getQuotaInfo(functionCode) {
    return this.checkQuota(functionCode, true);
  }

  /**
   * 刷新配额信息
   * @param {string} functionCode - 功能编码
   * @returns {Promise<Object|null>} 配额信息
   */
  async refreshQuota(functionCode) {
    return this.checkQuota(functionCode, false);
  }

  // ==================== 私有方法 ====================

  /**
   * 处理配额不足
   * @private
   */
  _handleQuotaInsufficient(functionCode, response, autoPayment, onQuotaInsufficient) {
    this._log('_handleQuotaInsufficient', '配额不足', { functionCode, autoPayment });
    
    // 获取配额信息
    const quotaInfo = response.data && response.data.quotaInfo ? response.data.quotaInfo : null;
    
    // 执行自定义回调
    if (onQuotaInsufficient) {
      const shouldShowDialog = onQuotaInsufficient(quotaInfo);
      if (shouldShowDialog === false) {
        return; // 回调返回false，不显示弹窗
      }
    }
    
    // 自动弹出支付弹窗
    if (autoPayment) {
      this._showPaymentDialog(functionCode, quotaInfo);
    } else {
      this._showError('配额不足，请购买后使用');
    }
  }

  /**
   * 处理权限不足
   * @private
   */
  _handlePermissionDenied(response) {
    this._log('_handlePermissionDenied', '权限不足', response);
    
    const message = response.error || '您暂无权限使用该功能';
    this._showError(message);
  }

  /**
   * 显示支付弹窗
   * @private
   */
  async _showPaymentDialog(functionCode, quotaInfo) {
    this._log('_showPaymentDialog', '显示支付弹窗', { functionCode });
    
    // 获取功能名称（从配置中获取，或使用默认名称）
    const functionNames = {
      'wisdom_insight': '智慧洞见',
      'ai_report': 'AI出报告'
    };
    const functionName = functionNames[functionCode] || '该功能';
    
    // 显示确认对话框
    const confirmed = await this._confirm(
      '配额不足',
      `${functionName}配额不足，是否立即购买？`,
      '立即购买',
      '取消'
    );
    
    if (confirmed) {
      await this.purchaseFunction(functionCode);
    }
  }

  /**
   * 调起微信支付
   * @private
   */
  async _requestPayment(orderData) {
    this._log('_requestPayment', '调起微信支付', { 
      orderId: orderData.orderId,
      out_trade_no: orderData.out_trade_no 
    });
    
    try {
      // 构建支付参数
      const paymentParams = orderData.paymentParams;
      
      if (!paymentParams) {
        return {
          success: false,
          error: '支付参数不完整',
          code: -3
        };
      }
      
      // 调起微信支付
      return new Promise((resolve) => {
        wx.requestPayment({
          timeStamp: paymentParams.timeStamp,
          nonceStr: paymentParams.nonceStr,
          package: paymentParams.package,
          signType: paymentParams.signType,
          paySign: paymentParams.paySign,
          success: (res) => {
            this._log('_requestPayment', '支付成功', res);
            resolve({
              success: true,
              data: {
                out_trade_no: orderData.out_trade_no,
                orderId: orderData.orderId
              }
            });
          },
          fail: (err) => {
            this._error('_requestPayment', '支付失败', err);
            
            // 用户取消支付
            if (err.errMsg && err.errMsg.includes('cancel')) {
              resolve({
                success: false,
                error: '用户取消支付',
                code: -2
              });
            } else {
              resolve({
                success: false,
                error: '支付失败: ' + (err.errMsg || '未知错误'),
                code: -1
              });
            }
          }
        });
      });
    } catch (error) {
      this._error('_requestPayment', '调起支付异常', error);
      return {
        success: false,
        error: '调起支付失败: ' + error.message,
        code: -1
      };
    }
  }

  /**
   * 更新配额缓存
   * @private
   */
  _updateQuotaCache(functionCode, quotaData) {
    this.quotaCache[functionCode] = quotaData;
    this.quotaCacheTime[functionCode] = Date.now();
    this._log('_updateQuotaCache', '更新配额缓存', { 
      functionCode,
      canUse: quotaData.canUse,
      totalRemaining: quotaData.totalRemaining 
    });
  }

  /**
   * 检查配额缓存是否有效
   * @private
   */
  _isQuotaCacheValid(functionCode) {
    if (!this.quotaCache[functionCode] || !this.quotaCacheTime[functionCode]) {
      return false;
    }
    
    const cacheAge = Date.now() - this.quotaCacheTime[functionCode];
    return cacheAge < this.quotaCacheDuration;
  }

  /**
   * 清除配额缓存
   * @private
   */
  _clearQuotaCache(functionCode) {
    if (functionCode) {
      delete this.quotaCache[functionCode];
      delete this.quotaCacheTime[functionCode];
      this._log('_clearQuotaCache', '清除配额缓存', { functionCode });
    } else {
      this.quotaCache = {};
      this.quotaCacheTime = {};
      this._log('_clearQuotaCache', '清除所有配额缓存');
    }
  }

  /**
   * 轮询查询订单状态（支付成功后自动查询）
   * @private
   * @param {string} orderId - 订单ID
   * @param {string} out_trade_no - 商户订单号
   * @param {string} functionCode - 功能编码
   * @param {Object} options - 回调选项
   * @param {Function} options.onSuccess - 成功回调
   * @param {Function} options.onError - 错误回调
   * @param {Function} options.onCancel - 取消回调（如果轮询后确认未支付，调用此回调）
   */
  _pollOrderStatus(orderId, out_trade_no, functionCode, options = {}) {
    const { onSuccess = null, onError = null, onCancel = null } = options;
    
    let attempts = 0;
    const maxAttempts = 5; // 最多查询5次
    const interval = 2000; // 每2秒查询一次
    const initialDelay = 2000; // 延迟2秒后开始第一次查询
    
    this._log('_pollOrderStatus', '开始轮询查询订单状态', {
      orderId,
      out_trade_no,
      functionCode,
      maxAttempts,
      interval
    });
    
    // 延迟后开始第一次查询
    setTimeout(() => {
      const pollTimer = setInterval(async () => {
        attempts++;
        
        this._log('_pollOrderStatus', `第 ${attempts} 次查询订单状态`, {
          orderId,
          out_trade_no
        });
        
        try {
          // 查询订单状态
          const queryResult = await paymentService.queryOrderStatus(out_trade_no, orderId);
          
          if (queryResult.success && queryResult.data) {
            const orderStatus = queryResult.data.status;
            
            this._log('_pollOrderStatus', '订单状态查询结果', {
              orderId,
              status: orderStatus,
              attempt: attempts
            });
            
            // 如果订单状态为 SUCCESS，停止轮询
            if (orderStatus === 'SUCCESS') {
              clearInterval(pollTimer);
              
              // 清除支付信息
              this._paymentInfo = null;
              
              // 隐藏支付悬浮窗
              this._hidePaymentModal();
              
              // 重置支付状态标志
              this._isPaymentInProgress = false;
              
              this._log('_pollOrderStatus', '订单支付成功，停止轮询', {
                orderId,
                grantInfo: queryResult.data.grantInfo
              });
              
              // 刷新配额缓存
              await this.checkQuota(functionCode, false);
              
              // 显示成功提示
              this._showSuccess('支付成功');
              
              // 调用成功回调
              if (onSuccess) {
                onSuccess(queryResult.data);
              }
              
              return;
            }
            
            // 如果达到最大查询次数，停止轮询
            if (attempts >= maxAttempts) {
              clearInterval(pollTimer);
              
              // 清除支付信息
              this._paymentInfo = null;
              
              // 隐藏支付悬浮窗
              this._hidePaymentModal();
              
              // 重置支付状态标志
              this._isPaymentInProgress = false;
              
              this._log('_pollOrderStatus', '达到最大查询次数，停止轮询', {
                orderId,
                attempts,
                finalStatus: orderStatus
              });
              
              // 如果最终状态仍为 NOTPAY，可能是用户真的取消了支付
              if (orderStatus === 'NOTPAY') {
                this._log('_pollOrderStatus', '轮询后订单状态仍为NOTPAY，可能是用户取消了支付', {
                  orderId
                });
                
                // 调用取消回调（如果存在）
                if (onCancel) {
                  onCancel();
                }
                
                // 提示用户
                this._showSuccess('订单未支付');
              } else {
                // 其他状态（可能是支付中），提示用户稍后查询
                this._showSuccess('订单状态确认中，请稍后查看');
                
                // 刷新配额缓存（可能已经到账）
                await this.checkQuota(functionCode, false);
              }
              
              return;
            }
          } else {
            this._log('_pollOrderStatus', '查询订单状态失败', {
              orderId,
              error: queryResult.error,
              attempt: attempts
            });
            
            // 查询失败也继续尝试，直到达到最大次数
            if (attempts >= maxAttempts) {
              clearInterval(pollTimer);
              
              // 清除支付信息
              this._paymentInfo = null;
              
              // 隐藏支付悬浮窗
              this._hidePaymentModal();
              
              // 重置支付状态标志
              this._isPaymentInProgress = false;
              
              this._showSuccess('订单状态确认中，请稍后查看');
              
              // 刷新配额缓存（可能已经到账）
              await this.checkQuota(functionCode, false);
            }
          }
        } catch (error) {
          this._error('_pollOrderStatus', '轮询查询订单状态异常', error);
          
          // 异常也继续尝试，直到达到最大次数
          if (attempts >= maxAttempts) {
            clearInterval(pollTimer);
            
            // 清除支付信息
            this._paymentInfo = null;
            
            // 隐藏支付悬浮窗
            this._hidePaymentModal();
            
            // 重置支付状态标志
            this._isPaymentInProgress = false;
            
            this._showSuccess('订单状态确认中，请稍后查看');
            
            // 刷新配额缓存（可能已经到账）
            await this.checkQuota(functionCode, false);
            
            if (onError) {
              onError({ error: error.message });
            }
          }
        }
      }, interval);
    }, initialDelay);
  }

  /**
   * 显示支付悬浮窗
   * @private
   */
  _showPaymentModal() {
    this._setData({
      showPaymentModal: true
    });
    this._log('_showPaymentModal', '显示支付悬浮窗');
  }

  /**
   * 隐藏支付悬浮窗
   * @private
   */
  _hidePaymentModal() {
    this._setData({
      showPaymentModal: false
    });
    this._log('_hidePaymentModal', '隐藏支付悬浮窗');
  }

  /**
   * 页面显示时调用（恢复支付状态）
   * 如果正在支付中，恢复显示支付悬浮窗
   */
  onShow() {
    // 调用父类的 onShow 方法
    super.onShow();
    
    // 如果正在支付中且有支付信息，恢复显示支付悬浮窗
    if (this._isPaymentInProgress && this._paymentInfo) {
      this._log('onShow', '页面显示，恢复支付悬浮窗', {
        orderId: this._paymentInfo.orderId,
        functionCode: this._paymentInfo.functionCode
      });
      
      // 恢复显示支付悬浮窗
      this._showPaymentModal();
      
      // 注意：轮询已经在后台运行，这里只需要恢复显示悬浮窗
      // 轮询完成后会自动隐藏悬浮窗并清除支付信息
    }
  }
}

module.exports = { FunctionController };

