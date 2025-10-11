# 卡牌组件重构实施方案

**创建日期**：2025-10-11  
**预计耗时**：10.5小时（3个工作日）  
**目标**：将卡牌页面重构为组件化架构，代码量减少40%+

---

## 重构目标

✅ 显示效果100%一致  
✅ 图片缓存和动画在组件内实现  
✅ Controller代码量减少40%+  
✅ 提高代码复用性和可维护性  

---

## 实施任务清单（渐进式重构）

### 阶段一：组件基础结构（30分钟）✅ 已完成

- [x] **Task 1.1** - 创建组件目录 `miniprogram/components/bazi-card/`
- [x] **Task 1.2** - 创建 `index.json` 文件，配置 `component: true`
- [x] **Task 1.3** - 创建 `index.wxml` 空模板文件
- [x] **Task 1.4** - 创建 `index.js` 文件，定义Component结构
- [x] **Task 1.5** - 创建 `index.less` 空样式文件
- [x] **Task 1.6** - 创建 `README.md` 组件文档

**验收标准：**
- ✅ 组件目录和文件创建完成
- ✅ 组件可以被引入（不会报错）

**完成时间：** 2025-10-11

---

### 阶段二：照搬现有UI代码（1小时）⭐️ 关键 ✅ 已完成

- [x] **Task 2.1** - 从 `pages/card/index.wxml` 复制单张卡牌的完整WXML结构
  - 包括：`.pillar-item` 容器 ✅
  - 包括：`.pillar-title` 标题 ✅
  - 包括：`.image-container` 图片容器 ✅
  - 包括：`<image>` 标签及所有属性 ✅
  - 包括：`.card-loading-overlay` 加载状态 ✅
  - 包括：`.uncertain-time-indicator` 不确定时辰标识 ✅
  
- [x] **Task 2.2** - 从 `pages/card/index.less` 复制所有卡牌相关样式
  - 复制：`.pillar-item` 及相关样式 ✅
  - 复制：`.image-container`、`.pillar-image` 样式 ✅
  - 复制：`.card-loading-overlay` 及 `.loading-spinner` 样式 ✅
  - 复制：`.uncertain-time-indicator` 及动画样式 ✅
  - 复制：所有 `@keyframes` 动画定义（spin、pulse、pulse-glow）✅
  
- [x] **Task 2.3** - 在组件 `index.js` 中定义所有需要的属性
  - 定义：`title`（卡牌标题）✅
  - 定义：`pillarName`（柱子名称）✅
  - 定义：`imagePath`（当前显示的图片路径）✅
  - 定义：`loading`（是否正在加载）✅
  - 定义：`showUncertainIndicator`（是否显示不确定标识）✅
  - 定义：`animation`（动画对象）✅
  
- [x] **Task 2.4** - 确保组件WXML中的数据绑定使用properties ✅

**验收标准：**
- ✅ 组件WXML结构与页面中的单张卡牌完全一致
- ✅ 组件样式与页面样式完全一致
- ✅ 组件可以独立编译通过

**完成时间：** 2025-10-11

---

### 阶段三：页面集成与显示验证（1小时）⭐️ 重要验证点 ✅ 已完成

- [x] **Task 3.1** - 修改 `pages/card/index.json`，添加组件引用 ✅
  ```json
  "usingComponents": {
    "bazi-card": "/components/bazi-card/index"
  }
  ```

- [x] **Task 3.2** - 修改 `pages/card/index.wxml`，替换年柱卡牌为组件 ✅
  - 替换年柱的 `.pillar-item` 为 `<bazi-card>` 组件标签 ✅
  - 传递所有需要的属性（title、pillarName、imagePath等）✅
  - 修改页面JS，兼容组件事件和原生事件 ✅
  
- [x] **Task 3.3** - 运行小程序，验证年柱卡牌显示效果 ✅
  
- [x] **Task 3.4** - 替换月柱、日柱、时柱为组件 ✅
  - 替换月柱为 `<bazi-card>` 组件 ✅
  - 替换日柱为 `<bazi-card>` 组件 ✅
  - 替换时柱为 `<bazi-card>` 组件（含不确定标识）✅
  
