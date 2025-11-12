# Coze OAuth 授权码访问方式实施指南

## 重要说明：Token 作用域

**关键问题：每个用户的小程序都需要申请一个新的 Token 吗？**

**答案：❌ 不需要！**

### Token 作用域说明

对于 Coze 工作流 API 的调用场景，应该使用 **应用级别（Application-level）的 Token**，而不是用户级别（User-level）的 Token。

**两种 OAuth 模式对比：**

| 模式 | 授权级别 | Token 数量 | 适用场景 |
|------|---------|-----------|---------|
| **Client Credentials** | 应用级别 | **1个应用 = 1个Token** | 工作流API、服务端调用、不区分用户的场景 |
| **Authorization Code** | 用户级别 | 1个用户 = 1个Token | 需要访问用户个人数据的场景 |

**本项目推荐使用 Client Credentials 模式：**
- ✅ **一个小程序应用共享一个 Token**
- ✅ 所有用户调用 Coze API 时使用同一个 Token
- ✅ Token 存储在云函数中，自动刷新和管理
- ✅ 不需要用户授权流程，简化实现

**为什么不需要每个用户一个 Token？**
1. Coze 工作流 API 调用不区分用户身份
2. API 调用是基于应用配额，不是用户配额
3. 简化架构，减少 Token 管理复杂度
4. 提高性能，避免频繁获取 Token

---

## 一、OAuth 授权码流程解读

### 1.1 标准 OAuth 2.0 授权码流程

根据 Coze 官方文档，OAuth 授权码流程包含以下步骤：

```
┌─────────┐         ┌──────────────┐         ┌──────────┐
│  用户   │────────▶│  授权服务器  │────────▶│ Coze API │
│(小程序) │         │  (Coze平台)  │         │          │
└─────────┘         └──────────────┘         └──────────┘
     │                      │                      │
     │  1. 请求授权          │                      │
     │─────────────────────▶│                      │
     │                      │                      │
     │  2. 返回授权码        │                      │
     │◀─────────────────────│                      │
     │                      │                      │
     │  3. 用授权码换取Token │                      │
     │─────────────────────▶│                      │
     │                      │                      │
     │  4. 返回Access Token  │                      │
     │◀─────────────────────│                      │
     │                      │                      │
     │  5. 使用Token调用API  │                      │
     │───────────────────────────────────────────▶│
     │                      │                      │
     │  6. 返回API结果       │                      │
     │◀───────────────────────────────────────────│
```

### 1.2 关键步骤说明

1. **获取授权码（Authorization Code）**
   - 用户访问授权页面
   - 用户同意授权后，Coze 返回授权码
   - 授权码是临时的，通常几分钟内有效

2. **换取访问令牌（Access Token）**
   - 使用授权码 + Client ID + Client Secret 换取 Access Token
   - **重要**：Client Secret 必须保密，不能暴露在客户端

3. **使用 Access Token 访问 API**
   - 在请求头中携带 `Authorization: Bearer {access_token}`
   - Token 通常有有效期，需要刷新机制

## 二、小程序直接访问的可行性分析

### 2.1 ❌ 不适合直接在小程序客户端实现的原因

#### 问题 1：Client Secret 安全风险
```
❌ 不可行方案：
小程序客户端 → 直接使用 Client Secret 换取 Token
```
- **风险**：Client Secret 会暴露在小程序代码中
- **后果**：任何人都可以反编译小程序获取 Secret，伪造请求
- **结论**：违反 OAuth 2.0 安全规范

#### 问题 2：授权页面跳转限制
```
❌ 不可行方案：
小程序 → web-view 打开授权页面 → 获取授权码 → 直接换取 Token
```
- **限制**：小程序 web-view 需要配置业务域名
- **限制**：授权回调 URL 需要在小程序内处理，流程复杂
- **限制**：用户体验差，需要跳转到外部页面

