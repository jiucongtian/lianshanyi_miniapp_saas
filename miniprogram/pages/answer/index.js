const { VersionManager } = require('../../utils/manager/versionManager');
const { createModuleLogger } = require('../../utils/logger/index');
const log = createModuleLogger('AnswerPage');

// 引入60甲子数据（统一数据源）
const { JIAZI_DATA } = require('../../utils/jiaziData');
// 引入图片映射工具
const { getBaziImageById } = require('../../utils/baziImageMap');
// 引入图片缓存管理器
const { imageCacheManager } = require('../../utils/manager/imageCacheManager');
// 引入抽卡服务（暂时注释，只测试配额显示）
// const { drawCardService } = require('../../services/DrawCardService');
// 引入海报生成器
const { posterGenerator } = require('../../utils/posterGenerator');
// 引入功能控制器（用于智慧洞见按次付费）
const { FunctionController } = require('../../controllers/FunctionController');

Page({
  data: {
    question: '', // 用户的问题
    aiInterpretation: '', // AI解读结果
    // 按钮显示控制
    showDrawButton: true, // 是否显示抽卡按钮（初始显示）
    showInterpretButton: false, // 是否显示AI解读按钮（初始隐藏）
    showShareButton: false, // 是否显示分享海报按钮（AI解读完成后显示）
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
    selectedCardImagePath: '', // 选中卡牌的图片路径
    // 配额信息（统一使用智慧洞见配额，包含免费 + 付费）
    wisdomInsightQuota: null, // FunctionQuotaBean（包含 freeRemaining + paidRemaining）
    drawButtonText: '抽卡' // 抽卡按钮文本（包含剩余次数）
  },
  
  // 延迟清空定时器ID
  clearImagePathTimer: null,
  // 抽卡操作进行中标志（同步标志，防止重复点击）
  isDrawingCard: false,
  // AI解读操作进行中标志（同步标志，防止重复点击）
  isInterpreting: false,
  // Canvas相关
  canvasContext: null,
  canvas: null,
  
  async onLoad(options) {
    console.log('[AnswerPage] 页面加载');
    
    // 初始化功能控制器
    this.functionController = new FunctionController(this);
    
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
    
    // 加载智慧洞见配额信息（包含免费配额 + 付费配额）
    await this._loadQuotaInfo();
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
    // 同步检查：如果正在抽卡，直接返回（防止重复点击）
    // 这个检查必须在日志之前，避免日志被打印两次
    if (this.isDrawingCard) {
      log.warn('onAnalyzeAnswer', '正在抽卡中，忽略重复点击');
      return;
    }
    
    // 立即设置标志，防止在异步操作期间重复触发
    this.isDrawingCard = true;
    
    log.info('onAnalyzeAnswer', '点击抽卡');
    
    // ========== 配额检查 ==========
    // 先获取按钮组件引用（用于配额检查失败时重置状态）
    const buttonComponent = this.selectComponent('#loading-button-draw');
    
    const quotaCheck = await this._checkDrawQuota();
    if (!quotaCheck || !quotaCheck.canDraw) {
      // 配额检查失败，重置按钮状态和抽卡标志
      if (buttonComponent) {
        buttonComponent.reset();
      }
      this.isDrawingCard = false; // 重置抽卡标志，允许下次点击
      this._showQuotaError(quotaCheck);
      return;
    }
    // ==============================
    
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
          selectedCardImagePath: '',
          // 重新抽卡时：显示抽卡按钮，隐藏AI解读按钮和结果
          showDrawButton: true,
          showInterpretButton: false,
          showShareButton: false,
          aiInterpretation: ''
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
   * 格式化卡牌信息提示
   * @param {Object} selectedCard - 选中的卡牌
   * @returns {string} 格式化后的卡牌信息提示
   */
  _formatCardInfoHint(selectedCard) {
    if (!selectedCard || !selectedCard.cardNumber || !selectedCard.cardName) {
      return '';
    }
    
    // 格式化卡牌序号为两位数
    const cardNumberStr = selectedCard.cardNumber < 10 
      ? `0${selectedCard.cardNumber}` 
      : `${selectedCard.cardNumber}`;
    
    return `您抽的这张卡牌是生命智慧卡牌的【${cardNumberStr}号】卡牌【${selectedCard.cardName}】\n\n`;
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
          // 抽卡完成后：隐藏抽卡按钮，不显示AI解读按钮（等待自动解读结果）
          showDrawButton: false,
          showInterpretButton: false
        });
        // 重置按钮状态和抽卡标志（抽卡完成）
        const buttonComponent = this.selectComponent('#loading-button-draw');
        if (buttonComponent) {
          buttonComponent.stopLoading();
        }
        // 重置抽卡标志，允许下次抽卡
        this.isDrawingCard = false;
        console.log('[_startDrawCardAnimation] 抽卡完成');
        
        // 抽卡动画完成后，自动调用AI解读功能
        // 延迟一小段时间，让翻转动画完成
        setTimeout(() => {
          this.onAIInterpret(true); // true 表示自动调用
        }, 100);
      }, 50); // 50ms后翻转卡牌
      
    }, animationDuration);
  },

  /**
   * AI解读按钮点击事件（使用功能按次付费系统）
   * @param {boolean} isAutoCall - 是否为自动调用（抽卡后自动调用）
   */
  async onAIInterpret(isAutoCall = false) {
    if (isAutoCall) {
      log.info('onAIInterpret', '自动调用AI解读（抽卡后）');
    } else {
      log.info('onAIInterpret', '点击AI解读');
    }
    
    // 同步检查：如果正在解读，直接返回（防止重复点击）
    if (this.isInterpreting) {
      log.warn('onAIInterpret', '正在解读中，忽略重复调用');
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
    
    try {
      // 使用功能控制器调用智慧洞见功能（自动处理配额检查、扣除、支付等）
      log.info('onAIInterpret', '调用智慧洞见功能', { 
        bazi_name: baziName,
        question: this.data.question 
      });
      
      const result = await this.functionController.useFunction('wisdom_insight', {
        parameters: {
          bazi_name: baziName,
          question: this.data.question || ''
        }
      }, {
        showLoading: false, // 不使用自动加载提示，手动控制
        autoPayment: true,
        onQuotaInsufficient: () => {
          // 配额不足时的自定义处理
          log.warn('onAIInterpret', '智慧洞见配额不足');
          // 返回 true 继续显示支付弹窗，返回 false 取消
          return true;
        }
      });
      
      // 如果返回 null，说明调用失败（配额不足、权限问题等）
      if (!result) {
        log.warn('onAIInterpret', '功能调用失败或被取消');
        // 解读失败：显示AI解读按钮，让用户可以重试
        this.setData({
          showInterpretButton: true
        });
        return;
      }
      
      log.info('onAIInterpret', '功能调用成功', { result });
      
      // 提取功能返回结果
      // FunctionController 返回：{ functionResult: {...}, quotaInfo: {...} }
      // functionResult 是云函数返回的完整数据：{ success: true, data: {...} }
      const functionResult = result.functionResult;
      
      if (functionResult && functionResult.data) {
        const data = functionResult.data;
        
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
        
        // 拼接卡牌信息到解读结果最前面
        const cardInfoHint = this._formatCardInfoHint(this.data.selectedCard);
        const finalInterpretation = cardInfoHint + interpretation;
        
        this.setData({
          aiInterpretation: finalInterpretation,
          // AI解读成功：不显示AI解读按钮（从头到尾都不显示）
          showInterpretButton: false,
          // 显示分享海报按钮
          showShareButton: true
        });
        
        log.info('onAIInterpret', 'AI解读成功', { interpretation, isAutoCall });
        
        // 刷新智慧洞见配额信息
        await this._loadQuotaInfo();
        
        // 如果是自动调用，不显示toast（避免打断用户体验）
        if (!isAutoCall) {
          wx.showToast({
            title: '解读成功',
            icon: 'success',
            duration: 2000
          });
        }
      } else {
        // 功能调用返回了数据但解析失败
        log.error('onAIInterpret', '功能调用成功但未返回数据', { 
          isAutoCall,
          functionResult,
          hasData: !!functionResult?.data
        });
        this.setData({
          showInterpretButton: true
        });
        wx.showToast({
          title: '解读失败，请重试',
          icon: 'none',
          duration: 2000
        });
      }
    } catch (error) {
      log.error('onAIInterpret', '调用功能失败', { error: error.message, isAutoCall });
      
      // 解读失败：显示AI解读按钮，让用户可以重试
      this.setData({
        showInterpretButton: true
      });
      
      wx.showToast({
        title: '功能调用失败，请重试',
        icon: 'none',
        duration: 2000
      });
    } finally {
      // 重置按钮状态和解读标志
      if (buttonComponent) {
        buttonComponent.stopLoading();
      }
      this.isInterpreting = false;
    }
  },
  
  /**
   * 获取抽卡按钮文本（包含剩余次数）
   * 统一使用智慧洞见配额（包含免费 + 付费）
   * @param {FunctionQuotaBean} quotaInfo - 智慧洞见配额信息
   * @returns {string} 按钮文本
   */
  _getDrawButtonText(quotaInfo) {
    if (!quotaInfo) {
      log.warn('_getDrawButtonText', 'quotaInfo 为空，返回默认文本');
      return '抽卡';
    }
    
    try {
      // 直接使用智慧洞见配额的总配额
      const totalRemaining = quotaInfo.totalRemaining;
      
      log.info('_getDrawButtonText', '配额信息', { 
        freeRemaining: quotaInfo.freeRemaining,
        paidRemaining: quotaInfo.paidRemaining,
        totalRemaining: totalRemaining
      });
      
      // 根据总配额生成按钮文本
      if (totalRemaining > 0) {
        return `抽卡（剩余${totalRemaining}次）`;
      } else {
        return '抽卡（需付费）';
      }
    } catch (error) {
      log.error('_getDrawButtonText', '获取按钮文本异常', error);
      return '抽卡';
    }
  },
  
  /**
   * 检查抽卡配额（统一使用智慧洞见配额）
   * @returns {Promise<Object|null>} 配额信息，失败返回null
   */
  async _checkDrawQuota() {
    try {
      // 直接使用智慧洞见配额
      const quotaInfo = this.data.wisdomInsightQuota;
      
      if (!quotaInfo) {
        log.error('_checkDrawQuota', '配额信息未加载');
        return {
          canDraw: false,
          error: '配额信息加载失败，请刷新页面',
          code: -1
        };
      }
      
      const canDraw = quotaInfo.canUse && quotaInfo.totalRemaining > 0;
      
      log.info('_checkDrawQuota', '配额检查结果', {
        freeRemaining: quotaInfo.freeRemaining,
        paidRemaining: quotaInfo.paidRemaining,
        totalRemaining: quotaInfo.totalRemaining,
        canDraw: canDraw
      });
      
      if (!canDraw) {
        // 不能抽卡，返回错误信息
        let error = '配额已用完，请购买后继续使用';
        let code = 1003;
        
        return {
          canDraw: false,
          error: error,
          code: code,
          freeRemaining: quotaInfo.freeRemaining,
          paidRemaining: quotaInfo.paidRemaining,
          totalRemaining: quotaInfo.totalRemaining
        };
      }
      
      // 可以抽卡
      return {
        canDraw: true,
        freeRemaining: quotaInfo.freeRemaining,
        paidRemaining: quotaInfo.paidRemaining,
        totalRemaining: quotaInfo.totalRemaining
      };
    } catch (error) {
      log.error('_checkDrawQuota', '检查配额异常', error);
      return {
        canDraw: false,
        error: '网络错误，请重试',
        code: -1
      };
    }
  },
  
  /**
   * 记录抽卡历史（暂时注释，只测试配额显示）
   * @param {Object} card - 卡牌信息
   * @param {string} question - 用户问题
   * @param {string} aiAnswer - AI解读结果
   */
  // async _recordDrawHistory(card, question, aiAnswer) {
  //   try {
  //     // 获取云函数版本号（如果可用）
  //     const cloudFunctionVersion = VersionManager.getFunctionName('cozeFunctions');
  //     
  //     const response = await drawCardService.recordDraw({
  //       question: question || '',
  //       cardNumber: card.cardNumber,
  //       cardName: card.cardName,
  //       aiAnswer: aiAnswer,
  //       drawTime: new Date(), // 抽卡时间
  //       cloudFunctionVersion: cloudFunctionVersion
  //     });
  //     
  //     if (response.success) {
  //       log.info('_recordDrawHistory', '记录成功', { recordId: response.data?.recordId });
  //     } else {
  //       log.warn('_recordDrawHistory', '记录失败（不影响使用）', response.error);
  //       // 静默处理，不影响用户体验
  //     }
  //   } catch (error) {
  //     log.error('_recordDrawHistory', '记录异常（不影响使用）', error);
  //     // 静默处理
  //   }
  // },
  
  /**
   * 显示配额错误提示
   * @param {Object} quotaInfo - 配额信息（包含错误信息）
   */
  _showQuotaError(quotaInfo) {
    if (!quotaInfo) {
      wx.showToast({
        title: '暂时无法使用抽卡功能',
        icon: 'none',
        duration: 2500
      });
      return;
    }
    
    let message = quotaInfo.error || '暂时无法使用抽卡功能';
    
    // 根据错误码显示不同提示
    switch (quotaInfo.code) {
      case 1001: // 未注册用户
        message = '请先注册后使用抽卡功能';
        break;
      case 1002: // 用户类型不支持
        message = '您当前的用户类型不支持抽卡功能';
        break;
      case 1003: // 配额用完
        const totalQuota = quotaInfo.totalQuota || 3;
        message = `今日抽卡次数已用完（${totalQuota}次/天），明天再来吧~`;
        break;
      default:
        // 使用原始错误信息
        break;
    }
    
    wx.showToast({
      title: message,
      icon: 'none',
      duration: 2500
    });
  },

  /**
   * 生成分享海报
   */
  async onGeneratePoster() {
    log.info('onGeneratePoster', '点击生成海报');

    // 验证数据
    if (!this.data.selectedCard || !this.data.aiInterpretation) {
      wx.showToast({
        title: '请先完成抽卡和AI解读',
        icon: 'none',
        duration: 2000
      });
      const buttonComponent = this.selectComponent('#loading-button-share');
      if (buttonComponent) {
        buttonComponent.reset();
      }
      return;
    }

    try {
      // 获取Canvas上下文（如果还没有获取）
      if (!this.canvas || !this.canvasContext) {
        await this._initCanvas();
      }

      if (!this.canvas || !this.canvasContext) {
        throw new Error('Canvas初始化失败');
      }

      // 生成海报
      const posterPath = await posterGenerator.generatePoster({
        cardImagePath: this.data.selectedCardImagePath,
        cardName: this.data.selectedCard.cardName,
        cardNumber: this.data.selectedCard.cardNumber,
        question: this.data.question || '', // 传入用户问题
        aiInterpretation: this.data.aiInterpretation,
        canvasContext: this.canvasContext,
        canvas: this.canvas
      });

      log.info('onGeneratePoster', '海报生成成功', { posterPath });

      // 重置按钮状态
      const buttonComponent = this.selectComponent('#loading-button-share');
      if (buttonComponent) {
        buttonComponent.stopLoading();
      }

      // 预览海报
      wx.previewImage({
        urls: [posterPath],
        current: posterPath,
        success: () => {
          log.info('onGeneratePoster', '海报预览成功');
        },
        fail: (err) => {
          log.error('onGeneratePoster', '海报预览失败', err);
          // 预览失败，提示用户保存到相册
          this._savePosterToAlbum(posterPath);
        }
      });

    } catch (error) {
      log.error('onGeneratePoster', '生成海报失败', error);
      
      // 重置按钮状态
      const buttonComponent = this.selectComponent('#loading-button-share');
      if (buttonComponent) {
        buttonComponent.reset();
      }

      wx.showToast({
        title: '生成海报失败，请重试',
        icon: 'none',
        duration: 2000
      });
    }
  },

  /**
   * 初始化Canvas
   */
  async _initCanvas() {
    return new Promise((resolve, reject) => {
      const query = wx.createSelectorQuery();
      query.select('#posterCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res || !res[0]) {
            log.error('_initCanvas', 'Canvas节点查询失败');
            reject(new Error('Canvas节点查询失败'));
            return;
          }

          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');

          this.canvas = canvas;
          this.canvasContext = ctx;

          log.info('_initCanvas', 'Canvas初始化成功');
          resolve();
        });
    });
  },

  /**
   * 保存海报到相册
   */
  _savePosterToAlbum(posterPath) {
    wx.showModal({
      title: '保存海报',
      content: '是否保存海报到相册？',
      success: (res) => {
        if (res.confirm) {
          wx.saveImageToPhotosAlbum({
            filePath: posterPath,
            success: () => {
              wx.showToast({
                title: '保存成功',
                icon: 'success',
                duration: 2000
              });
              log.info('_savePosterToAlbum', '海报保存到相册成功');
            },
            fail: (err) => {
              log.error('_savePosterToAlbum', '保存到相册失败', err);
              
              if (err.errMsg.includes('auth deny')) {
                wx.showModal({
                  title: '提示',
                  content: '需要您授权保存图片到相册',
                  confirmText: '去设置',
                  success: (modalRes) => {
                    if (modalRes.confirm) {
                      wx.openSetting();
                    }
                  }
                });
              } else {
                wx.showToast({
                  title: '保存失败',
                  icon: 'none',
                  duration: 2000
                });
              }
            }
          });
        }
      }
    });
  },

  /**
   * 加载智慧洞见配额信息（包含免费配额 + 付费配额）
   * @private
   */
  async _loadQuotaInfo() {
    try {
      const quotaInfo = await this.functionController.refreshQuota('wisdom_insight');
      if (quotaInfo) {
        log.info('_loadQuotaInfo', '智慧洞见配额信息', quotaInfo.toObject());
        
        // 保存到页面数据
        this.setData({
          wisdomInsightQuota: quotaInfo
        });
        
        // 生成按钮文本
        const buttonText = this._getDrawButtonText(quotaInfo);
        this.setData({
          drawButtonText: buttonText
        });
        
        log.info('_loadQuotaInfo', '配额加载成功', {
          freeRemaining: quotaInfo.freeRemaining,
          paidRemaining: quotaInfo.paidRemaining,
          totalRemaining: quotaInfo.totalRemaining,
          buttonText: buttonText
        });
      }
    } catch (error) {
      log.error('_loadQuotaInfo', '加载配额信息失败', { error: error.message });
      // 配额信息加载失败不影响主流程，静默处理
      this.setData({
        drawButtonText: '抽卡'
      });
    }
  }
});

