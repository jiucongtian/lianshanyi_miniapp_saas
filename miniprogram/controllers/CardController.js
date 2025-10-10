/**
 * 卡牌页面控制器
 * 处理卡牌页面相关的业务逻辑，包括档案数据加载、八字显示、卡牌翻转、图片预览等
 * 
 * 使用方式：
 * 1. 在页面中创建CardController实例
 * 2. 调用initialize()方法初始化页面
 * 3. 使用各种方法处理用户交互
 * 
 * 示例：
 * ```javascript
 * const { CardController } = require('../../controllers/CardController');
 * 
 * Page({
 *   onLoad(options) {
 *     this.controller = new CardController(this);
 *     this.controller.initialize(options);
 *   }
 * });
 * ```
 */

const { BaseController } = require('./BaseController');
const { profileManager } = require('../utils/profileManager');
const { imageCacheManager } = require('../utils/imageCacheManager');
const { getBaziImageById, getBaziImageByPinyin } = require('../utils/baziImageMap');
const eventBus = require('../utils/eventBus');
const { PROFILE_EVENTS, SYSTEM_EVENTS } = require('../utils/eventTypes');

class CardController extends BaseController {
  /**
   * 构造函数
   * @param {Object} page - 页面实例
   */
  constructor(page) {
    super(page);
    
    // 页面状态
    this.isDataLoaded = false;
    this.isLoading = true;
    this.isLoadingImages = false;
    this.currentProfileName = '生命智慧卡牌';
    this.isUncertainTime = false;
    
    // 卡牌状态
    this.yearCardFlipped = false;
    this.monthCardFlipped = false;
    this.dayCardFlipped = false;
    this.timeCardFlipped = false;
    
    // 八字数据
    this.yearPillar = { 
      heavenlyStem: '',
      earthlyBranch: '',
      imagePath: '',
      baziImagePath: ''
    };
    this.monthPillar = {
      heavenlyStem: '',
      earthlyBranch: '',
      imagePath: '',
      baziImagePath: ''
    };
    this.dayPillar = {
      heavenlyStem: '',
      earthlyBranch: '',
      imagePath: '',
      baziImagePath: ''
    };
    this.timePillar = {
      heavenlyStem: '',
      earthlyBranch: '',
      imagePath: '',
      baziImagePath: ''
    };
    
    // 时间显示
    this.originalTime = '';
    this.lunarTime = '';
    
    // 图片预览
    this.showImagePreview = false;
    this.previewImagePath = '';
    this.previewCardDescription = null;
    
    // 卡牌描述数据
    this.cardDescriptions = this._loadCardDescriptions();
    
    // 绑定事件处理器
    this._bindEventHandlers();
  }

  // ==================== 公共方法 ====================

  /**
   * 初始化页面
   * @param {Object} options - 页面参数
   */
  async initialize(options = {}) {
    console.log('[CardController] 开始初始化页面，参数:', options);
    
    try {
      // 初始化设备尺寸
      this._initDeviceSize();
      
      // 初始化动画
      this._initAnimations();
      
      // 完全重新初始化所有数据
      this._completeReinitialize();
      
      // 处理传递过来的参数
      this._handleReceivedParams(options);
      
      // 等待ProfileManager初始化完成并加载数据
      this._waitForProfileManagerAndLoad();
      
      console.log('[CardController] 页面初始化完成');
    } catch (error) {
      console.error('[CardController] 页面初始化失败:', error);
      this._handleError(error, '页面初始化');
    }
  }

