# 04 — 前端方案（Vue 3 + Vant 4，H5）

## 1. 技术栈

| 类别 | 选型 | 说明 |
|------|------|------|
| 框架 | Vue 3 + `<script setup>` + TypeScript | 类型友好、生态成熟 |
| 构建 | Vite 5 | 快、PWA 插件 (vite-plugin-pwa) |
| UI 组件库 | **Vant 4** | 移动端主流，Toast/Dialog/Picker/PullRefresh 一应俱全 |
| 路由 | Vue Router 4 | meta 鉴权 + 滚动恢复 |
| 状态管理 | Pinia | 比 Vuex 更轻、TS 友好 |
| HTTP | axios | 与原 `BaseService` 风格一致 |
| 表单校验 | vee-validate + yup（或 zod） | 与后端 schema 对齐 |
| Markdown 渲染 | markdown-it + DOMPurify | 替代 `markdownParser.js` |
| 富文本/海报 | html2canvas + canvas API | 替代原 `posterGenerator` |
| 国际化 | （暂不需要） | – |
| 测试 | vitest + Vue Test Utils + Playwright（E2E） | – |

> **为什么选 Vant 而不是 TDesign Mobile?**  
> Vant 在移动端 H5 场景沉淀最厚（Pull Refresh / Action Sheet / Picker 用得最顺手），且不需要适配特定生态。TDesign Mobile Vue 也可用，二者切换成本不高，但 Vant 在国内文档/示例更丰富。

## 2. 项目结构

```
lianshanyi-web/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
├── public/
│   ├── favicon.ico
│   └── manifest.webmanifest        # PWA 配置
└── src/
    ├── main.ts
    ├── App.vue
    ├── api/
    │   ├── client.ts               # axios 实例 + 拦截器
    │   ├── auth.ts
    │   ├── user.ts
    │   ├── profile.ts
    │   ├── card.ts
    │   ├── dailyInsight.ts
    │   ├── assistant.ts
    │   ├── feedback.ts
    │   └── admin.ts
    ├── stores/
    │   ├── useAuthStore.ts
    │   ├── useUserStore.ts
    │   ├── useProfileStore.ts
    │   └── useUiStore.ts           # loading / toast 全局态
    ├── router/
    │   ├── index.ts
    │   ├── routes.ts
    │   └── guards.ts               # 鉴权 / 权限
    ├── layouts/
    │   ├── TabBarLayout.vue        # 首页 / 卡牌 / 我的（含底部 tab）
    │   └── FullScreenLayout.vue
    ├── views/                      # 1:1 映射小程序 pages/
    │   ├── home/HomePage.vue
    │   ├── card/CardListPage.vue
    │   ├── card/CardViewerPage.vue
    │   ├── mine/MinePage.vue
    │   ├── profile/ProfilePage.vue
    │   ├── profile/AddProfilePage.vue
    │   ├── auth/LoginPage.vue
    │   ├── auth/RegisterPage.vue
    │   ├── agreement/AgreementPage.vue
    │   ├── daily-insight/DailyInsightPage.vue
    │   ├── answer/AnswerPage.vue
    │   ├── assistant/AssistantPage.vue
    │   ├── feedback/FeedbackPage.vue
    │   └── admin/
    │       ├── AdminUsersPage.vue
    │       ├── AdminFeedbacksPage.vue
    │       └── AdminStatsPage.vue
    ├── components/
    │   ├── BaziCard.vue
    │   ├── CardFlip.vue
    │   ├── TimePicker.vue
    │   ├── LunarPicker.vue
    │   ├── ChatBubble.vue
    │   ├── LoadingDots.vue
    │   └── AppTabBar.vue
    ├── composables/
    │   ├── useAuth.ts
    │   ├── useToast.ts
    │   ├── useAsyncTask.ts
    │   └── usePullRefresh.ts
    ├── lib/
    │   ├── poster.ts               # 海报合成（替代 wx canvas）
    │   ├── markdown.ts             # markdown-it 配置
    │   └── lunar.ts                # 浏览器侧农历工具（按需）
    ├── assets/
    │   ├── icons/                  # tabBar 图标
    │   ├── images/                 # static 数据
    │   └── data/
    │       └── jiazi.ts            # 60 甲子常量
    ├── styles/
    │   ├── tailwind.css            # 如使用 Tailwind
    │   ├── vant.scss               # Vant 主题变量覆盖
    │   └── global.scss
    └── utils/
        ├── env.ts
        ├── storage.ts              # localStorage 封装
        └── format.ts
```

## 3. 页面映射

