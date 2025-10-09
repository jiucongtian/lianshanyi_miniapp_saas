/**
 * EventBus 事件类型定义
 * 统一管理所有事件名称，避免硬编码和拼写错误
 */

// 用户相关事件
const USER_EVENTS = {
  /** 用户信息更新事件 */
  USER_INFO_UPDATED: 'userInfoUpdated',
  /** 用户登录事件 */
  USER_LOGIN: 'userLogin',
  /** 用户登出事件 */
  USER_LOGOUT: 'userLogout',
  /** 用户权限变更事件 */
  USER_PERMISSION_CHANGED: 'userPermissionChanged'
};

// 档案相关事件
const PROFILE_EVENTS = {
  /** 档案创建事件 */
  PROFILE_CREATED: 'profileCreated',
  /** 档案更新事件 */
  PROFILE_UPDATED: 'profileUpdated',
  /** 档案删除事件 */
  PROFILE_DELETED: 'profileDeleted',
  /** 档案选中事件 */
  PROFILE_SELECTED: 'selectProfile',
  /** 档案列表刷新事件 */
  PROFILE_LIST_REFRESH: 'profileListRefresh',
  /** 档案数据加载完成事件 */
  PROFILE_DATA_LOADED: 'profileDataLoaded'
};

// 系统相关事件
const SYSTEM_EVENTS = {
  /** ProfileManager初始化完成事件 */
  PROFILE_MANAGER_READY: 'profileManagerReady',
  /** 应用启动完成事件 */
  APP_READY: 'appReady',
  /** 网络状态变化事件 */
  NETWORK_STATUS_CHANGED: 'networkStatusChanged',
  /** 缓存清理事件 */
  CACHE_CLEARED: 'cacheCleared'
};

// 卡牌相关事件
const CARD_EVENTS = {
  /** 卡牌数据更新事件 */
  CARD_DATA_UPDATED: 'cardDataUpdated',
  /** 卡牌图片加载完成事件 */
  CARD_IMAGE_LOADED: 'cardImageLoaded',
  /** 卡牌选择事件 */
  CARD_SELECTED: 'cardSelected'
};

// 页面相关事件
const PAGE_EVENTS = {
  /** 页面显示事件 */
  PAGE_SHOW: 'pageShow',
  /** 页面隐藏事件 */
  PAGE_HIDE: 'pageHide',
  /** 页面数据刷新事件 */
  PAGE_DATA_REFRESH: 'pageDataRefresh'
};

// 所有事件类型汇总
const EVENT_TYPES = {
  ...USER_EVENTS,
  ...PROFILE_EVENTS,
  ...SYSTEM_EVENTS,
  ...CARD_EVENTS,
  ...PAGE_EVENTS
};

// 事件分类（用于文档和调试）
const EVENT_CATEGORIES = {
  USER: USER_EVENTS,
  PROFILE: PROFILE_EVENTS,
  SYSTEM: SYSTEM_EVENTS,
  CARD: CARD_EVENTS,
  PAGE: PAGE_EVENTS
};

/**
 * 验证事件名称是否有效
 * @param {string} eventName - 事件名称
 * @returns {boolean} 是否有效
 */
function isValidEventName(eventName) {
  return Object.values(EVENT_TYPES).includes(eventName);
}

/**
 * 获取事件分类
 * @param {string} eventName - 事件名称
 * @returns {string|null} 事件分类
 */
function getEventCategory(eventName) {
  for (const [category, events] of Object.entries(EVENT_CATEGORIES)) {
    if (Object.values(events).includes(eventName)) {
      return category;
    }
  }
  return null;
}

/**
 * 获取所有事件名称列表
 * @returns {Array<string>} 事件名称列表
 */
function getAllEventNames() {
  return Object.values(EVENT_TYPES);
}

/**
 * 获取指定分类的事件名称列表
 * @param {string} category - 事件分类
 * @returns {Array<string>} 事件名称列表
 */
function getEventNamesByCategory(category) {
  const events = EVENT_CATEGORIES[category.toUpperCase()];
  return events ? Object.values(events) : [];
}

module.exports = {
  // 事件常量
  USER_EVENTS,
  PROFILE_EVENTS,
  SYSTEM_EVENTS,
  CARD_EVENTS,
  PAGE_EVENTS,
  EVENT_TYPES,
  EVENT_CATEGORIES,
  
  // 工具函数
  isValidEventName,
  getEventCategory,
  getAllEventNames,
  getEventNamesByCategory
};
