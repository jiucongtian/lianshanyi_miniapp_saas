/**
 * 个人中心页面
 * 使用MineController处理业务逻辑
 */
const { MineController } = require('../../controllers/MineController');
const { createModuleLogger } = require('../../utils/logger/index');
const log = createModuleLogger('MinePage');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    userInfo: {},
    loading: true,
    error: '',
    userTypeText: '',
    genderText: '',
    phoneNumberText: '',
    avatarUrl: '',
    adminMenus: [],
    isAdmin: false,
    adminRoleName: '普通用户'
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    log.info('onLoad', '页面加载');
    this.controller = new MineController(this);
    this.controller.initialize();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    if (this.controller) {
      this.controller.onShow();
    }
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {
    if (this.controller) {
      this.controller.onHide();
    }
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    if (this.controller) {
      this.controller.onUnload();
    }
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    if (this.controller) {
      this.controller.onPullDownRefresh();
    }
  },


  /**
   * 跳转到注册页面
   */
  onRegister() {
    if (this.controller) {
      this.controller.onRegister();
    }
  },

  /**
   * 编辑用户资料
   */
  onEditProfile() {
    if (this.controller) {
      this.controller.onEditProfile();
    }
  },

  /**
   * 点击设置按钮
   */
  onSettingsTap() {
    if (this.controller) {
      this.controller.showSettings();
    }
  },

  /**
   * 管理员菜单点击事件
   */
  onAdminMenuTap(e) {
    const menuId = e.currentTarget.dataset.id;
    log.info('onAdminMenuTap', '管理员菜单点击:', menuId);
    
    if (this.controller) {
      this.controller.onAdminMenuTap(menuId);
    }
  },

  /**
   * 点击微信小店入口
   */
  onStoreTap() {
    if (this.controller) {
      this.controller.onStoreTap();
    }
  },

  /**
   * 点击卡牌查看器
   */
  onCardViewerTap() {
    wx.navigateTo({
      url: '/pages/cardViewer/index'
    });
  },

  /**
   * 点击使用手册
   */
  onUserManualTap() {
    if (this.controller) {
      this.controller.onUserManualTap();
    }
  },

  /**
   * 测试支付功能（方案二：微信支付V3 API）
   */
  async onTestPayment() {
    log.info('onTestPayment', '开始测试支付流程');
    
    // 显示确认对话框
    const confirmResult = await new Promise((resolve) => {
      wx.showModal({
        title: '支付测试',
        content: '将创建一个0.01元的测试订单，确认要继续吗？',
        confirmText: '继续测试',
        cancelText: '取消',
        success: (res) => resolve(res.confirm)
      });
    });
    
    if (!confirmResult) {
      log.info('onTestPayment', '用户取消测试');
      return;
    }
    
    // 显示加载提示
    wx.showLoading({
      title: '创建订单中...',
      mask: true
    });
    
    try {
      // 步骤1：创建支付订单
      log.info('onTestPayment', '步骤1: 调用云函数创建订单');
      
      const createOrderResult = await wx.cloud.callFunction({
        name: 'paymentManagement_v1_3',
        data: {
          action: 'createPaymentOrder',
          data: {
            description: '测试订单 - 升级高级用户',
            amount: 1,  // 0.01元（单位：分）
            orderType: 'upgrade_premium',
            orderData: {
              targetUserType: 'premium'
            }
          }
        }
      });
      
      log.info('onTestPayment', '云函数返回结果:', createOrderResult);
      log.info('onTestPayment', '云函数result字段:', createOrderResult.result);
      
      // 检查云函数调用结果
      if (!createOrderResult.result) {
        log.error('onTestPayment', '云函数返回结果为空');
        throw new Error('云函数调用失败：返回结果为空');
      }
      
      const result = createOrderResult.result;
      
      log.info('onTestPayment', '解析result.success:', result.success);
      log.info('onTestPayment', '解析result.error:', result.error);
      log.info('onTestPayment', '解析result.data:', result.data);
      
      if (!result.success) {
        log.error('onTestPayment', '订单创建失败', {
          success: result.success,
          error: result.error,
          code: result.code,
          fullResult: result
        });
        throw new Error(result.error || '创建订单失败');
      }
      
      // 获取支付参数和订单信息
      const { orderId, out_trade_no, paymentParams, prepay_id } = result.data;
      const orderAmount = 1; // 订单金额（分）
      
      log.info('onTestPayment', '订单创建成功', {
        orderId,
        out_trade_no,
        prepay_id,
        orderAmount,
        paymentParams
      });
      
      // 检查支付参数
      if (!paymentParams) {
        throw new Error('支付参数为空');
      }
      
      // 验证支付参数完整性
      const requiredFields = ['timeStamp', 'nonceStr', 'package', 'signType', 'paySign'];
      const missingFields = requiredFields.filter(field => !paymentParams[field]);
      if (missingFields.length > 0) {
        log.error('onTestPayment', '支付参数不完整，缺少字段:', missingFields);
        throw new Error('支付参数不完整：' + missingFields.join(', '));
      }
      
      wx.hideLoading();
      
      // 显示订单信息
      await new Promise((resolve) => {
        wx.showModal({
          title: '订单创建成功',
          content: `订单号：${out_trade_no}\n金额：¥0.01\nprepay_id: ${prepay_id.substring(0, 20)}...\n\n即将调起微信支付...`,
          showCancel: false,
          confirmText: '确定',
          success: () => resolve()
        });
      });
      
      // 步骤2：调起微信支付
      log.info('onTestPayment', '步骤2: 调起微信支付', paymentParams);
      
      wx.showLoading({
        title: '调起支付中...',
        mask: true
      });
      
      // 延迟一下，让用户看到提示
      await new Promise(resolve => setTimeout(resolve, 500));
      
      wx.hideLoading();
      
      // 准备支付参数
      const requestPaymentParams = {
        timeStamp: paymentParams.timeStamp,
        nonceStr: paymentParams.nonceStr,
        package: paymentParams.package,
        signType: paymentParams.signType,
        paySign: paymentParams.paySign
      };
      
      log.info('onTestPayment', '调起支付参数:', requestPaymentParams);
      
      // 调用微信支付API
      const paymentResult = await new Promise((resolve, reject) => {
        wx.requestPayment({
          ...requestPaymentParams,
          success: (res) => {
            log.info('onTestPayment', '支付成功', res);
            resolve(res);
          },
          fail: (err) => {
            log.error('onTestPayment', '支付失败', err);
            reject(err);
          }
        });
      });
      
      // 步骤3：支付成功处理
      log.info('onTestPayment', '步骤3: 支付成功，等待回调处理');
      
      wx.showLoading({
        title: '处理中...',
        mask: true
      });
      
      // 等待3秒，让支付回调有时间处理
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      wx.hideLoading();
      
      // 步骤4：查询订单状态
      log.info('onTestPayment', '步骤4: 查询订单状态');
      
      const queryResult = await wx.cloud.callFunction({
        name: 'paymentManagement_v1_3',
        data: {
          action: 'queryOrderStatus',
          data: {
            out_trade_no: out_trade_no
          }
        }
      });
      
      log.info('onTestPayment', '订单状态查询结果:', queryResult);
      
      // 步骤5：验证用户是否已升级
      log.info('onTestPayment', '步骤5: 验证用户类型');
      
      const userInfoResult = await wx.cloud.callFunction({
        name: 'userManagement_v1_3',
        data: {
          action: 'getUserInfo'
        }
      });
      
      log.info('onTestPayment', '用户信息:', userInfoResult);
      
      const userType = userInfoResult.result?.data?.userType || 'unknown';
      const orderStatus = queryResult.result?.data?.status || 'unknown';
      
      // 显示测试结果
      wx.showModal({
        title: '✅ 支付测试完成',
        content: `订单状态：${orderStatus}\n用户类型：${userType}\n\n请检查：\n1. 云函数日志\n2. payment_orders 数据表\n3. users 数据表`,
        showCancel: false,
        confirmText: '知道了'
      });
      
      // 刷新页面数据
      if (this.controller) {
        this.controller.initialize();
      }
      
    } catch (error) {
      wx.hideLoading();
      
      log.error('onTestPayment', '支付流程失败', error);
      
      // 判断错误类型
      let errorMessage = '支付失败';
      let errorDetail = '';
      
      if (error.errMsg) {
        if (error.errMsg.includes('cancel')) {
          errorMessage = '支付已取消';
          errorDetail = '如果看到"缺少totalfee"等错误提示，可能是：\n\n1. 商户号配置问题\n2. 小程序未在微信支付商户平台关联\n3. 证书序列号配置错误\n\n请检查云函数日志查看详细错误';
        } else if (error.errMsg.includes('param')) {
          errorMessage = '支付参数错误';
          errorDetail = '请检查云函数配置和环境变量';
        } else {
          errorMessage = error.errMsg;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      wx.showModal({
        title: '❌ 支付失败',
        content: errorMessage + (errorDetail ? '\n\n' + errorDetail : '') + '\n\n请查看控制台日志获取详细信息',
        showCancel: false,
        confirmText: '知道了'
      });
    }
  },

  /**
   * 点击反馈与建议
   */
  onFeedbackTap() {
    log.info('onFeedbackTap', '跳转到反馈页面');
    wx.navigateTo({
      url: '/pages/feedback/index'
    });
  }
})
