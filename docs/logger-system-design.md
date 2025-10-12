# 日志打印模块设计方案

## 一、概述

### 1.1 背景
- 当前项目中存在大量分散的 `console.log`、`console.error` 等日志调用
- 小程序端约519处日志调用，云函数端约134处日志调用
- 缺乏统一的日志管理，无法区分开发环境和生产环境
- 需要为后期日志上报服务器做准备

### 1.2 目标
1. **统一日志接口**：提供统一的日志打印API，替换所有 `console.*` 调用
2. **环境区分**：开发模式打印所有日志，生产模式只打印关键日志
3. **日志分级**：支持 DEBUG、INFO、WARN、ERROR 四个级别
4. **性能优化**：生产环境下最小化日志开销
5. **可扩展性**：为后期日志上报功能预留接口

### 1.3 技术方案
采用**单例模式**设计日志管理器，分别为小程序端和云函数端提供统一的日志接口。

---

## 二、架构设计

### 2.1 模块结构

```
miniprogram/utils/
├── logger/
│   ├── Logger.js           # 日志管理器（核心）
│   ├── LogLevel.js         # 日志级别枚举
│   ├── LogStorage.js       # 日志本地存储管理
│   ├── LogCleaner.js       # 日志清理器（30天自动清理）
│   └── README.md           # 使用说明
```

### 2.2 核心类图

```
┌─────────────────────────────────────┐
│           Logger                   │
│  - debugMode: boolean              │
│  - storage: LogStorage             │
│  + debug(module, msg, data, caller)│
│  + info(module, msg, data, caller) │
│  + warn(module, msg, data, caller) │
│  + error(module, msg, data, caller)│
│  - shouldLog(level): boolean       │
│  - formatLog(...)                  │
│  - getCallerInfo(): Object         │
└─────────────────────────────────────┘
              │
              ↓
┌─────────────────────────────────────┐
│        LogStorage                  │
│  - storageKey: string              │
│  - maxSize: number                 │
│  + save(logData): void             │
│  + getLogs(days): Array            │
│  + clear(): void                   │
│  - compress(): void                │
└─────────────────────────────────────┘
              │
              ↓
┌─────────────────────────────────────┐
│        LogCleaner                  │
│  - retentionDays: 30               │
│  + cleanExpiredLogs(): void        │
│  + autoClean(): void               │
└─────────────────────────────────────┘
```

---

## 三、详细设计

### 3.1 日志级别定义

```javascript
// LogLevel.js
const LogLevel = {
  DEBUG: 0,   // 调试信息，仅开发环境
  INFO: 1,    // 一般信息，开发环境 + 部分生产环境
  WARN: 2,    // 警告信息，所有环境
  ERROR: 3,   // 错误信息，所有环境
  NONE: 999   // 不打印任何日志
};
```

### 3.2 环境配置策略

**配置来源**：使用 `miniprogram/config/index.js` 中的 `debugMode` 字段

```javascript
// config/index.js
export const config = {
  debugMode: false,  // true=开发模式, false=生产模式
  // ...
};
```

#### 开发模式（debugMode: true）
- 打印 DEBUG、INFO、WARN、ERROR 所有日志
- 日志格式详细，包含时间戳、模块名、类名、行号等
- 控制台输出 + 本地存储

#### 生产模式（debugMode: false）
- 只打印 WARN、ERROR 关键日志
- 日志格式简化，减少性能开销
- 仅本地存储，不输出到控制台（可选）

### 3.3 日志格式规范

#### 开发环境输出格式
```
[2024-01-15 10:30:45.123] [DEBUG] [user] [UserService:getUserInfo:125] 获取用户信息: { userId: '12345' }
[2024-01-15 10:30:45.456] [INFO]  [profile] [ProfileController:initialize:45] 页面加载完成
[2024-01-15 10:30:45.789] [WARN]  [network] [BaseService:callFunction:89] 网络请求较慢: 耗时2000ms
[2024-01-15 10:30:46.012] [ERROR] [user] [UserService:getUserInfo:130] 获取用户信息失败: Network timeout
```

**格式说明**：
- `[时间戳]`：完整的日期时间，精确到毫秒
- `[级别]`：DEBUG/INFO/WARN/ERROR
- `[模块]`：功能模块名（user/profile/card/network等）
- `[类名:方法名:行号]`：调用日志的具体位置
- `消息内容`：日志信息和数据

