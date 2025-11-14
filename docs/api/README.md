# API 接口文档

本目录包含项目中所有API接口的详细文档。

## 📋 接口列表

### 核心接口

| 接口名称 | 文档链接 | 状态 | 描述 |
|----------|----------|------|------|
| Coze 生辰八字计算 | [coze-bazi-api.md](./coze-bazi-api.md) | ✅ 已完成 | 调用Coze平台计算生辰八字信息 |
| 用户管理 | [userManagement-api.md](./userManagement-api.md) | ✅ 已完成 | 用户注册、信息获取和更新功能 |
| 档案管理 | [profileManagement-api.md](./profileManagement-api.md) | ✅ 已完成 | 八字档案的增删改查功能 |
| 档案管理 v1.1 | [profileManagement_v1_1-api.md](./profileManagement_v1_1-api.md) | ✅ 已完成 | 档案管理增强版，集成八字计算功能 |
| 档案管理 v1.2 | [profileManagement_v1_2-api.md](./profileManagement_v1_2-api.md) | ✅ 已完成 | 支持公历/农历和农历闰月标记 |
| 抽卡管理 | [drawCardManagement-api.md](./drawCardManagement-api.md) | 📋 待实现 | 抽卡配额检查和使用记录管理 |

### 待添加接口

| 接口名称 | 计划状态 | 描述 |
|----------|----------|------|
| 档案分享接口 | 📋 计划中 | 生成档案分享链接 |
| 数据统计接口 | 📋 计划中 | 用户使用统计和分析 |
| 批量导入接口 | 📋 计划中 | 批量导入八字档案 |

## 📝 文档规范

### 文档结构

每个接口文档应包含以下部分：

1. **接口概述** - 接口的基本描述和用途
2. **接口信息** - 请求方法、地址、超时等基本信息
3. **请求参数** - 详细的输入参数说明和示例
4. **返回数据** - 完整的响应格式和参数说明
5. **数据处理** - 前端解析和处理示例代码
6. **使用场景** - 接口的具体应用场景
7. **注意事项** - 重要的使用注意事项
8. **相关文件** - 相关的代码文件列表
9. **更新日志** - 版本更新记录

### 命名规范

- 文件名格式：`{service}-{function}-api.md`
- 示例：`coze-bazi-api.md`、`user-login-api.md`

### 参数表格格式

```markdown
| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| param1 | string | 是 | 参数说明 | "示例值" |
```

### 代码示例格式

使用代码块标注语言类型：

```javascript
// JavaScript 示例
const result = await api.call(params);
```

```json
// JSON 示例
{
  "code": 0,
  "data": {}
}
```

## 🔄 更新流程

1. **新增接口**：创建对应的markdown文档
2. **更新文档**：修改对应文档并更新版本日志
3. **更新索引**：在本README中添加新接口的链接

## 📂 目录结构

```
docs/api/
├── README.md                    # 本文件，接口文档索引
├── coze-bazi-api.md            # Coze生辰八字计算接口
├── userManagement-api.md       # 用户管理云函数接口
├── profileManagement-api.md    # 档案管理云函数接口
├── profileManagement_v1_1-api.md # 档案管理云函数接口v1.1（集成八字计算）
├── profileManagement_v1_2-api.md # 档案管理云函数接口v1.2（支持农历闰月）
├── drawCardManagement-api.md   # 抽卡管理云函数接口（配额检查和记录）
├── userClassification-api.md   # 用户分类接口
└── [future-api].md             # 未来的其他接口文档
```

## 🏷️ 状态标识

- ✅ 已完成：接口已实现且文档完整
- 🚧 开发中：接口正在开发，文档可能不完整
- 📋 计划中：接口在规划阶段，暂无文档
- ❌ 已废弃：接口已不再使用

## 📞 联系方式

如有接口文档相关问题，请联系开发团队。

---

*最后更新时间：2025年10月*
