# CardController 使用文档

## 概述

CardController 是卡牌页面的控制器，负责处理卡牌页面相关的业务逻辑，包括档案数据加载、八字显示、卡牌翻转、图片预览等。

## 功能特性

- ✅ 档案数据自动加载
- ✅ 八字图片缓存管理
- ✅ 卡牌翻转动画
- ✅ 图片预览功能
- ✅ 时间详情显示
- ✅ 设备尺寸适配
- ✅ 事件总线集成
- ✅ 错误状态处理

## 使用方法

### 1. 基本使用

```javascript
const { CardController } = require('../../controllers/CardController');

Page({
  data: {
    // 页面数据
  },
  
  onLoad(options) {
    this.controller = new CardController(this);
    this.controller.initialize(options);
  },
  
  // 事件处理方法
  onCardTap(e) {
    const pillar = e.currentTarget.dataset.pillar;
    this.controller.flipCard(pillar);
  },
  
  onImageTap(e) {
    const pillar = e.currentTarget.dataset.pillar;
    this.controller.previewCard(pillar);
  },
  
  onClosePreview() {
    this.controller.closeImagePreview();
  }
});
```

## 主要方法

### 初始化方法

#### `initialize(options)`
初始化页面，设置设备尺寸、动画等。

**参数：**
- `options` (Object): 页面参数
  - `datetime` (string): 时间戳（可选）
  - `hasCozeData` (string): 是否有Coze数据（可选）

**示例：**
```javascript
await this.controller.initialize({ 
  datetime: '1694678400000',
  hasCozeData: 'true'
});
```

### 数据加载方法

#### `loadProfileData(profileData)`
从档案数据加载卡牌显示。

**参数：**
- `profileData` (Object|ProfileBean): 档案数据

**示例：**
```javascript
const profileData = profileManager.getCurrentProfile();
this.controller.loadProfileData(profileData);
```

#### `updateBaziDisplay(baziData)`
更新八字显示数据。

**参数：**
- `baziData` (Object): 八字数据
  - `yearPillar` (Object): 年柱数据
  - `monthPillar` (Object): 月柱数据
  - `dayPillar` (Object): 日柱数据
  - `timePillar` (Object): 时柱数据
  - `originalTime` (string): 原始时间
  - `lunarTime` (string): 农历时间

**示例：**
```javascript
const baziData = {
  yearPillar: { heavenlyStem: '甲', earthlyBranch: '子' },
  monthPillar: { heavenlyStem: '乙', earthlyBranch: '丑' },
  dayPillar: { heavenlyStem: '丙', earthlyBranch: '寅' },
  timePillar: { heavenlyStem: '丁', earthlyBranch: '卯' },
  originalTime: '1990年5月15日 14:30',
  lunarTime: '1990年四月廿一'
};
this.controller.updateBaziDisplay(baziData);
```

### 卡牌操作方法

#### `flipCard(pillar)`
翻转指定卡牌。

**参数：**
- `pillar` (string): 柱子名称（'year'/'month'/'day'/'time'）

**示例：**
```javascript
this.controller.flipCard('year'); // 翻转年柱卡牌
```

#### `previewCard(pillar)`
预览指定卡牌（放大显示）。

**参数：**
- `pillar` (string): 柱子名称（'year'/'month'/'day'/'time'）

**示例：**
```javascript
this.controller.previewCard('day'); // 预览日柱卡牌
```

#### `closeImagePreview()`
关闭图片预览。

**示例：**
```javascript
this.controller.closeImagePreview();
```

### 时间显示方法

#### `showTimeDetail()`
显示时间详情弹窗。

**示例：**
```javascript
this.controller.showTimeDetail();
```

#### `closeTimePopup()`
关闭时间详情弹窗。

**示例：**
```javascript
this.controller.closeTimePopup();
```

## 数据属性

### 页面状态
- `isDataLoaded`: 数据是否已加载
- `isLoading`: 是否正在加载
- `isLoadingImages`: 图片是否正在加载
- `currentProfileName`: 当前档案名称
- `isUncertainTime`: 是否不确定时辰

