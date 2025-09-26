// pages/profile/index.js
const { formatBirthTime, formatLunarTime, convertProfileToCardData } = require('../../utils/util');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    profileList: [],
    loading: false,
    page: 1,
    hasMore: true,
    currentProfileId: null // 当前选中的档案ID
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    console.log('档案页面加载');
    this.loadProfileList();
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
    
    // 每次显示页面时刷新数据，以防从其他页面返回时数据有更新
    this.loadProfileList();
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
      title: '我的生辰八字档案',
      path: '/pages/profile/index'
    };
  },

  /**
   * 加载档案列表
   */
  async loadProfileList() {
    if (this.data.loading) return;
    
    this.setData({ loading: true });
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'profileManagement',
        data: {
          action: 'getProfiles',
          page: 1,
          limit: 20
        }
      });

      if (result.result.success) {
        const profiles = this.formatProfileList(result.result.data.profiles);
        this.setData({
          profileList: profiles,
          page: 1,
          hasMore: result.result.data.hasMore,
          loading: false
        });
      } else {
        console.error('获取档案列表失败:', result.result.error);
        wx.showToast({
          title: '获取档案失败',
          icon: 'error',
          duration: 2000
        });
        this.setData({ loading: false });
      }
    } catch (error) {
      console.error('调用云函数失败:', error);
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
      const result = await wx.cloud.callFunction({
        name: 'profileManagement',
        data: {
          action: 'getProfiles',
          page: nextPage,
          limit: 20
        }
      });

      if (result.result.success) {
        const newProfiles = this.formatProfileList(result.result.data.profiles);
        this.setData({
          profileList: [...this.data.profileList, ...newProfiles],
          page: nextPage,
          hasMore: result.result.data.hasMore,
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
        createTimeFormatted: this.formatDateTime(profile.createTime),
        birthDate: {
          ...profile.birthDate,
          minute: profile.birthDate.minute || 0
        }
      };
    });
  },

  /**
   * 格式化日期时间
   */
  formatDateTime(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },


  /**
   * 点击档案项
   */
  onProfileTap(e) {
    const profileId = e.currentTarget.dataset.id;
    console.log('点击档案:', profileId);
    
    // 从当前档案列表中找到点击的档案数据
    const selectedProfile = this.data.profileList.find(profile => profile._id === profileId);
    if (!selectedProfile) {
      console.error('未找到档案数据:', profileId);
      wx.showToast({
        title: '档案数据异常',
        icon: 'error'
      });
      return;
    }
    
    console.log('找到档案数据:', selectedProfile);
    
    // 将完整的档案数据存储到全局数据中
    const app = getApp();
    if (!app.globalData) {
      app.globalData = {};
    }
    
    // 使用app的方法设置当前档案（这会自动处理所有相关数据）
    app.setCurrentProfile(selectedProfile);
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
    wx.navigateTo({
      url: '/pages/addProfile/index'
    });
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
        title: '档案数据异常',
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
    const profileName = this.data.profileList.find(profile => profile._id === profileId)?.profileName || '未知档案';
    
    console.log('删除档案:', profileId, profileName);
    
    // 显示确认对话框
    wx.showModal({
      title: '确认删除',
      content: `确定要删除档案"${profileName}"吗？删除后无法恢复。`,
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

      const result = await wx.cloud.callFunction({
        name: 'profileManagement',
        data: {
          action: 'deleteProfile',
          profileId: profileId
        }
      });

      wx.hideLoading();

      if (result.result.success) {
        console.log('档案删除成功:', profileId);
        
        // 从本地列表中移除已删除的档案
        const updatedProfileList = this.data.profileList.filter(profile => profile._id !== profileId);
        this.setData({
          profileList: updatedProfileList
        });
        
        // 如果删除的是当前选中的档案，清除当前选中状态
        if (this.data.currentProfileId === profileId) {
          const app = getApp();
          app.globalData.currentProfileId = null;
          this.setData({ currentProfileId: null });
        }
        
        wx.showToast({
          title: '删除成功',
          icon: 'success',
          duration: 2000
        });
      } else {
        console.error('删除档案失败:', result.result.error);
        wx.showToast({
          title: result.result.error || '删除失败',
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
