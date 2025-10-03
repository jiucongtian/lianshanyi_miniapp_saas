# 临时用户档案配额修复说明

## 问题描述
临时用户在profile页面显示的档案数量上限还是1个，创建新档案时仍然提示已达到上限，需要调整为3个。

## 问题原因
1. 数据库中现有临时用户的`profileQuota`字段值仍为1
2. 虽然代码中已经更新了默认值，但现有用户数据没有同步更新

## 解决方案

### 1. 云函数更新
在`userManagement`云函数中添加了`updateGuestUserQuota`功能：
- 检测临时用户的`profileQuota`字段
- 如果值为1，则更新为3
- 同时更新权限为`['view', 'create_limited']`

### 2. 客户端自动修复
在`profile/index.js`中添加了自动检测和修复逻辑：
- 在`updateUserInfo`方法中调用`checkAndUpdateGuestQuota`
- 检测到临时用户配额为1时，自动调用云函数更新
- 更新成功后同步本地用户信息

### 3. 修改的文件
1. `cloudfunctions/userManagement/index.js`
   - 添加`updateGuestUserQuota`action
   - 添加`updateGuestUserQuota`函数

2. `miniprogram/pages/profile/index.js`
   - 修改`updateUserInfo`方法
   - 添加`checkAndUpdateGuestQuota`方法

## 修复效果
- 现有临时用户的档案配额自动更新为3个
- profile页面正确显示"3/3"而不是"1/1"
- 创建档案时的限制检查使用正确的配额值
- 新创建的临时用户默认配额为3个

## 注意事项
- 修复是一次性的，用户下次进入profile页面时会自动触发
- 不会影响普通用户和高级用户的配额
- 修复过程中会输出详细的日志信息

## 测试建议
1. 使用临时用户账号登录
2. 进入profile页面，检查显示是否为"x/3"
3. 尝试创建第4个档案，应该提示配额已满
4. 检查控制台日志，确认修复过程正常执行
