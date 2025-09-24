// pages/profile/index.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    profileList: [],
    loading: false,
    page: 1,
    hasMore: true
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
   * 格式化生日时间（用于卡牌页面）
   */
  formatBirthTimeForCard(birthDate) {
    const minute = birthDate.minute || 0;
    const minuteStr = minute < 10 ? `0${minute}` : `${minute}`;
    return `${birthDate.year}年${birthDate.month}月${birthDate.day}日 ${birthDate.hour}:${minuteStr}`;
  },

  /**
   * 格式化农历时间（用于卡牌页面）
   */
  formatLunarTimeForCard(lunarDate) {
    return `农历${lunarDate.year}年${lunarDate.month}月${lunarDate.day}日${lunarDate.isLeap ? '(闰月)' : ''}`;
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
    
    // 构建卡牌页面需要的完整数据结构
    app.globalData.cardData = {
      profileId: selectedProfile._id,
      profileName: selectedProfile.profileName,
      originalTime: this.formatBirthTimeForCard(selectedProfile.birthDate),
      lunarTime: selectedProfile.baziData.lunarDate ? this.formatLunarTimeForCard(selectedProfile.baziData.lunarDate) : '',
      baziData: {
        yearPillar: {
          heavenlyStem: selectedProfile.baziData.year.gan,
          earthlyBranch: selectedProfile.baziData.year.zhi
        },
        monthPillar: {
          heavenlyStem: selectedProfile.baziData.month.gan,
          earthlyBranch: selectedProfile.baziData.month.zhi
        },
        dayPillar: {
          heavenlyStem: selectedProfile.baziData.day.gan,
          earthlyBranch: selectedProfile.baziData.day.zhi
        },
        timePillar: {
          heavenlyStem: selectedProfile.baziData.hour.gan,
          earthlyBranch: selectedProfile.baziData.hour.zhi
        }
      }
    };
    
    console.log('已设置全局卡牌数据:', app.globalData.cardData);
    
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
      url: '/pages/dateQuery/index'
    });
  }
})
