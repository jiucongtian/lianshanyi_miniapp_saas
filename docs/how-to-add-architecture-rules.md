# 如何添加架构规范到 Cursor Rules

## 方式一：通过 Cursor 设置添加（推荐）

### 步骤

1. **打开 Cursor 设置**
   - macOS: `Cmd + ,`
   - Windows: `Ctrl + ,`

2. **找到 Cursor Rules**
   - 在设置中搜索 "Rules" 或 "Cursor Rules"
   - 或者点击左侧菜单的 "Cursor Rules"

3. **添加工作区规则**
   - 点击 "Workspace Rules" 标签
   - 点击 "Add Rule" 或 "添加规则"

4. **配置规则**
   - **Rule Name**: `architecture` 或 `小程序架构规范`
   - **Description**: `小程序分层架构开发规范，定义 Bean、Service、Controller、Manager 各层职责`
   - **Content**: 将 `.cursorrules-architecture` 文件的内容复制粘贴进去

5. **保存并启用**
   - 点击保存
   - 确保规则处于启用状态

## 方式二：使用项目配置文件（推荐）

我们已经创建了 `.cursorrules-architecture` 文件，Cursor 会自动识别以下文件作为规则：

- `.cursorrules` - 主规则文件
- `.cursorrules-*` - 额外的规则文件

### 验证规则是否生效

1. 打开 Cursor
2. 在聊天窗口询问："Bean 层应该做什么？"
3. 如果 AI 回答包含我们定义的规范内容，说明规则已生效

## 方式三：在对话中引用（临时）

如果不想全局启用，可以在需要时引用：

```
请参考项目中的 .cursorrules-architecture 文件，
帮我实现一个新的 UserBean 类。
```

---

## 规范文件说明

### 已创建的文件

1. **`.cursorrules-architecture`** (位于项目根目录)
   - 完整的架构开发规范
   - 包含各层职责定义
   - 包含正确示例和反例
   - 包含代码审查清单
   - 包含常见问题 FAQ

2. **`docs/architecture-optimization-plan.md`**
   - 详细的实施计划
   - 包含分阶段的任务清单
   - 包含重构前后对比
   - 包含风险应对措施

3. **`docs/how-to-add-architecture-rules.md`** (本文档)
   - 说明如何添加规范到 Cursor

---

## 使用建议

### 开发新功能时

1. **开始前**：快速查看 `.cursorrules-architecture` 中对应层的规范
2. **开发中**：遵循规范进行编码
3. **完成后**：使用代码审查清单自查

### 代码审查时

使用规范文件中的审查清单：
- Bean 层审查清单
- Service 层审查清单
- Controller 层审查清单

### 重构代码时

参考规范文件中的：
- "识别需要重构的代码" 章节
- "重构步骤" 章节
- "重构前后对比" 示例

---

## AI 辅助开发示例

### 示例 1: 创建新的 Bean 类

```
我需要创建一个 OrderBean 类来处理订单数据，
请参考架构规范帮我实现。

订单数据包含：
- orderId: 订单ID
- status: 订单状态（pending/paid/completed/cancelled）
- amount: 订单金额
- createTime: 创建时间

需要提供的业务方法：
- 判断是否可以取消
- 判断是否可以退款
- 格式化金额显示
```

AI 会根据 `.cursorrules-architecture` 中的规范生成符合标准的代码。

### 示例 2: 重构现有代码

```
请帮我重构 OrderController.js 中的 createOrder 方法，
让它符合架构规范。当前代码中在 Controller 里做了配额检查，
这应该移到 Bean 层。
```

### 示例 3: 代码审查

```
请根据架构规范审查这段代码：
[粘贴代码]

检查是否符合：
- Service 层规范
- 是否有业务逻辑应该在 Bean 层
- 错误处理是否完整
```

---

## 团队协作建议

### 1. 统一认知

- 所有团队成员阅读 `.cursorrules-architecture` 文件
- 进行一次架构规范培训/讨论
- 确保大家理解各层职责

### 2. Code Review

- 使用规范中的审查清单
- 发现不符合规范的代码，引用具体章节说明
- 统一编码风格

### 3. 持续改进

- 发现规范不完善的地方，及时补充
- 收集团队反馈，优化规范
- 定期回顾和更新

---

## 常见问题

### Q: 规范会不会限制创造力？

A: 规范是为了统一基础架构，在此基础上可以灵活实现业务逻辑。好的规范能减少认知负担，让开发者专注于业务创新。

### Q: 现有代码需要立即重构吗？

A: 不需要。可以：
1. 新代码严格遵循规范
2. 修改旧代码时顺便重构
3. 有计划地逐步重构（参考 architecture-optimization-plan.md）

### Q: 如果遇到规范中没有覆盖的情况怎么办？

A: 
1. 遵循规范的基本原则（职责单一、Bean 优先、Service 简单）
2. 团队讨论最佳实践
3. 补充到规范中

---

## 效果验证

### 检查规范是否生效

在 Cursor 中询问：

```
根据我们的架构规范，Bean 层应该做什么？不应该做什么？
请列举出来。
```

如果 AI 的回答与 `.cursorrules-architecture` 文件内容一致，说明规范已生效。

### 测试 AI 辅助开发

```
请帮我创建一个 ProductBean 类，包含以下字段：
- productId
- name
- price
- stock

需要提供业务方法：
- 判断是否有库存
- 判断是否可以购买
- 格式化价格显示
```

检查 AI 生成的代码是否：
- 继承了 BaseBean
- 使用了 _getField 方法
- 实现了 _validate 方法
- 提供了业务判断方法（canXXX, isXXX）
- 提供了数据转换方法（getXXX, formatXXX）
- 有完整的注释

---

## 总结

1. ✅ `.cursorrules-architecture` 文件已创建，Cursor 会自动识别
2. ✅ 可以通过 Cursor 设置手动添加为工作区规则
3. ✅ 可以在对话中引用规范文件
4. ✅ 规范包含完整的开发指南和代码示例
5. ✅ 有详细的实施计划（architecture-optimization-plan.md）

**建议操作：**
1. 让团队成员阅读 `.cursorrules-architecture` 文件
2. 在 Cursor 中测试规范是否生效
3. 开始按照实施计划逐步优化代码

