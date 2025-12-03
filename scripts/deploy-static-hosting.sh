#!/bin/bash

# 静态托管部署脚本
# 用于将static-hosting目录的文件部署到云开发静态托管

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 环境ID
ENV_ID="cloudbase-8g06skyf81a65a87"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  静态托管部署脚本${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 检查是否安装了CloudBase CLI
if ! command -v tcb &> /dev/null; then
    echo -e "${RED}错误: 未安装CloudBase CLI${NC}"
    echo -e "${YELLOW}请运行以下命令安装:${NC}"
    echo "npm install -g @cloudbase/cli"
    exit 1
fi

echo -e "${GREEN}✓ CloudBase CLI 已安装${NC}"
echo ""

# 检查static-hosting目录是否存在
if [ ! -d "static-hosting" ]; then
    echo -e "${RED}错误: static-hosting目录不存在${NC}"
    exit 1
fi

echo -e "${GREEN}✓ static-hosting目录存在${NC}"
echo ""

# 列出将要上传的文件
echo -e "${YELLOW}将要上传的文件:${NC}"
ls -lh static-hosting/
echo ""

# 确认是否继续
read -p "是否继续部署? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}已取消部署${NC}"
    exit 0
fi

# 执行部署
echo ""
echo -e "${GREEN}开始部署到静态托管...${NC}"
echo ""

tcb hosting deploy ./static-hosting -e $ENV_ID

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}下一步操作:${NC}"
echo "1. 访问控制台获取静态托管域名:"
echo "   https://console.cloud.tencent.com/tcb/hosting"
echo ""
echo "2. 配置小程序 miniprogram/config/index.js:"
echo "   staticHosting.baseUrl = '你的静态托管域名'"
echo ""
echo "3. 在微信公众平台配置业务域名:"
echo "   https://mp.weixin.qq.com"
echo ""
echo -e "${GREEN}提示: 可以访问以下URL测试:${NC}"
echo "https://[你的域名]/user-manual.html"
echo ""

