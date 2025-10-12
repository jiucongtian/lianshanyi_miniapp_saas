# 日志管理系统使用文档

## 概述

日志管理系统是一个统一的日志打印和存储解决方案，提供以下功能：

- ✅ 统一的日志接口（DEBUG、INFO、WARN、ERROR）
- ✅ 环境区分（开发模式/生产模式）
- ✅ 自动获取调用栈信息（类名、方法名、**行号**）
- ✅ 本地存储（按天分组，保留30天）
- ✅ 敏感信息过滤
- ✅ 自动清理过期日志

**✨ 新特性：自动行号捕获**
- 日志会自动显示代码的行号，格式：`[ClassName:methodName:lineNumber]`
- 自动跳过 Logger、BaseClass 等框架层级，精确定位到实际调用位置
- 无需手动传递 `caller` 参数

## 快速开始

### 1. 导入日志管理器

```javascript
// 在任何需要打印日志的文件中导入
const logger = require('../../utils/logger/Logger');
// 或使用相对路径
import logger from '@/utils/logger/Logger';
```

### 2. 使用日志方法

```javascript
class UserService {
  async getUserInfo() {
    // 调试日志（仅开发环境）
    logger.debug('user', '开始获取用户信息');
    
    try {
      const result = await this.fetchData();
      
      // 信息日志
      logger.info('user', '获取用户信息成功', { userId: result.id });
      
      return result;
    } catch (error) {
      // 错误日志（总是记录）
      logger.error('user', '获取用户信息失败', error);
      throw error;
    }
  }
  
  checkData(data) {
    if (!data.required) {
      // 警告日志
      logger.warn('user', '缺少必需字段', { data });
    }
  }
}
```

## API 文档

### logger.debug(module, message, data?, caller?)

调试日志，仅在开发模式下打印和存储。

**参数：**
- `module` (string) - 功能模块名，见下方模块名规范
- `message` (string) - 日志信息
- `data` (any, 可选) - 附加数据
- `caller` (string, 可选) - 调用者信息，通常自动获取

**示例：**
```javascript
logger.debug('user', '查询用户列表', { page: 1, limit: 20 });
```

### logger.info(module, message, data?, caller?)

信息日志，记录一般性信息。

**参数：** 同 `debug`

**示例：**
```javascript
logger.info('profile', '档案创建成功', { profileId: '123' });
```

### logger.warn(module, message, data?, caller?)

警告日志，记录需要关注但不影响功能的问题。

**参数：** 同 `debug`

**示例：**
```javascript
logger.warn('network', '网络请求较慢', { duration: 3000 });
```

### logger.error(module, message, error?, caller?)

错误日志，记录错误和异常，总是打印和存储。

**参数：** 同 `debug`，但 `error` 参数通常是 Error 对象

**示例：**
```javascript
try {
  await someOperation();
} catch (error) {
  logger.error('card', '加载卡牌失败', error);
}
```

## 功能模块名规范

| 模块代码 | 说明 | 适用场景 |
|---------|------|---------|
| `user` | 用户相关 | UserService, UserBean, UserManager, RegisterController, MineController |
| `profile` | 档案相关 | ProfileService, ProfileController, ProfileBean, AddProfileController |
| `card` | 卡牌相关 | CardController, BaziCard 组件 |
| `bazi` | 八字计算 | BaziBean, 八字相关计算逻辑 |
| `network` | 网络请求 | BaseService, API调用, 云函数调用 |
| `storage` | 存储相关 | CacheManager, ImageCache, LocalStorage操作 |
| `page` | 页面相关 | 页面生命周期, 页面初始化 |
| `component` | 组件相关 | 组件逻辑 |
| `system` | 系统相关 | App初始化, 权限管理, 配置管理 |

## 日志格式

### 开发模式（debugMode: true）

```
[2024-01-15 10:30:45.123] [DEBUG] [user] [UserService:getUserInfo:125] 获取用户信息: { userId: '12345' }
[2024-01-15 10:30:45.456] [INFO]  [profile] [ProfileController:initialize:45] 页面加载完成
[2024-01-15 10:30:45.789] [WARN]  [network] [BaseService:callFunction:89] 网络请求较慢: 耗时2000ms
[2024-01-15 10:30:46.012] [ERROR] [user] [UserService:getUserInfo:130] 获取用户信息失败: Network timeout
```

