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

#### 1. 统一日志记录（集成Logger系统）

BaseClass已经集成了项目的统一日志管理系统（Logger），所有继承BaseClass的类都可以使用统一的日志方法：

```javascript
class MyService extends BaseClass {
  doSomething() {
    this._log('执行操作');         // [INFO] [network] [MyService] 执行操作
    this._info('信息日志');         // [INFO] [network] [MyService] 信息日志
    this._warn('警告信息');         // [WARN] [network] [MyService] 警告信息
    this._error('错误信息', error); // [ERROR] [network] [MyService] 错误信息
    this._debug('调试信息');        // [DEBUG] [network] [MyService] 调试信息（仅调试模式）
  }
}
```

**特点**：
- 自动根据类名推断日志模块名（user、profile、card、network等）
- 集成本地存储，按天分组保留30天
- 自动过滤敏感信息（password、token、openid等）
- 支持开发/生产模式切换
- 自动获取调用栈信息（类名、方法名、行号）

**日志模块自动映射**：
- UserService、UserBean → `user` 模块
- ProfileService、ProfileController → `profile` 模块
- CardController → `card` 模块
- BaziBean → `bazi` 模块
- BaseService → `network` 模块
- 其他 → `system` 模块

**手动设置模块名**：
```javascript
constructor() {
  super();
  this._setLogModule('custom'); // 手动指定模块名
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

BaseClass使用的Logger系统通过配置文件控制调试模式：

```javascript
// miniprogram/config/index.js
export const config = {
  debugMode: true,  // true=开发模式, false=生产模式
  
  logger: {
    development: {
      console: true,  // 开发模式输出到控制台
      levels: ['DEBUG', 'INFO', 'WARN', 'ERROR']
    },
    production: {
      console: false,  // 生产模式不输出到控制台
      levels: ['WARN', 'ERROR']  // 只记录警告和错误
    }
  }
};
```

**开发模式（debugMode: true）**：
- 所有级别日志都会记录
- 输出到控制台
- 包含完整时间戳和调用栈信息

**生产模式（debugMode: false）**：
- 只记录WARN和ERROR
- 不输出到控制台（仅本地存储）
- DEBUG和INFO日志直接返回（零开销）

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
   - ❌ 不要直接使用 `console.log`、`console.error` 等
   - ✅ 使用 `this._log()`, `this._error()` 等方法
   - 自动集成Logger系统的所有功能

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

- [Logger日志系统文档](../utils/logger/README.md)
- [BaseService 文档](../services/README.md)
- [BaseController 文档](../controllers/README.md)
- [BaseBean 文档](../beans/README.md)