- [x] **Task 3.5** - 运行小程序，全面对比显示效果 ✅
  - 对比：4张卡牌的位置、大小、间距 ✅
  - 对比：卡牌图片显示 ✅
  - 对比：加载状态显示 ✅
  - 对比：不确定标识显示（时柱）✅
  - 对比：样式细节（圆角、阴影、动画）✅

**验收标准（必须全部通过）：**
- ✅ 页面可以正常显示4张卡牌组件
- ✅ 4张卡牌的位置、大小、间距与重构前完全一致
- ✅ 卡牌图片显示正常
- ✅ 加载状态、不确定标识显示正常
- ✅ 样式细节与重构前一致
- ✅ **无任何视觉差异**

**完成时间：** 2025-10-11  
**验证结果：** 用户确认显示完全正确 ✅

---

### 阶段四：迁移基础交互逻辑（1.5小时）✅ 已完成

- [x] **Task 4.1** - 在组件中实现 `onImageLoad` 方法 ✅
  - 接收图片加载成功事件 ✅
  - 通过 `triggerEvent` 发送 `imageload` 事件给父组件 ✅
  - 更新组件状态（isLoadingImage: false, state: 'loaded'）✅
  
- [x] **Task 4.2** - 在组件中实现 `onImageError` 方法 ✅
  - 接收图片加载失败事件 ✅
  - 通过 `triggerEvent` 发送 `imageerror` 事件给父组件 ✅
  - 更新组件状态（isLoadingImage: false, state: 'error'）✅
  
- [x] **Task 4.3** - 在组件中实现 `onCardTap` 方法 ✅
  - 接收卡牌点击事件 ✅
  - 通过 `triggerEvent` 发送 `cardtap` 事件给父组件 ✅
  - 传递完整的卡牌信息（pillarName, isFlipped等）✅
  
- [x] **Task 4.4** - 修改页面 `index.js`，监听组件事件 ✅
  - 监听 `bind:imageload`，转发给Controller ✅
  - 监听 `bind:imageerror`，转发给Controller ✅
  - 监听 `bind:cardtap`，转发给Controller ✅
  - 兼容组件事件和原生事件（双向兼容）✅
  
- [x] **Task 4.5** - 测试所有交互功能 ✅
  - 测试卡牌点击交互 ✅
  - 测试图片加载事件 ✅
  - 测试事件传递链路 ✅

**验收标准：**
- ✅ 点击卡牌可以触发原有逻辑（翻转/预览）
- ✅ 图片加载成功/失败处理正常
- ✅ 所有交互与重构前完全一致

**完成时间：** 2025-10-11  
**说明：** 这些功能在阶段一创建组件和阶段三集成时已同步实现

---

### 阶段五：迁移高级功能到组件（2小时）

- [ ] **Task 5.1** - 在组件中引入 `imageCacheManager`
  - 在组件 `index.js` 头部引入工具类
  
- [ ] **Task 5.2** - 在组件中引入 `baziImageMap`
  - 引入 `getBaziImageById` 和 `getBaziImageByPinyin` 方法
  
- [ ] **Task 5.3** - 实现组件内部的图片加载逻辑
  - 添加 `heavenlyStem`、`earthlyBranch` 属性
  - 实现 `_loadBaziImage` 方法
  - 管理 `baziImagePath` 内部状态
  - 管理 `isLoadingImage` 加载状态
  
- [ ] **Task 5.4** - 实现组件的 `observers` 监听器
  - 监听 `heavenlyStem, earthlyBranch` 变化
  - 自动触发图片重新加载
  
- [ ] **Task 5.5** - 实现卡牌翻转动画逻辑
  - 添加 `isFlipped` 内部状态
  - 实现 `flipToFront()` 公共方法
  - 实现翻转动画（scaleX缩放效果）
  
- [ ] **Task 5.6** - 测试所有高级功能

**验收标准：**
- ✅ 图片加载逻辑在组件内部运行正常
- ✅ 卡牌翻转动画流畅
- ✅ 加载状态显示正确
- ✅ 数据变化时组件自动更新

---

### 阶段六：Controller重构（1.5小时）

