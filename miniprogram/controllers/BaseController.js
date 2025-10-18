/**
 * BaseController - 控制器基类
 * 
 * 提供所有控制器通用的辅助方法，包括：
 * - 用户交互提示（成功、错误、加载、确认等）
 * - 页面数据更新
 * - 导航操作
 * - 错误处理
 * 
 * 使用方式：
 * 1. 继承BaseController类
 * 2. 在构造函数中调用super(page)
 * 3. 使用this.page访问页面实例
 * 4. 调用各种辅助方法
 */

const { BaseClass } = require('../common/BaseClass');
const { globalUserManager } = require('../utils/globalUserManager');

class BaseController extends BaseClass {
  /**
   * 构造函数
   * @param {Object} page - 页面实例（Page对象）
   */
  constructor(page) {
    super(); // 调用BaseClass构造函数
    if (!page) {
      throw new Error('BaseController: page实例不能为空');
    }
    this.page = page;
    this._loadingCount = 0; // 加载计数器，支持嵌套加载
    this.userInfo = null; // 用户信息缓存
  }

  /**
   * 获取页面数据的便捷访问器
   * @returns {Object} 页面的data对象
   */
  get data() {
    return this.page ? this.page.data : null;
  }

  // ==================== 用户信息管理方法 ====================

  /**
   * 加载用户信息（统一方法，所有控制器都使用此方法）
   * @param {boolean} forceRefresh - 是否强制刷新，默认false
   * @returns {Promise<Object|null>} 用户信息对象
   */
  async loadUserInfo(forceRefresh = false) {
    this._log('loadUserInfo', '开始加载用户信息', { forceRefresh });
    
    try {
      const response = await globalUserManager.getUserInfo(forceRefresh);
      
      if (response.success && response.data) {
        this.userInfo = response.data;
        this._log('loadUserInfo', '用户信息加载成功', {
          userType: this.userInfo.userType,
          profileQuota: this.userInfo.profileQuota,
          usedProfiles: this.userInfo.usedProfiles
        });
        return this.userInfo;
      } else {
        this._error('loadUserInfo', '获取用户信息失败:', response.error);
        return null;
      }
    } catch (error) {
      this._error('loadUserInfo', '加载用户信息异常:', error);
      return null;
    }
  }

  /**
   * 刷新用户信息（业务操作后调用）
   * @returns {Promise<Object|null>} 用户信息对象
   */
  async refreshUserInfo() {
    this._log('refreshUserInfo', '刷新用户信息');
    return this.loadUserInfo(true);
  }

  /**
   * 获取缓存的用户信息（同步方法）
   * @returns {Object|null} 缓存的用户信息
   */
  getCachedUserInfo() {
    return this.userInfo;
  }

  // ==================== 用户交互提示方法 ====================

  /**
   * 显示成功提示
   * @param {string} message - 提示消息
   * @param {number} duration - 显示时长（毫秒），默认2000
   */
  _showSuccess(message, duration = 2000) {
    wx.showToast({
      title: message,
      icon: 'success',
      duration: duration
    });
  }

  /**
   * 显示错误提示
   * @param {string} message - 错误消息
   * @param {number} duration - 显示时长（毫秒），默认2000
   */
  _showError(message, duration = 2000) {
    wx.showToast({
      title: message,
      icon: 'error',
      duration: duration
    });
  }

  /**
   * 显示普通提示（无图标）
   * @param {string} message - 提示消息
   * @param {number} duration - 显示时长（毫秒），默认2000
   */
  _showMessage(message, duration = 2000) {
    wx.showToast({
      title: message,
      icon: 'none',
      duration: duration
    });
  }

  /**
   * 显示加载提示
   * @param {string} title - 加载提示文字，默认'加载中...'
   * @param {boolean} mask - 是否显示遮罩，默认true
   */
  _showLoading(title = '加载中...', mask = true) {
    this._loadingCount++;
    if (this._loadingCount === 1) {
      wx.showLoading({
        title: title,
        mask: mask
      });
    }
  }

  /**
   * 隐藏加载提示
   */
  _hideLoading() {
    this._loadingCount = Math.max(0, this._loadingCount - 1);
    if (this._loadingCount === 0) {
      wx.hideLoading();
    }
  }

  /**
   * 强制隐藏所有加载提示
   */
  _hideAllLoading() {
    this._loadingCount = 0;
    wx.hideLoading();
  }

  /**
   * 显示确认对话框
   * @param {string} title - 对话框标题
   * @param {string} content - 对话框内容
   * @param {string} confirmText - 确认按钮文字，默认'确定'
   * @param {string} cancelText - 取消按钮文字，默认'取消'
   * @returns {Promise<boolean>} 用户是否点击确认
   */
  async _confirm(title, content, confirmText = '确定', cancelText = '取消') {
    return new Promise((resolve) => {
      wx.showModal({
        title: title,
        content: content,
        confirmText: confirmText,
        cancelText: cancelText,
        success: (res) => {
          resolve(res.confirm);
        },
        fail: () => {
          resolve(false);
        }
      });
    });
  }

