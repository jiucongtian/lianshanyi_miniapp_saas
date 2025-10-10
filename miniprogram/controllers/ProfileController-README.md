# ProfileController 使用文档

## 概述

ProfileController 是档案页面的控制器类，继承自 BaseController，负责处理档案页面相关的所有业务逻辑，包括档案列表管理、用户信息管理、档案操作等。

## 主要功能

- **用户信息管理**：加载和显示用户信息、配额状态
- **档案列表管理**：加载、刷新、分页加载档案列表
- **档案操作**：选择、删除、编辑档案
- **配额管理**：检查用户配额，显示升级提示
- **事件处理**：处理各种档案相关事件

## 使用方法

### 1. 基本使用

```javascript
// pages/profile/index.js
const { ProfileController } = require('../../controllers/ProfileController');

Page({
  data: {
    profileList: [],
    loading: false,
    userInfo: null,
    canCreateMore: true
  },

  onLoad(options) {
    // 创建控制器实例
    this.controller = new ProfileController(this);
    
    // 初始化页面
    this.controller.initialize();
  },

  onShow() {
    // 页面显示时调用控制器的onShow方法
    this.controller.onShow();
  },

  onHide() {
    // 页面隐藏时调用控制器的onHide方法
    this.controller.onHide();
  },

  onUnload() {
    // 页面卸载时调用控制器的onUnload方法
    this.controller.onUnload();
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.controller.onPullDownRefresh();
  },

  // 上拉触底
  onReachBottom() {
    this.controller.onReachBottom();
  },

  // 事件处理器
  onProfileTap(e) {
    const profileId = e.currentTarget.dataset.id;
    this.controller.selectProfile(profileId);
  },

  onDeleteProfile(e) {
    const profileId = e.currentTarget.dataset.id;
    this.controller.deleteProfile(profileId);
  },

  onEditProfile(e) {
    const profileId = e.currentTarget.dataset.id;
    this.controller.editProfile(profileId);
  },

  onAddProfile() {
    this.controller.addProfile();
  }
});
```

### 2. 页面模板示例

```xml
<!-- pages/profile/index.wxml -->
<view class="profile-container">
  <!-- 用户信息区域 -->
  <view class="user-info" wx:if="{{userInfo}}">
    <text class="user-type">{{userTypeName}}</text>
    <text class="quota-info">已使用 {{usedProfiles}}/{{profileQuota === -1 ? '∞' : profileQuota}} 个档案</text>
  </view>

  <!-- 档案列表 -->
  <view class="profile-list">
    <view 
      class="profile-item {{currentProfileId === item._id ? 'active' : ''}}"
      wx:for="{{profileList}}" 
      wx:key="_id"
      data-id="{{item._id}}"
      bindtap="onProfileTap"
    >
      <view class="profile-name">{{item.profileName}}</view>
      <view class="profile-time">{{item.formatBirthTime()}}</view>
      <view class="profile-actions">
        <button 
          class="edit-btn" 
          data-id="{{item._id}}" 
          bindtap="onEditProfile"
          catchtap="true"
        >编辑</button>
        <button 
          class="delete-btn" 
          data-id="{{item._id}}" 
          bindtap="onDeleteProfile"
          catchtap="true"
        >删除</button>
      </view>
    </view>
  </view>

  <!-- 加载状态 -->
  <view class="loading" wx:if="{{loading}}">
    <text>加载中...</text>
  </view>

  <!-- 添加按钮 -->
  <view class="add-profile" wx:if="{{canCreateMore}}">
    <button class="add-btn" bindtap="onAddProfile">添加档案</button>
  </view>

  <!-- 配额超限提示 -->
  <view class="quota-exceeded" wx:if="{{!canCreateMore}}">
    <text>档案数量已达上限</text>
    <button bindtap="onAddProfile">升级</button>
  </view>
</view>
```

## API 参考

### 公共方法

#### initialize()
初始化页面，加载用户信息和档案列表。