| 原小程序 | Web 端路由 | 备注 |
|----------|------------|------|
| `pages/home` | `/` | 同名首页 |
| `pages/card` | `/cards` | 卡牌列表 |
| `pages/cardViewer` | `/cards/:number` | 详情 |
| `pages/answer` | `/answer` | 抽卡 + 解读，核心交互页 |
| `pages/profile` | `/profiles/:id` | 档案详情 |
| `pages/addProfile` | `/profiles/new` 与 `/profiles/:id/edit` | 新增/编辑 |
| `pages/mine` | `/me` | 我的 |
| `pages/register` | `/auth/register` + `/auth/login` | 拆分 |
| `pages/agreement` | `/agreement` | 用户协议 |
| `pages/daily-insight` | `/daily` | 每日运势 |
| `pages/assistant` | `/assistant` | 助学童子 |
| `pages/feedback` | `/feedback` | 反馈 |
| `pages/sysManage` | `/admin/*` | 管理员后台子路由 |
| `pages/store` | — | **删除** |
| `pages/debug` / `cacheInfo` / `webview` | — | **删除** |

## 4. 路由与底部 TabBar

```ts
// router/routes.ts
const routes = [
  {
    path: '/',
    component: TabBarLayout,
    children: [
      { path: '',     name: 'home',  component: HomePage,  meta: { tab: 'home' } },
      { path: 'cards',name: 'cards', component: CardListPage, meta: { tab: 'cards' } },
      { path: 'me',   name: 'me',    component: MinePage, meta: { tab: 'me', requiresAuth: true } },
    ]
  },
  {
    path: '/',
    component: FullScreenLayout,
    children: [
      { path: 'cards/:number', component: CardViewerPage },
      { path: 'answer',        component: AnswerPage,       meta: { requiresAuth: true, requiresPerm: 'draw_card' } },
      { path: 'profiles/new',  component: AddProfilePage,   meta: { requiresAuth: true } },
      { path: 'profiles/:id',  component: ProfilePage,      meta: { requiresAuth: true } },
      { path: 'profiles/:id/edit', component: AddProfilePage, meta: { requiresAuth: true } },
      { path: 'auth/login',    component: LoginPage,        meta: { guestOnly: true } },
      { path: 'auth/register', component: RegisterPage,     meta: { guestOnly: true } },
      { path: 'agreement',     component: AgreementPage },
      { path: 'daily',         component: DailyInsightPage },
      { path: 'assistant',     component: AssistantPage,    meta: { requiresAuth: true, requiresPerm: 'use_assistant' } },
      { path: 'feedback',      component: FeedbackPage,     meta: { requiresAuth: true } },
      { path: 'admin',         component: () => import('@/views/admin/AdminLayout.vue'),
        meta: { requiresAdmin: true },
        children: [/* admin 子路由 */]
      },
    ]
  },
  { path: '/:catchAll(.*)*', name: 'not-found', component: NotFoundPage },
];
```

底部 TabBar 仅在 `meta.tab` 存在的路由显示，三个 tab：首页 / 卡牌 / 我的（与原小程序一致）。

## 5. 状态管理

### 5.1 `useAuthStore`

```ts
export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(null);
  const expiresAt = ref<number>(0);
  
  const isLoggedIn = computed(() => !!accessToken.value && Date.now() < expiresAt.value);
  
  async function loginBySms(phone: string, code: string) { ... }
  async function loginByPassword(account: string, password: string) { ... }
  async function refresh() { ... }   // POST /auth/refresh
  async function logout() { ... }
  async function ensureGuest() { ... } // 首屏未登录时调
  
  return { accessToken, isLoggedIn, loginBySms, loginByPassword, refresh, logout, ensureGuest };
});
```

Access Token 仅存内存（避免被 XSS 偷取写入 localStorage）。刷新依赖 httpOnly Refresh Cookie。

### 5.2 `useUserStore`

封装当前用户资料 + 配额 + 权限。提供：
- `userInfo` ref
- `hasPermission(perm: string): boolean`
- `isAdmin: ComputedRef<boolean>`
- `refresh()` / `clear()`

### 5.3 `useProfileStore`

对应原 `ProfileManager`：
- `list`：所有档案数组
- `currentId`：当前选中档案
- `current` computed
- `setCurrent(id)` / `add` / `update` / `remove`
- 持久化 `currentId` 到 `localStorage`

## 6. HTTP 客户端

```ts
// api/client.ts
import axios from 'axios';
import { useAuthStore } from '@/stores/useAuthStore';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE,  // 例: https://www.example.com/api/v1
  timeout: 30000,
  withCredentials: true,                    // 让 Refresh Cookie 自动带
});

client.interceptors.request.use(cfg => {
  const auth = useAuthStore();
  if (auth.accessToken) cfg.headers.Authorization = `Bearer ${auth.accessToken}`;
  return cfg;
});

let refreshing: Promise<void> | null = null;
client.interceptors.response.use(
  r => r,
  async err => {
    const status = err.response?.status;
    const code = err.response?.data?.code;
    if (status === 401 && code === 'AUTH_INVALID') {
      if (!refreshing) refreshing = useAuthStore().refresh().finally(() => refreshing = null);
      await refreshing;
      return client(err.config);  // 重放原请求
    }
    throw err;
  }
);
```

业务层调用形态与原 `BaseService` 类似，但**去掉 `VersionManager` 整套逻辑**（不再有客户端版本路由）：

