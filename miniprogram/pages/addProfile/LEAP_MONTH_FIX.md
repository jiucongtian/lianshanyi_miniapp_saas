# 闰月状态传递修复

## 问题描述

当用户选中了一个闰月的日期，time-input 显示是闰月了，但是再次打开 time-picker 时，闰月复选框没有勾选上。

## 问题原因

在打开 time-picker 时，页面没有正确传递 `isLeapMonth` 属性给组件，导致组件无法正确显示闰月状态。

具体问题点：
1. 页面 data 中没有定义 `isLeapMonth` 字段
2. WXML 中没有绑定 `isLeapMonth` 属性到 time-picker 组件
3. `onLunarInputTap()` 方法中没有读取和设置 `isLeapMonth` 值
4. 缺少 `onLeapMonthToggle` 事件处理方法

## 解决方案

### 1. 添加页面数据字段

在 `pages/addProfile/index.js` 的 data 中添加 `isLeapMonth` 字段：

```javascript
data: {
  // ...
  isUncertainTime: false, // 是否不确定时辰信息
  isLeapMonth: false,     // 是否闰月（仅农历有效）【新增】
  initialDateTime: null,   // 传递给time-picker的初始时间
  // ...
}
```

### 2. 修改 onLunarInputTap 方法

在打开农历选择器时，正确读取和传递 `isLeapMonth` 状态：

```javascript
onLunarInputTap() {
  log.debug('onLunarInputTap', '点击农历输入框，打开选择器');
  
  // 获取农历时间数据作为初始值
  let initialDateTime = null;
  let isLeapMonth = false;  // 【新增】
  
  if (this.data.lunarDateTime) {
    // 使用已有的农历时间
    initialDateTime = this.data.lunarDateTime;
    isLeapMonth = this.data.lunarDateTime.isLeapMonth || false;  // 【新增】
  } else if (this.data.birthDate) {
    // 使用birthDate
    initialDateTime = this.data.birthDate;
    isLeapMonth = this.data.birthDate.isLeapMonth || false;  // 【新增】
  }
  
  // 如果没有时间数据，使用当前系统时间
  if (!initialDateTime) {
    const now = new Date();
    initialDateTime = {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      hour: now.getHours(),
      minute: now.getMinutes()
    };
    isLeapMonth = false;  // 【新增】
  }
  
  log.debug('onLunarInputTap', '设置农历初始时间:', { initialDateTime, isLeapMonth });  // 【修改】
  
  this.setData({
    showPicker: true,
    calendarType: 'lunar',
    initialDateTime: initialDateTime,
    isLeapMonth: isLeapMonth  // 【新增】
  });
}
```

### 3. 添加事件处理方法

添加 `onLeapMonthToggle` 事件处理方法：

```javascript
onLeapMonthToggle(e) {
  const { isLeapMonth } = e.detail;
  log.info('onLeapMonthToggle', '切换闰月状态:', isLeapMonth);
  
  // 更新页面的闰月状态
  this.setData({
    isLeapMonth: isLeapMonth
  });
  
  // 通知Controller处理闰月状态切换
  if (this.controller) {
    this.controller.onLeapMonthToggle(isLeapMonth);
  }
}
```

### 4. 修改 WXML 绑定

在 `pages/addProfile/index.wxml` 中添加属性和事件绑定：

```xml
<!-- 时间选择器组件 -->
<time-picker 
  visible="{{showPicker}}"
  calendarType="{{calendarType}}"
  initialDateTime="{{initialDateTime}}"
  isUncertainTime="{{isUncertainTime}}"
  isLeapMonth="{{isLeapMonth}}"  <!-- 【新增】-->
  yearRange="{{[1949, 2100]}}"
  bind:confirm="onTimePickerConfirm"
  bind:cancel="onTimePickerCancel"
  bind:uncertain-time-toggle="onTimePickerUncertainToggle"
  bind:leap-month-toggle="onLeapMonthToggle"  <!-- 【新增】-->
/>
```

### 5. 添加 Controller 方法

在 `controllers/AddProfileController.js` 中添加 `onLeapMonthToggle` 方法：

```javascript
/**
 * 处理闰月状态切换
 * @param {boolean} isLeapMonth - 是否闰月
 */
onLeapMonthToggle(isLeapMonth) {
  this._log('onLeapMonthToggle', '切换闰月状态:', isLeapMonth);
  
  // 更新闰月状态
  if (this.lunarDateTime) {
    this.lunarDateTime.isLeapMonth = isLeapMonth;
  }
  
  this._setData({ isLeapMonth: isLeapMonth });
}
```

## 修改文件清单

1. `/miniprogram/pages/addProfile/index.js`
   - data 中添加 `isLeapMonth` 字段
   - 修改 `onLunarInputTap()` 方法
   - 添加 `onLeapMonthToggle()` 方法

2. `/miniprogram/pages/addProfile/index.wxml`
   - time-picker 组件添加 `isLeapMonth` 属性绑定
   - time-picker 组件添加 `bind:leap-month-toggle` 事件绑定

3. `/miniprogram/controllers/AddProfileController.js`
   - 添加 `onLeapMonthToggle()` 方法

## 数据流向

```
用户选择闰月日期
    ↓
time-picker 组件确认，返回包含 isLeapMonth 的数据
    ↓
onTimeConfirm 处理，保存到 lunarDateTime.isLeapMonth
    ↓
time-input 显示农历时间（包含闰月标记）
    ↓
用户再次点击 time-input，触发 onLunarInputTap
    ↓
从 lunarDateTime 中读取 isLeapMonth
    ↓
设置页面的 isLeapMonth 数据
    ↓
传递给 time-picker 组件的 isLeapMonth 属性
    ↓
time-picker 组件接收并显示闰月勾选状态 ✓
```

## 测试步骤

1. 打开创建档案页面
2. 选择"农历"
3. 点击时间输入框，打开 time-picker
4. 勾选"闰月"
5. 选择一个日期，如 2023年四月初一
6. 确认选择
7. 验证 time-input 显示为"2023年闰四月初一 XX时"
8. 再次点击 time-input，打开 time-picker
9. **验证"闰月"复选框已勾选** ✓

## 注意事项

1. **数据一致性**：确保 `lunarDateTime.isLeapMonth` 和页面的 `isLeapMonth` 保持同步
2. **初始化**：在加载编辑数据时，也要正确设置 `isLeapMonth` 值
3. **公历模式**：公历模式下 `isLeapMonth` 固定为 false，不显示闰月选项
4. **数据保存**：提交档案时，确保 `isLeapMonth` 正确保存到数据库

## 相关组件

- `time-picker` - 时间选择器组件（支持 isLeapMonth 属性）
- `time-input` - 时间输入框组件（显示包含闰月的时间）
- `AddProfileController` - 档案控制器（管理时间数据）

## 修复效果

修复后，用户选择闰月日期后再次打开选择器，闰月复选框会正确显示为勾选状态，提升用户体验，避免用户困惑。

