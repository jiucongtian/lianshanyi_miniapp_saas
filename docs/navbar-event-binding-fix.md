# t-navbar 返回按钮事件绑定修复

## 问题描述

用户在 profile 页面进入 addProfile 页面编辑档案后，点击返回按钮时，期望返回到 profile 页面，但实际行为不符合预期。

## 问题分析

### 1. 症状

从日志分析发现：
```
[2025-11-23 22:59:22.026] [AddProfileController:onUnload] 页面卸载
[2025-11-23 22:59:22.029] [ProfileController:onShow] 页面显示
```

虽然日志显示确实返回到了 profile 页面，但 addProfile 页面中 `goBack` 方法的详细日志（如 "========== 开始处理返回按钮点击 =========="）**没有被输出**。

### 2. 根本原因

**TDesign navbar 组件的事件绑定不正确**

- **错误写法**：`bind:go-back="goBack"`
- **正确写法**：`bind:click-left="goBack"`

TDesign 的 navbar 组件的左侧箭头点击事件名是 `click-left`，而不是 `go-back`。

使用错误的事件名导致：
1. 自定义的 `goBack` 方法没有被调用
2. t-navbar 组件使用了默认的返回行为（可能直接调用 `wx.navigateBack()`）
3. 页面返回逻辑没有按照自定义的 `goBack` 方法执行

### 3. 页面导航流程

正常的页面导航流程应该是：
```
card (tab页面) 
  -> wx.navigateTo -> profile (普通页面)
  -> wx.navigateTo -> addProfile (普通页面)
  -> goBack (自定义返回逻辑) -> profile (普通页面)
```

页面栈变化：
1. `[card]` - card tab页面
2. `[card, profile]` - 跳转到 profile
3. `[card, profile, addProfile]` - 跳转到 addProfile
4. `[card, profile]` - 返回到 profile

### 4. addProfile 自定义 goBack 逻辑的必要性

addProfile 页面实现了复杂的 `goBack` 逻辑（170-364行），主要功能：

1. **检查页面栈状态**：详细输出当前页面栈信息，便于调试
2. **智能返回策略**：
   - 如果页面栈中有 profile 页面，计算正确的 delta 并 navigateBack
   - 如果 card 页面在 profile 之前（由于 switchTab 导致），使用 redirectTo 确保返回正确
   - 如果页面栈中没有 profile，直接 redirectTo 跳转
3. **多重降级方案**：navigateBack 失败时尝试 redirectTo，再失败尝试 navigateTo
4. **详细日志记录**：每一步操作都有完整的日志，便于排查问题

**为什么需要这么复杂的逻辑？**

因为 profile 页面不是 tab 页面，而 card 是 tab 页面。在 profile 页面中，用户点击档案项会触发 `onProfileTap` 方法，使用 `wx.switchTab` 跳转到 card 页面。**`switchTab` 会清空所有非 tab 页面的页面栈**，这可能导致页面栈状态异常。

自定义的 `goBack` 方法会检测这种情况并采取正确的返回策略，确保无论页面栈处于什么状态，都能正确返回到 profile 页面。

## 修复方案

### 修改文件

**1. pages/addProfile/index.wxml**
```xml
<!-- 修改前 -->
<t-navbar title="{{pageMode === 'edit' ? '编辑个人信息' : '创建个人信息'}}" left-arrow bind:go-back="goBack" />

<!-- 修改后 -->
<t-navbar title="{{pageMode === 'edit' ? '编辑个人信息' : '创建个人信息'}}" left-arrow bind:click-left="goBack" />
```

**2. pages/answer/index.wxml**
```xml
<!-- 修改前 -->
<t-navbar title="智慧洞见" left-arrow bind:go-back="goBack" />

<!-- 修改后 -->
<t-navbar title="智慧洞见" left-arrow bind:click-left="goBack" />
```

### TDesign Navbar 组件事件说明

| 事件名 | 说明 | 回调参数 |
|-------|------|---------|
| `bind:click-left` | 点击左侧按钮时触发 | - |
| `bind:click-right` | 点击右侧按钮时触发 | - |

**注意**：
- 没有 `bind:go-back` 事件
- 左侧返回箭头的点击事件是 `bind:click-left`
- 如果不绑定 `bind:click-left`，组件会使用默认行为（直接调用 `wx.navigateBack()`）

## 测试验证

修复后，再次执行相同的操作流程：

1. 从 card 页面进入 profile 页面
2. 在 profile 页面点击编辑按钮进入 addProfile 页面
3. 在 addProfile 页面点击返回按钮

**预期结果**：
- 控制台输出 goBack 方法的详细日志
- 正确返回到 profile 页面
- 页面栈状态符合预期

## 相关代码位置

- **addProfile 页面**：
  - WXML：`miniprogram/pages/addProfile/index.wxml`（第1行）
  - goBack 方法：`miniprogram/pages/addProfile/index.js`（第170-364行）

- **answer 页面**：
  - WXML：`miniprogram/pages/answer/index.wxml`（第1行）
  - goBack 方法：`miniprogram/pages/answer/index.js`（第127-129行）

- **profile 页面导航**：
  - onProfileTap（使用 switchTab）：`miniprogram/pages/profile/index.js`（第87-102行）
  - ProfileController.editProfile：`miniprogram/controllers/ProfileController.js`（第383-407行）

- **card 到 profile 的跳转**：
  - onProfileEntryTap：`miniprogram/pages/card/index.js`（第147-162行）

## 总结

1. **直接原因**：t-navbar 组件的事件绑定错误（`bind:go-back` 应为 `bind:click-left`）
2. **根本原因**：对 TDesign 组件 API 不熟悉，使用了错误的事件名
3. **影响范围**：addProfile 和 answer 两个页面
4. **修复方式**：将所有 `bind:go-back` 改为 `bind:click-left`
5. **预防措施**：
   - 使用组件前查阅官方文档，确认正确的 API
   - 编写代码时添加详细日志，便于排查问题
   - 测试时注意观察日志输出，确认功能正常

## 注意事项

### switchTab 对页面栈的影响

在使用 `wx.switchTab` 跳转到 tab 页面时，会**清空所有非 tab 页面的页面栈**。这意味着：

```javascript
// 假设当前页面栈：[card(tab), profile, otherPage]
wx.switchTab({
  url: '/pages/card/index'
});
// 执行后页面栈：[card(tab)]
// profile 和 otherPage 都被清空了
```

因此，在实现页面返回逻辑时，需要：
1. 检查页面栈状态
2. 根据实际情况选择合适的导航方式（navigateBack、redirectTo、navigateTo）
3. 添加降级方案，确保在各种情况下都能正确导航

这就是为什么 addProfile 页面的 `goBack` 方法实现得如此复杂的原因。

