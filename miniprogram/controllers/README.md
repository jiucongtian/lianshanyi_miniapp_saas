# Controllers 控制器层

## 概述

控制器层负责处理页面逻辑，协调Service层和View层，处理用户交互事件。采用MVC架构模式，将业务逻辑从页面中分离出来。

## 目录结构

```
controllers/
├── BaseController.js    # 控制器基类
├── ProfileController.js # 档案管理控制器
├── CardController.js    # 卡牌展示控制器
└── README.md           # 使用文档
```

## BaseController 基类

### 功能特性

BaseController提供了所有控制器通用的辅助方法，包括：

- **用户交互提示**：成功、错误、加载、确认等提示
- **页面数据操作**：数据更新、获取、状态管理
- **导航操作**：页面跳转、返回、TabBar切换
- **工具方法**：防抖、节流、时间格式化等
- **错误处理**：统一错误处理和API响应处理
- **生命周期辅助**：页面生命周期管理

### 使用方法

#### 1. 继承BaseController

```javascript
// controllers/ProfileController.js
const { BaseController } = require('./BaseController');

class ProfileController extends BaseController {
  constructor(page) {
    super(page); // 必须调用父类构造函数
  }
  
  // 实现具体的业务逻辑
}
```

#### 2. 在页面中使用

```javascript
// pages/profile/index.js
const { ProfileController } = require('../../controllers/ProfileController');

Page({
  data: {
    profileList: [],
    loading: false
  },
  
  onLoad(options) {
    // 创建控制器实例
    this.controller = new ProfileController(this);
    // 初始化页面
    this.controller.initialize();
  },
  
  // 事件处理直接调用控制器方法
  onProfileTap(e) {
    const profileId = e.currentTarget.dataset.id;
    this.controller.selectProfile(profileId);
  }
});
```

### API 参考

#### 用户交互提示

| 方法名 | 参数 | 说明 |
|--------|------|------|
| `_showSuccess(message, duration)` | message: 提示消息, duration: 显示时长 | 显示成功提示 |
| `_showError(message, duration)` | message: 错误消息, duration: 显示时长 | 显示错误提示 |
| `_showMessage(message, duration)` | message: 提示消息, duration: 显示时长 | 显示普通提示 |
| `_showLoading(title, mask)` | title: 加载文字, mask: 是否遮罩 | 显示加载提示 |
| `_hideLoading()` | 无 | 隐藏加载提示 |
| `_confirm(title, content, confirmText, cancelText)` | 对话框参数 | 显示确认对话框 |
| `_prompt(title, placeholder, defaultValue)` | 输入框参数 | 显示输入对话框 |
| `_showActionSheet(itemList)` | itemList: 菜单项数组 | 显示操作菜单 |

#### 页面数据操作

| 方法名 | 参数 | 说明 |
|--------|------|------|
| `_setData(data, callback)` | data: 数据对象, callback: 回调函数 | 更新页面数据 |
| `_getData(key)` | key: 数据键名 | 获取页面数据 |
| `_setLoading(loading, loadingText)` | loading: 是否加载, loadingText: 加载文字 | 设置加载状态 |

#### 导航操作

| 方法名 | 参数 | 说明 |
|--------|------|------|
| `_navigateTo(url, params)` | url: 目标路径, params: 参数对象 | 页面跳转 |
| `_redirectTo(url, params)` | url: 目标路径, params: 参数对象 | 页面重定向 |
| `_navigateBack(delta)` | delta: 返回层数 | 返回上一页 |
| `_switchTab(url)` | url: TabBar路径 | 切换TabBar页面 |

#### 工具方法

| 方法名 | 参数 | 说明 |
|--------|------|------|
| `_debounce(func, delay)` | func: 函数, delay: 延迟时间 | 防抖函数 |
| `_throttle(func, delay)` | func: 函数, delay: 延迟时间 | 节流函数 |
| `_formatTime(timestamp)` | timestamp: 时间戳 | 格式化时间 |
| `_buildQueryString(params)` | params: 参数对象 | 构建查询字符串 |

#### 错误处理

| 方法名 | 参数 | 说明 |
|--------|------|------|
| `_handleError(error, context)` | error: 错误对象, context: 上下文 | 统一错误处理 |
| `_handleApiError(response, defaultMessage)` | response: API响应, defaultMessage: 默认消息 | 处理API错误 |

### 使用示例

#### 基本使用

```javascript
class ProfileController extends BaseController {
  constructor(page) {
    super(page);
  }
  
  async loadProfiles() {
    try {
      this._showLoading('加载档案中...');
      
      const response = await profileService.getProfiles();
      
      if (response.success) {
        this._setData({
          profileList: response.data,
          loading: false
        });
        this._showSuccess('加载成功');
      } else {
        this._handleApiError(response, '加载档案失败');
      }
    } catch (error) {
      this._handleError(error, 'loadProfiles');
    } finally {
      this._hideLoading();
    }
  }
  
  async deleteProfile(profileId) {
    const confirmed = await this._confirm('确认删除', '删除后无法恢复');
    if (!confirmed) return;
    
    try {
      this._showLoading('删除中...');
      
      const response = await profileService.deleteProfile(profileId);
      
      if (response.success) {
        this._showSuccess('删除成功');
        await this.loadProfiles(); // 重新加载列表
      } else {
        this._handleApiError(response, '删除失败');
      }
    } catch (error) {
      this._handleError(error, 'deleteProfile');
    } finally {
      this._hideLoading();
    }
  }
}
```

#### 防抖和节流使用

```javascript
class SearchController extends BaseController {
  constructor(page) {
    super(page);
    
    // 创建防抖搜索函数
    this.debouncedSearch = this._debounce(this.performSearch.bind(this), 500);
  }
  
  onSearchInput(e) {
    const keyword = e.detail.value;
    this.debouncedSearch(keyword);
  }
  
  async performSearch(keyword) {
    if (!keyword.trim()) return;
    
    try {
      this._setLoading(true, '搜索中...');
      
      const response = await searchService.search(keyword);
      
      if (response.success) {
        this._setData({
          searchResults: response.data,
          loading: false
        });
      } else {
        this._handleApiError(response, '搜索失败');
      }
    } catch (error) {
      this._handleError(error, 'performSearch');
    } finally {
      this._setLoading(false);
    }
  }
}
```

#### 页面导航使用

```javascript
class ProfileController extends BaseController {
  // 跳转到档案详情页
  goToProfileDetail(profileId) {
    this._navigateTo('/pages/profileDetail/index', {
      profileId: profileId
    });
  }
  
  // 跳转到编辑页面
  goToEditProfile(profileId) {
    this._navigateTo('/pages/editProfile/index', {
      profileId: profileId,
      mode: 'edit'
    });
  }
  
  // 返回上一页
  goBack() {
    this._navigateBack();
  }
  
  // 切换到首页
  goToHome() {
    this._switchTab('/pages/index/index');
  }
}
```

### 最佳实践

1. **单一职责**：每个控制器只负责一个页面的逻辑
2. **轻量级页面**：页面文件只处理生命周期和事件绑定
3. **业务逻辑分离**：所有业务逻辑都在控制器中实现
4. **错误处理**：使用统一的错误处理方法
5. **加载状态管理**：合理使用加载提示，避免重复显示
6. **代码复用**：将通用逻辑提取到BaseController中

### 注意事项

1. 构造函数必须调用`super(page)`
2. 使用`this.page`访问页面实例
3. 私有方法以下划线开头（如`_showSuccess`）
4. 异步操作要正确处理错误和加载状态
5. 页面卸载时会自动清理加载提示
