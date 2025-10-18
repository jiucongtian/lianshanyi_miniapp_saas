# 时间选择器组件农历支持更新

## 更新概述

本次更新为时间选择器组件添加了完整的农历支持，包括闰月选择功能和相应的UI调整。

## 主要变更

### 1. 新增功能

- **农历模式支持**：组件现在可以设置为农历模式（`calendarType: 'lunar'`）
- **闰月选择**：农历模式下新增闰月勾选框，位于时辰未知勾选框右侧
- **日期范围调整**：农历模式下日期滚轮最大值为30日，公历模式保持31日

### 2. 新增属性

- `isLeapMonth`：是否闰月（仅农历模式有效）
- 更新 `initialDateTime` 支持 `isLeapMonth` 字段

### 3. 新增事件

- `leap-month-toggle`：闰月状态切换事件（仅农历模式）

### 4. UI调整

- 勾选框区域改为左右布局，左侧为"时辰未知"，右侧为"闰月"（仅农历模式显示）
- 响应式设计优化，支持小屏幕设备
- 暗色主题适配

## 文件修改清单

### 1. index.wxml
- 新增闰月勾选框，条件渲染（仅农历模式显示）
- 调整勾选框区域布局为左右分布

### 2. index.js
- 新增 `isLeapMonth` 属性
- 新增 `internalLeapMonth` 内部状态
- 新增 `onLeapMonthToggle` 方法
- 新增 `_getDayRange` 方法，根据日历类型调整日期范围
- 更新 `_initializeData` 方法，支持闰月状态初始化
- 更新 `onConfirm` 方法，包含闰月信息
- 新增 `calendarType` 监听器，支持动态切换

### 3. index.less
- 调整 `.picker-checkbox-section` 为 flex 布局
- 新增闰月勾选框样式
- 优化响应式设计
- 保持暗色主题兼容性

### 4. README.md
- 更新功能特性说明
- 新增闰月相关属性和事件说明
- 更新使用示例代码
- 新增 v1.1.0 更新日志

## 使用示例

### 农历模式使用

```javascript
// 页面数据
data: {
  showTimePicker: false,
  calendarType: 'lunar',  // 设置为农历模式
  initialDateTime: {
    year: 2023,
    month: 6,
    day: 15,
    hour: 14,
    minute: 1,
    isLeapMonth: false  // 是否闰月
  },
  isUncertainTime: false,
  isLeapMonth: false
}

// 事件处理
onLeapMonthToggle(e) {
  const { isLeapMonth } = e.detail;
  this.setData({ isLeapMonth });
}
```

### WXML使用

```xml
<time-picker 
  visible="{{showTimePicker}}"
  calendarType="{{calendarType}}"
  initialDateTime="{{initialDateTime}}"
  isUncertainTime="{{isUncertainTime}}"
  isLeapMonth="{{isLeapMonth}}"
  bind:confirm="onTimeConfirm"
  bind:cancel="onTimeCancel"
  bind:uncertain-time-toggle="onUncertainTimeToggle"
  bind:leap-month-toggle="onLeapMonthToggle"
/>
```

## 兼容性说明

- 向后兼容：公历模式下的使用方式保持不变
- 新增属性都有默认值，不会影响现有代码
- 农历模式为可选功能，需要显式设置 `calendarType: 'lunar'`

## 注意事项

1. 闰月勾选框仅在农历模式下显示
2. 农历模式下日期范围固定为1-30日
3. 公历模式下日期范围保持1-31日
4. 组件会根据 `calendarType` 自动调整日期范围
5. 闰月状态仅在农历模式下有效，公历模式下始终为 `false`

## 测试建议

1. 测试公历模式下的正常功能
2. 测试农历模式下的闰月选择
3. 测试日历类型动态切换
4. 测试不同屏幕尺寸下的UI表现
5. 测试暗色主题下的显示效果