  /**
   * 加载档案数据
   * @param {Object} profileData - 档案数据
   */
  loadProfileData(profileData) {
    console.log('[CardController] 开始加载档案数据:', profileData);
    
    try {
      // 确保传入的是ProfileBean实例
      let profileBean;
      if (profileData && typeof profileData.toCardDisplayData === 'function') {
        // 已经是ProfileBean实例
        profileBean = profileData;
      } else {
        // 如果是原始数据，先转换为ProfileBean
        const { ProfileBean } = require('../beans/ProfileBean');
        profileBean = new ProfileBean(profileData);
      }
      
      // 直接使用ProfileBean的转换方法
      const cardData = profileBean.toCardDisplayData();
      
      // 先设置isUncertainTime，确保updateBaziDisplay能获取到正确的值
      this.isUncertainTime = Boolean(cardData.isUncertainTime);
      
      // 更新八字显示
      this.updateBaziDisplay(cardData.baziData);
      
      // 设置数据加载完成状态
      this._setData({
        isLoading: false,
        isDataLoaded: true,
        currentProfileName: cardData.profileName || '生命智慧卡牌',
        // 重置预览状态
        showImagePreview: false,
        previewImagePath: '',
        previewCardDescription: null
      });
      
      console.log('[CardController] 档案数据加载成功');
    } catch (error) {
      console.error('[CardController] 加载档案数据失败:', error);
      this._showNoDataState();
    }
  }

