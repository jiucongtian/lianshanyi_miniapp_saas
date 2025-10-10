# 代码重构实施计划

## 项目背景

本项目存在以下主要问题：
- 代码重复率高（约40%）
- 分层设计不清晰
- 缺少统一的数据处理Bean函数
- 云函数公共代码未提取
- 页面文件过于臃肿

通过本次重构，预期达成：
- 代码重复率降低到10%以下
- 建立清晰的分层架构
- 代码可维护性提升50%
- 新功能开发效率提升50%

---

## 阶段一：基础架构搭建（预计2周）

### 第1周：Bean层和Service层基础

#### ✅ Task 1.1: 创建Bean层基础结构
- [ ] 创建 `miniprogram/beans/` 目录
- [ ] 实现 `ResponseBean.js` - 统一响应处理Bean
  - [ ] 实现构造函数和数据解析
  - [ ] 实现 `fromCloudResult()` 静态方法
  - [ ] 实现 `error()` 和 `success()` 静态方法
  - [ ] 添加完整的数据验证和错误日志
- [ ] 实现 `UserBean.js` - 用户数据Bean
  - [ ] 定义用户数据字段
  - [ ] 实现数据验证逻辑
  - [ ] 添加 `canCreateMore()` 业务方法
  - [ ] 添加 `getRemainingQuota()` 业务方法
- [ ] 实现 `ProfileBean.js` - 档案数据Bean
  - [ ] 定义档案数据字段
  - [ ] 实现 `toCardData()` 转换方法
  - [ ] 实现时间格式化方法
- [ ] 实现 `BaziBean.js` - 八字数据Bean
  - [ ] 定义八字数据结构
  - [ ] 实现数据标准化方法
- [ ] 编写Bean层使用文档
- [ ] 测试所有Bean类的数据处理功能

#### ✅ Task 1.2: 创建Service层基础结构
- [ ] 创建 `miniprogram/services/` 目录
- [ ] 实现 `BaseService.js` - 基础服务类
  - [ ] 实现 `callFunction()` 方法（带错误处理）
  - [ ] 实现 `callFunctionWithRetry()` 方法（带重试机制）
  - [ ] 实现 `_delay()` 延迟辅助方法
  - [ ] 添加统一的日志输出
- [ ] 实现 `UserService.js` - 用户服务
  - [ ] 实现 `getUserInfo()` 方法
  - [ ] 实现 `checkQuota()` 方法
  - [ ] 实现 `upgradeUserType()` 方法
  - [ ] 实现 `updateUserInfo()` 方法
  - [ ] 所有方法返回值使用ResponseBean
  - [ ] 添加完整的JSDoc注释
- [ ] 导出Service单例实例
- [ ] 编写Service层使用文档
- [ ] 测试UserService的所有方法

#### ✅ Task 1.3: 重构现有API调用
- [ ] 修改 `api/cloud.js`，所有函数使用ResponseBean包装返回值
- [ ] 修改 `utils/userManager.js`，调用UserService而不是直接调用云函数
- [ ] 逐步替换页面中的直接云函数调用为Service调用
  - [ ] 修改 `pages/profile/index.js` 的用户信息获取
  - [ ] 修改 `pages/mine/index.js` 的用户信息获取
  - [ ] 修改 `pages/addProfile/index.js` 的配额检查
- [ ] 测试所有修改后的API调用
- [ ] 确保所有云函数返回的数据都经过Bean处理

---

### 第2周：云函数公共模块提取

#### ✅ Task 2.1: 创建云函数公共模块
- [x] 创建 `cloudfunctions/common/` 目录
- [x] 实现 `userTypeConfig.js` - 用户类型配置模块
  - [x] 实现 `getUserTypeConfig()` 函数（带缓存）
  - [x] 实现 `getDefaultConfig()` 函数
  - [x] 实现 `clearCache()` 函数
  - [x] 添加5分钟缓存机制
  - [x] 添加完整的错误处理和日志
- [x] 实现 `responseHelper.js` - 响应处理模块
  - [x] 实现 `success()` 函数
  - [x] 实现 `error()` 函数
  - [x] 实现 `paginated()` 函数（分页响应）
- [x] 实现 `validators.js` - 数据验证模块
  - [x] 实现常用数据验证函数
  - [x] 实现 `validateProfileData()` 档案数据验证
  - [x] 实现 `validateUserData()` 用户数据验证
- [x] 实现 `errorCodes.js` - 错误码定义
  - [x] 定义统一的错误码常量
  - [x] 定义错误码对应的错误消息
