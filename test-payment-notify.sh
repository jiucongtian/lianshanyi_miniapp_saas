#!/bin/bash

# 支付通知接口测试脚本
# 使用curl命令测试，避免浏览器CORS问题

URL="https://cloudbase-8g06skyf81a65a87-1378890368.ap-shanghai.app.tcloudbase.com/payment/notify"

echo "=========================================="
echo "支付通知接口测试"
echo "=========================================="
echo ""
echo "测试URL: $URL"
echo ""

# 测试1: GET请求
echo "----------------------------------------"
echo "测试1: GET请求"
echo "----------------------------------------"
curl -X GET "$URL" \
  -H "Content-Type: application/json" \
  -v \
  -w "\n\nHTTP状态码: %{http_code}\n响应时间: %{time_total}s\n" \
  2>&1

echo ""
echo ""

# 测试2: POST请求（空body）
echo "----------------------------------------"
echo "测试2: POST请求（空body）"
echo "----------------------------------------"
curl -X POST "$URL" \
  -H "Content-Type: application/json" \
  -v \
  -w "\n\nHTTP状态码: %{http_code}\n响应时间: %{time_total}s\n" \
  2>&1

echo ""
echo ""

# 测试3: POST请求（带测试数据）
echo "----------------------------------------"
echo "测试3: POST请求（带测试数据）"
echo "----------------------------------------"
curl -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d '{
    "test": true,
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
    "out_trade_no": "TEST_ORDER_'$(date +%s)'"
  }' \
  -v \
  -w "\n\nHTTP状态码: %{http_code}\n响应时间: %{time_total}s\n" \
  2>&1

echo ""
echo ""

# 测试4: OPTIONS请求（CORS预检）
echo "----------------------------------------"
echo "测试4: OPTIONS请求（CORS预检）"
echo "----------------------------------------"
curl -X OPTIONS "$URL" \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v \
  -w "\n\nHTTP状态码: %{http_code}\n响应时间: %{time_total}s\n" \
  2>&1

echo ""
echo "=========================================="
echo "测试完成"
echo "=========================================="

