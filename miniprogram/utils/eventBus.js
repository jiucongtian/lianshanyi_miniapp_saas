/**
 * EventBus - 事件总线
 * 
 * 提供事件的发布/订阅机制，支持：
 * - 事件监听（on）和一次性监听（once）
 * - 事件触发（emit）
 * - 事件取消（off）
 * - 静默模式事件（不会在无监听器时产生警告）
 * 
 * 使用示例：
 * 
 * // 普通事件触发
 * eventBus.emit('userLogin', userData);
 * 
 * // 静默模式事件（允许没有监听器）
 * eventBus.emit('userInfoUpdated', userData, { __emitOptions__: true, silent: true });
 */

const { isValidEventName, getEventCategory } = require('./eventTypes');
const { config } = require('../config/index');
const { createModuleLogger } = require('./logger/index');
const log = createModuleLogger('EventBus');

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
        log.warn('on', '未知事件名称', { event });
        log.warn('on', '请检查 eventTypes.js 中是否定义了该事件');
      }
      
      if (!this.events[event]) this.events[event] = [];
      this.events[event].push(callback);
      
      // 开发环境下记录事件监听
      if (isDev) {
        const category = getEventCategory(event);
        log.debug('on', '监听事件', { event, category: category || '未知分类' });
      }
    },
    
    /**
     * 监听事件（只执行一次）
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    once(event, callback) {
      // 开发环境下验证事件名称
      if (isDev && !isValidEventName(event)) {
        log.warn('once', '未知事件名称', { event });
        log.warn('once', '请检查 eventTypes.js 中是否定义了该事件');
      }
      
      // 创建一个包装函数，执行一次后自动移除
      const onceCallback = (...args) => {
        callback(...args);
        this.off(event, onceCallback);
      };
      
      this.on(event, onceCallback);
      
      // 开发环境下记录事件监听
      if (isDev) {
        const category = getEventCategory(event);
        log.debug('once', '监听事件(一次性)', { event, category: category || '未知分类' });
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
          log.debug('off', '取消所有监听', { event });
        }
      } else {
        // 取消指定监听
        const index = this.events[event].indexOf(callback);
        if (index !== -1) {
          this.events[event].splice(index, 1);
          if (isDev) {
            log.debug('off', '取消监听', { event });
          }
        }
      }
    },
    
    /**
     * 触发事件
     * @param {string} event - 事件名称
     * @param {...any} args - 事件参数
     * @param {Object} options - 选项（最后一个参数如果是普通对象且包含 __silent__ 属性则视为选项）
     */
    emit(event, ...args) {
      // 检查最后一个参数是否是选项对象
      let options = {};
      if (args.length > 0) {
        const lastArg = args[args.length - 1];
        if (lastArg && typeof lastArg === 'object' && lastArg.__emitOptions__) {
          options = args.pop();
        }
      }
      
      // 开发环境下验证事件名称
      if (isDev && !isValidEventName(event)) {
        log.warn('emit', '未知事件名称', { event });
        log.warn('emit', '请检查 eventTypes.js 中是否定义了该事件');
      }
      
      if (this.events[event]) {
        this.events[event].forEach((callback) => {
          try {
            callback(...args);
          } catch (error) {
            log.error('emit', '事件回调执行失败', { event, error: error.message });
          }
        });
        
        // 开发环境下记录事件触发
        if (isDev) {
          const category = getEventCategory(event);
          log.debug('emit', '触发事件', { event, category: category || '未知分类', argsCount: args.length });
        }
      } else if (isDev && !options.silent) {
        // 只有非静默模式才发出警告
        log.warn('emit', '没有监听器监听事件', { event });
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
        log.info('clear', '清除所有事件监听');
      }
    }
  };
}

// 创建单例实例
const eventBus = createBus();

module.exports = eventBus;
