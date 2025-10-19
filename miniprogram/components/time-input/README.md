# 时间输入框组件 (time-input)

## 概述

时间输入框组件是一个独立的、可复用的时间输入控件，支持公历和农历两种日历类型的时间显示。

## 功能特性

- ✅ 支持公历/农历两种日历类型
- ✅ 独立的样式和交互逻辑
- ✅ 自动根据日历类型切换样式和文本
- ✅ 可自定义标签和占位符
- ✅ 支持点击事件，方便父组件处理

## 使用方法

### 1. 在页面配置中引入组件

在页面的 `index.json` 中添加：

```json
{
  "usingComponents": {
    "time-input": "/components/time-input/index"
  }
}
```

### 2. 在WXML中使用组件

```xml
<time-input
  calendarType="{{calendarType}}"
  solarFormatedDateTime="{{solarFormatedDateTime}}"
  lunarFormatedDateTime="{{lunarFormatedDateTime}}"
  bind:tap="onInputTap"
/>
```

### 3. 在页面JS中处理事件

```javascript
Page({
  data: {
    calendarType: 'solar', // 'solar' 或 'lunar'
    solarFormatedDateTime: '2025年10月18日 子时(23-01)',
    lunarFormatedDateTime: '二零二五年九月十六日 子时(23-01)'
  },
  
  onInputTap(e) {
    // 处理点击事件，例如打开时间选择器
    console.log('时间输入框被点击', e.detail);
  }
});
```

## 属性说明

| 属性名 | 类型 | 默认值 | 必填 | 说明 |
|--------|------|--------|------|------|
| calendarType | String | 'solar' | 否 | 日历类型，可选值：'solar'(公历)、'lunar'(农历) |
| solarFormatedDateTime | String | '' | 否 | 公历格式化时间，例如：'2025年10月18日 子时(23-01)' |
| lunarFormatedDateTime | String | '' | 否 | 农历格式化时间，例如：'二零二五年九月十六日 子时(23-01)' |
| showLabel | Boolean | true | 否 | 是否显示标签 |
| labelText | String | '' | 否 | 自定义标签文本，为空时根据日历类型自动显示 |
| placeholder | String | '' | 否 | 自定义占位符，为空时根据日历类型自动显示 |

## 事件说明

| 事件名 | 说明 | 参数 |
|--------|------|------|
| tap | 输入框被点击时触发 | e.detail = { calendarType: String } |

## 样式特性

### 公历模式
- 背景色：浅灰色 (#f8f9fa)
- 有值时文字颜色：深色 (#333)
- 点击时边框颜色：蓝色 (#0052d9)

### 农历模式
- 背景色：浅蓝色 (#f0f8ff)
- 有值时文字颜色：蓝色 (#1890ff)
- 点击时边框颜色：淡蓝色 (#b3d9ff)

## 完整示例

### WXML
```xml
<!-- 基本使用 -->
<time-input
  calendarType="{{calendarType}}"
  solarFormatedDateTime="{{solarFormatedDateTime}}"
  lunarFormatedDateTime="{{lunarFormatedDateTime}}"
  bind:tap="onInputTap"
/>

<!-- 隐藏标签 -->
<time-input
  calendarType="{{calendarType}}"
  solarFormatedDateTime="{{solarFormatedDateTime}}"
  lunarFormatedDateTime="{{lunarFormatedDateTime}}"
  showLabel="{{false}}"
  bind:tap="onInputTap"
/>

<!-- 自定义标签和占位符 -->
<time-input
  calendarType="{{calendarType}}"
  solarFormatedDateTime="{{solarFormatedDateTime}}"
  lunarFormatedDateTime="{{lunarFormatedDateTime}}"
  labelText="出生时间"
  placeholder="请选择出生时间"
  bind:tap="onInputTap"
/>
```

### JS
```javascript
Page({
  data: {
    calendarType: 'solar',
    solarFormatedDateTime: '',
    lunarFormatedDateTime: ''
  },
  
  // 点击输入框，打开时间选择器
  onInputTap(e) {
    const { calendarType } = e.detail;
    
    // 打开时间选择器或其他操作
    this.setData({
      showTimePicker: true
    });
  },
  
  // 时间选择完成后更新数据
  onTimeSelected(timeData) {
    this.setData({
      solarFormatedDateTime: timeData.solarFormatedDateTime,
      lunarFormatedDateTime: timeData.lunarFormatedDateTime
    });
  }
});
```

## 注意事项

1. **数据同步**：组件不会修改传入的属性，所有数据更新需要在父组件中进行
2. **日历类型切换**：切换日历类型时，组件会自动显示对应的格式化时间
3. **占位符显示**：当对应日历类型的时间为空时，会显示占位符文本
4. **样式定制**：如需自定义样式，可以在父组件中通过外部样式类或修改组件样式文件

## 更新日志

### v1.0.0 (2025-10-18)
- 初始版本，从 addProfile 页面提取独立组件
- 支持公历/农历双日历类型
- 独立的样式和交互逻辑

