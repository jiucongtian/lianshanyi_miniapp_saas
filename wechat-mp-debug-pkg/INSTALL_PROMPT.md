# Claude Code 一键安装提示词

下载 `wechat-mp-debug-skill.zip` 后，在 Claude Code CLI 中粘贴以下内容：

---

```
我下载了一个 Claude Code Skill 的 zip 包，路径是 ~/Downloads/wechat-mp-debug-skill.zip
（如果路径不同请替换为实际路径）

请帮我完成以下安装步骤：

1. 解压 zip 包到临时目录
2. 将 wechat-mp-debug/ 目录复制到 ~/.claude/skills/wechat-mp-debug/
3. 将 hooks/mp-debug-start.sh 和 hooks/mp-debug-stop.sh 复制到 ~/.claude/hooks/ 并添加可执行权限
4. 将 rules/wechat-mp-debug.md 复制到 ~/.claude/rules/
5. 在 ~/.claude/settings.json 中注册 SessionStart 和 SessionEnd hooks：
   - SessionStart: {"type":"command","command":"~/.claude/hooks/mp-debug-start.sh","timeout":15}
   - SessionEnd: {"type":"command","command":"~/.claude/hooks/mp-debug-stop.sh","timeout":5}
   注意：如果 settings.json 中已有 hooks 配置，请合并而不是覆盖
6. 验证安装：
   - 确认 ~/.claude/skills/wechat-mp-debug/SKILL.md 存在
   - 确认 ~/.claude/skills/wechat-mp-debug/scripts/mp-cdp.mjs 存在
   - 确认 node --version 是 22+
   - 确认 settings.json 中 hooks 配置正确
7. 输出安装结果摘要

安装完成后，告诉我如何启动微信开发者工具（带 CDP 端口），
以及如何在下次会话中使用这个 skill。
```

---

## 使用须知

安装完成后，还需要：

1. **重启 Claude Code** — 让 hooks 和 skill 生效
2. **启动微信开发者工具时带 CDP 参数**：
   - macOS: `pkill -f wechatwebdevtools 2>/dev/null; sleep 2; open -a wechatwebdevtools --args --remote-debugging-port=9333`
   - Windows: `"C:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat" --remote-debugging-port=9333`
3. **进入小程序项目目录后启动 Claude Code** — Hook 会自动检测并启动 daemon