**格式说明：**
- `[时间戳]` - 完整的日期时间，精确到毫秒
- `[级别]` - DEBUG/INFO/WARN/ERROR
- `[模块]` - 功能模块名
- `[类名:方法名:行号]` - 自动获取的调用位置
- `消息和数据` - 日志内容

### 生产模式（debugMode: false）

```
[WARN] [network] [BaseService:callFunction:89] 网络请求较慢
[ERROR] [user] [UserService:getUserInfo:130] 获取用户信息失败: Network timeout
```

生产模式只记录 WARN 和 ERROR 级别，且不输出到控制台（仅本地存储）。

## 配置说明

配置文件位置：`miniprogram/config/index.js`

```javascript
export const config = {
  // 调试模式开关
  debugMode: false,  // true=开发模式, false=生产模式
  
  // 日志配置
  logger: {
    // 本地存储配置
    storage: {
      enabled: true,                  // 是否启用本地存储
      maxLogsPerDay: 500,            // 每天最多存储日志数
      retentionDays: 30,             // 日志保留天数
    },
    // 开发模式配置
    development: {
      console: true,                 // 是否输出到控制台
      levels: ['DEBUG', 'INFO', 'WARN', 'ERROR']  // 记录所有级别
    },
    // 生产模式配置
    production: {
      console: false,                // 生产环境不输出到控制台
      levels: ['WARN', 'ERROR']      // 只记录警告和错误
    }
  }
};
```

### 切换开发/生产模式

只需修改 `debugMode` 的值：

```javascript
// 开发模式
debugMode: true   // 打印所有日志，输出到控制台

// 生产模式
debugMode: false  // 只记录WARN和ERROR，不输出到控制台
```

## 本地存储

### 存储结构

日志按天分组存储在小程序本地存储中：

```javascript
// 存储键格式：app_logs_2024_01_15
{
  "app_logs_2024_01_15": [
    {
      timestamp: 1705305045123,
      level: "ERROR",
      module: "user",
      caller: "UserService:getUserInfo:130",
      message: "获取用户信息失败",
      data: { error: "Network timeout" },
      deviceInfo: {
        model: "iPhone 14",
        system: "iOS 16.0",
        version: "3.4.3",
        platform: "ios"
      }
    },
    // ... 更多日志
  ]
}
```

### 存储限制

- **每天最多存储**：500条日志（超出后保留最新的）
- **保留时间**：30天（自动清理过期日志）
- **自动清理**：App启动时异步清理，不影响启动速度

### 手动管理日志

```javascript
// 在 App.js 或任何页面中

// 获取日志统计信息
const app = getApp();
const stats = app.getLogStats();
console.log('日志统计:', stats);
// 输出: { days: 5, totalCount: 234, keys: [...] }

// 清空所有日志
app.clearAllLogs();

// 获取最近7天的日志
const logger = require('./utils/logger/Logger');
const recentLogs = logger.getRecentLogs(7);
console.log('最近日志:', recentLogs);
```

## 高级功能

### 1. 自动获取调用信息

日志系统会自动解析调用栈，提取类名、方法名和行号：

```javascript
class ProfileController {
  async loadData() {
    logger.debug('profile', '加载数据');
    // 自动记录为: [ProfileController:loadData:45]
  }
}
```

### 2. 敏感信息过滤

系统自动过滤以下敏感字段：
- password
- token
- openid
- sessionKey
- phoneNumber

```javascript
const userData = {
  name: '张三',
  password: '123456',
  token: 'abc123xyz'
};

logger.debug('user', '用户数据', userData);
// 实际存储: { name: '张三', password: '***', token: '***' }
```

### 3. 大对象处理

超过 5KB 的数据会自动截断：

```javascript
const bigData = generateHugeObject();
logger.debug('test', '大数据', bigData);
// 自动截断为: {...前5KB的内容}...[truncated]
```

### 4. 手动指定调用者

在某些特殊场景下，可以手动指定调用者信息：

```javascript
logger.debug('user', '更新用户', null, 'UserService.updateUser');
// 输出: [DEBUG] [user] [UserService.updateUser] 更新用户
```

## 迁移指南

### 从 console.* 迁移到 logger.*

#### 基本替换规则

