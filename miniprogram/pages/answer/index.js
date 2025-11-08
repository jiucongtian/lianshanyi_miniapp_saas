Page({
  data: {
    answerNumber: 188, // 答案编号
    question: '', // 用户的问题
    // 圆环标记点数组，每层只有一个点
    outer1Marks: [0], // 最外层1个标记
    outer2Marks: [0], // 第二层1个标记
    outer3Marks: [0], // 第三层1个标记
    outer4Marks: [0], // 第四层1个标记
    // 天干：10个
    tianGan: ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'],
    tianGanIndices: Array.from({ length: 10 }, (_, i) => i) // 天干索引数组
  },

  onLoad(options) {
    console.log('[AnswerPage] 页面加载');
    
    // 获取传递的问题
    if (options.question) {
      this.setData({
        question: decodeURIComponent(options.question)
      });
    }
    
    // 随机生成答案编号（1-999）
    const randomNumber = Math.floor(Math.random() * 999) + 1;
    this.setData({
      answerNumber: randomNumber
    });
  },

  onShow() {
    console.log('[AnswerPage] 页面显示');
  },

  /**
   * 返回按钮点击事件
   */
  onBack() {
    wx.navigateBack();
  },

  /**
   * 答案解析按钮点击事件
   */
  onAnalyzeAnswer() {
    console.log('[AnswerPage] 点击答案解析');
    // TODO: 实现答案解析功能
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },

  /**
   * 再问一次按钮点击事件
   */
  onAskAgain() {
    console.log('[AnswerPage] 点击再问一次');
    // 返回首页
    wx.navigateBack();
  }
});

