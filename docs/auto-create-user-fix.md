# 自动创建用户功能修复

## 问题
你完全正确！之前的修复方案有问题：
- ❌ 只在本地临时创建用户数据
- ❌ 数据没有保存到云端数据库
- ❌ 下次启动时数据会丢失

## 正确的解决方案
当用户不存在时，应该**自动在云端数据库创建 guest 用户**，就像旧版本一样。

## 修复内容

### 核心修复：`globalUserManager.js`

在 `_loadUserInfo()` 方法中添加自动创建用户的逻辑：

```javascript
async _loadUserInfo(source) {
  try {
    let response = await userService.getUserInfo(true);

    // 如果用户不存在，自动创建 guest 用户到云端数据库
    if (!response.success && response.error && response.error.includes('用户不存在')) {
      log.info('_loadUserInfo', '用户不存在，自动创建guest用户');
      
      // 调用 createUser 在云端创建新用户
      const createResult = await userService.createUser({});
      
      if (createResult.success) {
        response = createResult;  // 使用创建后返回的完整用户信息
        response.data.isNewUser = true;
      }
    }
    
    // ... 后续处理
  }
}
```

## 工作流程

### 新用户首次启动
1. `globalUserManager.initialize()` → 尝试获取用户信息
2. 云函数返回"用户不存在"
3. 🎯 **自动调用 `createUser()` 在数据库创建 guest 用户**
4. 云函数创建用户记录：`{ userType: 'guest', profileQuota: 3, ... }`
5. 返回完整的用户信息
6. 页面正常显示"临时用户"和"立即注册"按钮

### 下次启动
1. `globalUserManager.initialize()` → 获取用户信息
2. 从云端数据库成功读取已存在的用户记录
3. 页面正常显示用户信息

## 验证云函数逻辑

云函数 `userManagement/index.js` (line 246) 确实会创建 guest 用户：

```javascript
const userDoc = {
  openid: OPENID,
  userType: 'guest',  // ✅ 默认创建 guest 用户
  usedProfiles: 0,
  isActive: true,
  // ...
}
await db.collection('users').add({ data: userDoc })
```

## 对比旧版本

旧版本（8375617）使用的是：
```javascript
// app.js
await userManager.initUser()

// userManager.js
async initUser() {
  const result = await userService.createUser(dataToSend);  // ✅ 自动创建
  if (result.success) {
    const fullUserInfo = await this.getFullUserInfo();      // 获取完整信息
    // ...
  }
}
```

新版本（修复后）：
```javascript
// app.js
await globalUserManager.initialize()

// globalUserManager.js
async _loadUserInfo() {
  let response = await userService.getUserInfo();
  
  if (!response.success && response.error.includes('用户不存在')) {
    const createResult = await userService.createUser({});  // ✅ 自动创建
    if (createResult.success) {
      response = createResult;  // 已包含完整用户信息
    }
  }
  // ...
}
```

## 数据持久化

✅ **修复后的行为**：
- 用户数据存储在云端 `users` 表
- 跨设备同步
- 数据持久化
- 支持用户升级（guest → normal → premium）

❌ **修复前的行为**：
- 数据只在本地内存
- 下次启动丢失
- 无法同步
- 每次都要重新处理

## 修改的文件
- ✅ `miniprogram/utils/manager/globalUserManager.js` - 核心修复
- ✅ `miniprogram/controllers/MineController.js` - 容错处理
- ✅ `miniprogram/controllers/AddProfileController.js` - 容错处理

## 测试验证

启动小程序后检查日志：
```
[GlobalUserManager:_loadUserInfo] 开始加载用户信息
[GlobalUserManager:_loadUserInfo] 用户不存在，自动创建guest用户
[UserService] {action: "createUser", data: {…}}
[GlobalUserManager:_loadUserInfo] 用户创建成功，重新获取用户信息
[GlobalUserManager:_loadUserInfo] 用户信息加载成功 {userType: "guest", ...}
```

检查数据库：
- 在 `users` 表中应该能看到新创建的用户记录
- `userType` 应该是 `"guest"`
- `usedProfiles` 应该是 `0`

## 总结

感谢你的指正！现在的实现与旧版本一致：
- ✅ 自动在云端数据库创建 guest 用户
- ✅ 数据持久化保存
- ✅ 下次启动正常加载
- ✅ 支持用户升级流程

