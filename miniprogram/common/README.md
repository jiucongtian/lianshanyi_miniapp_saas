# Common 公共模块

## BaseClass - 所有类的顶层基类

### 概述

`BaseClass` 是整个小程序客户端的顶层基类，提供所有类共用的基础功能。项目中的所有类都应该直接或间接继承这个基类。

### 继承关系

```
BaseClass (顶层基类)
├── BaseService (服务层基类)
│   ├── UserService (用户服务)
│   └── ProfileService (档案服务)
│
├── BaseController (控制器层基类)
│   ├── ProfileController (档案控制器)
│   ├── CardController (卡牌控制器)
│   ├── AddProfileController (添加档案控制器)
│   ├── MineController (我的页面控制器)
│   └── RegisterController (注册控制器)
│
├── BaseBean (数据Bean基类)
│   ├── UserBean (用户数据Bean)
│   ├── ProfileBean (档案数据Bean)
│   └── BaziBean (八字数据Bean)
│
└── ResponseBean (云函数响应Bean)
```

### 核心功能

#### 1. 统一日志记录

所有继承BaseClass的类都可以使用统一的日志方法，自动带类名前缀：

```javascript
class MyService extends BaseClass {
  doSomething() {
    this._log('执行操作');         // [MyService] 执行操作
    this._info('信息日志');         // [MyService][时间戳] 信息日志
    this._warn('警告信息');         // [MyService]⚠️ 警告信息
    this._error('错误信息', error); // [MyService]❌ 错误信息
    this._debug('调试信息');        // [MyService][DEBUG] 调试信息（仅调试模式）
  }
}
```

#### 2. 性能监控

提供简单易用的性能监控功能：

```javascript
class MyService extends BaseClass {
  async loadData() {
    const monitorId = this._startPerformanceMonitor('loadData');
    
    // 执行耗时操作
    await this.fetchData();
    
    const duration = this._endPerformanceMonitor(monitorId);
    // 自动记录执行时长，超过3秒会有警告
  }
}
```

#### 3. 工具方法

提供常用的工具方法：

```javascript
// 深拷贝
const cloned = this._deepClone(originalObject);

// 安全的JSON解析
const data = this._safeJsonParse(jsonString, defaultValue);

// 延迟执行
await this._delay(1000); // 延迟1秒

// 重试机制
const result = await this._retryAsync(async () => {
  return await somethingMayFail();
}, 3, 1000); // 重试3次，每次延迟1秒

// 安全执行（不抛出异常）
const result = await this._safeExecuteAsync(async () => {
  return await riskyOperation();
}, defaultValue);
```

#### 4. 数据验证

提供基础的数据验证方法：

```javascript
// 检查是否为空
if (this._isEmpty(value)) { }

// 检查是否为有效对象
if (this._isValidObject(obj)) { }

// 检查是否为有效数组
if (this._isValidArray(arr)) { }
```

#### 5. 实例管理

每个实例都有唯一的ID和生命周期追踪：

```javascript
// 获取实例ID
const id = this.getInstanceId(); // MyService_1234567890_abc123

// 获取创建时间
const createdAt = this.getCreatedAt();

// 获取存活时间
const lifetime = this.getLifetime(); // 毫秒

// 打印类信息（调试用）
this._printInfo();

// 销毁实例（清理资源）
this.destroy();
```

### 使用示例

#### 创建新的Service类

```javascript
const { BaseService } = require('../services/BaseService');

class MyService extends BaseService {
  constructor() {
    super(); // 必须调用super()
  }

  async getData() {
    this._log('开始获取数据');
    
    try {
      const result = await this.callFunction('myFunction', { id: 1 });
      
      if (result.success) {
        this._log('数据获取成功');
        return result.data;
      } else {
        this._error('数据获取失败', result.error);
        return null;
      }
    } catch (error) {
      this._error('异常', error);
      throw error;
    }
  }
}

module.exports = { MyService };
```

