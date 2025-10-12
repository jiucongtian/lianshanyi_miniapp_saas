# RegisterController

## 概述
RegisterController 是注册页面的控制器，负责处理用户注册和编辑资料的业务逻辑。

## 主要功能

### 1. 页面初始化
- 支持两种模式：注册模式和编辑模式
- 根据 source 参数自动设置页面标题
- 自动加载用户已有信息（编辑模式）

### 2. 表单管理
- 头像选择和上传
- 昵称输入
- 性别选择（保密/男/女）
- 手机号输入
- 用户协议同意

### 3. 表单验证
- 实时表单验证
- 昵称必填验证
- 手机号格式验证（可选填写）
- 用户协议必须同意

### 4. 数据提交
- 支持两种提交模式：
  - 注册模式：升级用户类型为普通用户
  - 编辑模式：更新用户信息
- 头像上传到云存储
- 旧头像自动删除
- 数据变更检测，避免重复提交

### 5. 导航管理
- 注册成功后跳转到指定页面或我的页面
- 支持跳过注册功能

## 使用方法

### 页面中使用

```javascript
const { RegisterController } = require('../../controllers/RegisterController');

Page({
  data: {
    userInfo: {},
    formValid: false,
    loading: false
  },
  
  onLoad(options) {
    this.controller = new RegisterController(this);
    this.controller.initialize(options);
  },
  
  // 表单输入事件
  onNickNameInput(e) {
    this.controller.onNickNameInput(e);
  },
  
  onGenderChange(e) {
    this.controller.onGenderChange(e);
  },
  
  onPhoneNumberInput(e) {
    this.controller.onPhoneNumberInput(e);
  },
  
  onAgreeTermsChange(e) {
    this.controller.onAgreeTermsChange(e);
  },
  
  // 提交注册
  async onSubmitRegister() {
    await this.controller.submitRegister();
  }
});
```

### 页面跳转参数

#### 注册模式
```javascript
wx.navigateTo({
  url: '/pages/register/index'
});
```

#### 编辑模式
```javascript
wx.navigateTo({
  url: '/pages/register/index?source=edit'
});
```

#### 指定返回页面
```javascript
wx.navigateTo({
  url: '/pages/register/index?returnUrl=/pages/profile/index'
});
```

## API 方法

### 初始化方法

#### initialize(options)
初始化页面，加载用户信息

**参数：**
- `options.source` - 来源标识（'edit' 表示编辑模式）
- `options.returnUrl` - 注册成功后跳转的页面

**示例：**
```javascript
this.controller.initialize({ 
  source: 'edit', 
  returnUrl: '/pages/mine/index' 
});
```

### 表单处理方法

#### onChooseAvatar(e)
处理头像选择事件

#### onNickNameInput(e)
处理昵称输入事件

#### onGenderChange(e)
处理性别选择事件

#### onPhoneNumberInput(e)
处理手机号输入事件

#### onAgreeTermsChange(e)
处理用户协议同意状态切换

#### validateForm()
验证表单有效性

#### onViewTerms()
查看用户协议

### 数据提交方法

#### submitRegister()
提交注册或更新用户信息

**流程：**
1. 验证表单是否完整
2. 检测数据是否有变更
3. 上传头像（如果有）
4. 提交用户信息
5. 删除旧头像（如果有）
6. 跳转到指定页面

**返回：**
- Promise<void>

### 导航方法

#### skipRegister()
跳过注册，继续使用临时账户

## 数据结构

### userInfo
```javascript
{
  nickName: string,      // 昵称
  avatarUrl: string,     // 头像URL
  gender: number,        // 性别：0-保密, 1-男, 2-女
  phoneNumber: string    // 手机号
}
```

### 页面状态
```javascript
{
  formValid: boolean,           // 表单是否有效
  agreeTerms: boolean,          // 是否同意用户协议
  loading: boolean,             // 是否加载中
  tempAvatarPath: string,       // 临时头像路径
  originalUserInfo: object,     // 原始用户信息
  source: string,               // 来源标识
  returnUrl: string,            // 返回页面
  genderOptions: array          // 性别选项
}
```

## 注意事项

1. **头像上传**
   - 头像先保存为临时路径，提交时才上传到云存储
   - 上传成功后会自动删除旧头像
   - 使用 `avatars/${openid}-${timestamp}.jpg` 格式命名

2. **表单验证**
   - 昵称必填
   - 手机号可选，但如果填写则必须符合格式
   - 必须同意用户协议

3. **数据变更检测**
   - 提交前会检测数据是否有变更
   - 如果没有变更，会提示用户

4. **页面跳转**
   - 自动识别 TabBar 页面和普通页面
   - TabBar 页面使用 `switchTab` 跳转
   - 普通页面使用 `navigateTo` 跳转
   - 跳转失败时自动降级到我的页面

5. **错误处理**
   - 所有操作都有完整的错误处理
   - 错误信息会通过 Toast 提示用户

## 重构说明

### 重构前
- 原页面代码：458 行
- 包含大量业务逻辑和辅助方法
- 代码复杂度高，难以维护

### 重构后
- 页面代码：110 行（减少 76%）
- Controller 代码：366 行
- 职责清晰，易于维护和测试

### 优势
1. **代码简洁**：页面只负责事件绑定和数据渲染
2. **逻辑复用**：Controller 可以在其他地方复用
3. **易于测试**：业务逻辑独立，便于单元测试
4. **易于维护**：修改业务逻辑只需修改 Controller

