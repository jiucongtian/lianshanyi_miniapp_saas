/**
 * BaseBean - 数据Bean基类
 * 
 * 提供所有数据Bean共用的功能：
 * - 数据验证
 * - 字段映射
 * - 默认值处理
 * - 数据完整性检查
 * - 数据转换
 * 
 * 使用方式：
 * 1. 继承BaseBean类
 * 2. 在子类构造函数中调用super()
 * 3. 定义字段映射规则
 * 4. 实现自定义验证逻辑
 * 
 * 继承示例：
 * class UserBean extends BaseBean {
 *   constructor(data) {
 *     super(data);
 *     this._defineFields();
 *     this._validate();
 *   }
 * 
 *   _defineFields() {
 *     this._id = this._getField(this.data, '_id', '');
 *     this.nickName = this._getField(this.data, 'nickName', '微信用户');
 *   }
 * }
 */

const { BaseClass } = require('../common/BaseClass');

class BaseBean extends BaseClass {
  /**
   * 构造函数
   * @param {Object} data - 原始数据对象
   */
  constructor(data = {}) {
    super();
    
    // 保存原始数据
    this._rawData = data;
    
    // 数据对象
    this.data = this._normalizeData(data);
    
    // 验证错误列表
    this._validationErrors = [];
    
    // 是否已验证
    this._isValidated = false;
  }

  // ==================== 数据处理方法 ====================

  /**
   * 标准化数据（确保data是对象）
   * @param {any} data - 原始数据
   * @returns {Object} 标准化后的数据
   * @private
   */
  _normalizeData(data) {
    if (!data || typeof data !== 'object') {
      this._warn('数据不是有效的对象，使用空对象', { data });
      return {};
    }
    
    if (Array.isArray(data)) {
      this._warn('数据是数组，使用空对象', { data });
      return {};
    }
    
    return data;
  }

  /**
   * 获取字段值（带默认值和类型检查）
   * @param {Object} obj - 数据对象
   * @param {string} fieldName - 字段名
   * @param {any} defaultValue - 默认值
   * @param {string} expectedType - 期望的类型（可选）
   * @returns {any} 字段值
   */
  _getField(obj, fieldName, defaultValue, expectedType = null) {
    // 检查字段是否存在
    if (!obj || !obj.hasOwnProperty(fieldName)) {
      this._debug(`字段 ${fieldName} 不存在，使用默认值:`, defaultValue);
      return defaultValue;
    }
    
    const value = obj[fieldName];
    
    // 如果值为null或undefined，返回默认值
    if (value === null || value === undefined) {
      this._debug(`字段 ${fieldName} 为空，使用默认值:`, defaultValue);
      return defaultValue;
    }
    
    // 类型检查（如果指定了期望类型）
    if (expectedType) {
      const actualType = typeof value;
      if (actualType !== expectedType) {
        this._warn(
          `字段 ${fieldName} 类型不匹配，期望 ${expectedType}，实际 ${actualType}，使用默认值`,
          { value, defaultValue }
        );
        return defaultValue;
      }
    }
    
    return value;
  }

  /**
   * 获取嵌套字段值
   * @param {Object} obj - 数据对象
   * @param {string} path - 字段路径，如 'user.profile.name'
   * @param {any} defaultValue - 默认值
   * @returns {any} 字段值
   */
  _getNestedField(obj, path, defaultValue) {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (!current || typeof current !== 'object' || !current.hasOwnProperty(key)) {
        this._debug(`嵌套字段 ${path} 不存在，使用默认值:`, defaultValue);
        return defaultValue;
      }
      current = current[key];
    }
    
