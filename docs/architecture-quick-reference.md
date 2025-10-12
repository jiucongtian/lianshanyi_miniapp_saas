# 架构规范快速参考卡片

> 📖 完整规范请查看：`.cursorrules-architecture`  
> 📋 实施计划请查看：`docs/architecture-optimization-plan.md`

---

## 🏗️ 四层架构

```
📱 View (pages/)          UI渲染、事件绑定
    ↓
🎮 Controller             页面逻辑、UI协调
    ↓
🔌 Service                API调用、错误处理
    ↓
📦 Bean                   数据模型、业务方法
    ↓
☁️  Cloud Functions        云端业务逻辑

🔄 Manager (跨层)          跨模块业务协调
```

---

## 📦 Bean 层

### ✅ 应该做
- 数据验证和格式化
- 业务判断方法（`canXXX()`, `isXXX()`, `hasXXX()`）
- 数据转换方法（`toXXX()`, `getXXX()`, `formatXXX()`）

### ❌ 不应该做
- 调用 API
- 操作 UI
- 访问全局状态

### 快速模板
```javascript
class XxxBean extends BaseBean {
  constructor(data) {
    super(data);
    this.field = this._getField(data, 'field', '', 'string');
    this._validate();
  }
  
  // 业务判断
  canDoSomething() { return ...; }
  isSomeState() { return ...; }
  
  // 数据转换
  toDisplayFormat() { return ...; }
  getFormatted() { return ...; }
}
```

---

## 🔌 Service 层

### ✅ 应该做
- 调用云函数
- 返回 `ResponseBean`
- 转换数据为 Bean
- 方法 < 20 行

### ❌ 不应该做
- 业务判断（if 判断配额、权限等）
- 操作 UI
- 复杂的数据处理

### 快速模板
```javascript
class XxxService extends BaseService {
  async getSomething() {
    const response = await this.callFunction('xxx', {
      action: 'getSomething'
    });
    
    if (response.isSuccess() && response.data) {
      response.data = new XxxBean(response.data);
    }
    
    return response;
  }
}
```

---

## 🎮 Controller 层

### ✅ 应该做
- 调用 Service 获取数据
- **使用 Bean 的业务方法**做判断
- 处理 UI 交互
- 更新页面状态

### ❌ 不应该做
- 直接实现业务规则（用 Bean 方法）
- 直接访问 Bean 私有属性
- 调用云函数（通过 Service）
- 手动格式化数据（用 Bean 方法）

### 快速模板
```javascript
class XxxController extends BaseController {
  async initialize() {
    await this.loadData();
  }
  
  async loadData() {
    const response = await xxxService.getData();
    
    if (response.isSuccess()) {
      const bean = response.data;
      
      // ✅ 使用 Bean 的方法
      this._setData({
        data: bean,
        canDo: bean.canDoSomething(),
        display: bean.getFormatted()
      });
    } else {
      this._showError(response.getError());
    }
  }
  
  async onAction() {
    const bean = this.page.data.data;
    
    // ✅ 使用 Bean 的方法判断
    if (!bean.canDoSomething()) {
      this._showError('无法执行操作');
      return;
    }
    
    // 继续处理...
  }
}
```

---

## 🔄 Manager 层

### ✅ 应该做
- 跨模块业务协调
- 全局状态管理
- 事件通知
- 通过 Service 调用 API
- 使用 Bean 的业务方法

### ❌ 不应该做
- 直接调用云函数
- 操作 UI
- 实现 Bean 的业务逻辑

---

## 🚦 开发口诀

```
Bean 判断，Service 调用，Controller 协调，Manager 跨模块

数据验证在 Bean
API 调用在 Service
业务判断用 Bean 方法
Controller 不重复实现
```

---

## 🔍 代码审查清单

### Bean 类
- [ ] 继承 BaseBean
- [ ] 使用 `_getField()` 提取字段
- [ ] 实现 `_validate()` 方法
- [ ] 有业务判断方法（`canXXX`, `isXXX`）
- [ ] 有数据转换方法（`toXXX`, `getXXX`）
- [ ] 有 JSDoc 注释
- [ ] 没有 API 调用或 UI 操作

### Service 类
- [ ] 继承 BaseService
- [ ] 只调用 API，无业务判断
- [ ] 返回 ResponseBean
- [ ] 成功时转换为 Bean
- [ ] 方法 < 20 行
- [ ] 有 JSDoc 注释