- [x] 编写公共模块使用文档
- [x] 重构 `profileManagement_v1_1` 云函数使用公共模块

#### ✅ Task 2.2: 重构userManagement云函数
- [ ] 删除云函数内的 `getUserTypeConfig()` 重复代码
- [ ] 导入公共模块 `userTypeConfig.js`
- [ ] 使用 `responseHelper` 统一响应格式
- [ ] 所有数据库查询添加错误处理
- [ ] 添加详细的日志输出
- [ ] 测试所有action的功能
  - [ ] 测试 `createUser`
  - [ ] 测试 `getUserInfo`
  - [ ] 测试 `upgradeUserType`
  - [ ] 测试 `checkUserQuota`
- [ ] 部署并验证云函数

#### ✅ Task 2.3: 重构profileManagement云函数
- [ ] 删除云函数内的 `getUserTypeConfig()` 重复代码
- [ ] 导入公共模块 `userTypeConfig.js`
- [ ] 使用 `responseHelper` 统一响应格式
- [ ] 使用 `validators` 验证档案数据
- [ ] 所有数据库查询添加错误处理
- [ ] 添加详细的日志输出
- [ ] 测试所有action的功能
  - [ ] 测试 `createProfile`
  - [ ] 测试 `getProfiles`
  - [ ] 测试 `getProfile`
  - [ ] 测试 `updateProfile`
  - [ ] 测试 `deleteProfile`
  - [ ] 测试 `searchProfile`
- [ ] 部署并验证云函数

#### ✅ Task 2.4: 验证重构效果
- [ ] 检查所有云函数日志，确保无错误
- [ ] 测试客户端所有功能，确保正常工作
- [ ] 比对重构前后的代码行数
- [ ] 确认代码重复率已降低
- [ ] 编写阶段一总结文档

---

## 阶段二：Service层完善（预计1周）

### 第3周：完善Service层和创建Model层

#### ✅ Task 3.1: 实现ProfileService
- [ ] 创建 `services/ProfileService.js`
- [ ] 实现 `getProfiles()` 方法（获取档案列表）
  - [ ] 支持分页参数
  - [ ] 返回ProfileBean数组
- [ ] 实现 `getProfile()` 方法（获取单个档案）
  - [ ] 返回ProfileBean实例
- [ ] 实现 `createProfile()` 方法（创建档案）
  - [ ] 数据验证
  - [ ] 返回创建结果
- [ ] 实现 `updateProfile()` 方法（更新档案）
- [ ] 实现 `deleteProfile()` 方法（删除档案）
- [ ] 实现 `searchProfile()` 方法（搜索档案）
- [ ] 所有方法添加完整的JSDoc注释
- [ ] 导出单例实例
- [ ] 编写使用文档
- [ ] 测试所有方法

#### ✅ Task 3.2: 实现BaziService
- [ ] 创建 `services/BaziService.js`
- [ ] 实现 `calculateBazi()` 方法（计算八字）
  - [ ] 带重试机制（3次）
  - [ ] 返回BaziBean实例
  - [ ] 完整的错误处理
- [ ] 实现缓存机制（可选）
  - [ ] 相同时间戳的八字计算结果缓存
  - [ ] 缓存时长30分钟
- [ ] 编写使用文档
- [ ] 测试计算功能

#### ✅ Task 3.3: 创建Model层
- [ ] 创建 `miniprogram/models/` 目录
- [ ] 实现 `Profile.js` 模型类
  - [ ] 定义档案数据结构
  - [ ] 实现 `toCardData()` 转换方法
  - [ ] 实现 `formatBirthTime()` 私有方法
  - [ ] 实现 `formatLunarTime()` 私有方法
  - [ ] 实现 `fromCloudData()` 静态工厂方法
- [ ] 实现 `User.js` 模型类
  - [ ] 定义用户数据结构
  - [ ] 实现权限相关的业务方法
- [ ] 实现 `BaziData.js` 模型类
  - [ ] 定义八字数据结构
  - [ ] 实现标准化方法
- [ ] 编写Model层使用文档
- [ ] 测试所有Model类

#### ✅ Task 3.4: 统一错误处理机制
- [ ] 创建 `utils/errorHandler.js`
- [ ] 实现统一的错误处理函数
  - [ ] `handleServiceError()` - Service层错误处理
  - [ ] `handleCloudFunctionError()` - 云函数错误处理
  - [ ] `handleNetworkError()` - 网络错误处理
- [ ] 定义错误类型和错误码
- [ ] 在所有Service中使用统一错误处理
- [ ] 编写错误处理文档

---

## 阶段三：Controller层和页面重构（预计2周）

