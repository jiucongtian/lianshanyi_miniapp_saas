#!/bin/bash
# =============================================================================
# aquai.shenxinyou.com Python 服务迁移到 Docker + 系统 Nginx
# 适用环境：PROD（生产）
# 执行前提：
#   1. 已确认 Python 源码目录（PYTHON_SRC_DIR）
#   2. 已确认启动命令（Dockerfile CMD 已按实际框架修改）
#   3. 已将 deploy/aquai/ 中的文件拷贝到 DEPLOY_DIR
#   4. 以具有 sudo 权限的用户执行
#
# 风险等级：【中风险】
#   - 涉及停止线上服务（停机窗口约 1-3 分钟）
#   - 操作前已备份数据目录和配置文件
#
# 执行方式：
#   chmod +x scripts/migrate-aquai-to-docker.sh
#   sudo bash scripts/migrate-aquai-to-docker.sh
#
# 回滚方式见脚本底部 rollback() 函数
# =============================================================================

set -euo pipefail

# ── 【必须修改】变量配置 ──────────────────────────────────────────────────────
# Python 服务源码目录（执行 ps aux | grep python 确认）
PYTHON_SRC_DIR="/your/python/service/path"

# Docker Compose 和 Dockerfile 放置目录
DEPLOY_DIR="/opt/aquai"

# 备份目录
BACKUP_DIR="/opt/backups/aquai-$(date +%Y%m%d_%H%M%S)"

# 系统 Nginx 配置目录
NGINX_CONF_DIR="/etc/nginx/conf.d"

# 宝塔 Nginx 配置目录（如不同请修改）
BT_NGINX_CONF_DIR="/www/server/panel/vhost/nginx"

# 服务检查 URL（迁移后验证用）
CHECK_URL="http://aquai.shenxinyou.com"

# ── 颜色输出 ─────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log_info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

# ── 前置检查 ─────────────────────────────────────────────────────────────────
preflight_check() {
    log_info "=== 前置检查 ==="

    if [[ "$PYTHON_SRC_DIR" == "/your/python/service/path" ]]; then
        log_error "请先修改脚本中的 PYTHON_SRC_DIR 变量！"
        log_info "执行以下命令确认 Python 服务源码目录："
        log_info "  ps aux | grep python"
        exit 1
    fi

    if [[ ! -d "$PYTHON_SRC_DIR" ]]; then
        log_error "源码目录不存在：$PYTHON_SRC_DIR"
        exit 1
    fi

    command -v docker >/dev/null 2>&1 || { log_error "Docker 未安装"; exit 1; }
    command -v docker compose >/dev/null 2>&1 || { log_error "Docker Compose 未安装"; exit 1; }
    command -v nginx >/dev/null 2>&1 || { log_error "系统 nginx 未安装"; exit 1; }

    log_info "前置检查通过 ✓"
}

# ── Step 1: 备份 ─────────────────────────────────────────────────────────────
backup() {
    log_info "=== Step 1: 备份源码和数据 ==="
    mkdir -p "$BACKUP_DIR"

    # 备份源码目录
    log_info "备份源码：$PYTHON_SRC_DIR → $BACKUP_DIR/src"
    cp -rp "$PYTHON_SRC_DIR" "$BACKUP_DIR/src"

    # 备份宝塔 nginx 配置（如存在）
    local bt_conf="$BT_NGINX_CONF_DIR/aquai.shenxinyou.com.conf"
    if [[ -f "$bt_conf" ]]; then
        log_info "备份宝塔 nginx 配置 → $BACKUP_DIR/"
        cp "$bt_conf" "$BACKUP_DIR/aquai.shenxinyou.com.conf.baota.bak"
    else
        log_warn "未找到宝塔 nginx 配置：$bt_conf（跳过备份）"
    fi

    log_info "备份完成：$BACKUP_DIR ✓"
}

