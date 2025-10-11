# MineController 使用文档

## 概述

MineController 是个人中心页面的控制器，负责处理个人中心相关的业务逻辑，包括用户信息管理、缓存清理、设置等。

## 功能特性

- ✅ 用户信息加载和显示
- ✅ 头像缓存管理
- ✅ 缓存清理功能
- ✅ 设置菜单
- ✅ 用户资料编辑
- ✅ 注册跳转
- ✅ 下拉刷新
- ✅ 错误状态处理

## 使用方法

### 1. 基本使用

```javascript
const { MineController } = require('../../controllers/MineController');

Page({
  data: {
    // 页面数据
  },
  
  onLoad(options) {
    this.controller = new MineController(this);
    this.controller.initialize();
  },
  
  // 事件处理方法
  onRegister() {
    this.controller.onRegister();
  },
  
  onEditProfile() {
    this.controller.onEditProfile();
  },
  
  onRefresh() {
    this.controller.onRefresh();
  }
});
```

## 主要方法

### 初始化方法

#### `initialize()`
初始化页面，加载用户信息。

**示例：**
```javascript
await this.controller.initialize();
```

### 用户信息方法

#### `loadUserInfo()`
加载用户信息。

**示例：**
```javascript
await this.controller.loadUserInfo();
```

#### `updateUserInfo(userData)`
更新用户信息。

**参数：**
- `userData` (Object): 要更新的用户数据
  - `nickName` (string): 昵称
  - `avatarUrl` (string): 头像URL
  - `gender` (number): 性别
  - `phoneNumber` (string): 手机号

**返回值：**
- `Promise<boolean>`: 是否更新成功

**示例：**
```javascript
const userData = {
  nickName: '新昵称',
  gender: 1,
  phoneNumber: '13800138000'
};
const success = await this.controller.updateUserInfo(userData);
```

### 缓存管理方法

#### `clearCache()`
清理所有缓存数据。

**返回值：**
- `Promise<boolean>`: 是否清理成功

**示例：**
```javascript
const success = await this.controller.clearCache();
```

### 设置方法

#### `showSettings()`
显示设置菜单。

**示例：**
```javascript
this.controller.showSettings();
```

### 导航方法

#### `onRegister()`
跳转到注册页面。

**示例：**
```javascript
this.controller.onRegister();
```

#### `onEditProfile()`
跳转到编辑资料页面。

**示例：**
```javascript
this.controller.onEditProfile();
```

#### `onRefresh()`
刷新页面数据。

**示例：**
```javascript
await this.controller.onRefresh();
```

## 数据属性

### 用户信息
- `userInfo`: 用户信息对象
- `userTypeText`: 用户类型文本
- `genderText`: 性别文本
- `phoneNumberText`: 手机号文本
- `avatarUrl`: 头像URL（缓存后）

### 页面状态
- `loading`: 是否正在加载
- `error`: 错误信息

## 设置菜单选项

控制器提供的设置菜单包含以下选项：

1. **清理缓存** - 清理所有缓存数据
2. **关于我们** - 显示应用信息
3. **用户协议** - 跳转到用户协议页面
4. **隐私政策** - 跳转到隐私政策页面

## 头像缓存

控制器自动处理头像缓存：

1. **云存储头像**：自动下载并缓存到本地
2. **默认头像**：未设置头像时使用默认头像
3. **缓存失败处理**：缓存失败时使用原始URL
4. **缓存路径管理**：自动管理缓存文件路径

## 用户信息格式化

控制器自动格式化用户信息显示：

### 用户类型映射
- `guest` → '临时用户'
- `normal` → '探索者'
- `premium` → '高级用户'

### 性别映射
- `0` → '未知'
- `1` → '男'
- `2` → '女'

### 手机号处理
- 空值或空字符串 → '未设置'
- 有效手机号 → 直接显示

## 缓存清理功能

清理缓存时会处理以下数据：

1. **图片缓存**：清理所有下载的图片文件
2. **ProfileManager缓存**：清理档案管理器的内存缓存
3. **本地存储**：清理临时数据
   - `userDateTime`: 用户时间数据
   - `editingProfile`: 编辑中的档案数据

## 错误处理

控制器内置了完整的错误处理机制：

1. **用户信息加载失败**：显示错误信息
2. **头像缓存失败**：使用原始URL
3. **缓存清理失败**：显示错误提示
4. **网络异常**：显示友好提示

## 生命周期处理

### 页面显示
- 每次显示时自动刷新用户信息
- 确保数据是最新的

### 页面隐藏
- 清理加载状态
- 隐藏所有提示

### 页面卸载
- 清理资源
- 移除事件监听

## 下拉刷新

支持下拉刷新功能：

1. **触发条件**：用户下拉页面
2. **刷新内容**：重新加载用户信息
3. **完成处理**：停止下拉刷新动画

## 分享功能

提供分享功能：

- **分享标题**：'生命智慧卡牌'
- **分享路径**：'/pages/addProfile/index'
- **分享图片**：可自定义

## 注意事项

1. **用户信息依赖**：需要UserService支持
2. **缓存管理**：需要imageCacheManager支持
3. **页面刷新**：每次显示都会刷新数据
4. **错误恢复**：所有错误都有相应的恢复机制
5. **权限检查**：某些功能需要用户权限

## 示例页面集成

```javascript
// pages/mine/index.js
const { MineController } = require('../../controllers/MineController');

Page({
  data: {
    userInfo: {},
    loading: true,
    error: '',
    userTypeText: '',
    genderText: '',
    phoneNumberText: '',
    avatarUrl: ''
  },

  onLoad(options) {
    this.controller = new MineController(this);
    this.controller.initialize();
  },

  onRegister() {
    this.controller.onRegister();
  },

  onEditProfile() {
    this.controller.onEditProfile();
  },

  onShowSettings() {
    this.controller.showSettings();
  },

  onClearCache() {
    this.controller.clearCache();
  },

  onPullDownRefresh() {
    this.controller.onRefresh();
  },

  onShareAppMessage() {
    return this.controller.onShareAppMessage();
  }
});
```

## 相关服务

### UserService
- 用户信息获取
- 用户信息更新
- 用户权限检查

### ImageCacheManager
- 图片缓存管理
- 缓存清理
- 缓存路径获取

### ProfileManager
- 档案数据管理
- 缓存清理
- 数据同步
