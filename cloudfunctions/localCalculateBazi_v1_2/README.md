# 生辰八字计算器

本模块提供准确的生辰八字计算功能，支持年柱、月柱的节气修正。

## 功能特点

1. **完整的八字计算**：计算年柱、月柱、日柱、时柱
2. **年柱修正**：根据立春时间自动修正年柱（✨ 使用时辰区间判断）
3. **月柱修正**：根据节气时间自动修正月柱（✨ 使用时辰区间判断）
4. **时柱计算**：根据日柱和时辰准确计算时柱
5. **详细信息**：提供公历、农历、修正信息等详细数据
6. **农历支持**：⭐ 支持农历日期输入，自动转换为公历后计算（支持闰月）

### ⭐ 重要特性：时辰区间判断

年柱和月柱的修正采用**时辰区间**而非精确分钟：

- **时辰区间**：每个时辰覆盖两个小时（如亥时=21:00-22:59）
- **修正规则**：
  - ✅ 整个时辰都在节气前 → 使用前一年/月
  - ✅ 节气在时辰区间内 → 视为节气后，使用当年/月
  - ✅ 整个时辰都在节气后 → 使用当年/月

**示例**：2025年立春在2月3日22:10

| 时辰 | 时间 | 时辰区间 | 判断 | 年柱 |
|------|------|----------|------|------|
| 戌时 | 20:00 | 19:00-20:59 | 整个时辰在立春前 | 甲辰（前一年）|
| 亥时 | 21:00 | 21:00-22:59 | 立春在时辰内 | 乙巳（当年）|
| 亥时 | 22:09 | 21:00-22:59 | 立春在时辰内 | 乙巳（当年）|
| 子时 | 23:00 | 23:00-00:59 | 整个时辰在立春后 | 乙巳（当年）|

## 📚 文档导航

- **[CORRECTION_LOGIC.md](./CORRECTION_LOGIC.md)** - 📖 **修正逻辑详解**（推荐阅读）
  - 年柱修正的完整逻辑
  - 月柱修正的完整逻辑
  - 时辰区间计算方法
  - 实际案例分析
- **[CHANGELOG.md](./CHANGELOG.md)** - 版本更新日志
- **[SUMMARY.md](./SUMMARY.md)** - 项目开发总结
- **[TESTING.md](./TESTING.md)** - 测试文档

## 核心模块说明

### 依赖的核心文件（不可修改）

- `core-converter/js-calendar-converter.cjs` - 公历农历转换库，提供基础干支信息
- `core-converter/solar-terms-compressed-original.js` - 节气数据库，提供精确的节气时间

### 新增文件

- `bazi-calculator.js` - 生辰八字计算器主文件
- `test-bazi.js` - 测试文件
- `README.md` - 本说明文档

## 使用方法

### 基本用法（云函数调用）

```javascript
// 公历日期计算
const result = await wx.cloud.callFunction({
  name: 'localCalculateBazi_v1_2',
  data: {
    year: 2000,
    month: 5,
    day: 15,
    hour: 10,
    minute: 30,
    isLunar: false  // 公历
  }
});

if (result.result.success) {
  console.log('八字数据:', result.result.data.baziData);
}
```

### 农历日期计算（新增）

```javascript
// 农历日期计算（支持闰月）
const result = await wx.cloud.callFunction({
  name: 'localCalculateBazi_v1_2',
  data: {
    year: 1990,
    month: 4,      // 农历四月
    day: 22,       // 农历廿二
    hour: 14,
    minute: 30,
    isLunar: true,     // 标记为农历
    isLeapMonth: false // 是否闰月
  }
});

if (result.result.success) {
  console.log('八字数据:', result.result.data.baziData);
  console.log('转换后的公历:', result.result.data.converted);
  // 输出: { solarYear: 1990, solarMonth: 5, solarDay: 15 }
}
```

### 本地调用（内部使用）

