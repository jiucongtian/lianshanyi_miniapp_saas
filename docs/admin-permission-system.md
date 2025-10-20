# 管理员权限体系设计方案

## 一、设计概述

### 1.1 设计原则
- **轻量级实现**：基于现有 `users` 表扩展，不新增独立表
- **向前兼容**：不影响现有用户数据和业务逻辑
- **枚举扩展**：使用枚举值而非布尔值，便于后续扩展
- **权限隔离**：管理员功能对普通用户完全不可见
- **手动管理**：管理员账号通过数据库直接设置，不提供接口
- **最小化实现**：只实现权限体系，不实现具体管理功能

### 1.2 核心概念
- **三级角色**：普通用户(none) / 普通管理员(admin) / 超级管理员(super_admin)
- **权限分离**：管理员权限独立于现有用户类型系统
- **渐进式开发**：先建立权限体系，后续根据需要扩展功能

## 二、数据库设计

### 2.1 字段扩展（users表）

在现有 `users` 表基础上新增以下字段：

| 字段名 | 类型 | 必填 | 索引 | 默认值 | 说明 |
|--------|------|------|------|--------|------|
| adminRole | string | 否 | 普通索引 | 'none' | 管理员角色枚举 |

### 2.2 枚举定义

#### 管理员角色枚举 (adminRole)
```javascript
const ADMIN_ROLES = {
  NONE: 'none',           // 普通用户（默认）
  ADMIN: 'admin',         // 普通管理员
  SUPER_ADMIN: 'super_admin' // 超级管理员
}
```

### 2.3 索引设计

新增索引：
- `adminRole`: 普通索引，用于快速筛选管理员用户
- 保持现有 `openid` 唯一索引不变

### 2.4 数据示例

```json
{
  "_id": "user_60a1b2c3d4e5f6789abcdef0",
  "openid": "oABCD1234567890abcdef1234567890ab",
  "nickName": "张三",
  "userTypeCode": "normal",
  "profileQuota": 50,
  "usedProfiles": 3,
  "isActive": true,
  "adminRole": "admin"
}
```

## 三、权限体系设计

### 3.1 权限维度（二维矩阵）

本系统中“用户类型”和“管理员角色”是两个相互独立的维度：
- 用户类型维度：`userTypeCode ∈ { guest, normal, premium }`
- 管理员角色维度：`adminRole ∈ { none, admin, super_admin }`

两者可任意组合，互不影响，示例矩阵：

| userTypeCode \ adminRole | none | admin | super_admin |
|---|---|---|---|
| guest  | 普通访客 | 访客且为管理员 | 访客且为超级管理员 |
| normal | 普通用户 | 普通用户且为管理员 | 普通用户且为超级管理员 |
| premium| 高级用户 | 高级用户且为管理员 | 高级用户且为超级管理员 |

要点：
- 业务功能与配额仍由 `userTypeCode` 决定（guest/normal/premium）。
- 后台可见性/管理员菜单由 `adminRole` 决定（none/admin/super_admin）。
- 管理员也是用户，始终同时拥有一个 `userTypeCode` 与一个 `adminRole`。

### 3.2 权限逻辑

```javascript
const ADMIN_ROLES = {
  NONE: 'none',           // 普通用户
  ADMIN: 'admin',         // 普通管理员
  SUPER_ADMIN: 'super_admin' // 超级管理员
}

// 检查是否为管理员（任何级别）
function isAdmin(adminRole) {
  return adminRole === 'admin' || adminRole === 'super_admin'
}

// 检查是否为超级管理员
function isSuperAdmin(adminRole) {
  return adminRole === 'super_admin'
}

// 检查是否为普通管理员
function isNormalAdmin(adminRole) {
  return adminRole === 'admin'
}
```

## 四、技术实现方案

### 4.1 权限校验工具