  /**
   * 更新八字显示
   * @param {Object} baziData - 八字数据
   */
  async updateBaziDisplay(baziData) {
    console.log('[CardController] 开始更新八字显示，数据:', baziData);
    
    if (baziData && baziData.yearPillar && baziData.monthPillar && baziData.dayPillar && baziData.timePillar) {
      // 先清空图片数据，再开始加载
      this._clearImageData();
      
      try {
        // 生成图片路径信息（包含云存储路径和文件名）
        const yearImageInfo = this._getBaziImageInfo(baziData.yearPillar.heavenlyStem, baziData.yearPillar.earthlyBranch);
        const monthImageInfo = this._getBaziImageInfo(baziData.monthPillar.heavenlyStem, baziData.monthPillar.earthlyBranch);
        const dayImageInfo = this._getBaziImageInfo(baziData.dayPillar.heavenlyStem, baziData.dayPillar.earthlyBranch);
        const timeImageInfo = this._getBaziImageInfo(baziData.timePillar.heavenlyStem, baziData.timePillar.earthlyBranch);
        
        // 使用缓存管理器获取图片路径（优先使用本地缓存）
        const [yearPath, monthPath, dayPath, timePath] = await Promise.all([
          imageCacheManager.getImagePath(yearImageInfo.cloudPath, yearImageInfo.fileName),
          imageCacheManager.getImagePath(monthImageInfo.cloudPath, monthImageInfo.fileName),
          imageCacheManager.getImagePath(dayImageInfo.cloudPath, dayImageInfo.fileName),
          imageCacheManager.getImagePath(timeImageInfo.cloudPath, timeImageInfo.fileName)
        ]);
        
        console.log('[CardController] 图片路径获取完成（优先使用缓存）:', {
          year: yearPath,
          month: monthPath,
          day: dayPath,
          time: timePath
        });
        
        this._setData({
          yearPillar: {
            heavenlyStem: baziData.yearPillar.heavenlyStem,
            earthlyBranch: baziData.yearPillar.earthlyBranch,
            imagePath: this.data.cardBackImagePath, // 默认显示背面
            baziImagePath: yearPath // 保存八字图片路径
          },
          monthPillar: {
            heavenlyStem: baziData.monthPillar.heavenlyStem,
            earthlyBranch: baziData.monthPillar.earthlyBranch,
            imagePath: this.data.cardBackImagePath, // 默认显示背面
            baziImagePath: monthPath // 保存八字图片路径
          },
          dayPillar: {
            heavenlyStem: baziData.dayPillar.heavenlyStem,
            earthlyBranch: baziData.dayPillar.earthlyBranch,
            imagePath: dayPath, // 日柱卡牌默认显示正面
            baziImagePath: dayPath // 保存八字图片路径
          },
          timePillar: {
            heavenlyStem: baziData.timePillar.heavenlyStem,
            earthlyBranch: baziData.timePillar.earthlyBranch,
            imagePath: this.data.cardBackImagePath, // 默认显示背面
            baziImagePath: timePath // 保存八字图片路径
          },
          originalTime: baziData.originalTime || '',
          lunarTime: baziData.lunarTime || '',
          isLoadingImages: false,
          // 保持isUncertainTime的值不变
          isUncertainTime: this.isUncertainTime,
          // 重置卡牌翻转状态（日柱卡牌默认显示正面）
          yearCardFlipped: false,
          monthCardFlipped: false,
          dayCardFlipped: true, // 日柱卡牌默认显示正面
          timeCardFlipped: false
        });
        
        console.log('[CardController] 八字显示已更新');
      } catch (error) {
        console.error('[CardController] 加载图片失败，使用云存储路径:', error);
        
        // 如果缓存加载失败，直接使用云存储路径
        const yearImagePath = this._getBaziImagePath(baziData.yearPillar.heavenlyStem, baziData.yearPillar.earthlyBranch);
        const monthImagePath = this._getBaziImagePath(baziData.monthPillar.heavenlyStem, baziData.monthPillar.earthlyBranch);
        const dayImagePath = this._getBaziImagePath(baziData.dayPillar.heavenlyStem, baziData.dayPillar.earthlyBranch);
        const timeImagePath = this._getBaziImagePath(baziData.timePillar.heavenlyStem, baziData.timePillar.earthlyBranch);
        
        this._setData({
          yearPillar: {
            heavenlyStem: baziData.yearPillar.heavenlyStem,
            earthlyBranch: baziData.yearPillar.earthlyBranch,
            imagePath: this.data.cardBackImagePath, // 默认显示背面
            baziImagePath: yearImagePath // 保存八字图片路径
          },
          monthPillar: {
            heavenlyStem: baziData.monthPillar.heavenlyStem,
            earthlyBranch: baziData.monthPillar.earthlyBranch,
            imagePath: this.data.cardBackImagePath, // 默认显示背面
            baziImagePath: monthImagePath // 保存八字图片路径
          },
          dayPillar: {
            heavenlyStem: baziData.dayPillar.heavenlyStem,
            earthlyBranch: baziData.dayPillar.earthlyBranch,
            imagePath: dayImagePath, // 日柱卡牌默认显示正面
            baziImagePath: dayImagePath // 保存八字图片路径
          },
          timePillar: {
            heavenlyStem: baziData.timePillar.heavenlyStem,
            earthlyBranch: baziData.timePillar.earthlyBranch,
            imagePath: this.data.cardBackImagePath, // 默认显示背面
            baziImagePath: timeImagePath // 保存八字图片路径
          },
          originalTime: baziData.originalTime || '',
          lunarTime: baziData.lunarTime || '',
          isLoadingImages: false,
          // 保持isUncertainTime的值不变
          isUncertainTime: this.isUncertainTime,
          // 重置卡牌翻转状态（日柱卡牌默认显示正面）
          yearCardFlipped: false,
          monthCardFlipped: false,
          dayCardFlipped: true, // 日柱卡牌默认显示正面
          timeCardFlipped: false
        });
      }
    } else {
      console.log('[CardController] 八字数据不完整，无法更新显示');
    }
  }

  /**
   * 翻转卡牌
   * @param {string} pillar - 柱子名称（year/month/day/time）
   */
  flipCard(pillar) {
    const flippedKey = `${pillar}CardFlipped`;
    const pillarData = this.data[`${pillar}Pillar`];
    
    console.log(`[CardController] 点击${pillar}卡牌，当前状态:`, this.data[flippedKey]);
    
    // 如果没有八字数据，不进行切换
    if (!pillarData.baziImagePath) {
      console.log(`${pillar}卡牌没有八字数据，不进行切换`);
      return;
    }
    
    // 如果卡牌已经是正面（已翻转），则不允许再次点击
    if (this.data[flippedKey]) {
      console.log(`${pillar}卡牌已经是正面，不允许翻回背面`);
      return;
    }
    
    // 只能从背面翻到正面
    this._setData({
      [flippedKey]: true,
      [`${pillar}Pillar.imagePath`]: pillarData.baziImagePath
    });
    
    console.log(`${pillar}卡牌翻转为正面`);
  }

