# js-calendar-converter 农历公历转换库 API 文档

## 概述

`js-calendar-converter` 是一个用于公历和农历相互转换的 JavaScript 库，支持 1900-3000 年区间的日期转换，包含天干地支、生肖、节气、节日等传统历法信息。

## 版本信息

- 版本：1.0.3
- 作者：Jea杨(JJonline@JJonline.Cn)
- 更新时间：2017-7-24
- 支持年份范围：1900-3000

## 主要功能

1. 公历转农历
2. 农历转公历
3. 天干地支计算
4. 生肖计算
5. 24节气查询
6. 节日查询
7. 星座计算

## 数据表属性

### 基础数据表

| 属性名 | 类型 | 描述 | 示例值 |
|--------|------|------|--------|
| `lunarInfo` | Array | 农历1900-3000的闰大小信息表 | `[0x04bd8, 0x04ae0, ...]` |
| `solarMonth` | Array | 公历每个月份的天数普通表 | `[31, 28, 31, 30, ...]` |
| `Gan` | Array | 天干速查表 | `["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"]` |
| `Zhi` | Array | 地支速查表 | `["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"]` |
| `Animals` | Array | 生肖速查表 | `["鼠","牛","虎","兔","龙","蛇","马","羊","猴","鸡","狗","猪"]` |
| `solarTerm` | Array | 24节气速查表 | `["小寒","大寒","立春","雨水",...]` |
| `sTermInfo` | Array | 1900-3000各年的24节气日期速查表 | `['9778397bd097c36b0b6fc9274c91aa',...]` |

### 节日数据表

| 属性名 | 类型 | 描述 |
|--------|------|------|
| `festival` | Object | 阳历节日配置 |
| `lFestival` | Object | 农历节日配置 |

## 核心方法

### 1. solar2lunar(y, m, d)

**功能**：公历转农历

**参数**：
- `y` (Number): 公历年份 (1900-3000)
- `m` (Number): 公历月份 (1-12)
- `d` (Number): 公历日期 (1-31)

**返回值**：Object

```javascript
{
  date: "1987-11-1",           // 公历日期
  lunarDate: "1987-9-10",      // 农历日期
  festival: "万圣节",           // 阳历节日
  lunarFestival: "重阳节",      // 农历节日
  lYear: 1987,                 // 农历年
  lMonth: 9,                   // 农历月
  lDay: 10,                    // 农历日
  Animal: "兔",                // 生肖
  IMonthCn: "九月",            // 农历月份中文
  IDayCn: "初十",              // 农历日期中文
  cYear: 1987,                 // 公历年
  cMonth: 11,                  // 公历月
  cDay: 1,                     // 公历日
  gzYear: "丁卯",              // 年柱
  gzMonth: "辛亥",             // 月柱
  gzDay: "甲子",               // 日柱
  isToday: false,              // 是否今天
  isLeap: false,               // 是否闰月
  nWeek: 7,                    // 星期几(数字)
  ncWeek: "星期日",            // 星期几(中文)
  isTerm: false,               // 是否节气
  Term: null,                  // 节气名称
  astro: "天蝎座"              // 星座
}
```

**示例**：
```javascript
const calendar = require('./js-calendar-converter.cjs');
const result = calendar.solar2lunar(1987, 11, 1);
console.log(result);
```

### 2. lunar2solar(y, m, d, isLeapMonth)

**功能**：农历转公历

**参数**：
- `y` (Number): 农历年份 (1900-3000)
- `m` (Number): 农历月份 (1-12)
- `d` (Number): 农历日期 (1-30)
- `isLeapMonth` (Boolean): 是否闰月，默认 false

**返回值**：Object (同 solar2lunar 返回值)

**示例**：
```javascript
const result = calendar.lunar2solar(1987, 9, 10);
console.log(result);
```

### 3. toGanZhiYear(lYear)

**功能**：农历年份转换为干支纪年

**参数**：
- `lYear` (Number): 农历年份

**返回值**：String - 干支纪年

**示例**：
```javascript
const gzYear = calendar.toGanZhiYear(1987); // "丁卯"
```

### 4. toGanZhi(offset)

**功能**：传入偏移量返回干支

**参数**：
- `offset` (Number): 相对甲子的偏移量

**返回值**：String - 干支

**示例**：
```javascript
const gz = calendar.toGanZhi(24); // "戊子"
```

### 5. getTerm(y, n)

**功能**：获取指定年份的第n个节气的公历日期

