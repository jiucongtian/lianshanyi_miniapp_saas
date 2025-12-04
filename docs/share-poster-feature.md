# 分享海报功能说明

## 功能概述

在answer页面（智慧洞见）添加了生成分享海报的功能，用户完成抽卡和AI解读后，可以一键生成精美的海报图片，方便分享到朋友圈。

## 功能特性

### 1. 海报内容
- **背景**：达姆森色系渐变背景，与小程序整体风格一致
- **标题**：生命智慧卡牌
- **用户问题**：显示用户输入的问题（如果有）
- **卡牌图片**：显示用户抽中的卡牌图片
- **卡牌信息**：卡牌编号和名称
- **AI解读**：完整显示AI解读内容（不截断）
- **装饰元素**：边框、底部提示等

### 2. 使用流程
1. 用户输入问题并点击"抽卡"
2. 抽卡动画完成后，自动进行AI解读
3. AI解读完成后，显示"生成分享海报"按钮
4. 点击按钮生成海报
5. 自动预览海报，长按可保存到相册

### 3. 技术实现

#### 文件结构
```
miniprogram/
├── pages/
│   └── answer/
│       ├── index.js       # 页面逻辑，包含海报生成调用
│       ├── index.wxml     # 页面结构，包含Canvas和分享按钮
│       └── index.less     # 页面样式，包含Canvas隐藏样式
└── utils/
    └── posterGenerator.js # 海报生成工具类
```

#### 核心代码

**posterGenerator.js - 海报生成器**
```javascript
class PosterGenerator {
  async generatePoster(options) {
    // 1. 绘制背景渐变
    // 2. 绘制标题
    // 3. 绘制卡牌图片
    // 4. 绘制卡牌信息
    // 5. 绘制AI解读内容
    // 6. 绘制底部提示
    // 7. 导出为图片
  }
}
```

**页面调用流程**
1. 初始化Canvas（使用Canvas 2D API）
2. 调用`posterGenerator.generatePoster()`生成海报
3. 使用`wx.previewImage()`预览海报
4. 用户可以保存到相册或分享

### 4. Canvas规格
- **宽度**：750px（固定）
- **高度**：动态计算（最小1334px，根据内容自动增长）
- **类型**：Canvas 2D API
- **特性**：自动适应内容长度，确保所有内容完整显示

### 5. 权限要求
- 无需特殊权限即可生成海报
- 保存到相册需要"保存图片到相册"权限（用户点击保存时申请）

## 使用说明

### 用户操作
1. 在answer页面完成抽卡
2. 等待AI解读完成
3. 点击"生成分享海报"按钮
4. 预览生成的海报
5. 长按图片保存到相册或直接分享

### 开发者说明

#### 修改海报样式
如需修改海报样式，编辑`posterGenerator.js`中的绘制方法：
- `_drawBackground()` - 修改背景
- `_drawTitle()` - 修改标题
- `_drawQuestion()` - 修改用户问题显示
- `_drawCardImage()` - 修改卡牌图片位置
- `_drawCardInfo()` - 修改卡牌信息显示
- `_drawInterpretation()` - 修改AI解读内容显示
- `_drawFooter()` - 修改底部提示

#### 修改Canvas尺寸
在`posterGenerator.js`的构造函数中修改：
```javascript
constructor() {
  this.canvasWidth = 750;        // 宽度（固定）
  this.minCanvasHeight = 1334;   // 最小高度
  this.padding = 40;             // 边距
  this.lineHeight = 40;          // 行高
}
```

注意：Canvas高度会根据内容自动计算，确保所有内容完整显示。

## 注意事项

1. **图片加载**
   - 优先使用本地缓存图片
   - 如果缓存不存在，使用云存储路径
   - 图片加载失败不会阻止海报生成

2. **动态高度**
   - Canvas高度根据内容自动计算
   - AI解读内容完整显示，不截断
   - 自动换行处理长文本
   - 确保所有内容都能在海报中看到

3. **性能优化**
   - Canvas在屏幕外隐藏，不影响页面性能
   - 生成海报时显示加载提示
   - 使用Canvas 2D API，性能更好

4. **错误处理**
   - Canvas初始化失败会提示用户
   - 海报生成失败会重置按钮状态
   - 保存相册失败会引导用户授权

## 后续优化方向

1. **多样化模板**：提供不同风格的海报模板供用户选择
2. **自定义文案**：允许用户添加自定义文字
3. **小程序码**：在海报中添加小程序码，方便传播
4. **社交分享**：集成微信分享API，直接分享到聊天或朋友圈
5. **历史记录**：保存已生成的海报，方便再次分享

## 相关文档

- [Canvas 2D API - 微信小程序文档](https://developers.weixin.qq.com/miniprogram/dev/api/canvas/Canvas.html)
- [wx.canvasToTempFilePath - 微信小程序文档](https://developers.weixin.qq.com/miniprogram/dev/api/canvas/wx.canvasToTempFilePath.html)
- [wx.previewImage - 微信小程序文档](https://developers.weixin.qq.com/miniprogram/dev/api/media/image/wx.previewImage.html)
- [wx.saveImageToPhotosAlbum - 微信小程序文档](https://developers.weixin.qq.com/miniprogram/dev/api/media/image/wx.saveImageToPhotosAlbum.html)

