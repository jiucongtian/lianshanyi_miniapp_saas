const { isValidEventName, getEventCategory } = require('./eventTypes');
const { config } = require('../config/index');

// 使用统一的配置来判断是否为开发环境
const isDev = config.debugMode;

function createBus() {
  return {
    events: {},
    
    /**
     * 监听事件
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    on(event, callback) {
      // 开发环境下验证事件名称
      if (isDev && !isValidEventName(event)) {
        console.warn(`[EventBus] 未知事件名称: "${event}"`);
        console.warn(`[EventBus] 请检查 eventTypes.js 中是否定义了该事件`);
      }
      
      if (!this.events[event]) this.events[event] = [];
      this.events[event].push(callback);
      
      // 开发环境下记录事件监听
      if (isDev) {
        const category = getEventCategory(event);
        console.log(`[EventBus] 监听事件: ${event} (${category || '未知分类'})`);
      }
    },
    
    /**
     * 取消监听事件
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数（可选，不传则取消所有监听）
     */
    off(event, callback) {
      if (!this.events[event]) return;
      
      if (!callback) {
        // 取消所有监听
        this.events[event] = [];
        if (isDev) {
          console.log(`[EventBus] 取消所有监听: ${event}`);
        }
      } else {
        // 取消指定监听
        const index = this.events[event].indexOf(callback);
        if (index !== -1) {
          this.events[event].splice(index, 1);
          if (isDev) {
            console.log(`[EventBus] 取消监听: ${event}`);
          }
        }
      }
    },
    
    /**
     * 触发事件
     * @param {string} event - 事件名称
     * @param {...any} args - 事件参数
     */
    emit(event, ...args) {
      // 开发环境下验证事件名称
      if (isDev && !isValidEventName(event)) {
        console.warn(`[EventBus] 未知事件名称: "${event}"`);
        console.warn(`[EventBus] 请检查 eventTypes.js 中是否定义了该事件`);
      }
      
      if (this.events[event]) {
        this.events[event].forEach((callback) => {
          try {
            callback(...args);
          } catch (error) {
            console.error(`[EventBus] 事件回调执行失败: ${event}`, error);
          }
        });
        
        // 开发环境下记录事件触发
        if (isDev) {
          const category = getEventCategory(event);
          console.log(`[EventBus] 触发事件: ${event} (${category || '未知分类'})`, args);
        }
      } else if (isDev) {
        console.warn(`[EventBus] 没有监听器监听事件: ${event}`);
      }
    },
    
    /**
     * 获取所有事件名称
     * @returns {Array<string>} 事件名称列表
     */
    getEventNames() {
      return Object.keys(this.events);
    },
    
    /**
     * 获取指定事件的监听器数量
     * @param {string} event - 事件名称
     * @returns {number} 监听器数量
     */
    getListenerCount(event) {
      return this.events[event] ? this.events[event].length : 0;
    },
    
    /**
     * 清除所有事件监听
     */
    clear() {
      this.events = {};
      if (isDev) {
        console.log('[EventBus] 清除所有事件监听');
      }
    }
  };
}

// 创建单例实例
const eventBus = createBus();

module.exports = eventBus;