**参数**：
- `y` (Number): 公历年份 (1900-3000)
- `n` (Number): 二十四节气中的第几个节气 (1-24)

**返回值**：Number - 节气日期

**示例**：
```javascript
const termDate = calendar.getTerm(1987, 3); // 4 (表示1987年2月4日立春)
```

### 6. toAstro(cMonth, cDay)

**功能**：根据公历月日判断所属星座

**参数**：
- `cMonth` (Number): 公历月份 (1-12)
- `cDay` (Number): 公历日期 (1-31)

**返回值**：String - 星座名称

**示例**：
```javascript
const astro = calendar.toAstro(11, 1); // "天蝎座"
```

### 7. getAnimal(y)

**功能**：年份转生肖

**参数**：
- `y` (Number): 年份

**返回值**：String - 生肖

**示例**：
```javascript
const animal = calendar.getAnimal(1987); // "兔"
```

## 工具方法

### 1. lYearDays(y)

**功能**：返回农历y年一整年的总天数

**参数**：
- `y` (Number): 农历年份

**返回值**：Number - 总天数

### 2. leapMonth(y)

**功能**：返回农历y年闰月是哪个月

**参数**：
- `y` (Number): 农历年份

**返回值**：Number - 闰月月份 (0-12，0表示无闰月)

### 3. leapDays(y)

**功能**：返回农历y年闰月的天数

**参数**：
- `y` (Number): 农历年份

**返回值**：Number - 闰月天数 (0、29、30)

### 4. monthDays(y, m)

**功能**：返回农历y年m月（非闰月）的总天数

**参数**：
- `y` (Number): 农历年份
- `m` (Number): 农历月份

**返回值**：Number - 月份天数 (-1、29、30)

### 5. solarDays(y, m)

**功能**：返回公历y年m月的天数

**参数**：
- `y` (Number): 公历年份
- `m` (Number): 公历月份

**返回值**：Number - 月份天数 (-1、28、29、30、31)

## 格式化方法

### 1. toChinaMonth(m)

**功能**：传入农历数字月份返回汉语表示法

**参数**：
- `m` (Number): 农历月份

**返回值**：String - 中文月份

**示例**：
```javascript
const month = calendar.toChinaMonth(12); // "腊月"
```

### 2. toChinaDay(d)

**功能**：传入农历日期数字返回汉字表示法

**参数**：
- `d` (Number): 农历日期

**返回值**：String - 中文日期

**示例**：
```javascript
const day = calendar.toChinaDay(21); // "廿一"
```

## 节日管理方法

### 1. getFestival()

**功能**：返回默认定义的阳历节日

**返回值**：Object - 阳历节日配置

### 2. getLunarFestival()

**功能**：返回默认定义的农历节日

**返回值**：Object - 农历节日配置

### 3. setFestival(param)

**功能**：设置阳历节日

**参数**：
- `param` (Object): 阳历节日配置对象

### 4. setLunarFestival(param)

**功能**：设置农历节日

**参数**：
- `param` (Object): 农历节日配置对象

## 错误处理

- 年份超出 1900-3000 范围时返回 -1
- 日期参数错误时返回 -1
- 农历转公历时，如果传入的闰月参数与实际闰月不符，返回 -1

## 使用示例

```javascript
const calendar = require('./js-calendar-converter.cjs');

// 公历转农历
const solarResult = calendar.solar2lunar(1987, 11, 1);
console.log('公历1987年11月1日对应的农历：', solarResult.lunarDate);
console.log('年柱：', solarResult.gzYear);
console.log('月柱：', solarResult.gzMonth);
console.log('日柱：', solarResult.gzDay);
console.log('生肖：', solarResult.Animal);

// 农历转公历
const lunarResult = calendar.lunar2solar(1987, 9, 10);
console.log('农历1987年9月10日对应的公历：', lunarResult.date);

// 获取节气
const termDate = calendar.getTerm(1987, 3); // 立春
console.log('1987年立春是2月', termDate, '日');

// 获取星座
const astro = calendar.toAstro(11, 1);
console.log('11月1日的星座：', astro);
```

## 注意事项

1. 所有年份参数必须在 1900-3000 范围内
2. 公历转农历时，1900年1月31日之前不支持
3. 农历转公历时，3000年12月1日之后不支持
4. 生肖计算基于农历年份，精确划分以立春为界
5. 干支计算基于传统历法规则
6. 节气计算基于公历年份
