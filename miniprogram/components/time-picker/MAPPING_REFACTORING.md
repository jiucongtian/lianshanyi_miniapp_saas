# 时间选择器映射表重构说明

## 概述

将时间选择器组件的年月日显示方式从直接使用数值改为统一的映射表模式，使其与时辰的实现方式保持一致，并针对公历和农历使用不同的显示文案。

## 修改内容

### 1. 新增映射表常量

在组件顶部新增了四个映射表常量：

#### 农历月份映射 `LUNAR_MONTHS`
```javascript
const LUNAR_MONTHS = [
  null,
  { name: '正月', value: 1 },
  { name: '二月', value: 2 },
  // ... 
  { name: '腊月', value: 12 }
];
```

#### 公历月份映射 `SOLAR_MONTHS`
```javascript
const SOLAR_MONTHS = [
  null,
  { name: '1月', value: 1 },
  { name: '2月', value: 2 },
  // ...
  { name: '12月', value: 12 }
];
```

#### 农历日期映射 `LUNAR_DAYS`
```javascript
const LUNAR_DAYS = [
  null,
  { name: '初一', value: 1 },
  { name: '初二', value: 2 },
  // ...
  { name: '三十', value: 30 }
];
```

#### 公历日期映射 `SOLAR_DAYS`
```javascript
const SOLAR_DAYS = [
  null,
  { name: '1日', value: 1 },
  { name: '2日', value: 2 },
  // ...
  { name: '31日', value: 31 }
];
```

### 2. 数据结构调整

修改组件的 data 结构：
```javascript
// 修改前
data: {
  monthRange: Array.from({length: 12}, (_, i) => i + 1),  // [1, 2, 3, ...]
  dayRange: Array.from({length: 31}, (_, i) => i + 1)     // [1, 2, 3, ...]
}

// 修改后
data: {
  monthMap: [],  // 根据历法类型动态生成：['正月', '二月', ...] 或 ['1月', '2月', ...]
  dayMap: []     // 根据历法类型动态生成：['初一', '初二', ...] 或 ['1日', '2日', ...]
}
```

### 3. 新增辅助方法

#### `_getMonthDayMaps()`
根据历法类型生成月份和日期的显示数组：
```javascript
_getMonthDayMaps() {
  if (this.data.calendarType === 'lunar') {
    const monthMap = LUNAR_MONTHS.slice(1).map(item => item.name); // ['正月', '二月', ...]
    const dayMap = LUNAR_DAYS.slice(1, 31).map(item => item.name); // ['初一', '初二', ..., '三十']
    return { monthMap, dayMap };
  } else {
    const monthMap = SOLAR_MONTHS.slice(1).map(item => item.name); // ['1月', '2月', ...]
    const dayMap = SOLAR_DAYS.slice(1).map(item => item.name);     // ['1日', '2日', ..., '31日']
    return { monthMap, dayMap };
  }
}
```

#### `_getMonthValue(monthIndex)`
根据索引获取月份的实际数值：
```javascript
_getMonthValue(monthIndex) {
  if (this.data.calendarType === 'lunar') {
    return LUNAR_MONTHS[monthIndex + 1].value;
  } else {
    return SOLAR_MONTHS[monthIndex + 1].value;
  }
}
```

#### `_getDayValue(dayIndex)`
根据索引获取日期的实际数值：
```javascript
_getDayValue(dayIndex) {
  if (this.data.calendarType === 'lunar') {
    return LUNAR_DAYS[dayIndex + 1].value;
  } else {
    return SOLAR_DAYS[dayIndex + 1].value;
  }
}
```

#### `_formatSelectedTime(year, month, day, timeName)`
根据历法类型格式化选中的时间：
```javascript
_formatSelectedTime(year, month, day, timeName) {
  if (this.data.calendarType === 'lunar') {
    const monthName = LUNAR_MONTHS[month].name;
    const dayName = LUNAR_DAYS[day].name;
    return `${year}年${monthName}${dayName} ${timeName}`;
  } else {
    return `${year}年${month}月${day}日 ${timeName}`;
  }
}
```

