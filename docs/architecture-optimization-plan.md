# 架构优化实施方案（方案一）

## 目标

在不引入 Model 层的前提下，通过明确各层职责，优化现有架构，提升代码质量和可维护性。

## 核心原则

1. **Bean 层增强**：从被动数据容器升级为业务数据对象
2. **Service 层简化**：专注 API 调用，移除复杂业务逻辑
3. **Manager 层规范**：处理跨模块复杂业务
4. **Controller 层精简**：只做页面逻辑协调

---

## 分层职责定义

### 1. Bean 层（增强业务能力）

**职责：**
- ✅ 数据验证和格式化
- ✅ 业务判断方法（新增）
- ✅ 数据转换方法（新增）
- ✅ 数据完整性检查
- ❌ 不做 API 调用
- ❌ 不做 UI 操作

**示例：**
```javascript
class UserBean extends BaseBean {
  constructor(data) {
    super(data);
    this.id = this._getField(data, '_id', '', 'string');
    this.userType = this._getField(data, 'userType', 'guest', 'string');
    this.profileQuota = this._getField(data, 'profileQuota', 3, 'number');
    this.usedProfiles = this._getField(data, 'usedProfiles', 0, 'number');
    this._validate();
  }
  
  // ✅ 业务判断方法
  canCreateMore() {
    return this.profileQuota === -1 || this.usedProfiles < this.profileQuota;
  }
  
  canUpgrade(targetType) {
    const upgradeOrder = ['guest', 'normal', 'premium'];
    const currentIndex = upgradeOrder.indexOf(this.userType);
    const targetIndex = upgradeOrder.indexOf(targetType);
    return targetIndex > currentIndex;
  }
  
  isGuest() {
    return this.userType === 'guest';
  }
  
  isPremium() {
    return this.userType === 'premium';
  }
  
  // ✅ 数据转换方法
  toDisplayFormat() {
    return {
      id: this.id,
      typeName: this.getTypeName(),
      quota: this.getQuotaDisplay(),
      canCreate: this.canCreateMore()
    };
  }
  
  getQuotaDisplay() {
    if (this.profileQuota === -1) return '无限制';
    return `${this.usedProfiles}/${this.profileQuota}`;
  }
  
  getRemainingQuota() {
    return this.profileQuota === -1 
      ? -1 
      : Math.max(0, this.profileQuota - this.usedProfiles);
  }
}
```

### 2. Service 层（简化为 API 调用层）

**职责：**
- ✅ 调用云函数/API
- ✅ 统一错误处理
- ✅ 返回 ResponseBean
- ✅ 简单的数据缓存（可选）
- ❌ 不做业务判断
- ❌ 不做复杂的数据处理

**示例：**
```javascript
class UserService extends BaseService {
  /**
   * 获取用户信息
   * @returns {Promise<ResponseBean>}
   */
  async getUserInfo() {
    const response = await this.callFunction('userManagement', {
      action: 'getUserInfo'
    });
    
    // 只做数据转换为 Bean，不做业务判断
    if (response.isSuccess() && response.data) {
      response.data = new UserBean(response.data);
    }
    
    return response;
  }
  
  /**
   * 升级用户类型
   * ❌ 不在这里做业务判断
   * ✅ 业务判断应该在 Controller 中使用 Bean 的方法
   */
  async upgradeUserType(targetUserType, registrationData = null) {
    return this.callFunction('userManagement', {
      action: 'upgradeUserType',
      data: { targetUserType, registrationData }
    });
  }
  
  /**
   * 创建档案
   * ❌ 不在这里检查配额
   * ✅ 配额检查在 Controller 中使用 UserBean.canCreateMore()
   */
  async createProfile(profileData) {
    return this.callFunction('profileManagement', {
      action: 'createProfile',
      data: profileData
    });
  }
}
```

### 3. Controller 层（协调者）

**职责：**
- ✅ 调用 Service 获取数据
- ✅ 使用 Bean 的业务方法做判断
- ✅ 处理 UI 交互逻辑
- ✅ 更新页面状态
- ❌ 不直接实现业务规则（使用 Bean 的方法）