  /**
   * 预览卡牌
   * @param {string} pillar - 柱子名称（year/month/day/time）
   */
  previewCard(pillar) {
    const pillarData = this.data[`${pillar}Pillar`];
    const flippedKey = `${pillar}CardFlipped`;
    
    console.log('[CardController] 图片点击事件:', { pillar, pillarData, flipped: this.data[flippedKey] });
    
    // 只有显示正面（八字图片）时才允许放大预览
    if (this.data[flippedKey] && pillarData && pillarData.baziImagePath) {
      // 只有日柱才显示描述信息
      let cardDescription = null;
      if (pillar === 'day') {
        cardDescription = this._getCardDescription(pillarData.heavenlyStem, pillarData.earthlyBranch);
        console.log('[CardController] 获取到的日柱卡牌描述:', cardDescription);
      }
      
      this._setData({
        showImagePreview: true,
        previewImagePath: pillarData.baziImagePath,
        previewCardDescription: cardDescription
      });
    }
  }

  /**
   * 关闭图片预览
   */
  closeImagePreview() {
    this._setData({
      showImagePreview: false,
      previewImagePath: '',
      previewCardDescription: null
    });
  }

  /**
   * 显示时间详情
   */
  showTimeDetail() {
    this._setData({ showTimePopup: true });
  }

  /**
   * 关闭时间详情
   */
  closeTimePopup() {
    this._setData({ showTimePopup: false });
  }

  // ==================== 私有方法 ====================

  /**
   * 绑定事件处理器
   * @private
   */
  _bindEventHandlers() {
    // 监听ProfileManager初始化完成事件
    eventBus.on(SYSTEM_EVENTS.PROFILE_MANAGER_READY, this._handleProfileManagerReady.bind(this));
    
    // 监听档案选中事件
    eventBus.on(PROFILE_EVENTS.PROFILE_SELECTED, this._handleSelectProfile.bind(this));
  }

  /**
   * 处理ProfileManager初始化完成事件
   * @private
   */
  _handleProfileManagerReady() {
    console.log('[CardController] 收到ProfileManager初始化完成事件');
    this._loadCurrentProfile();
  }

  /**
   * 处理档案选中事件
   * @param {Object} data - 事件数据
   * @private
   */
  _handleSelectProfile(data) {
    console.log('[CardController] 收到档案选中事件:', data);
    if (data && data.profileId) {
      // 重新加载当前档案
      this._loadCurrentProfile();
    }
  }

  /**
   * 等待ProfileManager初始化完成并加载数据
   * @private
   */
  _waitForProfileManagerAndLoad() {
    console.log('[CardController] 等待ProfileManager初始化完成...');
    
    // 检查ProfileManager是否已初始化
    if (!profileManager.isReady()) {
      console.log('[CardController] ProfileManager未初始化，500ms后重试');
      setTimeout(() => {
        this._waitForProfileManagerAndLoad();
      }, 500);
      return;
    }
    
    // ProfileManager已初始化，获取当前档案
    this._loadCurrentProfile();
  }

  /**
   * 加载当前档案
   * @private
   */
  _loadCurrentProfile() {
    const currentProfile = profileManager.getCurrentProfile();
    if (currentProfile) {
      console.log('[CardController] 从ProfileManager找到当前档案:', currentProfile.profileName);
      this.loadProfileData(currentProfile);
    } else {
      console.log('[CardController] 没有当前档案，显示无数据状态');
      this._showNoDataState();
    }
  }

