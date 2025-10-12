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
      
      // 先设置isUncertainTime，确保updateBaziDisplay能获取到正确的值
      this.isUncertainTime = Boolean(cardData.isUncertainTime);
      
      // 更新八字显示
      this.updateBaziDisplay(cardData.baziData);
      
      // 设置数据加载完成状态
      this._setData({
        isLoading: false,
        isDataLoaded: true,
        currentProfileName: cardData.profileName || '生命智慧卡牌',
        isUncertainTime: this.isUncertainTime, // 同步不确定时辰状态到页面
        // 重置预览状态
        showImagePreview: false,
        previewImagePath: '',
        previewCardDescription: null
      });
      
      this._log('loadProfileData', '档案数据加载成功');
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
    // 监听ProfileManager初始化完成事件
    eventBus.on(SYSTEM_EVENTS.PROFILE_MANAGER_READY, this._handleProfileManagerReady.bind(this));
    
    // 监听档案选中事件
    eventBus.on(PROFILE_EVENTS.PROFILE_SELECTED, this._handleSelectProfile.bind(this));
    
    // 监听档案更新事件（档案属性被修改）
    eventBus.on(PROFILE_EVENTS.PROFILE_UPDATED, this._handleProfileUpdated.bind(this));
    
    this._log('_bindEventHandlers', '事件监听器已绑定');
  }

  /**
   * 处理ProfileManager初始化完成事件
   * @private
   */
  _handleProfileManagerReady() {
    this._log('_handleProfileManagerReady', '收到ProfileManager初始化完成事件');
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
      this._log('_loadCurrentProfile', '从ProfileManager找到当前档案:', currentProfile.profileName);
      this.loadProfileData(currentProfile);
    } else {
      this._log('_loadCurrentProfile', '没有当前档案，显示无数据状态');
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
    return [
      {"cardNumber": 1, "cardName": "甲子", "pinyin": "jiazi", "description": "我是有领导力的老鼠，敢想敢干、胆大心细又聪慧，努力进取、勤练本领，盼被世人看见。", "category": "日柱", "keywords": ["领导力", "老鼠", "敢想敢干", "胆大心细", "聪慧", "努力进取"]},
      {"cardNumber": 2, "cardName": "乙丑", "pinyin": "yichou", "description": "我是有承载力的牛，有德有才、任劳任怨，沉稳靠谱，凭坚定意念朝着目标前行。", "category": "日柱", "keywords": ["承载力", "牛", "有德有才", "任劳任怨", "沉稳靠谱", "坚定意念"]},
      {"cardNumber": 3, "cardName": "丙寅", "pinyin": "bingyin", "description": "我是山里有号召力的老虎，不怒自威、战斗力强，爱交友，这地盘我说了算。", "category": "日柱", "keywords": ["号召力", "老虎", "不怒自威", "战斗力强", "爱交友"]},
      {"cardNumber": 4, "cardName": "丁卯", "pinyin": "dingmao", "description": "我是有演说力的兔子，温润质朴、才华独特，管理在行、讲规矩，追求独树一帜。", "category": "日柱", "keywords": ["演说力", "兔子", "温润质朴", "才华独特", "管理在行", "讲规矩"]},
      {"cardNumber": 5, "cardName": "戊辰", "pinyin": "wuchen", "description": "我是有学习力的龙，怀揣星辰大海的梦想，踏实稳重，靠清晰逻辑和计划逐梦。", "category": "日柱", "keywords": ["学习力", "龙", "星辰大海", "踏实稳重", "清晰逻辑", "计划"]},
      {"cardNumber": 6, "cardName": "己巳", "pinyin": "jisi", "description": "我是有战斗力的蛇，中正蓄藏、爱面子，为天下太平，凭灵活处事和包容求认可。", "category": "日柱", "keywords": ["战斗力", "蛇", "中正蓄藏", "爱面子", "天下太平", "灵活处事", "包容"]},
      {"cardNumber": 7, "cardName": "庚午", "pinyin": "gengwu", "description": "我是有变通力的马，文采卓越、精力充沛，行事干脆，靠冷静和原则追求革新。", "category": "日柱", "keywords": ["变通力", "马", "文采卓越", "精力充沛", "行事干脆", "冷静", "原则", "革新"]},
      {"cardNumber": 8, "cardName": "辛未", "pinyin": "xinwei", "description": "我是有执行力的羊，温暖体贴、懂感恩，性子急，说干就干，勇往直前向未来。", "category": "日柱", "keywords": ["执行力", "羊", "温暖体贴", "懂感恩", "性子急", "说干就干", "勇往直前"]},
      {"cardNumber": 9, "cardName": "壬申", "pinyin": "renshen", "description": "我是有拼搏力的猴子，名望贵气、重礼仪，谋定后动，行事必定有结果。", "category": "日柱", "keywords": ["拼搏力", "猴子", "名望贵气", "重礼仪", "谋定后动", "有结果"]},
      {"cardNumber": 10, "cardName": "癸酉", "pinyin": "guiyou", "description": "我是有总结力的鸡，外表高冷、内心柔软，文艺范足，钟情经典物件收藏。", "category": "日柱", "keywords": ["总结力", "鸡", "外表高冷", "内心柔软", "文艺范", "经典物件", "收藏"]},
      {"cardNumber": 11, "cardName": "甲戌", "pinyin": "jiaxu", "description": "我是有领导力的狗，目标明确、引领担当，怀揣梦想、自强不息，秉持正信正念。", "category": "日柱", "keywords": ["领导力", "狗", "目标明确", "引领担当", "怀揣梦想", "自强不息", "正信正念"]},
      {"cardNumber": 12, "cardName": "乙亥", "pinyin": "yihai", "description": "我是有承载力的猪，抓核心、善总结，得水生木滋养，承载包容，以德扬名。", "category": "日柱", "keywords": ["承载力", "猪", "抓核心", "善总结", "水生木", "承载包容", "以德扬名"]},
      {"cardNumber": 13, "cardName": "丙子", "pinyin": "bingzi", "description": "我是有号召力的老鼠，灵活有谋、个性鲜明，努力打拼，获父辈和客户认可。", "category": "日柱", "keywords": ["号召力", "老鼠", "灵活有谋", "个性鲜明", "努力打拼", "父辈认可", "客户认可"]},
      {"cardNumber": 14, "cardName": "丁丑", "pinyin": "dingchou", "description": "我是有演说力的牛，爱吃爱玩爱自由，追求简单严谨、热情浪漫的生活。", "category": "日柱", "keywords": ["演说力", "牛", "爱吃爱玩", "爱自由", "简单严谨", "热情浪漫"]},
      {"cardNumber": 15, "cardName": "戊寅", "pinyin": "wuyin", "description": "我是有学习力的老虎，敦厚靠谱、精益求精，化压力为动力，追求创新与知识。", "category": "日柱", "keywords": ["学习力", "老虎", "敦厚靠谱", "精益求精", "化压力为动力", "创新", "知识"]},
      {"cardNumber": 16, "cardName": "己卯", "pinyin": "jimao", "description": "我是有战斗力的兔子，能说会道、重集体，靠自律和体能进步实现价值。", "category": "日柱", "keywords": ["战斗力", "兔子", "能说会道", "重集体", "自律", "体能进步", "实现价值"]},
      {"cardNumber": 17, "cardName": "庚辰", "pinyin": "gengchen", "description": "我是有变通力的龙，气场威严、传播正能量，凭稳重和资源整合谋发展。", "category": "日柱", "keywords": ["变通力", "龙", "气场威严", "传播正能量", "稳重", "资源整合", "谋发展"]},
      {"cardNumber": 18, "cardName": "辛巳", "pinyin": "xinsi", "description": "我是有执行力的蛇，雷厉风行、追求完美，靠规划和信息差达目标。", "category": "日柱", "keywords": ["执行力", "蛇", "雷厉风行", "追求完美", "规划", "信息差", "达目标"]},
      {"cardNumber": 19, "cardName": "壬午", "pinyin": "renwu", "description": "我是文韬武略的壬午马，有谋好战、讲仁义，凭高要求和本领实现价值。", "category": "日柱", "keywords": ["文韬武略", "马", "有谋好战", "讲仁义", "高要求", "本领", "实现价值"]},
      {"cardNumber": 20, "cardName": "癸未", "pinyin": "guiwei", "description": "我是有总结力的羊，温柔细腻、务实靠谱，靠包容、执行和总结体现价值。", "category": "日柱", "keywords": ["总结力", "羊", "温柔细腻", "务实靠谱", "包容", "执行", "总结", "体现价值"]},
      {"cardNumber": 21, "cardName": "甲申", "pinyin": "jiashen", "description": "我是有领导力的猴子，神通广大、正义担当，凭气场和谋划出人头地。", "category": "日柱", "keywords": ["领导力", "猴子", "神通广大", "正义担当", "气场", "谋划", "出人头地"]},
      {"cardNumber": 22, "cardName": "乙酉", "pinyin": "yiyou", "description": "我是有承载力的鸡，温柔善良、多才多金，虚怀若谷，为天下无忧传道解惑。", "category": "日柱", "keywords": ["承载力", "鸡", "温柔善良", "多才多金", "虚怀若谷", "天下无忧", "传道解惑"]},
      {"cardNumber": 23, "cardName": "丙戌", "pinyin": "bingxu", "description": "我是有号召力的狗，稳重直言、与世无争，靠文采和叙述获认可。", "category": "日柱", "keywords": ["号召力", "狗", "稳重直言", "与世无争", "文采", "叙述", "获认可"]},
      {"cardNumber": 24, "cardName": "丁亥", "pinyin": "dinghai", "description": "我是有演说力的猪，温火柔情、多才纯粹，持续精进，抓核心提升气质。", "category": "日柱", "keywords": ["演说力", "猪", "温火柔情", "多才纯粹", "持续精进", "抓核心", "提升气质"]},
      {"cardNumber": 25, "cardName": "戊子", "pinyin": "wuzi", "description": "我是有学习力的老鼠，学识渊博、冷静公正，钻研创新，突破行业辉煌。", "category": "日柱", "keywords": ["学习力", "老鼠", "学识渊博", "冷静公正", "钻研创新", "突破行业", "辉煌"]},
      {"cardNumber": 26, "cardName": "己丑", "pinyin": "jichou", "description": "我是有战斗力的牛，内心火热、行事稳重，重交往讲原则，靠行动赢尊重。", "category": "日柱", "keywords": ["战斗力", "牛", "内心火热", "行事稳重", "重交往", "讲原则", "行动", "赢尊重"]},
      {"cardNumber": 27, "cardName": "庚寅", "pinyin": "gengyin", "description": "我是有变通力的老虎，胆大心细、善推理，凭原则巩固管理掌控平台。", "category": "日柱", "keywords": ["变通力", "老虎", "胆大心细", "善推理", "原则", "巩固管理", "掌控平台"]},
      {"cardNumber": 28, "cardName": "辛卯", "pinyin": "xinmao", "description": "我是有执行力的兔子，风格独特、重结果，靠信息整合紧跟目标。", "category": "日柱", "keywords": ["执行力", "兔子", "风格独特", "重结果", "信息整合", "紧跟目标"]},
      {"cardNumber": 29, "cardName": "壬辰", "pinyin": "renchen", "description": "我是有拼搏力的龙，权威大气、言传身教，重仁义礼智信树威望。", "category": "日柱", "keywords": ["拼搏力", "龙", "权威大气", "言传身教", "仁义礼智信", "树威望"]},
      {"cardNumber": 30, "cardName": "癸巳", "pinyin": "guisi", "description": "我是有总结力的蛇，处事圆滑、后发制人，发力不急，功到自然圆满。", "category": "日柱", "keywords": ["总结力", "蛇", "处事圆滑", "后发制人", "发力不急", "功到自然", "圆满"]},
      {"cardNumber": 31, "cardName": "甲午", "pinyin": "jiawu", "description": "我是有领导力的马，心性急躁、有爱心，靠文采和付出开拓未来。", "category": "日柱", "keywords": ["领导力", "马", "心性急躁", "有爱心", "文采", "付出", "开拓未来"]},
      {"cardNumber": 32, "cardName": "乙未", "pinyin": "yiwei", "description": "我是有承载力的羊，温柔感恩、缺安全感，爱折腾，凭韧劲付出求认可。", "category": "日柱", "keywords": ["承载力", "羊", "温柔感恩", "缺安全感", "爱折腾", "韧劲", "付出", "求认可"]},
      {"cardNumber": 33, "cardName": "丙申", "pinyin": "bingshen", "description": "我是有号召力的猴子，机灵浪漫，靠目标和沟通聚集资源。", "category": "日柱", "keywords": ["号召力", "猴子", "机灵浪漫", "目标", "沟通", "聚集资源"]},
      {"cardNumber": 34, "cardName": "丁酉", "pinyin": "dingyou", "description": "我是有演说力的鸡，多才善言、与众不同，靠敏锐统筹顺势而为。", "category": "日柱", "keywords": ["演说力", "鸡", "多才善言", "与众不同", "敏锐", "统筹", "顺势而为"]},
      {"cardNumber": 35, "cardName": "戊戌", "pinyin": "wuxu", "description": "我是爱学习的狗，朴实专研、追求正义，凭学术谋略力求更好。", "category": "日柱", "keywords": ["爱学习", "狗", "朴实专研", "追求正义", "学术", "谋略", "力求更好"]},
      {"cardNumber": 36, "cardName": "己亥", "pinyin": "jihai", "description": "我是有战斗力的猪，不怒自威、能屈能伸，抓核心问题，泽佑天下。", "category": "日柱", "keywords": ["战斗力", "猪", "不怒自威", "能屈能伸", "抓核心问题", "泽佑天下"]},
      {"cardNumber": 37, "cardName": "庚子", "pinyin": "gengzi", "description": "我是有变通力的老鼠，机智善变，靠技术革新开拓未来。", "category": "日柱", "keywords": ["变通力", "老鼠", "机智善变", "技术革新", "开拓未来"]},
      {"cardNumber": 38, "cardName": "辛丑", "pinyin": "xinchou", "description": "我是有执行力的牛，一心赚钱，凭洞察力和执行达目标。", "category": "日柱", "keywords": ["执行力", "牛", "一心赚钱", "洞察力", "执行", "达目标"]},
      {"cardNumber": 39, "cardName": "壬寅", "pinyin": "renyin", "description": "我是讲规矩的壬寅，威严好战，靠坚守初心证明自己。", "category": "日柱", "keywords": ["讲规矩", "威严好战", "坚守初心", "证明自己"]},
      {"cardNumber": 40, "cardName": "癸卯", "pinyin": "guimao", "description": "我是有总结力的兔子，处事圆滑公正，靠包容和耐力逐梦。", "category": "日柱", "keywords": ["总结力", "兔子", "处事圆滑", "公正", "包容", "耐力", "逐梦"]},
      {"cardNumber": 41, "cardName": "甲辰", "pinyin": "jiachen", "description": "我是有领导力的龙，爱笑善收集信息，吃苦创新，引领一方。", "category": "日柱", "keywords": ["领导力", "龙", "爱笑", "善收集信息", "吃苦创新", "引领一方"]},
      {"cardNumber": 42, "cardName": "乙巳", "pinyin": "yisi", "description": "我是有承载力的蛇，心思缜密、抗压强，凭韧劲修德达目的。", "category": "日柱", "keywords": ["承载力", "蛇", "心思缜密", "抗压强", "韧劲", "修德", "达目的"]},
      {"cardNumber": 43, "cardName": "丙午", "pinyin": "bingwu", "description": "我是有号召力的马，聪明有主见，不服就战，火力聚集求胜。", "category": "日柱", "keywords": ["号召力", "马", "聪明有主见", "不服就战", "火力聚集", "求胜"]},
      {"cardNumber": 44, "cardName": "丁未", "pinyin": "dingwei", "description": "我是有演说力的羊，喜悦善言，凭气质外交获尊敬求不同。", "category": "日柱", "keywords": ["演说力", "羊", "喜悦善言", "气质", "外交", "获尊敬", "求不同"]},
      {"cardNumber": 45, "cardName": "戊申", "pinyin": "wushen", "description": "我是有学习力的猴子，爱钻研、能动能静，慕强专研求认可。", "category": "日柱", "keywords": ["学习力", "猴子", "爱钻研", "能动能静", "慕强专研", "求认可"]},
      {"cardNumber": 46, "cardName": "己酉", "pinyin": "jiyou", "description": "我是有战斗力的鸡，重内涵善公关，靠自身战力为大家谋利。", "category": "日柱", "keywords": ["战斗力", "鸡", "重内涵", "善公关", "自身战力", "为大家谋利"]},
      {"cardNumber": 47, "cardName": "庚戌", "pinyin": "gengxu", "description": "我是有变通力的狗，有范有识、管控力强，凭学识革新解难。", "category": "日柱", "keywords": ["变通力", "狗", "有范有识", "管控力强", "学识", "革新", "解难"]},
      {"cardNumber": 48, "cardName": "辛亥", "pinyin": "xinhai", "description": "我是有执行力的猪，沉稳爱操心，以结果导向执行获认可。", "category": "日柱", "keywords": ["执行力", "猪", "沉稳爱操心", "结果导向", "执行", "获认可"]},
      {"cardNumber": 49, "cardName": "壬子", "pinyin": "renzi", "description": "我是有拼搏力的老鼠，重情义、有谋略，为初心全力拼搏。", "category": "日柱", "keywords": ["拼搏力", "老鼠", "重情义", "有谋略", "初心", "全力拼搏"]},
      {"cardNumber": 50, "cardName": "癸丑", "pinyin": "guichou", "description": "我是有总结力的牛，冷静睿智、善计划，靠扎实根基圆满人生。", "category": "日柱", "keywords": ["总结力", "牛", "冷静睿智", "善计划", "扎实根基", "圆满人生"]},
      {"cardNumber": 51, "cardName": "甲寅", "pinyin": "jiayin", "description": "我是有领导力的老虎，身披光环敢拓新，靠人情拓展人脉求新。", "category": "日柱", "keywords": ["领导力", "老虎", "身披光环", "敢拓新", "人情", "拓展人脉", "求新"]},
      {"cardNumber": 52, "cardName": "乙卯", "pinyin": "yimao", "description": "我是有承载力的兔子，纯洁大爱，凭勤奋包容求天下祥和。", "category": "日柱", "keywords": ["承载力", "兔子", "纯洁大爱", "勤奋", "包容", "天下祥和"]},
      {"cardNumber": 53, "cardName": "丙辰", "pinyin": "bingchen", "description": "我是有号召力的龙，直言有主见，靠务实神秘求精进。", "category": "日柱", "keywords": ["号召力", "龙", "直言有主见", "务实", "神秘", "求精进"]},
      {"cardNumber": 54, "cardName": "丁巳", "pinyin": "dingsi", "description": "我是有演说力的蛇，心思细腻、追求独特，专注深扎寻趣。", "category": "日柱", "keywords": ["演说力", "蛇", "心思细腻", "追求独特", "专注深扎", "寻趣"]},
      {"cardNumber": 55, "cardName": "戊午", "pinyin": "wuwu", "description": "我是有学习力的马，文武双全、精力旺，凭吃苦精进实现价值。", "category": "日柱", "keywords": ["学习力", "马", "文武双全", "精力旺", "吃苦精进", "实现价值"]},
      {"cardNumber": 56, "cardName": "己未", "pinyin": "jiwei", "description": "我是有战斗力的羊，从容爱面子、顾大局，凭包容信仰实现价值。", "category": "日柱", "keywords": ["战斗力", "羊", "从容爱面子", "顾大局", "包容", "信仰", "实现价值"]},
      {"cardNumber": 57, "cardName": "庚申", "pinyin": "gengshen", "description": "我是有变通力的猴子，公平威严、荣誉感强，靠管控调配光宗耀祖。", "category": "日柱", "keywords": ["变通力", "猴子", "公平威严", "荣誉感强", "管控调配", "光宗耀祖"]},
      {"cardNumber": 58, "cardName": "辛酉", "pinyin": "xinyou", "description": "我是有执行力的鸡，气场强爱自由，平衡资源，为富甲一方努力。", "category": "日柱", "keywords": ["执行力", "鸡", "气场强", "爱自由", "平衡资源", "富甲一方", "努力"]},
      {"cardNumber": 59, "cardName": "壬戌", "pinyin": "renxu", "description": "我是有拼搏力的狗，冷静睿智、重礼仪，追求爱敬存心舍财做福。", "category": "日柱", "keywords": ["拼搏力", "狗", "冷静睿智", "重礼仪", "爱敬存心", "舍财做福"]},
      {"cardNumber": 60, "cardName": "癸亥", "pinyin": "guihai", "description": "我是有总结力的猪，感知敏锐、外冷内热，靠远见承载实现暗谋。", "category": "日柱", "keywords": ["总结力", "猪", "感知敏锐", "外冷内热", "远见", "承载", "实现暗谋"]}
    ];
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
    
    // 完全重新初始化所有数据和变量
    this._completeReinitialize();
    
    // 加载新档案数据
    this.loadProfileData(currentProfile);
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
    
    // 清理事件监听
    eventBus.off(SYSTEM_EVENTS.PROFILE_MANAGER_READY, this._handleProfileManagerReady);
    eventBus.off(PROFILE_EVENTS.PROFILE_SELECTED, this._handleSelectProfile);
    eventBus.off(PROFILE_EVENTS.PROFILE_UPDATED, this._handleProfileUpdated);
    
    super.onUnload();
  }
}

module.exports = { CardController };