  /**
   * 显示输入对话框
   * @param {string} title - 对话框标题
   * @param {string} placeholder - 输入框占位符
   * @param {string} defaultValue - 默认值
   * @returns {Promise<string|null>} 用户输入的内容，取消返回null
   */
  async _prompt(title, placeholder = '请输入', defaultValue = '') {
    return new Promise((resolve) => {
      wx.showModal({
        title: title,
        editable: true,
        placeholderText: placeholder,
        content: defaultValue,
        success: (res) => {
          if (res.confirm) {
            resolve(res.content || '');
          } else {
            resolve(null);
          }
        },
        fail: () => {
          resolve(null);
        }
      });
    });
  }

  /**
   * 显示操作菜单
   * @param {Array<string>} itemList - 菜单项列表
   * @returns {Promise<number|null>} 选中的索引，取消返回null
   */
  async _showActionSheet(itemList) {
    return new Promise((resolve) => {
      wx.showActionSheet({
        itemList: itemList,
        success: (res) => {
          resolve(res.tapIndex);
        },
        fail: () => {
          resolve(null);
        }
      });
    });
  }

  // ==================== 页面数据操作方法 ====================

  /**
   * 更新页面数据
   * @param {Object} data - 要更新的数据对象
   * @param {Function} callback - 更新完成后的回调函数
   */
  _setData(data, callback) {
    this.page.setData(data, callback);
  }

  /**
   * 获取页面数据
   * @param {string} key - 数据键名，不传则返回所有数据
   * @returns {any} 数据值
   */
  _getData(key) {
    return key ? this.page.data[key] : this.page.data;
  }

  /**
   * 设置加载状态
   * @param {boolean} loading - 是否加载中
   * @param {string} loadingText - 加载文字
   */
  _setLoading(loading, loadingText = '加载中...') {
    this._setData({
      loading: loading,
      loadingText: loadingText
    });
  }

  // ==================== 导航操作方法 ====================

  /**
   * 页面跳转
   * @param {string} url - 目标页面路径
   * @param {Object} params - 传递的参数
   */
  _navigateTo(url, params = {}) {
    const queryString = this._buildQueryString(params);
    const fullUrl = queryString ? `${url}?${queryString}` : url;
    
    wx.navigateTo({
      url: fullUrl,
      fail: (error) => {
        this._error('页面跳转失败', error);
        this._showError('页面跳转失败');
      }
    });
  }

  /**
   * 页面重定向
   * @param {string} url - 目标页面路径
   * @param {Object} params - 传递的参数
   */
  _redirectTo(url, params = {}) {
    const queryString = this._buildQueryString(params);
    const fullUrl = queryString ? `${url}?${queryString}` : url;
    
    wx.redirectTo({
      url: fullUrl,
      fail: (error) => {
        this._error('页面重定向失败', error);
        this._showError('页面重定向失败');
      }
    });
  }

  /**
   * 返回上一页
   * @param {number} delta - 返回层数，默认1
   */
  _navigateBack(delta = 1) {
    wx.navigateBack({
      delta: delta,
      fail: (error) => {
        this._error('返回上一页失败', error);
        this._showError('返回失败');
      }
    });
  }

  /**
   * 切换到TabBar页面
   * @param {string} url - TabBar页面路径
   */
  _switchTab(url) {
    wx.switchTab({
      url: url,
      fail: (error) => {
        this._error('切换TabBar失败', error);
        this._showError('页面切换失败');
      }
    });
  }

  // ==================== 工具方法 ====================

  /**
   * 构建查询字符串
   * @param {Object} params - 参数对象
   * @returns {string} 查询字符串
   */
  _buildQueryString(params) {
    if (!params || Object.keys(params).length === 0) {
      return '';
    }
    
    return Object.keys(params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');
  }

  // ==================== 错误处理方法 ====================

  /**
   * 统一错误处理
   * @param {Error|string} error - 错误对象或错误消息
   * @param {string} context - 错误上下文
   */
  _handleError(error, context = '') {
    const errorMessage = error instanceof Error ? error.message : error;
    const fullContext = context ? `[${context}] ` : '';
    
    this._error(`${fullContext}错误`, error);
    this._showError(`${fullContext}${errorMessage}`);
  }

  /**
   * 处理API响应错误
   * @param {Object} response - API响应对象
   * @param {string} defaultMessage - 默认错误消息
   */
  _handleApiError(response, defaultMessage = '操作失败') {
    if (response && response.error) {
      this._showError(response.error);
    } else {
      this._showError(defaultMessage);
    }
  }

  // ==================== 生命周期辅助方法 ====================

  /**
   * 页面加载完成后的初始化
   * 子类可以重写此方法
   */
  async initialize() {
    this._log('页面初始化');
  }

  /**
   * 页面显示时的处理
   * 子类可以重写此方法
   */
  async onShow() {
    this._log('onShow', '页面显示');
    
    // 自动加载用户信息（优先使用缓存）
    await this.loadUserInfo();
  }

  /**
   * 页面隐藏时的处理
   * 子类可以重写此方法
   */
  onHide() {
    this._log('页面隐藏');
    // 隐藏所有加载提示
    this._hideAllLoading();
  }

  /**
   * 页面卸载时的清理
   * 子类可以重写此方法
   */
  onUnload() {
    this._log('页面卸载');
    // 隐藏所有加载提示
    this._hideAllLoading();
  }
}

module.exports = { BaseController };
