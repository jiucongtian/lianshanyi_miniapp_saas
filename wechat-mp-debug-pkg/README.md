# wechat-mp-debug — Claude Code 微信小程序 CDP 调试 Skill

让 Claude Code CLI 通过 Chrome DevTools Protocol (CDP) 自主调试微信小程序：截图、日志捕获、JS 执行、模拟点击、自动验证。

## 工作原理

```
Claude Code CLI
     │
     │ 调用 node mp-cdp.mjs <command>
     ▼
Node.js 脚本 (零依赖, 650 行)
     │
     │ WebSocket (CDP 协议)
     ▼
微信开发者工具 (基于 Chromium 91 / NW.js)
     │
     ├── pageframe target  → 截图、点击、滚动（渲染层）
     └── appservice target → 日志、eval、reload（逻辑层）
```

**核心发现**：微信开发者工具底层是 Chromium 91，启动时加 `--remote-debugging-port=9333` 就暴露了标准的 Chrome DevTools Protocol。脚本通过 WebSocket 连接这些 target，即可实现截图、日志读取、JS 执行等能力。

**双 target 架构**：小程序运行时分为 pageframe（渲染层，负责 UI）和 appservice（逻辑层，负责 JS）。截图和点击走 pageframe，日志和 eval 走 appservice。

**多项目识别**：通过读取项目 `project.config.json` 中的 appid，与运行时 `__wxConfig.accountInfo.appId` 匹配，精确关联目标端口。

---

## 环境要求

| 依赖 | 版本 | 说明 |
|------|------|------|
| Node.js | **22+** | 需要内置 WebSocket 和 fetch（零 npm 依赖） |
| Claude Code CLI | 最新版 | Anthropic 官方 CLI |
| 微信开发者工具 | 任意版本 | 基于 Chromium，支持 CDP |

---

## 安装步骤

### 1. 复制文件

将 skill 目录复制到 Claude Code 的 skills 目录：

```bash
# 创建目标目录
mkdir -p ~/.claude/skills/wechat-mp-debug

# 复制文件
cp -r wechat-mp-debug/* ~/.claude/skills/wechat-mp-debug/
```

最终目录结构：

```
~/.claude/skills/wechat-mp-debug/
├── SKILL.md              # Skill 定义（Claude Code 自动读取）
└── scripts/
    └── mp-cdp.mjs        # CDP 调试脚本（零依赖）
```

### 2. 安装 Hook（可选，推荐）

Hook 让 Claude Code 新会话自动启动/停止 daemon，无需手动操作。

```bash
# 复制 hook 脚本
cp hooks/mp-debug-start.sh ~/.claude/hooks/
cp hooks/mp-debug-stop.sh ~/.claude/hooks/
chmod +x ~/.claude/hooks/mp-debug-start.sh
chmod +x ~/.claude/hooks/mp-debug-stop.sh
```

在 `~/.claude/settings.json` 中注册 hook：

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/mp-debug-start.sh",
            "timeout": 15
          }
        ]
      }
    ],
    "SessionEnd": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/mp-debug-stop.sh",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

> 如果你的 `settings.json` 已有 hooks 配置，将上面的条目合并进去即可。

### 3. 添加调试规则（可选）

将 `rules/wechat-mp-debug.md` 复制到 Claude Code 规则目录，让 Claude 知道何时使用调试能力：

```bash
# 用户级规则（所有项目生效）
mkdir -p ~/.claude/rules
cp rules/wechat-mp-debug.md ~/.claude/rules/

# 或项目级规则（仅特定项目生效）
cp rules/wechat-mp-debug.md your-project/.claude/rules/
```

---

## 配置微信开发者工具（关键步骤）

### macOS

```bash
# 方法 1：命令行启动（推荐）
# 先关闭已有实例，再带 CDP 端口启动
pkill -f wechatwebdevtools 2>/dev/null; sleep 2
open -a wechatwebdevtools --args --remote-debugging-port=9333

# 方法 2：创建快捷方式（永久生效）
# 编辑 ~/.zshrc 或 ~/.bashrc
alias wxdev='pkill -f wechatwebdevtools 2>/dev/null; sleep 2; open -a wechatwebdevtools --args --remote-debugging-port=9333'
```

**微信开发者工具的安装路径**：
- 默认位置：`/Applications/wechatwebdevtools.app/`
- `open -a` 会自动查找 Applications 目录

### Windows

```powershell
# 方法 1：命令行启动
# 先关闭已有实例
taskkill /f /im wechatdevtools.exe 2>nul
timeout /t 2

# 启动（需要找到实际安装路径）
# 默认安装路径通常为以下之一：
"C:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat" --remote-debugging-port=9333

# 或
"%LOCALAPPDATA%\微信web开发者工具\cli.bat" --remote-debugging-port=9333

# 方法 2：创建批处理文件 wxdev.bat
# 内容：
# @echo off
# taskkill /f /im wechatdevtools.exe 2>nul
# timeout /t 2
# start "" "C:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat" --remote-debugging-port=9333
```

**Windows 注意事项**：
- 脚本中的临时文件路径 `/tmp/mp-debug/` 在 Windows 上不存在，需要修改脚本中的 `getProjectDir` 函数，改为 `%TEMP%\mp-debug\` 或其他路径
- Hook 脚本是 bash 格式，Windows 需要 Git Bash 或 WSL 来执行
- 推荐在 WSL 2 中运行 Claude Code + 本脚本，Windows 端只运行微信开发者工具

### Linux（WSL 2 场景）

微信开发者工具没有官方 Linux 版本。推荐方案：

```bash
# Windows 端：启动微信开发者工具（带 CDP 端口）
# 在 PowerShell 中执行上面的 Windows 命令