#### 生产环境输出格式
```
[WARN] [network] [BaseService:callFunction:89] 网络请求较慢
[ERROR] [user] [UserService:getUserInfo:130] 获取用户信息失败: Network timeout
```

### 3.4 核心API设计

#### Logger类接口

```javascript
class Logger {
  /**
   * 调试日志（仅开发环境）
   * @param {string} module - 功能模块名，如 'user', 'profile', 'card'
   * @param {string} message - 日志信息
   * @param {any} data - 附加数据（可选）
   * @param {string} caller - 调用者信息 'ClassName.methodName'（可选，自动获取）
   */
  debug(module, message, data, caller);

  /**
   * 信息日志
   * @param {string} module - 功能模块名
   * @param {string} message - 日志信息
   * @param {any} data - 附加数据（可选）
   * @param {string} caller - 调用者信息（可选，自动获取）
   */
  info(module, message, data, caller);

  /**
   * 警告日志
   * @param {string} module - 功能模块名
   * @param {string} message - 日志信息
   * @param {any} data - 附加数据（可选）
   * @param {string} caller - 调用者信息（可选，自动获取）
   */
  warn(module, message, data, caller);

  /**
   * 错误日志（总是打印并存储）
   * @param {string} module - 功能模块名
   * @param {string} message - 日志信息
   * @param {any} error - 错误对象或附加数据
   * @param {string} caller - 调用者信息（可选，自动获取）
   */
  error(module, message, error, caller);
}
```

#### 功能模块名规范

| 模块代码 | 说明 | 示例类 |
|---------|------|--------|
| user | 用户相关 | UserService, UserBean, UserManager |
| profile | 档案相关 | ProfileService, ProfileController |
| card | 卡牌相关 | CardController, BaziCard |
| bazi | 八字计算 | BaziBean, BaziCalculator |
| network | 网络请求 | BaseService, API调用 |
| storage | 存储相关 | CacheManager, StorageHelper |
| page | 页面相关 | Page生命周期 |
| component | 组件相关 | Component逻辑 |
| system | 系统相关 | App初始化, 权限管理 |

#### 使用示例

```javascript
// 导入日志管理器
import logger from '@/utils/logger/Logger';

// 在代码中使用
class UserService extends BaseService {
  async getUserInfo() {
    // 方式1：自动获取类名和方法名（推荐）
    logger.debug('user', '开始获取用户信息');
    
    try {
      const response = await this.callFunction('userManagement', {
        action: 'getUserInfo'
      });
      
      logger.info('user', '获取用户信息成功', { userId: response.data._id });
      return response;
      
    } catch (error) {
      logger.error('user', '获取用户信息失败', error);
      throw error;
    }
  }
  
  // 方式2：手动指定调用者（可选）
  async updateUser() {
    logger.debug('user', '更新用户', null, 'UserService.updateUser');
  }
}
```

### 3.5 本地存储设计

#### 存储策略

**存储位置**：小程序本地存储（wx.setStorageSync）

**存储结构**：
```javascript
{
  "app_logs_2024_01_15": [  // 按日期分组存储
    {
      timestamp: 1705305045123,
      level: "ERROR",
      module: "user",
      caller: "UserService.getUserInfo:130",
      message: "获取用户信息失败",
      data: { error: "Network timeout" },
      deviceInfo: {
        model: "iPhone 14",
        system: "iOS 16.0",
        version: "1.0.0"
      }
    },
    // ... 更多日志
  ],
  "app_logs_2024_01_16": [...],
  // ...
}
```

#### LogStorage类设计

```javascript
class LogStorage {
  constructor() {
    this.storagePrefix = 'app_logs_';
    this.maxLogsPerDay = 500; // 每天最多存储500条
  }
  
  /**
   * 保存日志到本地
   */
  save(logData) {
    const dateKey = this.getDateKey();
    const key = this.storagePrefix + dateKey;
    
    try {
      let logs = wx.getStorageSync(key) || [];
      logs.push(logData);
      
      // 限制每天日志数量
      if (logs.length > this.maxLogsPerDay) {
        logs = logs.slice(-this.maxLogsPerDay);
      }
      
      wx.setStorageSync(key, logs);
    } catch (e) {
      console.error('[LogStorage] 保存日志失败:', e);
    }
  }
  
  /**
   * 获取指定天数内的日志
   */
  getLogs(days = 30) {
    const logs = [];
    const today = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = this.formatDate(date);
      const key = this.storagePrefix + dateKey;
      
      try {
        const dayLogs = wx.getStorageSync(key);
        if (dayLogs && dayLogs.length > 0) {
          logs.push(...dayLogs);
        }
      } catch (e) {
        console.error(`[LogStorage] 读取${dateKey}日志失败:`, e);
      }
    }
    
    return logs;
  }
  
  /**
   * 清除所有日志
   */
  clear() {
    const keys = wx.getStorageInfoSync().keys;
    keys.forEach(key => {
      if (key.startsWith(this.storagePrefix)) {
        wx.removeStorageSync(key);
      }
    });
  }
}
```

