// pages/register/index.js
const { userManager } = require('../../utils/userManager');
const { permissionManager, USER_TYPES } = require('../../utils/permissionManager');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 用户信息
    userInfo: {
      nickName: '',
      avatarUrl: '',
      gender: 0, // 0:保密, 1:男, 2:女
      phoneNumber: ''
    },
    
    // 表单状态
    formValid: false,
    agreeTerms: false,
    loading: false,
    
    // 临时文件路径（用于上传）
    tempAvatarPath: '',
    
    // 原始用户数据（用于变更检测）
    originalUserInfo: null,
    
    // 性别选项
    genderOptions: [
      { label: '保密', value: 0 },
      { label: '男', value: 1 },
      { label: '女', value: 2 }
    ],
    
    // 来源参数
    source: '', // 来源页面或功能
    returnUrl: '' // 注册成功后跳转的页面
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    console.log('注册页面加载，参数:', options);
    
    // 保存来源信息
    this.setData({
      source: options.source || '',
      returnUrl: options.returnUrl || ''
    });
    
    // 根据来源设置页面标题
    if (options.source === 'edit') {
      wx.setNavigationBarTitle({
        title: '编辑资料'
      });
    }
    
    // 尝试获取用户已有信息
    this.loadExistingUserInfo();
  },

  /**
   * 加载用户已有信息
   */
  async loadExistingUserInfo() {
    try {
      const currentUser = userManager.getCurrentUser();
      if (currentUser) {
        const userInfo = {
          nickName: currentUser.nickName || '',
          avatarUrl: currentUser.avatarUrl || '',
          gender: currentUser.gender || 0,
          phoneNumber: currentUser.phoneNumber || ''
        };
        
        this.setData({
          userInfo: userInfo,
          originalUserInfo: JSON.parse(JSON.stringify(userInfo)) // 深拷贝保存原始数据
        });
        this.validateForm();
      }
    } catch (error) {
      console.error('加载用户信息失败:', error);
    }
  },

  /**
   * 选择头像回调
   */
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    console.log('用户选择的头像:', avatarUrl);
    
    // 保存临时文件路径，在保存时再上传
    this.setData({
      tempAvatarPath: avatarUrl,
      'userInfo.avatarUrl': avatarUrl // 先显示本地预览
    });
    
    this.validateForm();
  },

  /**
   * 昵称输入处理
   */
  onNickNameInput(e) {
    this.setData({
      'userInfo.nickName': e.detail.value
    });
    this.validateForm();
  },

  /**
   * 性别选择处理
   */
  onGenderChange(e) {
    this.setData({
      'userInfo.gender': parseInt(e.detail.value)
    });
    this.validateForm();
  },

  /**
   * 手机号输入处理
   */
  onPhoneNumberInput(e) {
    this.setData({
      'userInfo.phoneNumber': e.detail.value
    });
    this.validateForm();
  },


  /**
   * 用户协议同意状态切换
   */
  onAgreeTermsChange(e) {
    this.setData({
      agreeTerms: e.detail.value
    });
    this.validateForm();
  },

  /**
   * 表单验证
   */
  validateForm() {
    const { userInfo, agreeTerms } = this.data;
    const isNickNameValid = userInfo.nickName.trim().length > 0;
    const isPhoneValid = this.validatePhoneNumber(userInfo.phoneNumber);
    const isValid = isNickNameValid && isPhoneValid && agreeTerms;
    
    this.setData({ formValid: isValid });
  },

  /**
   * 验证手机号格式
   */
  validatePhoneNumber(phoneNumber) {
    if (!phoneNumber || phoneNumber.trim() === '') {
      return true; // 手机号不是必填项
    }
    
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phoneNumber);
  },

  /**
   * 查看用户协议
   */
  onViewTerms() {
    // 跳转到用户协议页面
    wx.navigateTo({
      url: '/pages/agreement/index'
    });
  },

  /**
   * 检测用户数据是否有变更
   */
  hasUserDataChanged() {
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
  },

  /**
   * 删除云存储中的旧头像
   */
  async deleteOldAvatar(oldAvatarUrl) {
    if (!oldAvatarUrl || !oldAvatarUrl.startsWith('cloud://')) {
      // 如果不是云存储URL，直接返回
      return;
    }
    
    try {
      console.log('删除旧头像:', oldAvatarUrl);
      await wx.cloud.deleteFile({
        fileList: [oldAvatarUrl]
      });
      console.log('旧头像删除成功');
    } catch (error) {
      console.error('删除旧头像失败:', error);
      // 删除失败不影响主流程，只记录错误
    }
  },

  /**
   * 提交注册
   */
  async onSubmitRegister() {
    if (!this.data.formValid) {
      wx.showToast({
        title: '请完善信息',
        icon: 'error'
      });
      return;
    }

    // 检查是否有数据变更
    if (!this.hasUserDataChanged()) {
      wx.showToast({
        title: '没有数据变更',
        icon: 'none',
        duration: 1500
      });
      return;
    }

    try {
      this.setData({ loading: true });
      
      // 准备注册数据
      const { userInfo, source, tempAvatarPath, originalUserInfo } = this.data;
      let finalAvatarUrl = userInfo.avatarUrl || '';
      let oldAvatarUrl = originalUserInfo ? originalUserInfo.avatarUrl : '';
      
      // 如果有临时头像文件，先上传到云存储
      if (tempAvatarPath) {
        try {
          wx.showLoading({
            title: '上传头像中...',
            mask: true
          });
          
          // 从当前用户信息中获取openid
          const currentUser = userManager.getCurrentUser();
          if (!currentUser || !currentUser.openid) {
            throw new Error('无法获取用户身份信息');
          }
          
          // 使用openid-时间戳格式作为文件名，避免覆盖问题
          const cloudPath = `avatars/${currentUser.openid}-${Date.now()}.jpg`;
          
          const uploadResult = await wx.cloud.uploadFile({
            cloudPath: cloudPath,
            filePath: tempAvatarPath
          });
          
          console.log('头像上传成功:', uploadResult);
          finalAvatarUrl = uploadResult.fileID;
          
          wx.hideLoading();
        } catch (uploadError) {
          console.error('头像上传失败:', uploadError);
          wx.hideLoading();
          this.setData({ loading: false });
          wx.showToast({
            title: '头像上传失败',
            icon: 'error',
            duration: 2000
          });
          return;
        }
      }
      
      const registrationData = {
        nickName: userInfo.nickName.trim(),
        gender: userInfo.gender,
        avatarUrl: finalAvatarUrl,
        phoneNumber: userInfo.phoneNumber.trim() || ''
      };
      
      console.log('提交注册数据:', registrationData);
      
      let result;
      if (source === 'edit') {
        // 编辑模式：更新用户信息
        result = await userManager.updateUserInfo(registrationData);
      } else {
        // 注册模式：升级用户类型为普通用户
        result = await userManager.upgradeUserType(USER_TYPES.NORMAL, registrationData);
      }
      
      this.setData({ loading: false });
      
      if (result.success) {
        // 如果头像有变更且上传成功，删除旧头像
        if (tempAvatarPath && oldAvatarUrl && oldAvatarUrl !== finalAvatarUrl) {
          // 异步删除旧头像，不阻塞主流程
          this.deleteOldAvatar(oldAvatarUrl);
        }
        
        // 更新原始数据和用户信息，避免重复保存
        this.setData({
          'userInfo.avatarUrl': finalAvatarUrl, // 更新为云存储URL
          originalUserInfo: JSON.parse(JSON.stringify(registrationData)),
          tempAvatarPath: '' // 清空临时文件路径
        });
        
        wx.showToast({
          title: source === 'edit' ? '更新成功！' : '注册成功！',
          icon: 'success',
          duration: 2000
        });
        
        // 延迟跳转，让用户看到成功提示
        setTimeout(() => {
          this.handleRegistrationSuccess();
        }, 2000);
      } else {
        console.error('操作失败:', result);
        wx.showToast({
          title: result.error || (source === 'edit' ? '更新失败' : '注册失败'),
          icon: 'error',
          duration: 3000
        });
      }
    } catch (error) {
      console.error('操作过程出错:', error);
      this.setData({ loading: false });
      wx.showToast({
        title: this.data.source === 'edit' ? '更新失败，请重试' : '注册失败，请重试',
        icon: 'error'
      });
    }
  },

  /**
   * 处理注册成功后的跳转
   */
  handleRegistrationSuccess() {
    const { returnUrl, source } = this.data;
    
    if (returnUrl) {
      // 如果有指定返回页面，跳转到指定页面
      wx.navigateTo({
        url: returnUrl,
        fail: () => {
          // 如果跳转失败，跳转到我的页面
          wx.switchTab({
            url: '/pages/mine/index'
          });
        }
      });
    } else {
      // 默认跳转到我的页面（注册和编辑都跳转到我的页面）
      wx.switchTab({
        url: '/pages/mine/index'
      });
    }
  },

  /**
   * 跳过注册（继续使用临时账户）
   */
  onSkipRegister() {
    wx.showModal({
      title: '确认跳过注册？',
      content: '跳过注册将继续使用临时账户，功能受限。建议完成注册以获得完整体验。',
      confirmText: '跳过',
      cancelText: '继续注册',
      success: (res) => {
        if (res.confirm) {
          // 用户确认跳过，返回上一页或首页
          if (getCurrentPages().length > 1) {
            wx.navigateBack();
          } else {
            wx.switchTab({
              url: '/pages/profile/index'
            });
          }
        }
      }
    });
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    return {
      title: '生命智慧卡牌 - 智慧分析',
      path: '/pages/profile/index'
    };
  }
})