    return current === null || current === undefined ? defaultValue : current;
  }

  // ==================== 数据验证方法 ====================

  /**
   * 验证必需字段
   * @param {string} fieldName - 字段名
   * @param {any} value - 字段值
   * @returns {boolean} 是否有效
   */
  _validateRequiredField(fieldName, value) {
    if (value === null || value === undefined || value === '') {
      this._addValidationError(fieldName, '必需字段缺失');
      return false;
    }
    return true;
  }

  /**
   * 验证字段类型
   * @param {string} fieldName - 字段名
   * @param {any} value - 字段值
   * @param {string} expectedType - 期望类型
   * @returns {boolean} 是否有效
   */
  _validateFieldType(fieldName, value, expectedType) {
    const actualType = typeof value;
    if (actualType !== expectedType) {
      this._addValidationError(
        fieldName,
        `类型错误：期望 ${expectedType}，实际 ${actualType}`
      );
      return false;
    }
    return true;
  }

  /**
   * 验证字段范围
   * @param {string} fieldName - 字段名
   * @param {number} value - 字段值
   * @param {number} min - 最小值
   * @param {number} max - 最大值
   * @returns {boolean} 是否有效
   */
  _validateFieldRange(fieldName, value, min, max) {
    if (typeof value !== 'number') {
      this._addValidationError(fieldName, '不是数字类型');
      return false;
    }
    
    if (value < min || value > max) {
      this._addValidationError(
        fieldName,
        `超出范围：期望 [${min}, ${max}]，实际 ${value}`
      );
      return false;
    }
    
    return true;
  }

  /**
   * 验证字符串长度
   * @param {string} fieldName - 字段名
   * @param {string} value - 字段值
   * @param {number} minLength - 最小长度
   * @param {number} maxLength - 最大长度
   * @returns {boolean} 是否有效
   */
  _validateStringLength(fieldName, value, minLength, maxLength) {
    if (typeof value !== 'string') {
      this._addValidationError(fieldName, '不是字符串类型');
      return false;
    }
    
    const length = value.length;
    if (length < minLength || length > maxLength) {
      this._addValidationError(
        fieldName,
        `长度超出范围：期望 [${minLength}, ${maxLength}]，实际 ${length}`
      );
      return false;
    }
    
    return true;
  }

  /**
   * 验证数组
   * @param {string} fieldName - 字段名
   * @param {any} value - 字段值
   * @param {number} minLength - 最小长度（可选）
   * @returns {boolean} 是否有效
   */
  _validateArray(fieldName, value, minLength = 0) {
    if (!Array.isArray(value)) {
      this._addValidationError(fieldName, '不是数组类型');
      return false;
    }
    
    if (value.length < minLength) {
      this._addValidationError(
        fieldName,
        `数组长度不足：期望至少 ${minLength}，实际 ${value.length}`
      );
      return false;
    }
    
    return true;
  }

  /**
   * 添加验证错误
   * @param {string} fieldName - 字段名
   * @param {string} errorMessage - 错误消息
   */
  _addValidationError(fieldName, errorMessage) {
    this._validationErrors.push({
      field: fieldName,
      message: errorMessage
    });
    this._warn(`验证失败: ${fieldName} - ${errorMessage}`);
  }

  /**
   * 获取验证错误
   * @returns {Array} 验证错误列表
   */
  getValidationErrors() {
    return this._validationErrors;
  }

  /**
   * 是否有验证错误
   * @returns {boolean} 是否有错误
   */
  hasValidationErrors() {
    return this._validationErrors.length > 0;
  }

  /**
   * 是否验证通过
   * @returns {boolean} 是否通过
   */
  isValid() {
    return !this.hasValidationErrors();
  }

  // ==================== 数据转换方法 ====================

  /**
   * 转换为普通对象（不包含方法和私有属性）
   * @returns {Object} 普通对象
   */
  toObject() {
    const obj = {};
    
    for (const key in this) {
      if (this.hasOwnProperty(key) && !key.startsWith('_')) {
        const value = this[key];
        
        // 跳过函数
        if (typeof value === 'function') {
          continue;
        }
        
        // 如果值也是BaseBean实例，递归转换
        if (value instanceof BaseBean) {
          obj[key] = value.toObject();
        } else if (Array.isArray(value)) {
          // 处理数组
          obj[key] = value.map(item => 
            item instanceof BaseBean ? item.toObject() : item
          );
        } else {
          obj[key] = value;
        }
      }
    }
    
    return obj;
  }

  /**
   * 转换为JSON字符串
   * @param {boolean} pretty - 是否格式化
   * @returns {string} JSON字符串
   */
  toJSON(pretty = false) {
    const obj = this.toObject();
    return pretty ? JSON.stringify(obj, null, 2) : JSON.stringify(obj);
  }

  /**
   * 获取原始数据
   * @returns {Object} 原始数据
   */
  getRawData() {
    return this._rawData;
  }

  // ==================== 工具方法 ====================

  /**
   * 克隆Bean实例
   * @returns {BaseBean} 新的Bean实例
   */
  clone() {
    const Constructor = this.constructor;
    return new Constructor(this._deepClone(this._rawData));
  }

  /**
   * 合并数据
   * @param {Object} newData - 新数据
   * @returns {BaseBean} 合并后的新实例
   */
  merge(newData) {
    const mergedData = Object.assign({}, this._rawData, newData);
    const Constructor = this.constructor;
    return new Constructor(mergedData);
  }

  /**
   * 打印Bean信息（用于调试）
   */
  _printBeanInfo() {
    this._log('Bean信息:', {
      className: this.className,
      hasRawData: !!this._rawData,
      isValidated: this._isValidated,
      validationErrorsCount: this._validationErrors.length,
      fields: Object.keys(this.toObject())
    });
  }

  /**
   * 转换为字符串
   * @returns {string} 字符串表示
   */
  toString() {
    return `[${this.className}] ${this.toJSON()}`;
  }
}

module.exports = { BaseBean };
