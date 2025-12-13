const { createModuleLogger } = require('../../utils/logger/index');
const logger = createModuleLogger('DailyInsightPage');

Page({
  data: {
    // 当前时间
    currentTime: '',
    // 日期信息
    dateInfo: {
      year: '',
      month: '',
      day: '',
      weekday: '',
      lunar: '',
      ganzhiYear: '' // 干支纪年
    },
    // 卡牌信息
    cardInfo: {
      name: '贵虎',
      imageUrl: '/static/card-back.jpg', // 默认卡牌图片
      central: '个身着兽皮，手拿令牌的虎官。',
      seasonMark: '春秋',
      talentMark: '变通力',
      abilityMark: '二',
      pathMark: '精与义',
      description: '卡牌建议您尽一鼓作的快节，还传悦神烂式发布，无异于新算到和新机会高扩比率证记到断都和前进。黄贯足錦定目标快准狠。今天不通，拒绝高的期待，需要我们的新思路比起来都不算啥',
      blessing: '卡牌给我们的提醒是：寿秋季节印记提示我要带着目的去找寻新的机会和方向，技力集中向上生长和游戏规则给予的正面反馈机制为前提，就像是让我压力让我不舒服，陷入是非，同也让我成长。',
      tip: '季节提示我们会有矛盾和纠结，断舍离是有点痛，痛了了才能那些坐耗，脱屋成蝶。黄贯足錦定目标就快准狠。今天不通，拒绝高期待，需要我们的调整高期待。结果跟新机会新思路比起来都不算啥',
      password: '破茧蝶变'
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
    // 设置当前时间
    this.setCurrentTime();
    
    // 设置日期信息
    this.setDateInfo();
    
    // 加载每日一句（后续可以从云端获取）
    this.loadDailyQuote();
    
    // 检查是否已收藏
    this.checkCollectionStatus();
  },

  /**
   * 设置当前时间
   */
  setCurrentTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    this.setData({
      currentTime: `${hours}:${minutes}`
    });
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
        lunar: this.getLunarDate(now),
        ganzhiYear: this.getGanzhiYear(now) // 获取干支纪年
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
   * 获取干支纪年（简化版）
   */
  getGanzhiYear(date) {
    // TODO: 接入真实的干支纪年计算
    const year = date.getFullYear();
    const ganList = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    const zhiList = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    
    // 简单计算，以1984年（甲子年）为基准
    const baseYear = 1984;
    const diff = year - baseYear;
    const ganIndex = diff % 10;
    const zhiIndex = diff % 12;
    
    return `${ganList[ganIndex]}${zhiList[zhiIndex]}`;
  },

  /**
   * 加载每日卡牌
   */
  async loadDailyQuote() {
    try {
      logger.info('loadDailyQuote', '加载每日卡牌');
      
      // TODO: 后续从云端获取每日卡牌
      // const response = await dailyCardService.getTodayCard();
      
      // 临时使用本地数据
      const cards = [
        {
          name: '贵虎',
          imageUrl: '/static/card-back.jpg',
          central: '个身着兽皮，手拿令牌的虎官。',
          seasonMark: '春秋',
          talentMark: '变通力',
          abilityMark: '二',
          pathMark: '精与义',
          description: '卡牌建议您尽一鼓作的快节，还传悦神烂式发布，无异于新算到和新机会高扩比率证记到断都和前进。黄贯足錦定目标快准狠。今天不通，拒绝高的期待，需要我们的新思路比起来都不算啥',
          blessing: '卡牌给我们的提醒是：寿秋季节印记提示我要带着目的去找寻新的机会和方向，技力集中向上生长和游戏规则给予的正面反馈机制为前提，就像是让我压力让我不舒服，陷入是非，同也让我成长。',
          tip: '季节提示我们会有矛盾和纠结，断舍离是有点痛，痛了了才能那些坐耗，脱屋成蝶。黄贯足錦定目标就快准狠。今天不通，拒绝高期待，需要我们的调整高期待。结果跟新机会新思路比起来都不算啥',
          password: '破茧蝶变'
        },
        {
          name: '智者之龙',
          imageUrl: '/static/card-back.jpg',
          central: '一位智慧长者，手持古卷。',
          seasonMark: '冬夏',
          talentMark: '洞察力',
          abilityMark: '三',
          pathMark: '知与行',
          description: '智慧不在于知道多少，而在于如何运用。今天是积累经验、总结反思的好时机，为未来的行动做好准备。洞察力提示你要看透表象，理解事物的本质。',
          blessing: '冬夏季节印记带来的是沉淀与爆发的力量。智慧需要时间的积累，也需要在关键时刻果断出击。保持冷静的头脑，在适当的时机展现你的智慧。',
          tip: '洞察力提示你要看透表象，理解事物的本质。不要被表面的现象所迷惑，深入思考，找到问题的根源。知行合一，将智慧转化为行动。',
          password: '知行合一'
        },
        {
          name: '灵鸟凤凰',
          imageUrl: '/static/card-back.jpg',
          central: '一只浴火重生的凤凰。',
          seasonMark: '四季',
          talentMark: '重生力',
          abilityMark: '五',
          pathMark: '舍与得',
          description: '凤凰涅槃，浴火重生。今天是放下过去、迎接新生的时刻。不要害怕结束，每一次结束都是新的开始。勇敢地面对变化，拥抱新的可能。',
          blessing: '重生需要勇气，需要舍弃旧的自己。放下执念，释放束缚，让自己在新的环境中重新绽放。记住，失去的同时也在获得，每一次蜕变都是成长。',
          tip: '今天是转变的时刻，旧的模式需要打破，新的可能正在孕育。不要害怕改变，拥抱未知，相信自己有能力重新开始。舍得舍得，有舍才有得。',
          password: '涅槃重生'
        }
      ];
      
      // 根据日期选择一张卡牌（确保每天相同）
      const today = new Date();
      const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
      const selectedCard = cards[dayOfYear % cards.length];
      
      this.setData({
        cardInfo: selectedCard
      });
      
    } catch (error) {
      logger.error('loadDailyQuote', '加载每日卡牌失败', { error: error.message });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 查看卡牌大图
   */
  onViewCardImage() {
    const { imageUrl } = this.data.cardInfo;
    if (imageUrl) {
      wx.previewImage({
        urls: [imageUrl],
        current: imageUrl
      });
    }
  },

  /**
   * 检查收藏状态
   */
  checkCollectionStatus() {
    // TODO: 从本地存储检查是否已收藏
    const today = this.getTodayKey();
    const collected = wx.getStorageSync(`daily_card_${today}`);
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
      // TODO: 从云端获取随机卡牌
      const cards = [
        {
          name: '智者之龙',
          imageUrl: '/static/card-back.jpg',
          central: '一位智慧长者，手持古卷。',
          seasonMark: '冬夏',
          talentMark: '洞察力',
          abilityMark: '三',
          pathMark: '知与行',
          description: '智慧不在于知道多少，而在于如何运用。今天是积累经验、总结反思的好时机，为未来的行动做好准备。洞察力提示你要看透表象，理解事物的本质。',
          blessing: '冬夏季节印记带来的是沉淀与爆发的力量。智慧需要时间的积累，也需要在关键时刻果断出击。保持冷静的头脑，在适当的时机展现你的智慧。',
          tip: '洞察力提示你要看透表象，理解事物的本质。不要被表面的现象所迷惑，深入思考，找到问题的根源。知行合一，将智慧转化为行动。',
          password: '知行合一'
        },
        {
          name: '灵鸟凤凰',
          imageUrl: '/static/card-back.jpg',
          central: '一只浴火重生的凤凰。',
          seasonMark: '四季',
          talentMark: '重生力',
          abilityMark: '五',
          pathMark: '舍与得',
          description: '凤凰涅槃，浴火重生。今天是放下过去、迎接新生的时刻。不要害怕结束，每一次结束都是新的开始。勇敢地面对变化，拥抱新的可能。',
          blessing: '重生需要勇气，需要舍弃旧的自己。放下执念，释放束缚，让自己在新的环境中重新绽放。记住，失去的同时也在获得，每一次蜕变都是成长。',
          tip: '今天是转变的时刻，旧的模式需要打破，新的可能正在孕育。不要害怕改变，拥抱未知，相信自己有能力重新开始。舍得舍得，有舍才有得。',
          password: '涅槃重生'
        },
        {
          name: '勇士之狮',
          imageUrl: '/static/card-back.jpg',
          central: '一只威武雄狮，目光坚定。',
          seasonMark: '夏秋',
          talentMark: '勇气',
          abilityMark: '四',
          pathMark: '进与退',
          description: '狮子的勇气不是无畏，而是即使恐惧也要前进。今天需要你展现勇气，面对那些一直逃避的问题。勇敢地迈出第一步，你会发现事情并没有想象中那么困难。',
          blessing: '勇气不是没有恐惧，而是带着恐惧前行。今天是展现你勇气的时刻，不要让恐惧束缚你的手脚。相信自己，勇敢地面对挑战。',
          tip: '勇气不是没有恐惧，而是带着恐惧前行。评估风险，做好准备，然后果断行动。记住，退一步是为了更好地前进，进退之间需要智慧。',
          password: '勇往直前'
        }
      ];

      const randomCard = cards[Math.floor(Math.random() * cards.length)];
      
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 800));

      this.setData({
        cardInfo: randomCard,
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
    const { isCollected, cardInfo, dateInfo } = this.data;
    const today = this.getTodayKey();

    if (isCollected) {
      // 取消收藏
      wx.removeStorageSync(`daily_card_${today}`);
      this.setData({ isCollected: false });
      wx.showToast({
        title: '已取消收藏',
        icon: 'none'
      });
    } else {
      // 收藏
      wx.setStorageSync(`daily_card_${today}`, {
        date: today,
        dateInfo: dateInfo,
        card: cardInfo,
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
    const { cardInfo } = this.data;
    return {
      title: `每日愈见：${cardInfo.name} - ${cardInfo.password}`,
      path: '/pages/daily-insight/index',
      imageUrl: cardInfo.imageUrl || '' // 使用卡牌图片作为分享图
    };
  },

  /**
   * 分享到朋友圈
   */
  onShareTimeline() {
    const { cardInfo } = this.data;
    return {
      title: `每日愈见：${cardInfo.name} - ${cardInfo.password}`,
      imageUrl: cardInfo.imageUrl || '' // 使用卡牌图片作为分享图
    };
  }
});

