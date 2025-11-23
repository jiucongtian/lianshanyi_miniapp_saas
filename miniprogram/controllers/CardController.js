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
const { profileManager } = require('../utils/manager/profileManager');
const { imageCacheManager } = require('../utils/manager/imageCacheManager');
const { getBaziImageById, getBaziImageByPinyin } = require('../utils/baziImageMap');
const { JIAZI_DATA } = require('../utils/jiaziData');
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
    this.currentProfileName = '生命智慧卡牌';
    this.isUncertainTime = false;
    
    // 八字数据（只保留天干地支，图片和翻转状态由组件管理）
    this.yearPillar = { 
      heavenlyStem: '',
      earthlyBranch: ''
    };
    this.monthPillar = {
      heavenlyStem: '',
      earthlyBranch: ''
    };
    this.dayPillar = {
      heavenlyStem: '',
      earthlyBranch: ''
    };
    this.timePillar = {
      heavenlyStem: '',
      earthlyBranch: ''
    };
    
    // 图片预览
    this.showImagePreview = false;
    this.previewImagePath = '';
    this.previewCardDescription = null;
    
    // 卡牌描述数据
    this.cardDescriptions = this._loadCardDescriptions();
    
    // 记录当前加载的档案ID，用于判断是否需要重新加载
    this.currentLoadedProfileId = null;
    
    // 绑定事件处理器
    this._bindEventHandlers();
  }

  // ==================== 公共方法 ====================

  /**
   * 初始化页面
   * @param {Object} options - 页面参数
   */
  async initialize(options = {}) {
    this._log('initialize', '开始初始化页面，参数:', options);
    
    try {
      // 初始化动画
      this._initAnimations();
      
      // 完全重新初始化所有数据
      this._completeReinitialize();
      
      // 处理传递过来的参数
      this._handleReceivedParams(options);
      
      // 等待ProfileManager初始化完成并加载数据
      this._waitForProfileManagerAndLoad();
      
      this._log('initialize', '页面初始化完成');
    } catch (error) {
      this._error('initialize', '页面初始化失败:', error);
      this._handleError(error, '页面初始化');
    }
  }

  /**
   * 加载档案数据
   * @param {Object} profileData - 档案数据
   */
  loadProfileData(profileData) {
    this._log('loadProfileData', '开始加载档案数据:', profileData);
    
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
      
      // 记录当前加载的档案ID
      this.currentLoadedProfileId = profileBean._id || profileBean.id;
      
      // 直接使用ProfileBean的转换方法
      const cardData = profileBean.toCardDisplayData();
      
      // 检查八字数据是否完整
      if (!cardData.baziData || !cardData.baziData.yearPillar || !cardData.baziData.monthPillar || 
          !cardData.baziData.dayPillar || !cardData.baziData.timePillar) {
        this._error('loadProfileData', '八字数据不完整，无法加载', cardData);
        this._showNoDataState();
        return;
      }
      
      // 设置isUncertainTime
      const isUncertainTime = Boolean(cardData.isUncertainTime);
      this.isUncertainTime = isUncertainTime;
      
      // 准备更新的数据
      const updateData = {
        // 八字数据
        yearPillar: {
          heavenlyStem: cardData.baziData.yearPillar.heavenlyStem,
          earthlyBranch: cardData.baziData.yearPillar.earthlyBranch
        },
        monthPillar: {
          heavenlyStem: cardData.baziData.monthPillar.heavenlyStem,
          earthlyBranch: cardData.baziData.monthPillar.earthlyBranch
        },
        dayPillar: {
          heavenlyStem: cardData.baziData.dayPillar.heavenlyStem,
          earthlyBranch: cardData.baziData.dayPillar.earthlyBranch
        },
        timePillar: {
          heavenlyStem: cardData.baziData.timePillar.heavenlyStem,
          earthlyBranch: cardData.baziData.timePillar.earthlyBranch
        },
        // 页面状态 - 关键：必须同时设置这两个状态
        isLoading: false,
        isDataLoaded: true,
        currentProfileName: cardData.profileName || '生命智慧卡牌',
        isUncertainTime: isUncertainTime,
        // 重置预览状态
        showImagePreview: false,
        previewImagePath: '',
        previewCardDescription: null
      };
      
      this._log('loadProfileData', '准备更新页面数据', {
        isLoading: updateData.isLoading,
        isDataLoaded: updateData.isDataLoaded,
        profileName: updateData.currentProfileName
      });
      
      // 合并所有状态更新到一次 _setData 调用中，避免状态更新顺序问题
      this._setData(updateData);
      
      this._log('loadProfileData', '档案数据加载成功，所有状态已更新');
    } catch (error) {
      this._error('loadProfileData', '加载档案数据失败:', error);
      this._showNoDataState();
    }
  }

  /**
   * 更新八字显示 - 设置天干地支数据，由组件自主加载图片
   * @param {Object} baziData - 八字数据
   */
  async updateBaziDisplay(baziData) {
    this._log('updateBaziDisplay', '更新八字显示，数据:', baziData);
    
    if (!baziData || !baziData.yearPillar || !baziData.monthPillar || !baziData.dayPillar || !baziData.timePillar) {
      this._log('updateBaziDisplay', '八字数据不完整，无法更新显示');
      return;
    }

    // 直接设置天干地支数据，组件会自动加载对应的图片
    this._setData({
      yearPillar: {
        heavenlyStem: baziData.yearPillar.heavenlyStem,
        earthlyBranch: baziData.yearPillar.earthlyBranch
      },
      monthPillar: {
        heavenlyStem: baziData.monthPillar.heavenlyStem,
        earthlyBranch: baziData.monthPillar.earthlyBranch
      },
      dayPillar: {
        heavenlyStem: baziData.dayPillar.heavenlyStem,
        earthlyBranch: baziData.dayPillar.earthlyBranch
      },
      timePillar: {
        heavenlyStem: baziData.timePillar.heavenlyStem,
        earthlyBranch: baziData.timePillar.earthlyBranch
      }
    });
    
    this._log('updateBaziDisplay', '八字数据已设置，组件将自动加载图片');
  }


  /**
   * 图片加载失败回调（仅用于错误日志）
   * 注意：图片加载现在由 bazi-card 组件内部管理
   * @param {string} pillar - 柱子名称（year/month/day/time）
   */
  onImageLoadError(pillar) {
    this._error('onImageLoadError', `${pillar} 卡牌图片渲染失败`);
  }

  /**
   * 翻转卡牌（带动画）
   * @param {string} pillar - 柱子名称（year/month/day/time）
   */
  flipCard(pillar) {
    // 安全获取页面数据
    if (!this.page || !this.page.data) {
      this._error('flipCard', '页面数据未初始化');
      return;
    }
    
    const pillarData = this.page.data[`${pillar}Pillar`];
    
    this._log('flipCard', `点击${pillar}卡牌`);
    
    // 检查是否有八字数据（天干地支）
    if (!pillarData || !pillarData.heavenlyStem || !pillarData.earthlyBranch) {
      this._log('flipCard', `${pillar}卡牌没有八字数据，不进行翻转`);
      return;
    }
    
    // 直接调用组件的翻转方法，组件会处理状态和动画
    const card = this.page.selectComponent(`#${pillar}-card`);
    if (card && typeof card.flipToFront === 'function') {
      this._log('flipCard', `调用 ${pillar} 组件的翻转动画`);
      card.flipToFront();
    } else {
      this._warn('flipCard', `未找到 ${pillar} 组件或 flipToFront 方法`);
    }
  }

  /**
   * 预览卡牌
   * @param {string} pillar - 柱子名称（year/month/day/time）
   */
  previewCard(pillar) {
    // 安全获取页面数据
    if (!this.page || !this.page.data) {
      this._error('previewCard', '页面数据未初始化');
      return;
    }
    
    const pillarData = this.page.data[`${pillar}Pillar`];
    
    this._log('previewCard', '预览卡牌:', pillar);
    
    // 获取组件实例，从中读取八字图片路径
    const card = this.page.selectComponent(`#${pillar}-card`);
    if (!card) {
      this._warn('previewCard', '未找到组件实例');
      return;
    }
    
    // 检查组件是否已翻转（显示正面）
    if (!card.data.isFlipped) {
      this._log('previewCard', '卡牌未翻转，不允许预览');
      return;
    }
    
    // 获取八字图片路径
    const baziImagePath = card.data.baziImagePath;
    if (!baziImagePath) {
      this._warn('previewCard', '未找到八字图片路径');
      return;
    }
    
    // 只有日柱才显示描述信息
    let cardDescription = null;
    if (pillar === 'day' && pillarData) {
      cardDescription = this._getCardDescription(pillarData.heavenlyStem, pillarData.earthlyBranch);
      this._log('previewCard', '获取到的日柱卡牌描述:', cardDescription);
    }
    
    this._setData({
      showImagePreview: true,
      previewImagePath: baziImagePath,
      previewCardDescription: cardDescription
    });
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

  // ==================== 私有方法 ====================

  /**
   * 绑定事件处理器
   * @private
   */
  _bindEventHandlers() {
    // 保存绑定后的函数引用，以便后续解绑
    this._boundHandlers = {
      profileManagerReady: this._handleProfileManagerReady.bind(this),
      profileSelected: this._handleSelectProfile.bind(this),
      profileUpdated: this._handleProfileUpdated.bind(this),
      profileCreated: this._handleProfileCreated.bind(this),
      profileDeleted: this._handleProfileDeleted.bind(this),
      profileListRefresh: this._handleProfileListRefresh.bind(this)
    };
    
    // 监听ProfileManager初始化完成事件
    eventBus.on(SYSTEM_EVENTS.PROFILE_MANAGER_READY, this._boundHandlers.profileManagerReady);
    
    // 监听档案选中事件
    eventBus.on(PROFILE_EVENTS.PROFILE_SELECTED, this._boundHandlers.profileSelected);
    
    // 监听档案更新事件（档案属性被修改）
    eventBus.on(PROFILE_EVENTS.PROFILE_UPDATED, this._boundHandlers.profileUpdated);
    
    // 监听档案创建事件
    eventBus.on(PROFILE_EVENTS.PROFILE_CREATED, this._boundHandlers.profileCreated);
    
    // 监听档案删除事件
    eventBus.on(PROFILE_EVENTS.PROFILE_DELETED, this._boundHandlers.profileDeleted);
    
    // 监听档案列表刷新事件
    eventBus.on(PROFILE_EVENTS.PROFILE_LIST_REFRESH, this._boundHandlers.profileListRefresh);
    
    this._log('_bindEventHandlers', '事件监听器已绑定');
  }

  /**
   * 处理ProfileManager初始化完成事件
   * @private
   */
  _handleProfileManagerReady() {
    this._log('_handleProfileManagerReady', '收到ProfileManager初始化完成事件');
    this._updateProfileCount();
    this._loadCurrentProfile();
  }

  /**
   * 处理档案选中事件
   * @param {Object} data - 事件数据
   * @private
   */
  _handleSelectProfile(data) {
    this._log('_handleSelectProfile', '收到档案选中事件:', data);
    if (data && data.profileId) {
      // 重新加载当前档案
      this._loadCurrentProfile();
    }
  }

  /**
   * 处理档案更新事件（档案属性被修改）
   * @param {Object} data - 事件数据
   * @private
   */
  _handleProfileUpdated(data) {
    this._log('_handleProfileUpdated', '收到档案更新事件:', data);
    
    // 如果更新的档案是当前正在显示的档案，强制重新加载
    if (data && data.profileId === this.currentLoadedProfileId) {
      this._log('_handleProfileUpdated', '当前档案已更新，强制重新加载数据');
      
      // 从 profileManager 获取最新的档案数据
      const updatedProfile = profileManager.getCurrentProfile();
      if (updatedProfile) {
        this.loadProfileData(updatedProfile);
      } else {
        this._warn('_handleProfileUpdated', '无法获取更新后的档案数据');
      }
    }
  }

  /**
   * 处理档案创建事件
   * @param {Object} data - 事件数据
   * @private
   */
  _handleProfileCreated(data) {
    this._log('_handleProfileCreated', '收到档案创建事件:', data);
    this._updateProfileCount();
  }

  /**
   * 处理档案删除事件
   * @param {Object} data - 事件数据
   * @private
   */
  _handleProfileDeleted(data) {
    this._log('_handleProfileDeleted', '收到档案删除事件:', data);
    this._updateProfileCount();
  }

  /**
   * 处理档案列表刷新事件
   * @param {Object} data - 事件数据
   * @private
   */
  _handleProfileListRefresh(data) {
    this._log('_handleProfileListRefresh', '收到档案列表刷新事件:', data);
    this._updateProfileCount();
  }

  /**
   * 更新档案数量
   * @private
   */
  _updateProfileCount() {
    if (!profileManager.isReady()) {
      this._log('_updateProfileCount', 'ProfileManager未初始化，延迟更新');
      setTimeout(() => {
        this._updateProfileCount();
      }, 500);
      return;
    }
    
    const count = profileManager.getProfileCount();
    this._log('_updateProfileCount', '更新档案数量', { count });
    this._setData({
      profileCount: count
    });
  }

  /**
   * 等待ProfileManager初始化完成并加载数据
   * @private
   */
  _waitForProfileManagerAndLoad() {
    this._log('_waitForProfileManagerAndLoad', '等待ProfileManager初始化完成...');
    
    // 检查ProfileManager是否已初始化
    if (!profileManager.isReady()) {
      this._log('_waitForProfileManagerAndLoad', 'ProfileManager未初始化，500ms后重试');
      setTimeout(() => {
        this._waitForProfileManagerAndLoad();
      }, 500);
      return;
    }
    
    // ProfileManager已初始化，更新档案数量并获取当前档案
    this._updateProfileCount();
    this._loadCurrentProfile();
  }

  /**
   * 加载当前档案
   * @private
   */
  _loadCurrentProfile() {
    const currentProfile = profileManager.getCurrentProfile();
    if (currentProfile) {
      this._log('_loadCurrentProfile', '从ProfileManager找到当前档案:', currentProfile.profileName);
      this.loadProfileData(currentProfile);
    } else {
      this._log('_loadCurrentProfile', '没有可用的档案，显示无数据状态');
      this._showNoDataState();
    }
  }

  /**
   * 完全重新初始化所有数据和变量
   * @private
   */
  _completeReinitialize() {
    this._log('_completeReinitialize', '开始完全重新初始化卡牌页面数据');
    
    // 重置所有状态变量（只设置必要字段，组件会自己管理状态）
    this._setData({
      // 重置所有显示状态
      isDataLoaded: false,
      isLoading: true,
      currentProfileName: '生命智慧卡牌',
      isUncertainTime: false,
      
      // 重置图片预览相关
      showImagePreview: false,
      previewImagePath: '',
      previewCardDescription: null,
      
      // 重置所有柱子数据（只需要天干地支，组件会自动处理图片加载和显示）
      yearPillar: { 
        heavenlyStem: '',
        earthlyBranch: ''
      },
      monthPillar: {
        heavenlyStem: '',
        earthlyBranch: ''
      },
      dayPillar: {
        heavenlyStem: '',
        earthlyBranch: ''
      },
      timePillar: {
        heavenlyStem: '',
        earthlyBranch: ''
      }
    });
    
    this._log('_completeReinitialize', '完全重新初始化完成，所有数据已重置为初始状态');
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
          this._log('_handleReceivedParams', '检测到标准化八字数据:', baziResult.baziData);
          
          // 直接使用标准化的八字数据
          if (baziResult.baziData) {
            this.updateBaziDisplay(baziResult.baziData);
          }
        }
      }
      
      this._log('_handleReceivedParams', '八字页面参数详情:', {
        timestamp,
        formattedTime,
        hasCozeData
      });
    }
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
    this._log('_clearImageData', '清空图片数据');
    
    // 只清空天干地支数据，组件会自动处理状态重置
    this._setData({
      yearPillar: { heavenlyStem: '', earthlyBranch: '' },
      monthPillar: { heavenlyStem: '', earthlyBranch: '' },
      dayPillar: { heavenlyStem: '', earthlyBranch: '' },
      timePillar: { heavenlyStem: '', earthlyBranch: '' }
    });
  }

  /**
   * 显示无数据状态
   * @private
   */
  _showNoDataState() {
    this._log('_showNoDataState', '显示无数据状态');
    
    // 确保档案数量是最新的
    this._updateProfileCount();
    
    // 只设置必要的状态字段
    this._setData({
      isLoading: false,
      isDataLoaded: false,
      currentProfileName: '生命智慧卡牌',
      isUncertainTime: false,
      
      // 清空天干地支数据
      yearPillar: { heavenlyStem: '', earthlyBranch: '' },
      monthPillar: { heavenlyStem: '', earthlyBranch: '' },
      dayPillar: { heavenlyStem: '', earthlyBranch: '' },
      timePillar: { heavenlyStem: '', earthlyBranch: '' },
      
      // 重置图片预览相关
      showImagePreview: false,
      previewImagePath: '',
      previewCardDescription: null
    });
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
    // 统一使用 utils/jiaziData.js 中的数据
    return JIAZI_DATA;
  }

  // ==================== 生命周期方法 ====================

  /**
   * 页面显示时的处理
   */
  onShow() {
    this._log('onShow', '页面显示');
    
    // 检查是否需要重新加载数据
    this._checkAndReloadIfNeeded();
    
    super.onShow();
  }

  /**
   * 检查是否需要重新加载数据
   * @private
   */
  _checkAndReloadIfNeeded() {
    // 等待ProfileManager初始化
    if (!profileManager.isReady()) {
      this._log('_checkAndReloadIfNeeded', 'ProfileManager未初始化，等待初始化...');
      setTimeout(() => {
        this._checkAndReloadIfNeeded();
      }, 500);
      return;
    }
    
    // 更新档案数量
    this._updateProfileCount();
    
    const currentProfile = profileManager.getCurrentProfile();
    
    // 如果没有当前档案
    if (!currentProfile) {
      this._log('_checkAndReloadIfNeeded', '没有当前档案');
      // 如果之前有数据，清除显示
      if (this.currentLoadedProfileId) {
        this._showNoDataState();
        this.currentLoadedProfileId = null;
      }
      return;
    }
    
    const currentProfileId = currentProfile._id || currentProfile.id;
    
    // 如果档案ID相同，不需要重新加载
    if (this.currentLoadedProfileId === currentProfileId) {
      this._log('_checkAndReloadIfNeeded', '档案未变更，无需重新加载');
      return;
    }
    
    // 档案已变更，需要重新加载
    this._log('_checkAndReloadIfNeeded', '档案已变更，重新加载数据');
    this._log('_checkAndReloadIfNeeded', '旧档案ID:', this.currentLoadedProfileId);
    this._log('_checkAndReloadIfNeeded', '新档案ID:', currentProfileId);
    
    // 完全重新初始化所有数据和变量（清空旧数据）
    this._completeReinitialize();
    
    // 使用 nextTick 确保状态重置完成后再加载新数据，避免状态更新冲突
    wx.nextTick(() => {
      // 加载新档案数据
      this.loadProfileData(currentProfile);
    });
  }

  /**
   * 页面隐藏时的处理
   */
  onHide() {
    this._log('onHide', '页面隐藏');
    super.onHide();
  }

  /**
   * 页面卸载时的清理
   */
  onUnload() {
    this._log('onUnload', '页面卸载');
    
    // 清理事件监听（使用保存的绑定函数引用）
    if (this._boundHandlers) {
      if (this._boundHandlers.profileSelected) {
        eventBus.off(PROFILE_EVENTS.PROFILE_SELECTED, this._boundHandlers.profileSelected);
      }
      if (this._boundHandlers.profileUpdated) {
        eventBus.off(PROFILE_EVENTS.PROFILE_UPDATED, this._boundHandlers.profileUpdated);
      }
      if (this._boundHandlers.profileCreated) {
        eventBus.off(PROFILE_EVENTS.PROFILE_CREATED, this._boundHandlers.profileCreated);
      }
      if (this._boundHandlers.profileDeleted) {
        eventBus.off(PROFILE_EVENTS.PROFILE_DELETED, this._boundHandlers.profileDeleted);
      }
      if (this._boundHandlers.profileListRefresh) {
        eventBus.off(PROFILE_EVENTS.PROFILE_LIST_REFRESH, this._boundHandlers.profileListRefresh);
      }
      // 注意：once 监听器会自动移除，但为了统一性也可以尝试移除
    }
    
    super.onUnload();
  }
}

module.exports = { CardController };
