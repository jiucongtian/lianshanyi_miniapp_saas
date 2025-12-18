# 用户反馈功能设计方案

## 一、功能概述

### 1.1 功能目标
为用户提供一个便捷的反馈渠道，收集用户在使用小程序过程中遇到的问题、建议和意见，帮助产品持续改进。

### 1.2 核心功能
- **提交反馈**：用户可以提交问题反馈、功能建议、使用意见等
- **反馈分类**：支持多种反馈类型（问题反馈、功能建议、其他）
- **管理员查看**：管理员可以查看和处理所有用户的反馈

### 1.3 用户场景
1. **问题反馈**：用户遇到bug或使用问题，可以提交反馈
2. **功能建议**：用户对产品有改进建议，可以提交功能建议
3. **意见反馈**：用户对产品有任何意见或想法，可以提交反馈

## 二、数据库设计

### 2.1 反馈表（feedbacks）

#### 数据表概述
存储用户提交的反馈信息，包括反馈内容、类型等。状态字段仅用于后台管理，不对用户展示。

#### 数据表名称
`feedbacks`

#### 字段定义

| 字段名 | 类型 | 必填 | 索引 | 说明 |
|--------|------|------|------|------|
| 字段名 | 类型 | 必填 | 索引 | 说明 |
|--------|------|------|------|------|
| _id | string | 是 | 主键 | 系统自动生成的文档ID |
| userId | string | 是 | 索引 | 用户ID，关联users表的_id |
| openid | string | 是 | 索引 | 用户openid，用于快速查询用户反馈 |
| feedbackType | string | 是 | 索引 | 反馈类型（problem/suggestion/other） |
| title | string | 是 | - | 反馈标题（10-50个字符） |
| content | string | 是 | - | 反馈内容（20-500个字符） |
| status | string | 是 | 索引 | 反馈状态（pending/processing/resolved/closed），仅后台使用 |
| adminReply | string | 否 | - | 管理员回复内容 |
| adminId | string | 否 | 索引 | 处理反馈的管理员ID |
| replyTime | date | 否 | - | 管理员回复时间 |
| createTime | date | 是 | 索引 | 反馈创建时间 |
| updateTime | date | 是 | - | 反馈最后更新时间 |
| isDeleted | boolean | 否 | - | 是否已删除（软删除），默认false |

#### 数据示例

```json
{
  "_id": "feedback_60a1b2c3d4e5f6789abcdef0",
  "userId": "user_60a1b2c3d4e5f6789abcdef0",
  "openid": "oABCD1234567890abcdef1234567890ab",
  "feedbackType": "problem",
  "title": "卡牌显示异常",
  "content": "在查看卡牌时，发现某些卡牌的图片显示不出来，希望能修复这个问题。",
  "status": "pending",
  "adminReply": null,
  "adminId": null,
  "replyTime": null,
  "createTime": "2023-09-14T08:00:00.000Z",
  "updateTime": "2023-09-14T08:00:00.000Z",
  "isDeleted": false
}
```

#### 索引设计

- `userId`: 普通索引，用于查询用户的反馈列表
- `openid`: 普通索引，用于快速查询用户反馈
- `feedbackType`: 普通索引，用于按类型筛选反馈
- `status`: 普通索引，用于按状态筛选反馈
- `createTime`: 普通索引，用于按时间排序

#### 与其他数据表的关系

- **users表**: 多对一关系
  - 外键: `feedbacks.userId` 关联 `users._id`
  - 关系描述: 一个用户可以提交多条反馈

#### 业务规则

1. **反馈类型枚举**：
   - `problem`: 问题反馈（bug、使用问题等）
   - `suggestion`: 功能建议（新功能建议、改进建议等）
   - `other`: 其他反馈（意见、想法等）

2. **反馈状态枚举**：
   - `pending`: 待处理（默认状态）
   - `processing`: 处理中（管理员已开始处理）
   - `resolved`: 已处理（问题已解决）
   - `closed`: 已关闭（反馈已关闭，不再处理）

3. **内容限制**：
   - 标题：10-50个字符
   - 内容：20-500个字符

5. **软删除**：使用isDeleted字段进行软删除，不直接删除反馈数据

## 三、架构设计

### 3.1 分层架构

```
┌─────────────────────────────────────┐
│ View Layer (视图层)                  │
│ pages/feedback/                      │
│ pages/feedbackList/                  │
└─────────────────────────────────────┘
 ↓
┌─────────────────────────────────────┐
│ Controller Layer (控制器层)          │
│ controllers/FeedbackController.js   │
│ controllers/FeedbackListController.js│
└─────────────────────────────────────┘
 ↓
┌─────────────────────────────────────┐
│ Service Layer (服务层)               │
│ services/FeedbackService.js         │
└─────────────────────────────────────┘
 ↓
┌─────────────────────────────────────┐
│ Bean Layer (数据层)                  │
│ beans/FeedbackBean.js               │
└─────────────────────────────────────┘
 ↓
┌─────────────────────────────────────┐
│ Cloud Function (云函数层)            │
│ cloudfunctions/feedbackManagement/  │
└─────────────────────────────────────┘
```

