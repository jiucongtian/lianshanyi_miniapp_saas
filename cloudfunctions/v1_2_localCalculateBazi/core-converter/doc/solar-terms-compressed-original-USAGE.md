# 节气数据管理工具使用说明

## 概述

`solar-terms-compressed-original.js` 提供了完整的节气数据管理功能，包括：
- ✅ 读取节气时间并格式化
- ✅ 修改节气时间数据
- ✅ 从原始数据重新生成压缩数据

## 功能详解

### 1. 读取节气时间（已有功能）

#### 1.1 获取Date对象

```javascript
const solarTerms = require('./solar-terms-compressed-original');

// 使用节气索引（0-23）
const date1 = solarTerms.getSolarTermTime(2000, 0); // 2000年小寒

// 使用节气名称
const date2 = solarTerms.getSolarTermTime(2000, '立春');
```

#### 1.2 获取格式化字符串

```javascript
// 默认格式：'2000年1月6日 9时1分'
const str1 = solarTerms.getSolarTermTimeString(2000, 0);

// ISO格式：'2000-01-06T09:01:00'
const str2 = solarTerms.getSolarTermTimeString(2000, '立春', 'iso');

// 简短格式：'2000/01/06 09:01'
const str3 = solarTerms.getSolarTermTimeString(2000, '立春', 'short');

// 中文格式：'二〇〇〇年一月六日九时一分'
const str4 = solarTerms.getSolarTermTimeString(2000, '立春', 'chinese');
```

#### 1.3 获取某年所有节气

```javascript
const allTerms = solarTerms.getAllSolarTerms(2000);
// 返回数组，每个元素包含：
// {
//   index: 0,
//   name: '小寒',
//   date: Date对象,
//   string: '2000年1月6日 9时1分'
// }
```

---

### 2. 修改节气时间（新增功能）✨

#### 2.1 使用Date对象修改

```javascript
const success = solarTerms.updateSolarTermTime(
  2000,                           // 年份
  0,                              // 节气索引（0=小寒）
  new Date(2000, 0, 6, 10, 0)    // 新时间：2000年1月6日10时0分
);

if (success) {
  console.log('修改成功！');
}
```

#### 2.2 使用对象修改

```javascript
const success = solarTerms.updateSolarTermTime(
  2000,                           // 年份
  '立春',                         // 节气名称
  {
    year: 2000,
    month: 2,                     // 月份：1-12
    day: 4,
    hour: 21,
    minute: 0
  }
);
```

#### 2.3 修改后验证

```javascript
// 修改前
console.log('修改前:', solarTerms.getSolarTermTimeString(2000, 0));

// 执行修改
solarTerms.updateSolarTermTime(2000, 0, new Date(2000, 0, 6, 10, 0));

// 修改后
console.log('修改后:', solarTerms.getSolarTermTimeString(2000, 0));
```

---

### 3. 从原始数据重新生成（新增功能）✨

#### 3.1 从markdown文件重新生成

```javascript
const fs = require('fs');
const path = require('path');

// 读取原始数据文件
const originalDataPath = path.join(__dirname, 'original_24jieqi.md');
const originalData = fs.readFileSync(originalDataPath, 'utf-8');

// 重新生成压缩数据
const newCompressedData = solarTerms.regenerateFromOriginalData(originalData);

console.log(`成功生成 ${newCompressedData.length} 年的压缩数据`);
```

#### 3.2 导出为JavaScript文件

```javascript
// 生成完整的JavaScript代码
const jsCode = solarTerms.exportToJavaScript();

// 保存到文件
fs.writeFileSync('solar-terms-new.js', jsCode, 'utf-8');
```

#### 3.3 完整工作流程

```javascript
// 1. 读取原始数据
const originalData = fs.readFileSync('original_24jieqi.md', 'utf-8');

// 2. 重新生成压缩数据
const newCompressedData = solarTerms.regenerateFromOriginalData(originalData);

// 3. 手动更新模块内的数据（如果需要）
// 或者导出为新文件
const jsCode = solarTerms.exportToJavaScript();
fs.writeFileSync('solar-terms-regenerated.js', jsCode, 'utf-8');

console.log('✅ 数据重新生成完成！');
```

---

### 4. 辅助工具函数（新增）✨

#### 4.1 Date转分钟数

```javascript
const date = new Date(2000, 0, 6, 9, 1); // 2000年1月6日9时1分
const minutes = solarTerms.dateToMinutesFromYearStart(date);
console.log(`总分钟数: ${minutes}`); // 7377
```

#### 4.2 分钟数转十六进制

```javascript
const hex = solarTerms.minutesToHex(7377);
console.log(`十六进制: ${hex}`); // '01cd1'
```

---

## 完整使用示例

### 场景1：批量查询节气

