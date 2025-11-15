/**
 * RegisterController - 注册页面控制器
 * 
 * 负责用户注册和编辑资料页面的业务逻辑，包括：
 * - 加载用户信息
 * - 表单验证
 * - 头像上传
 * - 用户信息提交（注册/更新）
 * - 注册成功后的导航
 */

const { BaseController } = require('./BaseController');
const { userService } = require('../services/UserService');
const { permissionManager, USER_TYPES } = require('../utils/manager/permissionManager');

class RegisterController extends BaseController {
  constructor(page) {
    super(page);
    
    // 性别选项
    this.genderOptions = [
      { label: '保密', value: 0 },
      { label: '男', value: 1 },
      { label: '女', value: 2 }
    ];
  }

  /**
   * 初始化页面
   * @param {Object} options - 页面参数
   */
  async initialize(options = {}) {
    this._log('initialize', '初始化，参数:', options);
    
    // 保存来源信息
    this._setData({
      source: options.source || '',
      returnUrl: options.returnUrl || '',
      genderOptions: this.genderOptions
    });
    
    // 根据来源设置页面标题
    if (options.source === 'edit') {
      wx.setNavigationBarTitle({
        title: '编辑资料'
      });
    }
    
    // 加载用户信息
    await this.loadUserInfo();
  }

  /**
   * 加载用户已有信息
   */
  async loadUserInfo() {
    try {
      const app = getApp();
      const globalUserManager = app.globalData.globalUserManager;
      
      // 使用 globalUserManager 获取用户信息
      const currentUser = globalUserManager.getCachedUserInfo();
      
      // 如果缓存中没有，尝试等待初始化完成
      if (!currentUser) {
        this._log('loadUserInfo', '缓存中无用户信息，等待初始化');
        const result = await globalUserManager.getUserInfo();
        if (result.success && result.data) {
          this._loadUserInfoData(result.data);
        }
      } else {
        this._loadUserInfoData(currentUser);
      }
    } catch (error) {
      this._error('loadUserInfo', '加载用户信息失败:', error);
      this._handleError(error, '加载用户信息');
    }
  }
  
  /**
   * 加载用户信息数据到页面
   * @param {Object} currentUser - 用户信息
   */
  _loadUserInfoData(currentUser) {
    if (currentUser) {
      const userInfo = {
        nickName: currentUser.nickName || '',
        avatarUrl: currentUser.avatarUrl || '',
        gender: currentUser.gender || 0,
        phoneNumber: currentUser.phoneNumber || ''
      };
      
      this._setData({
        userInfo: userInfo,
        originalUserInfo: JSON.parse(JSON.stringify(userInfo)) // 深拷贝保存原始数据
      });
      
      this.validateForm();
    }
  }

  /**
   * 选择头像
   * @param {Object} e - 事件对象
   */
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    this._log('onChooseAvatar', '用户选择的头像:', avatarUrl);
    
    // 保存临时文件路径，在保存时再上传
    this._setData({
      tempAvatarPath: avatarUrl,
      'userInfo.avatarUrl': avatarUrl // 先显示本地预览
    });
    
