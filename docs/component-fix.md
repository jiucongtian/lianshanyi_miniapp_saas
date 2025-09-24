# 组件引用修复说明

## 问题描述
在创建TabBar页面时，卡牌页面(`pages/card/index.json`)中引用了不存在的TDesign组件：
- `t-card`: TDesign组件库中不存在此组件

## 修复内容

### 1. 修复卡牌页面组件引用
**修改文件**: `miniprogram/pages/card/index.json`

**修改前**:
```json
{
  "usingComponents": {
    "t-card": "miniprogram_npm/tdesign-miniprogram/card/card",
    "t-image": "miniprogram_npm/tdesign-miniprogram/image/image"
  },
  "navigationBarTitleText": "卡牌"
}
```

**修改后**:
```json
{
  "usingComponents": {
    "t-image": "miniprogram_npm/tdesign-miniprogram/image/image",
    "t-icon": "miniprogram_npm/tdesign-miniprogram/icon/icon"
  },
  "navigationBarTitleText": "卡牌"
}
```

### 2. 验证其他页面组件
已验证以下页面的组件引用都是正确的：
- `pages/profile/index.json` - 使用的组件都存在
- `pages/mine/index.json` - 使用的组件都存在

### 3. 验证的TDesign组件列表
确认以下组件在TDesign组件库中存在：
- ✅ `avatar` - 头像组件
- ✅ `button` - 按钮组件
- ✅ `cell` - 单元格组件
- ✅ `cell-group` - 单元格组组件
- ✅ `divider` - 分割线组件
- ✅ `empty` - 空状态组件
- ✅ `icon` - 图标组件
- ✅ `loading` - 加载组件
- ✅ `message` - 消息组件
- ✅ `navbar` - 导航栏组件
- ✅ `popup` - 弹出层组件

### 4. 页面功能不受影响
- 卡牌页面的UI布局和功能完全正常
- 使用原生`view`组件和`t-icon`组件实现卡牌效果
- 所有交互功能保持不变

## 解决方案
1. **移除不存在的组件引用**：删除了`t-card`组件引用
2. **使用原生组件替代**：使用`view`组件和CSS样式实现卡牌效果
3. **保持功能完整性**：确保所有页面功能正常工作

## 预防措施
在今后添加TDesign组件时，建议：
1. 先检查组件库目录确认组件存在
2. 参考TDesign官方文档确认组件名称
3. 在开发环境中测试组件引用是否正确

## 测试验证
- ✅ 所有页面无linter错误
- ✅ 组件引用路径正确
- ✅ TabBar导航正常工作
