/**
 * 添加档案页面控制器
 * 处理档案创建和编辑相关的业务逻辑，包括表单验证、配额检查、八字计算、档案保存等
 * 
 * 使用方式：
 * 1. 在页面中创建AddProfileController实例
 * 2. 调用initialize()方法初始化页面
 * 3. 使用各种方法处理用户交互
 * 
 * 示例：
 * ```javascript
 * const { AddProfileController } = require('../../controllers/AddProfileController');
 * 
 * Page({
 *   onLoad(options) {
 *     this.controller = new AddProfileController(this);
 *     this.controller.initialize(options);
 *   }
 * });
 * ```
 */

const { BaseController } = require('./BaseController');
const { userService } = require('../services/UserService');
const { profileService } = require('../services/ProfileService');
const { profileManager } = require('../utils/profileManager');
const { ResponseBean } = require('../beans/ResponseBean');
const eventBus = require('../utils/eventBus');
const { PROFILE_EVENTS } = require('../utils/eventTypes');

class AddProfileController extends BaseController {
  /**
   * 构造函数
   * @param {Object} page - 页面实例
   */
  constructor(page) {
    super(page);
    
    // 页面状态
    this.pageMode = 'create'; // create=创建，edit=编辑
    this.editingProfileId = null;
    this.originalProfileData = null;
    
    // 表单数据
    this.formData = {
      name: '',
      gender: 1
    };
    
    // 时间选择相关
    this.dateTimeValue = null;
    this.formatedDateTime = '';
    this.birthDate = null;
    this.isUncertainTime = false;
    
    // 表单验证状态
    this.nameError = '';
    this.isFormValid = false;
    
    // 用户信息
    this.userInfo = null;
    
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
      // 判断创建/编辑模式
      this._determinePageMode(options);
      
      // 加载用户信息
      await this.loadUserInfo();
      
      // 初始化时间选择器
      this._initializeTimePicker();
      
      // 加载编辑数据（编辑模式）
      if (this.pageMode === 'edit') {
        await this.loadEditingData();
      }
      
      // 验证表单
      this.validateForm();
      
      this._log('initialize', '页面初始化完成，模式:', this.pageMode);
    } catch (error) {
      this._error('initialize', '页面初始化失败:', error);
      this._handleError(error, '页面初始化');
    }
  }

  /**
   * 验证表单
   * @returns {boolean} 表单是否有效
   */
  validateForm() {
    this._log('validateForm', '开始验证表单');
    
    let isValid = true;
    let nameError = '';

    // 验证名称
    if (!this.formData.name || this.formData.name.trim() === '') {
      nameError = '请输入名称';
      isValid = false;
    } else if (this.formData.name.trim().length < 1) {
      nameError = '名称至少需要1个字符';
      isValid = false;
    } else if (this.formData.name.trim().length > 20) {
      nameError = '名称不能超过20个字符';
      isValid = false;
    }

    // 验证出生信息
    if (!this.formatedDateTime) {
      isValid = false;
    }

    // 更新页面数据
    this._setData({
      nameError,
      isFormValid: isValid
    });

    this._log('validateForm', '表单验证完成，结果:', isValid);
    return isValid;
  }

  /**
   * 检查用户配额
   * @returns {Promise<boolean>} 是否可以创建档案
   */
  async checkQuota() {
    this._log('checkQuota', '开始检查用户配额');
    
    try {
      const response = await userService.checkQuota();
      
      if (response.success) {
        const { canCreateMore, userType, currentCount, quota } = response.data;
        
        if (!canCreateMore) {
          this._showQuotaExceededDialog(userType, quota);
          return false;
        }
        
        this._log('checkQuota', '配额检查通过');
        return true;
      } else {
        this._error('checkQuota', '检查配额失败:', response.error);
        this._showError('检查权限失败：' + (response.error || '未知错误'));
        return false;
      }
    } catch (error) {
      this._error('checkQuota', '检查配额异常:', error);
      this._handleError(error, '检查配额');
      return false;
    }
  }

  /**
   * 计算八字（通过创建档案实现）
   * @returns {Promise<Object|null>} 八字计算结果
   */
  async calculateBazi() {
    this._log('calculateBazi', '开始计算八字');
    
    if (!this.birthDate) {
      this._error('calculateBazi', '没有出生日期，无法计算八字');
      this._showError('请先选择出生时间');
      return null;
    }

    try {
      // 构建档案数据
      const profileData = {
        profileName: this.formData.name.trim(),
        birthDate: this.birthDate,
        gender: this.formData.gender,
        isUncertainTime: this.isUncertainTime,
        description: '用户创建的八字档案'
      };
      
      this._log('calculateBazi', '准备创建档案，数据:', profileData);
      
      // 调用档案创建服务（服务端会自动计算八字）
      const result = await profileService.createProfile(profileData);
      
      if (result.success) {
        this._log('calculateBazi', '档案创建成功，八字计算完成');
        return result.data;
      } else {
        this._error('calculateBazi', '档案创建失败:', result.error);
        this._showError('计算失败：' + (result.error || '未知错误'));
        return null;
      }
    } catch (error) {
      this._error('calculateBazi', '计算八字异常:', error);
      this._handleError(error, '计算八字');
      return null;
    }
  }

  /**
   * 搜索已有档案
   * @param {Object} searchData - 搜索条件
   * @returns {Promise<Array>} 搜索结果
   */
  async searchExisting(searchData) {
    this._log('searchExisting', '开始搜索已有档案:', searchData);
    
    try {
      const response = await profileService.searchProfile(searchData);
      
      if (response.success && response.data) {
        this._log('searchExisting', '搜索完成，找到档案数量:', response.data.profiles.length);
        return response.data.profiles;
      } else {
        this._error('searchExisting', '搜索档案失败:', response.error);
        return [];
      }
    } catch (error) {
      this._error('searchExisting', '搜索档案异常:', error);
      return [];
    }
  }

  /**
   * 保存档案（创建模式）
   * @returns {Promise<boolean>} 是否保存成功
   */
  async saveProfile() {
    this._log('saveProfile', '开始保存档案');
    
    // 验证表单
    if (!this.validateForm()) {
      this._showError('请完善必填信息');
      return false;
    }

    // 检查配额
    if (!(await this.checkQuota())) {
      return false;
    }

    // 确保用户已注册
    if (!(await this.ensureUserRegistered())) {
      this._showError('用户注册失败，请重试');
      return false;
    }

    // 显示加载状态
    this._showLoading('创建档案中...', true);

    try {
      // 计算八字并创建档案
      const result = await this.calculateBazi();
      
      this._hideLoading();
      
      if (result) {
        this._log('saveProfile', '档案保存成功');
        
        // 将新创建的档案添加到ProfileManager
        if (result.profile) {
          profileManager.addProfile(result.profile);
          this._log('saveProfile', '档案已添加到ProfileManager');
          
          // 设置新创建的档案为当前档案
          profileManager.setCurrentProfile(result.profile);
          this._log('saveProfile', '新创建的档案已设置为当前档案');
          
          // 设置全局数据中的新添加档案标记
          const app = getApp();
          app.globalData.newlyAddedProfileId = result.profileId;
        }
        
        // 触发档案列表刷新事件
        eventBus.emit(PROFILE_EVENTS.PROFILE_LIST_REFRESH);
        
        this._showSuccess('档案创建成功！');
        
        // 跳转到卡牌页面
        this._switchTab('/pages/card/index');
        
        return true;
      } else {
        this._showError('档案创建失败');
        return false;
      }
    } catch (error) {
      this._error('saveProfile', '保存档案异常:', error);
      this._hideLoading();
      this._handleError(error, '保存档案');
      return false;
    }
  }

  /**
   * 更新档案（编辑模式）
   * @returns {Promise<boolean>} 是否更新成功
   */
  async updateProfile() {
    this._log('updateProfile', '开始更新档案');
    
    if (!this.editingProfileId) {
      this._showError('档案ID异常，无法更新');
      return false;
    }

    // 检查数据是否有变化
    if (!this.hasDataChanged()) {
      this._showMessage('信息没有变化，无需更新');
      return true;
    }

    // 验证表单
    if (!this.validateForm()) {
      this._showError('请完善必填信息');
      return false;
    }

    // 显示加载状态
    this._showLoading('更新档案中...', true);

    try {
      // 构建更新数据
      const updateData = {
        profileName: this.formData.name.trim(),
        birthDate: this.birthDate,
        gender: this.formData.gender,
        isUncertainTime: this.isUncertainTime
      };
      
      this._log('updateProfile', '准备更新档案，数据:', updateData);
      
      // 调用档案更新服务
      const result = await profileService.updateProfile(this.editingProfileId, updateData);

      this._hideLoading();

      if (result.success) {
        this._log('updateProfile', '档案更新成功');
        
        // 更新ProfileManager中的档案数据
        profileManager.updateProfile(this.editingProfileId, result.data);
        this._log('updateProfile', 'ProfileManager中的档案已更新');
        
        // 编辑档案后，将编辑的档案设置为当前档案（提升用户体验）
        this._log('updateProfile', '编辑档案后，将编辑的档案设置为当前档案');
        this._log('updateProfile', '编辑档案ID:', this.editingProfileId);
        this._log('updateProfile', '更新后的档案数据:', result.data);
        
        profileManager.setCurrentProfile(result.data);
        this._log('updateProfile', '编辑的档案已设置为当前档案');
        
        // 验证设置是否成功
        const updatedCurrentProfile = profileManager.getCurrentProfile();
        this._log('updateProfile', '验证设置后的当前档案:', updatedCurrentProfile ? updatedCurrentProfile._id : 'null');
        
        // 清除本地存储的编辑数据
        try {
          wx.removeStorageSync('editingProfile');
        } catch (error) {
          this._error('updateProfile', '清除编辑数据失败:', error);
        }
        
        // 触发档案列表刷新事件
        eventBus.emit(PROFILE_EVENTS.PROFILE_LIST_REFRESH);
        
        // 触发档案更新事件，通知其他页面刷新显示
        eventBus.emit(PROFILE_EVENTS.PROFILE_UPDATED, { 
          profileId: this.editingProfileId, 
          profile: result.data 
        });
        
        this._showSuccess('档案更新成功');
        
        // 延迟返回上一页
        setTimeout(() => {
          this._navigateBack();
        }, 1500);
        
        return true;
      } else {
        this._error('updateProfile', '更新档案失败:', result.error);
        this._showError('更新失败：' + (result.error || '未知错误'));
        return false;
      }
    } catch (error) {
      this._error('updateProfile', '更新档案异常:', error);
      this._hideLoading();
      this._handleError(error, '更新档案');
      return false;
    }
  }

  // ==================== 表单处理方法 ====================

  /**
   * 处理名称输入变化
   * @param {string} name - 输入的名称
   */
  onNameChange(name) {
    this.formData.name = name;
    this._setData({ 'formData.name': name });
    this.validateForm();
  }

  /**
   * 处理性别选择
   * @param {number} gender - 性别，1=男，0=女
   */
  onGenderSelect(gender) {
    this.formData.gender = gender;
    this._setData({ 'formData.gender': gender });
    this._log('onGenderSelect', '选择性别:', gender === 1 ? '男' : '女');
  }

  /**
   * 处理时间选择确认
   * @param {Object} timeData - 时间数据
   */
  onTimeConfirm(timeData) {
    const { year, month, day, hour, minute, formatedTime, timeIndex } = timeData;
    
    // 构建出生日期
    this.birthDate = {
      year,
      month,
      day,
      hour,
      minute: minute || 0
    };
    
    this.formatedDateTime = formatedTime;
    
    // 更新页面数据
    this._setData({
      birthDate: this.birthDate,
      formatedDateTime: this.formatedDateTime,
      isUncertainTime: this.isUncertainTime
    });
    
    this._log('onTimeConfirm', '确认选择时间:', formatedTime);
    
    // 时间选择后重新验证表单
    this.validateForm();
    
    this._showSuccess(`已选择：${formatedTime}`);
  }

  /**
   * 处理不确定时辰状态切换
   */
  onUncertainTimeToggle() {
    this.isUncertainTime = !this.isUncertainTime;
    this._setData({ isUncertainTime: this.isUncertainTime });
    
    this._log('onUncertainTimeToggle', '切换不确定时辰状态:', this.isUncertainTime);
  }

  /**
   * 处理日历类型切换
   * @param {string} calendarType - 日历类型：solar=公历，lunar=农历
   */
  onCalendarTypeChange(calendarType) {
    this._log('onCalendarTypeChange', '切换日历类型:', calendarType);
    
    // 只更新日历类型，保留已选择的时间数据
    this._setData({
      calendarType: calendarType
    });
    
    // 如果有已选择的时间，需要根据新的日历类型重新格式化显示
    if (this.birthDate && this.formatedDateTime) {
      this._updateTimeDisplayForCalendarType(calendarType);
    }
    
    // 重新验证表单
    this.validateForm();
  }

  /**
   * 根据日历类型更新时间显示
   * @param {string} calendarType - 日历类型：solar=公历，lunar=农历
   * @private
   */
  _updateTimeDisplayForCalendarType(calendarType) {
    if (!this.birthDate) return;
    
    const { year, month, day, hour, minute } = this.birthDate;
    
    if (calendarType === 'solar') {
      // 公历显示：直接使用原始数据
      const timeIndex = this._calculateTimeIndex(hour);
      const timeName = this.page.data.timeMap[timeIndex];
      const formatedDateTime = `${year}年${month}月${day}日 ${timeName}`;
      
      this._setData({
        formatedDateTime: formatedDateTime
      });
    } else if (calendarType === 'lunar') {
      // 农历显示：这里暂时显示占位文本，后续可以集成农历转换
      const formatedDateTime = `农历 ${year}年${month}月${day}日 ${this._getTimeNameByHour(hour)}`;
      
      this._setData({
        formatedDateTime: formatedDateTime
      });
    }
  }

  /**
   * 根据小时获取时辰名称
   * @param {number} hour - 小时
   * @returns {string} 时辰名称
   * @private
   */
  _getTimeNameByHour(hour) {
    const timeMapObjects = [
      { name: '子时', start: 23, end: 1 },
      { name: '丑时', start: 1, end: 3 },
      { name: '寅时', start: 3, end: 5 },
      { name: '卯时', start: 5, end: 7 },
      { name: '辰时', start: 7, end: 9 },
      { name: '巳时', start: 9, end: 11 },
      { name: '午时', start: 11, end: 13 },
      { name: '未时', start: 13, end: 15 },
      { name: '申时', start: 15, end: 17 },
      { name: '酉时', start: 17, end: 19 },
      { name: '戌时', start: 19, end: 21 },
      { name: '亥时', start: 21, end: 23 }
    ];
    
    for (const time of timeMapObjects) {
      if (time.name === '子时') {
        if (hour >= 23 || hour < 1) {
          return time.name;
        }
      } else if (hour >= time.start && hour < time.end) {
        return time.name;
      }
    }
    return '子时';
  }

  /**
   * 处理表单提交
   * @returns {Promise<boolean>} 是否提交成功
   */
  async onSubmit() {
    this._log('onSubmit', '开始提交表单');
    
    if (!this.validateForm()) {
      this._showError('请完善必填信息');
      return false;
    }

    try {
      if (this.pageMode === 'edit') {
        return await this.updateProfile();
      } else {
        return await this.saveProfile();
      }
    } catch (error) {
      this._error('onSubmit', '提交表单异常:', error);
      this._handleError(error, '提交表单');
      return false;
    }
  }

  // ==================== 私有方法 ====================

  /**
   * 确定页面模式
   * @param {Object} options - 页面参数
   * @private
   */
  _determinePageMode(options) {
    const isEditMode = options.mode === 'edit';
    this.pageMode = isEditMode ? 'edit' : 'create';
    
    this._setData({ pageMode: this.pageMode });
    this._log('_determinePageMode', '页面模式:', this.pageMode);
  }

  /**
   * 初始化时间选择器
   * @private
   */
  _initializeTimePicker() {
    // 初始化年份范围（1949-2100）
    // 最大支持1901年-2100年
    const startYear = 1949;
    const endYear = 2100;
    const yearRange = Array.from(
      {length: endYear - startYear + 1}, 
      (_, i) => startYear + i
    );
    
    // 月份和日期范围
    const monthRange = Array.from({length: 12}, (_, i) => i + 1);
    const dayRange = Array.from({length: 31}, (_, i) => i + 1);
    
    // 时辰对照表（对象数组，用于内部计算）
    const timeMapObjects = [
      { name: '子时(23-01)', range: '23:00-01:00（次日）', start: 23, end: 1 },
      { name: '丑时(01-03)', range: '01:00-03:00', start: 1, end: 3 },
      { name: '寅时(03-05)', range: '03:00-05:00', start: 3, end: 5 },
      { name: '卯时(05-07)', range: '05:00-07:00', start: 5, end: 7 },
      { name: '辰时(07-09)', range: '07:00-09:00', start: 7, end: 9 },
      { name: '巳时(09-11)', range: '09:00-11:00', start: 9, end: 11 },
      { name: '午时(11-13)', range: '11:00-13:00', start: 11, end: 13 },
      { name: '未时(13-15)', range: '13:00-15:00', start: 13, end: 15 },
      { name: '申时(15-17)', range: '15:00-17:00', start: 15, end: 17 },
      { name: '酉时(17-19)', range: '17:00-19:00', start: 17, end: 19 },
      { name: '戌时(19-21)', range: '19:00-21:00', start: 19, end: 21 },
      { name: '亥时(21-23)', range: '21:00-23:00', start: 21, end: 23 }
    ];
    
    // 时辰显示名称数组（用于WXML显示）
    const timeMap = timeMapObjects.map(item => item.name);
    
    // 设置默认时间（当前时间）
    const now = new Date();
    const timeIndex = this._calculateTimeIndex(now.getHours(), timeMapObjects);
    const timeInfo = timeMapObjects[timeIndex];
    const formatedDateTime = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${timeInfo.name}`;
    
    this.birthDate = {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      hour: timeInfo.start,
      minute: 0
    };
    
    this.formatedDateTime = formatedDateTime;
    
    this._setData({
      yearRange,
      monthRange,
      dayRange,
      timeMap,
      formatedDateTime,
      birthDate: this.birthDate,
      isUncertainTime: false
    });
    
    this._log('_initializeTimePicker', '时间选择器初始化完成');
  }

  /**
   * 加载编辑数据
   * @private
   */
  async loadEditingData() {
    this._log('loadEditingData', '开始加载编辑数据');
    
    try {
      const editingProfile = wx.getStorageSync('editingProfile');
      if (editingProfile) {
        this._log('loadEditingData', '加载编辑档案数据:', editingProfile);
        
        // 设置表单数据
        this.formData = {
          name: editingProfile.profileName || editingProfile.name || '',
          gender: editingProfile.gender !== undefined ? editingProfile.gender : 1
        };
        
        // 设置档案ID
        this.editingProfileId = editingProfile._id;
        
        // 保存原始档案数据用于变化检测
        this.originalProfileData = {
          profileName: editingProfile.profileName || editingProfile.name || '',
          birthDate: editingProfile.birthDate,
          gender: editingProfile.gender !== undefined ? editingProfile.gender : 1,
          isUncertainTime: editingProfile.isUncertainTime !== undefined ? editingProfile.isUncertainTime : false
        };
        
        // 设置出生信息
        this.birthDate = editingProfile.birthDate;
        this.isUncertainTime = editingProfile.isUncertainTime || false;
        
        if (this.birthDate) {
          const timeIndex = this._calculateTimeIndex(this.birthDate.hour);
          const timeName = this.page.data.timeMap[timeIndex];
          this.formatedDateTime = `${this.birthDate.year}年${this.birthDate.month}月${this.birthDate.day}日 ${timeName}`;
        }
        
        // 更新页面数据
        this._setData({
          formData: this.formData,
          editingProfileId: this.editingProfileId,
          birthDate: this.birthDate,
          formatedDateTime: this.formatedDateTime,
          isUncertainTime: this.isUncertainTime
        });
        
        this._log('loadEditingData', '编辑数据加载完成');
      } else {
        this._error('loadEditingData', '未找到要编辑的档案数据');
        this._showError('档案数据异常');
        setTimeout(() => {
          this._navigateBack();
        }, 1500);
      }
    } catch (error) {
      this._error('loadEditingData', '加载编辑数据失败:', error);
      this._showError('数据读取失败');
      setTimeout(() => {
        this._navigateBack();
      }, 1500);
    }
  }

  /**
   * 加载用户信息
   * @private
   */
  async loadUserInfo() {
    this._log('loadUserInfo', '开始加载用户信息');
    
    try {
      const response = await userService.getUserInfo();
      
      if (response.success && response.data) {
        this.userInfo = response.data;
        
        // 更新页面数据，包括配额信息
        this._setData({
          userType: this.userInfo.userType,
          userTypeName: this.userInfo.getDisplayName(),
          profileQuota: this.userInfo.profileQuota,
          usedProfiles: this.userInfo.usedProfiles,
          canCreateMore: this.userInfo.canCreateMore()
        });
        
        this._log('loadUserInfo', '用户信息加载成功', {
          userType: this.userInfo.userType,
          profileQuota: this.userInfo.profileQuota,
          usedProfiles: this.userInfo.usedProfiles
        });
      } else {
        this._error('loadUserInfo', '获取用户信息失败:', response.error);
        // 不显示错误，允许继续操作
      }
    } catch (error) {
      this._error('loadUserInfo', '加载用户信息异常:', error);
      // 不显示错误，允许继续操作
    }
  }

  /**
   * 确保用户已注册
   * @private
   */
  async ensureUserRegistered() {
    this._log('ensureUserRegistered', '开始确保用户已注册');
    
    try {
      const result = await userService.createUser();
      this._log('ensureUserRegistered', '用户注册结果:', result.success);
      return result.success;
    } catch (error) {
      this._error('ensureUserRegistered', '用户注册失败:', error);
      return false;
    }
  }

  /**
   * 检查数据是否有变化
   * @private
   */
  hasDataChanged() {
    if (!this.originalProfileData) {
      return true;
    }

    const original = this.originalProfileData;
    const current = {
      profileName: this.formData.name.trim(),
      birthDate: this.birthDate,
      gender: this.formData.gender,
      isUncertainTime: this.isUncertainTime
    };

    // 比较各个字段
    const nameChanged = original.profileName !== current.profileName;
    const genderChanged = original.gender !== current.gender;
    const uncertainTimeChanged = original.isUncertainTime !== current.isUncertainTime;
    
    let birthDateChanged = false;
    if (original.birthDate && current.birthDate) {
      birthDateChanged = original.birthDate.year !== current.birthDate.year ||
                        original.birthDate.month !== current.birthDate.month ||
                        original.birthDate.day !== current.birthDate.day ||
                        original.birthDate.hour !== current.birthDate.hour ||
                        original.birthDate.minute !== current.birthDate.minute;
    } else if (original.birthDate !== current.birthDate) {
      birthDateChanged = true;
    }

    const hasChanges = nameChanged || genderChanged || uncertainTimeChanged || birthDateChanged;
    
    this._log('hasDataChanged', '数据变化检查:', {
      nameChanged,
      genderChanged,
      uncertainTimeChanged,
      birthDateChanged,
      hasChanges
    });

    return hasChanges;
  }

  /**
   * 显示配额超限对话框
   * @param {string} userType - 用户类型
   * @param {number} quota - 配额数量
   * @private
   */
  _showQuotaExceededDialog(userType, quota) {
    let content = `档案数量已达上限（${quota}个）`;
    let confirmText = '我知道了';
    let showUpgrade = false;
    
    // 根据用户类型显示不同的升级提示
    if (userType === 'guest') {
      content += '\n注册成为探索者可创建50个档案';
      confirmText = '立即注册';
      showUpgrade = true;
    } else if (userType === 'normal') {
      content += '\n升级高级版可无限制创建档案';
      confirmText = '了解详情';
      showUpgrade = true;
    }
    
    wx.showModal({
      title: '档案数量限制',
      content: content,
      confirmText: confirmText,
      cancelText: '取消',
      success: (res) => {
        if (res.confirm && showUpgrade) {
          this._handleUpgradeAction(userType);
        }
      }
    });
  }

  /**
   * 处理升级操作
   * @param {string} userType - 用户类型
   * @private
   */
  _handleUpgradeAction(userType) {
    if (userType === 'guest') {
      // 临时用户跳转到注册页面
      this._navigateTo('/pages/register/index', {
        source: 'add_profile',
        returnUrl: '/pages/addProfile/index'
      });
    } else if (userType === 'normal') {
      // 普通用户显示高级版介绍
      this._showPremiumInfo();
    }
  }

  /**
   * 显示高级版信息
   * @private
   */
  _showPremiumInfo() {
    wx.showModal({
      title: '升级高级版',
      content: '高级版功能：\n• 无限档案创建\n• 高级智慧分析\n• 专属客服支持\n• 数据云端备份',
      confirmText: '了解详情',
      cancelText: '暂不升级',
      success: (res) => {
        if (res.confirm) {
          this._showMessage('功能开发中');
        }
      }
    });
  }

  /**
   * 根据小时计算对应的时辰索引
   * @param {number} hour - 小时
   * @param {Array} timeMapObjects - 时辰对象数组（可选）
   * @returns {number} 时辰索引
   * @private
   */
  _calculateTimeIndex(hour, timeMapObjects = null) {
    // 如果没有传入timeMapObjects，使用默认的时辰对照表
    if (!timeMapObjects) {
      timeMapObjects = [
        { name: '子时(23-01)', start: 23, end: 1 },
        { name: '丑时(01-03)', start: 1, end: 3 },
        { name: '寅时(03-05)', start: 3, end: 5 },
        { name: '卯时(05-07)', start: 5, end: 7 },
        { name: '辰时(07-09)', start: 7, end: 9 },
        { name: '巳时(09-11)', start: 9, end: 11 },
        { name: '午时(11-13)', start: 11, end: 13 },
        { name: '未时(13-15)', start: 13, end: 15 },
        { name: '申时(15-17)', start: 15, end: 17 },
        { name: '酉时(17-19)', start: 17, end: 19 },
        { name: '戌时(19-21)', start: 19, end: 21 },
        { name: '亥时(21-23)', start: 21, end: 23 }
      ];
    }
    
    for (let i = 0; i < timeMapObjects.length; i++) {
      const time = timeMapObjects[i];
      if (time.name.includes('子时')) {
        if (hour >= 23 || hour < 1) {
          return i;
        }
      } else if (hour >= time.start && hour < time.end) {
        return i;
      }
    }
    return 0; // 默认返回子时
  }

  // ==================== 生命周期方法 ====================

  /**
   * 页面显示时的处理
   */
  onShow() {
    this._log('onShow', '页面显示');
    
    // 重新加载用户信息，确保配额数据是最新的
    this.loadUserInfo();
    
    super.onShow();
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
    eventBus.off(PROFILE_EVENTS.PROFILE_LIST_REFRESH, this._handleProfileListRefreshEvent);
    
    super.onUnload();
  }

  // ==================== 私有方法 ====================

  /**
   * 绑定事件处理器
   * @private
   */
  _bindEventHandlers() {
    // 监听档案列表刷新事件
    eventBus.on(PROFILE_EVENTS.PROFILE_LIST_REFRESH, this._handleProfileListRefreshEvent.bind(this));
  }

  /**
   * 处理档案列表刷新事件
   * @private
   */
  _handleProfileListRefreshEvent() {
    this._log('_handleProfileListRefreshEvent', '收到档案列表刷新事件，重新加载用户信息');
    
    // 重新加载用户信息，更新配额数据
    this.loadUserInfo();
  }
}

module.exports = { AddProfileController };
