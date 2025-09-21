# 📦 统一配置管理系统

## 🎯 功能说明

这个配置管理系统可以帮你统一管理小程序的各种配置信息，包括：
- 小程序 AppID
- 云开发环境 ID
- 项目名称
- 云函数环境变量
- 调试配置

## 📁 目录结构

```
config/
├── environments/           # 环境配置文件
│   ├── dev.json           # 开发环境配置
│   └── new-account.json   # 新小程序账号配置
├── build.js               # 构建脚本
└── README.md             # 使用说明
```

## 🚀 使用方法

### 1. 查看可用环境

```bash
npm run build:list
```

### 2. 切换到开发环境

```bash
npm run build:dev
```

### 3. 切换到新小程序账号

```bash
npm run build:product
```

## ⚙️ 配置文件说明

每个环境配置文件包含以下字段：

```json
{
  "name": "环境名称",
  "appId": "小程序AppID", 
  "cloudEnvId": "云开发环境ID",
  "projectName": "项目名称",
  "packageName": "包名称",
  "cloudConfig": {
    "cozeToken": "Coze API Token",
    "cozeBaseUrl": "Coze API 地址", 
    "cozeWorkflowId": "工作流ID"
  },
  "debug": {
    "useMock": "是否使用Mock数据",
    "debugMode": "是否开启调试模式"
  }
}
```

## 📝 添加新环境

1. 在 `config/environments/` 目录下创建新的 JSON 配置文件
2. 按照上述格式填写配置信息
3. 在 `package.json` 中添加对应的 npm 脚本（可选）

例如，添加生产环境：

```bash
# 创建配置文件
cp config/environments/dev.json config/environments/prod.json

# 编辑配置文件
vim config/environments/prod.json

# 使用配置
node config/build.js prod
```

## 🔄 自动更新的文件

构建脚本会自动更新以下文件：

- `project.config.json` - 小程序项目配置
- `project.private.config.json` - 私有配置
- `miniprogram/app.js` - 小程序主入口
- `cloudbase/cloudbaserc.json` - 云开发配置
- `miniprogram/config/index.js` - 小程序配置
- `miniprogram/config/index.js` - 配置文件
- `miniprogram/package.json` - 包配置

## ⚠️ 注意事项

1. **备份重要文件**：首次使用前建议备份原始配置文件
2. **检查更改**：构建完成后请检查相关文件的更改是否正确
3. **环境变量**：确保云函数环境变量配置正确，特别是敏感信息
4. **版本控制**：建议将敏感配置信息（如API Token）添加到 `.gitignore`

## 🔧 故障排除

### 构建失败
- 检查环境配置文件格式是否正确
- 确认所有必需字段都已填写
- 查看错误信息中的具体提示

### 配置未生效
- 确认构建脚本执行成功
- 检查目标文件是否被正确更新
- 重启微信开发者工具

## 📚 示例

### 切换到新小程序账号

1. 编辑 `config/environments/new-account.json`：
```json
{
  "name": "新小程序账号",
  "appId": "wxabcdefghijk12345",
  "cloudEnvId": "new-cloud-env-123",
  "projectName": "new-miniprogram",
  "packageName": "new-miniprogram-package",
  // ... 其他配置
}
```

2. 执行构建：
```bash
npm run build:new-account
```

3. 检查更新结果，然后在微信开发者工具中重新打开项目






#### 推送cloudbaserc中的环境变量到微信云开发控制台中的对应云函数

进入cloudbase目录，然后执行下边的命令
```bash
 tcb functions:deploy calculateBazi --envId cloud1-9gmddzrkb0fa17c9
```
- 如果提示“command not found: tcb”说明没有安装腾讯云开发CLI工具
- 使用“npm install -g @cloudbase/cli”安装CLI

## 🎉 优势

- ✅ **集中管理**：所有配置集中在一个地方，避免遗漏
- ✅ **环境隔离**：支持多环境配置，轻松切换
- ✅ **自动化**：一键更新所有相关文件
- ✅ **可扩展**：易于添加新的环境和配置项
- ✅ **版本控制友好**：配置变更可追踪