#### 创建新的Controller类

```javascript
const { BaseController } = require('./BaseController');

class MyController extends BaseController {
  constructor(page) {
    super(page); // 必须传入page实例
  }

  async initialize() {
    this._log('初始化控制器');
    
    const monitorId = this._startPerformanceMonitor('initialize');
    
    await this.loadData();
    
    this._endPerformanceMonitor(monitorId);
  }

  async loadData() {
    this._showLoading('加载中...');
    
    try {
      const data = await service.getData();
      this._setData({ data });
      this._showSuccess('加载成功');
    } catch (error) {
      this._handleError(error, '加载数据');
    } finally {
      this._hideLoading();
    }
  }
}

module.exports = { MyController };
```

#### 创建新的Bean类

```javascript
const { BaseBean } = require('./BaseBean');

class MyBean extends BaseBean {
  constructor(data) {
    super(data); // 必须调用super(data)
    
    // 使用_getField方法提取字段（带类型检查和默认值）
    this.id = this._getField(this.data, 'id', '', 'string');
    this.name = this._getField(this.data, 'name', '', 'string');
    this.age = this._getField(this.data, 'age', 0, 'number');
    
    // 执行验证
    this._validate();
  }

  _validate() {
    // 使用BaseBean提供的验证方法
    this._validateRequiredField('id', this.id);
    this._validateRequiredField('name', this.name);
    this._validateFieldRange('age', this.age, 0, 150);
    
    this._isValidated = true;
  }

  // 业务方法
  getDisplayName() {
    return `${this.name} (${this.age}岁)`;
  }
}

module.exports = { MyBean };
```

### 调试模式

在 `app.js` 的 `globalData` 中设置 `debugMode` 为 `true` 可以启用调试日志：

```javascript
// app.js
App({
  globalData: {
    debugMode: true // 启用调试模式
  }
});
```

启用后，所有 `this._debug()` 的日志都会输出。

### 最佳实践

1. **所有新类都应该继承对应的基类**
   - Service类继承BaseService
   - Controller类继承BaseController
   - Bean类继承BaseBean
   - 其他工具类可以直接继承BaseClass

2. **构造函数中必须调用super()**
   ```javascript
   constructor() {
     super(); // 或 super(data) 或 super(page)
   }
   ```

3. **使用统一的日志方法**
   - 不要直接使用 `console.log`
   - 使用 `this._log()`, `this._error()` 等方法

4. **利用性能监控追踪关键操作**
   - 对耗时操作使用性能监控
   - 超过3秒的操作会自动警告

5. **使用工具方法避免重复代码**
   - 使用 `_deepClone`, `_safeJsonParse` 等工具方法
   - 使用 `_retryAsync`, `_safeExecuteAsync` 处理异步操作

6. **合理使用日志级别**
   - `_log`: 普通日志
   - `_info`: 信息日志（带时间戳）
   - `_warn`: 警告
   - `_error`: 错误（会记录错误对象和堆栈）
   - `_debug`: 调试日志（仅调试模式输出）

### 注意事项

1. BaseClass是抽象基类，不应该直接实例化
2. 子类可以重写BaseClass的方法，但要注意调用 `super.method()` 以保持功能完整
3. 性能监控数据会保存在内存中，记得在适当时候调用 `_clearPerformanceMetrics()` 清理
4. 实例销毁时应该调用 `destroy()` 方法进行清理

## 扩展BaseClass

如果需要为BaseClass添加新功能，请遵循以下原则：

1. 新功能必须是通用的，适用于所有类
2. 私有方法以 `_` 开头
3. 添加完整的JSDoc注释
4. 更新本README文档
5. 通知团队成员新增的功能

## 相关文档

- [BaseService 文档](../services/README.md)
- [BaseController 文档](../controllers/README.md)
- [BaseBean 文档](../beans/README.md)

