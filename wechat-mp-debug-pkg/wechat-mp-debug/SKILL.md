---
name: wechat-mp-debug
description: "微信小程序 CDP 调试。通过 Chrome DevTools Protocol 连接微信开发者工具模拟器，支持截图、console 日志读取、JS 执行、点击/滚动交互。用于调试小程序 UI 和逻辑问题。"
---

# 微信小程序 CDP 调试

通过 Chrome DevTools Protocol 连接微信开发者工具模拟器，实现自主调试小程序。

## 前置条件

- macOS + 微信开发者工具已安装 (`/Applications/wechatwebdevtools.app/`)
- Node.js 22+ (内置 WebSocket)
- 开发者工具已打开并加载了小程序项目

## 启动开发者工具 (带 CDP)

**首次启动或重启:**

```bash
# 关闭已有实例并用 CDP 端口重启
pkill -f wechatwebdevtools 2>/dev/null; sleep 2
open -a wechatwebdevtools --args --remote-debugging-port=9333
```

**验证连接:**

```bash
curl -s http://localhost:9333/json/version
# 应返回含 "Browser": "Chrome/91..." 的 JSON
```

> 注意: 开发者工具启动后需要等待项目编译完成 (约 5-10 秒) 才能发现 targets。

## 脚本路径

```
SCRIPT=~/.claude/skills/wechat-mp-debug/scripts/mp-cdp.mjs
```

所有命令格式: `node $SCRIPT <command> [options]`

## 命令参考

### start - 启动后台日志守护进程

```bash
node $SCRIPT start --project=fuge-mp
```

在后台持续监听 appservice 的 console 输出，写入 `/tmp/mp-debug/{project}/console.log`。
支持自动重连：连接断开后自动重试。

**启动方式** (后台运行):
```bash
mkdir -p /tmp/mp-debug/fuge-mp && node $SCRIPT start --project=fuge-mp > /tmp/mp-debug/fuge-mp/daemon-stdout.log 2>&1 &
```

**文件目录**:
- `/tmp/mp-debug/{project}/console.log` — 持续写入的日志文件
- `/tmp/mp-debug/{project}/screenshots/` — 截图存放目录
- `/tmp/mp-debug/{project}/daemon.pid` — 守护进程 PID 文件

### stop - 停止守护进程

```bash
node $SCRIPT stop --project=fuge-mp
```

### status - 检查守护进程状态

```bash
node $SCRIPT status --project=fuge-mp
```

返回 JSON: running, pid, logFile, screenshotsDir 等。

### discover - 发现 CDP targets

```bash
node $SCRIPT discover [--port=9333] [--project=fuge-mp]
```

输出 JSON: 项目列表、pageframe (渲染层) 和 appservice (逻辑层) 的 target 信息。
每次开始调试前先执行此命令确认 targets 就绪。

### screenshot - 截取模拟器截图

```bash
node $SCRIPT screenshot [--port=9333] [--project=fuge-mp] [--output=/tmp/mp-debug/screenshot.png]
```

截取小程序页面 (非 IDE 外壳)，保存为 PNG。
默认路径: `/tmp/mp-debug/screenshot-{timestamp}.png`
截图后用 Read 工具查看图片分析 UI。

### logs - 读取 console 日志

```bash
node $SCRIPT logs [--port=9333] [--project=fuge-mp] [--duration=5] [--eval="expression"]
```

从 appservice 逻辑层读取 console.log/warn/error，持续 N 秒。
stderr 实时输出日志条目，stdout 输出完整 JSON 汇总。

`--eval` 参数: 在**监听建立后**执行 JS 表达式，确保不遗漏瞬时日志。
典型用法: 编辑代码后，用 `--eval` 触发页面切换来捕获 onShow 等生命周期日志:
```bash
node $SCRIPT logs --project=fuge-mp --duration=3 --eval="wx.switchTab({url: '/pages/home/home'})"
```

### eval - 执行 JS 表达式

```bash
node $SCRIPT eval [--port=9333] [--project=fuge-mp] "expression"
```

在 appservice 逻辑层执行 JS。可访问小程序运行时 API。

### click - 模拟点击

