# 云函数版本管理策略

## 概述

为了保持向后兼容性，当云函数进行大版本更新时，采用版本化命名策略，维持旧版本云函数不变，同时部署新版本。

## 版本命名规范

### 版本号格式
```
{functionName}_v{major}_{minor}
```

**示例：**
- `calculateBazi` - 原始版本（v1.0）
- `calculateBazi_v1_1` - 第一个大版本更新（v1.1）

## 目录结构

```
cloudfunctions/
├── {functionName}/                    # 原始版本（v1.0）
├── {functionName}_v1_1/              # 第一个大版本更新
└── common/                           # 公共模块
    ├── responseHelper.js
    ├── versionRouter.js
    └── errorCodes.js
```

## 客户端版本管理

### 版本配置
```javascript
// miniprogram/utils/versionManager.js
static VERSION_CONFIG = {
  '1.0.0': {
    calculateBazi: 'v1_0',
    userManagement: 'v1_0',
    profileManagement: 'v1_0'
  },
  '1.1.0': {
    calculateBazi: 'v1_1',
    userManagement: 'v1_0',
    profileManagement: 'v1_0'
  }
};
```

### 使用方式
```javascript
// 直接调用云函数（推荐）
const result = await wx.cloud.callFunction({
  name: 'calculateBazi_v1_1',
  data: { timestamp }
});

// 或者调用旧版本
const result = await wx.cloud.callFunction({
  name: 'calculateBazi',
  data: { timestamp }
});
```

## 版本升级流程

1. **部署新版本云函数**：如 `calculateBazi_v1_1`
2. **更新客户端版本配置**：将版本映射更新
3. **发布新版本客户端**：客户端自动使用新版本云函数

## 核心文件

- `miniprogram/utils/versionManager.js` - 版本管理器
- `miniprogram/services/BaseService.js` - 基础服务类（集成版本管理）
- `cloudfunctions/common/` - 公共模块