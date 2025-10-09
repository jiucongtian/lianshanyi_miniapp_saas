import Message from 'tdesign-miniprogram/message/index';
// 使用Service层替代废弃的cloud.js接口
const { baziService, userService, profileService } = require('../../services/index');
// 引入配置
const { config } = require('../../config/index');
// 引入用户管理器和权限管理器
const { userManager } = require('../../utils/userManager');
const { permissionManager, USER_TYPES } = require('../../utils/permissionManager');

Page({
  data: {
    // 页面模式：create=创建，edit=编辑
    pageMode: 'create',
    // 编辑模式下的档案ID
    editingProfileId: null,
    // 表单数据
    formData: {
      name: '', // 名称
      gender: 1, // 性别，1=男，0=女，默认男
    },
    // 表单验证
    nameError: '', // 名称错误信息
    isFormValid: false, // 表单是否有效
    
    // 时间选择相关
    dateTimeValue: null, // 初始为空，让用户自己选择
    formatedDateTime: '', // 格式化后的时间显示
    showPicker: false,
    pickerValue: [0, 0, 0, 0], // 选择器当前选中的值 [年, 月, 日, 时辰]
    yearRange: [], // 年份范围
    monthRange: Array.from({length: 12}, (_, i) => i + 1), // 月份范围 1-12
    dayRange: Array.from({length: 31}, (_, i) => i + 1), // 日期范围 1-31
    isUncertainTime: false, // 是否不确定时辰信息
    // 时辰对照表
    timeMap: [
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
    ],
  },

  // 表单验证方法
  validateForm() {
    const { formData, formatedDateTime } = this.data;
    let isValid = true;
    let nameError = '';

    // 验证名称
    if (!formData.name || formData.name.trim() === '') {
      nameError = '请输入名称';
      isValid = false;
    } else if (formData.name.trim().length < 1) {
      nameError = '名称至少需要1个字符';
      isValid = false;
    } else if (formData.name.trim().length > 20) {
      nameError = '名称不能超过20个字符';
      isValid = false;
    }

    // 验证出生信息
    if (!formatedDateTime) {
      isValid = false;
    }

    this.setData({
      nameError,
      isFormValid: isValid
    });

    return isValid;
  },

  // 名称输入变化
  onNameChange(e) {
    const name = e.detail.value;
    this.setData({
      'formData.name': name
    });
    // 实时验证
    this.validateForm();
  },

  // 名称输入失焦
  onNameBlur(e) {
    const name = e.detail.value;
    this.setData({
      'formData.name': name
    });
    this.validateForm();
  },

  // 性别选择
  onGenderSelect(e) {
    const gender = parseInt(e.currentTarget.dataset.gender);
    this.setData({
      'formData.gender': gender
    });
    console.log('选择性别:', gender === 1 ? '男' : '女');
  },

  // 表单提交
  async onSubmit(e) {
    console.log('[addProfile] onSubmit 开始执行');
    
    // 获取按钮组件的引用
    const buttonComponent = this.selectComponent('loading-button');
    
    if (!this.validateForm()) {
      console.log('[addProfile] 表单验证失败');
      Message.warning({
        context: this,
        offset: [120, 32],
        duration: 3000,
        content: '请完善必填信息',
      });
      // 重置按钮状态
      if (buttonComponent) {
        buttonComponent.reset();
      }
      return;
    }

    try {
      // 如果是创建模式，检查用户配额
      if (this.data.pageMode === 'create') {
        console.log('[addProfile] 创建模式，开始检查用户配额');
        const quotaCheck = await this.checkUserQuota();
        console.log('[addProfile] 配额检查结果:', quotaCheck);
        if (!quotaCheck.canCreate) {
          console.log('[addProfile] 配额检查失败，无法创建');
          // 重置按钮状态
          if (buttonComponent) {
            buttonComponent.reset();
          }
          return; // 配额检查失败，已在方法内处理错误提示
        }
        console.log('[addProfile] 配额检查通过，可以创建');
      }

      // 根据页面模式调用不同的处理方法
      if (this.data.pageMode === 'edit') {
        await this.onUpdateProfile();
      } else {
        await this.onQueryData();
      }
    } catch (error) {
      console.error('提交过程中出现错误:', error);
      Message.error({
        context: this,
        offset: [120, 32],
        duration: 3000,
        content: '提交过程中出现错误，请重试',
      });
      // 重置按钮状态
      if (buttonComponent) {
        buttonComponent.reset();
      }
    }
  },

  /**
   * 检查用户配额
   */
  async checkUserQuota() {
    console.log('[addProfile] checkUserQuota 开始执行');
    try {
      console.log('[addProfile] 调用 userService.checkQuota()');
      const result = await userService.checkQuota();
      console.log('[addProfile] userService.checkQuota() 返回结果:', result);
      
      if (result.success) {
        console.log('[addProfile] 配额检查成功，解析数据:', result.data);
        const { canCreateMore, userType, currentCount, quota } = result.data;
        
        if (!canCreateMore) {
          // 显示配额超限提示
          let content = `信息数量已达上限（${quota}个）`;
          let confirmText = '我知道了';
          
          const upgradeHint = permissionManager.getUpgradeHint();
          if (upgradeHint) {
            content += `\n${upgradeHint.action}可${upgradeHint.benefits.join('、')}`;
            confirmText = upgradeHint.action;
          }
          
          wx.showModal({
            title: '信息数量限制',
            content,
            confirmText,
            cancelText: '取消',
            success: (res) => {
              if (res.confirm && upgradeHint) {
                this.handleUpgradeAction(userType);
              }
            }
          });
          
          return { canCreate: false };
        }
        
        return { canCreate: true };
      } else {
        console.error('[addProfile] 检查配额失败:', result.error);
        Message.error({
          context: this,
          offset: [120, 32],
          duration: 3000,
          content: '检查权限失败，请重试',
        });
        return { canCreate: false };
      }
    } catch (error) {
      console.error('[addProfile] 检查配额出错:', error);
      Message.error({
        context: this,
        offset: [120, 32],
        duration: 3000,
        content: '检查权限失败，请重试',
      });
      return { canCreate: false };
    }
  },

  /**
   * 处理升级操作
   */
  handleUpgradeAction(userType) {
    if (userType === USER_TYPES.GUEST) {
      // 临时用户跳转到注册页面
      wx.navigateTo({
        url: '/pages/register/index?source=add_profile&returnUrl=' + encodeURIComponent('/pages/addProfile/index')
      });
    } else if (userType === USER_TYPES.NORMAL) {
      // 普通用户显示高级版介绍
      wx.showModal({
        title: '升级高级版',
        content: '高级版功能：\n• 无限信息创建\n• 高级智慧分析\n• 专属客服支持\n• 数据云端备份',
        confirmText: '了解详情',
        cancelText: '暂不升级',
        success: (res) => {
          if (res.confirm) {
            // TODO: 跳转到高级版购买页面
            wx.showToast({
              title: '功能开发中',
              icon: 'none'
            });
          }
        }
      });
    }
  },
  
  // 根据小时计算对应的时辰索引
  calculateTimeIndex(hour) {
    for (let i = 0; i < this.data.timeMap.length; i++) {
      const time = this.data.timeMap[i];
      if (time.name.includes('子时')) {
        if (hour >= 23 || hour < 1) {
          return i;
        }
      } else if (hour >= time.start && hour < time.end) {
        return i;
      }
    }
    return 0; // 默认返回子时
  },

  // 根据年月日时辰计算选择器值数组
  calculatePickerValue(year, month, day, timeIndex) {
    return [
      this.data.yearRange.indexOf(year),
      month - 1,
      day - 1,
      timeIndex
    ];
  },

  // 从日期对象获取选择器值
  getPickerValueFromDate(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const timeIndex = this.calculateTimeIndex(hour);
    
    return this.calculatePickerValue(year, month, day, timeIndex);
  },

  // 云端档案管理
  async searchBaziProfile(birthDate) {
    try {
      const result = await profileService.searchProfile({ birthDate });
      return result.success ? result.data.profiles : [];
    } catch (error) {
      console.error('搜索八字档案失败:', error);
      return [];
    }
  },

  async saveBaziProfile(profileData) {
    try {
      const result = await profileService.createProfile(profileData);
      if (result.success) {
        console.log('八字档案已保存到云端:', result.data.profileId);
        return result.data;
      } else {
        console.error('保存八字档案失败:', result.error);
        return null;
      }
    } catch (error) {
      console.error('保存八字档案失败:', error);
      return null;
    }
  },

  // 更新档案
  async onUpdateProfile() {
    if (!this.data.editingProfileId) {
      Message.error({
        context: this,
        offset: [120, 32],
        duration: 3000,
        content: '信息ID异常，无法更新',
      });
      return;
    }

    // 确保日期格式正确
    const date = new Date(this.data.dateTimeValue);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const minute = date.getMinutes();
    
    const birthDate = { year, month, day, hour, minute };
    const timestamp = this.data.dateTimeValue;

    // 显示加载状态
    wx.showLoading({
      title: '更新信息中...',
      mask: true
    });

    try {
      // 重新计算八字数据
      const baziResult = await baziService.calculateBazi(timestamp);
      
      if (!baziResult.success || !baziResult.data || !baziResult.data.baziData) {
        console.error('八字计算失败:', baziResult.error);
        wx.hideLoading();
        Message.error({
          context: this,
          offset: [120, 32],
          duration: 3000,
          content: '八字计算失败，请重试',
        });
        return;
      }

      // 直接使用云函数返回的档案格式八字数据
      const baziData = baziResult.data.baziData;

      // 使用ProfileService更新档案
      const updateData = {
        profileName: this.data.formData.name.trim(),
        birthDate: birthDate,
        baziData: baziData,
        gender: this.data.formData.gender,
        isUncertainTime: this.data.isUncertainTime
      };
      
      const result = await profileService.updateProfile(this.data.editingProfileId, updateData);

      wx.hideLoading();

      if (result.success) {
        console.log('档案更新成功');
        
        // 更新全局当前档案数据（如果更新的是当前选中的档案）
        const app = getApp();
        if (app.globalData?.currentProfileId === this.data.editingProfileId) {
          // 使用ProfileService返回的ProfileBean数据（v1.1版本返回完整档案数据）
          const updatedProfile = result.data.toObject();
          app.setCurrentProfile(updatedProfile);
        }
        
        // 清除本地存储的编辑数据
        try {
          wx.removeStorageSync('editingProfile');
        } catch (error) {
          console.error('清除编辑数据失败:', error);
        }
        
        Message.success({
          context: this,
          offset: [120, 32],
          duration: 2000,
          content: '信息更新成功',
        });
        
        // 延迟返回上一页，让用户看到成功提示
        setTimeout(() => {
          // 如果是从档案页面跳转过来的，返回时传递档案ID
          const pages = getCurrentPages();
          if (pages.length > 1) {
            const prevPage = pages[pages.length - 2];
            if (prevPage.route === 'pages/profile/index') {
              // 返回档案页面时传递档案ID
              wx.navigateBack({
                success: () => {
                  // 通过事件总线通知档案页面选中指定档案
                  const eventBus = require('../../utils/eventBus');
                  eventBus.emit('selectProfile', {
                    profileId: this.data.editingProfileId
                  });
                }
              });
            } else {
              wx.navigateBack();
            }
          } else {
            wx.navigateBack();
          }
        }, 1500);
      } else {
        console.error('更新信息失败:', result.error);
        Message.error({
          context: this,
          offset: [120, 32],
          duration: 3000,
          content: result.error || '更新失败，请重试',
        });
      }
    } catch (error) {
      console.error('更新档案过程中出现错误:', error);
      wx.hideLoading();
      Message.error({
        context: this,
        offset: [120, 32],
        duration: 3000,
        content: '更新过程中出现错误，请重试',
      });
    }
  },

  // 确保用户已注册
  async ensureUserRegistered() {
    console.log('[addProfile] ensureUserRegistered 开始执行');
    try {
      console.log('[addProfile] 调用 userService.createUser()');
      const result = await userService.createUser();
      console.log('[addProfile] userService.createUser() 返回结果:', result);
      console.log('[addProfile] 用户注册成功:', result.success);
      return result.success;
    } catch (error) {
      console.error('[addProfile] 用户注册失败:', error);
      return false;
    }
  },

  onLoad(options) {
    console.log('时间查询页面加载，参数:', options);
    
    // 检查是否为编辑模式
    const isEditMode = options.mode === 'edit';
    this.setData({
      pageMode: isEditMode ? 'edit' : 'create'
    });
    
    // 初始化年份范围（1949-2050）
    const startYear = 1949;
    const endYear = 2050;
    const yearRange = Array.from(
      {length: endYear - startYear + 1}, 
      (_, i) => startYear + i
    );
    
    let initialPickerValue;
    let dateTimeValue = null;
    let formatedDateTime = '';
    let formData = {
      name: '',
      gender: 1
    };
    
    if (isEditMode) {
      // 编辑模式：从本地存储获取要编辑的档案数据
      try {
        const editingProfile = wx.getStorageSync('editingProfile');
        if (editingProfile) {
          console.log('编辑模式：加载档案数据', editingProfile);
          
          // 设置表单数据
          formData = {
            name: editingProfile.profileName || editingProfile.name || '',
            gender: editingProfile.gender !== undefined ? editingProfile.gender : 1
          };
          
          // 恢复不确定时辰状态
          if (editingProfile.isUncertainTime !== undefined) {
            this.data.isUncertainTime = editingProfile.isUncertainTime;
          }
          
          // 设置档案ID
          this.setData({
            editingProfileId: editingProfile._id
          });
          
          // 设置出生信息
          const birthDate = editingProfile.birthDate;
          if (birthDate) {
            const timeIndex = this.calculateTimeIndex(birthDate.hour);
            initialPickerValue = this.calculatePickerValue(
              birthDate.year,
              birthDate.month,
              birthDate.day,
              timeIndex
            );
            
            // 构建时间显示
            const timeInfo = this.data.timeMap[timeIndex];
            formatedDateTime = `${birthDate.year}年${birthDate.month}月${birthDate.day}日 ${timeInfo.name}`;
            
            // 构建时间戳
            const formattedMonth = birthDate.month.toString().padStart(2, '0');
            const formattedDay = birthDate.day.toString().padStart(2, '0');
            const formattedHour = birthDate.hour.toString().padStart(2, '0');
            const dateStr = `${birthDate.year}-${formattedMonth}-${formattedDay}T${formattedHour}:00:00`;
            dateTimeValue = new Date(dateStr).getTime();
          }
        } else {
          console.error('编辑模式：未找到要编辑的档案数据');
          wx.showToast({
            title: '信息数据异常',
            icon: 'error'
          });
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
          return;
        }
      } catch (error) {
        console.error('编辑模式：读取档案数据失败', error);
        wx.showToast({
          title: '数据读取失败',
          icon: 'error'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
        return;
      }
    } else {
      // 创建模式：使用当前系统时间，不恢复任何保存的数据
      console.log('创建模式：使用当前系统时间作为默认值');
      
      // 清理本地存储的时间数据，确保创建新档案时不受之前数据影响
      try {
        wx.removeStorageSync('userDateTime');
        console.log('已清理本地存储的时间数据');
      } catch (error) {
        console.error('清理本地存储失败:', error);
      }
      
      // 确保 isUncertainTime 默认为 false
      this.data.isUncertainTime = false;
      
      // 获取当前时间的选择器值
      const now = new Date();
      initialPickerValue = this.getPickerValueFromDate(now);
      
      // 构建当前时间的显示格式
      const timeIndex = this.calculateTimeIndex(now.getHours());
      const timeInfo = this.data.timeMap[timeIndex];
      formatedDateTime = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${timeInfo.name}`;
      
      // 构建时间戳
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const day = now.getDate();
      const hour = timeInfo.start; // 使用时辰的开始时间
      const formattedMonth = month.toString().padStart(2, '0');
      const formattedDay = day.toString().padStart(2, '0');
      const formattedHour = hour.toString().padStart(2, '0');
      const dateStr = `${year}-${formattedMonth}-${formattedDay}T${formattedHour}:00:00`;
      dateTimeValue = new Date(dateStr).getTime();
      
      console.log('创建模式初始化完成:', {
        formatedDateTime,
        dateTimeValue,
        pickerValue: initialPickerValue,
        isUncertainTime: false
      });
    }
    
    this.setData({
      yearRange,
      pickerValue: initialPickerValue,
      dateTimeValue,
      formatedDateTime,
      formData,
      isUncertainTime: this.data.isUncertainTime || false
    });

    console.log('页面初始化完成，模式:', isEditMode ? '编辑' : '创建');
    
    // 编辑模式下需要验证表单
    if (isEditMode) {
      this.validateForm();
    }
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  },

  // 点击时间输入框
  onInputTap() {
    console.log('点击输入框，打开选择器');
    
    let targetPickerValue;
    
    // 如果用户已经选择了时间，使用用户选择的时间作为默认值
    if (this.data.dateTimeValue) {
      console.log('用户已选择时间，使用用户选择的时间作为默认值');
      const selectedDate = new Date(this.data.dateTimeValue);
      targetPickerValue = this.getPickerValueFromDate(selectedDate);
      
      console.log('使用用户已选择的时间:', {
        date: selectedDate.toLocaleString(),
        pickerValue: targetPickerValue
      });
      
    } else {
      console.log('用户未选择时间，使用当前系统时间作为默认值');
      const now = new Date();
      targetPickerValue = this.getPickerValueFromDate(now);
      
      console.log('使用当前系统时间:', {
        date: now.toLocaleString(),
        pickerValue: targetPickerValue
      });
    }
    
    this.setData({
      pickerValue: targetPickerValue,
      showPicker: true
    });
  },

  // picker-view 值变化事件
  onPickerChange(e) {
    const { value } = e.detail;
    this.setData({
      pickerValue: value
    });
  },

  // 验证日期是否有效
  validateDate(year, month, day) {
    // 创建日期对象来验证
    const testDate = new Date(year, month - 1, day);
    
    // 检查日期是否有效（如果无效，Date会自动调整）
    const isValid = testDate.getFullYear() === year && 
                   testDate.getMonth() === month - 1 && 
                   testDate.getDate() === day;
    
    return isValid;
  },

  // 确认选择
  onPickerConfirm() {
    const { pickerValue, yearRange, monthRange, dayRange, timeMap } = this.data;
    const [yearIndex, monthIndex, dayIndex, timeIndex] = pickerValue;
    
    const year = yearRange[yearIndex];
    const month = monthRange[monthIndex];
    const day = dayRange[dayIndex];
    const timeInfo = timeMap[timeIndex];
    
    // 验证日期有效性
    if (!this.validateDate(year, month, day)) {
      console.log('日期无效:', { year, month, day });
      
      // 显示错误提示，但不关闭选择器
      Message.error({
        context: this,
        offset: [120, 32],
        duration: 3000,
        content: `日期选择错误：${month}月${day}日不存在，请重新选择`,
      });
      
      return; // 不关闭选择器，让用户重新选择
    }
    
    const formatedTime = `${year}年${month}月${day}日 ${timeInfo.name}`;
    
    // 构建日期对象（使用时辰的开始时间）
    const baseHour = timeInfo.start;
    // 确保月份和日期是两位数格式
    const formattedMonth = month.toString().padStart(2, '0');
    const formattedDay = day.toString().padStart(2, '0');
    const formattedHour = baseHour.toString().padStart(2, '0');
    
    const dateStr = `${year}-${formattedMonth}-${formattedDay}T${formattedHour}:00:00`;
    console.log('构建的日期字符串:', dateStr);
    
    const dateTimeValue = new Date(dateStr).getTime();
    console.log('构建的时间戳:', dateTimeValue);
    
    // 保存用户选择的时间到本地存储（暂不保存八字数据，在计算完成后再保存）
    const userDateTimeData = {
      dateTimeValue,
      formatedDateTime: formatedTime,
      year,
      month,
      day,
      timeIndex,
      isUncertainTime: this.data.isUncertainTime, // 保存不确定时辰状态
      savedAt: Date.now()
    };
    
    try {
      wx.setStorageSync('userDateTime', userDateTimeData);
      console.log('用户时间已保存到本地存储:', userDateTimeData);
    } catch (error) {
      console.error('保存用户时间失败:', error);
    }
    
    // 日期有效，保存并关闭选择器
    this.setData({
      dateTimeValue,
      formatedDateTime: formatedTime,
      showPicker: false,
      isUncertainTime: this.data.isUncertainTime
    });

    console.log('确认选择时间:', formatedTime);
    
    // 时间选择后重新验证表单
    this.validateForm();
    
    // 显示选择成功提示
    Message.success({
      context: this,
      offset: [120, 32],
      duration: 2000,
      content: `已选择：${formatedTime}`,
    });
  },

  // 取消选择
  onPickerCancel() {
    console.log('取消选择');
    this.setData({
      showPicker: false
    });
  },

  // 选择器关闭
  onPickerClose({ detail }) {
    console.log('选择器关闭事件:', detail);
    const { trigger } = detail;
    if (trigger === 'overlay') {
      this.setData({
        showPicker: false
      });
    }
  },

  // 不确定时辰信息勾选框点击
  onCheckboxTap() {
    const newState = !this.data.isUncertainTime;
    console.log('切换不确定时辰状态:', this.data.isUncertainTime, '→', newState);
    
    this.setData({
      isUncertainTime: newState
    });
    
    if (newState) {
      console.log('用户选择不确定时辰信息');
    } else {
      console.log('用户取消不确定时辰信息');
    }
  },



  // 查询数据
  async onQueryData() {
    console.log('[addProfile] onQueryData 开始执行');
    console.log('[addProfile] dateTimeValue:', this.data.dateTimeValue);
    
    if (!this.data.dateTimeValue) {
      console.log('[addProfile] 没有选择查询时间，返回');
      Message.warning({
        context: this,
        offset: [120, 32],
        duration: 3000,
        content: '请先选择查询时间',
      });
      return;
    }

    // 确保用户已注册
    console.log('[addProfile] 开始确保用户已注册');
    const userRegistered = await this.ensureUserRegistered();
    console.log('[addProfile] 用户注册结果:', userRegistered);
    if (!userRegistered) {
      Message.error({
        context: this,
        offset: [120, 32],
        duration: 3000,
        content: '用户注册失败，请重试',
      });
      return;
    }

    // 确保日期格式正确
    const date = new Date(this.data.dateTimeValue);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const minute = date.getMinutes();
    
    const birthDate = { year, month, day, hour, minute };
    const timestamp = this.data.dateTimeValue;
    
    // 检查是否为调试模式
    const isDebugMode = config.debugMode;
    console.log('当前调试模式状态:', isDebugMode);
    
    // 直接调用API计算八字（新增档案不需要检查现有档案）
    console.log('开始调用API计算八字');

    // 显示加载状态
    wx.showLoading({
      title: isDebugMode ? '调试模式：重新计算...' : '抽取智慧卡牌中...',
      mask: true
    });

    try {
      // 调用Service层获取生辰八字数据
      const result = await baziService.calculateBazi(timestamp);
      
      if (result.success) {
        console.log('Coze API调用成功，结果：', result);
        
        // 检查八字数据是否存在
        if (!result.data || !result.data.baziData) {
          console.error('Coze API返回成功但baziData为空:', result);
          wx.hideLoading();
          
          Message.error({
            context: this,
            offset: [120, 32],
            duration: 3000,
            content: '八字数据解析失败，请重试',
          });
          return;
        }
        
        // 构建八字结果数据（使用标准化的数据结构）
        const baziResult = {
          timestamp: timestamp,
          baziData: result.data.baziData,  // 标准化的八字数据
          rawCozeData: result.data.rawCozeData,  // 原始coze数据（用于调试）
          parameters: result.data.parameters,
          calculatedAt: new Date().getTime()
        };
        
        // 保存到云端档案（非调试模式）
        if (!isDebugMode) {
          const profileData = this.buildProfileFromBaziResult(baziResult, birthDate);
          const savedProfile = await this.saveBaziProfile(profileData);
          if (savedProfile) {
            baziResult.profileId = savedProfile.profileId;
            
            // 设置新创建的档案为当前档案
            const app = getApp();
            if (savedProfile.profile) {
              app.setCurrentProfile(savedProfile.profile);
              // 设置新添加档案标记，用于档案列表页面的默认选中
              app.globalData.newlyAddedProfileId = savedProfile.profileId;
              console.log('新创建的档案已设置为当前档案:', savedProfile.profileId);
            }
          }
        }
        
        // API调用成功，跳转到卡牌页面
        wx.hideLoading();
        
        // 构建卡牌数据并设置到全局变量
        const cardData = this.buildCardDataFromBaziResult(baziResult, birthDate);
        if (cardData) {
          const app = getApp();
          app.globalData.cardData = cardData;
          console.log('卡牌数据已设置到全局变量:', cardData);
        }
        
        // 档案创建成功后，直接跳转到卡牌页面
        wx.switchTab({
          url: '/pages/card/index',
          success: () => {
            console.log('信息创建成功，跳转到卡牌页面');
            Message.success({
              context: this,
              offset: [120, 32],
              duration: 2000,
              content: '信息创建成功！正在显示卡牌',
            });
            
            // 通过事件总线通知档案页面选中新创建的档案
            if (baziResult.profileId) {
              const eventBus = require('../../utils/eventBus');
              eventBus.emit('selectProfile', {
                profileId: baziResult.profileId
              });
            }
          },
          fail: (error) => {
            console.error('跳转失败:', error);
            Message.error({
              context: this,
              offset: [120, 32],
              duration: 3000,
              content: '页面跳转失败，请重试',
            });
          }
        });
        
      } else {
        // API调用失败，显示错误信息
        console.error('服务端计算失败:', result.error);
        
        wx.hideLoading();
        
        Message.error({
          context: this,
          offset: [120, 32],
          duration: 3000,
          content: `计算失败：${result.error}，请重试`,
        });
      }
      
    } catch (error) {
      console.error('查询数据过程中出现错误:', error);
      wx.hideLoading();
      
      Message.error({
        context: this,
        offset: [120, 32],
        duration: 3000,
        content: '计算过程中出现错误，请重试',
      });
    }
  },

  // 从八字结果构建档案数据（直接使用统一的档案格式）
  buildProfileFromBaziResult(baziResult, birthDate) {
    // 使用统一的档案格式八字数据
    if (!baziResult.baziData) {
      console.error('八字数据格式不正确，缺少baziData字段');
      console.error('baziResult完整数据:', baziResult);
      return null;
    }

    const baziData = baziResult.baziData;
    
    // 验证八字数据结构（档案格式）
    const requiredPillars = ['year', 'month', 'day', 'hour'];
    for (const pillar of requiredPillars) {
      if (!baziData[pillar]) {
        console.error(`八字数据缺少${pillar}字段:`, baziData);
        return null;
      }
      
      if (!baziData[pillar].gan || !baziData[pillar].zhi) {
        console.error(`${pillar}字段格式不正确:`, baziData[pillar]);
        return null;
      }
    }
    
    // 生成档案名称（使用用户填写的名称，已通过表单验证）
    const { formData } = this.data;
    const profileName = formData.name.trim();
    
    return {
      profileName,
      name: formData.name || '', // 用户填写的名称
      birthDate: {
        year: birthDate.year,
        month: birthDate.month,
        day: birthDate.day,
        hour: birthDate.hour,
        minute: birthDate.minute || 0,
        isLunar: false
      },
      baziData: baziData, // 直接使用云函数返回的档案格式数据
      gender: formData.gender, // 使用用户选择的性别
      isUncertainTime: this.data.isUncertainTime, // 是否不确定时辰信息
      description: '用户创建的八字档案'
    };
  },



  // 从档案数据构建卡牌数据
  buildCardDataFromProfile(profile, baziResult) {
    console.log('从档案数据构建卡牌数据:', profile);
    
    // 直接使用档案格式的八字数据
    const baziData = profile.baziData;

    // 格式化时间显示
    const { formatBirthTime, formatLunarTime } = require('../../utils/util');
    baziData.originalTime = formatBirthTime(profile.birthDate);
    baziData.lunarTime = profile.baziData.lunarDate ? formatLunarTime(profile.baziData.lunarDate) : '';

    return {
      baziData,
      timestamp: baziResult.timestamp,
      profileId: profile._id,
      isUncertainTime: profile.isUncertainTime || false,
      calculatedAt: baziResult.calculatedAt
    };
  },

  // 从八字结果构建卡牌数据
  buildCardDataFromBaziResult(baziResult, birthDate) {
    console.log('从八字结果构建卡牌数据:', baziResult);
    
    // 使用统一的档案格式八字数据
    if (!baziResult.baziData) {
      console.error('八字数据格式不正确，缺少baziData字段');
      console.error('baziResult完整数据:', baziResult);
      return null;
    }

    const baziData = baziResult.baziData;
    
    // 验证八字数据结构（档案格式）
    const requiredPillars = ['year', 'month', 'day', 'hour'];
    for (const pillar of requiredPillars) {
      if (!baziData[pillar]) {
        console.error(`八字数据缺少${pillar}字段:`, baziData);
        return null;
      }
      
      if (!baziData[pillar].gan || !baziData[pillar].zhi) {
        console.error(`${pillar}字段格式不正确:`, baziData[pillar]);
        return null;
      }
    }

    // 格式化时间显示
    const { formatBirthTime } = require('../../utils/util');
    baziData.originalTime = formatBirthTime(birthDate);
    baziData.lunarTime = ''; // 新计算的数据暂时没有农历时间

    return {
      baziData,
      timestamp: baziResult.timestamp,
      profileId: baziResult.profileId,
      profileName: this.data.formData.name.trim() || '生命智慧卡牌', // 添加档案名称
      isUncertainTime: this.data.isUncertainTime || false,
      calculatedAt: baziResult.calculatedAt
    };
  },

  // 分享功能 - 激活右上角分享按钮
  onShareAppMessage: function() {
    return {
      title: '生命智慧卡牌',
      path: '/pages/addProfile/index',
      imageUrl: '', // 可以设置分享图片
    };
  },


});