#### 问题 3：Token 存储安全
```
❌ 不可行方案：
小程序本地存储 Access Token → 直接调用 Coze API
```
- **风险**：Token 存储在客户端容易被获取
- **风险**：Token 泄露后无法及时撤销
- **风险**：无法控制 Token 的使用范围

### 2.2 ✅ 推荐的混合方案

```
┌─────────────┐         ┌──────────────┐         ┌──────────┐
│  小程序客户端│         │   云函数     │         │ Coze API │
└─────────────┘         └──────────────┘         └──────────┘
       │                       │                      │
       │  1. 请求调用API        │                      │
       │──────────────────────▶│                      │
       │                       │                      │
       │                       │  2. 检查Token是否有效 │
       │                       │─────────────────────▶│
       │                       │                      │
       │                       │  3. 如果无效，用Secret│
       │                       │     换取新Token      │
       │                       │◀─────────────────────│
       │                       │                      │
       │                       │  4. 使用Token调用API │
       │                       │─────────────────────▶│
       │                       │                      │
       │                       │  5. 返回API结果      │
       │                       │◀─────────────────────│
       │                       │                      │
       │  6. 返回处理后的结果   │                      │
       │◀──────────────────────│                      │
```

**优势：**
- ✅ Client Secret 安全存储在云函数中
- ✅ Token 管理在服务端，可以缓存和刷新
- ✅ 小程序客户端无需处理 OAuth 流程
- ✅ 保持现有架构，只需增强云函数

## 三、实施方案设计

### 3.1 方案一：云函数代理模式（推荐）

**架构：**
- 小程序 → 云函数 → Coze API
- 云函数负责 Token 管理和 API 调用

**实施步骤：**

#### 步骤 1：在 Coze 平台创建 OAuth 应用

1. 登录 Coze 开放平台
2. 创建应用，获取：
   - `client_id`
   - `client_secret`
   - `redirect_uri`（重定向 URL）

**重要：关于重定向 URL 的填写**

由于我们使用的是 **Client Credentials 模式**（应用级别授权），**不需要用户授权流程**，因此重定向 URL 实际上不会被使用。

**填写方式（三选一）：**

**方式 1：填写占位符 URL（推荐）**
```
https://api.coze.cn/oauth/callback
```
- 说明：这是 Coze 平台的默认回调地址，虽然不会被使用，但可以满足必填要求

**方式 2：填写你的云函数 HTTP 触发地址（如果支持）**
```
https://your-env-id.tcb-api.tencentcloudapi.com/cozeAuth
```
- 说明：如果 Coze 平台支持，可以填写云函数的 HTTP 触发地址
- 注意：需要先创建云函数并配置 HTTP 触发器

**方式 3：填写一个通用的回调地址**
```
https://your-domain.com/oauth/callback
```
- 说明：如果你有自己的域名，可以填写一个通用的回调地址
- 注意：这个地址不会被实际调用，只是满足表单必填要求

**为什么重定向 URL 不会被使用？**

- Client Credentials 模式是服务端到服务端的授权
- 不需要用户浏览器跳转，不需要授权码回调
- 直接用 `client_id` + `client_secret` 获取 Token
- 因此重定向 URL 只是表单必填项，实际不会被调用

**如果 Coze 平台允许不填写：**
- 可以留空或填写 `N/A`
- 如果必须填写，使用方式 1 的占位符 URL 即可

#### 步骤 2：创建 Token 管理云函数

**重要：使用 Client Credentials 模式，获取应用级别的 Token**