```javascript
// 查看立春在多年的时间
for (let year = 2020; year <= 2025; year++) {
  const time = solarTerms.getSolarTermTimeString(year, '立春', 'short');
  console.log(`${year}: ${time}`);
}
```

### 场景2：修正错误的节气时间

```javascript
// 假设发现2000年立春时间有误，需要修正
const year = 2000;
const correctTime = { 
  year: 2000, 
  month: 2, 
  day: 4, 
  hour: 20, 
  minute: 32 
};

// 修正
const success = solarTerms.updateSolarTermTime(year, '立春', correctTime);

if (success) {
  // 导出修正后的数据
  const newCode = solarTerms.exportToJavaScript();
  fs.writeFileSync('solar-terms-corrected.js', newCode, 'utf-8');
  console.log('✅ 已修正并导出新文件');
}
```

### 场景3：从天文台数据更新

```javascript
// 假设从天文台获得了新的节气数据（markdown格式）
const newAstronomyData = fs.readFileSync('astronomy-2024.md', 'utf-8');

// 重新生成
const updated = solarTerms.regenerateFromOriginalData(newAstronomyData);

// 导出
fs.writeFileSync(
  'solar-terms-updated.js',
  solarTerms.exportToJavaScript(),
  'utf-8'
);

console.log('✅ 已根据最新天文数据更新');
```

---

## API参考

### 读取方法

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `getSolarTermTime(year, solarTerm)` | year: number<br>solarTerm: number\|string | Date\|null | 获取节气Date对象 |
| `getSolarTermTimeString(year, solarTerm, format)` | year: number<br>solarTerm: number\|string<br>format?: string | string\|null | 获取格式化字符串 |
| `getAllSolarTerms(year)` | year: number | Array\|null | 获取某年所有节气 |
| `getSolarTermName(index)` | index: number | string | 获取节气名称 |

### 修改方法（新增）

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `updateSolarTermTime(year, solarTerm, newTime)` | year: number<br>solarTerm: number\|string<br>newTime: Date\|Object | boolean | 修改节气时间 |
| `regenerateFromOriginalData(originalData)` | originalData: string | Array\<string\> | 从原始数据重新生成 |
| `exportToJavaScript()` | - | string | 导出为JavaScript代码 |

### 工具方法（新增）

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `dateToMinutesFromYearStart(date)` | date: Date | number | Date转分钟数 |
| `minutesToHex(minutes)` | minutes: number | string | 分钟数转十六进制 |

---

## 数据格式说明

### 压缩数据格式

每年的24个节气压缩为一个120字符的字符串（24 × 5 = 120）：

```
'01cd106fb30c2db1167e16ab31bf9e215442...' // 1583年
```

- 每5位十六进制 = 一个节气
- 十六进制值 = 从年初开始的总分钟数
- 例：`01cd1` = 7377分钟 = 1月6日2时57分

### 原始数据格式（original_24jieqi.md）

```
小寒	大寒	立春	...（24个节气名称，tab分隔）
1583/01/06T02:57	1583/01/20T20:35	...（1583年24个节气时间）
1584/01/06T08:54	1584/01/21T02:25	...（1584年24个节气时间）
...
```

---

## 注意事项

⚠️ **重要提示**：

1. **年份范围**：仅支持 1583-2135 年
2. **节气索引**：0-23（0=小寒，2=立春，23=冬至）
3. **月份值**：使用对象时，month为1-12（不是0-11）
4. **数据持久化**：`updateSolarTermTime` 修改内存中的数据，需调用 `exportToJavaScript()` 并保存文件才能持久化
5. **原始数据格式**：必须是tab分隔的文本，时间格式为 `YYYY/MM/DDTHH:MM`

---

## 运行示例

```bash
# 在core-converter目录下
cd cloudfunctions/v1_2_localCalculateBazi/core-converter

# 运行示例
node usage-example.js
```

---

## 常见问题

### Q1: 修改后的数据会自动保存吗？

A: 不会。`updateSolarTermTime` 只修改内存中的数据。如需保存，需要：

```javascript
// 修改后导出
const jsCode = solarTerms.exportToJavaScript();
fs.writeFileSync('solar-terms-compressed-original.js', jsCode, 'utf-8');
```

### Q2: 如何批量修改多个节气？

A: 循环调用 `updateSolarTermTime`：

```javascript
const updates = [
  { year: 2000, term: '立春', time: {...} },
  { year: 2000, term: '雨水', time: {...} }
];

updates.forEach(item => {
  solarTerms.updateSolarTermTime(item.year, item.term, item.time);
});
```

### Q3: 原始数据文件编码问题？

A: 确保 `original_24jieqi.md` 使用 UTF-8 编码，tab分隔符为真实tab字符（不是空格）。

---

## 许可

本工具遵循项目整体许可协议。