```javascript
await controller.initialize();
```

#### loadUserInfo()
加载用户信息。

```javascript
await controller.loadUserInfo();
```

#### loadProfiles(page, limit, isRefresh)
加载档案列表。

**参数：**
- `page` (number): 页码，默认1
- `limit` (number): 每页数量，默认20
- `isRefresh` (boolean): 是否为刷新操作，默认false

```javascript
await controller.loadProfiles(1, 20, true);
```

#### refreshProfiles()
刷新档案列表。

```javascript
await controller.refreshProfiles();
```

#### loadMoreProfiles()
加载更多档案。

```javascript
await controller.loadMoreProfiles();
```

#### selectProfile(profileId)
选择档案。

**参数：**
- `profileId` (string): 档案ID

```javascript
await controller.selectProfile('profile123');
```

#### deleteProfile(profileId)
删除档案（带确认对话框）。

**参数：**
- `profileId` (string): 档案ID

```javascript
await controller.deleteProfile('profile123');
```

#### editProfile(profileId)
编辑档案。

**参数：**
- `profileId` (string): 档案ID

```javascript
controller.editProfile('profile123');
```

#### addProfile()
添加新档案。

```javascript
controller.addProfile();
```

#### showQuotaExceededDialog()
显示配额超限对话框。

```javascript
controller.showQuotaExceededDialog();
```

### 生命周期方法

#### onShow()
页面显示时的处理。

```javascript
controller.onShow();
```

#### onHide()
页面隐藏时的处理。

```javascript
controller.onHide();
```

#### onUnload()
页面卸载时的清理。

```javascript
controller.onUnload();
```

#### onPullDownRefresh()
下拉刷新处理。

```javascript
controller.onPullDownRefresh();
```

#### onReachBottom()
上拉触底处理。

```javascript
controller.onReachBottom();
```

## 事件系统

ProfileController 使用 EventBus 处理各种事件：

### 监听的事件

- `PROFILE_EVENTS.PROFILE_SELECTED`: 档案选中事件
- `PROFILE_EVENTS.PROFILE_LIST_REFRESH`: 档案列表刷新事件
- `SYSTEM_EVENTS.PROFILE_MANAGER_READY`: ProfileManager初始化完成事件

### 触发的事件

- `PROFILE_EVENTS.PROFILE_SELECTED`: 档案选中时触发
- `PROFILE_EVENTS.PROFILE_LIST_REFRESH`: 档案列表刷新时触发

## 数据流

1. **初始化阶段**：
   - 创建控制器实例
   - 调用 `initialize()` 方法
   - 并行加载用户信息和档案列表

2. **用户交互**：
   - 用户点击档案 → `selectProfile()`
   - 用户删除档案 → `deleteProfile()`
   - 用户编辑档案 → `editProfile()`
   - 用户添加档案 → `addProfile()`

3. **数据更新**：
   - 通过 `ProfileManager` 管理档案数据
   - 通过 `_setData()` 更新页面数据
   - 通过 `EventBus` 通知其他组件

## 错误处理

ProfileController 继承自 BaseController，具有完整的错误处理机制：

- 统一的错误提示
- 详细的错误日志
- 优雅的降级处理

## 注意事项

1. **页面实例**：控制器需要页面实例来更新数据，确保在 `onLoad` 中创建控制器
2. **事件清理**：在 `onUnload` 中调用控制器的 `onUnload` 方法清理事件监听
3. **数据同步**：使用 `ProfileManager` 确保数据一致性
4. **配额检查**：在添加档案前会检查用户配额
5. **错误处理**：所有异步操作都有错误处理，不会导致页面崩溃

## 依赖关系

- `BaseController`: 基础控制器类
- `UserService`: 用户服务
- `ProfileService`: 档案服务
- `ProfileManager`: 档案管理器
- `EventBus`: 事件总线
- `ProfileBean`: 档案数据Bean
- `UserBean`: 用户数据Bean
