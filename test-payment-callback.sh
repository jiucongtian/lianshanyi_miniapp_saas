#!/bin/bash

# 支付回调HTTP触发器测试脚本
# 使用方法: ./test-payment-callback.sh

# HTTP触发器地址
CALLBACK_URL="https://cloudbase-8g06skyf81a65a87-1378890368.ap-shanghai.app.tcloudbase.com/payment/notify"

echo "========================================="
echo "支付回调HTTP触发器测试"
echo "========================================="
echo ""
echo "测试URL: $CALLBACK_URL"
echo ""

# 测试1: 基本回调测试（订单不存在）
echo "测试1: 基本回调测试（订单不存在）"
echo "----------------------------------------"
curl -X POST "$CALLBACK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "out_trade_no": "ORDER_TEST_'$(date +%s)'",
    "transaction_id": "TEST_TRANSACTION_'$(date +%s)'",
    "trade_state": "SUCCESS",
    "amount": {
      "total": 100,
      "currency": "CNY"
    }
  }' \
  -w "\nHTTP状态码: %{http_code}\n" \
  -s

echo ""
echo ""

# 测试2: 支付成功回调
echo "测试2: 支付成功回调"
echo "----------------------------------------"
curl -X POST "$CALLBACK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "out_trade_no": "ORDER_SUCCESS_'$(date +%s)'",
    "transaction_id": "SUCCESS_TRANSACTION_'$(date +%s)'",
    "trade_state": "SUCCESS",
    "amount": {
      "total": 1000,
      "currency": "CNY"
    }
  }' \
  -w "\nHTTP状态码: %{http_code}\n" \
  -s

echo ""
echo ""

# 测试3: 支付失败回调
echo "测试3: 支付失败回调"
echo "----------------------------------------"
curl -X POST "$CALLBACK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "out_trade_no": "ORDER_FAIL_'$(date +%s)'",
    "transaction_id": "FAIL_TRANSACTION_'$(date +%s)'",
    "trade_state": "PAYERROR"
  }' \
  -w "\nHTTP状态码: %{http_code}\n" \
  -s

echo ""
echo ""

echo "========================================="
echo "测试完成！"
echo "========================================="
echo ""
echo "提示："
echo "1. 如果返回 '订单不存在'，说明回调处理逻辑正常"
echo "2. 查看云函数日志确认是否收到回调"
echo "3. 使用真实订单号测试时，需要先创建订单"
echo ""

