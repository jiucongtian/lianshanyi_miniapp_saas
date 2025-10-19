# time-input 组件农历显示优化

## 概述

优化 time-input 组件的农历时间显示，使用传统的农历文案（正月、二月...腊月，初一、初二...三十），保持与 time-picker 组件的显示风格一致。

## 修改内容

### 1. 新增公共工具 `lunarFormatter.js`

创建了一个公共的农历格式化工具模块，供所有组件和控制器使用。

**文件位置：** `miniprogram/utils/lunarFormatter.js`

**功能：**
- 提供农历月份和日期的中文映射
- 提供格式化农历时间的工具函数

**主要方法：**

#### `getLunarMonthName(month)`
获取农历月份的中文名称
- 参数：`month` (number) - 月份数值 (1-12)
- 返回：农历月份中文名称（正月、二月...腊月）

#### `getLunarDayName(day)`
获取农历日期的中文名称
- 参数：`day` (number) - 日期数值 (1-30)
- 返回：农历日期中文名称（初一、初二...三十）

#### `formatLunarDateTime(year, month, day, timeName, isLeapMonth)`
格式化农历时间显示（包含时辰）
- 参数：
  - `year` (number) - 年份
  - `month` (number) - 月份 (1-12)
  - `day` (number) - 日期 (1-30)
  - `timeName` (string) - 时辰名称（如"子时(23-01)"）
  - `isLeapMonth` (boolean) - 是否闰月
- 返回：格式化后的农历时间字符串

**示例：**
```javascript
formatLunarDateTime(2023, 11, 23, '子时(23-01)', false)
// 输出：2023年冬月廿三 子时(23-01)

formatLunarDateTime(2023, 4, 1, '寅时(03-05)', true)
// 输出：2023年闰四月初一 寅时(03-05)
```

### 2. 修改 time-picker 组件

在 `miniprogram/components/time-picker/index.js` 中引入并使用 `lunarFormatter` 工具。

**修改点：**

1. **引入工具模块**
```javascript
const { formatLunarDateTime } = require('../../utils/lunarFormatter.js');
```

2. **更新 `_convertCalendar` 方法中的农历格式化**
   - 公历转农历时的格式化（行647-653）
   - 农历转公历时的格式化（行685-691）

3. **更新 `_formatSelectedTime` 方法**
   - 农历模式下使用 `formatLunarDateTime` 工具函数（行344）

### 3. 修改 AddProfileController

在 `miniprogram/controllers/AddProfileController.js` 中引入并使用 `lunarFormatter` 工具。

**修改点：**

1. **引入工具模块**
```javascript
const { formatLunarDateTime } = require('../utils/lunarFormatter');
```

2. **更新 `_convertSolarToLunar` 方法**（行680-686）
   - 公历转农历后的农历时间格式化

3. **更新 `_convertLunarToSolar` 方法**（行742-748）
   - 农历转公历时保持农历时间的正确格式化

4. **更新 `loadEditingData` 方法**（行1000-1006）
   - 加载农历档案数据时的时间格式化

## 显示效果对比

### 修改前
```
农历时间：2023年11月23日 子时(23-01)
农历时间：2023年闰4月1日 寅时(03-05)
```

### 修改后
```
农历时间：2023年冬月廿三 子时(23-01)
农历时间：2023年闰四月初一 寅时(03-05)
```

## 农历文案映射表

### 月份映射
| 数值 | 显示文案 |
|------|---------|
| 1    | 正月    |
| 2    | 二月    |
| 3    | 三月    |
| 4    | 四月    |
| 5    | 五月    |
| 6    | 六月    |
| 7    | 七月    |
| 8    | 八月    |
| 9    | 九月    |
| 10   | 十月    |
| 11   | 冬月    |
| 12   | 腊月    |

### 日期映射
| 数值 | 显示文案 | 数值 | 显示文案 |
|------|---------|------|---------|
| 1    | 初一    | 16   | 十六    |
| 2    | 初二    | 17   | 十七    |
| 3    | 初三    | 18   | 十八    |
| 4    | 初四    | 19   | 十九    |
| 5    | 初五    | 20   | 二十    |
| 6    | 初六    | 21   | 廿一    |
| 7    | 初七    | 22   | 廿二    |
| 8    | 初八    | 23   | 廿三    |
| 9    | 初九    | 24   | 廿四    |
| 10   | 初十    | 25   | 廿五    |
| 11   | 十一    | 26   | 廿六    |
| 12   | 十二    | 27   | 廿七    |
| 13   | 十三    | 28   | 廿八    |
| 14   | 十四    | 29   | 廿九    |
| 15   | 十五    | 30   | 三十    |

## 优势

### 1. 代码复用
- 统一的农历格式化逻辑
- 避免重复代码
- 便于维护和更新

### 2. 显示一致性
- time-picker 滚轮显示与 time-input 最终显示保持一致
- 农历文案更符合中文使用习惯
- 提升用户体验

### 3. 可扩展性
- 工具函数独立，易于在其他地方使用
- 支持闰月显示
- 便于后续功能扩展

### 4. 数据准确性
- 显示层（文案）与数据层（数值）分离
- 实际存储和计算仍使用数值
- 只在显示时进行格式化

## 注意事项

1. **数据不变**：所有修改只影响显示层，实际存储的数据仍然是数值型
2. **向后兼容**：返回的数据结构保持不变，只是格式化字符串的内容改变
3. **统一使用**：所有涉及农历时间显示的地方都应使用 `lunarFormatter` 工具
4. **闰月处理**：正确处理闰月的显示（如"闰四月"）

## 测试建议

1. 测试 time-picker 选择农历时间后的显示
2. 测试 time-input 组件显示农历时间
3. 测试公历转农历的显示
4. 测试农历转公历的显示
5. 测试闰月的正确显示
6. 测试编辑档案时加载农历时间的显示
7. 测试各个月份（尤其是冬月、腊月）的正确显示
8. 测试各个日期（尤其是初一、初十、二十、三十）的正确显示

## 相关文件

- `/miniprogram/utils/lunarFormatter.js` - 农历格式化工具（新增）
- `/miniprogram/components/time-picker/index.js` - 时间选择器组件（修改）
- `/miniprogram/controllers/AddProfileController.js` - 添加档案控制器（修改）
- `/miniprogram/components/time-input/index.js` - 时间输入框组件（无需修改）
- `/miniprogram/components/time-input/index.wxml` - 时间输入框模板（无需修改）

## 总结

通过创建公共的 `lunarFormatter` 工具模块，统一了项目中所有农历时间的显示格式，使农历时间显示更加符合传统中文表达习惯，同时保证了代码的可维护性和可扩展性。time-input 组件无需修改，因为它接收的格式化字符串已经在数据源（time-picker 和 AddProfileController）处使用新的格式化方式生成。

