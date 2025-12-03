# 静态托管文件

## 目录说明

此目录用于存放需要通过小程序webview加载的HTML页面和相关静态资源。

## 当前文件

- `user-manual.html` - 用户使用手册页面

## 部署步骤

### 1. 上传到云开发静态托管

使用腾讯云CloudBase控制台上传文件到静态托管：

```bash
# 使用 CloudBase CLI 上传
tcb hosting deploy ./static-hosting -e cloudbase-8g06skyf81a65a87

# 或者手动上传
# 1. 访问控制台：https://console.cloud.tencent.com/tcb/hosting
# 2. 选择环境：cloudbase-8g06skyf81a65a87
# 3. 上传此目录下的所有文件
```

### 2. 获取静态托管域名

1. 访问云开发控制台：https://console.cloud.tencent.com/tcb/hosting
2. 选择你的环境
3. 复制默认域名（格式类似：`https://xxx.tcloudbaseapp.com`）

### 3. 配置小程序

编辑 `miniprogram/config/index.js` 文件，在 `staticHosting` 配置项中填入静态托管域名：

```javascript
staticHosting: {
  baseUrl: 'https://your-env-id.tcloudbaseapp.com', // 替换为你的实际域名
}
```

### 4. 配置小程序业务域名

为了能在小程序中通过webview加载静态托管的页面，需要配置业务域名：

1. 登录微信公众平台：https://mp.weixin.qq.com
2. 进入小程序管理后台
3. 开发 -> 开发管理 -> 开发设置 -> 业务域名
4. 添加你的静态托管域名：`https://xxx.tcloudbaseapp.com`
5. 下载校验文件并上传到静态托管根目录
6. 点击保存

## 添加新的Web页面

1. 将HTML文件放到此目录
2. 上传到静态托管（参考上面的部署步骤）
3. 在小程序中使用以下代码跳转：

```javascript
const { config } = require('../config/index');
const url = `${config.staticHosting.baseUrl}/your-page.html`;

wx.navigateTo({
  url: `/pages/webview/index?url=${encodeURIComponent(url)}&title=${encodeURIComponent('页面标题')}`
});
```

## 注意事项

1. **业务域名配置**：必须在微信公众平台配置业务域名，否则webview无法加载页面
2. **URL编码**：跳转时需要对URL和标题进行编码（使用 `encodeURIComponent`）
3. **HTTPS要求**：静态托管域名必须使用HTTPS协议
4. **文件大小**：建议单个HTML文件不超过2MB
5. **更新文件**：修改HTML后需要重新上传到静态托管

## 常见问题

### Q: webview显示"网页加载失败"

A: 检查以下几点：
1. 静态托管URL是否正确配置
2. 文件是否已上传到静态托管
3. 是否已在微信公众平台配置业务域名
4. URL是否使用HTTPS协议

### Q: 如何调试webview页面

A: 可以先在浏览器中访问静态托管URL测试页面是否正常，然后再在小程序中加载。

### Q: 如何自定义域名

A: 在云开发控制台的静态托管设置中可以配置自定义域名，配置后需要：
1. 添加DNS解析
2. 在微信公众平台重新配置业务域名
3. 更新小程序配置文件中的 baseUrl

