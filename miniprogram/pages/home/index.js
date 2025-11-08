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
    ],
    currentQuestionIndex: 0
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
    this.setData({
      question: value
    });
  },

  /**
   * 寻找答案按钮点击事件
   */
  onFindAnswer() {
    const { isSearching, question } = this.data;

    if (isSearching) {
      return;
    }

    this.setData({
      isSearching: true
    });

    // 模拟寻找答案的过程
    setTimeout(() => {
      // 跳转到答案页面
      const questionParam = question ? encodeURIComponent(question) : '';
      wx.navigateTo({
        url: `/pages/answer/index${questionParam ? '?question=' + questionParam : ''}`,
        success: () => {
          console.log('[HomePage] 跳转到答案页面');
        },
        fail: (err) => {
          console.error('[HomePage] 跳转失败:', err);
          wx.showToast({
            title: '跳转失败',
            icon: 'none'
          });
        },
        complete: () => {
          this.setData({
            isSearching: false
          });
        }
      });
    }, 2000);
  },

  /**
   * 示例问题滚动切换事件
   */
  onQuestionSwiperChange(e) {
    const current = e.detail.current;
    this.setData({
      currentQuestionIndex: current
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
  }
});