### Controller 类
- [ ] 继承 BaseController
- [ ] 通过 Service 获取数据
- [ ] 使用 Bean 的业务方法
- [ ] 不直接访问 Bean 私有属性
- [ ] 不调用云函数
- [ ] 有错误处理和加载状态

---

## ⚠️ 常见错误

### ❌ 错误 1：Service 中做业务判断

```javascript
// ❌ 不要这样
async createProfile(data) {
  const user = await this.getUserInfo();
  if (user.usedProfiles >= user.profileQuota) {
    return ResponseBean.error('配额不足');
  }
  return this.callFunction(...);
}

// ✅ 应该这样
async createProfile(data) {
  return this.callFunction('profileManagement', {
    action: 'createProfile',
    data: data
  });
}
```

判断应该在 Controller 中：
```javascript
// Controller
if (!userBean.canCreateMore()) {
  this._showError('配额不足');
  return;
}
await profileService.createProfile(data);
```

### ❌ 错误 2：Controller 手动判断和格式化

```javascript
// ❌ 不要这样
const user = this.page.data.userInfo;
if (user.profileQuota !== -1 && 
    user.usedProfiles >= user.profileQuota) {
  const quota = `${user.usedProfiles}/${user.profileQuota}`;
  this._showError(`配额不足 (${quota})`);
}

// ✅ 应该这样
const userBean = this.page.data.userInfo;
if (!userBean.canCreateMore()) {
  this._showError(`配额不足 (${userBean.getQuotaDisplay()})`);
}
```

### ❌ 错误 3：Bean 中调用 API

```javascript
// ❌ 不要这样
class UserBean extends BaseBean {
  async loadProfiles() {
    const res = await wx.cloud.callFunction(...);
    this.profiles = res.data;
  }
}

// ✅ 应该这样
// Bean 只提供判断方法
class UserBean extends BaseBean {
  hasProfiles() {
    return this.profiles && this.profiles.length > 0;
  }
}

// Controller 负责加载
class ProfileController {
  async loadProfiles() {
    const response = await profileService.getProfiles();
    // ...
  }
}
```

---

## 🎯 何时使用各层

| 场景 | 使用层 | 示例 |
|-----|-------|------|
| 判断是否可以创建 | Bean | `userBean.canCreateMore()` |
| 格式化配额显示 | Bean | `userBean.getQuotaDisplay()` |
| 判断用户类型 | Bean | `userBean.isGuest()` |
| 调用创建接口 | Service | `profileService.createProfile()` |
| 检查配额后创建 | Controller | 使用 Bean 判断 + Service 调用 |
| 切换档案（跨模块） | Manager | 涉及多个 Service 的协调 |
| 页面跳转 | Controller | `this._navigateTo()` |
| 显示提示 | Controller | `this._showError()` |

---

## 📚 重要文档

| 文档 | 用途 |
|------|------|
| `.cursorrules-architecture` | 完整的架构规范（添加到 Cursor Rules）|
| `docs/architecture-optimization-plan.md` | 详细实施计划和任务清单 |
| `docs/architecture-quick-reference.md` | 本文档，快速参考 |
| `docs/how-to-add-architecture-rules.md` | 如何添加规范到 Cursor |

---

## 🆘 需要帮助？

### 不确定逻辑放哪里？

1. **简单判断**（是/否）→ Bean 方法
2. **单模块业务** → Controller（用 Bean 方法）
3. **跨模块业务** → Manager

### 不确定是否符合规范？

问 AI：
```
请根据架构规范审查这段代码：
[粘贴代码]
```

### 需要创建新类？

问 AI：
```
请参考架构规范帮我创建一个 XxxBean 类，
包含以下字段和业务方法：[描述需求]
```

---

## 🎓 记住这些

1. **Bean 是智能的**：不只是数据容器，还有业务方法
2. **Service 是简单的**：只调用 API，不做判断
3. **Controller 是协调者**：用 Bean 的方法，不重复实现
4. **优先复用**：先看 Bean 有没有对应方法，再考虑创建新方法

---

## 📝 快速创建新功能

```bash
# 1. 分析需求
需要什么数据？需要什么业务判断？

# 2. 创建/扩展 Bean
添加业务方法（canXXX, getXXX）

# 3. 创建/扩展 Service  
添加 API 调用方法

# 4. 创建/扩展 Controller
使用 Bean 方法 + Service 调用

# 5. 测试验证
功能、边界、错误
```

---

**💡 Tip:** 将本文档加入书签，开发时随时查阅！

