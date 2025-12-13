const { createModuleLogger } = require('../../utils/logger/index');
const logger = createModuleLogger('DailyInsightPage');

Page({
  data: {
    // 日期信息
    dateInfo: {
      year: '',
      month: '',
      day: '',
      weekday: '',
      lunar: ''
    },
    // 每日一句
    dailyQuote: {
      content: '人生如逆旅，我亦是行人。',
      author: '苏轼',
      interpretation: '生命就像一场旅行，我们都是这旅途中的过客。无论遇到什么困难和挫折，都只是旅程中的一段经历。保持平和的心态，珍惜当下的每一刻，因为所有的相遇和别离都是人生必经的风景。'
    },
    // 是否已收藏
    isCollected: false,
    // 刷新loading
    isRefreshing: false
  },

  onLoad(options) {
    logger.info('onLoad', '页面加载');
    this.initPageData();
  },

  onShow() {
    logger.info('onShow', '页面显示');
  },

  /**
   * 初始化页面数据
   */
  initPageData() {
    // 设置日期信息
    this.setDateInfo();
    
    // 加载每日一句（后续可以从云端获取）
    this.loadDailyQuote();
    
    // 检查是否已收藏
    this.checkCollectionStatus();
  },

  /**
   * 设置日期信息
   */
  setDateInfo() {
    const now = new Date();
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    
    this.setData({
      dateInfo: {
        year: now.getFullYear(),
        month: String(now.getMonth() + 1).padStart(2, '0'),
        day: String(now.getDate()).padStart(2, '0'),
        weekday: weekdays[now.getDay()],
        lunar: this.getLunarDate(now) // 获取农历日期
      }
    });
  },

  /**
   * 获取农历日期（简化版，后续可以使用农历转换库）
   */
  getLunarDate(date) {
    // TODO: 接入真实的农历转换
    return '农历冬月初一';
  },

  /**
   * 加载每日一句
   */
  async loadDailyQuote() {
    try {
      logger.info('loadDailyQuote', '加载每日一句');
      
      // TODO: 后续从云端获取每日一句
      // const response = await dailyQuoteService.getTodayQuote();
      
      // 临时使用本地数据
      const quotes = [
        {
          content: '人生如逆旅，我亦是行人。',
          author: '苏轼',
          interpretation: '生命就像一场旅行，我们都是这旅途中的过客。无论遇到什么困难和挫折，都只是旅程中的一段经历。保持平和的心态，珍惜当下的每一刻，因为所有的相遇和别离都是人生必经的风景。'
        },
        {
          content: '凡是过往，皆为序章。',
          author: '莎士比亚',
          interpretation: '过去的一切都已经成为历史，无论好坏都是你人生故事的开篇。不要被过去束缚，每一天都是崭新的开始。放下过去的包袱，轻装前行，未来还有无限可能等着你去书写。'
        },
        {
          content: '山川异域，风月同天。',
          author: '古语',
          interpretation: '虽然我们身处不同的地方，但我们共享着同一片天空和月光。这句话提醒我们，世界是相连的，人与人之间的情感是相通的。无论身在何处，保持一颗包容和善良的心，感受这个世界的美好。'
        },
        {
          content: '愿你出走半生，归来仍是少年。',
          author: '现代诗句',
          interpretation: '希望你在经历了人生的风雨之后，依然能保持一颗年轻、热情的心。岁月会改变我们的容颜，但不应该磨灭我们对生活的热爱和好奇。永远保持那份初心，对世界充满期待。'
        },
        {
          content: '心之所向，素履以往。',
          author: '古语',
          interpretation: '内心向往什么，就朴素地前往。这是一种简单而坚定的人生态度。不要被外界的纷扰所迷惑，听从内心的声音，脚踏实地地朝着目标前进。即使道路艰辛，只要方向正确，每一步都有意义。'
        }
      ];
      
      // 根据日期选择一句话（确保每天相同）
      const today = new Date();
      const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
      const selectedQuote = quotes[dayOfYear % quotes.length];
      
      this.setData({
        dailyQuote: selectedQuote
      });
      
    } catch (error) {
      logger.error('loadDailyQuote', '加载每日一句失败', { error: error.message });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 检查收藏状态
   */
  checkCollectionStatus() {
    // TODO: 从本地存储检查是否已收藏
    const today = this.getTodayKey();
    const collected = wx.getStorageSync(`collected_${today}`);
    this.setData({
      isCollected: !!collected
    });
  },

  /**
   * 获取今天的key（用于存储）
   */
  getTodayKey() {
    const { year, month, day } = this.data.dateInfo;
    return `${year}${month}${day}`;
  },

  /**
   * 返回上一页
   */
  onBack() {
    wx.navigateBack({
      delta: 1
    });
  },

  /**
   * 分享
   */
  onShare() {
    // 触发分享面板
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
  },

  /**
   * 刷新/换一换
   */
  async onRefresh() {
    if (this.data.isRefreshing) {
      return;
    }

    this.setData({ isRefreshing: true });

    wx.showLoading({
      title: '换一换...',
      mask: true
    });

    try {
      // TODO: 从云端获取随机一句
      const quotes = [
        {
          content: '世界以痛吻我，我却报之以歌。',
          author: '泰戈尔',
          interpretation: '即使生活给予我们痛苦和挫折，我们也应该以积极乐观的态度去面对。将苦难化作成长的养分，用坚韧和希望回应生活的考验。这是一种高贵的人生态度，也是内心强大的体现。'
        },
        {
          content: '莫听穿林打叶声，何妨吟啸且徐行。',
          author: '苏轼',
          interpretation: '不要在意外界的风雨声响，不妨从容吟唱、缓步前行。人生路上总会遇到各种困难和阻碍，但我们可以选择以怎样的心态去面对。保持内心的平静和从容，优雅地应对人生的风风雨雨。'
        },
        {
          content: '长风破浪会有时，直挂云帆济沧海。',
          author: '李白',
          interpretation: '尽管前路艰难，但总有一天会乘风破浪，高挂云帆渡过沧海。这是一种坚定的信念和对未来的期待。无论现在遇到什么困难，都要相信自己终将实现目标，到达理想的彼岸。'
        }
      ];

      const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
      
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 800));

      this.setData({
        dailyQuote: randomQuote,
        isCollected: false // 换了新内容，收藏状态重置
      });

      wx.hideLoading();
      wx.showToast({
        title: '已更新',
        icon: 'success',
        duration: 1500
      });

    } catch (error) {
      logger.error('onRefresh', '刷新失败', { error: error.message });
      wx.hideLoading();
      wx.showToast({
        title: '刷新失败',
        icon: 'none'
      });
    } finally {
      this.setData({ isRefreshing: false });
    }
  },

  /**
   * 收藏/取消收藏
   */
  onCollect() {
    const { isCollected, dailyQuote } = this.data;
    const today = this.getTodayKey();

    if (isCollected) {
      // 取消收藏
      wx.removeStorageSync(`collected_${today}`);
      this.setData({ isCollected: false });
      wx.showToast({
        title: '已取消收藏',
        icon: 'none'
      });
    } else {
      // 收藏
      wx.setStorageSync(`collected_${today}`, {
        date: today,
        quote: dailyQuote,
        timestamp: Date.now()
      });
      this.setData({ isCollected: true });
      wx.showToast({
        title: '收藏成功',
        icon: 'success'
      });
    }
  },

  /**
   * 分享给好友
   */
  onShareAppMessage() {
    const { dailyQuote } = this.data;
    return {
      title: `每日愈见：${dailyQuote.content}`,
      path: '/pages/daily-insight/index',
      imageUrl: '' // 可以设置分享图片
    };
  },

  /**
   * 分享到朋友圈
   */
  onShareTimeline() {
    const { dailyQuote } = this.data;
    return {
      title: `每日愈见：${dailyQuote.content}`,
      imageUrl: '' // 可以设置分享图片
    };
  }
});

