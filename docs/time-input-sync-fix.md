# time-input 组件公历农历时间同步修复

## 问题描述

在使用 `time-input` 组件时，公历时间和农历时间在切换日历类型时没有自动同步，导致：
- 用户选择公历时间后，切换到农历显示时可能是空的
- 在编辑模式下，档案只有公历时间，切换到农历时显示空值

## 问题根源

1. **time-input 组件本身**：作为纯展示组件，不负责历法转换
2. **time-picker 组件**：只在用户点击"确认"时进行历法转换
3. **AddProfileController**：原有的 `_updateTimeDisplayForCalendarType` 方法只是简单切换显示，没有处理缺失数据的转换

## 解决方案

### 1. 增强 AddProfileController 的日历类型切换逻辑

在 `AddProfileController.js` 中添加了自动历法转换功能：

#### 新增方法

- **`_convertSolarToLunar()`**：公历转农历
  - 当切换到农历显示，但没有农历数据时自动调用
  - 使用 `js-calendar-converter` 库进行转换
  - 自动格式化农历时间显示（包含年份）

- **`_convertLunarToSolar()`**：农历转公历
  - 当切换到公历显示，但没有公历数据时自动调用
  - 使用 `js-calendar-converter` 库进行转换
  - 自动格式化公历时间显示

- **`_formatTimeStr(hour, minute)`**：时间格式化辅助方法
  - 统一格式化时辰显示
  - 格式：`子时(23-01)`

#### 修改方法

- **`_updateTimeDisplayForCalendarType(calendarType)`**：增强版
  - 切换到公历时：
    - 如果有公历数据，直接显示
    - 如果没有公历但有农历，自动调用 `_convertLunarToSolar()`
  - 切换到农历时：
    - 如果有农历数据，直接显示
    - 如果没有农历但有公历，自动调用 `_convertSolarToLunar()`

### 2. 统一农历时间格式化

#### 问题：格式不一致
- **公历转农历时**：使用干支年（如 `乙巳年`）+ 中文月日
- **农历转公历时**：闰字在年份前面，使用数字月日（如 `闰2025年9月16日`）

#### 解决方案：统一为全数字格式

在 `time-picker/index.js` 和 `AddProfileController.js` 中统一农历格式：

**统一格式**：`年份(数字) + 闰(如有) + 月(数字) + 日(数字) + 时辰`

示例：
- 普通月份：`2025年9月16日 子时(23-01)`
- 闰月：`2025年闰9月16日 子时(23-01)`
- 公历格式：`2025年10月18日 子时(23-01)`

#### 修改点

**time-picker 组件**：
1. 公历转农历（第484行）：使用 `solarResult.lYear`（数字年份）+ `lMonth`（数字月）+ `lDay`（数字日）
2. 农历转公历（第517行）：直接使用传入的 `year`、`month`、`day` 数字

**AddProfileController**：
1. 公历转农历（第624行）：使用 `lunarResult.lYear`、`lunarResult.lMonth`、`lunarResult.lDay`（全数字）
2. 农历转公历（第679行）：使用传入的 `year`、`month`、`day` 数字

## 测试场景

### 场景1：新建档案，选择公历时间后切换

1. 进入新建档案页面
2. 选择公历时间（例如：2025年10月18日 子时）
3. 点击确认
4. 切换到农历显示
5. **期望结果**：自动显示对应的农历时间（例如：2025年9月16日 子时）

### 场景2：编辑档案，只有公历数据

1. 编辑一个只有公历时间的档案
2. 页面加载时默认显示公历时间
3. 切换到农历显示
4. **期望结果**：自动转换并显示农历时间

### 场景3：来回切换日历类型

1. 选择公历时间并确认
2. 切换到农历 → 应该显示转换后的农历时间
3. 切换回公历 → 应该显示原来的公历时间
4. 再次切换到农历 → 应该显示之前转换的农历时间（不需要重新转换）

## 技术细节

### 依赖库

- **js-calendar-converter**：公历农历转换库
  - 路径：`miniprogram/utils/js-calendar-converter.js`
  - 主要方法：
    - `calendar.solar2lunar(year, month, day)`：公历转农历
    - `calendar.lunar2solar(year, month, day, isLeapMonth)`：农历转公历

### 数据结构

#### 公历时间对象 (solarDateTime)
```javascript
{
  year: 2025,
  month: 10,
  day: 18,
  hour: 0,
  minute: 0
}
```

#### 农历时间对象 (lunarDateTime)
```javascript
{
  year: 2025,
  month: 9,
  day: 16,
  hour: 0,
  minute: 0,
  isLeapMonth: false
}
```

#### 格式化字符串

- **公历**：`2025年10月18日 子时(23-01)`
- **农历**：`2025年9月16日 子时(23-01)` 或 `2025年闰9月16日 子时(23-01)`（闰月）

### 日志输出

转换过程会输出详细的日志信息：

```javascript
[AddProfileController] _convertSolarToLunar 检测到缺少农历时间，进行公历转农历
[AddProfileController] _convertSolarToLunar 公历转农历成功 {
  solar: { year: 2025, month: 10, day: 18, hour: 0, minute: 0 },
  lunar: { year: 2025, month: 9, day: 16, hour: 0, minute: 0, isLeapMonth: false },
  formatted: "2025年9月16日 子时(23-01)"
}
```

## 注意事项

1. **自动转换只在切换日历类型时触发**：用户不需要重新选择时间
2. **转换结果会被缓存**：同一个时间的公历农历只转换一次
3. **转换失败不会阻塞界面**：如果转换失败，会在日志中记录，界面显示为空
4. **闰月标识**：农历闰月会自动添加"闰"字前缀

## 相关文件

- `/miniprogram/controllers/AddProfileController.js` - 主要修改
- `/miniprogram/components/time-picker/index.js` - 格式化修复
- `/miniprogram/components/time-input/index.js` - 无需修改（展示组件）
- `/miniprogram/utils/js-calendar-converter.js` - 转换库

## 更新日志

### 2025-10-18
- ✅ 修复公历农历切换时不同步的问题
- ✅ 增加自动历法转换功能
- ✅ 修复农历格式化缺少年份的问题
- ✅ 统一农历格式为全数字显示（年月日）
- ✅ 添加详细的转换日志

