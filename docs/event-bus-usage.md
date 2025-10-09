# EventBus 事件总线使用指南

## 概述

EventBus 是项目中的全局事件总线，用于实现页面间、组件间的解耦通信。为了避免事件名称混乱和拼写错误，所有事件类型都统一定义在 `miniprogram/utils/eventTypes.js` 中。

## 事件类型定义

### 用户相关事件 (USER_EVENTS)
- `USER_INFO_UPDATED`: 用户信息更新事件
- `USER_LOGIN`: 用户登录事件
- `USER_LOGOUT`: 用户登出事件
- `USER_PERMISSION_CHANGED`: 用户权限变更事件

### 档案相关事件 (PROFILE_EVENTS)
- `PROFILE_CREATED`: 档案创建事件
- `PROFILE_UPDATED`: 档案更新事件
- `PROFILE_DELETED`: 档案删除事件
- `PROFILE_SELECTED`: 档案选中事件
- `PROFILE_LIST_REFRESH`: 档案列表刷新事件
- `PROFILE_DATA_LOADED`: 档案数据加载完成事件

### 系统相关事件 (SYSTEM_EVENTS)
- `PROFILE_MANAGER_READY`: ProfileManager初始化完成事件
- `APP_READY`: 应用启动完成事件
- `NETWORK_STATUS_CHANGED`: 网络状态变化事件
- `CACHE_CLEARED`: 缓存清理事件

### 卡牌相关事件 (CARD_EVENTS)
- `CARD_DATA_UPDATED`: 卡牌数据更新事件
- `CARD_IMAGE_LOADED`: 卡牌图片加载完成事件
- `CARD_SELECTED`: 卡牌选择事件

### 页面相关事件 (PAGE_EVENTS)
- `PAGE_SHOW`: 页面显示事件
- `PAGE_HIDE`: 页面隐藏事件
- `PAGE_DATA_REFRESH`: 页面数据刷新事件

## 使用方法

### 1. 引入事件类型常量

```javascript
const { PROFILE_EVENTS, USER_EVENTS, SYSTEM_EVENTS } = require('../../utils/eventTypes');
const eventBus = require('../../utils/eventBus');
```

### 2. 监听事件

```javascript
// 在页面加载时监听事件
onLoad() {
  eventBus.on(PROFILE_EVENTS.PROFILE_SELECTED, this.handleProfileSelected.bind(this));
  eventBus.on(PROFILE_EVENTS.PROFILE_LIST_REFRESH, this.handleProfileListRefresh.bind(this));
}

// 在页面卸载时清理事件监听
onUnload() {
  eventBus.off(PROFILE_EVENTS.PROFILE_SELECTED, this.handleProfileSelected);
  eventBus.off(PROFILE_EVENTS.PROFILE_LIST_REFRESH, this.handleProfileListRefresh);
}
```

### 3. 触发事件

```javascript
// 触发档案选中事件
eventBus.emit(PROFILE_EVENTS.PROFILE_SELECTED, {
  profileId: 'profile123'
});

// 触发档案列表刷新事件
eventBus.emit(PROFILE_EVENTS.PROFILE_LIST_REFRESH);
```

## 最佳实践

### 1. 始终使用事件常量
❌ **错误做法**：
```javascript
eventBus.emit('selectProfile', data);
eventBus.on('profileCreated', callback);
```

✅ **正确做法**：
```javascript
eventBus.emit(PROFILE_EVENTS.PROFILE_SELECTED, data);
eventBus.on(PROFILE_EVENTS.PROFILE_CREATED, callback);
```

### 2. 及时清理事件监听
在页面卸载时，必须清理所有事件监听，避免内存泄漏：

```javascript
onUnload() {
  // 清理所有相关的事件监听
  eventBus.off(PROFILE_EVENTS.PROFILE_SELECTED, this.handleProfileSelected);
  eventBus.off(PROFILE_EVENTS.PROFILE_LIST_REFRESH, this.handleProfileListRefresh);
}
```

### 3. 使用 bind 绑定 this 上下文
```javascript
// 正确：使用 bind 绑定 this
eventBus.on(PROFILE_EVENTS.PROFILE_SELECTED, this.handleProfileSelected.bind(this));

// 错误：直接传递方法引用，this 上下文会丢失
eventBus.on(PROFILE_EVENTS.PROFILE_SELECTED, this.handleProfileSelected);
```

### 4. 事件参数规范
事件参数应该是一个对象，包含必要的上下文信息：

```javascript
// 档案选中事件
eventBus.emit(PROFILE_EVENTS.PROFILE_SELECTED, {
  profileId: 'profile123',
  profileData: profileData,
  source: 'profilePage'
});

// 档案更新事件
eventBus.emit(PROFILE_EVENTS.PROFILE_UPDATED, {
  profileId: 'profile123',
  updateData: {
    name: '新名称',
    updatedAt: new Date()
  }
});
```

### 5. 错误处理
EventBus 内置了错误处理机制，但建议在事件处理函数中也添加 try-catch：

```javascript
handleProfileSelected(data) {
  try {
    console.log('档案选中:', data.profileId);
    // 处理逻辑...
  } catch (error) {
    console.error('处理档案选中事件失败:', error);
  }
}
```

## 开发调试

EventBus 的调试信息由统一的配置系统控制，通过 `miniprogram/config/index.js` 中的 `debugMode` 配置：

```javascript
// miniprogram/config/index.js
export const config = {
  debugMode: false, // 设置为 true 开启调试信息
  // ... 其他配置
};
```

当 `debugMode: true` 时，EventBus 会提供详细的调试信息：

- 事件监听时会记录事件名称和分类
- 事件触发时会记录事件名称、分类和参数
- 未知事件名称会显示警告
- 没有监听器的事件会显示警告

当 `debugMode: false` 时，只保留错误处理功能，不显示调试日志。

## 添加新事件

如果需要添加新的事件类型，请按以下步骤操作：

1. 在 `miniprogram/utils/eventTypes.js` 中添加新的事件常量
2. 更新本文档，添加新事件的说明
3. 在相关页面中使用新的事件常量

```javascript
// 在 eventTypes.js 中添加
const NEW_EVENTS = {
  NEW_FEATURE_READY: 'newFeatureReady'
};

// 在 EVENT_TYPES 中包含
const EVENT_TYPES = {
  ...USER_EVENTS,
  ...PROFILE_EVENTS,
  ...SYSTEM_EVENTS,
  ...CARD_EVENTS,
  ...PAGE_EVENTS,
  ...NEW_EVENTS  // 添加新的事件
};
```

## 注意事项

1. **禁止硬编码事件名称**：所有事件名称必须使用常量定义
2. **事件命名规范**：使用大写下划线分隔的命名方式
3. **及时清理监听**：避免内存泄漏
4. **参数类型一致**：相同事件在不同地方触发时，参数结构应保持一致
5. **避免循环触发**：注意事件触发的逻辑，避免无限循环

## 当前使用情况统计

根据代码分析，当前项目中共使用了以下事件：

- **用户事件**: `USER_INFO_UPDATED` (2处使用)
- **档案事件**: `PROFILE_CREATED`, `PROFILE_UPDATED`, `PROFILE_DELETED`, `PROFILE_SELECTED`, `PROFILE_LIST_REFRESH` (共8处使用)
- **系统事件**: `PROFILE_MANAGER_READY` (2处使用)

总计：**12处** eventBus 使用，分布在4个文件中：
- `miniprogram/app.js`
- `miniprogram/pages/profile/index.js`
- `miniprogram/pages/addProfile/index.js`
- `miniprogram/pages/card/index.js`