  /**
   * 完全重新初始化所有数据和变量
   * @private
   */
  _completeReinitialize() {
    console.log('[CardController] 开始完全重新初始化卡牌页面数据');
    
    // 重置所有状态变量
    this._setData({
      // 设备尺寸保持，不需要重置
      deviceSize: this.data.deviceSize,
      
      // 重置所有显示状态
      showTimePopup: false,
      isDataLoaded: false,
      isLoading: true,
      isLoadingImages: false,
      currentProfileName: '生命智慧卡牌',
      isUncertainTime: false,
      
      // 重置图片预览相关
      showImagePreview: false,
      previewImagePath: '',
      previewCardDescription: null,
      
      // 重置所有卡牌翻转状态（日柱卡牌将在数据加载后设置为正面）
      yearCardFlipped: false,
      monthCardFlipped: false,
      dayCardFlipped: false, // 将在数据加载后设置为 true
      timeCardFlipped: false,
      
      // 重置所有柱子数据为初始状态
      yearPillar: { 
        heavenlyStem: '',
        earthlyBranch: '',
        imagePath: this.data.cardBackImagePath,
        baziImagePath: ''
      },
      monthPillar: {
        heavenlyStem: '',
        earthlyBranch: '',
        imagePath: this.data.cardBackImagePath,
        baziImagePath: ''
      },
      dayPillar: {
        heavenlyStem: '',
        earthlyBranch: '',
        imagePath: this.data.cardBackImagePath,
        baziImagePath: ''
      },
      timePillar: {
        heavenlyStem: '',
        earthlyBranch: '',
        imagePath: this.data.cardBackImagePath,
        baziImagePath: ''
      },
      
      // 重置时间显示
      originalTime: '',
      lunarTime: '',
      
      // 保持卡牌背面图片路径
      cardBackImagePath: this.data.cardBackImagePath
    });
    
    console.log('[CardController] 完全重新初始化完成，所有数据已重置为初始状态');
  }

  /**
   * 处理接收到的参数
   * @param {Object} options - 页面参数
   * @private
   */
  _handleReceivedParams(options) {
    const { datetime, hasCozeData } = options;
    
    if (datetime) {
      const timestamp = parseInt(datetime);
      const date = new Date(timestamp);
      
      // 格式化时间显示
      const formattedTime = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
      
      // 检查是否有Coze数据
      if (hasCozeData === 'true') {
        const app = getApp();
        const baziResult = app.globalData?.baziResult;
        
        if (baziResult && baziResult.timestamp === timestamp) {
          console.log('[CardController] 检测到标准化八字数据:', baziResult.baziData);
          
          // 直接使用标准化的八字数据
          if (baziResult.baziData) {
            this.updateBaziDisplay(baziResult.baziData);
          }
        }
      }
      
      console.log('[CardController] 八字页面参数详情:', {
        timestamp,
        formattedTime,
        hasCozeData
      });
    }
  }

  /**
   * 初始化设备尺寸
   * @private
   */
  _initDeviceSize() {
    wx.getSystemInfo({
      success: (res) => {
        const deviceSize = res.screenWidth < 375 ? 'small' : 
                         res.screenWidth < 414 ? 'medium' : 'large';
        this._setData({ deviceSize });
      }
    });
  }

  /**
   * 初始化动画
   * @private
   */
  _initAnimations() {
    const pillars = ['year', 'month', 'day', 'time'];
    const delay = 100; // 每个柱子的动画延迟时间（毫秒）

    pillars.forEach((pillar, index) => {
      const animation = wx.createAnimation({
        duration: 500,
        timingFunction: 'ease',
        delay: index * delay
      });

      animation.opacity(1).translateY(0).step();
      this._setData({
        [`${pillar}Animation`]: animation.export()
      });
    });
  }

