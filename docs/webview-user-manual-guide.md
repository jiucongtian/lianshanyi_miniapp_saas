# Web页面加载器 - 用户使用手册功能实现说明

## 功能概述

实现了一个通用的Web页面加载器（webview），用于在小程序中加载HTML页面。首个应用场景是用户使用手册。

## 实现内容

### 1. 创建的文件

#### 页面文件
- `miniprogram/pages/webview/index.js` - webview页面逻辑
- `miniprogram/pages/webview/index.wxml` - webview页面结构
- `miniprogram/pages/webview/index.json` - webview页面配置
- `miniprogram/pages/webview/index.less` - webview页面样式

#### 静态托管文件
- `static-hosting/user-manual.html` - 用户使用手册HTML文件
- `static-hosting/README.md` - 静态托管使用说明

#### 文档
- `docs/webview-user-manual-guide.md` - 本文档

### 2. 修改的文件

#### 应用配置
- `miniprogram/app.json` - 注册了webview页面

#### 配置文件
- `miniprogram/config/index.js` - 添加了静态托管配置项

#### 我的页面
- `miniprogram/pages/mine/index.wxml` - 添加了使用手册入口
- `miniprogram/pages/mine/index.js` - 添加了使用手册点击事件
- `miniprogram/controllers/MineController.js` - 添加了 `onUserManualTap()` 方法

## 功能特点

### 1. 通用webview页面

支持加载任意HTTPS的Web页面，通过URL参数传递：

```javascript
wx.navigateTo({
  url: `/pages/webview/index?url=${encodeURIComponent(pageUrl)}&title=${encodeURIComponent(pageTitle)}`
});
```

### 2. 错误处理

- URL参数缺失时自动返回
- 加载失败时显示错误提示
- 完整的日志记录

### 3. 灵活配置

通过配置文件统一管理静态托管URL，便于环境切换：

```javascript
// miniprogram/config/index.js
staticHosting: {
  baseUrl: 'https://your-domain.com', // 静态托管域名
}
```

## 部署步骤

### 第一步：上传HTML到静态托管

有两种方式：

#### 方式1：使用CloudBase CLI（推荐）

```bash
# 安装CloudBase CLI（如果还没安装）
npm install -g @cloudbase/cli

# 登录
tcb login

# 部署静态托管
tcb hosting deploy ./static-hosting -e cloudbase-8g06skyf81a65a87
```

#### 方式2：使用控制台手动上传

1. 访问：https://console.cloud.tencent.com/tcb/hosting
2. 选择环境：`cloudbase-8g06skyf81a65a87`
3. 上传 `static-hosting/user-manual.html` 文件

### 第二步：获取静态托管域名

1. 在静态托管控制台查看默认域名
2. 格式类似：`https://cloudbase-8g06skyf81a65a87-xxx.tcloudbaseapp.com`

### 第三步：配置小程序

编辑 `miniprogram/config/index.js`：

```javascript
staticHosting: {
  baseUrl: 'https://cloudbase-8g06skyf81a65a87-xxx.tcloudbaseapp.com', // 替换为实际域名
}
```

### 第四步：配置业务域名（重要）

webview要求必须配置业务域名：

1. 登录微信公众平台：https://mp.weixin.qq.com
2. 选择你的小程序
3. 开发 -> 开发管理 -> 开发设置 -> 业务域名
4. 点击"添加"
5. 填入静态托管域名（例如：`cloudbase-8g06skyf81a65a87-xxx.tcloudbaseapp.com`）
6. 下载校验文件（文件名类似：`xxx.txt`）
7. 上传校验文件到静态托管根目录
8. 点击"保存"

### 第五步：测试功能

1. 编译小程序
2. 进入"我的"页面
3. 点击"使用手册"
4. 检查是否正常加载用户手册页面

## 使用方法

### 在小程序中打开使用手册

用户操作路径：
1. 打开小程序
2. 点击底部导航"我的"
3. 在工具区域找到"使用手册"
4. 点击进入即可查看

### 添加新的Web页面

如果需要添加更多Web页面：

1. 将HTML文件放到 `static-hosting/` 目录
2. 上传到云开发静态托管
3. 在代码中使用以下方式跳转：

```javascript
const { config } = require('../config/index');
const pageUrl = `${config.staticHosting.baseUrl}/your-page.html`;

wx.navigateTo({
  url: `/pages/webview/index?url=${encodeURIComponent(pageUrl)}&title=${encodeURIComponent('页面标题')}`
});
```

## 注意事项

### 1. 业务域名配置

**必须配置**，否则webview无法加载页面。每个小程序最多可配置20个业务域名。

### 2. HTTPS要求

静态托管默认提供HTTPS域名，无需额外配置SSL证书。

### 3. 文件更新

修改HTML文件后需要：
1. 重新上传到静态托管
2. 可能需要清除浏览器缓存
3. 小程序端会自动加载最新版本

### 4. 调试建议

开发时可以：
1. 先在浏览器中打开静态托管URL测试
2. 使用开发者工具的webview调试功能
3. 查看控制台日志

### 5. 性能优化

- 单个HTML文件建议不超过2MB
- 外部资源（图片、CSS、JS）使用CDN
- 图片使用占位符（当前实现使用了placeholder图片）

## 扩展功能

### 1. 可以添加更多手册页面

例如：
- FAQ常见问题
- 功能介绍
- 隐私政策
- 服务条款
- 帮助中心

### 2. 支持动态内容

可以通过URL参数传递数据：

```javascript
const pageUrl = `${config.staticHosting.baseUrl}/page.html?userId=${userId}&type=help`;
```

HTML页面中通过JavaScript获取参数：

```javascript
const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('userId');
```

### 3. webview与小程序通信

HTML页面可以通过postMessage向小程序发送消息：

```javascript
// HTML页面中
wx.miniProgram.postMessage({ 
  data: { action: 'doSomething' } 
});

// 小程序webview页面中
onMessage(e) {
  console.log('收到消息:', e.detail.data);
}
```

## 常见问题

### Q: 显示"网页加载失败"

检查：
1. 静态托管URL配置是否正确
2. HTML文件是否已上传
3. 业务域名是否已配置
4. URL是否使用HTTPS

### Q: 如何查看静态托管文件列表

访问控制台：https://console.cloud.tencent.com/tcb/hosting

### Q: 能否使用外部链接

可以，但必须在微信公众平台配置对应的业务域名。建议使用自己的静态托管更可控。

### Q: 如何自定义域名

在云开发控制台的静态托管设置中可以配置自定义域名，配置后需要在微信公众平台重新配置业务域名。

## 相关链接

- 云开发控制台：https://console.cloud.tencent.com/tcb/hosting
- 微信公众平台：https://mp.weixin.qq.com
- webview组件文档：https://developers.weixin.qq.com/miniprogram/dev/component/web-view.html
- 业务域名配置指南：https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html