**示例：**
```javascript
class ProfileController extends BaseController {
  async initialize() {
    await this.loadUserInfo();
    await this.loadProfiles();
  }
  
  async loadUserInfo() {
    const response = await userService.getUserInfo();
    
    if (response.isSuccess()) {
      const userBean = response.data; // 已经是 UserBean 实例
      
      // ✅ 使用 Bean 的业务方法
      this._setData({
        userInfo: userBean,
        canCreateMore: userBean.canCreateMore(),
        quotaDisplay: userBean.getQuotaDisplay(),
        isGuest: userBean.isGuest()
      });
    } else {
      this._showError('获取用户信息失败：' + response.getError());
    }
  }
  
  async onAddProfile() {
    const userBean = this.page.data.userInfo;
    
    // ✅ 使用 Bean 的方法做业务判断
    if (!userBean.canCreateMore()) {
      await this._showQuotaExceededDialog(userBean);
      return;
    }
    
    this._navigateTo('/pages/addProfile/index');
  }
  
  async _showQuotaExceededDialog(userBean) {
    const message = userBean.isGuest() 
      ? '临时用户最多创建3个档案，请注册后继续使用'
      : `您已使用全部配额 (${userBean.getQuotaDisplay()})`;
    
    const confirmed = await this._confirm('配额不足', message);
    
    if (confirmed && userBean.isGuest()) {
      this._navigateTo('/pages/register/index');
    }
  }
}
```

### 4. Manager 层（跨模块业务协调）

**职责：**
- ✅ 处理跨多个 Service 的复杂业务
- ✅ 全局状态管理
- ✅ 事件协调
- ❌ 不直接操作 UI

**示例：**
```javascript
// utils/profileManager.js
class ProfileManager {
  constructor() {
    this.currentProfile = null;
    this.profileList = [];
  }
  
  /**
   * 切换档案（跨模块业务）
   * 涉及：档案选择 + 缓存更新 + 事件通知
   */
  async switchProfile(profileId) {
    // 1. 获取档案数据
    const response = await profileService.getProfile(profileId);
    if (!response.isSuccess()) {
      return response;
    }
    
    const profileBean = new ProfileBean(response.data);
    
    // 2. 更新当前档案
    this.currentProfile = profileBean;
    
    // 3. 保存到本地存储
    wx.setStorageSync('currentProfileId', profileId);
    
    // 4. 发送全局事件
    eventBus.emit(PROFILE_EVENTS.PROFILE_CHANGED, {
      profile: profileBean
    });
    
    return ResponseBean.success(profileBean);
  }
  
  /**
   * 同步档案数据（跨模块业务）
   */
  async syncProfiles() {
    const response = await profileService.getProfiles();
    if (response.isSuccess()) {
      this.profileList = response.data.map(p => new ProfileBean(p));
      eventBus.emit(PROFILE_EVENTS.PROFILES_UPDATED);
    }
    return response;
  }
}
```

---

## 实施计划

### 阶段一：规范化现有代码（1-2天）

#### Task 1.1: 审查和优化 Bean 层

**目标：** 为每个 Bean 类添加业务方法

- [ ] 审查 `UserBean.js`
  - [ ] 添加业务判断方法：`canCreateMore()`, `canUpgrade()`, `isGuest()`, `isPremium()`
  - [ ] 添加数据转换方法：`toDisplayFormat()`, `getQuotaDisplay()`
  - [ ] 添加方法文档注释
  - [ ] 编写单元测试（可选）

- [ ] 审查 `ProfileBean.js`
  - [ ] 添加业务判断方法：`canEdit()`, `canDelete()`, `isValid()`
  - [ ] 添加数据转换方法：`toCardData()`, `toDisplayFormat()`, `formatBirthTime()`
  - [ ] 添加方法文档注释

- [ ] 审查 `BaziBean.js`
  - [ ] 添加业务判断方法：`isComplete()`, `hasLunarDate()`
  - [ ] 添加数据转换方法：`getBaziString()`, `getYearPillar()`, `getMonthPillar()`
  - [ ] 添加方法文档注释

**验收标准：**
- 每个 Bean 类至少有 3 个业务判断方法
- 每个方法都有完整的 JSDoc 注释
- 所有业务方法都有单元测试用例（可选）

#### Task 1.2: 简化 Service 层

**目标：** 移除 Service 中的业务逻辑，只保留 API 调用

- [ ] 审查 `UserService.js`
  - [ ] 移除业务判断逻辑（如配额检查）
  - [ ] 确保每个方法只做 API 调用
  - [ ] 确保返回值转换为 Bean
  - [ ] 更新方法文档注释

- [ ] 审查 `ProfileService.js`
  - [ ] 移除业务判断逻辑
  - [ ] 简化方法实现
  - [ ] 确保返回值转换为 Bean
  - [ ] 更新方法文档注释

