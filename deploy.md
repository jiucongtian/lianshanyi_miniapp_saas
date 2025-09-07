# 云开发部署指南

## 1. 环境准备

### 开通云开发服务
1. 在微信开发者工具中打开项目
2. 点击工具栏中的"云开发"按钮
3. 按照指引开通云开发服务
4. 记录下生成的环境ID，替换`app.js`中的环境ID

### 安装云函数依赖
```bash
cd cloudfunctions/calculateBazi
npm install
```

## 2. 部署云函数

### 方法一：使用微信开发者工具
1. 在微信开发者工具中右键点击`cloudfunctions/calculateBazi`文件夹
2. 选择"上传并部署：云端安装依赖（不上传node_modules）"
3. 等待部署完成

### 方法二：使用命令行工具
```bash
# 安装云开发CLI工具
npm install -g @cloudbase/cli

# 登录
tcb login

# 部署云函数
tcb functions:deploy calculateBazi --envId your-env-id
```

## 3. 配置说明

### 环境ID配置
请将`app.js`中的环境ID `cloud1-0g6p5vvq5b58b3b6` 替换为您实际的云环境ID。

### API密钥安全配置 ⚠️ 重要！

**必须**将Coze API的token配置到云开发的环境变量中，而不是硬编码在代码里：

#### 配置步骤：
1. **通过微信开发者工具配置**：
   - 打开云开发控制台
   - 进入"云函数" → 选择 `calculateBazi`
   - 点击"版本管理" → "环境变量"
   - 添加环境变量：
     - `COZE_TOKEN`: `your_actual_coze_token`
     - `COZE_BASE_URL`: `https://api.coze.cn`
     - `COZE_WORKFLOW_ID`: `7544388114807095337`

2. **或通过配置文件**：
   - 修改 `cloudbase/cloudbaserc.json` 中的 `envVariables`
   - 将实际的token替换占位符

详细配置方法请参考：`环境变量配置指南.md`

## 4. 测试验证

部署完成后，在小程序中测试生辰八字计算功能，确保云函数正常工作。

## 5. 注意事项

1. 云函数有超时限制，默认为10秒
2. 云函数调用有配额限制，注意监控使用量
3. 建议在云开发控制台中查看云函数的运行日志
4. 如果遇到网络问题，可以考虑使用云开发的HTTP API
