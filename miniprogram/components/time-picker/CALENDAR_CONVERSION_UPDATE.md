# 时间选择器历法转换功能更新

## 更新概述

为时间选择器组件添加了自动历法转换功能，当用户选择时间并点击确定后，系统会自动将选择的时间转换为另一种历法的时间。

## 主要变更

### 1. 引入日历转换器

创建了 `miniprogram/utils/calendarConverter.js` 工具模块，封装了日历转换功能：

```javascript
const calendarConverter = require('../../utils/calendarConverter.js');
```

该工具模块提供了以下方法：
- `solar2lunar(year, month, day)` - 公历转农历
- `lunar2solar(year, month, day, isLeapMonth)` - 农历转公历
- `formatLunarMonth(lunarResult)` - 格式化农历月份
- `formatLunarDay(lunarResult)` - 格式化农历日期

### 2. 新增历法转换方法

添加了 `_convertCalendar` 方法，支持：
- 公历转农历
- 农历转公历
- 错误处理和验证
- 格式化时间显示

### 3. 修改确认逻辑

在 `onConfirm` 方法中：
- 调用历法转换功能
- 处理转换失败的情况
- 将转换结果传递给父组件

### 4. 更新控制器处理

在 `AddProfileController.js` 的 `onTimeConfirm` 方法中：
- 接收转换后的公历和农历时间数据
- 同时存储两种历法的时间信息
- 更新页面显示

## 功能特性

### 自动转换
- 选择公历时间时，自动计算对应的农历时间
- 选择农历时间时，自动计算对应的公历时间
- 支持闰月处理

### 错误处理
- 验证输入日期的有效性
- 处理转换失败的情况
- 显示友好的错误提示

### 数据存储
- 同时保存公历和农历时间数据
- 支持格式化显示
- 保持时辰信息

## 使用方式

时间选择器的使用方式保持不变，但返回的数据结构有所扩展：

```javascript
// 返回的时间数据包含转换结果
{
  year, month, day, hour, minute,
  formatedTime, timeIndex, calendarType,
  isUncertainTime, isLeapMonth,
  // 新增的转换数据
  solarDateTime: { year, month, day, hour, minute },
  lunarDateTime: { year, month, day, hour, minute },
  solarFormatedDateTime: "2024年1月1日 子时(23-01)",
  lunarFormatedDateTime: "甲辰年十一月廿二 子时(23-01)"
}
```

## 测试建议

1. 测试公历转农历功能
2. 测试农历转公历功能
3. 测试闰月处理
4. 测试无效日期处理
5. 测试时辰选择
6. 测试不确定时辰功能

## 注意事项

- 转换失败时会显示错误提示并阻止确认
- 农历日期需要考虑闰月情况
- 时辰信息在转换过程中保持不变
- 格式化显示会根据历法类型调整