### 第4周：Controller层实现

#### ✅ Task 4.1: 创建Controller层基础
- [ ] 创建 `miniprogram/controllers/` 目录
- [ ] 实现 `BaseController.js` 基类
  - [ ] 定义通用的辅助方法
  - [ ] `_showSuccess()` - 显示成功提示
  - [ ] `_showError()` - 显示错误提示
  - [ ] `_showLoading()` - 显示加载提示
  - [ ] `_hideLoading()` - 隐藏加载提示
  - [ ] `_confirm()` - 确认对话框
  - [ ] `_prompt()` - 输入对话框
- [ ] 编写BaseController使用文档

#### ✅ Task 4.2: 实现ProfileController
- [ ] 创建 `controllers/ProfileController.js`
- [ ] 实现 `initialize()` 方法（初始化页面）
- [ ] 实现 `loadUserInfo()` 方法（加载用户信息）
- [ ] 实现 `loadProfiles()` 方法（加载档案列表）
  - [ ] 支持分页
  - [ ] 支持下拉刷新
  - [ ] 支持上拉加载更多
- [ ] 实现 `selectProfile()` 方法（选择档案）
- [ ] 实现 `deleteProfile()` 方法（删除档案）
  - [ ] 带确认对话框
  - [ ] 删除后刷新列表
  - [ ] 处理当前选中档案被删除的情况
- [ ] 实现 `showQuotaExceededDialog()` 方法
- [ ] 所有方法添加完整注释
- [ ] 编写使用文档
- [ ] 测试所有方法

#### ✅ Task 4.3: 实现AddProfileController
- [ ] 创建 `controllers/AddProfileController.js`
- [ ] 实现 `initialize()` 方法（初始化页面）
  - [ ] 判断创建/编辑模式
  - [ ] 加载编辑数据（编辑模式）
- [ ] 实现 `validateForm()` 方法（表单验证）
  - [ ] 验证档案名称
  - [ ] 验证出生时间
- [ ] 实现 `checkQuota()` 方法（检查配额）
- [ ] 实现 `calculateBazi()` 方法（计算八字）
- [ ] 实现 `searchExisting()` 方法（搜索已有档案）
- [ ] 实现 `saveProfile()` 方法（保存档案）
- [ ] 实现 `updateProfile()` 方法（更新档案）
- [ ] 所有方法添加完整注释
- [ ] 编写使用文档
- [ ] 测试所有方法

#### ✅ Task 4.4: 实现CardController
- [ ] 创建 `controllers/CardController.js`
- [ ] 实现 `initialize()` 方法（初始化卡牌页面）
- [ ] 实现 `loadProfileData()` 方法（加载档案数据）
- [ ] 实现 `updateBaziDisplay()` 方法（更新八字显示）
- [ ] 实现 `flipCard()` 方法（翻转卡牌）
- [ ] 实现 `previewCard()` 方法（预览卡牌）
- [ ] 实现图片缓存逻辑
- [ ] 所有方法添加完整注释
- [ ] 编写使用文档
- [ ] 测试所有方法

---

### 第5周：页面重构

#### ✅ Task 5.1: 重构profile页面
- [ ] 修改 `pages/profile/index.js`
  - [ ] 创建ProfileController实例
  - [ ] 简化onLoad，只调用controller.initialize()
  - [ ] 所有事件处理器委托给Controller
  - [ ] 删除页面中的业务逻辑代码
  - [ ] data只保留视图需要的数据
- [ ] 测试页面所有功能
  - [ ] 档案列表加载
  - [ ] 下拉刷新
  - [ ] 上拉加载更多
  - [ ] 档案选择
  - [ ] 档案删除
  - [ ] 配额检查
- [ ] 确认代码行数减少至少50%

#### ✅ Task 5.2: 重构addProfile页面
- [ ] 修改 `pages/addProfile/index.js`
  - [ ] 创建AddProfileController实例
  - [ ] 简化页面逻辑
  - [ ] 事件处理委托给Controller
  - [ ] 删除业务逻辑代码
- [ ] 测试页面所有功能
  - [ ] 创建档案流程
  - [ ] 编辑档案流程
  - [ ] 表单验证
  - [ ] 配额检查
  - [ ] 八字计算
  - [ ] 已有档案搜索
- [ ] 确认代码行数减少至少50%

#### ✅ Task 5.3: 重构card页面
- [ ] 修改 `pages/card/index.js`
  - [ ] 创建CardController实例
  - [ ] 简化页面逻辑
  - [ ] 事件处理委托给Controller
  - [ ] 删除业务逻辑代码