#### LogCleaner类设计

```javascript
class LogCleaner {
  constructor() {
    this.retentionDays = 30; // 保留30天
    this.storagePrefix = 'app_logs_';
  }
  
  /**
   * 清理过期日志
   */
  cleanExpiredLogs() {
    const keys = wx.getStorageInfoSync().keys;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);
    
    keys.forEach(key => {
      if (key.startsWith(this.storagePrefix)) {
        const dateStr = key.replace(this.storagePrefix, '');
        const logDate = this.parseDate(dateStr);
        
        if (logDate < cutoffDate) {
          wx.removeStorageSync(key);
          console.log(`[LogCleaner] 清理过期日志: ${key}`);
        }
      }
    });
  }
  
  /**
   * 自动清理（每次启动时执行）
   */
  autoClean() {
    try {
      // 随机延迟，避免影响启动性能
      setTimeout(() => {
        this.cleanExpiredLogs();
      }, Math.random() * 5000 + 1000); // 1-6秒随机延迟
    } catch (e) {
      console.error('[LogCleaner] 自动清理失败:', e);
    }
  }
}
```

#### 配置文件集成

在现有的 `miniprogram/config/index.js` 中添加日志配置：

```javascript
export const config = {
  useMock: false,
  debugMode: false,  // 日志模块使用此字段判断环境
  
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
      levels: ['DEBUG', 'INFO', 'WARN', 'ERROR']
    },
    // 生产模式配置
    production: {
      console: false,                // 生产环境不输出到控制台
      levels: ['WARN', 'ERROR']      // 只记录警告和错误
    }
  },
  
  // ... 其他配置
};
```

---

## 四、实施计划

### 4.1 第一阶段：基础框架搭建（1-2天）

#### 任务清单
- [ ] 创建日志模块目录结构
- [ ] 实现 `LogLevel.js` 日志级别枚举
- [ ] 实现 `LoggerConfig.js` 配置管理器
- [ ] 实现小程序端 `Logger.js` 核心类
- [ ] 实现云函数端 `Logger.js` 核心类
- [ ] 编写单元测试

#### 交付物
- 完整的日志管理器代码
- 配置文件更新
- 使用文档和示例

### 4.2 第二阶段：代码迁移（2-3天）

#### 迁移策略

**优先级划分：**
1. **P0（高优）**：Service层、Controller层、云函数 - 业务核心代码
2. **P1（中优）**：Bean层、工具类 - 数据处理和通用功能
3. **P2（低优）**：Page层、Component层 - 页面交互代码

**迁移规则：**

```javascript
// 旧代码 → 新代码映射规则

// 1. console.log → logger.debug / logger.info
console.log('[UserService] 获取用户信息');
// ↓
logger.debug('user', '获取用户信息');

// 2. console.error → logger.error
console.error('[UserService] 获取失败:', error);
// ↓
logger.error('user', '获取失败', error);

// 3. console.warn → logger.warn
console.warn('[BaseService] 网络延迟');
// ↓
logger.warn('network', '网络延迟');

// 4. 带数据的日志
console.log('[UserService] 用户数据:', userData);
// ↓
logger.debug('user', '用户数据', userData);

// 5. 不同模块的日志
console.log('[ProfileController] 初始化页面');
// ↓
logger.debug('profile', '初始化页面');

console.error('[CardController] 加载卡牌失败:', error);
// ↓
logger.error('card', '加载卡牌失败', error);
```

#### 模块名映射表

| 原类名前缀 | 功能模块名 | 说明 |
|-----------|-----------|------|
| UserService, UserBean, UserManager | user | 用户相关 |
| ProfileService, ProfileController, ProfileBean | profile | 档案相关 |
| CardController, BaziCard | card | 卡牌相关 |
| BaziBean, BaziCalculator | bazi | 八字相关 |
| BaseService, API | network | 网络请求 |
| CacheManager, ImageCache | storage | 存储相关 |
| AddProfileController | profile | 添加档案 |
| RegisterController | user | 用户注册 |
| MineController | user | 我的页面 |

