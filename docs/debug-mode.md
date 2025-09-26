# 调试模式使用说明

## 功能概述

调试模式是为开发者提供的一个便捷功能，用于在开发和测试阶段跳过缓存机制，确保每次都从服务端重新获取八字计算数据。

## 如何开启调试模式

### 1. 修改配置文件

编辑 `miniprogram/config/index.js` 文件：

```javascript
export const config = {
  useMock: true,
  // 调试模式：开启后不使用缓存，每次都从网络获取八字数据
  debugMode: true,  // 将 false 改为 true
};
```

### 2. 重启小程序

修改配置后需要重新编译和运行小程序，使配置生效。

## 调试模式的行为差异

### 正常模式（debugMode: false）
- ✅ 使用缓存机制，相同时间戳的八字数据会从本地缓存读取
- ✅ 提升用户体验，减少网络请求
- ✅ 显示提示：「抽取智慧卡牌...」
- ✅ 成功后显示：「计算完成」

### 调试模式（debugMode: true）
- 🔄 **跳过缓存检查**，每次都从服务端重新计算
- 🔄 便于测试服务端逻辑变更
- 🔄 显示提示：「调试模式：重新计算...」
- 🔄 成功后显示：「调试模式：重新计算完成」
- 🔄 控制台输出：「调试模式开启，跳过缓存直接调用API计算」

## 使用场景

### 适合开启调试模式的情况：
- 🛠️ 开发阶段测试服务端八字计算逻辑
- 🛠️ 验证 Coze API 的返回结果
- 🛠️ 测试网络异常情况的处理
- 🛠️ 确认服务端配置变更是否生效

### 应该关闭调试模式的情况：
- 📱 生产环境部署
- 📱 用户体验测试
- 📱 性能测试
- 📱 正式发布前

## 注意事项

⚠️ **重要提醒**：
1. 调试模式会增加网络请求次数，消耗更多流量
2. 用户可能会感受到更长的加载时间
3. 生产环境务必关闭调试模式（debugMode: false）
4. 调试模式下仍会保存新的计算结果到缓存中

## 技术实现

调试模式的核心逻辑位于 `miniprogram/pages/addProfile/index.js` 文件：

```javascript
// 检查是否为调试模式
const isDebugMode = config.debugMode;
console.log('当前调试模式状态:', isDebugMode);

// 在非调试模式下检查缓存中是否有该时间戳的八字数据
const cachedBaziResult = !isDebugMode ? this.getBaziCache(timestamp) : null;

if (cachedBaziResult && !isDebugMode) {
  // 使用缓存数据
} else {
  // 调用服务端API
}
```

## 快速切换

为方便开发，可以在配置文件中添加注释来快速切换：

```javascript
export const config = {
  useMock: true,
  // 调试模式：开启后不使用缓存，每次都从网络获取八字数据
  debugMode: false,  // 生产环境
  // debugMode: true,   // 开发调试
};
```
