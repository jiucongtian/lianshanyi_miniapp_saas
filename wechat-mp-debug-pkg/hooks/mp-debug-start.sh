#!/bin/bash
# SessionStart hook: 自动为小程序项目启动 CDP 日志守护进程
# 条件: 1) 当前目录含小程序项目  2) DevTools CDP 端口可用

SCRIPT="$HOME/.claude/skills/wechat-mp-debug/scripts/mp-cdp.mjs"
CDP_PORT=9333

# 检查 CDP 端口是否可用
if ! curl -s --connect-timeout 2 "http://localhost:${CDP_PORT}/json/version" > /dev/null 2>&1; then
  exit 0
fi

# 在当前目录和一级子目录中查找小程序项目 (app.json + pages/)
find_mp_projects() {
  for dir in . */; do
    dir="${dir%/}"
    if [ -f "$dir/app.json" ] && [ -d "$dir/pages" ]; then
      (cd "$dir" && basename "$(pwd)")
    fi
  done
}

started=""
for project in $(find_mp_projects); do
  pidfile="/tmp/mp-debug/$project/daemon.pid"

  # 检查是否已在运行
  if [ -f "$pidfile" ]; then
    pid=$(cat "$pidfile" 2>/dev/null)
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      started="${started}${project}(pid:${pid},already running) "
      continue
    fi
  fi

  # 启动 daemon
  mkdir -p "/tmp/mp-debug/$project"
  node "$SCRIPT" start --project="$project" > "/tmp/mp-debug/$project/daemon-stdout.log" 2>&1 &
  daemon_pid=$!
  sleep 1
  started="${started}${project}(pid:${daemon_pid}) "
done

if [ -n "$started" ]; then
  echo "MP debug daemon: ${started}"
fi