- [ ] **Task 6.1** - 删除 `_loadSingleCard()` 方法
- [ ] **Task 6.2** - 删除 `onImageLoadSuccess()` 方法
- [ ] **Task 6.3** - 删除 `onImageLoadError()` 方法
- [ ] **Task 6.4** - 删除 `_getBaziImageInfo()` 方法
- [ ] **Task 6.5** - 删除 `_getBaziImagePath()` 方法
- [ ] **Task 6.6** - 简化 `updateBaziDisplay()` 方法
  - 只需设置天干地支数据
  - 移除图片加载逻辑
  
- [ ] **Task 6.7** - 简化 `flipCard()` 方法
  - 通过 `selectComponent()` 获取组件实例
  - 调用组件的 `flipToFront()` 方法
  
- [ ] **Task 6.8** - 清理不再使用的变量
  - 移除 `yearCardLoading`、`monthCardLoading` 等状态
  - 移除 `baziImagePath` 等字段
  
- [ ] **Task 6.9** - 更新 `CardController-README.md` 文档

**验收标准：**
- ✅ Controller代码量减少40%以上
- ✅ Controller职责更清晰
- ✅ 所有功能正常工作
- ✅ 文档更新完整

---

### 阶段七：测试与优化（1.5小时）

- [ ] **Task 7.1** - 执行完整功能测试（见下方测试清单）
- [ ] **Task 7.2** - 执行性能测试
  - 测试图片加载速度
  - 测试页面渲染性能
  - 对比重构前后性能数据
  
- [ ] **Task 7.3** - 执行兼容性测试
  - 测试不同机型
  - 测试不同网络环境
  
- [ ] **Task 7.4** - 代码优化和清理
  - 移除冗余代码
  - 优化组件逻辑
  - 统一代码风格
  
- [ ] **Task 7.5** - 日志优化
  - 精简不必要的日志
  - 统一日志格式

**验收标准：**
- ✅ 所有功能测试通过
- ✅ 性能无下降
- ✅ 代码整洁，无冗余
- ✅ 日志输出合理

---

## 测试清单

### 功能测试

#### 初始显示
- [ ] 页面加载后显示4张卡牌
- [ ] 3张卡牌显示背面（年、月、时）
- [ ] 1张卡牌显示正面（日）
- [ ] 日柱卡牌无加载状态覆盖

#### 卡牌翻转
- [ ] 点击背面卡牌可翻转为正面
- [ ] 翻转动画流畅自然
- [ ] 翻转后显示正确的八字图片
- [ ] 已翻转的卡牌点击不再翻转

#### 卡牌预览
- [ ] 点击正面卡牌弹出预览悬浮窗
- [ ] 预览图片清晰完整
- [ ] 点击预览悬浮窗可关闭
- [ ] 日柱预览时显示描述信息
- [ ] 其他柱预览时不显示描述信息

#### 加载状态
- [ ] 卡牌加载时显示加载动画
- [ ] 加载动画覆盖在卡牌上方
- [ ] 加载完成后自动消失
- [ ] 加载中点击卡牌提示"图片加载中"

#### 不确定时辰
- [ ] 不确定时辰时，时柱显示问号标识
- [ ] 问号标识位置正确（右上角）
- [ ] 问号标识有脉搏动画
- [ ] 确定时辰时，不显示问号标识

#### 图片缓存
- [ ] 首次加载图片从云存储获取
- [ ] 再次加载图片从缓存获取
- [ ] 缓存失败时降级到云存储
- [ ] 图片加载失败时有错误提示

#### 档案切换
- [ ] 切换档案后卡牌数据正确更新
- [ ] 切换档案后卡牌重置为初始状态
- [ ] 切换档案后日柱自动显示正面

#### 边界情况
- [ ] 无档案时显示空状态
- [ ] 档案数据不完整时不崩溃
- [ ] 图片加载失败时提示重试
- [ ] 网络断开时的处理

### 性能测试

- [ ] 4张图片并发加载，总耗时 < 3秒（缓存命中）
- [ ] 4张图片并发加载，总耗时 < 10秒（无缓存）
- [ ] 图片缓存命中率 > 90%（第二次加载）
- [ ] 页面首次渲染时间 < 500ms
- [ ] 卡牌翻转动画流畅，无卡顿
- [ ] 切换档案时页面刷新 < 1秒
- [ ] 页面内存占用 < 50MB
- [ ] 无明显内存泄漏

### 兼容性测试

