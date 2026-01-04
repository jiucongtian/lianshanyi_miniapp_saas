# 卡牌预览组件 (card-preview)

通用的卡牌放大预览组件，支持3D倾斜效果和卡牌描述信息显示。

## 功能特性

- ✅ 全屏预览卡牌图片
- ✅ 3D倾斜效果（触摸移动时图片跟随倾斜）
- ✅ 支持显示卡牌描述信息
- ✅ 平滑的动画过渡效果
- ✅ 点击背景关闭预览

## 使用方法

### 1. 在页面 JSON 中注册组件

```json
{
  "usingComponents": {
    "card-preview": "../../components/card-preview/index"
  }
}
```

### 2. 在 WXML 中使用组件

```xml
<card-preview
  show="{{showCardPreview}}"
  image-path="{{previewImagePath}}"
  description="{{previewCardDescription}}"
  bind:close="onCloseCardPreview"
/>
```

### 3. 在 JS 中控制预览

```javascript
Page({
  data: {
    showCardPreview: false,
    previewImagePath: '',
    previewCardDescription: null
  },

  // 显示预览
  showPreview(imagePath, description = null) {
    this.setData({
      showCardPreview: true,
      previewImagePath: imagePath,
      previewCardDescription: description
    });
  },

  // 关闭预览
  onCloseCardPreview() {
    this.setData({
      showCardPreview: false,
      previewImagePath: '',
      previewCardDescription: null
    });
  }
});
```

## 属性说明

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| show | Boolean | false | 是否显示预览 |
| imagePath | String | '' | 预览图片路径 |
| description | Object/String | null | 卡牌描述信息（可选） |

## 事件说明

| 事件名 | 说明 | 回调参数 |
|--------|------|----------|
| close | 关闭预览时触发 | - |

## 描述信息格式

`description` 可以是对象或字符串：

**对象格式：**
```javascript
{
  description: '卡牌描述文本',
  cardName: '卡牌名称',
  cardNumber: 1
}
```

**字符串格式：**
```javascript
'卡牌描述文本'
```

## 使用示例

### 示例1：基本使用

```xml
<card-preview
  show="{{showPreview}}"
  image-path="{{cardImagePath}}"
  bind:close="onClosePreview"
/>
```

### 示例2：带描述信息

```xml
<card-preview
  show="{{showPreview}}"
  image-path="{{cardImagePath}}"
  description="{{cardDescription}}"
  bind:close="onClosePreview"
/>
```

### 示例3：在卡牌点击时显示预览

```xml
<!-- 卡牌 -->
<view class="card" bindtap="onCardTap" data-is-flipped="{{isFlipped}}">
  <image src="{{cardImagePath}}" />
</view>

<!-- 预览组件 -->
<card-preview
  show="{{showCardPreview}}"
  image-path="{{previewImagePath}}"
  bind:close="onCloseCardPreview"
/>
```

```javascript
Page({
  data: {
    isFlipped: false,
    showCardPreview: false,
    previewImagePath: ''
  },

  onCardTap(e) {
    const isFlipped = e.currentTarget.dataset.isFlipped;
    
    // 只有已翻转的卡牌才能预览
    if (!isFlipped) {
      return;
    }
    
    this.setData({
      showCardPreview: true,
      previewImagePath: this.data.cardImagePath
    });
  },

  onCloseCardPreview() {
    this.setData({
      showCardPreview: false,
      previewImagePath: ''
    });
  }
});
```

## 样式说明

组件使用固定定位，覆盖整个屏幕。预览图片占据屏幕的90%，支持触摸交互实现3D倾斜效果。

## 注意事项

1. 组件会自动处理3D倾斜效果的触摸交互
2. 点击背景区域（非图片区域）会关闭预览
3. 描述信息会显示在预览图片底部
4. 组件支持懒加载，但建议传入完整的图片路径以确保预览效果