**批量迁移脚本：**
可以使用正则表达式辅助替换（需人工审核）：

```bash
# 查找需要迁移的日志
grep -r "console\.\(log\|error\|warn\|info\)" miniprogram/

# 使用编辑器的批量替换功能
# 模式: console\.log\(\[(\w+)\]\s+(.+)\)
# 替换: logger.debug('$1', $2)
```

#### 迁移检查清单

- [ ] Services层（5个文件） - 模块名: user, profile, network
- [ ] Controllers层（6个文件） - 模块名: user, profile, card
- [ ] Beans层（4个文件） - 模块名: user, profile, bazi
- [ ] Utils层（10个文件） - 模块名: storage, system, bazi
- [ ] Components（2个组件） - 模块名: card, component
- [ ] Pages（6个页面） - 模块名: page, user, profile
- [ ] App.js - 模块名: system

### 4.3 第三阶段：日志上报功能（远期规划，暂不实施）

后期需要时再实现以下功能：
- [ ] 实现 `LogUploader.js` 上报器
- [ ] 设计日志上报云函数接口
- [ ] 实现批量上报机制
- [ ] 添加网络状态检测

---

## 五、性能与安全考虑

### 5.1 性能优化

#### 1. 生产环境日志最小化
```javascript
// 生产环境下，低级别日志直接返回，零开销
shouldLog(level) {
  const debugMode = config.debugMode;
  
  if (!debugMode && level < LogLevel.WARN) {
    return false; // 直接返回，不进行任何操作
  }
  
  return true;
}
```

#### 2. 本地存储优化
- 按天分组存储，避免单个key过大
- 每天最多存储500条日志
- 启动时异步清理过期日志，不影响启动速度
- 存储失败时静默处理，不影响主流程

#### 3. 大对象处理
```javascript
// 避免存储过大的对象
formatData(data) {
  if (!data) return undefined;
  
  try {
    const str = JSON.stringify(data);
    // 超过5KB的数据截断
    if (str.length > 5120) {
      return str.substring(0, 5120) + '...[truncated]';
    }
    return data;
  } catch (e) {
    return '[Circular or Complex Object]';
  }
}
```

#### 4. 获取调用信息优化
```javascript
// 使用Error.stack获取调用栈，自动提取类名、方法名、行号
getCallerInfo() {
  try {
    const stack = new Error().stack;
    // 解析stack获取调用者信息
    // 格式: ClassName.methodName:lineNumber
    return parseStack(stack);
  } catch (e) {
    return 'Unknown';
  }
}
```

### 5.2 安全与隐私考虑

#### 1. 敏感信息过滤
```javascript
// 过滤敏感字段
const SENSITIVE_FIELDS = ['password', 'token', 'openid', 'sessionKey', 'phoneNumber'];

filterSensitiveData(data) {
  if (!data || typeof data !== 'object') return data;
  
  const filtered = JSON.parse(JSON.stringify(data));
  
  const filter = (obj) => {
    for (let key in obj) {
      if (SENSITIVE_FIELDS.includes(key)) {
        obj[key] = '***';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        filter(obj[key]);
      }
    }
  };
  
  filter(filtered);
  return filtered;
}
```

#### 2. 本地存储安全
- 日志存储在小程序私有空间，用户无法直接访问
- 自动清理30天前的日志，避免占用过多空间
- 存储失败不影响主流程

#### 3. 用户隐私保护
- 不记录用户的真实姓名、身份证号等敏感信息
- openid等标识符在存储时脱敏
- 提供清空日志的功能（可在设置页面添加）

---

## 六、兼容性与回退

### 6.1 渐进式迁移

**方案一：直接替换（推荐）**
- 全量替换所有 `console.*` 为 `logger.*`
- 一次性完成，避免混用

**方案二：逐步迁移（备选）**
- 新代码使用 `logger.*`
- 旧代码保持 `console.*`
- 设置时间节点逐步迁移

### 6.2 回退方案

如果日志模块出现问题，可以快速回退：

```javascript
// 在 Logger.js 中添加降级模式
class Logger {
  constructor() {
    this.fallbackMode = false; // 降级标志
  }
  
  debug(module, message, data) {
    if (this.fallbackMode) {
      console.log(`[${module}]`, message, data);
      return;
    }
    // 正常日志处理...
  }
}
```

