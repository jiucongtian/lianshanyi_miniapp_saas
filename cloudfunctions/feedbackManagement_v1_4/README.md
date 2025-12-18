# feedbackManagement 云函数

## 功能概述

用户反馈管理云函数，提供用户反馈提交、查询等功能。

## 版本信息

- **云函数版本**: v1.4
- **对应客户端版本**: v1.3.0+
- **创建时间**: 2024-12

## 支持的 Action

| Action | 功能描述 |
|--------|---------|
| submitFeedback | 提交用户反馈 |
| getUserFeedbacks | 获取用户反馈列表 |
| getFeedbackDetail | 获取反馈详情 |

## 依赖

- `wx-server-sdk`: ~2.6.3

## 数据库依赖

### 读取的集合
- `users`: 验证用户信息
- `feedbacks`: 查询反馈数据

### 写入的集合
- `feedbacks`: 创建反馈记录

## 部署方式

### 1. 安装依赖

```bash
cd cloudfunctions/feedbackManagement_v1_4
npm install
```

### 2. 部署到云端

方法一：通过微信开发者工具
1. 右键点击 `feedbackManagement_v1_4` 文件夹
2. 选择「上传并部署：云端安装依赖」

方法二：通过命令行
```bash
# 需要先配置好微信开发者工具的命令行工具
tcb fn deploy feedbackManagement_v1_4 --envId your-env-id
```

## 测试验证

### 1. 在云开发控制台测试

```json
{
  "action": "submitFeedback",
  "data": {
    "feedbackType": "problem",
    "title": "测试反馈标题，这是一个测试标题",
    "content": "这是一个测试反馈内容，用于验证云函数是否正常工作，内容长度需要大于20个字符。"
  }
}
```

### 2. 在小程序中测试

```javascript
const { VersionManager } = require('../../utils/manager/versionManager');

const functionName = VersionManager.getFunctionName('feedbackManagement');

wx.cloud.callFunction({
  name: functionName,
  data: {
    action: 'submitFeedback',
    data: {
      feedbackType: 'problem',
      title: '测试反馈标题，这是一个测试标题',
      content: '这是一个测试反馈内容，用于验证云函数是否正常工作，内容长度需要大于20个字符。'
    }
  }
}).then(res => {
  console.log('测试结果:', res);
});
```

## 业务规则

### 反馈类型
- `problem`: 问题反馈
- `suggestion`: 功能建议
- `other`: 其他反馈

### 内容限制
- 标题: 10-50个字符
- 内容: 20-500个字符

### 反馈状态
- `pending`: 待处理（默认）
- `processing`: 处理中
- `resolved`: 已处理
- `closed`: 已关闭

## 错误处理

所有错误都会返回统一格式：

```json
{
  "success": false,
  "error": "错误描述",
  "code": "ERROR_CODE"
}
```

## 日志规范

- 使用 `console.log` 记录正常信息，格式：`[functionName] 描述`
- 使用 `console.error` 记录错误信息，格式：`[functionName] 错误描述`

## 注意事项

1. **权限验证**: 所有操作都会验证用户是否存在且激活
2. **数据安全**: 用户只能查看和提交自己的反馈
3. **软删除**: 使用 `isDeleted` 标记删除，不会真正删除数据
4. **状态管理**: 反馈状态由管理员在后台管理，用户端暂不支持修改

## 相关文档

- [API 文档](../../docs/api/feedbackManagementAPI.md)
- [数据库文档](../../docs/database/feedbacksdb.md)
- [用户反馈功能实现计划](../../docs/user-feedback-implementation-plan.md)

## 后续扩展计划

- [ ] 图片上传支持
- [ ] 反馈撤回功能
- [ ] 反馈评论功能
- [ ] 管理员回复通知
- [ ] 管理端功能（查看、处理、统计）

