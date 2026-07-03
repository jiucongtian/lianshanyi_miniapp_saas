# ── aquai.shenxinyou.com Python 服务 Dockerfile ──────────────────────────────
# 使用前请确认：
#   1. Python 版本（默认 3.11，按实际调整）
#   2. 源码目录（将源码复制到此 Dockerfile 同级目录后 build）
#   3. 启动命令（默认 uvicorn main:app，按实际框架调整）
#
# 构建：docker build -t aquai-python:latest .
# 运行：docker run -p 127.0.0.1:8000:8000 aquai-python:latest

ARG PYTHON_VERSION=3.11

# ── Stage 1: 构建依赖 ─────────────────────────────────────────────────────────
FROM python:${PYTHON_VERSION}-slim AS builder

WORKDIR /app

# 安装构建依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 优先复制 requirements，利用层缓存
COPY requirements.txt ./
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Stage 2: 运行时镜像 ───────────────────────────────────────────────────────
FROM python:${PYTHON_VERSION}-slim AS runtime

# 安全：创建非 root 用户
RUN useradd --no-log-init --no-create-home --shell /bin/false appuser

WORKDIR /app

# 从构建阶段复制已安装依赖
COPY --from=builder /install /usr/local

# 复制源码（执行 build 时当前目录需包含完整源码）
COPY --chown=appuser:appuser . .

# 数据目录（如需持久化文件请在 compose 中挂载此路径）
RUN mkdir -p /app/data && chown appuser:appuser /app/data

USER appuser

EXPOSE 8000

# ── 默认启动命令 ──────────────────────────────────────────────────────────────
# FastAPI / Starlette: uvicorn main:app --host 0.0.0.0 --port 8000
# Flask:               gunicorn -w 4 -b 0.0.0.0:8000 main:app
# Django:              gunicorn -w 4 -b 0.0.0.0:8000 project.wsgi:application
# 按实际框架修改下方命令
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
