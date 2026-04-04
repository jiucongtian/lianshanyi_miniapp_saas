const { dailyInsightService } = require('../../services/DailyInsightService');
const { FunctionController } = require('../../controllers/FunctionController');
const app = getApp();

Page({
  data: {
    currentTab: 'wisdom', // 当前激活的Tab: 'wisdom' | 'daily'
    question: '',
    isSearching: false,
    isLoadingDailyInsight: false, // 加载每日愈见数据的状态
    // 用于生成装饰图案的数组
    outerPatterns: Array.from({ length: 36 }, (_, i) => i),
    middlePatterns: Array.from({ length: 16 }, (_, i) => i),
    // 示例问题列表
    exampleQuestions: [
      '我应该去表白吗?',
      '我应该换工作吗?',
      '我应该投资这个项目吗?',
      '我应该原谅他吗?',
      '我应该搬家吗?',
      '我应该开始新的关系吗?',
      '我应该放弃这个想法吗?',
      '我应该相信这个人吗?',
      '我应该改变我的生活方式吗?',
      '我应该追求这个梦想吗?',
      '我应该说出真相吗?',
      '我应该等待还是行动?',
      '我应该接受这个挑战吗?',
      '我应该结束这段关系吗?',
      '我应该相信我的直觉吗?'
    ]
  },

  onLoad(options) {
    console.log('[HomePage] 页面加载');
    // 初始化Controller（用于获取配额信息）
    this.functionController = new FunctionController(this);
  },

  onShow() {
    console.log('[HomePage] 页面显示');
  },

  /**
   * Tab切换事件
   */
  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    console.log('[HomePage] 切换Tab:', tab);
    
    if (this.data.currentTab === tab) {
      return; // 已经是当前Tab，无需切换
    }
    
    this.setData({
      currentTab: tab
    });
  },

  /**
   * 跳转到每日愈见页面
   * 在跳转前先调用云函数获取数据，如果成功则传递数据，如果失败则不跳转
   */
  async onNavigateToDailyInsight() {
    console.log('[HomePage] 准备跳转到每日愈见页面');
    
    // 防止重复点击
    if (this.data.isLoadingDailyInsight) {
      return;
    }
    
    // 设置加载状态
    this.setData({
      isLoadingDailyInsight: true
    });
    
    // 显示加载提示
    wx.showLoading({
      title: '加载中...',
      mask: true
    });
    
    try {
      // 调用云函数获取今日卡牌数据
      const response = await dailyInsightService.getTodayCard();
      
      wx.hideLoading();
      
      if (response.success && response.data) {
        const { card, date, time } = response.data;
        
        // 验证卡牌数据是否完整
        if (card && card.isValid()) {
          // 将数据存储到 globalData，供 daily-insight 页面使用
          // 存储原始数据（因为 Bean 实例不能直接序列化）
          // 使用 _rawData 获取原始数据，如果没有则使用 toObject() 方法
          const cardRawData = card._rawData || card.toObject();
          app.globalData.dailyInsightPreloadData = {
            card: cardRawData,
            date: date,
            time: time,
            timestamp: Date.now() // 添加时间戳，用于判断数据是否过期
          };
          
          console.log('[HomePage] 数据预加载成功，准备跳转');
          
          // 跳转到每日愈见页面
          wx.navigateTo({
            url: '/pages/daily-insight/index',
            success: () => {
              console.log('[HomePage] 跳转到每日愈见页面成功');
            },
            fail: (err) => {
              console.error('[HomePage] 跳转失败:', err);
              // 清除预加载数据
              delete app.globalData.dailyInsightPreloadData;
              wx.showToast({
                title: '跳转失败',
                icon: 'none'
              });
            }
          });
        } else {
          // 卡牌数据不完整
          console.error('[HomePage] 卡牌数据不完整');
          wx.showToast({
            title: '获取数据失败，请重试',
            icon: 'none',
            duration: 2000
          });
        }
      } else {
        // 云函数返回错误
        console.error('[HomePage] 获取每日愈见数据失败:', response.error);
        wx.showToast({
          title: response.error || '获取数据失败，请重试',
          icon: 'none',
          duration: 2000
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('[HomePage] 获取每日愈见数据异常:', error);
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none',
        duration: 2000
      });
    } finally {
      // 重置加载状态
      this.setData({
        isLoadingDailyInsight: false
      });
    }
  },

  /**
   * 输入框输入事件
   */
  onQuestionInput(e) {
    const value = e.detail.value;
    // 限制最大50字（虽然已经通过maxlength限制，但这里作为双重保险）
    const limitedValue = value.length > 50 ? value.substring(0, 50) : value;
    this.setData({
      question: limitedValue
    });
  },

  /**
   * 验证问题输入
   * @param {string} question - 问题文本
   * @returns {Object} { valid: boolean, message: string }
   */
  _validateQuestion(question) {
    // 去除首尾空格
    const trimmedQuestion = question ? question.trim() : '';
    
    // 可以为空
    if (trimmedQuestion === '') {
      return { valid: true, message: '' };
    }
    
    // 如果不为空，需要包含有意义的中文内容
    // 检查是否包含中文字符（Unicode范围：\u4e00-\u9fa5）
    const chineseCharRegex = /[\u4e00-\u9fa5]/;
    const hasChinese = chineseCharRegex.test(trimmedQuestion);
    
    if (!hasChinese) {
      return { 
        valid: false, 
        message: '请输入有意义的问题，不能是纯数字、字母或符号' 
      };
    }
    
    return { valid: true, message: '' };
  },

  /**
   * 抽卡寻找答案按钮点击事件
   */
  async onFindAnswer() {
    const { isSearching, question } = this.data;

    if (isSearching) {
      return;
    }

    // 验证问题输入
    const validation = this._validateQuestion(question);
    if (!validation.valid) {
      wx.showToast({
        title: validation.message,
        icon: 'none',
        duration: 3000
      });
      return;
    }

    // 设置搜索状态
    this.setData({
      isSearching: true
    });

    // 在跳转前先获取配额信息
    console.log('[HomePage] 开始获取配额信息');
    
    try {
      // 直接使用 FunctionService 获取配额信息，可以获取详细的错误信息
      const { functionService } = require('../../services/FunctionService');
      const quotaResponse = await functionService.checkQuota('wisdom_insight');
      
      if (quotaResponse.success && quotaResponse.data) {
        // 配额信息获取成功，存储到globalData供answer页面使用
        const quotaInfo = quotaResponse.data;
        const quotaRawData = quotaInfo._rawData || quotaInfo.toObject();
        app.globalData.wisdomInsightQuotaPreload = {
          quota: quotaRawData,
          timestamp: Date.now()
        };
        console.log('[HomePage] 配额信息已预加载:', {
          freeRemaining: quotaInfo.freeRemaining,
          paidRemaining: quotaInfo.paidRemaining,
          totalRemaining: quotaInfo.totalRemaining
        });
      } else {
        // 配额信息获取失败，检查是否是网络错误
        const errorMessage = quotaResponse.error || '';
        const isNetworkError = errorMessage.includes('Failed to fetch') || 
                               errorMessage.includes('网络错误') ||
                               errorMessage.includes('网络连接') ||
                               errorMessage.includes('fetch') ||
                               errorMessage.includes('callFunction:fail');
        
        if (isNetworkError) {
          // 网络错误，提示用户并阻止跳转
          console.error('[HomePage] 网络连接失败，阻止跳转', { error: errorMessage });
          wx.showToast({
            title: '网络连接失败，请检查网络后重试',
            icon: 'none',
            duration: 3000
          });
          
          // 清除可能存在的旧数据
          delete app.globalData.wisdomInsightQuotaPreload;
          
          // 重置搜索状态
          this.setData({
            isSearching: false
          });
          
          return; // 阻止跳转
        } else {
          // 其他错误（如配额不足等），记录日志但允许跳转（answer页面会自行处理）
          console.warn('[HomePage] 配额信息获取失败（非网络错误）', { error: errorMessage });
          delete app.globalData.wisdomInsightQuotaPreload;
        }
      }
    } catch (error) {
      console.error('[HomePage] 获取配额信息异常:', error);
      
      // 检查是否是网络错误
      const errorMessage = error.message || String(error);
      const isNetworkError = errorMessage.includes('Failed to fetch') || 
                             errorMessage.includes('网络错误') ||
                             errorMessage.includes('网络连接') ||
                             errorMessage.includes('fetch') ||
                             errorMessage.includes('callFunction:fail');
      
      if (isNetworkError) {
        // 网络错误，提示用户并阻止跳转
        console.error('[HomePage] 网络连接失败，阻止跳转', { error: errorMessage });
        wx.showToast({
          title: '网络连接失败，请检查网络后重试',
          icon: 'none',
          duration: 3000
        });
        
        // 清除可能存在的旧数据
        delete app.globalData.wisdomInsightQuotaPreload;
        
        // 重置搜索状态
        this.setData({
          isSearching: false
        });
        
        return; // 阻止跳转
      } else {
        // 其他错误，清除预加载数据，允许跳转（answer页面会自行处理）
        console.warn('[HomePage] 配额信息获取异常（非网络错误），允许跳转', { error: errorMessage });
        delete app.globalData.wisdomInsightQuotaPreload;
      }
    }

    // 配额检查通过或非网络错误，跳转到答案页面
    const questionParam = question ? encodeURIComponent(question.trim()) : '';
    wx.navigateTo({
      url: `/pages/answer/index${questionParam ? '?question=' + questionParam : ''}`,
      success: () => {
        console.log('[HomePage] 跳转到答案页面');
        // 跳转成功后重置搜索状态
        this.setData({
          isSearching: false
        });
      },
      fail: (err) => {
        console.error('[HomePage] 跳转失败:', err);
        // 清除预加载数据
        delete app.globalData.wisdomInsightQuotaPreload;
        wx.showToast({
          title: '跳转失败',
          icon: 'none'
        });
        // 跳转失败后重置搜索状态
        this.setData({
          isSearching: false
        });
      }
    });
  },


  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    console.log('[HomePage] 下拉刷新');
    // 可以在这里添加刷新逻辑
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  },

  /**
   * 分享功能 - 激活右上角分享按钮
   * 用户点击右上角分享按钮时触发
   */
  onShareAppMessage() {
    const { question } = this.data;
    
    // 如果有输入的问题，在分享标题中体现
    let shareTitle = '智慧洞见 - 寻找你心中的答案';
    if (question && question.trim()) {
      shareTitle = `智慧洞见 - ${question.trim().substring(0, 20)}${question.trim().length > 20 ? '...' : ''}`;
    }
    
    return {
      title: shareTitle,
      path: '/pages/home/index',
      imageUrl: '' // 可以设置分享图片，留空则使用小程序默认图片
    };
  },

  /**
   * 分享到朋友圈功能（如果支持）
   */
  onShareTimeline() {
    const { question } = this.data;
    
    let shareTitle = '智慧洞见 - 寻找你心中的答案';
    if (question && question.trim()) {
      shareTitle = `智慧洞见 - ${question.trim().substring(0, 20)}${question.trim().length > 20 ? '...' : ''}`;
    }
    
    return {
      title: shareTitle,
      imageUrl: '' // 可以设置分享图片
    };
  }
});