```javascript
// 旧代码 → 新代码

// 1. console.log → logger.debug
console.log('[UserService] 获取用户信息');
logger.debug('user', '获取用户信息');

// 2. console.error → logger.error
console.error('[UserService] 获取失败:', error);
logger.error('user', '获取失败', error);

// 3. console.warn → logger.warn
console.warn('[BaseService] 网络延迟');
logger.warn('network', '网络延迟');

// 4. 带数据的日志
console.log('[ProfileController] 档案数据:', profileData);
logger.debug('profile', '档案数据', profileData);
```

#### 类名到模块名映射

| 原类名前缀 | 功能模块名 |
|-----------|-----------|
| UserService, UserBean, UserManager | user |
| ProfileService, ProfileController, ProfileBean | profile |
| CardController, BaziCard | card |
| BaziBean, BaziCalculator | bazi |
| BaseService, API | network |
| CacheManager, ImageCache | storage |
| AddProfileController | profile |
| RegisterController | user |
| MineController | user |

## 性能优化

### 生产环境零开销

生产模式下，低级别日志（DEBUG、INFO）会在第一时间返回，不进行任何处理：

```javascript
// 生产模式下，此调用几乎零开销
logger.debug('user', '调试信息');  // 直接返回，不执行任何操作
```

### 异步清理

日志清理在 App 启动时异步执行，随机延迟 1-6 秒，不影响启动性能。

## 故障排查

### 日志没有输出到控制台

**检查：**
1. 确认 `config.debugMode` 是否为 `true`
2. 确认 `config.logger.development.console` 是否为 `true`
3. 确认日志级别是否在允许列表中

### 日志没有保存到本地

**检查：**
1. 确认 `config.logger.storage.enabled` 是否为 `true`
2. 检查是否超出每天最大日志数限制（500条）
3. 检查小程序存储空间是否充足

### 调用栈信息显示为 Unknown

**原因：**
- 调用栈解析失败（某些特殊环境）
- 可以手动指定 `caller` 参数

**解决：**
```javascript
logger.debug('user', '操作', null, 'ClassName.methodName');
```

## 最佳实践

### 1. 合理选择日志级别

```javascript
// ✅ 正确使用
logger.debug('user', '进入方法');           // 调试信息
logger.info('user', '操作成功');            // 重要信息
logger.warn('user', '数据异常但可继续');     // 警告
logger.error('user', '操作失败', error);     // 错误

// ❌ 不推荐
logger.error('user', '进入方法');           // 滥用错误级别
logger.debug('user', '严重错误', error);     // 级别选择不当
```

### 2. 提供有意义的信息

```javascript
// ✅ 好的日志
logger.error('user', '获取用户信息失败', { 
  userId: '123', 
  reason: error.message 
});

// ❌ 不好的日志
logger.error('user', '失败');  // 信息不足
```

### 3. 避免过度打印

```javascript
// ❌ 避免在循环中大量打印
list.forEach(item => {
  logger.debug('user', '处理项', item);  // 如果list很大，会产生大量日志
});

// ✅ 推荐做法
logger.debug('user', '开始处理列表', { count: list.length });
list.forEach(item => { /* 处理 */ });
logger.debug('user', '列表处理完成');
```

### 4. 错误处理规范

```javascript
// ✅ 推荐
try {
  await someOperation();
} catch (error) {
  logger.error('user', '操作失败', error);
  // 继续处理或抛出
}

// ❌ 不推荐
try {
  await someOperation();
} catch (error) {
  logger.debug('user', '出错了', error);  // 应该用error级别
}
```

## 常见问题（FAQ）

**Q: 生产环境是否会影响性能？**  
A: 不会。生产环境下只记录 WARN 和 ERROR，且低级别日志会直接返回，几乎零开销。

**Q: 日志会占用多少存储空间？**  
A: 每天最多500条日志，保留30天，预计占用 1-5MB 存储空间。

**Q: 如何在"我的"页面添加清空日志功能？**  
A: 调用 `getApp().clearAllLogs()` 即可。

**Q: 日志会包含用户隐私信息吗？**  
A: 不会。系统自动过滤敏感字段（password, token, openid等）。

**Q: 能否导出日志？**  
A: 目前支持获取日志数据：`logger.getRecentLogs(7)`，可自行处理导出。

## 相关文档

- [设计方案文档](../../../docs/logger-system-design.md)
- [配置文件说明](../../config/index.js)

## 联系与反馈

如有问题或建议，请联系开发团队。

