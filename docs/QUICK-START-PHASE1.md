# Phase 1 快速执行指南

## 🚀 5分钟完成数据库初始化

### 前提条件 ✅

确保已经完成：
- [x] 云开发控制台已开通
- [x] 小程序项目已关联云开发环境

---

## 📝 步骤清单

### ☑️ 步骤 1: 创建数据库集合（2分钟）

在云开发控制台 → 数据库 → 创建集合：

1. **function_products**
   - 权限：仅管理端可读写
   - 创建唯一索引：`functionCode`（⚠️ 必须）

2. **function_quotas**
   - 权限：仅管理端可读写
   - 创建唯一索引：`openid`（⚠️ 必须）

3. **function_usage_records**
   - 权限：仅管理端可读写
   - 创建普通索引：`openid`, `functionCode`, `usageTime`, `usageDate`, `orderId`

### ☑️ 步骤 2: 部署临时云函数（1分钟）

**方式 A：通过命令行（推荐）**

```bash
# 提醒：需要手动部署云函数
# 云函数位置：cloudfunctions/tempInitFunctionPayment/
```

**方式 B：通过云开发控制台**

1. 打开云开发控制台 → 云函数
2. 新建云函数：`tempInitFunctionPayment`
3. 上传代码（选择云端安装依赖）

### ☑️ 步骤 3: 执行初始化（2分钟）

**推荐方式：在小程序端执行**

1. 在任意页面（如 `pages/index/index.js`）添加：

```javascript
Page({
  onLoad() {
    this.runInit();
  },
  
  async runInit() {
    console.log('开始初始化...');
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'tempInitFunctionPayment',
        data: {
          action: 'initAll'  // 一键初始化
        }
      });
      
      console.log('初始化结果:', res.result);
      
      if (res.result.success) {
        wx.showToast({
          title: '初始化成功',
          icon: 'success'
        });
      } else {
        wx.showModal({
          title: '初始化失败',
          content: res.result.error || '请查看控制台'
        });
      }
    } catch (error) {
      console.error('初始化失败:', error);
      wx.showModal({
        title: '错误',
        content: error.errMsg || '请查看控制台'
      });
    }
  }
});
```

2. 运行小程序，查看控制台输出

**或者：在云开发控制台执行**

1. 云开发控制台 → 云函数 → tempInitFunctionPayment → 测试
2. 输入测试参数：
```json
{
  "action": "initAll"
}
```
3. 点击"测试运行"，查看结果

---

## ✅ 验证结果

### 检查商品数据

在云开发控制台 → 数据库 → function_products：

应该看到 2 条记录：
- 智慧洞见（functionCode: wisdom_insight, price: 190）
- AI出报告（functionCode: ai_report, price: 990）

### 检查用户类型配置

在云开发控制台 → 数据库 → static_user_types（或 user_types）：

每个用户类型应该有以下字段：
- `dailyWisdomInsightQuota`
- `dailyAiReportQuota`

验证配额值：
- guest: 智慧洞见=0（不可用）, AI报告=0（不可用）
- normal: 智慧洞见=1次/天, AI报告=1次/天  
- premium: 智慧洞见=无限, AI报告=无限

---

## 🎯 快速测试方案

### 方案1：使用测试脚本

复制 `docs/tools/test-init-script.js` 中的代码到页面：

```javascript
// 导入测试脚本
const initScript = require('../../docs/tools/test-init-script.js');

Page({
  async onLoad() {
    // 一键初始化
    await initScript.runInitAll();
  }
});
```

### 方案2：创建测试按钮

在 WXML 中添加：

```xml
<button bindtap="onInit">一键初始化</button>
<button bindtap="onValidate">验证数据</button>
```

在 JS 中：

```javascript
Page({
  async onInit() {
    wx.showLoading({ title: '初始化中...', mask: true });
    
    const res = await wx.cloud.callFunction({
      name: 'tempInitFunctionPayment',
      data: { action: 'initAll' }
    });
    
    wx.hideLoading();
    
    console.log('结果:', res.result);
    
    wx.showModal({
      title: res.result.success ? '成功' : '失败',
      content: JSON.stringify(res.result, null, 2),
      showCancel: false
    });
  },
  
  async onValidate() {
    const res = await wx.cloud.callFunction({
      name: 'tempInitFunctionPayment',
      data: { action: 'validateAll' }
    });
    
    console.log('验证结果:', res.result);
    
    wx.showModal({
      title: res.result.success ? '验证通过' : '验证失败',
      content: `商品: ${res.result.products.valid ? '✅' : '❌'}\n用户类型: ${res.result.userTypes.valid ? '✅' : '❌'}`,
      showCancel: false
    });
  }
});
```

---

## 🛠️ 常见问题

### Q1: 云函数调用失败
**A:** 检查：
1. 云函数是否已部署
2. 云函数是否选择了"云端安装依赖"
3. 小程序是否已关联云开发环境

### Q2: 集合不存在
**A:** 先在云开发控制台创建集合，再执行初始化

### Q3: 唯一索引冲突
**A:** 数据已存在，可以：
- 删除现有数据后重新初始化
- 或跳过（云函数会自动跳过已存在的数据）

### Q4: 用户类型表找不到
**A:** 云函数会自动检测 `static_user_types` 或 `user_types`，确保其中一个表存在

---

## 🧹 清理

初始化完成并验证通过后：

1. 删除测试代码（页面中的 `runInit` 方法）
2. 删除临时云函数（可选，建议保留用于其他环境）

```bash
# 在云开发控制台删除
云函数 → tempInitFunctionPayment → 删除
```

---

## ⏭️ 下一步

Phase 1 完成后，进入 **Phase 2: 配额管理云函数开发**

查看：`docs/function-payment-implementation-plan.md`

---

## 📞 需要帮助？

### 查看详细文档
- `cloudfunctions/tempInitFunctionPayment/README.md` - 云函数使用说明
- `docs/database/phase1-function-payment-setup.md` - 详细执行步骤
- `docs/phase1-completion-summary.md` - Phase 1 总结

### 调试技巧
1. 查看云函数日志：云开发控制台 → 云函数 → 日志
2. 查看数据库：云开发控制台 → 数据库
3. 使用 `validateAll` action 验证数据完整性

---

**预计时间：** 5分钟  
**难度：** ⭐☆☆☆☆（简单）  
**状态：** 可直接执行

**创建时间：** 2024年12月18日