### 3.2 Bean层设计

#### FeedbackBean.js
```javascript
// beans/FeedbackBean.js
class FeedbackBean {
  constructor(data) {
    // 基础字段
    this._id = data._id || '';
    this.userId = data.userId || '';
    this.openid = data.openid || '';
    this.feedbackType = data.feedbackType || 'other';
    this.title = data.title || '';
    this.content = data.content || '';
    this.status = data.status || 'pending';
    this.adminReply = data.adminReply || null;
    this.adminId = data.adminId || null;
    this.replyTime = data.replyTime || null;
    this.createTime = data.createTime || null;
    this.updateTime = data.updateTime || null;
    this.isDeleted = data.isDeleted || false;
    
    // 验证
    this._validate(data);
  }
  
  _validate(data) {
    if (!data._id) {
      console.warn('[FeedbackBean] 缺少_id字段');
    }
    
    const validTypes = ['problem', 'suggestion', 'other'];
    if (!validTypes.includes(this.feedbackType)) {
      console.error('[FeedbackBean] 反馈类型无效:', this.feedbackType);
    }
    
    const validStatuses = ['pending', 'processing', 'resolved', 'closed'];
    if (!validStatuses.includes(this.status)) {
      console.error('[FeedbackBean] 反馈状态无效:', this.status);
    }
  }
  
  // 业务方法
  getTypeText() {
    const typeMap = {
      problem: '问题反馈',
      suggestion: '功能建议',
      other: '其他反馈'
    };
    return typeMap[this.feedbackType] || '其他反馈';
  }
}

module.exports = { FeedbackBean };
```

### 3.3 Service层设计

#### FeedbackService.js
```javascript
// services/FeedbackService.js
const { BaseService } = require('./BaseService');
const { FeedbackBean } = require('../beans/FeedbackBean');

class FeedbackService extends BaseService {
  /**
   * 提交反馈
   * @param {Object} feedbackData - 反馈数据
   * @param {string} feedbackData.feedbackType - 反馈类型
   * @param {string} feedbackData.title - 反馈标题
   * @param {string} feedbackData.content - 反馈内容
   * @returns {Promise<ResponseBean>} 提交结果响应
   */
  async submitFeedback(feedbackData) {
    const response = await this.callFunction('feedbackManagement', {
      action: 'submitFeedback',
      data: feedbackData
    });
    
    if (response.success && response.data) {
      response.data = new FeedbackBean(response.data);
    }
    
    return response;
  }
}

// 导出单例
module.exports = {
  FeedbackService,
  feedbackService: new FeedbackService()
};
```

### 3.4 Controller层设计

#### FeedbackController.js
```javascript
// controllers/FeedbackController.js
const { BaseController } = require('./BaseController');
const { feedbackService } = require('../services/FeedbackService');

class FeedbackController extends BaseController {
  constructor(page) {
    super(page);
    this.feedbackType = 'other'; // 默认反馈类型
  }
  
  /**
   * 初始化页面
   */
  async initialize() {
    this.page.setData({
      feedbackType: this.feedbackType,
      title: '',
      content: '',
      submitting: false
    });
  }
  
  /**
   * 选择反馈类型
   * @param {string} type - 反馈类型
   */
  selectFeedbackType(type) {
    this.feedbackType = type;
    this.page.setData({ feedbackType: type });
  }
  
  /**
   * 输入标题
   * @param {string} title - 标题内容
   */
  onTitleInput(title) {
    this.page.setData({ title });
  }
  
  /**
   * 输入内容
   * @param {string} content - 内容
   */
  onContentInput(content) {
    this.page.setData({ content });
  }
  
  /**
   * 提交反馈
   */
  async submitFeedback() {
    const { title, content } = this.page.data;
    
    // 验证
    if (!title || title.trim().length < 10 || title.trim().length > 50) {
      this._showToast('标题长度为10-50个字符', 'error');
      return;
    }
    
    if (!content || content.trim().length < 20 || content.trim().length > 500) {
      this._showToast('内容长度为20-500个字符', 'error');
      return;
    }
    
    this.page.setData({ submitting: true });
    
    const response = await feedbackService.submitFeedback({
      feedbackType: this.feedbackType,
      title: title.trim(),
      content: content.trim()
    });
    
    this.page.setData({ submitting: false });
    
    if (response.success) {
      this._showToast('反馈提交成功，感谢您的反馈！', 'success');
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } else {
      this._showToast('提交失败：' + response.error, 'error');
    }
  }
}

module.exports = { FeedbackController };
```

### 3.5 云函数设计

