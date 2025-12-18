# 六十甲子卡牌数据生成器

## 概述

这是一个用于生成六十甲子卡牌数据的工具。采用分层查表生成器方案，将数据生成分为：

1. **基础数据层**（查表）：天干地支、五行、生肖
2. **组合计算层**（规则+查表）：季节标记、爻位、五行关系
3. **业务数据层**（查表）：天赋标记、路径标记
4. **文本生成层**（模板+查表数据）：blessing、tip、central描述

## 目录结构

```
jiazi-card-generator/
├── base-data.js          # 基础数据查表模块
├── business-data.js      # 业务数据查表模块
├── calculated-data.js    # 组合计算模块
├── generator.js          # 主生成器
├── example.js            # 使用示例
└── README.md             # 本文档
```

## 模块说明

### 1. base-data.js - 基础数据查表模块

提供天干地支的基础数据查询：

- **天干地支数组**：GAN, ZHI, ANIMALS
- **五行映射**：GAN_WUXING, ZHI_WUXING
- **编号映射**：CARD_NAME_TO_NUMBER

**主要函数**：
- `getGanWuxing(gan)` - 获取天干五行
- `getZhiWuxing(zhi)` - 获取地支五行
- `getAnimal(zhi)` - 获取生肖
- `getCardNumber(ganZhi)` - 获取编号
- `getGanZhiByNumber(cardNumber)` - 根据编号获取干支

### 2. business-data.js - 业务数据查表模块

提供业务相关的数据查询：

- **天赋标记**：TALENT_MARK_MAP（10个天干对应10种天赋）
- **能力标记**：ABILITY_MARK_MAP（60个干支对应爻位1-6）
- **路径标记**：根据天干计算（GAN_PATH_MARK_MAP）

**主要函数**：
- `getTalentMark(gan)` - 获取天赋标记
- `getAbilityMark(ganZhi)` - 获取能力标记（爻位）
- `getPathMark(ganZhi)` - 获取路径标记（根据天干计算）

### 3. calculated-data.js - 组合计算模块

根据规则计算组合数据：

- **季节标记计算**：根据天干地支的五行属性组合
- **爻位信息**：YAO_POSITION_MAP（爻位描述）
- **五行关系计算**：相生、相克、相同等

**主要函数**：
- `calculateSeasonMark(gan, zhi)` - 计算季节标记
- `getYaoInfo(abilityMark)` - 获取爻位信息
- `calculateWuxingRelation(wuxing1, wuxing2)` - 计算五行关系

### 4. generator.js - 主生成器

整合所有模块，生成完整的卡牌数据：

**主要函数**：
- `generateCardData(ganZhi, options)` - 生成单个卡牌数据
- `generateAllCards(options)` - 生成所有60个卡牌数据
- `extractCustomData(existingData)` - 从现有数据中提取自定义数据
- `generatePassword(ganZhi, context)` - 生成密码/关键词（逻辑待实现）

## 使用方法

### 基本使用

```javascript
const { generateCardData, generateAllCards } = require('./generator');

// 生成单个卡牌
const card = generateCardData('甲子', {
  generateId: true
});

// 生成所有卡牌
const allCards = generateAllCards({
  generateId: true
});
```

### 从现有数据提取并重新生成

```javascript
const fs = require('fs');
const { generateAllCards, extractCustomData } = require('./generator');

// 读取现有数据
const existingData = JSON.parse(fs.readFileSync('六十甲子卡牌完整数据.json', 'utf8'));

// 提取自定义数据（central、blessing、tip等）
const customData = extractCustomData(existingData);

// 重新生成所有卡牌（保留原有的文本内容）
const generatedCards = generateAllCards({
  customData: customData,
  generateId: false  // 保留原有的_id
});

// 保存结果
fs.writeFileSync('generated-cards.json', JSON.stringify(generatedCards, null, 2));
```

### 只生成可查表/计算的部分

```javascript
const { generateAllCards } = require('./generator');

// 只生成可查表和计算的数据，文本字段为空
const cards = generateAllCards({
  generateId: true
});

// 后续可以手动填充或使用模板生成 central、blessing、tip
```

## 可生成的数据字段

### 自动生成（查表/计算）

- ✅ `cardName` - 干支名称
- ✅ `cardNumber` - 编号（1-60）
- ✅ `seasonMark` - 季节标记（根据五行计算）
- ✅ `talentMark` - 天赋标记（根据天干查表）
- ✅ `abilityMark` - 能力标记/爻位（查表）
- ✅ `pathMark` - 路径标记（根据天干计算）

### 需要提供或使用模板生成

- ⚠️ `password` - 密码/关键词（需要提供或使用模板生成）
- ⚠️ `central` - 中心描述（需要提供或使用模板）
- ⚠️ `blessing` - 祝福语（需要提供或使用模板）
- ⚠️ `tip` - 提示语（需要提供或使用模板）

## 数据映射关系

### 天赋标记（talentMark）

10个天干对应10种天赋，每10个干支循环一次：

- 甲 → 领导力
- 乙 → 承载力
- 丙 → 号召力
- 丁 → 演说力
- 戊 → 学习力
- 己 → 战斗力
- 庚 → 变通力
- 辛 → 执行力
- 壬 → 拼搏力
- 癸 → 总结力

### 季节标记（seasonMark）

根据天干和地支的五行属性组合：

- 木 → 春
- 火 → 夏
- 土 → 长夏（显示为"夏"）
- 金 → 秋
- 水 → 冬

如果天干和地支五行相同，显示为"春春"、"夏夏"等；如果不同，组合显示如"春冬"、"夏春"等。

### 能力标记（abilityMark）

60个干支对应1-6的爻位，已建立完整映射表。

### 路径标记（pathMark）

根据天干计算：
- `生与仁`：甲、癸
- `光与热`：乙、丙、戊
- `精与义`：丁、己、庚
- `智与动`：辛、壬

## 扩展说明

### 添加新的查表数据

1. 在对应的模块文件中添加映射表
2. 添加查询函数
3. 在 `generator.js` 中调用新函数

### 添加新的计算规则

1. 在 `calculated-data.js` 中添加计算函数
2. 在 `generator.js` 中调用新函数

### 文本生成模板

目前 `central`、`blessing`、`tip` 需要手动提供或使用模板生成。可以：

1. 创建文本生成模板模块
2. 使用查表数据填充模板
3. 在 `generator.js` 中集成

## 运行示例

```bash
# 在 docs/tools/jiazi-card-generator 目录下
node example.js
```

## 注意事项

1. **数据完整性**：确保所有映射表完整
2. **文本生成**：`central`、`blessing`、`tip` 目前需要手动提供，后续可以开发模板系统
3. **数据验证**：生成的数据应该与原始数据对比验证，确保查表和计算的准确性

## 后续优化方向

1. ✅ 完善所有映射表
2. ⏳ 开发文本生成模板系统
3. ⏳ 添加数据验证功能
4. ⏳ 支持增量更新（只更新变化的字段）
5. ⏳ 添加单元测试