# ── Step 2: 准备 Docker 部署目录 ──────────────────────────────────────────────
prepare_deploy_dir() {
    log_info "=== Step 2: 准备 Docker 部署目录 ==="
    mkdir -p "$DEPLOY_DIR"

    # 复制源码到部署目录
    log_info "复制源码到 $DEPLOY_DIR"
    rsync -a --delete "$PYTHON_SRC_DIR/" "$DEPLOY_DIR/src/"

    # 复制 Dockerfile 和 docker-compose.yml（已在 deploy/aquai/ 中准备好）
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    REPO_ROOT="$(dirname "$SCRIPT_DIR")"

    cp "$REPO_ROOT/deploy/aquai/Dockerfile"        "$DEPLOY_DIR/src/"
    cp "$REPO_ROOT/deploy/aquai/docker-compose.yml" "$DEPLOY_DIR/"

    # 若无 .env 文件则创建空文件（避免 docker compose 报错）
    [[ -f "$DEPLOY_DIR/.env" ]] || touch "$DEPLOY_DIR/.env"

    log_info "部署目录准备完成 ✓"
}

# ── Step 3: 构建 Docker 镜像 ──────────────────────────────────────────────────
build_image() {
    log_info "=== Step 3: 构建 Docker 镜像 ==="
    cd "$DEPLOY_DIR/src"

    # 构建镜像（不启动，先验证构建成功）
    docker build -t aquai-python:latest .
    log_info "镜像构建成功 ✓"
    docker image inspect aquai-python:latest --format '镜像大小: {{.Size}} bytes'
}

# ── Step 4: 停止原进程，启动容器 ─────────────────────────────────────────────
switch_to_container() {
    log_info "=== Step 4: 切换服务（停进程→启容器）【停机窗口开始】==="

    # 4.1 停止原 Python 进程（systemd 服务 or 裸进程）
    log_info "尝试停止 systemd Python 服务（如有）..."
    if systemctl list-units --type=service | grep -q aquai; then
        systemctl stop aquai || true
        systemctl disable aquai || true
        log_info "systemd 服务已停止 ✓"
    else
        # 直接 kill 裸进程
        log_warn "未找到 systemd 服务，尝试 kill Python 进程（:8000）..."
        fuser -k 8000/tcp 2>/dev/null || true
        sleep 2
    fi

    # 确认端口已释放
    if ss -tlnp | grep -q ':8000'; then
        log_error "端口 8000 仍被占用，请手动检查！"
        exit 1
    fi
    log_info "端口 8000 已释放 ✓"

    # 4.2 启动 Docker 容器
    log_info "启动 Docker 容器..."
    cd "$DEPLOY_DIR"
    docker compose up -d

    # 等待容器健康
    log_info "等待容器启动（最多 60s）..."
    local retries=12
    until docker inspect --format='{{.State.Health.Status}}' aquai-python 2>/dev/null | grep -q 'healthy\|running'; do
        retries=$((retries - 1))
        if [[ $retries -le 0 ]]; then
            log_error "容器启动超时，触发回滚！"
            rollback
            exit 1
        fi
        sleep 5
    done

    # 简单本机验证
    if curl -sf "http://127.0.0.1:8000" >/dev/null 2>&1 || curl -sf "http://127.0.0.1:8000/health" >/dev/null 2>&1; then
        log_info "容器服务 :8000 响应正常 ✓"
    else
        log_warn "容器 :8000 未返回 200，请手动确认（可能无 /health 端点）"
    fi
}

# ── Step 5: 配置系统 Nginx ────────────────────────────────────────────────────
configure_nginx() {
    log_info "=== Step 5: 配置系统 Nginx ==="

    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    REPO_ROOT="$(dirname "$SCRIPT_DIR")"

    # 复制 nginx 配置
    cp "$REPO_ROOT/deploy/nginx/aquai.shenxinyou.com.conf" \
       "$NGINX_CONF_DIR/aquai.shenxinyou.com.conf"

    # 验证 nginx 配置语法
    nginx -t
    log_info "Nginx 配置语法检查通过 ✓"

    # 重载 nginx（不停服）
    nginx -s reload
    log_info "Nginx 已重载 ✓  【停机窗口结束】"
}