# WSL 2 中：通过 Windows 主机 IP 连接
# WSL 中访问 Windows 的 localhost 需要用主机 IP
WIN_HOST=$(cat /etc/resolv.conf | grep nameserver | awk '{print $2}')

# 验证连接
curl -s http://${WIN_HOST}:9333/json/version

# 使用时指定端口（通过 --port 参数传入主机 IP 不支持，需修改脚本或用端口转发）
# 推荐：在 WSL 中设置端口转发
socat TCP-LISTEN:9333,fork TCP:${WIN_HOST}:9333 &

# 之后正常使用即可
node ~/.claude/skills/wechat-mp-debug/scripts/mp-cdp.mjs discover
```

---

## 验证安装

### 1. 确认微信开发者工具 CDP 端口可用

```bash
curl -s http://localhost:9333/json/version
# 应返回类似：
# {"Browser":"Chrome/91.0.4472.164","Protocol-Version":"1.3",...}
```

### 2. 发现 targets

```bash
node ~/.claude/skills/wechat-mp-debug/scripts/mp-cdp.mjs discover
# 应返回项目列表和 pageframe/appservice target 信息
```

### 3. 截图测试

```bash
node ~/.claude/skills/wechat-mp-debug/scripts/mp-cdp.mjs screenshot
# 应在 /tmp/mp-debug/screenshots/ 下生成 PNG 文件
```

### 4. 在 Claude Code 中使用

```bash
# 进入小程序项目目录
cd your-mp-project

# 启动 Claude Code
claude

# 在对话中使用 /wechat-mp-debug skill，或直接描述调试需求
# 例如："帮我看看首页的布局问题"、"截图当前页面"
```

---

## 命令速查表

```bash
SCRIPT=~/.claude/skills/wechat-mp-debug/scripts/mp-cdp.mjs

# === 守护进程 ===
node $SCRIPT start --project=my-app          # 启动后台日志监听
node $SCRIPT stop --project=my-app           # 停止
node $SCRIPT status --project=my-app         # 查看状态

# === 调试命令 ===
node $SCRIPT discover [--project=my-app]     # 发现 targets
node $SCRIPT screenshot [--project=my-app]   # 截图
node $SCRIPT eval [--project=my-app] "expr"  # 执行 JS
node $SCRIPT logs [--duration=5] [--project=my-app]  # 读取日志
node $SCRIPT click [--project=my-app] 200 400        # 模拟点击
node $SCRIPT scroll [--project=my-app] 0 300         # 模拟滚动
node $SCRIPT reload [--project=my-app]       # 重启小程序

# === 常用 eval 表达式 ===
node $SCRIPT eval "getCurrentPages().map(p => p.route)"           # 当前页面栈
node $SCRIPT eval "getCurrentPages().slice(-1)[0].data"           # 页面 data
node $SCRIPT eval "getApp().globalData"                           # 全局数据
node $SCRIPT eval "wx.navigateTo({url: '/pages/home/home'})"     # 跳转页面
```

---

## 典型工作流

```
1. 启动微信开发者工具（带 --remote-debugging-port=9333）
2. 打开小程序项目
3. 启动 Claude Code（Hook 自动启动 daemon）
4. Claude Code 自动进入调试循环：
   截图 → 分析 UI → 修改代码 → 等待热加载(2-3s) → 再次截图验证
5. 会话结束时 Hook 自动清理 daemon
```

---

## 故障排查

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| `curl: (7) Failed to connect` | DevTools 未启动或未带 CDP 参数 | 用 `--remote-debugging-port=9333` 重启 |
| `fetch failed` | CDP 端口不可用 | `lsof -i :9333` 检查端口占用 |
| `未找到 pageframe target` | 项目未编译完成 | 等 5-10 秒，或在 DevTools 中手动编译 |
| 截图空白/全黑 | 模拟器窗口未激活 | 先 click 激活再截图 |
| `WebSocket connect timeout` | 网络延迟 | 增加 `--timeout=20000` |
| Windows 路径错误 | `/tmp/` 不存在 | 修改脚本或使用 WSL |
| Hook 未自动启动 | settings.json 配置错误 | 检查 hooks 注册是否正确 |

---

## 文件清单

```
wechat-mp-debug/
├── README.md                        # 本说明文件
├── wechat-mp-debug/
│   ├── SKILL.md                     # Claude Code Skill 定义
│   └── scripts/
│       └── mp-cdp.mjs              # CDP 调试脚本（核心，650 行，零依赖）
├── hooks/
│   ├── mp-debug-start.sh           # SessionStart hook（自动启动 daemon）
│   └── mp-debug-stop.sh            # SessionEnd hook（自动停止 daemon）
└── rules/
    └── wechat-mp-debug.md          # Claude Code 调试规则文件
```

---

## 技术细节

- **协议**：Chrome DevTools Protocol (CDP)，微信开发者工具基于 Chromium 91 内置支持
- **传输**：WebSocket，通过 `http://localhost:9333/json` 发现 target 的 `webSocketDebuggerUrl`
- **零依赖**：利用 Node.js 22+ 内置的 WebSocket 和 fetch API，无需 npm install
- **双通道日志**：同时监听 `Runtime.consoleAPICalled` 和 `Console.messageAdded`，用 Set 去重
- **安全重载**：不使用 `Page.reload`（会导致 target crash），而是通过 `wx.reLaunch` 安全重建页面实例
- **Daemon 模式**：后台进程持续监听日志，支持断线自动重连（指数退避，最大 15 秒）

---

## 许可

MIT License

由 Claude Code (Opus 4.6) 协助开发和文档编写。
