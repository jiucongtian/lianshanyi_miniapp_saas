# BaseClass 公共基类实现文档

## 概述

本文档记录了小程序客户端公共基类（BaseClass）的实现和整个继承体系的构建过程。

## 实现目标

创建一个统一的公共基类 `BaseClass`，让所有类都直接或间接继承这个基类，实现：
- 统一的日志记录
- 通用的工具方法
- 性能监控功能
- 数据验证辅助
- 错误处理机制

## 继承体系

### 完整的继承关系图

```
BaseClass (顶层基类) - miniprogram/common/BaseClass.js
│
├── BaseService (服务层基类) - miniprogram/services/BaseService.js
│   ├── UserService (用户服务)
│   └── ProfileService (档案服务)
│
├── BaseController (控制器层基类) - miniprogram/controllers/BaseController.js
│   ├── ProfileController (档案控制器)
│   ├── CardController (卡牌控制器)
│   ├── AddProfileController (添加档案控制器)
│   ├── MineController (我的页面控制器)
│   └── RegisterController (注册控制器)
│
├── BaseBean (数据Bean基类) - miniprogram/beans/BaseBean.js
│   ├── UserBean (用户数据Bean)
│   ├── ProfileBean (档案数据Bean)
│   └── BaziBean (八字数据Bean)
│
└── ResponseBean (云函数响应Bean)
```

## 实现细节

### 1. BaseClass 基类

**文件位置**：`miniprogram/common/BaseClass.js`

**核心功能**：
- **统一的日志记录**（集成Logger系统）
  - _log、_info、_warn、_error、_debug
  - 自动根据类名推断模块名
  - 本地存储、敏感信息过滤
  - 调用栈自动追踪
- **性能监控**（_startPerformanceMonitor、_endPerformanceMonitor）
- **工具方法**（_deepClone、_safeJsonParse、_delay、_retryAsync等）
- **数据验证**（_isEmpty、_isValidObject、_isValidArray）
- **实例管理**（getInstanceId、getLifetime、destroy）

**设计特点**：
- 所有内部方法以 `_` 开头
- 自动获取类名用于日志前缀
- 自动生成实例ID用于调试
- 支持性能监控，超过3秒自动警告
- **集成项目的Logger日志系统**
  - 自动模块名推断（user、profile、card、network等）
  - 支持开发/生产模式
  - 本地存储30天，敏感信息自动过滤

### 2. BaseService 服务层基类

**文件位置**：`miniprogram/services/BaseService.js`

**继承关系**：`BaseService extends BaseClass`

**改进点**：
- 将所有 `console.log` 替换为 `this._log()`
- 将所有 `console.error` 替换为 `this._error()`
- 将所有 `console.warn` 替换为 `this._warn()`
- 移除了重复的 `_delay` 方法（使用BaseClass提供的）
- 使用 `this.className` 替代 `this.serviceName`

### 3. BaseController 控制器层基类

**文件位置**：`miniprogram/controllers/BaseController.js`

**继承关系**：`BaseController extends BaseClass`

**改进点**：
- 继承BaseClass获得日志和工具方法
- 移除了重复的 `_debounce`、`_throttle`、`_formatTime` 方法
- 统一使用BaseClass的日志方法
- 保留了页面交互相关的专有方法

### 4. BaseBean 数据Bean基类

**文件位置**：`miniprogram/beans/BaseBean.js`

**继承关系**：`BaseBean extends BaseClass`

**核心功能**：
- 数据规范化（_normalizeData）
- 字段提取（_getField、_getNestedField）
- 数据验证（_validateRequiredField、_validateFieldType等）
- 数据转换（toObject、toJSON、clone、merge）
- 验证管理（hasValidationErrors、getValidationErrors、isValid）

**设计特点**：
- 自动处理null/undefined数据
- 提供类型检查和默认值
- 统一的验证错误收集机制
- 支持嵌套字段提取

### 5. ResponseBean 响应Bean

**文件位置**：`miniprogram/beans/ResponseBean.js`

**继承关系**：`ResponseBean extends BaseClass`（直接继承，非BaseBean）

**改进点**：
- 继承BaseClass获得日志功能
- 使用统一的日志方法替代console
- 保留了云函数响应的特殊处理逻辑

**设计原因**：ResponseBean处理云函数响应而非数据模型，因此直接继承BaseClass而非BaseBean。

### 6. 数据Bean类更新

#### UserBean
**文件位置**：`miniprogram/beans/UserBean.js`