- [ ] 测试页面所有功能
  - [ ] 卡牌显示
  - [ ] 卡牌翻转
  - [ ] 图片预览
  - [ ] 图片缓存
  - [ ] 时间显示
- [ ] 确认代码行数减少至少50%

#### ✅ Task 5.4: 重构mine页面
- [ ] 修改 `pages/mine/index.js`
  - [ ] 创建MineController实例
  - [ ] 简化页面逻辑
  - [ ] 事件处理委托给Controller
- [ ] 测试页面所有功能
  - [ ] 用户信息显示
  - [ ] 设置功能
  - [ ] 缓存清理
- [ ] 确认代码行数减少至少50%

#### ✅ Task 5.5: 重构register页面
- [ ] 修改 `pages/register/index.js`
  - [ ] 创建RegisterController实例
  - [ ] 简化页面逻辑
  - [ ] 事件处理委托给Controller
- [ ] 测试注册流程
- [ ] 确认代码行数减少至少50%

---

## 阶段四：优化和完善（预计1周）

### 第6周：配置管理和文档完善

#### ✅ Task 6.1: 统一配置管理
- [ ] 创建 `config/ConfigManager.js`
- [ ] 实现配置缓存机制
- [ ] 实现 `getUserTypeConfig()` 方法
  - [ ] 从云端获取配置
  - [ ] 本地缓存5分钟
- [ ] 实现 `getAppConfig()` 方法
- [ ] 实现 `clearCache()` 方法
- [ ] 删除 `utils/permissionManager.js` 中的硬编码配置
- [ ] 修改所有使用配置的地方，改用ConfigManager
- [ ] 测试配置加载和缓存功能

#### ✅ Task 6.2: 添加数据缓存层
- [ ] 创建 `utils/CacheManager.js`
- [ ] 实现通用缓存机制
  - [ ] `set()` - 设置缓存
  - [ ] `get()` - 获取缓存
  - [ ] `remove()` - 删除缓存
  - [ ] `clear()` - 清空缓存
  - [ ] 支持过期时间
- [ ] 在Service层使用缓存
  - [ ] UserService缓存用户信息
  - [ ] ProfileService缓存档案列表
  - [ ] BaziService缓存八字计算结果
- [ ] 编写缓存使用文档
- [ ] 测试缓存功能

#### ✅ Task 6.3: 性能优化
- [ ] 实现图片懒加载（如未实现）
- [ ] 优化档案列表渲染性能
- [ ] 添加请求防抖
  - [ ] 搜索输入防抖
  - [ ] 滚动加载节流
- [ ] 优化云函数冷启动
  - [ ] 添加预热机制
- [ ] 测试性能优化效果

#### ✅ Task 6.4: 完善文档
- [ ] 更新 `docs/api/` 下的所有接口文档
  - [ ] userManagement-api.md
  - [ ] profileManagement-api.md
  - [ ] coze-bazi-api.md
- [ ] 创建架构文档 `docs/architecture.md`
  - [ ] 整体架构图
  - [ ] 分层说明
  - [ ] 调用流程图
- [ ] 创建开发指南 `docs/development-guide.md`
  - [ ] 新增页面流程
  - [ ] 新增功能流程
  - [ ] 常见问题
- [ ] 更新 `README.md`
  - [ ] 项目结构说明
  - [ ] 快速开始
  - [ ] 技术栈说明

#### ✅ Task 6.5: 代码审查和清理
- [ ] 删除所有未使用的代码
- [ ] 删除已弃用的文件
- [ ] 统一代码格式
  - [ ] 统一缩进（2空格）
  - [ ] 统一引号（单引号）
  - [ ] 添加必要的空行
- [ ] 检查所有console.log
  - [ ] 删除调试用的console.log
  - [ ] 保留重要的日志输出
  - [ ] 统一日志格式：`[模块名] 日志内容`
- [ ] 运行代码检查工具（如eslint）
- [ ] 修复所有linter错误和警告

---

## 阶段五：测试和部署（预计1周）

### 第7周：全面测试和部署

#### ✅ Task 7.1: 单元测试
- [ ] 安装测试框架（Jest）
- [ ] 编写Bean层测试
  - [ ] ResponseBean测试
  - [ ] UserBean测试
  - [ ] ProfileBean测试
  - [ ] BaziBean测试
- [ ] 编写Service层测试
  - [ ] UserService测试
  - [ ] ProfileService测试
  - [ ] BaziService测试
- [ ] 编写Model层测试
- [ ] 运行所有测试，确保通过率100%