    this.validateForm();
  }

  /**
   * 昵称输入
   * @param {Object} e - 事件对象
   */
  onNickNameInput(e) {
    this._setData({
      'userInfo.nickName': e.detail.value
    });
    this.validateForm();
  }

  /**
   * 性别选择
   * @param {Object} e - 事件对象
   */
  onGenderChange(e) {
    this._setData({
      'userInfo.gender': parseInt(e.detail.value)
    });
    this.validateForm();
  }

  /**
   * 手机号输入
   * @param {Object} e - 事件对象
   */
  onPhoneNumberInput(e) {
    this._setData({
      'userInfo.phoneNumber': e.detail.value
    });
    this.validateForm();
  }

  /**
   * 用户协议同意状态切换
   * @param {Object} e - 事件对象
   */
  onAgreeTermsChange(e) {
    // e.detail.value 是一个数组，需要检查是否包含 'agree'
    const isAgreed = e.detail.value.includes('agree');
    this._setData({
      agreeTerms: isAgreed
    });
    this.validateForm();
  }

  /**
   * 表单验证
   */
  validateForm() {
    const { userInfo, agreeTerms } = this.data;
    const isNickNameValid = userInfo.nickName.trim().length > 0;
    const isPhoneValid = this._validatePhoneNumber(userInfo.phoneNumber);
    const isValid = isNickNameValid && isPhoneValid && agreeTerms;
    
    this._setData({ formValid: isValid });
  }

  /**
   * 验证手机号格式
   * @param {string} phoneNumber - 手机号
   * @returns {boolean} 是否有效
   */
  _validatePhoneNumber(phoneNumber) {
    if (!phoneNumber || phoneNumber.trim() === '') {
      return true; // 手机号不是必填项
    }
    
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phoneNumber);
  }

  /**
   * 查看用户协议
   */
  onViewTerms() {
    this._navigateTo('/pages/agreement/index');
  }

  /**
   * 检测用户数据是否有变更
   * @returns {boolean} 是否有变更
   */
  _hasUserDataChanged() {
    const { userInfo, originalUserInfo, tempAvatarPath } = this.data;
    
    if (!originalUserInfo) {
      // 如果没有原始数据，说明是新建用户，认为有变更
      return true;
    }
    
    // 检查基本信息是否变更
    const basicInfoChanged = 
      userInfo.nickName !== originalUserInfo.nickName ||
      userInfo.gender !== originalUserInfo.gender ||
      userInfo.phoneNumber !== originalUserInfo.phoneNumber;
    
    // 检查头像是否变更（有新选择的头像或头像URL不同）
    const avatarChanged = tempAvatarPath || userInfo.avatarUrl !== originalUserInfo.avatarUrl;
    
    return basicInfoChanged || avatarChanged;
  }

  /**
   * 上传头像到云存储
   * @param {string} tempFilePath - 临时文件路径
   * @returns {Promise<string>} 云存储文件ID
   */
  async _uploadAvatar(tempFilePath) {
    this._log('_uploadAvatar', '上传头像:', tempFilePath);
    
    this._showLoading('上传头像中...', true);
    
    try {
      const app = getApp();
      const globalUserManager = app.globalData.globalUserManager;
      
      // 从 globalUserManager 获取用户信息
      let currentUser = globalUserManager.getCachedUserInfo();
      this._log('_uploadAvatar', '当前用户信息:', currentUser);
      
      // 如果缓存中没有，尝试获取
      if (!currentUser) {
        this._log('_uploadAvatar', '缓存中无用户信息，重新获取');
        const result = await globalUserManager.getUserInfo();
        if (result.success && result.data) {
          currentUser = result.data;
          this._log('_uploadAvatar', '重新获取的用户信息:', currentUser);
        }
      }
      
      if (!currentUser || !currentUser.openid) {
        this._error('_uploadAvatar', '用户信息无效', { currentUser });
        throw new Error('无法获取用户身份信息');
      }
      
      // 使用openid-时间戳格式作为文件名，避免覆盖问题
      const cloudPath = `avatars/${currentUser.openid}-${Date.now()}.jpg`;
      this._log('_uploadAvatar', '准备上传到云路径:', cloudPath);
      
      // 检查文件路径是否有效
      if (!tempFilePath) {
        this._error('_uploadAvatar', '临时文件路径为空');
        throw new Error('临时文件路径无效');
      }
      
      const uploadParams = {
        cloudPath: cloudPath,
        filePath: tempFilePath
      };
      this._log('_uploadAvatar', '上传参数:', uploadParams);
      
      const uploadResult = await wx.cloud.uploadFile(uploadParams);
      
      this._log('_uploadAvatar', '头像上传成功，完整结果:', uploadResult);
      this._hideLoading();
      
      if (!uploadResult.fileID) {
        this._error('_uploadAvatar', '上传成功但未返回fileID:', uploadResult);
        throw new Error('头像上传失败：未获取到文件ID');
      }
      
      return uploadResult.fileID;
    } catch (error) {
      this._error('_uploadAvatar', '头像上传失败，错误类型:', typeof error);
      this._error('_uploadAvatar', '错误对象:', error);
      this._error('_uploadAvatar', '错误消息:', error.message);
      this._error('_uploadAvatar', '错误代码:', error.errCode || error.code);
      this._error('_uploadAvatar', '错误详情:', error.errMsg || error.message);
      this._error('_uploadAvatar', '完整错误对象JSON:', JSON.stringify(error));
      
      this._hideLoading();
      
      // 构造更详细的错误消息
      const errorMsg = error.errMsg || error.message || '头像上传失败';
      throw new Error(errorMsg);
    }
  }

  /**
   * 删除云存储中的旧头像
   * @param {string} oldAvatarUrl - 旧头像URL
   */
  async _deleteOldAvatar(oldAvatarUrl) {
    if (!oldAvatarUrl || !oldAvatarUrl.startsWith('cloud://')) {
      // 如果不是云存储URL，直接返回
      return;
    }
    
    try {
      this._log('_deleteOldAvatar', '删除旧头像:', oldAvatarUrl);
      await wx.cloud.deleteFile({
        fileList: [oldAvatarUrl]
      });
      this._log('_deleteOldAvatar', '旧头像删除成功');
    } catch (error) {
      this._error('_deleteOldAvatar', '删除旧头像失败:', error);
      // 删除失败不影响主流程，只记录错误
    }
  }

  /**
   * 提交注册
   */
  async submitRegister() {
    this._log('submitRegister', '提交注册');
    
    // 表单验证
    if (!this.data.formValid) {
      this._showError('请完善信息');
      return;
    }

    // 检查是否有数据变更
    if (!this._hasUserDataChanged()) {
      this._showMessage('没有数据变更', 1500);
      return;
    }

    try {
      this._setData({ loading: true });
      
      const { userInfo, source, tempAvatarPath, originalUserInfo } = this.data;
      let finalAvatarUrl = userInfo.avatarUrl || '';
      let oldAvatarUrl = originalUserInfo ? originalUserInfo.avatarUrl : '';
      
      // 如果有临时头像文件，先上传到云存储
      if (tempAvatarPath) {
        try {
          finalAvatarUrl = await this._uploadAvatar(tempAvatarPath);
        } catch (uploadError) {
          this._setData({ loading: false });
          this._showError(uploadError.message || '头像上传失败');
          return;
        }
      }
      
      // 准备注册数据
      const registrationData = {
        nickName: userInfo.nickName.trim(),
        gender: userInfo.gender,
        avatarUrl: finalAvatarUrl,
        phoneNumber: userInfo.phoneNumber.trim() || ''
      };
      
      this._log('submitRegister', '提交数据:', registrationData);
      
      // 根据source判断是注册还是编辑
      let result;
      if (source === 'edit') {
        // 编辑模式：更新用户信息
        result = await userService.updateUserInfo(registrationData);
      } else {
        // 注册模式：升级用户类型为普通用户
        result = await userService.upgradeUserType(USER_TYPES.NORMAL, registrationData);
      }
      
      // 如果操作成功，刷新 globalUserManager 的用户信息
      if (result.success) {
        const app = getApp();
        await app.globalData.globalUserManager.refreshUserInfo();
      }
      
      this._setData({ loading: false });
      
      if (result.success) {
        // 如果头像有变更且上传成功，删除旧头像
        if (tempAvatarPath && oldAvatarUrl && oldAvatarUrl !== finalAvatarUrl) {
          // 异步删除旧头像，不阻塞主流程
          this._deleteOldAvatar(oldAvatarUrl);
        }
        
        // 更新原始数据和用户信息，避免重复保存
        this._setData({
          'userInfo.avatarUrl': finalAvatarUrl, // 更新为云存储URL
          originalUserInfo: JSON.parse(JSON.stringify(registrationData)),
          tempAvatarPath: '' // 清空临时文件路径
        });
        
        const successMessage = source === 'edit' ? '更新成功！' : '注册成功！';
        this._showSuccess(successMessage, 2000);
        
        // 延迟跳转，让用户看到成功提示
        setTimeout(() => {
          this._handleRegistrationSuccess();
        }, 2000);
      } else {
        this._error('submitRegister', '操作失败:', result);
        const errorMessage = result.error || (source === 'edit' ? '更新失败' : '注册失败');
        this._showError(errorMessage, 3000);
      }
    } catch (error) {
      this._error('submitRegister', '操作过程出错:', error);
      this._setData({ loading: false });
      const errorMessage = this.data.source === 'edit' ? '更新失败，请重试' : '注册失败，请重试';
      this._handleError(error, errorMessage);
    }
  }

  /**
   * 处理注册成功后的跳转
   */
  _handleRegistrationSuccess() {
    const { returnUrl } = this.data;
    
    // TabBar 页面列表
    const tabBarPages = [
      '/pages/profile/index',
      '/pages/card/index',
      '/pages/mine/index'
    ];
    
    if (returnUrl) {
      // 判断是否是 TabBar 页面
      const isTabBarPage = tabBarPages.includes(returnUrl);
      
      if (isTabBarPage) {
        // TabBar 页面使用 switchTab
        this._switchTab(returnUrl);
      } else {
        // 普通页面使用 navigateTo
        wx.navigateTo({
          url: returnUrl,
          fail: () => {
            // 如果跳转失败，降级到我的页面
            this._log('_handleRegistrationSuccess', 'navigateTo 失败，降级到 switchTab');
            this._switchTab('/pages/mine/index');
          }
        });
      }
    } else {
      // 默认跳转到我的页面
      this._switchTab('/pages/mine/index');
    }
  }

  /**
   * 跳过注册
   */
  async skipRegister() {
    const confirmed = await this._confirm(
      '确认跳过注册？',
      '跳过注册将继续使用临时账户，功能受限。建议完成注册以获得完整体验。',
      '跳过',
      '继续注册'
    );
    
    if (confirmed) {
      // 用户确认跳过，返回上一页或首页
      const pages = getCurrentPages();
      if (pages.length > 1) {
        this._navigateBack();
      } else {
        this._switchTab('/pages/profile/index');
      }
    }
  }
}

module.exports = { RegisterController };

