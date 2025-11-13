const { VersionManager } = require('../../utils/manager/versionManager');
const { createModuleLogger } = require('../../utils/logger/index');
const log = createModuleLogger('AnswerPage');

// 引入60甲子数据（统一数据源）
const { JIAZI_DATA } = require('../../utils/jiaziData');
// 引入图片映射工具
const { getBaziImageById } = require('../../utils/baziImageMap');
// 引入图片缓存管理器
const { imageCacheManager } = require('../../utils/manager/imageCacheManager');

Page({
  data: {
    question: '', // 用户的问题
    aiInterpretation: '', // AI解读结果
    // 转圈动画相关数据
    tianGan: ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'],
    tianGanIndices: Array.from({ length: 10 }, (_, i) => i), // 天干索引数组
    // 抽卡相关数据
    cardList: [], // 卡牌列表（始终保持10张卡牌用于循环显示）
    scrollOffset: 0, // 滚动偏移量（rpx）
    selectedIndex: 2, // 选中的卡牌索引（初始为2，保证左侧有足够卡牌）
    isFlipped: false, // 是否已翻转
    transitionDuration: 0, // 过渡动画时长（ms）
    transitionTiming: 'linear', // 过渡动画缓动函数
    // 抽中的卡牌信息
    selectedCard: null, // 格式：{ cardNumber, cardName, pinyin, description, category, keywords }
    selectedCardImagePath: '' // 选中卡牌的图片路径
  },
  
  // 延迟清空定时器ID
  clearImagePathTimer: null,
  // 抽卡操作进行中标志（同步标志，防止重复点击）
  isDrawingCard: false,
  // AI解读操作进行中标志（同步标志，防止重复点击）
  isInterpreting: false,
  
  onLoad(options) {
    console.log('[AnswerPage] 页面加载');
    
    // 准备初始数据（合并所有 setData 调用）
    const initialData = {};
    
    // 获取传递的问题
    if (options.question) {
      initialData.question = decodeURIComponent(options.question);
    }
    
    // 初始化卡牌列表数据
    const cardListData = this._prepareCardListData();
    
    // 合并所有初始数据，一次性 setData
    this.setData({
      ...initialData,
      ...cardListData
    });
  },
  
  /**
   * 准备卡牌列表数据（不执行 setData，只返回数据对象）
   * @returns {Object} 卡牌列表相关的 data 数据
   */
  _prepareCardListData() {
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
    
    // 返回需要设置到 data 的数据对象
    return {
      cardList: cardList,
      scrollOffset: initialOffset,
      selectedIndex: initialSelectedIndex,
      isFlipped: false
    };
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
  async onAnalyzeAnswer() {
    log.info('onAnalyzeAnswer', '点击抽卡');
    
    // 同步检查：如果正在抽卡，直接返回（防止重复点击）
    if (this.isDrawingCard) {
      log.warn('onAnalyzeAnswer', '正在抽卡中，忽略重复点击');
      return;
    }
    
    // 设置抽卡标志
    this.isDrawingCard = true;
    
    // 获取按钮组件引用（用于错误时重置状态）
    const buttonComponent = this.selectComponent('#loading-button-draw');
    
    // 如果已经翻转，先翻转回来，等翻转动画完成后再清空图片路径
    if (this.data.isFlipped) {
      // 取消之前的延迟清空操作（如果存在）
      if (this.clearImagePathTimer) {
        clearTimeout(this.clearImagePathTimer);
        this.clearImagePathTimer = null;
      }
      
      // 先翻转回来
      this.setData({
        isFlipped: false
      });
      
      // 等翻转动画完成（0.6s）后再清空数据，避免图片瞬间消失
      this.clearImagePathTimer = setTimeout(() => {
        this.setData({
          selectedCard: null,
          selectedCardImagePath: ''
        });
        this.clearImagePathTimer = null;
      }, 600); // 与 CSS 中的 transition 时间一致
    }
    
    // 随机选择一个甲子（同步操作，很快）
    const randomCard = this._selectRandomCard();
    log.info('onAnalyzeAnswer', '随机选择卡牌', { 
      cardNumber: randomCard.cardNumber, 
      cardName: randomCard.cardName 
    });
    
    // 获取对应的卡片图片信息（同步操作，很快）
    const imageInfo = getBaziImageById(randomCard.cardNumber);
    if (!imageInfo) {
      log.error('onAnalyzeAnswer', '找不到对应的卡片图片', { cardNumber: randomCard.cardNumber });
      wx.showToast({
        title: '获取卡片图片失败',
        icon: 'none',
        duration: 2000
      });
      // 重置按钮状态和抽卡标志
      if (buttonComponent) {
        buttonComponent.reset();
      }
      this.isDrawingCard = false;
      return;
    }
    
    // 取消之前的延迟清空操作（如果存在）
    if (this.clearImagePathTimer) {
      clearTimeout(this.clearImagePathTimer);
      this.clearImagePathTimer = null;
    }
    
    // 先保存选中的卡牌信息（不等待图片加载）
    this.setData({
      selectedCard: randomCard
    });
    
    // 立即开始抽卡动画（不等待图片加载）
    this._startDrawCardAnimation();
    
    // 在后台异步加载图片（不阻塞动画）
    // 优先使用缓存，如果没有缓存则先返回云存储路径，让微信自动处理
    this._loadCardImageAsync(imageInfo, randomCard, buttonComponent);
  },
  
  /**
   * 异步加载卡牌图片（不阻塞动画）
   * @param {Object} imageInfo - 图片信息
   * @param {Object} randomCard - 选中的卡牌
   * @param {Object} buttonComponent - 按钮组件引用
   */
  async _loadCardImageAsync(imageInfo, randomCard, buttonComponent) {
    try {
      // 先检查缓存，如果缓存存在则立即返回
      const cacheInfo = imageCacheManager.getCacheInfo(imageInfo.imagePath);
      if (cacheInfo) {
        // 缓存存在，立即设置图片路径
        log.info('_loadCardImageAsync', '使用缓存图片', { 
          cardNumber: randomCard.cardNumber,
          imagePath: cacheInfo.localPath
        });
        this.setData({
          selectedCardImagePath: cacheInfo.localPath
        });
        return;
      }
      
      // 缓存不存在，先返回云存储路径（让微信自动处理，不阻塞）
      // 这样用户可以看到动画立即开始
      log.info('_loadCardImageAsync', '缓存不存在，先使用云存储路径', { 
        cardNumber: randomCard.cardNumber,
        cloudPath: imageInfo.imagePath
      });
      this.setData({
        selectedCardImagePath: imageInfo.imagePath
      });
      
      // 在后台异步下载并缓存图片（不阻塞用户操作）
      // 下载完成后会自动更新为本地路径（但用户可能已经看到图片了）
      imageCacheManager.getImagePath(imageInfo.imagePath, imageInfo.fileName)
        .then(localPath => {
          // 下载完成，如果当前显示的还是云存储路径，则更新为本地路径
          if (this.data.selectedCardImagePath === imageInfo.imagePath) {
            log.info('_loadCardImageAsync', '图片下载完成，更新为本地路径', { 
              cardNumber: randomCard.cardNumber,
              localPath: localPath
            });
            this.setData({
              selectedCardImagePath: localPath
            });
          }
        })
        .catch(error => {
          log.error('_loadCardImageAsync', '图片下载失败（不影响使用）', { 
            cardNumber: randomCard.cardNumber,
            error: error.message
          });
          // 下载失败不影响使用，继续使用云存储路径
        });
    } catch (error) {
      log.error('_loadCardImageAsync', '加载图片失败', { error: error.message });
      // 即使出错也使用云存储路径，确保图片能显示
      this.setData({
        selectedCardImagePath: imageInfo.imagePath
      });
    }
  },
  
  /**
   * 随机选择一个甲子卡牌
   * @returns {Object} 选中的卡牌数据
   */
  _selectRandomCard() {
    // 从60甲子中随机选择一个
    const randomIndex = Math.floor(Math.random() * JIAZI_DATA.length);
    return JIAZI_DATA[randomIndex];
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
          isFlipped: true
        });
        // 重置按钮状态和抽卡标志（抽卡完成）
        const buttonComponent = this.selectComponent('#loading-button-draw');
        if (buttonComponent) {
          buttonComponent.stopLoading();
        }
        // 重置抽卡标志，允许下次抽卡
        this.isDrawingCard = false;
        console.log('[_startDrawCardAnimation] 抽卡完成');
      }, 50); // 50ms后翻转卡牌
      
    }, animationDuration);
  },

  /**
   * AI解读按钮点击事件
   */
  async onAIInterpret() {
    log.info('onAIInterpret', '点击AI解读');
    
    // 同步检查：如果正在解读，直接返回（防止重复点击）
    if (this.isInterpreting) {
      log.warn('onAIInterpret', '正在解读中，忽略重复点击');
      return;
    }
    
    // 验证是否有选中的卡牌（组件已通过 disabled 属性处理，这里作为双重保险）
    if (!this.data.selectedCard || !this.data.selectedCard.cardName) {
      wx.showToast({
        title: '请先抽卡',
        icon: 'none',
        duration: 2000
      });
      // 重置按钮状态
      const buttonComponent = this.selectComponent('#loading-button-interpret');
      if (buttonComponent) {
        buttonComponent.reset();
      }
      return;
    }
    
    // 获取选中的干支名称
    const baziName = this.data.selectedCard.cardName;
    
    // 设置解读标志
    this.isInterpreting = true;
    
    // 获取按钮组件引用（用于错误时重置状态）
    const buttonComponent = this.selectComponent('#loading-button-interpret');
    
    // 显示加载提示（使用标志确保只显示一次）
    let loadingShown = false;
    try {
      wx.showLoading({
        title: 'AI解读中...',
        mask: true
      });
      loadingShown = true;
    } catch (e) {
      log.warn('onAIInterpret', 'showLoading 失败', { error: e.message });
    }
    
    try {
      // 通过版本管理器获取云函数名称
      const functionName = VersionManager.getFunctionName('cozeFunctions');
      log.info('onAIInterpret', '调用云函数', { 
        functionName, 
        bazi_name: baziName,
        question: this.data.question 
      });
      
      // 调用云函数
      const result = await wx.cloud.callFunction({
        name: functionName,
        data: {
          workflowType: 'DRAW_CARD', // 使用抽卡工作流，如需专门的解读工作流请修改此处
          parameters: {
            bazi_name: baziName, // DRAW_CARD工作流需要bazi_name参数，使用抽中的卡牌名称
            question: this.data.question || '' // question为可选参数
          }
        }
      });
      
      log.info('onAIInterpret', '云函数调用结果', result);
      
      // 处理返回结果
      if (result.result && result.result.success) {
        const data = result.result.data;
        
        // 提取并打印 debug_url 和 usage（用于分析）
        if (data.debug_url) {
          log.info('onAIInterpret', 'Coze工作流调试链接', { debug_url: data.debug_url });
        }
        
        if (data.usage) {
          log.info('onAIInterpret', 'Coze工作流Token使用情况', {
            token_count: data.usage.token_count,
            output_count: data.usage.output_count,
            input_count: data.usage.input_count
          });
        }
        
        // 提取AI解读结果
        let interpretation = '';
        if (data.data) {
          try {
            // data.data 是一个 JSON 字符串，需要先解析
            const parsedData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
            
            // 从解析后的对象中提取 data 字段（这是实际的解读内容）
            if (parsedData && parsedData.data) {
              interpretation = parsedData.data;
              
              // 处理转义字符：JSON.parse 后，\\n 会变成 \n（反斜杠+n字符），需要转换为真正的换行符
              // 注意：先处理转义序列，最后处理双反斜杠，避免转义序列被误处理
              interpretation = interpretation
                .replace(/\\n/g, '\n')            // 换行符
                .replace(/\\"/g, '"')             // 双引号
                .replace(/\\'/g, "'")             // 单引号
                .replace(/\\t/g, '\t')            // 制表符
                .replace(/\\r/g, '\r')            // 回车符
                .replace(/\\\\/g, '\\');          // 最后处理双反斜杠（保留单个反斜杠）
            } else {
              // 如果解析后没有 data 字段，尝试其他字段
              interpretation = parsedData.output || parsedData.result || parsedData.text || JSON.stringify(parsedData);
            }
          } catch (parseError) {
            log.error('onAIInterpret', '解析返回数据失败', { error: parseError.message, rawData: data.data });
            // 如果解析失败，尝试直接使用原始数据
            interpretation = typeof data.data === 'string' ? data.data : JSON.stringify(data.data);
          }
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
        // 云函数调用成功，但返回失败状态
        // 尝试提取数据，即使 success 为 false 也可能有数据返回
        const errorMsg = result.result?.error || '解读失败，请重试';
        const data = result.result?.data;
        
        // 如果返回了数据，尝试解析并显示
        if (data && data.data) {
          try {
            const parsedData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
            let interpretation = '';
            
            if (parsedData && parsedData.data) {
              interpretation = parsedData.data;
              interpretation = interpretation
                .replace(/\\n/g, '\n')
                .replace(/\\"/g, '"')
                .replace(/\\'/g, "'")
                .replace(/\\t/g, '\t')
                .replace(/\\r/g, '\r')
                .replace(/\\\\/g, '\\');
            } else {
              interpretation = parsedData.output || parsedData.result || parsedData.text || JSON.stringify(parsedData);
            }
            
            if (interpretation) {
              // 有数据，显示数据但记录警告
              this.setData({
                aiInterpretation: interpretation
              });
              log.warn('onAIInterpret', '云函数返回失败状态但有数据', { error: errorMsg, interpretation });
              wx.showToast({
                title: '解读完成（可能有错误）',
                icon: 'none',
                duration: 2000
              });
            } else {
              // 没有数据，显示错误
              log.error('onAIInterpret', '云函数返回失败且无数据', { error: errorMsg });
              wx.showToast({
                title: errorMsg,
                icon: 'none',
                duration: 2000
              });
            }
          } catch (parseError) {
            log.error('onAIInterpret', '解析失败数据失败', { error: parseError.message });
            wx.showToast({
              title: errorMsg,
              icon: 'none',
              duration: 2000
            });
          }
        } else {
          // 没有数据，显示错误
          log.error('onAIInterpret', '云函数返回失败', { error: errorMsg });
          wx.showToast({
            title: errorMsg,
            icon: 'none',
            duration: 2000
          });
        }
      }
    } catch (error) {
      log.error('onAIInterpret', '调用云函数失败', { error: error.message });
      
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
      // 隐藏加载提示（确保配对）
      if (loadingShown) {
        try {
          wx.hideLoading();
        } catch (e) {
          log.warn('onAIInterpret', 'hideLoading 失败', { error: e.message });
        }
      }
      // 重置按钮状态和解读标志
      if (buttonComponent) {
        buttonComponent.stopLoading();
      }
      this.isInterpreting = false;
    }
  }
});