#### ✅ Task 7.2: 集成测试
- [ ] 测试完整的用户流程
  - [ ] 新用户注册流程
  - [ ] 创建第一个档案
  - [ ] 查看档案列表
  - [ ] 编辑档案
  - [ ] 删除档案
- [ ] 测试配额限制
  - [ ] 临时用户创建3个档案后限制
  - [ ] 注册后配额提升
- [ ] 测试权限控制
- [ ] 测试错误场景
  - [ ] 网络错误
  - [ ] 云函数超时
  - [ ] 数据格式错误
- [ ] 记录所有发现的问题

#### ✅ Task 7.3: 性能测试
- [ ] 测试页面加载速度
  - [ ] 首屏加载时间 < 2秒
  - [ ] 档案列表加载时间 < 1秒
- [ ] 测试云函数响应时间
  - [ ] getUserInfo < 500ms
  - [ ] getProfiles < 1秒
  - [ ] calculateBazi < 3秒
- [ ] 测试内存占用
- [ ] 优化发现的性能问题

#### ✅ Task 7.4: 兼容性测试
- [ ] 测试不同机型
  - [ ] iPhone （iOS最新版本）
  - [ ] 安卓主流机型
  - [ ] 微信版本兼容性
- [ ] 测试不同网络环境
  - [ ] WiFi
  - [ ] 4G
  - [ ] 弱网环境
- [ ] 记录兼容性问题并修复

#### ✅ Task 7.5: 部署和验证
- [ ] 部署所有云函数到生产环境
  - [ ] userManagement
  - [ ] profileManagement
  - [ ] calculateBazi
- [ ] 部署小程序代码
- [ ] 提交微信审核
- [ ] 生产环境功能验证
- [ ] 监控错误日志
- [ ] 收集用户反馈

---

## 重构验收标准

### 代码质量指标
- [ ] 代码重复率 < 10%
- [ ] 单个文件平均行数 < 300行
- [ ] 单个函数平均行数 < 50行
- [ ] 所有公共函数都有JSDoc注释
- [ ] 无eslint错误或警告

### 性能指标
- [ ] 首屏加载时间 < 2秒
- [ ] 档案列表加载时间 < 1秒
- [ ] 云函数平均响应时间 < 1秒
- [ ] 内存占用 < 50MB

### 测试覆盖率
- [ ] Bean层测试覆盖率 > 90%
- [ ] Service层测试覆盖率 > 80%
- [ ] Controller层测试覆盖率 > 70%
- [ ] 集成测试覆盖所有主要流程

### 文档完整性
- [ ] 所有API都有文档
- [ ] 架构文档完整
- [ ] 开发指南完整
- [ ] README清晰明了

---

## 风险和应对措施

### 风险1：重构过程中影响现有功能
**应对措施：**
- 采用渐进式重构，每次只改一小部分
- 每次重构后立即测试
- 保持Git提交频率，方便回滚
- 重构前创建feature分支

### 风险2：重构时间超出预期
**应对措施：**
- 按优先级实施，P0最重要
- 可以跳过P2的优化项
- 每周复盘进度，及时调整计划

### 风险3：团队成员不熟悉新架构
**应对措施：**
- 编写详细的开发文档
- 组织代码review
- 提供示例代码
- 建立问题答疑机制

---

## 项目里程碑

- **Week 1结束**：Bean层和Service层基础完成
- **Week 2结束**：云函数公共模块提取完成
- **Week 3结束**：所有Service层完成，Model层完成
- **Week 4结束**：所有Controller层完成
- **Week 5结束**：所有页面重构完成
- **Week 6结束**：配置管理、文档和代码审查完成
- **Week 7结束**：测试通过，生产部署完成

---

## 后续改进计划

完成本次重构后，可以考虑以下改进：

1. **TypeScript迁移**
   - 使用TypeScript提升类型安全
   - 更好的IDE支持

2. **自动化测试**
   - 建立CI/CD流程
   - 自动化测试和部署

3. **监控和日志**
   - 接入错误监控平台
   - 建立性能监控

4. **用户体验优化**
   - 骨架屏优化
   - 动画效果优化
   - 交互反馈优化

---

## 总结

本重构计划遵循以下原则：
1. **渐进式重构**：不影响现有功能
2. **分层清晰**：职责明确，易于维护
3. **代码复用**：避免重复，提高效率
4. **文档完善**：方便团队协作
5. **测试充分**：保证质量

预期通过7周的系统重构，项目代码质量将得到显著提升，为后续功能开发奠定良好基础。

---

**重构开始日期：** ____年____月____日  
**预计完成日期：** ____年____月____日  
**实际完成日期：** ____年____月____日  
**负责人：** ___________