```bash
node $SCRIPT click [--port=9333] [--project=fuge-mp] <x> <y>
```

在 pageframe 渲染层坐标 (x, y) 处派发鼠标点击。

### scroll - 模拟滚动

```bash
node $SCRIPT scroll [--port=9333] [--project=fuge-mp] <deltaX> <deltaY>
```

在 pageframe 渲染层上派发滚动事件。deltaY 正值向下滚。

### reload - 重启小程序 (备用)

```bash
node $SCRIPT reload [--project=fuge-mp]
```

通过 `wx.reLaunch` 重启小程序（销毁所有页面并重新创建）。
**通常不需要**: DevTools 自带文件监听，编辑文件后 2-3 秒自动热加载。
仅在自动热加载失效、或需要强制重建页面实例时使用。

## 调试工作流

### 会话初始化

每次进入小程序项目调试时：
1. `discover` 确认 targets 就绪
2. `status --project=NAME` 检查 daemon 是否运行
3. 如未运行，启动 daemon: `mkdir -p /tmp/mp-debug/NAME && node $SCRIPT start --project=NAME > /tmp/mp-debug/NAME/daemon-stdout.log 2>&1 &`

### 标准循环: **screenshot → 分析 → 修改 → 等待热加载 → 验证**

1. `screenshot` 截取当前页面，用 Read 查看
2. 分析截图确定问题或下一步操作
3. 按需执行:
   - `eval` 获取运行时数据/状态
   - 读取 `/tmp/mp-debug/{project}/console.log` 查看实时日志 (daemon 持续写入)
   - `click`/`scroll` 进行 UI 交互
   - 编辑代码文件修复问题
4. 等待 2-3 秒 (DevTools 自动检测文件变更并热加载)
5. `screenshot` 验证修改效果
6. 读取 `console.log` 文件检查日志输出
7. 重复直到问题解决

> 热加载说明: DevTools 自带文件监听，编辑 .wxml/.wxss/.js 文件后会自动重编译，无需手动触发。JS 修改后需 `reload` 强制重建页面实例才能执行新代码。

## 常用 eval 表达式

```javascript
// 当前页面栈
getCurrentPages().map(p => p.route)

// 当前页面 data
JSON.stringify(getCurrentPages().slice(-1)[0].data, null, 2)

// App 全局数据
JSON.stringify(getApp().globalData, null, 2)

// 导航到指定页面
wx.navigateTo({url: '/pages/home/home'})

// 触发下拉刷新
getCurrentPages().slice(-1)[0].onPullDownRefresh()

// 获取系统信息
JSON.stringify(wx.getSystemInfoSync())
```

## 多项目支持

开发者工具可同时加载多个小程序项目，使用 `--project` 参数区分:

```bash
# 列出所有已加载的项目
node $SCRIPT discover

# 指定项目操作 (支持名称子串匹配)
node $SCRIPT screenshot --project=fuge-mp
node $SCRIPT eval --project=playmate-mp "getCurrentPages().map(p=>p.route)"

# 修改文件后触发指定项目重新编译
node $SCRIPT reload --project=fuge-mp
```

**工作原理**: 通过读取项目 `project.config.json` 中的 appid，与运行时 `__wxConfig.accountInfo.appId` 匹配，精确关联内部端口。

**添加新项目到 DevTools**: 使用 DevTools HTTP API 打开项目:
```bash
# 读取 HTTP API 端口
IDE_PORT=$(cat ~/Library/Application\ Support/微信开发者工具/50a7d9210159a32f006158795f893857/Default/.ide)
# 打开新项目
curl "http://localhost:${IDE_PORT}/v2/open?projectpath=/path/to/your-mp"
```

单项目时无需 `--project` 参数。

## 故障排查

| 问题 | 解决方案 |
|------|---------|
| `fetch failed` | 确认 DevTools 已用 `--remote-debugging-port=9333` 启动 |
| `未找到 pageframe target` | 等待项目编译完成，或在 DevTools 中手动刷新模拟器 |
| 截图空白/全黑 | 先 click 激活窗口再截图 |
| 端口被占用 | `lsof -i :9333` 查看，换用 `--port=9334` |
| `WebSocket connect timeout` | 增加 `--timeout=20000` |
