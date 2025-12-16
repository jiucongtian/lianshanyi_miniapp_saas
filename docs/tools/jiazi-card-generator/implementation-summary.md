# 六十甲子卡牌数据生成器 - 实现方案总结

## 方案概述

采用**分层查表生成器**方案，将数据生成分为四个层次：

1. **基础数据层**（查表）：天干地支、五行、生肖
2. **组合计算层**（规则+查表）：季节标记、卦象、爻位、五行关系
3. **业务数据层**（查表）：天赋标记、路径标记
4. **文本生成层**（模板+查表数据）：blessing、tip、central描述（待实现）

## 实现状态

### ✅ 已完成

1. **基础数据查表模块** (`base-data.js`)
   - 天干地支数组和映射
   - 五行属性映射
   - 生肖对应关系
   - 编号映射

2. **业务数据查表模块** (`business-data.js`)
   - 天赋标记映射（10个天干对应10种天赋）
   - 能力标记映射（60个干支对应爻位1-6）
   - 路径标记计算（根据天干计算）

3. **组合计算模块** (`calculated-data.js`)
   - 季节标记计算（根据天干地支五行属性）
   - 五行关系计算（相生、相克等）
   - 卦象查询（部分映射，待完善）
   - 爻位信息查询

4. **主生成器** (`generator.js`)
   - 单个卡牌生成
   - 批量生成所有60个卡牌
   - 从现有数据提取自定义数据
   - 支持自定义文本内容

5. **使用示例和文档**
   - 示例代码 (`example.js`)
   - 使用文档 (`README.md`)

### ⏳ 待完善

1. **卦象映射表**：目前只有部分干支的卦象，需要补充完整
2. **文本生成模板**：`central`、`blessing`、`tip` 目前需要手动提供，可以开发模板系统
3. **数据验证**：添加生成数据的验证功能

## 可自动生成的数据字段

以下字段可以通过查表或计算自动生成：

| 字段 | 生成方式 | 状态 |
|------|---------|------|
| `cardName` | 天干+地支组合 | ✅ |
| `cardNumber` | 查表（1-60） | ✅ |
| `seasonMark` | 计算（天干地支五行组合） | ✅ |
| `talentMark` | 查表（天干对应） | ✅ |
| `abilityMark` | 查表（干支对应爻位） | ✅ |
| `pathMark` | 计算（根据天干） | ✅ |

### 需要提供或使用模板生成

| 字段 | 生成方式 | 状态 |
|------|---------|------|
| `password` | 需要提供或模板生成 | ⏳ |
| `central` | 需要提供或模板生成 | ⏳ |
| `blessing` | 需要提供或模板生成 | ⏳ |
| `tip` | 需要提供或模板生成 | ⏳ |

## 数据映射关系

### 天赋标记（talentMark）

10个天干循环对应10种天赋：

```
甲 → 领导力
乙 → 承载力
丙 → 号召力
丁 → 演说力
戊 → 学习力
己 → 战斗力
庚 → 变通力
辛 → 执行力
壬 → 拼搏力
癸 → 总结力
```

### 季节标记（seasonMark）

根据五行属性计算：

```
木 → 春
火 → 夏
土 → 长夏（显示为"夏"）
金 → 秋
水 → 冬
```

组合规则：
- 相同五行：显示为"春春"、"夏夏"等
- 不同五行：组合显示如"春冬"、"夏春"等

### 能力标记（abilityMark）

60个干支对应1-6的爻位，已建立完整映射表。

### 路径标记（pathMark）

根据天干计算：
- `生与仁`：甲、癸
- `光与热`：乙、丙、戊
- `精与义`：丁、己、庚
- `智与动`：辛、壬

## 使用示例

### 基本使用

```javascript
const { generateCardData } = require('./generator');

// 生成单个卡牌
const card = generateCardData('甲子', {
  generateId: true
});
```

### 从现有数据提取并重新生成

```javascript
const fs = require('fs');
const { generateAllCards, extractCustomData } = require('./generator');

// 读取现有数据
const existingData = JSON.parse(fs.readFileSync('六十甲子卡牌完整数据.json', 'utf8'));

// 提取自定义数据
const customData = extractCustomData(existingData);

// 重新生成（保留原有文本内容）
const cards = generateAllCards({
  customData: customData,
  generateId: false
});
```

## 测试结果

已测试生成器功能，验证通过：

```
✓ cardName: 甲子
✓ cardNumber: 1
✓ talentMark: 领导力
✓ abilityMark: 1
✓ seasonMark: 春冬
✓ pathMark: 生与仁
```

## 文件结构

```
docs/tools/jiazi-card-generator/
├── base-data.js              # 基础数据查表模块
├── business-data.js          # 业务数据查表模块
├── calculated-data.js        # 组合计算模块
├── generator.js              # 主生成器
├── example.js                # 使用示例
├── README.md                 # 使用文档
└── implementation-summary.md # 本文档
```

## 后续优化建议

1. **完善卦象映射表**：补充所有60个干支的卦象信息
2. **开发文本生成模板**：为 `central`、`blessing`、`tip` 开发模板系统
3. **添加数据验证**：验证生成数据的完整性和正确性
4. **支持增量更新**：只更新变化的字段，保留未变化的数据
5. **添加单元测试**：为各个模块添加单元测试

## 总结

通过分层查表生成器方案，成功实现了六十甲子卡牌数据的自动生成。目前可以自动生成大部分字段，文本字段（`central`、`blessing`、`tip`）需要手动提供或后续开发模板系统。

该方案的优势：
- ✅ 数据可维护性强（查表数据集中管理）
- ✅ 易于扩展（添加新的映射表或计算规则）
- ✅ 支持从现有数据提取并重新生成
- ✅ 代码结构清晰，模块化设计

