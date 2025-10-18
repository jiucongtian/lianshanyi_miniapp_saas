# 时间选择器组件 (TimePicker)

一个功能完整的时间选择器组件，支持公历/农历时间选择，包含时辰选择功能。

## 功能特性

- ✅ 支持年月日时辰选择
- ✅ 支持不确定时辰选项
- ✅ 支持公历/农历切换
- ✅ 日期有效性验证
- ✅ 自定义年份范围
- ✅ 响应式设计
- ✅ 暗色主题适配
- ✅ 流畅的动画效果

## 使用方法

### 1. 在页面JSON中注册组件

```json
{
  "usingComponents": {
    "time-picker": "/components/time-picker/index"
  }
}
```

### 2. 在WXML中使用组件

```xml
<time-picker 
  visible="{{showTimePicker}}"
  calendarType="{{calendarType}}"
  initialDateTime="{{initialDateTime}}"
  isUncertainTime="{{isUncertainTime}}"
  yearRange="{{[1949, 2100]}}"
  bind:confirm="onTimeConfirm"
  bind:cancel="onTimeCancel"
  bind:uncertain-time-toggle="onUncertainTimeToggle"
/>
```

### 3. 在JS中处理事件

```javascript
Page({
  data: {
    showTimePicker: false,
    calendarType: 'solar',
    initialDateTime: null,
    isUncertainTime: false
  },

  // 打开时间选择器
  openTimePicker() {
    this.setData({
      showTimePicker: true,
      initialDateTime: this.data.birthDate
    });
  },

  // 处理时间确认
  onTimeConfirm(e) {
    const timeData = e.detail;
    console.log('选择的时间:', timeData);
    
    // 更新页面数据
    this.setData({
      birthDate: {
        year: timeData.year,
        month: timeData.month,
        day: timeData.day,
        hour: timeData.hour,
        minute: timeData.minute
      },
      formatedDateTime: timeData.formatedTime,
      isUncertainTime: timeData.isUncertainTime
    });
  },

  // 处理取消选择
  onTimeCancel() {
    console.log('取消时间选择');
  },

  // 处理不确定时辰切换
  onUncertainTimeToggle(e) {
    const { isUncertainTime } = e.detail;
    this.setData({ isUncertainTime });
  }
});
```

## 组件属性

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| visible | Boolean | false | 是否显示选择器 |
| calendarType | String | 'solar' | 日历类型：solar=公历，lunar=农历 |
| initialDateTime | Object | null | 初始时间数据 {year, month, day, hour, minute} |
| isUncertainTime | Boolean | false | 是否不确定时辰 |
| yearRange | Array | [1949, 2100] | 年份范围 [startYear, endYear] |

## 组件事件

| 事件名 | 说明 | 回调参数 |
|--------|------|----------|
| confirm | 确认选择时间 | timeData: 时间数据对象 |
| cancel | 取消选择 | 无 |
| uncertain-time-toggle | 不确定时辰状态切换 | {isUncertainTime: Boolean} |

## 时间数据格式

### confirm事件返回的timeData对象

```javascript
{
  year: 2023,           // 年份
  month: 12,            // 月份
  day: 25,              // 日期
  hour: 14,             // 小时（时辰对应的小时）
  minute: 1,            // 分钟
  formatedTime: "2023年12月25日 未时(13-15)", // 格式化时间字符串
  timeIndex: 7,         // 时辰索引
  calendarType: "solar", // 日历类型
  isUncertainTime: false // 是否不确定时辰
}
```

## 样式定制

组件使用Less编写样式，支持以下CSS变量定制：

```less
.time-picker-container {
  --picker-bg-color: #fff;           // 背景色
  --picker-text-color: #333;         // 文字颜色
  --picker-primary-color: #0052d9;   // 主色调
  --picker-border-color: #e0e0e0;    // 边框颜色
  --picker-border-radius: 24rpx;     // 圆角大小
}
```

## 注意事项

1. 组件依赖TDesign的popup组件，确保已正确安装
2. 年份范围建议设置在合理范围内（如1949-2100）
3. 组件会自动验证日期的有效性
4. 时辰选择基于传统十二时辰制
5. 支持响应式设计，在不同屏幕尺寸下都有良好表现

## 更新日志

### v1.0.0
- 初始版本发布
- 支持基本的时间选择功能
- 支持时辰选择
- 支持不确定时辰选项
- 支持自定义年份范围