#### feedbackManagement/index.js
```javascript
// cloudfunctions/feedbackManagement/index.js
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 云函数入口函数
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { action, data } = event;
  
  try {
    switch (action) {
      case 'submitFeedback':
        return await submitFeedback(wxContext, data);
      default:
        return {
          success: false,
          error: '未知操作类型'
        };
    }
  } catch (error) {
    console.error('[feedbackManagement] 云函数执行失败:', error);
    return {
      success: false,
      error: error.message || '操作失败'
    };
  }
};

/**
 * 提交反馈
 */
async function submitFeedback(wxContext, data) {
  const { OPENID } = wxContext;
  const { feedbackType, title, content } = data;
  
  // 验证参数
  if (!feedbackType || !title || !content) {
    return {
      success: false,
      error: '参数不完整'
    };
  }
  
  // 验证反馈类型
  const validTypes = ['problem', 'suggestion', 'other'];
  if (!validTypes.includes(feedbackType)) {
    return {
      success: false,
      error: '反馈类型无效'
    };
  }
  
  // 验证内容长度
  if (title.length < 10 || title.length > 50) {
    return {
      success: false,
      error: '标题长度为10-50个字符'
    };
  }
  
  if (content.length < 20 || content.length > 500) {
    return {
      success: false,
      error: '内容长度为20-500个字符'
    };
  }
  
  try {
    // 获取用户信息
    const userResult = await db.collection('users')
      .where({ openid: OPENID, isActive: true })
      .get();
    
    if (userResult.data.length === 0) {
      return {
        success: false,
        error: '用户不存在'
      };
    }
    
    const user = userResult.data[0];
    
    // 创建反馈记录
    const now = new Date();
    const feedbackResult = await db.collection('feedbacks').add({
      data: {
        userId: user._id,
        openid: OPENID,
        feedbackType,
        title,
        content,
        status: 'pending',
        adminReply: null,
        adminId: null,
        replyTime: null,
        createTime: now,
        updateTime: now,
        isDeleted: false
      }
    });
    
    return {
      success: true,
      data: {
        _id: feedbackResult._id,
        feedbackType,
        title,
        content,
        status: 'pending',
        createTime: now
      },
      message: '反馈提交成功'
    };
  } catch (error) {
    console.error('[submitFeedback] 提交反馈失败:', error);
    return {
      success: false,
      error: '提交反馈失败'
    };
  }
}
```

## 四、页面设计

### 4.1 反馈提交页面（pages/feedback/index）

#### 页面结构
- 反馈类型选择（问题反馈/功能建议/其他反馈）
- 标题输入框（10-50字符）
- 内容输入框（20-500字符）
- 提交按钮

#### 页面路径
`/pages/feedback/index`

### 4.2 入口设计

在"我的"页面（pages/mine/index）添加反馈入口：
- 位置：工具区域，在使用手册下方
- 样式：与其他工具卡片保持一致
- 点击后跳转到反馈提交页面

## 五、业务流程

### 5.1 提交反馈流程

```
用户点击反馈入口
  ↓
进入反馈提交页面
  ↓
选择反馈类型
  ↓
填写标题和内容
  ↓
（可选）上传图片
  ↓
点击提交按钮
  ↓
验证输入内容
  ↓
调用云函数提交反馈
  ↓
显示提交结果
  ↓
返回上一页
```


## 六、接口设计

### 6.1 提交反馈接口

**接口名称**：提交反馈

**接口地址**：`feedbackManagement` 云函数

**请求方式**：POST

**功能说明**：用户提交反馈信息

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| action | string | 是 | 操作类型，固定值：submitFeedback |
| data | object | 是 | 反馈数据 |
| data.feedbackType | string | 是 | 反馈类型（problem/suggestion/other） |
| data.title | string | 是 | 反馈标题（10-50字符） |
| data.content | string | 是 | 反馈内容（20-500字符） |

**返回数据**：

成功响应：
```json
{
  "success": true,
  "data": {
    "_id": "feedback_xxx",
    "feedbackType": "problem",
    "title": "卡牌显示异常",
    "content": "反馈内容",
    "status": "pending",
    "createTime": "2023-09-14T08:00:00.000Z"
  },
  "message": "反馈提交成功"
}
```


## 七、后续扩展

### 7.1 管理员功能
- 管理员可以查看所有用户的反馈
- 管理员可以回复反馈
- 管理员可以修改反馈状态
- 管理员可以统计反馈数据

### 7.2 功能增强
- 反馈优先级设置
- 反馈标签系统
- 反馈搜索功能
- 反馈导出功能
- 反馈通知功能（微信模板消息）

## 八、实施计划

### 阶段一：基础功能（当前方案）
1. 数据库设计文档 ✅
2. Bean层实现
3. Service层实现
4. Controller层实现
5. 云函数实现
6. 反馈提交页面
7. 入口集成（在"我的"页面添加反馈入口）

### 阶段二：后续扩展（可选）
1. 管理员反馈管理页面
2. 反馈回复功能
3. 反馈统计功能
4. 内容审核（敏感词过滤）

## 九、注意事项

1. **数据安全**：用户只能提交反馈，管理员可以查看所有反馈
2. **内容审核**：可以考虑添加敏感词过滤
3. **用户体验**：提交反馈后给予明确的反馈提示，然后返回上一页
4. **错误处理**：完善的错误处理和用户提示
5. **数据验证**：前端和后端都要进行数据验证，确保数据完整性