```javascript
// cloudfunctions/cozeAuth/index.js
const cloud = require('wx-server-sdk');
const axios = require('axios');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// Coze OAuth 配置（从环境变量读取）
// 注意：这是应用级别的配置，所有用户共享
const COZE_OAUTH_CONFIG = {
  clientId: process.env.COZE_CLIENT_ID,        // 应用ID（不是用户ID）
  clientSecret: process.env.COZE_CLIENT_SECRET, // 应用密钥（不是用户密钥）
  tokenUrl: 'https://api.coze.cn/v1/oauth/token',
  apiBaseUrl: 'https://api.coze.cn'
};

// Token 缓存集合
// 注意：只存储一个应用级别的Token，所有用户共享
const TOKEN_COLLECTION = 'coze_tokens';

/**
 * 获取有效的 Access Token
 * 优先使用缓存的 Token，如果过期则刷新
 */
async function getValidAccessToken() {
  try {
    // 1. 从数据库获取缓存的 Token
    const tokenDoc = await db.collection(TOKEN_COLLECTION)
      .doc('default')
      .get();
    
    if (tokenDoc.data && tokenDoc.data.access_token) {
      const token = tokenDoc.data;
      const expiresAt = token.expires_at || 0;
      
      // 2. 检查 Token 是否还有效（提前5分钟刷新）
      if (Date.now() < expiresAt - 5 * 60 * 1000) {
        console.log('[getValidAccessToken] 使用缓存的 Token');
        return token.access_token;
      }
    }
    
    // 3. Token 过期或不存在，获取新 Token
    console.log('[getValidAccessToken] Token 已过期，获取新 Token');
    return await refreshAccessToken();
    
  } catch (error) {
    console.error('[getValidAccessToken] 获取 Token 失败:', error);
    // 如果读取失败，尝试获取新 Token
    return await refreshAccessToken();
  }
}

/**
 * 刷新 Access Token
 * 使用 Client Credentials 方式获取 Token
 * 
 * 注意：这是应用级别的Token，不是用户级别的Token
 * - 所有用户共享同一个Token
 * - Token基于应用配额，不是用户配额
 * - 不需要用户授权流程
 */
async function refreshAccessToken() {
  try {
    console.log('[refreshAccessToken] 使用Client Credentials模式获取应用级别Token');
    
    const response = await axios({
      method: 'POST',
      url: COZE_OAUTH_CONFIG.tokenUrl,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: new URLSearchParams({
        grant_type: 'client_credentials',  // 应用级别授权，不需要用户授权码
        client_id: COZE_OAUTH_CONFIG.clientId,
        client_secret: COZE_OAUTH_CONFIG.clientSecret
      }).toString()
    });
    
    if (response.data && response.data.access_token) {
      const tokenData = {
        access_token: response.data.access_token,
        token_type: response.data.token_type || 'Bearer',
        expires_in: response.data.expires_in || 7200, // 默认2小时
        expires_at: Date.now() + (response.data.expires_in || 7200) * 1000,
        updated_at: new Date()
      };
      
      // 保存到数据库
      // 注意：使用固定ID 'default'，表示这是应用级别的Token，所有用户共享
      await db.collection(TOKEN_COLLECTION)
        .doc('default')  // 固定ID，不是用户ID
        .set({
          data: tokenData
        });
      
      console.log('[refreshAccessToken] 应用级别Token刷新成功，所有用户将共享此Token');
      return tokenData.access_token;
    } else {
      throw new Error('获取 Token 失败：响应格式错误');
    }
  } catch (error) {
    console.error('[refreshAccessToken] 刷新 Token 失败:', error);
    if (error.response) {
      throw new Error(`获取 Token 失败: ${error.response.status} - ${error.response.data?.error_description || error.response.statusText}`);
    }
    throw error;
  }
}

/**
 * 调用 Coze API（带 Token 管理）
 */
async function callCozeAPIWithAuth(endpoint, method = 'POST', data = {}) {
  const accessToken = await getValidAccessToken();
  
  try {
    const response = await axios({
      method: method,
      url: `${COZE_OAUTH_CONFIG.apiBaseUrl}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      data: method === 'POST' ? data : undefined,
      params: method === 'GET' ? data : undefined,
      timeout: 25000
    });
    
    return response.data;
  } catch (error) {
    console.error('[callCozeAPIWithAuth] API 调用失败:', error);
    
    // 如果是 401 错误，可能是 Token 失效，尝试刷新后重试一次
    if (error.response && error.response.status === 401) {
      console.log('[callCozeAPIWithAuth] Token 可能失效，刷新后重试');
      const newToken = await refreshAccessToken();
      
      // 重试一次
      const retryResponse = await axios({
        method: method,
        url: `${COZE_OAUTH_CONFIG.apiBaseUrl}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${newToken}`
        },
        data: method === 'POST' ? data : undefined,
        params: method === 'GET' ? data : undefined,
        timeout: 25000
      });
      
      return retryResponse.data;
    }
    
    throw error;
  }
}