### 卡牌状态
- `yearCardFlipped`: 年柱卡牌是否翻转
- `monthCardFlipped`: 月柱卡牌是否翻转
- `dayCardFlipped`: 日柱卡牌是否翻转
- `timeCardFlipped`: 时柱卡牌是否翻转

### 八字数据
- `yearPillar`: 年柱数据
- `monthPillar`: 月柱数据
- `dayPillar`: 日柱数据
- `timePillar`: 时柱数据

### 时间显示
- `originalTime`: 原始时间
- `lunarTime`: 农历时间

### 图片预览
- `showImagePreview`: 是否显示图片预览
- `previewImagePath`: 预览图片路径
- `previewCardDescription`: 预览卡牌描述

## 事件处理

### ProfileManager事件
- `PROFILE_MANAGER_READY`: ProfileManager初始化完成
- `PROFILE_SELECTED`: 档案选中事件

### 页面生命周期
- `onShow()`: 页面显示时的处理
- `onHide()`: 页面隐藏时的处理
- `onUnload()`: 页面卸载时的清理

## 图片缓存

控制器集成了图片缓存管理功能：

1. **优先使用本地缓存**：提高加载速度
2. **自动下载云存储图片**：首次访问时下载
3. **缓存失效处理**：缓存失败时使用云存储路径
4. **内存管理**：自动清理过期缓存

## 卡牌翻转规则

1. **只能从背面翻到正面**：防止用户误操作
2. **日柱默认显示正面**：突出重要信息
3. **其他柱子默认显示背面**：增加神秘感
4. **翻转后不可逆**：保持卡牌状态

## 设备适配

控制器自动适配不同设备尺寸：

- **小屏设备** (< 375px): 紧凑布局
- **中屏设备** (375-414px): 标准布局
- **大屏设备** (> 414px): 宽松布局

## 错误处理

控制器内置了完整的错误处理机制：

1. **数据加载失败**：显示无数据状态
2. **图片加载失败**：使用云存储路径
3. **缓存操作失败**：降级到直接访问
4. **网络异常**：显示友好提示

## 注意事项

1. **ProfileManager依赖**：需要等待ProfileManager初始化完成
2. **图片缓存**：首次加载可能需要时间
3. **卡牌翻转**：只能从背面翻到正面
4. **设备适配**：自动适配不同屏幕尺寸
5. **事件监听**：页面卸载时会自动清理

## 示例页面集成

```javascript
// pages/card/index.js
const { CardController } = require('../../controllers/CardController');

Page({
  data: {
    deviceSize: 'medium',
    isDataLoaded: false,
    isLoading: true,
    currentProfileName: '生命智慧卡牌',
    yearCardFlipped: false,
    monthCardFlipped: false,
    dayCardFlipped: false,
    timeCardFlipped: false,
    yearPillar: { heavenlyStem: '', earthlyBranch: '', imagePath: '', baziImagePath: '' },
    monthPillar: { heavenlyStem: '', earthlyBranch: '', imagePath: '', baziImagePath: '' },
    dayPillar: { heavenlyStem: '', earthlyBranch: '', imagePath: '', baziImagePath: '' },
    timePillar: { heavenlyStem: '', earthlyBranch: '', imagePath: '', baziImagePath: '' },
    originalTime: '',
    lunarTime: '',
    showImagePreview: false,
    previewImagePath: '',
    previewCardDescription: null
  },

  onLoad(options) {
    this.controller = new CardController(this);
    this.controller.initialize(options);
  },

  onCardTap(e) {
    const pillar = e.currentTarget.dataset.pillar;
    this.controller.flipCard(pillar);
  },

  onImageTap(e) {
    const pillar = e.currentTarget.dataset.pillar;
    this.controller.previewCard(pillar);
  },

  onClosePreview() {
    this.controller.closeImagePreview();
  },

  onShowTimeDetail() {
    this.controller.showTimeDetail();
  },

  onCloseTimePopup() {
    this.controller.closeTimePopup();
  }
});
```