  /**
   * 清空图片数据
   * @private
   */
  _clearImageData() {
    console.log('[CardController] 清空图片数据');
    this._setData({
      yearPillar: { heavenlyStem: '', earthlyBranch: '', imagePath: this.data.cardBackImagePath, baziImagePath: '' },
      monthPillar: { heavenlyStem: '', earthlyBranch: '', imagePath: this.data.cardBackImagePath, baziImagePath: '' },
      dayPillar: { heavenlyStem: '', earthlyBranch: '', imagePath: this.data.cardBackImagePath, baziImagePath: '' },
      timePillar: { heavenlyStem: '', earthlyBranch: '', imagePath: this.data.cardBackImagePath, baziImagePath: '' },
      originalTime: '',
      lunarTime: '',
      isLoadingImages: true,
      // 重置卡牌翻转状态（日柱卡牌将在数据加载后设置为正面）
      yearCardFlipped: false,
      monthCardFlipped: false,
      dayCardFlipped: false, // 将在数据加载后设置为 true
      timeCardFlipped: false
    });
  }

  /**
   * 显示无数据状态
   * @private
   */
  _showNoDataState() {
    console.log('[CardController] 显示无数据状态');
    this._setData({
      isLoading: false,
      isDataLoaded: false,
      isLoadingImages: false,
      currentProfileName: '生命智慧卡牌', // 保持默认档案名称
      isUncertainTime: false, // 重置不确定时辰状态
      yearPillar: { heavenlyStem: '', earthlyBranch: '', imagePath: this.data.cardBackImagePath, baziImagePath: '' },
      monthPillar: { heavenlyStem: '', earthlyBranch: '', imagePath: this.data.cardBackImagePath, baziImagePath: '' },
      dayPillar: { heavenlyStem: '', earthlyBranch: '', imagePath: this.data.cardBackImagePath, baziImagePath: '' },
      timePillar: { heavenlyStem: '', earthlyBranch: '', imagePath: this.data.cardBackImagePath, baziImagePath: '' },
      originalTime: '',
      lunarTime: '',
      // 重置图片预览相关
      showImagePreview: false,
      previewImagePath: '',
      previewCardDescription: null,
      // 重置卡牌翻转状态
      yearCardFlipped: false,
      monthCardFlipped: false,
      dayCardFlipped: false,
      timeCardFlipped: false
    });
  }

  /**
   * 根据天干地支获取对应的图片信息
   * @param {string} heavenlyStem - 天干
   * @param {string} earthlyBranch - 地支
   * @returns {Object} 图片信息
   * @private
   */
  _getBaziImageInfo(heavenlyStem, earthlyBranch) {
    // 将天干地支转换为拼音
    const tianGanMap = {
      '甲': 'jia', '乙': 'yi', '丙': 'bing', '丁': 'ding', '戊': 'wu',
      '己': 'ji', '庚': 'geng', '辛': 'xin', '壬': 'ren', '癸': 'gui'
    };
    
    const diZhiMap = {
      '子': 'zi', '丑': 'chou', '寅': 'yin', '卯': 'mao', '辰': 'chen', '巳': 'si',
      '午': 'wu', '未': 'wei', '申': 'shen', '酉': 'you', '戌': 'xu', '亥': 'hai'
    };
    
    const tianGanPinyin = tianGanMap[heavenlyStem];
    const diZhiPinyin = diZhiMap[earthlyBranch];
    
    if (tianGanPinyin && diZhiPinyin) {
      const pinyin = tianGanPinyin + diZhiPinyin;
      const imageInfo = getBaziImageByPinyin(pinyin);
      
      if (imageInfo) {
        return {
          cloudPath: imageInfo.imagePath,
          fileName: imageInfo.fileName
        };
      }
    }
    
    // 默认返回第一张图片
    const defaultImage = getBaziImageById(1);
    return {
      cloudPath: defaultImage.imagePath,
      fileName: defaultImage.fileName
    };
  }