**验收标准：**
- Service 方法不包含 if 判断（除了错误处理）
- 每个方法平均代码行数 < 15 行
- 所有方法返回 ResponseBean

#### Task 1.3: 重构 Controller 层

**目标：** Controller 使用 Bean 的业务方法替代自己的判断逻辑

- [ ] 重构 `ProfileController.js`
  - [ ] 使用 `userBean.canCreateMore()` 替代手动配额检查
  - [ ] 使用 `userBean.getQuotaDisplay()` 替代手动格式化
  - [ ] 使用 `profileBean.canDelete()` 替代权限检查逻辑
  - [ ] 更新方法文档

- [ ] 重构 `AddProfileController.js`
  - [ ] 使用 Bean 的验证方法替代手动验证
  - [ ] 使用 Bean 的转换方法处理数据
  - [ ] 简化表单处理逻辑

- [ ] 重构 `CardController.js`
  - [ ] 使用 `profileBean.toCardData()` 获取卡牌数据
  - [ ] 使用 Bean 的格式化方法

- [ ] 重构 `MineController.js`
  - [ ] 使用 `userBean` 的业务方法

**验收标准：**
- Controller 中不直接访问 Bean 的私有属性
- 所有业务判断都使用 Bean 的方法
- Controller 方法平均代码行数减少 20%

### 阶段二：规范化 Manager 层（1天）

#### Task 2.1: 审查现有 Manager

- [ ] 审查 `userManager.js`
  - [ ] 确认职责边界（只做跨模块协调）
  - [ ] 移除应该在 Service 中的 API 调用
  - [ ] 移除应该在 Bean 中的业务判断
  - [ ] 添加文档注释

- [ ] 审查 `profileManager.js`
  - [ ] 确认职责边界
  - [ ] 优化全局状态管理
  - [ ] 优化事件通知机制
  - [ ] 添加文档注释

**验收标准：**
- Manager 不直接调用云函数（通过 Service 调用）
- Manager 使用 Bean 的业务方法做判断
- 有清晰的使用文档

### 阶段三：文档和规范（0.5天）

#### Task 3.1: 更新架构文档

- [ ] 更新 `docs/refactoring-plan.md`
- [ ] 创建 `docs/architecture-guidelines.md`（架构规范）
- [ ] 更新 Bean 层 README
- [ ] 更新 Service 层 README
- [ ] 更新 Controller 层 README

#### Task 3.2: 创建开发规范

- [ ] 创建代码审查清单
- [ ] 创建新功能开发模板
- [ ] 添加架构规范到 workspace rules

**验收标准：**
- 所有核心概念都有文档说明
- 有清晰的开发示例
- 规范已添加到 rules

### 阶段四：验证和测试（0.5天）

#### Task 4.1: 功能验证

- [ ] 测试档案管理功能
- [ ] 测试用户升级功能
- [ ] 测试配额检查功能
- [ ] 测试卡牌显示功能

#### Task 4.2: 代码审查

- [ ] 检查是否符合新规范
- [ ] 检查是否有遗漏的重构点
- [ ] 性能测试
- [ ] 日志检查

**验收标准：**
- 所有功能正常运行
- 无 console 错误
- 代码通过 lint 检查
- 关键路径有性能测试数据

---

## 重构前后对比

### 重构前（❌ 职责不清）

```javascript
// Service 中混杂业务逻辑
class UserService {
  async createProfile(profileData) {
    // ❌ 在 Service 中做业务判断
    const userInfo = await this.getUserInfo();
    if (userInfo.usedProfiles >= userInfo.profileQuota) {
      return ResponseBean.error('配额不足');
    }
    
    return this.callFunction('profileManagement', {
      action: 'createProfile',
      data: profileData
    });
  }
}

// Controller 直接访问数据属性
class ProfileController {
  async onAddProfile() {
    const userInfo = this.page.data.userInfo;
    
    // ❌ 直接访问属性并手动判断
    if (userInfo.profileQuota !== -1 && 
        userInfo.usedProfiles >= userInfo.profileQuota) {
      this._showError('配额不足');
      return;
    }
    
    // ❌ 手动格式化
    const quotaText = userInfo.profileQuota === -1 
      ? '无限制' 
      : `${userInfo.usedProfiles}/${userInfo.profileQuota}`;
  }
}
```

