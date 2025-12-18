# feedbackManagement 云函数版本更新

## 版本变更
- **旧版本**: v1.0 (feedbackManagement)
- **新版本**: v1.4 (feedbackManagement_v1_4)
- **更新时间**: 2024年12月

## 变更原因
为了与项目其他云函数版本保持一致，将初始版本从 v1.0 更新为 v1.4。

## 变更内容

### 1. 目录重命名
```bash
cloudfunctions/feedbackManagement → cloudfunctions/feedbackManagement_v1_4
```

### 2. 版本配置更新

#### versionManager.js
```javascript
'1.3.0': {
  calculateBazi: 'v1_1',
  userManagement: 'v1_3',
  profileManagement: 'v1_2',
  cozeFunctions: 'v1_3',
  feedbackManagement: 'v1_4'  // 更新为 v1_4
}
```

### 3. 文档更新

已更新以下文档中的版本信息：

- ✅ `cloudfunctions/feedbackManagement_v1_4/README.md`
- ✅ `cloudfunctions/feedbackManagement_v1_4/package.json`
- ✅ `docs/api/feedbackManagementAPI.md`
- ✅ `docs/user-feedback-cloud-function-implementation.md`
- ✅ `miniprogram/utils/manager/versionManager.js`

## 调用方式

### 在小程序中调用（无需修改代码）

```javascript
const { VersionManager } = require('../../utils/manager/versionManager');

// VersionManager 会自动根据版本配置返回正确的云函数名称
// 对于 v1.4，会自动返回 'feedbackManagement_v1_4'
const functionName = VersionManager.getFunctionName('feedbackManagement');

wx.cloud.callFunction({
  name: functionName,
  data: {
    action: 'submitFeedback',
    data: { ... }
  }
});
```

**重要**: 调用时仍然使用基础名称 `'feedbackManagement'`，VersionManager 会自动处理版本后缀。

## 部署说明

### 部署步骤

1. **通过微信开发者工具部署**
   - 右键点击 `cloudfunctions/feedbackManagement_v1_4` 文件夹
   - 选择「上传并部署：云端安装依赖」
   - 等待部署完成

2. **验证部署**
   - 在云开发控制台查看云函数列表
   - 确认 `feedbackManagement_v1_4` 已成功部署

### 注意事项

⚠️ **重要**: 如果之前已部署过 `feedbackManagement` (v1.0)，需要：
1. 先部署新版本 `feedbackManagement_v1_4`
2. 确认新版本正常工作后
3. 可以选择删除旧版本 `feedbackManagement`（可选）

## 功能说明

版本更新**不影响**任何功能，所有功能保持不变：

- ✅ submitFeedback - 提交用户反馈
- ✅ getUserFeedbacks - 获取用户反馈列表
- ✅ getFeedbackDetail - 获取反馈详情

## 版本命名规范

根据项目规范：
- **v1_0 版本**: 不需要版本后缀（如 `userManagement`）
- **其他版本**: 需要添加版本后缀（如 `userManagement_v1_3`）

因此：
- `feedbackManagement` (v1.0) → `feedbackManagement_v1_4`

## 相关文档

- [API 文档](./api/feedbackManagementAPI.md)
- [云函数 README](../cloudfunctions/feedbackManagement_v1_4/README.md)
- [实施总结](./user-feedback-cloud-function-implementation.md)
- [功能设计](./user-feedback-feature-design.md)

---

*更新时间: 2024年12月*

