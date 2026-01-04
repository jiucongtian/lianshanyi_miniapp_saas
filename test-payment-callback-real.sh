#!/bin/bash

# 支付回调测试脚本（使用真实订单号）
# 使用方法: ./test-payment-callback-real.sh ORDER_1765078947027_cHtZ9KS2

# HTTP触发器地址
CALLBACK_URL="https://cloudbase-8g06skyf81a65a87-1378890368.ap-shanghai.app.tcloudbase.com/payment/notify"

# 从命令行参数获取订单号
ORDER_NO=$1

if [ -z "$ORDER_NO" ]; then
  echo "❌ 错误：请提供订单号"
  echo "用法: ./test-payment-callback-real.sh ORDER_1765078947027_cHtZ9KS2"
  exit 1
fi

echo "========================================="
echo "支付回调测试（真实订单号）"
echo "========================================="
echo ""
echo "测试URL: $CALLBACK_URL"
echo "订单号: $ORDER_NO"
echo ""

# 模拟支付成功回调
echo "发送支付成功回调..."
echo "----------------------------------------"
curl -X POST "$CALLBACK_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"out_trade_no\": \"$ORDER_NO\",
    \"transaction_id\": \"TEST_TRANSACTION_$(date +%s)\",
    \"trade_state\": \"SUCCESS\",
    \"amount\": {
      \"total\": 1,
      \"currency\": \"CNY\"
    }
  }" \
  -w "\nHTTP状态码: %{http_code}\n" \
  -s

echo ""
echo ""
echo "========================================="
echo "测试完成！"
echo "========================================="
echo ""
echo "提示："
echo "1. 检查返回结果是否为 {\"code\":\"SUCCESS\",\"message\":\"成功\"}"
echo "2. 查看云函数日志确认业务逻辑是否执行"
echo "3. 检查 payment_orders 表的订单状态"
echo "4. 检查 users 表的用户类型是否变为 premium"
echo ""

