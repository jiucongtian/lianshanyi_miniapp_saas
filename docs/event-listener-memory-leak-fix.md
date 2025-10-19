# 事件监听器内存泄漏修复

## 问题描述

在2025-10-19发现，档案创建/更新后会触发多次"用户信息加载成功"日志（8次），导致性能问题。

## 问题根源

### 错误代码模式

```javascript
// 绑定时使用 bind 创建新的函数引用
_bindEventHandlers() {
  eventBus.on(PROFILE_EVENTS.PROFILE_LIST_REFRESH, this._handleProfileListRefreshEvent.bind(this));
}

// 解绑时使用原始函数引用（与绑定时的引用不同！）
onUnload() {
  eventBus.off(PROFILE_EVENTS.PROFILE_LIST_REFRESH, this._handleProfileListRefreshEvent);
}
```

### 问题分析

1. **`.bind(this)` 每次调用都会创建一个新的函数对象**
2. **绑定时的函数引用** ≠ **解绑时的函数引用**
3. `eventBus.off()` 无法找到匹配的监听器，解绑失败
4. 每次打开页面都会累积新的监听器
5. 关闭页面时监听器无法移除，导致内存泄漏
6. 事件触发时，所有累积的监听器都会执行

### 影响范围

以下 Controller 都存在此问题：
- `AddProfileController`
- `ProfileController` 
- `CardController`

## 解决方案

### 正确代码模式

```javascript
// 绑定时保存 bind 后的函数引用
_bindEventHandlers() {
  // 保存绑定后的函数引用
  this._boundHandlers = {
    profileListRefresh: this._handleProfileListRefreshEvent.bind(this)
  };
  
  // 使用保存的引用进行绑定
  eventBus.on(PROFILE_EVENTS.PROFILE_LIST_REFRESH, this._boundHandlers.profileListRefresh);
}

// 解绑时使用相同的引用
onUnload() {
  // 使用保存的引用进行解绑
  if (this._boundHandlers && this._boundHandlers.profileListRefresh) {
    eventBus.off(PROFILE_EVENTS.PROFILE_LIST_REFRESH, this._boundHandlers.profileListRefresh);
  }
}
```

### 修复文件列表

- ✅ `miniprogram/controllers/AddProfileController.js`
- ✅ `miniprogram/controllers/ProfileController.js`
- ✅ `miniprogram/controllers/CardController.js`

## 测试验证

修复后应该验证：

1. **打开/关闭页面多次**
   - 打开 addProfile 页面
   - 关闭页面
   - 重复5-10次

2. **创建/更新档案**
   - 创建新档案或更新现有档案
   - 观察日志中"用户信息加载成功"的次数
   - **预期：只打印1次**
   - **修复前：打印多次（累积的监听器数量）**

3. **内存检查**
   - 使用微信开发者工具的性能监控
   - 观察内存是否随页面打开/关闭而持续增长
   - **预期：内存应该在页面关闭后被释放**

## 预防措施

### 开发规范

1. **总是保存 bind 后的函数引用**
   ```javascript
   this._boundHandlers = {
     eventName: this._handleEvent.bind(this)
   };
   ```

2. **绑定和解绑使用相同的引用**
   ```javascript
   // 绑定
   eventBus.on(EVENT_TYPE, this._boundHandlers.eventName);
   
   // 解绑
   eventBus.off(EVENT_TYPE, this._boundHandlers.eventName);
   ```

3. **在 onUnload 中清理所有事件监听**
   ```javascript
   onUnload() {
     // 清理事件监听
     if (this._boundHandlers) {
       Object.keys(this._boundHandlers).forEach(key => {
         eventBus.off(EVENT_TYPE, this._boundHandlers[key]);
       });
     }
     super.onUnload();
   }
   ```

### 替代方案

也可以考虑以下方案：

1. **在 constructor 中一次性 bind**
   ```javascript
   constructor(page) {
     super(page);
     // 在构造函数中绑定，this._handleEvent 始终是同一个引用
     this._handleEvent = this._handleEvent.bind(this);
   }
   
   _bindEventHandlers() {
     // 直接使用，不需要再 bind
     eventBus.on(EVENT_TYPE, this._handleEvent);
   }
   
   onUnload() {
     // 解绑
     eventBus.off(EVENT_TYPE, this._handleEvent);
   }
   ```

2. **使用箭头函数（需要 Babel 支持）**
   ```javascript
   class MyController {
     // 箭头函数自动绑定 this
     _handleEvent = (data) => {
       // 处理事件
     }
     
     _bindEventHandlers() {
       // 不需要 bind
       eventBus.on(EVENT_TYPE, this._handleEvent);
     }
     
     onUnload() {
       // 解绑
       eventBus.off(EVENT_TYPE, this._handleEvent);
     }
   }
   ```

## 相关问题

- 所有使用 EventBus 的地方都需要注意这个问题
- 如果发现事件被多次触发，首先检查是否存在内存泄漏
- 使用开发者工具的 Console 过滤器快速定位重复日志

## 参考链接

- [EventBus实现](../miniprogram/utils/eventBus.js)
- [事件类型定义](../miniprogram/utils/eventTypes.js)
- [BaseController](../miniprogram/controllers/BaseController.js)

