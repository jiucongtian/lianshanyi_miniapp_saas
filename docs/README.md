# 联山易测试文档

本目录包含联山易小程序的测试用例和测试报告。

## 文件说明

| 文件 | 说明 |
|------|------|
| `test-cases.md` | 完整的测试用例文档 |
| `test-reports/` | 自动生成的测试报告目录 |

## 自动化回归测试

### 快速开始

```bash
# 1. 启动微信开发者工具 (带 CDP 端口)
pkill -f wechatwebdevtools; sleep 2
open -a wechatwebdevtools --args --remote-debugging-port=9333

# 2. 启动 daemon
mkdir -p /tmp/mp-debug/lianshanyi
node ~/.claude/skills/wechat-mp-debug/scripts/mp-cdp.mjs start --project=lianshanyi > /tmp/mp-debug/lianshanyi/daemon-stdout.log 2>&1 &

# 3. 等待开发者工具加载项目后，执行测试
sleep 10
node scripts/regression-test.js

# 快速模式 (只执行核心用例)
node scripts/regression-test.js --quick
```

### 测试用例覆盖

| 模块 | 用例数 | 自动化 |
|------|--------|--------|
| 首页模块 | 3 | ✅ |
| 档案管理 | 4 | 部分 |
| 卡牌模块 | 5 | ✅ |
| 我的模块 | 3 | ✅ |
| 支付系统 | 2 | 部分 |
| 每日洞察 | 1 | ✅ |
| 反馈功能 | 1 | ✅ |
| 异常场景 | 2 | ❌ |

### 测试报告

每次测试执行后，报告会自动生成在 `docs/test-reports/` 目录。

报告内容包括：
- 测试概要统计
- 每个用例的执行结果
- 发现的问题和警告
- 相关截图引用

## 手动测试

对于无法自动化的测试用例（如表单输入、支付流程等），请参考 `test-cases.md` 中的步骤进行手动验证。