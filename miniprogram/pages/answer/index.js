const { VersionManager } = require('../../utils/manager/versionManager');
const { createModuleLogger } = require('../../utils/logger/index');
const log = createModuleLogger('AnswerPage');

Page({
  data: {
    answerNumber: 188, // 答案编号
    question: '', // 用户的问题
    ganzhiInput: '', // 干支输入框
    aiInterpretation: '', // AI解读结果
    isInterpreting: false, // 是否正在解读
    // 转圈动画相关数据
    tianGan: ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'],
    tianGanIndices: Array.from({ length: 10 }, (_, i) => i), // 天干索引数组
    // 抽卡相关数据
    cardList: [], // 卡牌列表（始终保持10张卡牌用于循环显示）
    scrollOffset: 0, // 滚动偏移量（rpx）
    selectedIndex: 2, // 选中的卡牌索引（初始为2，保证左侧有足够卡牌）
    isFlipped: false, // 是否已翻转
    isDrawing: false, // 是否正在抽卡
    transitionDuration: 0, // 过渡动画时长（ms）
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
    // 创建10张卡牌，用于循环滚动
    // 使用全局ID来跟踪每张卡牌的唯一性
    const cardList = Array.from({ length: 10 }, (_, i) => ({
      id: i, // 使用索引作为唯一ID
      key: `card_${i}` // 用于wx:key
    }));
    
    // 卡牌尺寸配置（放大30%）
    const cardWidth = 260; // 每张卡牌的宽度（rpx）- 原200 * 1.3
    const cardGap = 26; // 卡牌间距（rpx）- 原20 * 1.3
    const totalCardWidth = cardWidth + cardGap; // 每张卡牌占用的总宽度（286rpx）
    
    // 计算实际容器宽度（考虑main-content的padding）
    // main-content: margin 32rpx, padding 50rpx
    const screenWidth = 750;
    const mainContentMargin = 32 * 2; // 左右各32rpx
    const mainContentPadding = 50 * 2; // 左右各50rpx
    const containerWidth = screenWidth - mainContentMargin - mainContentPadding; // 586rpx
    const centerX = containerWidth / 2; // 293rpx
    
    // 初始状态：让索引2的卡牌居中
    // 这样屏幕上显示索引1、2、3的三张卡牌
    const initialSelectedIndex = 2;
    const selectedCardCenterX = initialSelectedIndex * totalCardWidth + cardWidth / 2;
    const initialOffset = centerX - selectedCardCenterX;
    
    // 保存卡牌配置到实例变量，供后续使用
    this.cardConfig = {
      cardWidth,
      cardGap,
      totalCardWidth,
      containerWidth,
      centerX,
      nextCardId: 10 // 下一个要创建的卡牌ID
    };
    
    this.setData({
      cardList: cardList,
      scrollOffset: initialOffset,
      selectedIndex: initialSelectedIndex,
      isFlipped: false
    });
    
    console.log('[_initCardList] 初始化完成');
    console.log('  容器宽度:', containerWidth);
    console.log('  中心X坐标:', centerX);
    console.log('  卡牌数量:', cardList.length);
    console.log('  初始选中索引:', initialSelectedIndex);
    console.log('  选中卡牌中心X:', selectedCardCenterX);
    console.log('  初始偏移量:', initialOffset);
  },

  onShow() {
    console.log('[AnswerPage] 页面显示');
  },

  /**
   * 返回按钮点击事件（TDesign navbar回调）
   */
  goBack() {
    wx.navigateBack();
  },

  /**
   * 抽卡按钮点击事件
   */
  onAnalyzeAnswer() {
    console.log('[AnswerPage] 点击抽卡');
    
    // 如果正在抽卡，忽略点击
    if (this.data.isDrawing) {
      console.log('[AnswerPage] 正在抽卡中，忽略点击');
      return;
    }
    
    // 如果已经翻转，重置翻转状态
    if (this.data.isFlipped) {
      this.setData({
        isFlipped: false
      });
    }
    
    // 标记开始抽卡
    this.setData({
      isDrawing: true
    });
    
    // 开始抽卡动画
    this._startDrawCardAnimation();
  },
  
  /**
   * 开始抽卡动画
   * 固定滚动5张卡牌的距离，使用单一平滑的缓动函数
   */
  _startDrawCardAnimation() {
    const { totalCardWidth, centerX } = this.cardConfig;
    
    // 固定滚动距离：5张卡牌
    const scrollCardCount = 5;
    const scrollDistance = scrollCardCount * totalCardWidth; // 1100rpx
    
    // 计算目标选中索引
    const currentSelectedIndex = this.data.selectedIndex;
    const targetSelectedIndex = currentSelectedIndex + scrollCardCount;
    
    // 由于是从右往左滚动，偏移量减小（更负）
    const currentOffset = this.data.scrollOffset;
    const newOffset = currentOffset - scrollDistance; // 向左移动（负方向）
    
    console.log('[_startDrawCardAnimation] 开始滚动');
    console.log('  当前卡牌数量:', this.data.cardList.length);
    console.log('  当前选中索引:', currentSelectedIndex);
    console.log('  目标选中索引:', targetSelectedIndex);
    console.log('  当前偏移量:', currentOffset);
    console.log('  滚动距离:', scrollDistance);
    console.log('  新偏移量:', newOffset);
    
    // 使用单一平滑的缓动函数
    // cubic-bezier(0.33, 0, 0.2, 1) 实现先加速后减速，整体流畅
    const animationDuration = 2000; // 2秒动画
    
    this.setData({
      scrollOffset: newOffset,
      selectedIndex: targetSelectedIndex,
      transitionDuration: animationDuration,
      transitionTiming: 'cubic-bezier(0.33, 0, 0.2, 1)' // 平滑的加速减速曲线
    });
    
    // 动画结束后，调整卡牌队列
    setTimeout(() => {
      console.log('[_startDrawCardAnimation] 动画结束，开始调整卡牌队列');
      
      // 移除前面5张已滚出画面的卡牌，在后面添加5张新卡牌
      const newCardList = [...this.data.cardList];
      
      // 移除前5张
      newCardList.splice(0, scrollCardCount);
      
      // 在末尾添加5张新卡牌
      for (let i = 0; i < scrollCardCount; i++) {
        newCardList.push({
          id: this.cardConfig.nextCardId++,
          key: `card_${this.cardConfig.nextCardId - 1}`
        });
      }
      
      // 调整选中索引（因为移除了前5张，索引需要减5）
      const newSelectedIndex = targetSelectedIndex - scrollCardCount;
      
      // 重新计算偏移量，使新的选中卡牌居中
      const newSelectedCardCenterX = newSelectedIndex * totalCardWidth + this.cardConfig.cardWidth / 2;
      const newScrollOffset = centerX - newSelectedCardCenterX;
      
      console.log('  调整后卡牌数量:', newCardList.length);
      console.log('  新选中索引:', newSelectedIndex);
      console.log('  新选中卡牌中心X:', newSelectedCardCenterX);
      console.log('  容器中心X:', centerX);
      console.log('  新偏移量:', newScrollOffset);
      
      // 瞬间完成队列调整（用户看不到）
      this.setData({
        cardList: newCardList,
        scrollOffset: newScrollOffset,
        selectedIndex: newSelectedIndex,
        transitionDuration: 0,
        transitionTiming: 'linear'
      });
      
      // 稍作延迟后翻转卡牌
      setTimeout(() => {
        this.setData({
          isFlipped: true,
          isDrawing: false
        });
        console.log('[_startDrawCardAnimation] 抽卡完成');
      }, 50); // 50ms后翻转卡牌
      
    }, animationDuration);
  },

  /**
   * 干支输入框变化事件
   */
  onGanzhiInput(e) {
    this.setData({
      ganzhiInput: e.detail.value
    });
  },

  /**
   * AI解读按钮点击事件
   */
  async onAIInterpret() {
    log.info('onAIInterpret', '点击AI解读');
    
    // 验证输入
    if (!this.data.ganzhiInput || this.data.ganzhiInput.trim() === '') {
      wx.showToast({
        title: '请输入干支文字',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 如果正在解读，忽略点击
    if (this.data.isInterpreting) {
      log.warn('onAIInterpret', '正在解读中，忽略点击');
      return;
    }
    
    // 显示加载提示
    wx.showLoading({
      title: 'AI解读中...',
      mask: true
    });
    
    // 标记开始解读
    this.setData({
      isInterpreting: true
    });
    
    try {
      // 通过版本管理器获取云函数名称
      const functionName = VersionManager.getFunctionName('cozeFunctions');
      log.info('onAIInterpret', '调用云函数', { 
        functionName, 
        bazi_name: this.data.ganzhiInput,
        question: this.data.question 
      });
      
      // 调用云函数
      const result = await wx.cloud.callFunction({
        name: functionName,
        data: {
          workflowType: 'DRAW_CARD', // 使用抽卡工作流，如需专门的解读工作流请修改此处
          parameters: {
            bazi_name: this.data.ganzhiInput, // DRAW_CARD工作流需要bazi_name参数
            question: this.data.question || '' // question为可选参数
          }
        }
      });
      
      log.info('onAIInterpret', '云函数调用结果', result);
      
      // 隐藏加载提示
      wx.hideLoading();
      
      // 处理返回结果
      if (result.result && result.result.success) {
        const data = result.result.data;
        
        // 提取AI解读结果
        let interpretation = '';
        if (data.data) {
          // 尝试从不同的字段提取解读结果
          interpretation = data.data.output || data.data.result || data.data.text || JSON.stringify(data.data);
        }
        
        this.setData({
          aiInterpretation: interpretation
        });
        
        log.info('onAIInterpret', 'AI解读成功', { interpretation });
        
        wx.showToast({
          title: '解读成功',
          icon: 'success',
          duration: 2000
        });
      } else {
        const errorMsg = result.result?.error || '解读失败，请重试';
        log.error('onAIInterpret', '云函数返回失败', { error: errorMsg });
        
        wx.showToast({
          title: errorMsg,
          icon: 'none',
          duration: 2000
        });
      }
    } catch (error) {
      log.error('onAIInterpret', '调用云函数失败', { error: error.message });
      
      wx.hideLoading();
      
      // 处理超时错误
      let errorMessage = '网络错误，请重试';
      if (error.message && error.message.includes('timeout')) {
        errorMessage = 'AI解读需要较长时间，请稍后再试或检查云函数配置';
      } else if (error.message && error.message.includes('FUNCTIONS_TIME_LIMIT_EXCEEDED')) {
        errorMessage = '请求超时，请检查云函数超时配置（建议30秒）';
      } else if (error.message) {
        // 提取更友好的错误信息
        const errorStr = error.message.toString();
        if (errorStr.includes('errCode')) {
          errorMessage = '服务暂时不可用，请稍后再试';
        } else {
          errorMessage = error.message.length > 30 ? '请求失败，请重试' : error.message;
        }
      }
      
      wx.showToast({
        title: errorMessage,
        icon: 'none',
        duration: 3000
      });
    } finally {
      // 结束解读状态
      this.setData({
        isInterpreting: false
      });
    }
  }
});