### 4. 修改现有方法

#### `_initializeData()`
使用新的 `_getMonthDayMaps()` 方法初始化数据：
```javascript
const { monthMap, dayMap } = this._getMonthDayMaps();
this.setData({ monthMap, dayMap, ... });
```

#### `onConfirm()`
使用新的辅助方法获取实际值：
```javascript
const month = this._getMonthValue(monthIndex);
const day = this._getDayValue(dayIndex);
const formatedTime = this._formatSelectedTime(year, month, day, timeInfo.name);
```

### 5. WXML 修改

修改滚轮列的数据绑定：
```xml
<!-- 修改前 -->
<picker-view-column>
  <view wx:for="{{monthRange}}" wx:key="index" class="picker-item">{{item}}月</view>
</picker-view-column>
<picker-view-column>
  <view wx:for="{{dayRange}}" wx:key="index" class="picker-item">{{item}}日</view>
</picker-view-column>

<!-- 修改后 -->
<picker-view-column>
  <view wx:for="{{monthMap}}" wx:key="index" class="picker-item">{{item}}</view>
</picker-view-column>
<picker-view-column>
  <view wx:for="{{dayMap}}" wx:key="index" class="picker-item">{{item}}</view>
</picker-view-column>
```

## 实现效果

### 公历模式显示
- 年份：`1990年`、`1991年`...
- 月份：`1月`、`2月`...`12月`
- 日期：`1日`、`2日`...`31日`
- 时辰：`子时(23-01)`、`丑时(01-03)`...

### 农历模式显示
- 年份：`1990年`、`1991年`...
- 月份：`正月`、`二月`...`腊月`
- 日期：`初一`、`初二`...`三十`
- 时辰：`子时(23-01)`、`丑时(01-03)`...

## 优势

### 1. 统一的架构设计
- 年、月、日、时辰全部采用统一的映射表模式
- 保持代码风格一致性
- 易于理解和维护

### 2. 文案灵活性
- 公历和农历使用不同的显示文案
- 农历显示更符合中文习惯（如"正月"、"初一"）
- 便于后续国际化扩展

### 3. 数据分离
- 显示层（文案）与数据层（数值）分离
- 通过映射表进行转换，逻辑清晰
- 减少模板层的数据处理逻辑

### 4. 可扩展性
- 方便添加其他历法（如藏历、回历等）
- 易于定制不同的显示格式
- 支持多语言扩展

## 注意事项

1. **索引偏移**：映射表的第一个元素（索引0）为 `null`，实际数据从索引1开始，因此在获取值时需要 `+1`
2. **农历日期限制**：农历最多30天，公历最多31天
3. **历法切换**：切换历法类型时会自动重新初始化月份和日期的映射数组
4. **向后兼容**：返回的数据结构保持不变，只是内部实现改为映射表方式

## 示例代码

### 选择器索引到实际值的转换
```javascript
// picker 索引值
const pickerValue = [71, 0, 0, 0]; // [年索引71=2020年, 月索引0=正月/1月, 日索引0=初一/1日, 时辰索引0=子时]

// 转换为实际值
const year = yearRangeArray[71];        // 2020
const month = _getMonthValue(0);        // 1
const day = _getDayValue(0);            // 1
const timeInfo = TIME_PERIODS[0];       // { hour: 0, minute: 1 }

// 农历模式显示：2020年正月初一 子时(23-01)
// 公历模式显示：2020年1月1日 子时(23-01)
```

## 测试建议

1. 测试公历和农历的显示是否正确
2. 测试月份和日期的数值转换是否准确
3. 测试历法切换时的数据更新
4. 测试边界值（1月1日、12月31日等）
5. 测试闰月标记在农历模式的显示