# ── Step 6: 移除宝塔 Nginx 配置 ──────────────────────────────────────────────
remove_baota_conf() {
    log_info "=== Step 6: 移除宝塔 Nginx 中的 aquai 配置 ==="

    local bt_conf="$BT_NGINX_CONF_DIR/aquai.shenxinyou.com.conf"
    if [[ -f "$bt_conf" ]]; then
        # 重命名为 .disabled（保留备份）
        mv "$bt_conf" "${bt_conf}.disabled"
        log_info "宝塔 nginx 配置已禁用（重命名为 .disabled）✓"

        # 若宝塔 nginx 与系统 nginx 是同一进程，此步可跳过
        # 否则重载宝塔 nginx
        if command -v bt >/dev/null 2>&1; then
            log_info "重载宝塔 nginx..."
            /www/server/nginx/sbin/nginx -t && /www/server/nginx/sbin/nginx -s reload || true
        fi
    else
        log_warn "未找到宝塔 nginx 配置（可能已迁移或路径不同），跳过此步"
    fi
}

# ── Step 7: 上线验证 ──────────────────────────────────────────────────────────
verify() {
    log_info "=== Step 7: 上线验证 ==="

    log_info "容器状态："
    docker ps --filter "name=aquai-python" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

    log_info "HTTP 访问验证："
    if curl -sf -o /dev/null -w "HTTP %{http_code}" "$CHECK_URL"; then
        echo ""
        log_info "外部访问正常 ✓"
    else
        log_warn "外部访问异常，请检查 DNS / Nginx / 防火墙"
    fi

    log_info "验证项清单："
    echo "  [ ] docker ps 显示 aquai-python 容器正在运行"
    echo "  [ ] http://aquai.shenxinyou.com 功能与迁移前一致"
    echo "  [ ] docker restart aquai-python 后服务自动恢复"
    echo "  [ ] 原 Python 进程已停止（ps aux | grep python）"
    echo "  [ ] 宝塔 nginx 中该站点配置已禁用"
}

# ── 回滚方案 ──────────────────────────────────────────────────────────────────
rollback() {
    log_warn "=== 执行回滚 ==="

    # 1. 停止 Docker 容器
    cd "$DEPLOY_DIR" && docker compose down 2>/dev/null || true
    log_warn "Docker 容器已停止"

    # 2. 恢复宝塔 nginx 配置
    local bt_conf="$BT_NGINX_CONF_DIR/aquai.shenxinyou.com.conf"
    if [[ -f "${bt_conf}.disabled" ]]; then
        mv "${bt_conf}.disabled" "$bt_conf"
        log_warn "宝塔 nginx 配置已恢复"
    fi

    # 3. 移除系统 nginx 配置
    rm -f "$NGINX_CONF_DIR/aquai.shenxinyou.com.conf"
    nginx -t && nginx -s reload 2>/dev/null || true

    # 4. 重启原 Python 进程
    if systemctl list-unit-files | grep -q aquai; then
        systemctl start aquai
        log_warn "systemd Python 服务已重启"
    else
        log_warn "请手动重启原 Python 进程！源码位于：$PYTHON_SRC_DIR"
        log_warn "参考命令（按实际框架选择）："
        log_warn "  nohup python main.py > /tmp/aquai.log 2>&1 &"
        log_warn "  nohup uvicorn main:app --host 0.0.0.0 --port 8000 > /tmp/aquai.log 2>&1 &"
        log_warn "  nohup gunicorn -w 4 -b 0.0.0.0:8000 main:app > /tmp/aquai.log 2>&1 &"
    fi

    log_warn "回滚完成，请验证原服务是否恢复正常"
}

# ── 主流程 ────────────────────────────────────────────────────────────────────
main() {
    log_info "========================================================"
    log_info " aquai.shenxinyou.com Python → Docker 迁移脚本"
    log_info " 执行时间：$(date '+%Y-%m-%d %H:%M:%S')"
    log_info " 操作人：$(whoami)"
    log_info "========================================================"

    preflight_check
    backup
    prepare_deploy_dir
    build_image
    switch_to_container
    configure_nginx
    remove_baota_conf
    verify

    log_info "========================================================"
    log_info " 迁移完成！如需回滚，执行："
    log_info "   bash $0 rollback"
    log_info "========================================================"
}

# 支持单独执行回滚
if [[ "${1:-}" == "rollback" ]]; then
    rollback
else
    main
fi
