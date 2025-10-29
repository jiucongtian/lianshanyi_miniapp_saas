# 用户未注册时页面加载问题修复

## 问题描述

在 new-bazi-cal 分支中，当用户未注册（数据库中不存在该用户记录）时，mine 页面会一直显示"加载中"状态，无法显示引导注册的界面。

## 问题原因

### 旧版本（提交 8375617）的正常行为：

```javascript
// MineController.loadUserInfo() 方法
async loadUserInfo() {
  this._setData({ loading: true, error: '' });
  
  const result = await userService.getUserInfo();
  
  if (result.success) {
    // 处理用户信息
    this._setData({ userInfo, loading: false });
  } else {
    // 失败时也设置 loading: false
    this._setData({
      error: result.error,
      loading: false
    });
  }
}
```

**关键点**：无论成功还是失败，都会设置 `loading: false`

### 新版本（new-bazi-cal）的问题行为：

```javascript
// MineController.initialize()
async initialize() {
  await this.loadUserInfo(); // BaseController 的方法
  // loadUserInfo() 返回 null 时，userInfo 为 null
}

// MineController._updateUserInfoToPage()
_updateUserInfoToPage() {
  if (!this.userInfo) {
    // 直接返回，不更新页面状态
    return; // ❌ 问题：loading 状态没有被清除
  }
  
  // 只有 userInfo 存在时才更新页面
  this._setData({
    userInfo: this.userInfo,
    loading: false  // ✓ 只在这里设置
  });
}
```

**关键问题**：
1. `BaseController.loadUserInfo()` 在用户不存在时返回 `null`
2. `MineController._updateUserInfoToPage()` 检查到 `userInfo` 为 `null` 时直接返回
3. 页面的 `loading` 状态没有被设置为 `false`
4. 导致页面一直显示加载中

## 修复方案

### 1. 修改 `MineController.initialize()` 方法

```javascript
async initialize() {
  try {
    // 设置加载状态
    this._setData({ loading: true, error: '' });
    
    // 加载用户信息
    await this.loadUserInfo();
    
    // 更新页面显示（无论用户是否存在）
    this._updateUserInfoToPage();
    
    this._log('initialize', '页面初始化完成');
  } catch (error) {
    this._error('initialize', '页面初始化失败:', error);
    // 确保加载状态被清除
    this._setData({ loading: false });
    this._handleError(error, '页面初始化');
  }
}
```

### 2. 修改 `MineController._updateUserInfoToPage()` 方法

```javascript
_updateUserInfoToPage() {
  if (!this.userInfo) {
    this._log('_updateUserInfoToPage', '用户信息为空，显示未注册状态');
    
    // 用户未注册，显示默认状态
    this._setData({
      userInfo: null,
      userTypeText: '临时用户',
      genderText: '未知',
      phoneNumberText: '未设置',
      avatarUrl: '/static/icons/default-avatar.png',
      loading: false,  // ✓ 关键：清除加载状态
      error: ''
    });
    return;
  }
  
  try {
    // 处理用户信息显示
    this._processUserInfo(this.userInfo);
    this._processAvatarCache(this.userInfo);
    
    this._setData({
      userInfo: this.userInfo,
      userTypeText: this.userTypeText,
      genderText: this.genderText,
      phoneNumberText: this.phoneNumberText,
      loading: false,
      error: ''
    });
    
    this._log('_updateUserInfoToPage', '用户信息已更新到页面');
  } catch (error) {
    this._error('_updateUserInfoToPage', '更新用户信息到页面失败:', error);
    // 即使出错，也要清除加载状态
    this._setData({ loading: false });
  }
}
```

### 3. 修改页面模板 `mine/index.wxml`

```xml
<!-- 用户名显示 -->
<text class="user-name">
  {{userInfo ? (userInfo.nickName || '未设置昵称') : '未注册用户'}}
</text>

<!-- 注册按钮显示条件 -->
<view class="action-card" wx:if="{{!userInfo || userInfo.userType === 'guest'}}">
  <!-- 未注册用户或临时用户都显示注册按钮 -->
</view>
```

### 4. 同时修复 `AddProfileController`

`AddProfileController._updateUserInfoToPage()` 也有类似问题，需要在用户信息为空时设置默认值：

```javascript
_updateUserInfoToPage() {
  if (!this.userInfo) {
    this._log('_updateUserInfoToPage', '用户信息为空，设置默认值');
    
    // 用户未注册，设置默认值
    this._setData({
      userType: 'guest',
      userTypeName: '临时用户',
      profileQuota: 3,
      usedProfiles: 0,
      canCreateMore: true
    });
    return;
  }
  
  // ... 正常处理逻辑
}
```

## 修复效果

修复后的行为：

1. 用户未注册时，页面会正确显示：
   - 加载状态会被清除（`loading: false`）
   - 显示默认头像和"未注册用户"文本
   - 显示"立即注册"按钮
   - 显示默认的基本信息（性别：未知，手机号：未设置）

2. 用户已注册时，页面会正常显示：
   - 显示用户的真实信息
   - 根据用户类型显示相应的功能

## 相关文件

修改的文件：
- `miniprogram/controllers/MineController.js`
- `miniprogram/controllers/AddProfileController.js`
- `miniprogram/pages/mine/index.wxml`

## 测试建议

1. **测试未注册用户场景**：
   - 清空用户数据库或使用新的测试账号
   - 启动小程序，切换到 mine 页面
   - 验证页面能正常显示，不会一直加载中
   - 验证显示"立即注册"按钮

2. **测试已注册用户场景**：
   - 使用已注册的账号
   - 验证页面正常显示用户信息
   - 验证根据用户类型显示相应功能

3. **测试注册流程**：
   - 从未注册状态点击"立即注册"
   - 完成注册流程
   - 返回 mine 页面验证信息正确显示

## 原理总结

**核心原则**：无论数据加载成功还是失败，都必须清除加载状态（`loading: false`），确保用户界面不会一直处于加载状态。

**设计模式**：
- 在 `initialize()` 方法中设置初始加载状态
- 在 `_updateUserInfoToPage()` 方法中无论何种情况都清除加载状态
- 使用 `try-catch-finally` 或在各个分支中都设置 `loading: false`

**注意事项**：
- 所有异步操作都要处理失败情况
- 失败时要提供合理的默认值和用户提示
- 确保页面状态始终可控，避免"卡住"的情况

