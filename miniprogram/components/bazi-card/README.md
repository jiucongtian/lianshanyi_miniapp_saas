# Bazi Card 八字卡牌组件

## 功能特性

- 支持卡牌翻转动画（背面→正面）
- 支持图片懒加载和缓存
- 支持加载状态显示
- 支持不确定时辰标识
- 支持卡牌点击预览
- 封装完整的卡牌交互逻辑

## 组件接口

### Properties 属性

| 属性名 | 类型 | 默认值 | 必填 | 说明 |
|--------|------|--------|------|------|
| title | String | '' | 是 | 卡牌标题（例如："年柱"） |
| pillarName | String | '' | 是 | 柱子名称（year/month/day/time） |
| heavenlyStem | String | '' | 是 | 天干 |
| earthlyBranch | String | '' | 是 | 地支 |
| baziImageId | String | '' | 否 | 八字图片ID |
| defaultShowFront | Boolean | false | 否 | 是否默认显示正面（日柱为true） |
| cardBackImage | String | '' | 否 | 背面图片路径 |
| showUncertainIndicator | Boolean | false | 否 | 是否显示不确定标识（仅时柱） |
| animation | Object | null | 否 | 入场动画对象 |

### Events 事件

| 事件名 | 说明 | 回调参数 |
|--------|------|----------|
| cardtap | 卡牌点击事件 | `{ pillarName, isFlipped, heavenlyStem, earthlyBranch, imagePath }` |
| imageload | 图片加载成功 | `{ pillarName, imagePath }` |
| imageerror | 图片加载失败 | `{ pillarName, imagePath, error }` |
| statechange | 状态变化 | `{ pillarName, state }` |

### Public Methods 公共方法

| 方法名 | 说明 | 参数 | 返回值 |
|--------|------|------|--------|
| flipToFront() | 翻转卡牌到正面（带动画） | 无 | 无 |
| reloadImage() | 重新加载图片 | 无 | 无 |
| getState() | 获取当前卡牌状态 | 无 | Object |

## 使用方法

### 1. 在页面 JSON 中引入组件

```json
{
  "usingComponents": {
    "bazi-card": "/components/bazi-card/index"
  }
}
```

### 2. 在 WXML 中使用

```xml
<!-- 年柱 -->
<bazi-card
  title="年柱"
  pillar-name="year"
  heavenly-stem="{{yearStem}}"
  earthly-branch="{{yearBranch}}"
  bazi-image-id="{{yearImageId}}"
  card-back-image="{{cardBackImage}}"
  animation="{{yearAnimation}}"
  bind:cardtap="onCardTap"
  bind:imageload="onImageLoad"
  bind:imageerror="onImageError"
/>

<!-- 日柱（默认显示正面） -->
<bazi-card
  title="日柱"
  pillar-name="day"
  heavenly-stem="{{dayStem}}"
  earthly-branch="{{dayBranch}}"
  bazi-image-id="{{dayImageId}}"
  default-show-front="{{true}}"
  card-back-image="{{cardBackImage}}"
  animation="{{dayAnimation}}"
  bind:cardtap="onCardTap"
  bind:imageload="onImageLoad"
  bind:imageerror="onImageError"
/>

<!-- 时柱（显示不确定标识） -->
<bazi-card
  title="时柱"
  pillar-name="time"
  heavenly-stem="{{timeStem}}"
  earthly-branch="{{timeBranch}}"
  bazi-image-id="{{timeImageId}}"
  card-back-image="{{cardBackImage}}"
  show-uncertain-indicator="{{!isTimeConfirmed}}"
  animation="{{timeAnimation}}"
  bind:cardtap="onCardTap"
  bind:imageload="onImageLoad"
  bind:imageerror="onImageError"
/>
```

### 3. 在 JS 中处理事件

```javascript
Page({
  data: {
    cardBackImage: '/static/card-back.jpg',
    yearStem: '甲',
    yearBranch: '子',
    // ...
  },

  /**
   * 卡牌点击事件
   */
  onCardTap(e) {
    const { pillarName, isFlipped } = e.detail;
    console.log('卡牌被点击:', pillarName, isFlipped);
    
    // 如果是背面，触发翻转
    if (!isFlipped) {
      const card = this.selectComponent(`#${pillarName}-card`);
      if (card) {
        card.flipToFront();
      }
    } else {
      // 如果是正面，显示预览
      this.showPreview(e.detail);
    }
  },

  /**
   * 图片加载成功
   */
  onImageLoad(e) {
    const { pillarName } = e.detail;
    console.log('图片加载成功:', pillarName);
  },

  /**
   * 图片加载失败
   */
  onImageError(e) {
    const { pillarName, error } = e.detail;
    console.error('图片加载失败:', pillarName, error);
    wx.showToast({
      title: '图片加载失败',
      icon: 'none'
    });
  }
});
```

### 4. 手动控制卡牌

```javascript
// 获取组件实例
const yearCard = this.selectComponent('#year-card');

// 翻转到正面
yearCard.flipToFront();

// 重新加载图片
yearCard.reloadImage();

// 获取卡牌状态
const state = yearCard.getState();
console.log('卡牌状态:', state);
```

## 组件状态说明

组件内部维护以下状态：

- `loading` - 图片加载中
- `loaded` - 图片加载完成
- `flipped` - 卡牌已翻转
- `error` - 图片加载失败

## 使用场景

1. 八字卡牌展示页面
2. 需要卡牌翻转效果的场景
3. 需要图片懒加载的场景
4. 需要统一卡牌交互的场景

## 注意事项

1. 组件会自动处理图片加载状态
2. 卡牌翻转动画由组件内部管理
3. 父组件只需监听事件并响应
4. 不确定时辰标识仅在时柱显示
5. 组件支持复用，可在多个页面使用

## 开发状态

### 阶段一：组件基础结构 ✅
- [x] Task 1.1 - 创建组件目录
- [x] Task 1.2 - 创建 index.json 文件
- [x] Task 1.3 - 创建 index.wxml 文件
- [x] Task 1.4 - 创建 index.js 文件
- [x] Task 1.5 - 创建 index.less 文件
- [x] Task 1.6 - 创建 README.md 文件

### 阶段二：照搬现有UI代码 ✅
- [x] Task 2.1 - 复制单张卡牌的完整WXML结构
- [x] Task 2.2 - 复制所有卡牌相关样式
- [x] Task 2.3 - 定义所有需要的属性
- [x] Task 2.4 - 确保组件WXML中的数据绑定使用properties

### 阶段三：页面集成与验证（进行中）
- [ ] Task 3.1 - 修改页面JSON，添加组件引用
- [ ] Task 3.2 - 替换年柱卡牌为组件
- [ ] Task 3.3 - 验证年柱卡牌显示效果
- [ ] Task 3.4 - 替换月柱、日柱、时柱为组件
- [ ] Task 3.5 - 全面对比显示效果

### 待完成阶段
- [ ] 阶段四：迁移基础交互逻辑
- [ ] 阶段五：迁移高级功能
- [ ] 阶段六：Controller重构
- [ ] 阶段七：测试与优化

## 更新日志

### v0.2.0 (2025-10-11)
- ✅ 复制完整的WXML结构（包括加载状态、不确定标识）
- ✅ 复制完整的LESS样式（包括所有动画）
- ✅ 定义所有必要的属性（imagePath, loading等）
- ✅ 确保数据绑定正确使用properties
- ✅ 组件可以独立编译通过

### v0.1.0 (2025-10-11)
- 创建组件基础结构
- 定义组件接口和属性
- 实现基础生命周期方法
- 定义公共方法和事件