### 重构后（✅ 职责清晰）

```javascript
// Bean 提供业务方法
class UserBean {
  canCreateMore() {
    return this.profileQuota === -1 || 
           this.usedProfiles < this.profileQuota;
  }
  
  getQuotaDisplay() {
    if (this.profileQuota === -1) return '无限制';
    return `${this.usedProfiles}/${this.profileQuota}`;
  }
}

// Service 只做 API 调用
class UserService {
  async createProfile(profileData) {
    // ✅ 不做业务判断，直接调用 API
    return this.callFunction('profileManagement', {
      action: 'createProfile',
      data: profileData
    });
  }
}

// Controller 使用 Bean 的方法
class ProfileController {
  async onAddProfile() {
    const userBean = this.page.data.userInfo;
    
    // ✅ 使用 Bean 的业务方法
    if (!userBean.canCreateMore()) {
      this._showError(`配额不足 (${userBean.getQuotaDisplay()})`);
      return;
    }
    
    // 调用 Service
    const response = await profileService.createProfile(profileData);
  }
}
```

---

## 效果预期

### 代码质量提升

| 指标 | 重构前 | 重构后 | 提升 |
|-----|-------|-------|-----|
| Service 平均方法行数 | ~30 行 | ~15 行 | 50% ↓ |
| Controller 业务判断逻辑 | 分散 | 集中在 Bean | 可维护性 ↑ |
| 代码重复率 | ~30% | ~10% | 66% ↓ |
| 单元测试覆盖率 | 0% | 60%+ | - |

### 开发效率提升

- ✅ 新功能开发：Bean 提供的方法可直接复用
- ✅ Bug 修复：业务逻辑集中，易于定位
- ✅ 代码审查：职责清晰，易于理解
- ✅ 团队协作：规范统一，沟通成本降低

---

## 风险和应对

### 风险 1：现有功能回归

**应对：**
- 制定详细的测试清单
- 重构一个模块，测试一个模块
- 保留 git 版本记录，随时可回滚

### 风险 2：团队学习成本

**应对：**
- 提供详细的文档和示例
- 进行代码审查，统一认知
- 逐步推进，不强制一次性全部重构

### 风险 3：遗漏边界情况

**应对：**
- 进行全面的功能测试
- 收集用户反馈
- 建立问题追踪机制

---

## 成功标准

### 技术指标

- [ ] 所有 Bean 类都有业务方法
- [ ] 所有 Service 方法平均行数 < 20 行
- [ ] Controller 不包含复杂的业务判断（使用 Bean 方法）
- [ ] 代码重复率 < 15%
- [ ] 无功能回归问题

### 文档指标

- [ ] 每个层都有清晰的 README
- [ ] 每个类都有使用示例
- [ ] 有完整的架构规范文档
- [ ] 规范已添加到 workspace rules

### 团队指标

- [ ] 团队成员理解新架构
- [ ] 新功能开发遵循新规范
- [ ] 代码审查通过率 > 90%

---

## 后续优化方向

1. **添加单元测试**：特别是 Bean 层的业务方法
2. **性能优化**：监控关键路径的性能
3. **日志完善**：使用统一的日志系统
4. **错误处理**：建立统一的错误处理机制
5. **文档维护**：保持文档与代码同步

---

## 附录：快速参考

### Bean 层 Checklist

- [ ] 继承 BaseBean
- [ ] 提供数据验证方法
- [ ] 提供业务判断方法（如 `canXXX()`, `isXXX()`）
- [ ] 提供数据转换方法（如 `toXXX()`, `getXXX()`）
- [ ] 不调用 API
- [ ] 不操作 UI

### Service 层 Checklist

- [ ] 继承 BaseService
- [ ] 只调用云函数/API
- [ ] 返回 ResponseBean
- [ ] 成功时转换为对应的 Bean
- [ ] 不做业务判断
- [ ] 方法行数 < 20 行

### Controller 层 Checklist

- [ ] 继承 BaseController
- [ ] 使用 Service 获取数据
- [ ] 使用 Bean 的业务方法做判断
- [ ] 处理 UI 交互
- [ ] 不直接实现业务规则
- [ ] 不直接访问 Bean 的私有属性

### Manager 层 Checklist

- [ ] 处理跨模块业务
- [ ] 通过 Service 调用 API
- [ ] 使用 Bean 的业务方法
- [ ] 管理全局状态
- [ ] 发送事件通知
- [ ] 不直接操作 UI