```javascript
// 简化的权限校验工具
class AdminPermissionChecker {
  /**
   * 检查是否为管理员（任何级别）
   * @param {string} adminRole - 管理员角色
   * @returns {boolean}
   */
  static isAdmin(adminRole) {
    return adminRole === 'admin' || adminRole === 'super_admin'
  }
  
  /**
   * 检查是否为超级管理员
   * @param {string} adminRole - 管理员角色
   * @returns {boolean}
   */
  static isSuperAdmin(adminRole) {
    return adminRole === 'super_admin'
  }
  
  /**
   * 检查是否为普通管理员
   * @param {string} adminRole - 管理员角色
   * @returns {boolean}
   */
  static isNormalAdmin(adminRole) {
    return adminRole === 'admin'
  }
}
```

### 4.2 云函数扩展

#### 4.2.1 用户管理云函数扩展

在 `userManagement.getUserInfo` 中新增返回字段：

```javascript
// 在现有返回数据基础上新增
{
  // ... 现有字段
  adminRole: user.adminRole || 'none',
  isAdmin: AdminPermissionChecker.isAdmin(user.adminRole),
  isSuperAdmin: AdminPermissionChecker.isSuperAdmin(user.adminRole),
  isNormalAdmin: AdminPermissionChecker.isNormalAdmin(user.adminRole)
}
```

### 4.3 前端页面设计

#### 4.3.1 管理员菜单集成

在现有的 mine 页面设置中增加管理员菜单：

```javascript
// pages/mine/index.js
Page({
  data: {
    // ... 现有数据
    adminMenus: [
      {
        id: 'admin_dashboard',
        title: '管理后台',
        icon: 'admin',
        show: false // 根据用户权限动态设置
      },
      {
        id: 'admin_users',
        title: '用户管理',
        icon: 'users',
        show: false
      },
      {
        id: 'admin_profiles',
        title: '档案管理',
        icon: 'profiles',
        show: false
      },
      {
        id: 'admin_statistics',
        title: '数据统计',
        icon: 'statistics',
        show: false
      }
    ]
  },
  
  onLoad() {
    this.loadUserInfo()
  },
  
  async loadUserInfo() {
    const response = await userService.getUserInfo()
    if (response.success) {
      const userInfo = response.data
      
      // 根据管理员权限显示菜单
      const adminMenus = this.data.adminMenus.map(menu => ({
        ...menu,
        show: userInfo.isAdmin // 只有管理员才能看到
      }))
      
      this.setData({
        userInfo,
        adminMenus
      })
    }
  },
  
  onAdminMenuTap(e) {
    const menuId = e.currentTarget.dataset.id
    
    // 暂时显示假菜单，不实现具体功能
    wx.showToast({
      title: `${menuId} 功能开发中`,
      icon: 'none'
    })
  }
})
```

#### 4.3.2 菜单显示逻辑

```javascript
// 在 mine 页面的 wxml 中
<view class="settings-section">
  <view class="section-title">设置</view>
  
  <!-- 现有设置项 -->
  <view class="setting-item" bindtap="onSettingTap" data-type="profile">
    <text class="setting-text">个人资料</text>
    <text class="setting-arrow">></text>
  </view>
  
  <!-- 管理员菜单（仅管理员可见） -->
  <view wx:if="{{userInfo.isAdmin}}" class="admin-section">
    <view class="section-title admin-title">管理员功能</view>
    
    <view 
      wx:for="{{adminMenus}}" 
      wx:key="id"
      wx:if="{{item.show}}"
      class="setting-item admin-item" 
      bindtap="onAdminMenuTap" 
      data-id="{{item.id}}"
    >
      <text class="setting-text admin-text">{{item.title}}</text>
      <text class="setting-arrow">></text>
    </view>
  </view>
</view>
```

## 五、安全措施

### 5.1 访问控制

1. **菜单级隔离**：管理员菜单只对管理员用户可见
2. **权限验证**：通过 `isAdmin` 字段控制菜单显示
3. **数据隔离**：管理员权限独立于普通用户权限