```ts
// api/profile.ts
import { client } from './client';
export const profileApi = {
  list:   (params)         => client.get('/profiles', { params }),
  get:    (id)             => client.get(`/profiles/${id}`),
  create: (data)           => client.post('/profiles', data),
  update: (id, data)       => client.patch(`/profiles/${id}`, data),
  remove: (id)             => client.delete(`/profiles/${id}`),
};
```

## 7. 视觉与交互迁移

### 7.1 与原小程序的视觉差异

| 维度 | 原小程序 | Web H5 |
|------|---------|--------|
| 状态栏 | wx 系统状态栏 + 自定义导航 | 浏览器顶栏 + 自绘 NavBar（可隐藏） |
| 单位 | rpx（750 设计稿） | rem + 主流移动端 viewport |
| TabBar | wx 原生 | 自实现 `<AppTabBar>` + Vant `<van-tabbar>` |
| 弹层 | TDesign popup | Vant `<van-popup>` |
| 下拉刷新 | `enablePullDownRefresh` | Vant `<van-pull-refresh>` |
| 图片预览 | `wx.previewImage` | `vant.ImagePreview` |
| 上传图片 | `wx.cloud.uploadFile` | `<van-uploader>` + 后端 multipart |

### 7.2 适配视口

```html
<!-- index.html -->
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
```

CSS 使用 `postcss-px-to-viewport` 或直接走 rem 方案（设计稿 375px，根字号 37.5px）。Vant 默认 px → 用 viewport 单位插件转换。

### 7.3 PWA

通过 `vite-plugin-pwa` 生成 `manifest.webmanifest`，提供：
- 首页加入桌面图标
- Service Worker 预缓存 60 张卡牌静态图
- 离线进入显示骨架页

## 8. 关键页面交互细节

### 8.1 `AnswerPage`（抽卡核心）

对应原 `pages/answer/index.js`（1755 行）。重写要点：
1. 删除微信支付分支（`wx.requestPayment`、`payment-modal`）
2. 保留两步 UE：输入问题 → 翻牌动画 → 解读
3. 翻牌动画用 CSS3 transform + transition（参考 react-card-flip / 自写）
4. 配额提示：超过 `dailyDrawQuota` 时弹 Dialog "今日次数已用完"
5. 分享：复制链接 + `navigator.share`（兼容主流移动浏览器），失败回退到二维码弹窗
6. 海报：`lib/poster.ts` 用 html2canvas 截屏 + `<a download>` 触发下载

### 8.2 `AssistantPage`（助学童子）

- 用 `<van-cell-group>` 显示历史消息
- 输入区固定底部，键盘弹起时 scroll 到底
- Mock 模式下 POST 立即返回，不轮询
- 真实 AI 接入后用 SSE（`EventSource`）或保留轮询路径

### 8.3 `AddProfilePage`

- 公历/农历切换：`<van-tabs>`
- 时间选择：`<van-picker>`（年月日时）
- 是否闰月：`<van-switch>`
- 提交前调用 `POST /bazi/calculate` 预览八字 → 用户确认后再 `POST /profiles`

### 8.4 `MinePage`

- 卡片堆：当前用户信息（昵称/头像/类型徽标）
- 配额条：今日已抽 / 上限
- 入口：我的档案 / 反馈 / 用户协议 / 退出登录
- 管理员入口：当 `userStore.isAdmin === true` 时显示 `/admin`

## 9. 环境变量

```bash
# .env.development
VITE_API_BASE=http://localhost:3000/api/v1
VITE_CDN_BASE=http://localhost:9000/lianshanyi

# .env.production
VITE_API_BASE=/api/v1
VITE_CDN_BASE=https://cdn.example.com
```

## 10. 构建与产物

```bash
npm run dev          # vite dev server @ :5173
npm run build        # 产物到 dist/
npm run preview      # 本地预览 dist
npm run typecheck    # vue-tsc --noEmit
npm run lint
npm run test:unit
npm run test:e2e
```

构建产物 `dist/` 由 nginx 静态托管（详见 [05-deployment.md](./05-deployment.md)）。

## 11. 测试

- 关键 store 单元测试（Pinia 推荐写法）
- 关键组件（CardFlip、ChatBubble）使用 @vue/test-utils
- E2E 关键路径用 Playwright：
  1. 匿名访客访问首页 → 看到卡牌列表
  2. 完成手机号注册 → 进入登录态
  3. 创建档案 → 查看八字结果
  4. 抽卡 → 看到解读
  5. 反馈 → 提交成功
  6. 管理员登录 → 修改用户类型成功

## 12. 与后端的契约同步

为避免前后端字段不一致：
- 后端 OpenAPI 文档由 `swagger-jsdoc` 生成 `/api/v1/openapi.json`
- 前端用 `openapi-typescript` 生成 `src/api/types.gen.ts`
- 关键接口的 TS 类型完全由 Schema 自动派生