---

## 七、测试方案

### 7.1 单元测试

```javascript
// tests/logger.test.js
describe('Logger', () => {
  test('开发环境应打印DEBUG日志', () => {
    const logger = new Logger({ isDevelopment: true });
    // 模拟console.log
    const spy = jest.spyOn(console, 'log');
    
    logger.debug('TestModule', '测试消息');
    expect(spy).toHaveBeenCalled();
  });
  
  test('生产环境不应打印DEBUG日志', () => {
    const logger = new Logger({ isDevelopment: false });
    const spy = jest.spyOn(console, 'log');
    
    logger.debug('TestModule', '测试消息');
    expect(spy).not.toHaveBeenCalled();
  });
});
```

### 7.2 集成测试

- [ ] 开发环境真机测试
- [ ] 生产环境真机测试
- [ ] 日志上报功能测试（后期）
- [ ] 性能压力测试

---

## 八、文档与培训

### 8.1 开发文档

- [ ] API使用说明（README.md）
- [ ] 迁移指南
- [ ] 最佳实践
- [ ] FAQ

### 8.2 团队培训

- [ ] 日志规范培训
- [ ] 迁移操作演示
- [ ] Code Review 检查点

---

## 九、风险与挑战

### 9.1 已识别风险

| 风险 | 影响 | 应对措施 |
|-----|------|---------|
| 迁移遗漏 | 中 | 使用脚本检测 + Code Review |
| 性能影响 | 低 | 生产环境最小化日志 + 性能测试 |
| 日志丢失 | 中 | 实现可靠的上报机制 + 本地缓存 |
| 存储压力 | 中 | 设置日志保留期 + 定期清理 |

### 9.2 挑战

1. **代码量大**：小程序端519处，云函数端134处日志需迁移
2. **业务影响**：需要谨慎测试，避免影响现有功能
3. **团队协作**：需要所有开发人员遵守新的日志规范

---

## 十、成本与收益

### 10.1 开发成本

- **时间成本**：约3-5个工作日
  - 框架开发：1-2天
  - 代码迁移：2-3天
  - 测试验证：0.5-1天

- **人力成本**：1名开发人员

### 10.2 收益

1. **短期收益**
   - 统一日志管理，代码更规范
   - 开发调试更高效
   - 生产环境性能优化

2. **长期收益**
   - 建立完善的日志监控体系
   - 快速定位线上问题
   - 数据驱动的产品优化
   - 降低运维成本

---

## 十一、后续扩展

### 11.1 日志分析平台（远期规划）

- 日志检索与查询
- 错误统计与报警
- 性能监控仪表板
- 用户行为分析

### 11.2 集成第三方服务（可选）

- Sentry（错误监控）
- 腾讯云日志服务（CLS）
- 自建ELK日志平台

---

## 附录

### A. 参考资料

- [微信小程序日志系统](https://developers.weixin.qq.com/miniprogram/dev/api/base/debug/wx.setEnableDebug.html)
- [Node.js日志最佳实践](https://nodejs.org/en/docs/guides/logging/)

### B. 相关文档

- `docs/debug-mode.md` - 调试模式说明
- `miniprogram/config/index.js` - 应用配置
- `config/environments/` - 环境配置

### C. 更新记录

| 版本 | 日期 | 作者 | 说明 |
|-----|------|-----|------|
| v1.0 | 2025-01-15 | - | 初始版本 |

---

## 讨论结果与最终方案

根据讨论，方案已确定如下：

### ✅ 已确定的方案

1. **模块命名**：使用功能模块名（user/profile/card等），日志格式包含类名和行号
2. **日志上报**：后期再做，当前先实现本地存储
3. **本地存储**：保留30天日志，自动清理过期数据
4. **云函数**：不实现日志机制，使用云平台自带日志
5. **生产环境**：暂时不需要INFO日志，只记录WARN和ERROR
6. **环境判断**：使用 `config/index.js` 中的 `debugMode` 字段
7. **数据大小限制**：单条日志数据超过5KB截断
8. **迁移策略**：一次性全量迁移

### 📋 下一步行动

1. 实现日志核心模块（Logger.js, LogStorage.js, LogCleaner.js）
2. 更新配置文件
3. 编写使用文档和示例
4. 迁移现有代码中的653处日志调用
5. 测试验证

**预计工作量**：3-5个工作日