```javascript
const { calculateBazi } = require('./core-converter/bazi-calculator');

// 计算生辰八字（始终使用公历日期）
// 参数：年、月、日、时、分
const result = calculateBazi(2000, 5, 15, 10, 30);

if (result.success) {
  console.log('八字:', result.bazi);
  // 输出示例:
  // {
  //   year: '庚辰',   // 年柱
  //   month: '辛巳',  // 月柱
  //   day: '甲子',    // 日柱
  //   hour: '己巳'    // 时柱
  // }
}
```

### 返回数据结构

#### 云函数返回结构

```javascript
{
  success: true,
  message: '本地八字计算成功',
  data: {
    success: true,
    baziData: {
      year: { gan: '庚', zhi: '辰', ganzhiIndex: 17 },
      month: { gan: '辛', zhi: '巳', ganzhiIndex: 18 },
      day: { gan: '甲', zhi: '子', ganzhiIndex: 1 },
      hour: { gan: '己', zhi: '巳', ganzhiIndex: 6 },
      lunarDate: {
        year: 1990,
        month: 4,
        day: 22,
        isLeap: false
      }
    },
    details: {
      solarDate: {
        year: 1990,
        month: 5,
        day: 15,
        hour: 14,
        minute: 30
      },
      corrections: {
        yearCorrected: false,
        monthCorrected: false,
        lichunTime: '1990年02月04日 03时14分',
        solarTermInfo: null
      }
    },
    // 输入信息
    inputDate: {
      isLunar: true,        // 输入是否为农历
      isLeapMonth: false,   // 是否闰月
      originalYear: 1990,   // 原始输入年份
      originalMonth: 4,     // 原始输入月份
      originalDay: 22,      // 原始输入日期
      hour: 14,
      minute: 30
    },
    // 如果是农历，包含转换信息
    converted: {
      solarYear: 1990,
      solarMonth: 5,
      solarDay: 15
    }
  },
  context: {
    openid: 'xxx',
    appid: 'xxx',
    unionid: 'xxx'
  }
}
```

#### 本地计算返回结构

```javascript
{
  success: true,
  baziData: {
    year: { gan: '庚', zhi: '辰', ganzhiIndex: 17 },
    month: { gan: '辛', zhi: '巳', ganzhiIndex: 18 },
    day: { gan: '甲', zhi: '子', ganzhiIndex: 1 },
    hour: { gan: '己', zhi: '巳', ganzhiIndex: 6 },
    lunarDate: {
      year: 2000,
      month: 4,
      day: 13,
      isLeap: false
    }
  },
  details: {
    solarDate: {
      year: 2000,
      month: 5,
      day: 15,
      hour: 10,
      minute: 30
    },
    corrections: {
      yearCorrected: false,      // 是否修正了年柱
      monthCorrected: false,     // 是否修正了月柱
      lichunTime: '2000年02月04日 20时32分',  // 立春时间
      solarTermInfo: null        // 节气信息（如果当天是节气日）
    }
  }
}
```

## 修正规则说明

### 年柱修正

**规则**：八字的年以立春为界，而非公历1月1日或农历正月初一。

- 如果查询时间**早于当年立春**时刻 → 使用**前一年**的年柱
- 如果查询时间**晚于或等于立春**时刻 → 使用**当年**的年柱

**示例**：
```javascript
// 2000年立春时间：2000年2月4日 20时32分

// 示例1: 2000年2月3日 15时 （立春前）
calculateBazi(2000, 2, 3, 15, 0)
// 年柱使用1999年的"己卯"

// 示例2: 2000年2月4日 21时 （立春后）
calculateBazi(2000, 2, 4, 21, 0)
// 年柱使用2000年的"庚辰"
```

### 月柱修正

**规则**：八字的月以节气为界，每月的第一个节气（节）为月的分界。

月份对应的节气：
- 1月 - 小寒
- 2月 - 立春
- 3月 - 惊蛰
- 4月 - 清明
- 5月 - 立夏
- 6月 - 芒种
- 7月 - 小暑
- 8月 - 立秋
- 9月 - 白露
- 10月 - 寒露
- 11月 - 立冬
- 12月 - 大雪

**修正逻辑（使用时辰区间）**：