**改进**：
- 继承BaseBean
- 使用 `_getField` 方法提取字段（带类型检查）
- 使用BaseBean提供的验证方法
- 使用 `_addValidationError` 记录验证错误

#### ProfileBean
**文件位置**：`miniprogram/beans/ProfileBean.js`

**改进**：
- 继承BaseBean
- 使用 `_getField` 方法处理字段提取
- 使用BaseBean的验证方法
- 统一的错误记录机制

#### BaziBean
**文件位置**：`miniprogram/beans/BaziBean.js`

**改进**：
- 继承BaseBean
- 使用 `_getField` 方法提取字段
- 使用 `_addValidationError` 记录验证错误
- 在静态方法中使用实例的日志方法

## 文档更新

### 1. 创建 common/README.md
详细说明了BaseClass的功能、使用方法和最佳实践。

### 2. 更新 beans/README.md
添加了BaseBean的说明，更新了继承关系图，增加了Bean类创建模板。

### 3. 更新 beans/index.js
导出BaseBean供其他模块使用。

## 主要优势

### 1. 统一性
- 所有类使用统一的日志格式
- 统一的错误处理方式
- 统一的数据验证机制

### 2. 可维护性
- 减少代码重复
- 公共功能集中管理
- 易于扩展和修改

### 3. 可调试性
- 自动的类名前缀
- 详细的错误日志
- 性能监控功能
- 实例追踪能力

### 4. 健壮性
- 统一的数据验证
- 安全的数据提取
- 默认值保护
- 错误不会中断程序

### 5. 扩展性
- 新增公共功能只需修改BaseClass
- 所有子类自动获得新功能
- 支持方法重写和扩展

## 使用示例

### 创建新的Service
```javascript
const { BaseService } = require('../services/BaseService');

class NewService extends BaseService {
  constructor() {
    super();
  }

  async getData() {
    this._log('获取数据');
    const result = await this.callFunction('myFunction', {});
    return result;
  }
}
```

### 创建新的Controller
```javascript
const { BaseController } = require('./BaseController');

class NewController extends BaseController {
  constructor(page) {
    super(page);
  }

  async initialize() {
    this._log('初始化');
    await this.loadData();
  }
}
```

### 创建新的Bean
```javascript
const { BaseBean } = require('./BaseBean');

class NewBean extends BaseBean {
  constructor(data) {
    super(data);
    this.id = this._getField(this.data, 'id', '', 'string');
    this._validate();
  }

  _validate() {
    this._validateRequiredField('id', this.id);
    this._isValidated = true;
  }
}
```

## 注意事项

### 1. 必须调用super()
所有继承BaseClass的类都必须在构造函数中调用 `super()`。

### 2. 使用统一的日志方法
不要直接使用 `console.log`，使用 `this._log()` 等方法。

### 3. 调试模式
在 `app.js` 中设置 `globalData.debugMode = true` 启用调试日志。

### 4. 性能监控清理
长时间运行的实例应定期调用 `_clearPerformanceMetrics()` 清理性能数据。

### 5. Bean验证
Bean类的 `_validate()` 方法应该设置 `this._isValidated = true`。

## 后续优化建议

1. **日志系统增强**
   - 添加日志级别控制
   - 实现日志持久化
   - 支持远程日志上报

2. **性能监控增强**
   - 添加更详细的性能指标
   - 支持性能数据导出
   - 集成性能分析工具

3. **错误处理增强**
   - 实现全局错误收集
   - 错误上报机制
   - 错误恢复策略

4. **数据验证增强**
   - 添加更多验证规则
   - 支持自定义验证器
   - 验证规则配置化

5. **文档完善**
   - 添加更多使用示例
   - 编写单元测试
   - 性能测试文档

## 变更历史

**2025-10-12**
- 创建BaseClass基类
- **BaseClass集成Logger日志系统**
  - 自动根据类名推断日志模块
  - 所有日志方法调用Logger
  - 支持手动设置模块名
- BaseService、BaseController继承BaseClass
- 创建BaseBean基类
- UserBean、ProfileBean、BaziBean继承BaseBean
- ResponseBean继承BaseClass
- 更新所有相关文档

## 相关文档

- [BaseClass使用文档](../miniprogram/common/README.md)
- [Logger日志系统文档](../miniprogram/utils/logger/README.md)
- [BaseBean使用文档](../miniprogram/beans/README.md)
- [BaseService文档](../miniprogram/services/README.md)
- [BaseController文档](../miniprogram/controllers/README.md)