// 云函数入口
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  
  try {
    const { action, endpoint, method, data } = event;
    
    switch (action) {
      case 'callAPI':
        // 调用 Coze API
        const result = await callCozeAPIWithAuth(endpoint, method, data);
        return {
          success: true,
          data: result,
          timestamp: new Date().getTime()
        };
        
      case 'refreshToken':
        // 手动刷新 Token（用于测试）
        const token = await refreshAccessToken();
        return {
          success: true,
          data: { access_token: token },
          timestamp: new Date().getTime()
        };
        
      default:
        return {
          success: false,
          error: '未知操作类型',
          timestamp: new Date().getTime()
        };
    }
  } catch (error) {
    console.error('[cozeAuth] 云函数执行失败:', error);
    return {
      success: false,
      error: error.message || '操作失败',
      timestamp: new Date().getTime()
    };
  }
};
```

#### 步骤 3：修改现有云函数使用 OAuth Token

```javascript
// cloudfunctions/cozeFunctions_v1_3/index.js
// 修改 callCozeAPI 函数，改为调用 cozeAuth 云函数

const { callCozeAPIWithAuth } = require('../cozeAuth/index');

async function callCozeAPI(parameters, workflowId) {
  // 不再直接使用硬编码的 Token
  // 改为通过 cozeAuth 云函数调用
  
  try {
    // 方式1：直接调用 cozeAuth 云函数（推荐）
    const authResult = await cloud.callFunction({
      name: 'cozeAuth',
      data: {
        action: 'callAPI',
        endpoint: '/v1/workflow/run',
        method: 'POST',
        data: {
          workflow_id: workflowId,
          parameters: parameters
        }
      }
    });
    
    if (!authResult.result.success) {
      throw new Error(authResult.result.error);
    }
    
    return {
      success: true,
      data: authResult.result.data,
      parameters,
      workflowId: workflowId
    };
  } catch (error) {
    console.error('Coze API 请求失败:', error);
    throw error;
  }
}
```

### 3.2 方案二：客户端授权码流程（不推荐，仅作参考）

如果必须在小程序端实现授权码流程，需要以下步骤：

1. **使用 web-view 组件打开授权页面**
   ```xml
   <!-- pages/auth/index.wxml -->
   <web-view src="{{authUrl}}"></web-view>
   ```

2. **处理授权回调**
   - 配置 Coze 回调 URL 指向小程序页面
   - 在页面 onLoad 中解析授权码

3. **通过云函数换取 Token**
   - 小程序将授权码发送到云函数
   - 云函数使用 Client Secret 换取 Token
   - 云函数返回 Token（或直接代理 API 调用）

**问题：**
- 用户体验差（需要跳转外部页面）
- 流程复杂（需要处理回调）
- 安全性仍需云函数保护 Secret

## 四、推荐实施方案总结

### 4.1 最终推荐：云函数代理 + OAuth Client Credentials

**架构优势：**
- ✅ 安全性：Client Secret 完全在服务端
- ✅ 简单性：小程序无需处理 OAuth 流程
- ✅ 可维护性：Token 管理集中化
- ✅ 兼容性：保持现有代码结构

**实施步骤：**

1. **在 Coze 平台创建 OAuth 应用**
   - 获取 `client_id` 和 `client_secret`
   - 记录应用信息

2. **创建 cozeAuth 云函数**
   - 实现 Token 获取和刷新逻辑
   - 实现 Token 缓存机制
   - 提供 API 代理功能

3. **配置环境变量**
   ```json
   // cloudbase/cloudbaserc.json
   {
     "envVariables": {
       "COZE_CLIENT_ID": "your_client_id",
       "COZE_CLIENT_SECRET": "your_client_secret"
     }
   }
   ```

4. **创建数据库集合**
   - 集合名：`coze_tokens`
   - 用于缓存 Access Token

5. **修改现有云函数**
   - 将直接调用改为通过 cozeAuth 代理
   - 保持接口不变，客户端无需修改

6. **测试和部署**
   - 测试 Token 获取和刷新
   - 测试 API 调用
   - 部署到生产环境

### 4.2 数据库设计

**集合：coze_tokens**

```javascript
{
  _id: "default",  // 固定ID，表示应用级别Token，所有用户共享
  data: {
    access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    token_type: "Bearer",
    expires_in: 7200,
    expires_at: 1694678400000,  // 过期时间戳
    updated_at: "2023-09-14T08:00:00.000Z"
  },
  _createTime: 1694678400000,
  _updateTime: 1694678400000
}
```

**重要说明：**
- ✅ **只存储一个Token**：使用固定ID `"default"`，表示这是应用级别的Token
- ✅ **所有用户共享**：无论哪个用户调用，都使用同一个Token
- ✅ **自动刷新**：Token过期时自动刷新，无需用户操作
- ❌ **不是用户级别**：不会为每个用户创建单独的Token记录

### 4.3 环境变量配置

在 CloudBase 控制台或 `cloudbaserc.json` 中配置：

```json
{
  "envVariables": {
    "COZE_CLIENT_ID": "your_client_id_from_coze",
    "COZE_CLIENT_SECRET": "your_client_secret_from_coze"
  }
}
```

## 五、注意事项

### 5.1 安全性

1. **永远不要**在小程序代码中存储 `client_secret`
2. **永远不要**在小程序代码中存储 `access_token`
3. **使用环境变量**存储敏感配置
4. **定期轮换** Client Secret

### 5.2 Token 管理

1. **缓存 Token**：避免频繁请求
2. **提前刷新**：在过期前5分钟刷新
3. **错误重试**：401 错误时自动刷新重试
4. **监控告警**：Token 获取失败时告警

### 5.3 性能优化

1. **Token 缓存**：使用数据库缓存，减少 API 调用
2. **并发控制**：多个请求同时刷新 Token 时，只发起一次请求
3. **超时设置**：合理设置 API 超时时间

## 六、迁移计划

### 阶段 1：准备（1-2天）
- [ ] 在 Coze 平台创建 OAuth 应用
- [ ] 创建 cozeAuth 云函数
- [ ] 配置环境变量
- [ ] 创建数据库集合

### 阶段 2：开发（2-3天）
- [ ] 实现 Token 管理逻辑
- [ ] 实现 API 代理功能
- [ ] 修改现有云函数
- [ ] 编写单元测试

### 阶段 3：测试（1-2天）
- [ ] 测试 Token 获取和刷新
- [ ] 测试 API 调用
- [ ] 测试错误处理
- [ ] 性能测试

### 阶段 4：部署（1天）
- [ ] 部署到测试环境
- [ ] 验证功能正常
- [ ] 部署到生产环境
- [ ] 监控运行状态

## 七、总结

**问题：能否让小程序客户端直接访问 Coze API？**

**答案：**
- ❌ **不能**直接使用 OAuth 授权码方式在小程序客户端实现
- ✅ **可以**通过云函数代理方式，让小程序间接访问 Coze API
- ✅ **推荐**使用 Client Credentials 方式，在云函数中管理 Token

**核心原则：**
- 敏感信息（Client Secret）必须在服务端
- Token 管理应该在服务端
- 小程序只负责调用云函数，不处理 OAuth 流程

---

*最后更新时间：2025年1月*

