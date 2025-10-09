// pages/profile/index.js
const { formatBirthTime, formatLunarTime, convertProfileToCardData } = require('../../utils/util');
const { userManager } = require('../../utils/userManager');
const { permissionManager, USER_TYPES } = require('../../utils/permissionManager');
const { profileService, userService } = require('../../services/index');
const eventBus = require('../../utils/eventBus');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    profileList: [],
    loading: false,
    page: 1,
    hasMore: true,
    currentProfileId: null, // 当前选中的档案ID
    pendingSelectProfileId: null, // 待选中的档案ID
    
    // 用户信息和权限
    userInfo: null,
    userType: 'guest',
    userTypeName: '临时用户',
    profileQuota: 3,
    usedProfiles: 0,
    canCreateMore: true,
    upgradeHint: null,
    
    // 显示状态
    showUpgradeCard: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    console.log('档案页面加载');
    this.initializeUserInfo();
    
    // 监听档案选中事件
    eventBus.on('selectProfile', this.handleSelectProfile.bind(this));
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
    // 获取全局当前选中的档案ID
    const app = getApp();
    const currentProfileId = app.globalData?.currentProfileId || null;
    this.setData({ currentProfileId });
    console.log('档案列表页面显示，当前选中档案ID:', currentProfileId);
    
    // 检查是否有新添加的档案需要选中
    const newlyAddedProfileId = app.globalData?.newlyAddedProfileId;
    if (newlyAddedProfileId) {
      console.log('检测到新添加的档案ID:', newlyAddedProfileId);
      // 清除标记，避免重复处理
      app.globalData.newlyAddedProfileId = null;
    }
    
    // 每次显示页面时刷新数据，以防从其他页面返回时数据有更新
    this.refreshUserInfoAndProfiles();
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 处理档案选中事件
   */
  handleSelectProfile(data) {
    console.log('收到档案选中事件:', data);
    if (data && data.profileId) {
      // 设置要选中的档案ID
      this.setData({ 
        currentProfileId: data.profileId,
        pendingSelectProfileId: data.profileId 
      });
      
      // 刷新档案列表，刷新完成后会自动选中指定档案
      this.refreshUserInfoAndProfiles();
    }
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    // 清理事件监听
    eventBus.off('selectProfile', this.handleSelectProfile);
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.refreshProfileList();
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMoreProfiles();
    }
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    return {
      title: '我的牌库',
      path: '/pages/profile/index'
    };
  },

  /**
   * 初始化用户信息
   */
  async initializeUserInfo() {
    try {
      // 获取完整用户信息
      const result = await userManager.getFullUserInfo();
      if (result.success) {
        this.updateUserDisplayInfo(result.data);
      }
    } catch (error) {
      console.error('初始化用户信息失败:', error);
    }
    
    // 加载档案列表
    this.loadProfileList();
  },

  /**
   * 刷新用户信息和档案列表
   */
  async refreshUserInfoAndProfiles() {
    // 更新用户信息
    await this.updateUserInfo();
    // 加载档案列表
    this.loadProfileList();
  },

  /**
   * 更新用户信息
   */
  async updateUserInfo() {
    try {
      const result = await userManager.getFullUserInfo();
      if (result.success) {
        // 检查并更新临时用户的配额
        await this.checkAndUpdateGuestQuota(result.data);
        this.updateUserDisplayInfo(result.data);
      }
    } catch (error) {
      console.error('更新用户信息失败:', error);
    }
  },

  /**
   * 检查并更新临时用户的配额
   */
  async checkAndUpdateGuestQuota(userInfo) {
    if (userInfo.userType === 'guest' && userInfo.profileQuota === 1) {
      try {
        console.log('检测到临时用户配额为1，正在更新为3...');
        const result = await userService.callFunction('userManagement', {
          action: 'updateGuestUserQuota'
        });
        
        if (result.success) {
          console.log('临时用户配额更新成功:', result.data);
          // 更新本地用户信息
          userInfo.profileQuota = 3;
          userInfo.permissions = ['view', 'create_limited'];
        } else {
          console.error('更新临时用户配额失败:', result.error);
        }
      } catch (error) {
        console.error('调用更新配额Service失败:', error);
      }
    }
  },

  /**
   * 更新用户显示信息
   */
  updateUserDisplayInfo(userInfo) {
    if (!userInfo) return;
    
    // 设置权限管理器的用户信息
    permissionManager.setUserInfo(userInfo);
    
    // 直接使用云函数返回的数据，不再使用默认值
    const userType = userInfo.userType || 'guest';
    const userTypeName = userInfo.typeName || userInfo.displayName || permissionManager.getUserTypeName(userType);
    const profileQuota = userInfo.profileQuota || 3; // 云函数已经返回了正确的配额
    const usedProfiles = userInfo.usedProfiles || 0;
    const upgradeHint = permissionManager.getUpgradeHint();
    
    this.setData({
      userInfo,
      userType,
      userTypeName,
      profileQuota,
      usedProfiles,
      canCreateMore: profileQuota === -1 || usedProfiles < profileQuota,
      upgradeHint,
      showUpgradeCard: upgradeHint !== null && userType !== 'normal'
    });
    
    console.log('用户显示信息已更新:', {
      userType,
      userTypeName,
      profileQuota,
      usedProfiles,
      upgradeHint,
      canCreateMore: profileQuota === -1 || usedProfiles < profileQuota
    });
  },

  /**
   * 加载档案列表
   */
  async loadProfileList() {
    if (this.data.loading) return;
    
    this.setData({ loading: true });
    
    try {
      const result = await profileService.getProfiles({
        page: 1,
        limit: 20
      });

      if (result.success) {
        // 使用ProfileManager管理档案数据
        const app = getApp();
        app.globalData.profileManager.initialize(result.data.profiles);
        
        // 获取ProfileBean实例列表
        const profileBeans = app.globalData.profileManager.getProfileList();
        
        this.setData({
          profileList: profileBeans,
          page: 1,
          hasMore: result.data.hasMore,
          loading: false
        });
        
        // 加载完成后检查并设置默认选中
        this.checkAndSetDefaultSelection(profileBeans);
      } else {
        console.error('获取档案列表失败:', result.error);
        wx.showToast({
          title: '获取牌库失败',
          icon: 'error',
          duration: 2000
        });
        this.setData({ loading: false });
      }
    } catch (error) {
      console.error('调用ProfileService失败:', error);
      wx.showToast({
        title: '网络错误',
        icon: 'error',
        duration: 2000
      });
      this.setData({ loading: false });
    }
  },

  /**
   * 刷新档案列表
   */
  async refreshProfileList() {
    try {
      await this.loadProfileList();
      wx.stopPullDownRefresh();
      wx.showToast({
        title: '刷新成功',
        icon: 'success',
        duration: 1000
      });
    } catch (error) {
      wx.stopPullDownRefresh();
      wx.showToast({
        title: '刷新失败',
        icon: 'error',
        duration: 2000
      });
    }
  },

  /**
   * 加载更多档案
   */
  async loadMoreProfiles() {
    if (this.data.loading || !this.data.hasMore) return;
    
    this.setData({ loading: true });
    const nextPage = this.data.page + 1;
    
    try {
      const result = await profileService.getProfiles({
        page: nextPage,
        limit: 20
      });

      if (result.success) {
        const newProfiles = this.formatProfileList(result.data.profiles);
        this.setData({
          profileList: [...this.data.profileList, ...newProfiles],
          page: nextPage,
          hasMore: result.data.hasMore,
          loading: false
        });
      } else {
        this.setData({ loading: false });
      }
    } catch (error) {
      console.error('加载更多档案失败:', error);
      this.setData({ loading: false });
    }
  },

  /**
   * 格式化档案列表数据
   */
  formatProfileList(profiles) {
    return profiles.map(profile => {
      return {
        ...profile,
        birthDate: {
          ...profile.birthDate,
          minute: profile.birthDate.minute || 0
        }
      };
    });
  },

  /**
   * 检查并设置默认选中
   */
  checkAndSetDefaultSelection(profiles) {
    if (!profiles || profiles.length === 0) {
      // 如果没有档案，清除当前选中
      this.clearCurrentSelection();
      return;
    }

    const app = getApp();
    const currentProfileId = this.data.currentProfileId;
    const newlyAddedProfileId = app.globalData?.newlyAddedProfileId;
    const pendingSelectProfileId = this.data.pendingSelectProfileId;
    
    // 优先处理待选中的档案（从其他页面传递过来的）
    if (pendingSelectProfileId) {
      const pendingProfile = profiles.find(profile => profile._id === pendingSelectProfileId);
      if (pendingProfile) {
        console.log('选中待选中的档案:', pendingProfile.profileName);
        app.setCurrentProfile(pendingProfile);
        this.setData({ 
          currentProfileId: pendingProfile._id,
          pendingSelectProfileId: null // 清除待选中标记
        });
        return;
      } else {
        // 如果待选中的档案不存在，清除标记
        this.setData({ pendingSelectProfileId: null });
      }
    }
    
    // 处理新添加的档案
    if (newlyAddedProfileId) {
      const newProfile = profiles.find(profile => profile._id === newlyAddedProfileId);
      if (newProfile) {
        console.log('选中新添加的档案:', newProfile.profileName);
        app.setCurrentProfile(newProfile);
        this.setData({ currentProfileId: newProfile._id });
        // 清除新添加档案的标记
        app.globalData.newlyAddedProfileId = null;
        return;
      }
    }
    
    // 检查当前选中的档案是否还存在于列表中
    const currentProfileExists = currentProfileId && profiles.some(profile => profile._id === currentProfileId);
    
    if (!currentProfileExists) {
      // 如果当前选中的档案不存在，自动选中第一个档案
      this.autoSelectFirstProfile(profiles);
    }
  },

  /**
   * 自动选中第一个档案
   */
  autoSelectFirstProfile(profiles) {
    if (!profiles || profiles.length === 0) {
      this.clearCurrentSelection();
      return;
    }

    const firstProfile = profiles[0];
    console.log('自动选中第一个档案:', firstProfile._id, firstProfile.profileName);
    
    // 设置到全局数据
    const app = getApp();
    app.setCurrentProfile(firstProfile);
    
    // 更新本地状态
    this.setData({ currentProfileId: firstProfile._id });
  },

  /**
   * 清除当前选中状态
   */
  clearCurrentSelection() {
    console.log('清除当前选中状态');
    const app = getApp();
    if (app.globalData) {
      app.globalData.currentProfileId = null;
      app.globalData.currentProfile = null;
    }
    this.setData({ currentProfileId: null });
  },

  /**
   * 处理删除当前选中档案后的选中逻辑
   */
  handleDeletedCurrentProfile(updatedProfileList) {
    if (updatedProfileList.length > 0) {
      // 如果还有其他档案，自动选中第一个
      this.autoSelectFirstProfile(updatedProfileList);
      console.log('删除当前选中档案后，自动选中第一个档案');
    } else {
      // 如果没有档案了，清除选中状态
      this.clearCurrentSelection();
      console.log('删除最后一个档案，清除选中状态');
    }
  },


  /**
   * 点击档案项
   */
  onProfileTap(e) {
    const profileId = e.currentTarget.dataset.id;
    console.log('点击档案:', profileId);
    
    // 使用ProfileManager获取档案
    const app = getApp();
    const selectedProfile = app.globalData.profileManager.getProfileById(profileId);
    
    if (!selectedProfile) {
      console.error('未找到档案数据:', profileId);
      wx.showToast({
        title: '牌库数据异常',
        icon: 'error'
      });
      return;
    }
    
    console.log('找到档案数据:', selectedProfile);
    
    // 设置当前档案
    app.globalData.profileManager.setCurrentProfile(selectedProfile);
    this.setData({ currentProfileId: selectedProfile._id });
    console.log('已设置全局当前档案ID:', selectedProfile._id);
    
    // 跳转到卡牌页面显示档案的八字卡牌
    wx.switchTab({
      url: '/pages/card/index',
      success: () => {
        console.log('成功跳转到卡牌页面');
      },
      fail: (error) => {
        console.error('跳转失败:', error);
      }
    });
  },

  /**
   * 添加新档案
   */
  onAddProfile() {
    // 检查是否可以创建更多档案
    if (!this.data.canCreateMore) {
      this.showQuotaExceededDialog();
      return;
    }
    
    wx.navigateTo({
      url: '/pages/addProfile/index'
    });
  },

  /**
   * 显示配额超限对话框
   */
  showQuotaExceededDialog() {
    const { userType, profileQuota, upgradeHint } = this.data;
    
    let content = `牌库数量已达上限（${profileQuota}个）`;
    let confirmText = '我知道了';
    
    if (upgradeHint) {
      content += `\n${upgradeHint.action}可${upgradeHint.benefits.join('、')}`;
      confirmText = upgradeHint.action;
    }
    
    wx.showModal({
      title: '牌库数量限制',
      content,
      confirmText,
      cancelText: '取消',
      success: (res) => {
        if (res.confirm && upgradeHint) {
          this.handleUpgradeAction();
        }
      }
    });
  },

  /**
   * 处理升级操作
   */
  handleUpgradeAction() {
    const { userType } = this.data;
    
    if (userType === USER_TYPES.GUEST) {
      // 临时用户跳转到注册页面
      wx.navigateTo({
        url: '/pages/register/index?source=profile_limit&returnUrl=' + encodeURIComponent('/pages/profile/index')
      });
    } else if (userType === USER_TYPES.NORMAL) {
      // 普通用户显示高级版介绍
      this.showPremiumInfo();
    }
  },

  /**
   * 显示高级版信息
   */
  showPremiumInfo() {
    wx.showModal({
      title: '升级高级版',
      content: '高级版功能：\n• 无限牌库创建\n• 高级智慧分析\n• 专属客服支持\n• 数据云端备份',
      confirmText: '了解详情',
      cancelText: '暂不升级',
      success: (res) => {
        if (res.confirm) {
          // TODO: 跳转到高级版购买页面
          wx.showToast({
            title: '功能开发中',
            icon: 'none'
          });
        }
      }
    });
  },

  /**
   * 升级卡片点击处理
   */
  onUpgradeCardTap() {
    this.handleUpgradeAction();
  },

  /**
   * 关闭升级卡片
   */
  onCloseUpgradeCard() {
    this.setData({ showUpgradeCard: false });
  },

  /**
   * 编辑档案
   */
  onEditProfile(e) {
    const profileId = e.currentTarget.dataset.id;
    console.log('编辑档案:', profileId);
    
    // 从当前档案列表中找到要编辑的档案数据
    const profileToEdit = this.data.profileList.find(profile => profile._id === profileId);
    if (!profileToEdit) {
      console.error('未找到要编辑的档案数据:', profileId);
      wx.showToast({
        title: '牌库数据异常',
        icon: 'error'
      });
      return;
    }
    
    // 将档案数据存储到本地存储，供编辑页面使用
    try {
      wx.setStorageSync('editingProfile', profileToEdit);
      console.log('档案数据已存储到本地，准备跳转到编辑页面');
      
      wx.navigateTo({
        url: '/pages/addProfile/index?mode=edit',
        success: () => {
          console.log('成功跳转到编辑页面');
        },
        fail: (error) => {
          console.error('跳转到编辑页面失败:', error);
          wx.showToast({
            title: '跳转失败',
            icon: 'error'
          });
        }
      });
    } catch (error) {
      console.error('存储档案数据失败:', error);
      wx.showToast({
        title: '数据存储失败',
        icon: 'error'
      });
    }
  },

  /**
   * 删除档案
   */
  onDeleteProfile(e) {
    const profileId = e.currentTarget.dataset.id;
    const profileName = this.data.profileList.find(profile => profile._id === profileId)?.profileName || '未知牌库';
    
    console.log('删除档案:', profileId, profileName);
    
    // 显示确认对话框
    wx.showModal({
      title: '确认删除',
      content: `确定要删除牌库"${profileName}"吗？删除后无法恢复。`,
      confirmText: '删除',
      confirmColor: '#d32f2f',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.deleteProfile(profileId);
        }
      }
    });
  },

  /**
   * 执行删除档案操作
   */
  async deleteProfile(profileId) {
    try {
      wx.showLoading({
        title: '删除中...',
        mask: true
      });

      const result = await profileService.deleteProfile(profileId);

      wx.hideLoading();

      if (result.success) {
        console.log('档案删除成功:', profileId);
        
        // 从本地列表中移除已删除的档案
        const updatedProfileList = this.data.profileList.filter(profile => profile._id !== profileId);
        this.setData({
          profileList: updatedProfileList
        });
        
        // 如果删除的是当前选中的档案，需要重新选中
        if (this.data.currentProfileId === profileId) {
          this.handleDeletedCurrentProfile(updatedProfileList);
        }
        
        wx.showToast({
          title: '删除成功',
          icon: 'success',
          duration: 2000
        });
      } else {
        console.error('删除档案失败:', result.error);
        wx.showToast({
          title: result.error || '删除失败',
          icon: 'error',
          duration: 2000
        });
      }
    } catch (error) {
      console.error('删除档案过程中出现错误:', error);
      wx.hideLoading();
      wx.showToast({
        title: '删除失败，请重试',
        icon: 'error',
        duration: 2000
      });
    }
  }
})
