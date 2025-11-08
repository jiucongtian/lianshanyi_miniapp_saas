Page({
  data: {
    answerNumber: 188, // 答案编号
    question: '', // 用户的问题
    // 转圈动画相关数据
    tianGan: ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'],
    tianGanIndices: Array.from({ length: 10 }, (_, i) => i), // 天干索引数组
    // 抽卡相关数据
    cardList: [], // 卡牌列表（只创建7张，循环使用）
    scrollOffset: 0, // 滚动偏移量
    selectedIndex: 0, // 选中的卡牌索引（虚拟索引，用于循环）
    virtualIndex: 0, // 虚拟索引，用于跟踪实际滚动位置
    isFlipped: false, // 是否已翻转
    isDrawing: false, // 是否正在抽卡
    transitionDuration: 0, // 过渡动画时长
    transitionTiming: 'linear' // 过渡动画缓动函数
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
    
    // 初始化卡牌列表（生成足够多的卡牌用于滚动）
    this._initCardList();
  },
  
  /**
   * 初始化卡牌列表
   */
  _initCardList() {
    // 只创建7张卡牌，循环使用
    const cardList = Array.from({ length: 7 }, (_, i) => ({
      id: i
    }));
    
    // 初始时，让第一张卡牌在右侧（屏幕外或右侧），准备从右往左滚动
    const cardWidth = 200; // 每张卡牌的宽度（rpx）
    const cardGap = 20; // 卡牌间距（rpx）
    const totalCardWidth = cardWidth + cardGap; // 每张卡牌占用的总宽度
    const screenWidth = 750; // 屏幕宽度（rpx）
    const centerX = screenWidth / 2; // 屏幕中心X坐标
    
    // 初始时，让第一张卡牌（索引0）的中心在屏幕右侧外
    // 偏移量为正数，表示容器向右移动，卡牌从右侧进入视野
    const startIndex = 0;
    const startCardCenterX = startIndex * totalCardWidth + cardWidth / 2;
    const initialOffset = centerX - startCardCenterX + screenWidth; // 加上屏幕宽度，让卡牌从右侧开始
    
    this.setData({
      cardList: cardList,
      scrollOffset: initialOffset,
      selectedIndex: 0,
      virtualIndex: 0,
      isFlipped: false
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
   * 抽卡按钮点击事件
   */
  onAnalyzeAnswer() {
    console.log('[AnswerPage] 点击抽卡');
    
    // 如果正在抽卡，忽略点击
    if (this.data.isDrawing) {
      return;
    }
    
    // 重置状态：从右侧开始滚动
    const cardWidth = 200; // 每张卡牌的宽度（rpx）
    const cardGap = 20; // 卡牌间距（rpx）
    const totalCardWidth = cardWidth + cardGap; // 每张卡牌占用的总宽度
    const screenWidth = 750; // 屏幕宽度（rpx）
    const centerX = screenWidth / 2; // 屏幕中心X坐标
    
    // 从右侧开始：第一张卡牌（索引0）的中心在屏幕右侧外
    const startIndex = 0;
    const startCardCenterX = startIndex * totalCardWidth + cardWidth / 2;
    const startOffset = centerX - startCardCenterX + screenWidth; // 加上屏幕宽度，让卡牌从右侧开始
    
    this.setData({
      isDrawing: true,
      isFlipped: false,
      scrollOffset: startOffset,
      selectedIndex: 0,
      virtualIndex: 0,
      transitionDuration: 0,
      transitionTiming: 'linear'
    });
    
    // 开始抽卡动画
    this._startDrawCardAnimation();
  },
  
  /**
   * 开始抽卡动画
   */
  _startDrawCardAnimation() {
    const cardWidth = 200; // 每张卡牌的宽度（rpx）
    const cardGap = 20; // 卡牌间距（rpx）
    const totalCardWidth = cardWidth + cardGap; // 每张卡牌占用的总宽度
    const screenWidth = 750; // 屏幕宽度（rpx）
    const centerX = screenWidth / 2; // 屏幕中心X坐标
    const cardCount = 7; // 卡牌总数
    
    // 随机选择虚拟索引（模拟滚动很多张卡牌）
    const virtualScrollCount = Math.floor(Math.random() * 15) + 10; // 滚动10-24张卡牌的距离
    
    // 计算实际选中的卡牌索引（通过取模实现循环）
    const targetVirtualIndex = this.data.virtualIndex + virtualScrollCount;
    const targetDisplayIndex = targetVirtualIndex % cardCount;
    
    // 计算目标卡牌的中心X坐标（相对于滚动容器的起始位置）
    const targetCardCenterX = targetDisplayIndex * totalCardWidth + cardWidth / 2;
    
    // 计算目标偏移量，使目标卡牌中心对齐到屏幕中心
    // 目标偏移量应该是负数或较小的正数，表示容器向左移动（从右往左）
    const targetOffset = centerX - targetCardCenterX;
    
    // 计算需要滚动的距离（从当前位置到目标位置）
    // 由于从右侧开始（大偏移量），目标在中心（小偏移量），所以距离是负数，实现从右往左
    const currentOffset = this.data.scrollOffset;
    const scrollDistance = targetOffset - currentOffset;
    
    // 第一阶段：快速滚动（加速）- 从右往左滚动70%的距离
    const fastScrollDistance = currentOffset + scrollDistance * 0.7;
    const fastScrollDuration = 800; // 800ms快速滚动
    
    this.setData({
      scrollOffset: fastScrollDistance,
      transitionDuration: fastScrollDuration,
      transitionTiming: 'ease-out'
    });
    
    // 第二阶段：慢速滚动（减速）- 再滚动20%的距离
    setTimeout(() => {
      const slowScrollDistance = currentOffset + scrollDistance * 0.9;
      const slowScrollDuration = 600; // 600ms慢速滚动
      
      this.setData({
        scrollOffset: slowScrollDistance,
        transitionDuration: slowScrollDuration,
        transitionTiming: 'ease-in'
      });
      
      // 第三阶段：最终定位（最慢）- 到达最终位置，卡牌居中对齐
      setTimeout(() => {
        const finalScrollDuration = 400; // 400ms最终定位
        
        this.setData({
          scrollOffset: targetOffset,
          selectedIndex: targetDisplayIndex,
          virtualIndex: targetVirtualIndex,
          transitionDuration: finalScrollDuration,
          transitionTiming: 'ease-out'
        });
        
        // 停止后翻转卡牌
        setTimeout(() => {
          this.setData({
            isFlipped: true,
            isDrawing: false
          });
        }, finalScrollDuration);
        
      }, slowScrollDuration);
      
    }, fastScrollDuration);
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

