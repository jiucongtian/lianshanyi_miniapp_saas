Page({
  data: {
    question: '',
    isSearching: false,
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
  },

  onShow() {
    console.log('[HomePage] 页面显示');
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
   * 寻找答案按钮点击事件
   */
  onFindAnswer() {
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

    // 直接跳转到答案页面（移除2秒延迟）
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

