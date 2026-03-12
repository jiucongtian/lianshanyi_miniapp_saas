#!/bin/bash
# SessionEnd hook: 停止所有 CDP 日志守护进程，释放资源

stopped=""
for pidfile in /tmp/mp-debug/*/daemon.pid; do
  [ -f "$pidfile" ] || continue
  project=$(basename "$(dirname "$pidfile")")
  pid=$(cat "$pidfile" 2>/dev/null)

  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null
    stopped="${stopped}${project}(pid:${pid}) "
  fi
  rm -f "$pidfile"
done

if [ -n "$stopped" ]; then
  echo "MP debug daemon stopped: ${stopped}"
fi
