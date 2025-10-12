# Logger 系统迁移总结

## 已完成的改造文件

### Utils 工具类（已完成 ✅）

#### 1. versionManager.js
- **改造内容**：所有 console 语句替换为 logger
- **方法数**：10个方法
- **日志调用**：约 8处

#### 2. imageCacheManager.js  
- **改造内容**：所有 console 语句替换为 logger
- **方法数**：15个方法
- **日志调用**：约 20处
- **日志级别**：info (关键操作), debug (缓存命中/过期), error (失败)

#### 3. profileManager.js
- **改造内容**：所有 console 语句替换为 logger
- **方法数**：11个方法  
- **日志调用**：约 10处
- **日志级别**：info (CRUD操作), debug (内部状态), error (失败)

#### 4. userManager.js
- **改造内容**：所有 console 语句替换为 logger
- **方法数**：13个方法
- **日志调用**：约 25处
- **日志级别**：info (关键操作), debug (详细信息), warn (警告), error (失败)

#### 5. eventBus.js
- **改造内容**：所有 console 语句替换为 logger
- **方法数**：7个方法
- **日志调用**：约 12处
- **日志级别**：debug (事件监听/触发), warn (验证警告), error (回调失败), info (清理操作)

## 改造模式总结

### 统一的代码模式

```javascript
// 1. 引入 logger
const { createModuleLogger } = require('./logger/');
const log = createModuleLogger('模块名');

// 2. 替换 console
// 前：console.log('[ModuleName] 操作成功:', data);
// 后：log.info('methodName', '操作成功', { data });

// 3. 错误处理
// 前：console.error('[ModuleName] 操作失败:', error);
// 后：log.error('methodName', '操作失败', { error: error.message });
```

### 日志级别使用规范

| 级别 | 使用场景 | 示例 |
|------|---------|------|
| `debug` | 内部状态、缓存命中、详细流程 | 缓存命中、配置加载 |
| `info` | 关键操作、成功结果、初始化 | 用户登录、数据保存 |
| `warn` | 警告信息、降级处理、验证失败 | 配额不足、数据缺失 |
| `error` | 错误、异常、失败情况 | 网络错误、数据库错误 |

## 待完成的改造

### 需要手动检查的文件

以下文件需要手动检查是否有直接使用 console 的地方：

1. **app.js** - 应用入口文件
2. **pages/register/index.js** - 注册页面
3. **pages/profile/index.js** - 档案列表页面
4. **pages/mine/index.js** - 我的页面
5. **pages/card/index.js** - 卡牌页面
6. **pages/agreement/index.js** - 协议页面
7. **pages/addProfile/index.js** - 添加档案页面
8. **components/bazi-card/index.js** - 八字卡牌组件

### 改造建议

#### 对于页面文件 (pages/*/index.js)

页面文件通常业务逻辑在 Controller 中，只需要改造：
- 生命周期方法中的日志（onLoad, onShow 等）
- 事件处理器中的日志（onButtonTap 等）
- 页面级别的错误处理日志

示例：
```javascript
const { createModuleLogger } = require('../../utils/logger/');
const log = createModuleLogger('ProfilePage');

Page({
  onLoad(options) {
    log.info('onLoad', '页面加载', { options });
    // 业务逻辑...
  }
});
```

#### 对于 app.js

app.js 需要改造全局的初始化日志和错误处理：

```javascript
const { createModuleLogger } = require('./utils/logger/');
const log = createModuleLogger('App');

App({
  onLaunch() {
    log.info('onLaunch', '小程序启动');
    // 初始化逻辑...
  },
  
  onError(error) {
    log.error('onError', '全局错误', { error: error.message });
  }
});
```

#### 对于组件 (components/*/index.js)

组件改造类似页面文件：

```javascript
const { createModuleLogger } = require('../../utils/logger/');
const log = createModuleLogger('BaziCard');

Component({
  lifetimes: {
    attached() {
      log.debug('attached', '组件加载');
    }
  },
  
  methods: {
    onCardTap() {
      log.info('onCardTap', '点击卡牌');
    }
  }
});
```

## 验证方法

### 1. 搜索残留的 console

```bash
# 搜索所有 console 语句（排除 node_modules 和文档）
grep -r "console\." miniprogram/ --exclude-dir=node_modules --exclude-dir=logger --exclude="*.md"
```

### 2. 测试日志输出

在开发模式下（debugMode: true），检查日志输出格式：
```
[2025-10-12 17:47:48.340] [INFO] [UserManager] [UserManager:initUser] 开始初始化用户信息
```

### 3. 生产环境验证

在生产模式下（debugMode: false），确认只输出 WARN 和 ERROR 级别的日志。

## 效果预期

### 改造前
```javascript
console.log('[UserManager] 获取用户信息');
console.log('[UserManager] 用户信息:', userInfo);
console.error('[UserManager] 获取失败:', error);
```

### 改造后
```javascript
log.info('getUserInfo', '开始获取用户信息');
log.info('getUserInfo', '用户信息获取成功', { userId: userInfo._id });
log.error('getUserInfo', '获取失败', { error: error.message });
```

### 优势

1. ✅ **统一格式**：所有日志格式一致，易于阅读和搜索
2. ✅ **环境区分**：开发/生产环境自动区分日志级别
3. ✅ **结构化数据**：便于日志分析和问题排查
4. ✅ **自动存储**：重要日志自动保存到本地
5. ✅ **敏感信息过滤**：自动过滤 password、token 等敏感字段
6. ✅ **性能追踪**：支持 timeStart/timeEnd 追踪性能
7. ✅ **调用栈信息**：自动显示类名、方法名和行号

## 后续维护

### 新增代码时的日志规范

1. **非类代码**：使用 `createModuleLogger`
   ```javascript
   const { createModuleLogger } = require('./logger/');
   const log = createModuleLogger('ModuleName');
   log.info('methodName', '消息', { data });
   ```

2. **继承 BaseClass 的类**：使用 `this._log`
   ```javascript
   this._log('methodName', '消息', { data });
   ```

3. **方法签名一致性**
   - 第一个参数：方法名
   - 第二个参数：日志消息
   - 第三个参数：附加数据（可选）

### 代码审查清单

- [ ] 不使用 `console.log/warn/error`
- [ ] 使用统一的 logger 系统
- [ ] 日志级别选择合理
- [ ] 结构化数据而非字符串拼接
- [ ] 不记录敏感信息（或已脱敏）
- [ ] 关键操作都有日志记录

## 参考文档

- [Logger README](/miniprogram/utils/logger/README.md)
- [非类代码日志使用指南](/miniprogram/utils/logger/非类代码日志使用指南.md)
- [改造示例](/miniprogram/utils/logger/改造示例.md)
- [快速使用指南](/miniprogram/utils/logger/快速使用指南.md)