⭐ **重要**：本系统使用**时辰区间**来判断，而不是精确到分钟。

1. 将传入的小时转换为对应的时辰区间（每2小时一个时辰）
2. 判断节气时间与时辰区间的关系：
   - **整个时辰都在节气前** → 使用上月月柱
   - **节气在时辰区间内** → 使用当月月柱（视为已过节气）
   - **整个时辰都在节气后** → 使用当月月柱

**时辰划分**：
- 子时：23:00-00:59（跨日）
- 丑时：01:00-02:59
- 寅时：03:00-04:59
- 卯时：05:00-06:59
- 辰时：07:00-08:59
- 巳时：09:00-10:59
- 午时：11:00-12:59
- 未时：13:00-14:59
- 申时：15:00-16:59
- 酉时：17:00-18:59
- 戌时：19:00-20:59
- 亥时：21:00-22:59

**示例**：
```javascript
// 2000年清明时间：2000年4月4日 19时32分

// 示例1: 酉时 17时（整个时辰17:00-18:59都在清明前）
calculateBazi(2000, 4, 4, 17, 30)
// 月柱使用3月的"戊寅"

// 示例2: 戌时 19时（清明19:32在时辰19:00-20:59内）
calculateBazi(2000, 4, 4, 19, 0)
// 月柱使用4月的"庚辰"（视为已过清明）

// 示例3: 戌时 20时（清明19:32在时辰19:00-20:59内）
calculateBazi(2000, 4, 4, 20, 45)
// 月柱使用4月的"庚辰"（同一时辰，结果相同）

// 示例4: 亥时 21时（整个时辰21:00-22:59都在清明后）
calculateBazi(2000, 4, 4, 21, 0)
// 月柱使用4月的"庚辰"
```

**时辰区间逻辑的优势**：
1. 同一时辰内的任何时间，八字结果一致
2. 符合传统命理学的时辰划分理念
3. 避免因分钟差异导致的八字变化

### 时柱计算

时辰划分（注意：23点属于次日子时）：
- 子时：23:00-00:59
- 丑时：01:00-02:59
- 寅时：03:00-04:59
- 卯时：05:00-06:59
- 辰时：07:00-08:59
- 巳时：09:00-10:59
- 午时：11:00-12:59
- 未时：13:00-14:59
- 申时：15:00-16:59
- 酉时：17:00-18:59
- 戌时：19:00-20:59
- 亥时：21:00-22:59

**日干起时法**（时干由日干推算）：
- 甲己日：甲子时起
- 乙庚日：丙子时起
- 丙辛日：戊子时起
- 丁壬日：庚子时起
- 戊癸日：壬子时起

## 运行测试

```bash
cd cloudfunctions/localCalculateBazi_v1_2
node test-bazi.js
```

## 注意事项

1. **不要修改核心文件**：`js-calendar-converter.cjs` 和 `solar-terms-compressed-original.js` 是第三方库文件，请勿修改
2. **日期范围**：公历日期支持范围为 1900-2100年
3. **节气范围**：节气数据支持范围为 1583-2135年
4. **时间精度**：时柱计算精确到小时，分钟仅用于节气修正判断

## 技术实现

### 计算流程

```
1. 调用 calendar.solar2lunar() 获取基础干支
   ↓
2. 查询立春时间，判断是否需要修正年柱
   ↓
3. 判断是否为节气日，如果是则检查时刻，可能修正月柱
   ↓
4. 根据日柱和时辰计算时柱
   ↓
5. 返回完整八字及详细信息
```

### 关键函数

- `calculateBazi(year, month, day, hour, minute)` - 主函数
- `checkMonthCorrection()` - 月柱修正检查
- `calculateHourGanZhi()` - 时柱计算
- `getPreviousMonth()` - 获取上个月日期
- `formatDateTime()` - 日期格式化

## 更新日志

### v1.2 (2025-10-16)
- 创建生辰八字计算器模块
- 实现年柱、月柱的节气修正
- 实现时柱计算
- 添加详细的测试用例和文档

