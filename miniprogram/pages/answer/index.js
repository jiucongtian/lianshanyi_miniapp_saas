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
// 引入FunctionQuotaBean
const { FunctionQuotaBean } = require('../../beans/FunctionQuotaBean');
// 引入支付服务
const { paymentService } = require('../../services/PaymentService');
// 获取app实例
const app = getApp();

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
    drawButtonText: '抽卡', // 抽卡按钮文本（固定为"抽卡"）
    interpretButtonText: 'AI解读', // AI解读按钮文本（显示剩余配额）
    interpretLoadingText: '解读中...', // AI解读按钮loading时的文本（动态更新进度）
    // 卡牌预览相关
    showCardPreview: false, // 是否显示卡牌预览
    previewImagePath: '', // 预览图片路径
    previewCardDescription: null, // 预览卡牌描述信息
    // 大赏相关
    rewardCount: 1300, // 赞赏人数（从服务器获取，暂时使用默认值用于展示）
    rewardCountText: '1.3k', // 格式化后的赞赏人数文本
    isRewarding: false, // 是否正在赞赏中
    selectedRewardAmount: 6.66, // 选中的赞赏金额（默认选中6.66）
    customRewardAmount: '', // 自定义金额输入
    showCustomInput: false, // 是否显示自定义金额输入框
    showRewardOptions: false, // 是否显示金额选择区域（默认隐藏）
    // 预设金额列表
    presetAmounts: [
      { amount: 1, label: '一帆风顺', recommended: false },
      { amount: 6.66, label: '顺顺利利', recommended: false },
      { amount: 8.88, label: '财源广进', recommended: false }
    ],
    // 咨询真人客服相关
    consultantAvatar: '', // 客服头像URL
    consultantName: '真人客服', // 客服名称
    consultantOnline: true, // 客服是否在线
    showKefuModal: false // 是否显示客服二维码弹窗
  },
  
  // 延迟清空定时器ID
  clearImagePathTimer: null,
  // 抽卡操作进行中标志（同步标志，防止重复点击）
  isDrawingCard: false,
  // AI解读操作进行中标志（同步标志，防止重复点击）
  isInterpreting: false,
  // AI解读进度定时器ID
  interpretProgressTimer: null,
  // AI解读开始时间（用于计算进度）
  interpretStartTime: null,
  // 原始按钮文字（用于解读完成后恢复）
  originalInterpretButtonText: null,
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
    
    // 优先使用预加载的配额信息，避免数值跳变
    await this._loadQuotaInfo();
    
    // 初始化赞赏人数显示文本
    this._updateRewardCountDisplay(this.data.rewardCount);
    
    // 加载赞赏人数统计
    await this._loadRewardCount();
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
    // 调用 FunctionController 的 onShow，用于恢复支付状态
    if (this.functionController) {
      this.functionController.onShow();
    }
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
          // 抽卡完成后：隐藏抽卡按钮，显示AI解读按钮
          showDrawButton: false,
          showInterpretButton: true
        });
        // 重置按钮状态和抽卡标志（抽卡完成）
        const buttonComponent = this.selectComponent('#loading-button-draw');
        if (buttonComponent) {
          buttonComponent.stopLoading();
        }
        // 重置抽卡标志，允许下次抽卡
        this.isDrawingCard = false;
        console.log('[_startDrawCardAnimation] 抽卡完成');
        
        // 刷新AI解读按钮文案（显示配额信息）
        this._updateInterpretButtonText();
      }, 50); // 50ms后翻转卡牌
      
    }, animationDuration);
  },

  /**
   * 处理AI解读结果
   * @private
   * @param {Object} result - 功能调用结果
   * @param {Object} buttonComponent - 按钮组件引用
   * @param {boolean} isAutoCall - 是否为自动调用
   */
  async _handleInterpretResult(result, buttonComponent, isAutoCall) {
    log.info('_handleInterpretResult', '处理AI解读结果', { isAutoCall });
    
    // 提取功能返回结果
    // FunctionController 返回：{ functionResult: {...}, quotaInfo: {...} }
    // functionResult 就是 Coze API 返回的原始数据
    const functionResult = result.functionResult;
    
    // 添加详细日志：打印 functionResult 的完整结构
    log.info('_handleInterpretResult', 'functionResult 完整结构', {
      hasFunctionResult: !!functionResult,
      functionResultType: typeof functionResult,
      functionResultKeys: functionResult ? Object.keys(functionResult).slice(0, 10) : [],
      hasData: functionResult && 'data' in functionResult,
      dataType: functionResult?.data ? typeof functionResult.data : 'undefined'
    });
    
    if (functionResult && functionResult.data) {
      // functionResult 就是 Coze API 返回的数据
      // functionResult.data 就是 AI 解读结果（JSON 字符串）
      const cozeData = functionResult.data;
      
      // 提取并打印 debug_url 和 usage（用于分析）
      if (functionResult.debug_url) {
        log.info('_handleInterpretResult', 'Coze工作流调试链接', { debug_url: functionResult.debug_url });
      }
      
      if (functionResult.usage) {
        log.info('_handleInterpretResult', 'Coze工作流Token使用情况', {
          token_count: functionResult.usage.token_count,
          output_count: functionResult.usage.output_count,
          input_count: functionResult.usage.input_count
        });
      }
      
      // 提取AI解读结果
      let interpretation = '';
      if (cozeData) {
        try {
          log.info('_handleInterpretResult', '开始解析 cozeData', {
            cozeDataType: typeof cozeData,
            cozeDataLength: typeof cozeData === 'string' ? cozeData.length : 'not string',
            cozeDataPreview: typeof cozeData === 'string' ? cozeData.substring(0, 100) : cozeData
          });
          
          // cozeData 是一个 JSON 字符串，需要先解析
          const parsedData = typeof cozeData === 'string' ? JSON.parse(cozeData) : cozeData;
          
          log.info('_handleInterpretResult', '解析后的 parsedData', {
            parsedDataType: typeof parsedData,
            parsedDataKeys: parsedData ? Object.keys(parsedData) : [],
            hasDataField: parsedData && 'data' in parsedData,
            dataFieldType: parsedData?.data ? typeof parsedData.data : 'undefined'
          });
          
          // 从解析后的对象中提取 data 字段（这是实际的解读内容）
          if (parsedData && parsedData.data) {
            interpretation = parsedData.data;
            
            log.info('_handleInterpretResult', '提取到的原始 interpretation', {
              length: interpretation.length,
              preview: interpretation.substring(0, 100)
            });
            
            // 处理转义字符：JSON.parse 后，\\n 会变成 \n（反斜杠+n字符），需要转换为真正的换行符
            interpretation = interpretation
              .replace(/\\n/g, '\n')
              .replace(/\\"/g, '"')
              .replace(/\\'/g, "'")
              .replace(/\\t/g, '\t')
              .replace(/\\r/g, '\r')
              .replace(/\\\\/g, '\\');
              
            log.info('_handleInterpretResult', '转义处理后的 interpretation', {
              length: interpretation.length,
              preview: interpretation.substring(0, 100)
            });
          } else {
            // 如果解析后没有 data 字段，尝试其他字段
            log.warn('_handleInterpretResult', 'parsedData 没有 data 字段，尝试其他字段', {
              hasOutput: parsedData && 'output' in parsedData,
              hasResult: parsedData && 'result' in parsedData,
              hasText: parsedData && 'text' in parsedData
            });
            interpretation = parsedData?.output || parsedData?.result || parsedData?.text || JSON.stringify(parsedData);
          }
        } catch (parseError) {
          log.error('_handleInterpretResult', '解析返回数据失败', { error: parseError.message, rawData: cozeData });
          interpretation = typeof cozeData === 'string' ? cozeData : JSON.stringify(cozeData);
        }
      } else {
        log.warn('_handleInterpretResult', 'functionResult 没有 data 字段', {
          functionResultKeys: Object.keys(functionResult).slice(0, 10)
        });
      }
      
      // 拼接卡牌信息到解读结果最前面
      const cardInfoHint = this._formatCardInfoHint(this.data.selectedCard);
      const finalInterpretation = cardInfoHint + interpretation;
      
      this.setData({
        aiInterpretation: finalInterpretation,
        // AI解读成功：隐藏抽卡按钮和AI解读按钮，只显示分享海报按钮
        showDrawButton: false,
        showInterpretButton: false,
        showShareButton: true
      });
      
      // AI解读完成后，加载赞赏人数统计
      await this._loadRewardCount();
      
      log.info('_handleInterpretResult', 'AI解读成功', { interpretation, isAutoCall });
      
      // 刷新智慧洞见配额信息
      await this._loadQuotaInfo();
      
      // 显示成功提示（自动调用时不显示，避免重复提示）
      if (!isAutoCall) {
        wx.showToast({
          title: '解读成功',
          icon: 'success',
          duration: 2000
        });
      }
    } else {
      // 功能调用返回了数据但解析失败
      log.error('_handleInterpretResult', '功能调用成功但未返回数据', { 
        functionResult,
        hasData: !!functionResult?.data
      });
      
      // 解读失败：显示AI解读按钮，让用户可以重试
      this.setData({
        showInterpretButton: true
      });
      wx.showToast({
        title: '解读失败，请重试',
        icon: 'none',
        duration: 2000
      });
    }
    
    // 重置按钮状态和解读标志
    if (buttonComponent) {
      buttonComponent.stopLoading();
    }
    this.isInterpreting = false;
  },
  
  /**
   * AI解读按钮点击事件（使用功能按次付费系统）
   * @param {boolean} isAutoCall - 是否为自动调用（支付成功后自动调用）
   */
  async onAIInterpret(isAutoCall = false) {
    log.info('onAIInterpret', isAutoCall ? '自动调用AI解读（支付成功后）' : '点击AI解读');
    
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
    
    // 保存原始按钮文字和loading文字
    this.originalInterpretButtonText = this.data.interpretButtonText;
    this.originalInterpretLoadingText = this.data.interpretLoadingText;
    
    // 如果不是自动调用，显示按钮loading状态
    if (!isAutoCall && buttonComponent) {
      buttonComponent.startLoading();
    }
    
    try {
      // 使用功能控制器调用智慧洞见功能（自动处理配额检查、扣除、支付等）
      log.info('onAIInterpret', '调用智慧洞见功能', { 
        bazi_name: baziName,
        question: this.data.question,
        isAutoCall
      });
      
      // 准备功能参数
      const functionParams = {
        parameters: {
          bazi_name: baziName,
          question: this.data.question || ''
        }
      };
      
      // 定义成功回调，用于支付成功后自动调用
      const onSuccessCallback = async (resultData) => {
        log.info('onAIInterpret', '功能调用成功（支付成功后自动调用）', { resultData });
        
        // 处理结果（异步处理）
        // 注意：按钮loading已经在 FunctionController 中显示，这里只需要处理结果
        await this._handleInterpretResult(resultData, buttonComponent, true); // 自动调用时传入 true
      };
      
      const result = await this.functionController.useFunction('wisdom_insight', functionParams, {
        showLoading: false, // 不使用自动加载提示，手动控制
        autoPayment: true,
        onQuotaInsufficient: () => {
          // 配额不足时的自定义处理
          log.warn('onAIInterpret', '智慧洞见配额不足');
          // 返回 true 继续显示支付弹窗，返回 false 取消
          return true;
        },
        onSuccess: onSuccessCallback
      });
      
      // 如果返回 null，说明调用失败（配额不足、权限问题等）
      if (!result) {
        log.warn('onAIInterpret', '功能调用失败或被取消');
        
        // 检查是否正在支付中（FunctionController 会保存待处理的调用）
        if (this.functionController._pendingFunctionCall) {
          log.info('onAIInterpret', '配额不足，正在支付中，等待支付成功后自动调用');
          // 不重置状态，等待支付成功后自动调用
          // 注意：此时不启动进度更新，因为还没有真正开始AI解读
          return;
        }
        
        // 重置解读标志
        this.isInterpreting = false;
        
        // 重置按钮状态
        if (buttonComponent) {
          buttonComponent.reset();
        }
        
        // 解读失败：显示AI解读按钮，让用户可以重试
        this.setData({
          showInterpretButton: true
        });
        return;
      }
      
      // 处理结果
      await this._handleInterpretResult(result, buttonComponent, isAutoCall);
    } catch (error) {
      log.error('onAIInterpret', '调用功能失败', { error: error.message });
      
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
      // 停止进度更新定时器
      this._stopInterpretProgress();
      
      // 恢复原始按钮文字和loading文字
      if (this.originalInterpretButtonText) {
        this.setData({
          interpretButtonText: this.originalInterpretButtonText
        });
        this.originalInterpretButtonText = null;
      }
      if (this.originalInterpretLoadingText) {
        this.setData({
          interpretLoadingText: this.originalInterpretLoadingText
        });
        this.originalInterpretLoadingText = null;
      }
      
      // 重置按钮状态和解读标志
      if (buttonComponent) {
        buttonComponent.stopLoading();
      }
      this.isInterpreting = false;
      this.interpretStartTime = null;
    }
  },
  
  /**
   * 获取抽卡按钮文本（抽卡免费，不显示配额）
   * @returns {string} 按钮文本
   */
  _getDrawButtonText() {
    return '抽卡';
  },
  
  /**
   * 获取AI解读按钮文本（显示剩余配额或价格）
   * @param {FunctionQuotaBean} quotaInfo - 智慧洞见配额信息
   * @returns {string} 按钮文本
   */
  _getInterpretButtonText(quotaInfo) {
    if (!quotaInfo) {
      log.warn('_getInterpretButtonText', 'quotaInfo 为空，返回默认文本');
      return 'AI解读';
    }
    
    try {
      // 直接使用智慧洞见配额的总配额
      const totalRemaining = quotaInfo.totalRemaining;
      
      log.info('_getInterpretButtonText', '配额信息', { 
        freeRemaining: quotaInfo.freeRemaining,
        paidRemaining: quotaInfo.paidRemaining,
        totalRemaining: totalRemaining
      });
      
      // 根据总配额生成按钮文本
      if (totalRemaining > 0) {
        return `AI解读（剩余${totalRemaining}次）`;
      } else {
        // 没有剩余次数，显示价格（1.9元/次）
        return 'AI解读（¥1.9/次）';
      }
    } catch (error) {
      log.error('_getInterpretButtonText', '获取按钮文本异常', error);
      return 'AI解读';
    }
  },
  
  /**
   * 更新AI解读按钮文案
   */
  _updateInterpretButtonText() {
    const quotaInfo = this.data.wisdomInsightQuota;
    const buttonText = this._getInterpretButtonText(quotaInfo);
    this.setData({
      interpretButtonText: buttonText
    });
  },
  
  /**
   * 启动AI解读进度更新定时器
   * 根据时间显示不同的进度状态
   * @private
   */
  _startInterpretProgress() {
    // 清除之前的定时器（如果存在）
    this._stopInterpretProgress();
    
    // 定义4个进度状态
    const progressStates = [
      { text: '开始分析卡牌信息...', time: 0 },      // 0-5秒
      { text: '调取AI知识库...', time: 5000 },  // 5-15秒
      { text: '深度思考...', time: 15000 }, // 15-30秒
      { text: '正在优化内容...', time: 30000 }      // 30-40秒
    ];
    
    let currentStateIndex = 0;
    
    // 立即显示第一个状态（更新loading文字，因为按钮处于loading状态）
    this.setData({
      interpretLoadingText: progressStates[0].text
    });
    
    // 定时更新进度状态（每1秒检查一次）
    this.interpretProgressTimer = setInterval(() => {
      if (!this.interpretStartTime) {
        // 如果开始时间不存在，停止定时器
        this._stopInterpretProgress();
        return;
      }
      
      const elapsed = Date.now() - this.interpretStartTime;
      
      // 根据已过时间确定当前应该显示的状态
      let nextStateIndex = currentStateIndex;
      for (let i = progressStates.length - 1; i >= 0; i--) {
        if (elapsed >= progressStates[i].time) {
          nextStateIndex = i;
          break;
        }
      }
      
      // 如果状态发生变化，更新按钮loading文字（因为按钮处于loading状态）
      if (nextStateIndex !== currentStateIndex) {
        currentStateIndex = nextStateIndex;
        this.setData({
          interpretLoadingText: progressStates[currentStateIndex].text
        });
        log.info('_startInterpretProgress', '更新进度状态', {
          state: progressStates[currentStateIndex].text,
          elapsed: elapsed
        });
      }
    }, 1000); // 每1秒检查一次
  },
  
  /**
   * 停止AI解读进度更新定时器
   * @private
   */
  _stopInterpretProgress() {
    if (this.interpretProgressTimer) {
      clearInterval(this.interpretProgressTimer);
      this.interpretProgressTimer = null;
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
        freeDailyQuota: quotaInfo.freeDailyQuota,
        freeUsedToday: quotaInfo.freeUsedToday,
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
   * 处理配额不足（弹出购买界面）
   */
  async _handleQuotaInsufficient() {
    log.info('_handleQuotaInsufficient', '配额不足，弹出购买界面');
    
    try {
      // 显示购买确认弹窗
      const confirmed = await new Promise((resolve) => {
        wx.showModal({
          title: '配额不足',
          content: '智慧洞见配额不足，是否立即购买？',
          confirmText: '立即购买',
          cancelText: '取消',
          success: (res) => {
            resolve(res.confirm);
          },
          fail: () => {
            resolve(false);
          }
        });
      });
      
      if (!confirmed) {
        log.info('_handleQuotaInsufficient', '用户取消购买');
        return;
      }
      
      // 用户确认购买，调用购买功能
      log.info('_handleQuotaInsufficient', '用户确认购买，调起支付');
      const purchaseSuccess = await this.functionController.purchaseFunction('wisdom_insight', {
        onSuccess: async () => {
          log.info('_handleQuotaInsufficient', '购买成功，刷新配额');
          // 购买成功后刷新配额信息
          await this._loadQuotaInfo();
        },
        onCancel: () => {
          log.info('_handleQuotaInsufficient', '用户取消支付');
        },
        onError: (error) => {
          log.error('_handleQuotaInsufficient', '支付失败', error);
        }
      });
      
      if (purchaseSuccess) {
        log.info('_handleQuotaInsufficient', '购买流程完成');
      }
    } catch (error) {
      log.error('_handleQuotaInsufficient', '处理配额不足异常', error);
      wx.showToast({
        title: '操作失败，请重试',
        icon: 'none',
        duration: 2000
      });
    }
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
   * 优先使用从home页面预加载的配额信息，避免数值跳变
   * @private
   */
  async _loadQuotaInfo() {
    try {
      // 优先使用预加载的配额信息（从home页面传递过来）
      const preloadData = app.globalData.wisdomInsightQuotaPreload;
      
      if (preloadData && preloadData.quota) {
        // 检查数据是否过期（5分钟内有效）
        const dataAge = Date.now() - (preloadData.timestamp || 0);
        const maxAge = 5 * 60 * 1000; // 5分钟
        
        if (dataAge < maxAge) {
          // 使用预加载的配额信息
          const quotaInfo = new FunctionQuotaBean(preloadData.quota);
          log.info('_loadQuotaInfo', '使用预加载的配额信息', quotaInfo.toObject());
          
          // 保存到页面数据
          this.setData({
            wisdomInsightQuota: quotaInfo
          });
          
          // 更新AI解读按钮文本（如果已显示）
          if (this.data.showInterpretButton) {
            this._updateInterpretButtonText();
          }
          
          log.info('_loadQuotaInfo', '预加载配额使用成功', {
            freeRemaining: quotaInfo.freeRemaining,
            paidRemaining: quotaInfo.paidRemaining,
            totalRemaining: quotaInfo.totalRemaining,
            freeDailyQuota: quotaInfo.freeDailyQuota,
            freeUsedToday: quotaInfo.freeUsedToday
          });
          
          // 清除预加载数据（已使用）
          delete app.globalData.wisdomInsightQuotaPreload;
          
          return;
        } else {
          log.warn('_loadQuotaInfo', '预加载数据已过期，重新获取', { dataAge });
          // 清除过期数据
          delete app.globalData.wisdomInsightQuotaPreload;
        }
      }
      
      // 如果没有预加载数据或数据已过期，则重新获取
      log.info('_loadQuotaInfo', '重新获取配额信息');
      const quotaInfo = await this.functionController.refreshQuota('wisdom_insight');
      if (quotaInfo) {
        log.info('_loadQuotaInfo', '智慧洞见配额信息', quotaInfo.toObject());
        
        // 保存到页面数据
        this.setData({
          wisdomInsightQuota: quotaInfo
        });
        
        // 更新AI解读按钮文本（如果已显示）
        if (this.data.showInterpretButton) {
          this._updateInterpretButtonText();
        }
        
        log.info('_loadQuotaInfo', '配额加载成功', {
          freeRemaining: quotaInfo.freeRemaining,
          paidRemaining: quotaInfo.paidRemaining,
          totalRemaining: quotaInfo.totalRemaining,
          freeDailyQuota: quotaInfo.freeDailyQuota,
          freeUsedToday: quotaInfo.freeUsedToday
        });
      }
    } catch (error) {
      log.error('_loadQuotaInfo', '加载配额信息失败', { error: error.message });
      // 配额信息加载失败不影响主流程，静默处理
      // 如果AI解读按钮已显示，更新为默认文本
      if (this.data.showInterpretButton) {
        this.setData({
          interpretButtonText: 'AI解读'
        });
      }
    }
  },

  /**
   * 卡牌点击事件 - 当卡牌翻转后，点击可以预览
   */
  onCardTap(e) {
    const isFlipped = e.currentTarget.dataset.isFlipped;
    
    // 只有已翻转的卡牌才能预览
    if (!isFlipped) {
      return;
    }
    
    // 检查是否有选中的卡牌和图片路径
    if (!this.data.selectedCard || !this.data.selectedCardImagePath) {
      return;
    }
    
    log.info('onCardTap', '卡牌被点击，准备预览', {
      cardName: this.data.selectedCard.cardName,
      imagePath: this.data.selectedCardImagePath
    });
    
    // 准备预览数据
    const previewDescription = this.data.selectedCard.description 
      ? {
          description: this.data.selectedCard.description,
          cardName: this.data.selectedCard.cardName,
          cardNumber: this.data.selectedCard.cardNumber
        }
      : null;
    
    // 显示预览
    this.setData({
      showCardPreview: true,
      previewImagePath: this.data.selectedCardImagePath,
      previewCardDescription: previewDescription
    });
  },

  /**
   * 关闭卡牌预览
   */
  onCloseCardPreview() {
    log.info('onCloseCardPreview', '关闭卡牌预览');
    this.setData({
      showCardPreview: false,
      previewImagePath: '',
      previewCardDescription: null
    });
  },
  
  /**
   * 选择预设金额
   */
  onSelectPresetAmount(e) {
    const amount = parseFloat(e.currentTarget.dataset.amount);
    log.info('onSelectPresetAmount', '选择预设金额', { amount });
    this.setData({
      selectedRewardAmount: amount,
      showCustomInput: false,
      customRewardAmount: ''
    });
  },
  
  /**
   * 显示自定义金额输入
   */
  onShowCustomInput() {
    log.info('onShowCustomInput', '显示自定义金额输入');
    this.setData({
      showCustomInput: true,
      customRewardAmount: ''
    });
  },
  
  /**
   * 自定义金额输入
   * 限制只能输入数字，精度最小0.01（最多两位小数）
   */
  onCustomAmountInput(e) {
    let value = e.detail.value;
    
    // 移除所有非数字和小数点的字符
    value = value.replace(/[^\d.]/g, '');
    
    // 处理多个小数点的情况，只保留第一个
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // 限制小数位数最多2位
    if (parts.length === 2 && parts[1].length > 2) {
      value = parts[0] + '.' + parts[1].substring(0, 2);
    }
    
    // 如果以小数点开头，在前面补0
    if (value.startsWith('.')) {
      value = '0' + value;
    }
    
    log.info('onCustomAmountInput', '输入自定义金额', { original: e.detail.value, filtered: value });
    this.setData({
      customRewardAmount: value
    });
  },
  
  /**
   * 确认自定义金额
   * 验证金额精度最小0.01元
   */
  onConfirmCustomAmount() {
    const inputValue = this.data.customRewardAmount.trim();
    
    if (!inputValue || inputValue === '') {
      wx.showToast({
        title: '请输入金额',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    const amount = parseFloat(inputValue);
    
    if (isNaN(amount) || amount <= 0) {
      wx.showToast({
        title: '请输入有效金额',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 验证精度：最小0.01元，最多两位小数
    if (amount < 0.01) {
      wx.showToast({
        title: '金额不能少于0.01元',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 验证小数位数（最多2位）
    const decimalPlaces = (inputValue.split('.')[1] || '').length;
    if (decimalPlaces > 2) {
      wx.showToast({
        title: '金额最多保留两位小数',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 四舍五入到2位小数
    const roundedAmount = Math.round(amount * 100) / 100;
    
    log.info('onConfirmCustomAmount', '确认自定义金额', { 
      original: inputValue, 
      amount: roundedAmount 
    });
    
    this.setData({
      selectedRewardAmount: roundedAmount,
      showCustomInput: false,
      customRewardAmount: ''
    });
  },
  
  /**
   * 取消自定义金额输入
   */
  onCancelCustomAmount() {
    log.info('onCancelCustomAmount', '取消自定义金额输入');
    this.setData({
      showCustomInput: false,
      customRewardAmount: ''
    });
  },
  
  /**
   * 点击打赏按钮（显示金额选择区域）
   */
  onShowRewardOptions() {
    log.info('onShowRewardOptions', '点击打赏按钮，显示金额选择区域');
    this.setData({
      showRewardOptions: true
    });
  },
  
  /**
   * 大赏按钮点击事件
   */
  async onReward() {
    log.info('onReward', '点击随喜赞赏按钮');
    
    // 防止重复点击
    if (this.data.isRewarding) {
      log.warn('onReward', '正在赞赏中，忽略重复点击');
      return;
    }
    
    // 获取选中的金额
    const selectedAmount = this.data.selectedRewardAmount;
    if (!selectedAmount || selectedAmount <= 0) {
      wx.showToast({
        title: '请选择赞赏金额',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 设置赞赏中标志
    this.setData({ isRewarding: true });
    
    try {
      // 将元转换为分（微信支付单位）
      const rewardAmount = Math.round(selectedAmount * 100);
      
      log.info('onReward', '创建赞赏订单', { amount: rewardAmount, yuan: selectedAmount });
      
      const orderResponse = await paymentService.createPaymentOrder({
        description: `AI解读赞赏 ¥${selectedAmount}`,
        amount: rewardAmount,
        orderType: 'reward',
        orderData: {
          cardName: this.data.selectedCard?.cardName || '',
          cardNumber: this.data.selectedCard?.cardNumber || 0,
          question: this.data.question || '',
          rewardAmount: selectedAmount
        }
      });
      
      if (!orderResponse.success) {
        log.error('onReward', '创建赞赏订单失败', orderResponse.error);
        wx.showToast({
          title: orderResponse.error || '创建订单失败',
          icon: 'none',
          duration: 2000
        });
        this.setData({ isRewarding: false });
        return;
      }
      
      log.info('onReward', '订单创建成功，调起支付', {
        orderId: orderResponse.data.orderId,
        out_trade_no: orderResponse.data.out_trade_no
      });
      
      // 调起支付
      const paymentResult = await paymentService.requestPayment(orderResponse.data);
      
      if (paymentResult.success) {
        log.info('onReward', '支付调起成功');
        
        // 轮询查询订单状态（支付回调可能需要时间）
        let pollCount = 0;
        const maxPollCount = 10; // 最多查询10次
        const pollInterval = 2000; // 每2秒查询一次
        
        const pollTimer = setInterval(async () => {
          pollCount++;
          
          log.info('onReward', `第 ${pollCount} 次查询订单状态`, {
            out_trade_no: orderResponse.data.out_trade_no
          });
          
          try {
            const queryResult = await paymentService.queryOrderStatus(orderResponse.data.out_trade_no);
            
            if (queryResult.success && queryResult.data) {
              const orderStatus = queryResult.data.status;
              
              log.info('onReward', '订单状态查询结果', {
                status: orderStatus,
                attempt: pollCount
              });
              
              // 订单状态为 SUCCESS 表示支付成功
              if (orderStatus === 'SUCCESS') {
                clearInterval(pollTimer);
                
                log.info('onReward', '赞赏支付成功');
                
                // 更新赞赏人数（增加1）
                const newCount = (this.data.rewardCount || 0) + 1;
                this._updateRewardCountDisplay(newCount);
                
                wx.showModal({
                  title: '感谢您的认可',
                  content: '希望这份解读能成为您的一盏夜灯。',
                  showCancel: false,
                  confirmText: '知道了',
                  confirmColor: '#c896b4'
                });
                
                // 重新加载赞赏人数统计（从服务器获取最新数据）
                await this._loadRewardCount();
                
                return;
              }
            }
            
            // 如果达到最大查询次数，停止轮询
            if (pollCount >= maxPollCount) {
              clearInterval(pollTimer);
              log.warn('onReward', '达到最大查询次数，停止轮询', {
                out_trade_no: orderResponse.data.out_trade_no,
                attempts: pollCount
              });
            }
          } catch (error) {
            log.error('onReward', '查询订单状态异常', error);
            // 查询异常不影响，继续轮询
          }
        }, pollInterval);
      } else {
        // 用户取消支付或其他错误
        if (paymentResult.code === -2) {
          log.info('onReward', '用户取消支付');
        } else {
          log.error('onReward', '支付调起失败', paymentResult.error);
          wx.showToast({
            title: paymentResult.error || '支付失败',
            icon: 'none',
            duration: 2000
          });
        }
      }
    } catch (error) {
      log.error('onReward', '赞赏流程异常', error);
      wx.showToast({
        title: '操作失败，请重试',
        icon: 'none',
        duration: 2000
      });
    } finally {
      this.setData({ isRewarding: false });
    }
  },
  
  /**
   * 格式化赞赏人数文本
   * @param {number} count - 赞赏人数
   * @returns {string} 格式化后的文本
   */
  _formatRewardCount(count) {
    if (!count || count <= 0) {
      return '0';
    }
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'k';
    }
    return count.toString();
  },
  
  /**
   * 更新赞赏人数显示
   * @param {number} count - 赞赏人数
   */
  _updateRewardCountDisplay(count) {
    const formattedText = this._formatRewardCount(count);
    this.setData({
      rewardCount: count,
      rewardCountText: formattedText
    });
  },
  
  /**
   * 加载赞赏人数统计
   */
  async _loadRewardCount() {
    try {
      // TODO: 调用云函数获取赞赏人数统计
      // 暂时使用默认值，后续需要实现云函数接口
      // const response = await wx.cloud.callFunction({
      //   name: 'rewardManagement',
      //   data: {
      //     action: 'getRewardCount',
      //     data: {
      //       cardNumber: this.data.selectedCard?.cardNumber,
      //       cardName: this.data.selectedCard?.cardName
      //     }
      //   }
      // });
      
      // 暂时使用固定值或从本地存储获取
      // 如果有选中的卡牌，可以基于卡牌信息获取统计
      // const count = response.result?.count || 0;
      // this._updateRewardCountDisplay(count);
      
      // 暂时设置一个默认值用于展示
      if (this.data.rewardCount === 0) {
        // 可以设置一个随机数用于演示，实际应该从服务器获取
        // this._updateRewardCountDisplay(Math.floor(Math.random() * 1000) + 500);
      } else {
        // 更新格式化文本
        this._updateRewardCountDisplay(this.data.rewardCount);
      }
      
      log.info('_loadRewardCount', '加载赞赏人数（暂时使用默认值）');
    } catch (error) {
      log.error('_loadRewardCount', '加载赞赏人数失败', error);
      // 静默处理，不影响主流程
    }
  },
  
  /**
   * 咨询真人客服按钮点击事件
   */
  onConsultLecturer() {
    log.info('onConsultLecturer', '点击咨询真人客服');
    
    // 显示客服二维码弹窗
    this.setData({
      showKefuModal: true
    });
  },
  
  /**
   * 关闭客服二维码弹窗
   */
  onCloseKefuModal() {
    log.info('onCloseKefuModal', '关闭客服二维码弹窗');
    this.setData({
      showKefuModal: false
    });
  },
  
  /**
   * 预览客服二维码（点击图片时调用，在预览界面长按可识别二维码）
   */
  onPreviewKefuQrcode() {
    log.info('onPreviewKefuQrcode', '预览客服二维码');
    
    // 使用预览功能，在预览界面长按二维码会自动识别
    wx.previewImage({
      urls: ['/static/kefu.jpg'],
      current: '/static/kefu.jpg',
      success: () => {
        log.info('onPreviewKefuQrcode', '预览成功，请在预览界面长按二维码识别');
      },
      fail: (err) => {
        log.error('onPreviewKefuQrcode', '预览失败', err);
        wx.showToast({
          title: '预览失败',
          icon: 'none',
          duration: 2000
        });
      }
    });
  }
});

