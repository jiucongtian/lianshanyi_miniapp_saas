# Web页面加载器 - 快速开始

## 一、功能说明

已为小程序实现了Web页面加载功能，并添加了用户使用手册入口。

**功能位置：** 我的 -> 工具区域 -> 使用手册

## 二、立即部署（3步完成）

### 步骤1：上传HTML到静态托管

**方式A：使用脚本（推荐）**

```bash
cd /Users/zhenghao/workspace/lianshanyi/lianshanyi
./scripts/deploy-static-hosting.sh
```

**方式B：手动上传**

1. 访问：https://console.cloud.tencent.com/tcb/hosting
2. 选择环境：`cloudbase-8g06skyf81a65a87`
3. 上传文件：`static-hosting/user-manual.html`

### 步骤2：配置静态托管域名

1. 在静态托管控制台复制域名（类似：`https://xxx.tcloudbaseapp.com`）

2. 编辑 `miniprogram/config/index.js`：

```javascript
staticHosting: {
  baseUrl: 'https://你的域名', // 粘贴复制的域名，不要末尾的斜杠
}
```

### 步骤3：配置业务域名

1. 登录：https://mp.weixin.qq.com
2. 路径：开发 -> 开发管理 -> 开发设置 -> 业务域名
3. 点击"添加"，输入静态托管域名
4. 下载校验文件，上传到静态托管根目录
5. 点击"保存"

## 三、测试验证

1. 重新编译小程序
2. 进入"我的"页面
3. 点击"使用手册"
4. 应该能正常显示用户操作手册

## 四、文件结构

```
├── miniprogram/
│   ├── pages/
│   │   └── webview/              # 新建：Web页面加载器
│   │       ├── index.js
│   │       ├── index.wxml
│   │       ├── index.json
│   │       └── index.less
│   ├── config/
│   │   └── index.js              # 修改：添加staticHosting配置
│   └── pages/mine/               # 修改：添加使用手册入口
│       ├── index.wxml
│       └── index.js
├── static-hosting/               # 新建：静态托管目录
│   ├── user-manual.html          # 用户使用手册
│   └── README.md
├── scripts/
│   └── deploy-static-hosting.sh  # 新建：部署脚本
└── docs/
    ├── webview-user-manual-guide.md  # 详细说明文档
    └── webview-quickstart.md         # 本文档
```

## 五、常见问题

### Q1: 显示"网页加载失败"

**解决方案：**
- 检查 `config/index.js` 中的 `staticHosting.baseUrl` 是否配置
- 检查HTML文件是否已上传到静态托管
- 检查业务域名是否已配置

### Q2: 如何更新使用手册

1. 修改 `static-hosting/user-manual.html`
2. 重新运行部署脚本或手动上传
3. 小程序会自动加载最新版本

### Q3: 如何添加更多Web页面

```javascript
// 1. 将HTML文件放到 static-hosting/ 目录
// 2. 上传到静态托管
// 3. 在代码中跳转：

const { config } = require('../config/index');
const url = `${config.staticHosting.baseUrl}/your-page.html`;

wx.navigateTo({
  url: `/pages/webview/index?url=${encodeURIComponent(url)}&title=${encodeURIComponent('标题')}`
});
```

## 六、技术细节

### webview页面参数

| 参数 | 说明 | 必填 |
|-----|------|------|
| url | 要加载的网页地址（需URL编码） | 是 |
| title | 页面标题（需URL编码） | 否 |

### 配置项说明

```javascript
// miniprogram/config/index.js
staticHosting: {
  baseUrl: '',  // 静态托管基础URL，不包含末尾斜杠
}
```

### 调用示例

```javascript
// 在MineController中
onUserManualTap() {
  const { config } = require('../config/index');
  const manualUrl = `${config.staticHosting.baseUrl}/user-manual.html`;
  
  this._navigateTo('/pages/webview/index', {
    url: encodeURIComponent(manualUrl),
    title: encodeURIComponent('使用手册')
  });
}
```

## 七、下一步优化

可以考虑的扩展功能：

1. **添加更多文档页面**
   - FAQ常见问题
   - 功能介绍
   - 帮助中心

2. **增强交互**
   - webview与小程序通信
   - 动态传参
   - 用户行为统计

3. **性能优化**
   - 页面缓存
   - 图片懒加载
   - CDN加速

## 八、相关链接

- [详细实现文档](./webview-user-manual-guide.md)
- [静态托管说明](../static-hosting/README.md)
- [云开发控制台](https://console.cloud.tencent.com/tcb/hosting)
- [微信公众平台](https://mp.weixin.qq.com)
- [webview组件文档](https://developers.weixin.qq.com/miniprogram/dev/component/web-view.html)

---

**如有问题，请查阅详细实现文档或联系开发人员。**