### 5.2 角色管理

1. **角色控制**：通过 `adminRole` 字段控制权限范围
2. **手动管理**：管理员账号通过数据库直接设置
3. **向前兼容**：不影响现有用户数据和业务逻辑

## 六、部署方案

### 6.1 数据库迁移

1. **字段添加**：在 `users` 集合中添加新字段
2. **索引创建**：为 `adminRole` 字段创建普通索引
3. **数据初始化**：现有用户数据默认 `adminRole: 'none'`

### 6.2 代码部署

1. **云函数更新**：更新 `userManagement` 云函数
2. **前端页面**：更新 mine 页面添加管理员菜单
3. **权限工具**：在公共模块中添加权限校验工具

### 6.3 管理员账号初始化

通过数据库直接设置管理员账号：

```javascript
// 示例：设置超级管理员
db.collection('users').where({
  openid: 'oABCD1234567890abcdef1234567890ab'
}).update({
  data: {
    adminRole: 'super_admin'
  }
})

// 示例：设置普通管理员
db.collection('users').where({
  openid: 'oEFGH1234567890abcdef1234567890cd'
}).update({
  data: {
    adminRole: 'admin'
  }
})
```

## 七、实现清单

### 7.1 数据库变更

1. **更新 users 表文档**：添加 `adminRole` 字段说明
2. **创建索引**：为 `adminRole` 字段创建普通索引
3. **数据迁移**：现有用户数据默认 `adminRole: 'none'`

### 7.2 云函数更新

1. **权限工具类**：创建 `AdminPermissionChecker` 工具类
2. **用户管理云函数**：在 `getUserInfo` 中返回管理员相关字段
3. **公共模块**：将权限工具添加到公共模块中

### 7.3 前端更新

1. **UserBean 更新**：添加管理员相关字段处理
2. **mine 页面更新**：添加管理员菜单显示逻辑
3. **样式调整**：为管理员菜单添加特殊样式

### 7.4 测试验证

1. **权限测试**：验证不同角色的菜单显示
2. **兼容性测试**：确保现有功能不受影响
3. **数据库测试**：验证新字段的默认值设置

## 八、扩展性考虑

### 8.1 角色扩展

后续可以轻松添加新的管理员角色：

```javascript
const ADMIN_ROLES = {
  NONE: 'none',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
  // 新增角色
  CONTENT_ADMIN: 'content_admin',    // 内容管理员
  DATA_ADMIN: 'data_admin',          // 数据管理员
  AUDIT_ADMIN: 'audit_admin'         // 审核管理员
}
```

### 8.2 功能扩展

- **管理页面**：后续可以添加具体的管理功能页面
- **权限细化**：可以基于角色添加更细粒度的权限控制
- **操作审计**：可以添加管理员操作日志记录

## 九、风险评估

### 9.1 兼容性风险

- **低风险**：新增字段都有默认值，不影响现有功能
- **测试建议**：在测试环境充分验证后再上线

### 9.2 安全风险

- **低风险**：当前只实现菜单显示，不涉及敏感操作
- **缓解措施**：通过权限验证确保只有管理员能看到菜单

### 9.3 维护风险

- **低风险**：设计简单，维护成本低
- **文档完善**：提供完整的操作文档和示例

---

## 总结

本方案通过最小化的数据库变更和代码修改，实现了一个轻量级的管理员权限体系基础。核心特点：

1. **向前兼容**：不影响现有业务和用户数据
2. **轻量实现**：基于现有表结构，最小化变更
3. **渐进式开发**：先建立权限体系，后续根据需要扩展功能
4. **安全可控**：通过角色控制，确保权限安全
5. **易于维护**：设计简单，维护成本低

该方案为后续的管理功能开发奠定了坚实的基础，同时保持了系统的简洁性和可维护性。