- [ ] iPhone（iOS 14+）
- [ ] Android（Android 8+）
- [ ] 不同屏幕尺寸
- [ ] WiFi网络
- [ ] 4G网络
- [ ] 弱网环境
- [ ] 离线状态（缓存）

---

## 组件接口定义

### 组件属性（Properties）

```javascript
{
  title: String,              // 卡牌标题
  pillarName: String,         // 柱子名称（year/month/day/time）
  heavenlyStem: String,       // 天干
  earthlyBranch: String,      // 地支
  baziImageId: String,        // 八字图片ID
  defaultShowFront: Boolean,  // 是否默认显示正面（日柱为true）
  cardBackImage: String,      // 背面图片路径
  showUncertainIndicator: Boolean,  // 是否显示不确定标识（仅时柱）
  animation: Object           // 入场动画对象
}
```

### 组件事件（Events）

- `cardtap` - 卡牌点击事件 `{ pillarName, isFlipped, heavenlyStem, earthlyBranch, imagePath }`
- `imageload` - 图片加载成功 `{ pillarName, imagePath }`
- `imageerror` - 图片加载失败 `{ pillarName, imagePath, error }`
- `statechange` - 状态变化 `{ pillarName, state }` （loading/loaded/flipped/error）

### 组件方法（Public Methods）

- `flipToFront()` - 翻转卡牌到正面（带动画）
- `reloadImage()` - 重新加载图片
- `getState()` - 获取当前卡牌状态

---

## 风险控制

### 备份策略
- [ ] 创建 `backup-card-page` 分支备份原始代码
- [ ] 在 `feature/bazi-card-component` 分支进行重构
- [ ] 充分测试后再合并到 `dev` 分支

### 回滚方案
- 如发现严重问题，立即回滚到备份分支
- 分析问题后再次尝试

---

## 任务统计与时间估算

| 阶段 | 任务数 | 预计时间 | 累计时间 | 关键点 |
|-----|-------|---------|---------|--------|
| 阶段一：组件基础结构 | 6个任务 | 0.5小时 | 0.5小时 | 创建目录和文件 |
| 阶段二：照搬UI代码 ⭐️ | 4个任务 | 1小时 | 1.5小时 | 确保样式一致 |
| 阶段三：显示验证 ⭐️ | 5个任务 | 1小时 | 2.5小时 | **必须视觉一致** |
| 阶段四：迁移基础交互 | 5个任务 | 1.5小时 | 4小时 | 事件处理 |
| 阶段五：迁移高级功能 | 6个任务 | 2小时 | 6小时 | 图片缓存、动画 |
| 阶段六：Controller重构 | 9个任务 | 1.5小时 | 7.5小时 | 简化逻辑 |
| 阶段七：测试与优化 | 5个任务 | 1.5小时 | 9小时 | 全面测试 |
| **总计** | **40个任务** | **9小时** | - | **3个工作日** |

**关键验证点：**
- ⭐️ **Task 3.5 完成后必须验证显示效果100%一致**
- ⭐️ **如有差异必须立即修复，不能进入阶段四**

**建议实施周期：** 3个工作日（每天3小时）

**任务进度追踪：** 20/40 ✅ (50%)

---

## 预期效果

### 代码量变化

**重构前：**
- pages/card/index.wxml: 126行
- pages/card/index.js: 178行
- pages/card/index.less: 329行
- CardController.js: 893行
- **总计：1526行**

**重构后：**
- components/bazi-card/: ~600行（新增）
- pages/card/index.wxml: 80行（减少46行）
- pages/card/index.js: 150行（减少28行）
- pages/card/index.less: 150行（减少179行）
- CardController.js: 500行（减少393行）
- **总计：1480行（减少46行，代码更清晰）**

### 架构改进

- ✅ 单一职责：组件管理自身，Controller协调全局
- ✅ 开闭原则：新增卡牌类型只需配置
- ✅ DRY原则：卡牌逻辑只实现一次
- ✅ 可复用性：组件可在其他页面使用

---

## 下一步行动

✅ 阶段一：组件基础结构 - 已完成  
✅ 阶段二：照搬现有UI代码 - 已完成  
✅ 阶段三：页面集成与显示验证 - 已完成（用户确认显示正确）  
✅ 阶段四：迁移基础交互逻辑 - 已完成（事件处理已实现）  
🔄 准备实施阶段五：迁移高级功能到组件
