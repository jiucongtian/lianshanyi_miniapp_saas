# 微信小程序 CDP 调试

**适用范围**: 仅当工作目录为微信小程序项目时生效 (项目特征: 存在 app.json + pages/ 目录 + .wxml 文件)。
非小程序项目请忽略此规则。

## 会话初始化

进入小程序项目调试时，先确保 daemon 在运行:
```bash
SCRIPT=~/.claude/skills/wechat-mp-debug/scripts/mp-cdp.mjs

# 1. 检查 daemon 状态
node $SCRIPT status --project=PROJECT_NAME

# 2. 如未运行，启动 daemon (持续捕获 console 日志到文件)
mkdir -p /tmp/mp-debug/PROJECT_NAME && node $SCRIPT start --project=PROJECT_NAME > /tmp/mp-debug/PROJECT_NAME/daemon-stdout.log 2>&1 &
```

## 何时使用

当在小程序项目中遇到以下场景时，使用 `/wechat-mp-debug` skill 或直接调用脚本:

- 修改 UI 后需要验证效果
- 排查页面显示/布局问题
- 调试逻辑层 JS 错误
- 查看运行时数据 (页面 data, globalData)
- 测试页面交互 (点击, 滚动, 导航)

## 前提

微信开发者工具需带 CDP 启动:
```bash
pkill -f wechatwebdevtools 2>/dev/null; sleep 2
open -a wechatwebdevtools --args --remote-debugging-port=9333
```

## 快速命令

```bash
SCRIPT=~/.claude/skills/wechat-mp-debug/scripts/mp-cdp.mjs

# 发现 targets
node $SCRIPT discover [--project=fuge-mp]

# 截图 → 用 Read 查看 (保存到 /tmp/mp-debug/{project}/screenshots/)
node $SCRIPT screenshot [--project=fuge-mp]

# 查看 daemon 持续捕获的日志 (推荐方式)
# 用 Read 工具读取 /tmp/mp-debug/{project}/console.log

# 临时读取日志 (daemon 不可用时的备选)
node $SCRIPT logs --duration=5 [--project=fuge-mp]

# 监听日志 + 执行操作 (确保不漏瞬时日志)
node $SCRIPT logs --duration=3 --project=fuge-mp --eval="wx.switchTab({url: '/pages/home/home'})"

# 执行 JS
node $SCRIPT eval [--project=fuge-mp] "getCurrentPages().map(p=>p.route)"

# 点击坐标
node $SCRIPT click [--project=fuge-mp] 200 400

# 修改文件后等 2-3 秒自动热加载，然后截图验证
# 如果需要强制重建页面实例，用 reload (wx.reLaunch)
node $SCRIPT reload [--project=fuge-mp]
```

多项目时 `--project` 必填，支持名称子串匹配。单项目可省略。
热加载: DevTools 自动监听文件变更，编辑后 2-3 秒自动重编译，无需手动触发。
JS 改动后需 `reload` 强制重建页面实例才能执行新代码。