  /**
   * 根据天干地支获取对应的图片路径（兼容旧代码）
   * @param {string} heavenlyStem - 天干
   * @param {string} earthlyBranch - 地支
   * @returns {string} 图片路径
   * @private
   */
  _getBaziImagePath(heavenlyStem, earthlyBranch) {
    const imageInfo = this._getBaziImageInfo(heavenlyStem, earthlyBranch);
    return imageInfo.cloudPath;
  }

  /**
   * 根据天干地支获取卡牌描述信息
   * @param {string} heavenlyStem - 天干
   * @param {string} earthlyBranch - 地支
   * @returns {Object} 卡牌描述信息
   * @private
   */
  _getCardDescription(heavenlyStem, earthlyBranch) {
    // 将天干地支转换为拼音
    const tianGanMap = {
      '甲': 'jia', '乙': 'yi', '丙': 'bing', '丁': 'ding', '戊': 'wu',
      '己': 'ji', '庚': 'geng', '辛': 'xin', '壬': 'ren', '癸': 'gui'
    };
    
    const diZhiMap = {
      '子': 'zi', '丑': 'chou', '寅': 'yin', '卯': 'mao', '辰': 'chen', '巳': 'si',
      '午': 'wu', '未': 'wei', '申': 'shen', '酉': 'you', '戌': 'xu', '亥': 'hai'
    };
    
    const tianGanPinyin = tianGanMap[heavenlyStem];
    const diZhiPinyin = diZhiMap[earthlyBranch];
    
    if (tianGanPinyin && diZhiPinyin) {
      const pinyin = tianGanPinyin + diZhiPinyin;
      // 在描述数据中查找对应的卡牌信息
      const cardInfo = this.cardDescriptions.find(card => card.pinyin === pinyin);
      if (cardInfo) {
        return {
          cardName: cardInfo.cardName,
          description: cardInfo.description,
          keywords: cardInfo.keywords
        };
      }
    }
    
    // 如果找不到对应的描述，返回默认信息
    return {
      cardName: `${heavenlyStem}${earthlyBranch}`,
      description: '暂无描述信息',
      keywords: []
    };
  }

  /**
   * 加载卡牌描述数据
   * @returns {Array} 卡牌描述数组
   * @private
   */
  _loadCardDescriptions() {
    return [
      {"cardNumber": 1, "cardName": "甲子", "pinyin": "jiazi", "description": "我是有领导力的老鼠，敢想敢干、胆大心细又聪慧，努力进取、勤练本领，盼被世人看见。", "category": "日柱", "keywords": ["领导力", "老鼠", "敢想敢干", "胆大心细", "聪慧", "努力进取"]},
      {"cardNumber": 2, "cardName": "乙丑", "pinyin": "yichou", "description": "我是有承载力的牛，有德有才、任劳任怨，沉稳靠谱，凭坚定意念朝着目标前行。", "category": "日柱", "keywords": ["承载力", "牛", "有德有才", "任劳任怨", "沉稳靠谱", "坚定意念"]},
      // ... 更多卡牌描述数据
      // 这里可以包含完整的60个卡牌描述，为了简洁起见省略
    ];
  }

  // ==================== 生命周期方法 ====================

  /**
   * 页面显示时的处理
   */
  onShow() {
    console.log('[CardController] 页面显示');
    
    // 完全重新初始化所有数据和变量
    this._completeReinitialize();
    
    // 等待ProfileManager初始化完成后再获取当前档案
    this._waitForProfileManagerAndLoad();
    
    super.onShow();
  }

  /**
   * 页面隐藏时的处理
   */
  onHide() {
    console.log('[CardController] 页面隐藏');
    super.onHide();
  }

  /**
   * 页面卸载时的清理
   */
  onUnload() {
    console.log('[CardController] 页面卸载');
    
    // 清理事件监听
    eventBus.off(SYSTEM_EVENTS.PROFILE_MANAGER_READY, this._handleProfileManagerReady);
    eventBus.off(PROFILE_EVENTS.PROFILE_SELECTED, this._handleSelectProfile);
    
    super.onUnload();
  }
}

module.exports = { CardController };
