# 微信支付云函数配置说明

## 📋 配置私钥

### 方案A：使用PEM文件（推荐）⭐

将微信支付商户私钥文件放在云函数目录中，云函数会自动读取。

#### 步骤：

1. **获取私钥文件**
   - 从微信支付商户平台下载商户证书
   - 解压后找到 `apiclient_key.pem` 文件

2. **放置私钥文件**
   ```bash
   # 将 apiclient_key.pem 文件复制到此目录
   cp /path/to/apiclient_key.pem ./apiclient_key.pem
   ```
   
   目录结构：
   ```
   paymentManagement_v1_3/
   ├── index.js
   ├── package.json
   ├── apiclient_key.pem    ← 私钥文件放这里
   └── README.md
   ```

3. **部署云函数**
   ```bash
   # 部署时会自动将私钥文件打包上传
   # 云函数运行时会自动读取该文件
   ```

4. **验证**
   - 查看云函数日志
   - 应该看到：`[loadPrivateKeyFromFile] 成功从文件读取私钥: apiclient_key.pem`

#### 优点：
- ✅ 保持PEM文件的原始格式（多行）
- ✅ 不受环境变量限制
- ✅ 更容易管理和更新
- ✅ 不会被提交到git（已配置.gitignore）

---

### 方案B：使用环境变量（备选）

如果无法使用PEM文件，可以配置环境变量。

#### 配置方法：

1. **在云开发控制台配置**
   - 进入：云函数 → paymentManagement_v1_3 → 函数配置 → 环境变量
   - 添加：`WECHAT_PAY_PRIVATE_KEY`
   - 值：完整的PEM文件内容（包括BEGIN和END标记）

2. **注意事项**
   - ⚠️ 环境变量可能会将换行符转换为空格
   - ✅ 代码会自动修复格式问题
   - ⚠️ 如果自动修复失败，建议使用方案A

#### 云函数会自动处理：
- 优先读取 `apiclient_key.pem` 文件
- 如果文件不存在，再读取环境变量
- 如果环境变量格式有问题，自动修复

---

## 🔧 其他环境变量配置

除了私钥，还需要配置以下环境变量：

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `WECHAT_PAY_MCHID` | 商户号 | `1234567890` |
| `WECHAT_PAY_API_KEY` | APIv3密钥 | `32位字符串` |
| `WECHAT_PAY_SERIAL_NO` | 证书序列号 | `从商户证书中获取` |
| `WECHAT_PAY_NOTIFY_URL` | 支付回调地址 | HTTP触发器URL |

---

## 📚 相关文档

- [微信支付开发文档](https://pay.weixin.qq.com/docs/merchant/apis/jsapi-payment/direct-jsapi.html)
- [支付功能调试指南](../../docs/payment-debug-guide.md)

---

## ⚠️ 安全提示

1. **私钥文件管理**
   - 本项目为私有仓库，私钥文件已提交到git便于部署
   - 请确保git仓库保持私有状态

2. **定期更新证书**
   - 商户证书有效期为5年
   - 到期前需要更新私钥文件

3. **部署说明**
   - 私钥文件会随云函数代码一起部署
   - 更新私钥后重新部署即可

---

最后更新：2024年

