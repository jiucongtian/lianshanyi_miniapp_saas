<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useProfileStore } from '@/stores/profile.store'
import { useAppToast } from '@/composables/useToast'

const router = useRouter()
const authStore = useAuthStore()
const profileStore = useProfileStore()
const { success } = useAppToast()

const loggingOut = ref(false)

const user = computed(() => authStore.user)

const avatarChar = computed(() => {
  const name = user.value?.nickname || user.value?.username || '用'
  return name.charAt(0)
})

const userTypeLabel = computed(() => {
  const map: Record<string, string> = {
    guest: '游客', normal: '普通用户', student: '学员', premium: '高级会员',
  }
  return map[user.value?.userType ?? 'normal'] ?? '用户'
})

const toolItems = [
  { icon: '🃏', label: '卡牌查看器', desc: '浏览六十甲子全卡', path: '/card-browser' },
  { icon: '🌙', label: '今日运势',   desc: '每日愈见',         path: '/daily-insight' },
  { icon: '🤖', label: '助学童子',   desc: 'AI 命理问答',      path: '/assistant' },
  { icon: '📖', label: '使用手册',   desc: '了解联山易',       path: '/agreement' },
  { icon: '💬', label: '反馈与建议', desc: '帮助我们改进',     path: '/feedback' },
]

async function handleLogout() {
  loggingOut.value = true
  try {
    await authStore.logout()
    success('已退出登录')
  } finally {
    loggingOut.value = false
  }
}

onMounted(() => {
  if (authStore.isLoggedIn) {
    authStore.fetchMe()
    profileStore.fetchProfiles()
  }
})
</script>

<template>
  <div class="mine-page page-container">

    <!-- ─── 渐变头部 ───────────────────────────── -->
    <div class="user-header">
      <!-- 右上角设置按钮占位 -->
      <div class="settings-placeholder" aria-hidden="true"></div>

      <template v-if="!authStore.isLoggedIn || authStore.isGuest">
        <!-- 游客 -->
        <div class="user-avatar user-avatar--guest">？</div>
        <div class="user-info">
          <div class="user-name">游客模式</div>
          <span class="user-level">登录解锁完整功能</span>
        </div>
        <div class="guest-login-btn" @click="router.push('/login')">登录 / 注册</div>
      </template>

      <template v-else>
        <!-- 已登录用户 -->
        <div class="user-avatar">{{ avatarChar }}</div>
        <div class="user-info">
          <div class="user-name-row">
            <span class="user-name">{{ user?.nickname || user?.username || user?.phone || '用户' }}</span>
            <span v-if="authStore.isAdmin" class="admin-role-badge">管理员</span>
          </div>
          <span class="user-level">{{ userTypeLabel }}</span>
        </div>
      </template>
    </div>

    <!-- ─── 我的档案 ───────────────────────────── -->
    <div v-if="authStore.isLoggedIn && !authStore.isGuest" class="action-section">
      <div class="action-card">
        <div class="action-header">
          <span class="action-title">我的档案</span>
          <span class="action-subtitle">管理您的命理档案</span>
        </div>
        <div class="action-buttons">
          <div
            class="action-button primary"
            @click="router.push('/profiles/add')"
          >
            <span class="button-icon">＋</span>
            <span class="button-text">添加档案</span>
          </div>
          <div
            v-if="profileStore.defaultProfile"
            class="action-button secondary"
            @click="router.push(`/profiles/${profileStore.defaultProfile.id}`)"
          >
            <span class="button-text">{{ profileStore.defaultProfile.name }}</span>
          </div>
        </div>
        <div v-if="profileStore.profiles.length" class="benefits-list">
          <div
            v-for="p in profileStore.profiles"
            :key="p.id"
            class="benefit-item"
            @click="router.push(`/profiles/${p.id}`)"
            style="cursor:pointer"
          >
            <span class="benefit-icon">👤</span>
            <span class="benefit-text">{{ p.name }}</span>
            <span v-if="p.isDefault" class="benefit-badge">默认</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── 工具列表 ───────────────────────────── -->
    <div class="user-details">
      <div class="tools-section">
        <div
          v-for="tool in toolItems"
          :key="tool.path"
          class="tool-card"
          @click="router.push(tool.path)"
        >
          <div class="tool-icon">{{ tool.icon }}</div>
          <div class="tool-info">
            <span class="tool-title">{{ tool.label }}</span>
            <span class="tool-desc">{{ tool.desc }}</span>
          </div>
          <div class="tool-arrow">›</div>
        </div>
      </div>

      <!-- 管理员入口 -->
      <div v-if="authStore.isAdmin" class="tools-section" style="margin-top:16px">
        <div class="tool-card" @click="router.push('/admin')">
          <div class="tool-icon">⚙️</div>
          <div class="tool-info">
            <span class="tool-title">管理后台</span>
            <span class="tool-desc">系统管理</span>
          </div>
          <div class="tool-arrow">›</div>
        </div>
      </div>
    </div>

    <!-- ─── 退出登录 ───────────────────────────── -->
    <div v-if="authStore.isLoggedIn && !authStore.isGuest" class="logout-section">
      <van-button
        round block plain
        :loading="loggingOut"
        class="logout-btn"
        @click="handleLogout"
      >
        退出登录
      </van-button>
    </div>

  </div>
</template>

<style scoped>
/* ─── 页面背景 ───────────────────────────── */
.mine-page {
  background-color: #f5f5f5;
  min-height: 100vh;
  padding-bottom: 40px;
  position: relative;
}

/* ─── 渐变头部 ───────────────────────────── */
.user-header {
  background: linear-gradient(135deg, #854C65 0%, #A06B7F 100%);
  padding: 50px 16px 20px;
  display: flex;
  align-items: center;
  position: relative;
  gap: 12px;
}

.settings-placeholder {
  position: absolute;
  top: 0; right: 0;
  width: 44px; height: 44px;
}

.user-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
  color: #ffffff;
  flex-shrink: 0;
}

.user-avatar--guest {
  background: rgba(255, 255, 255, 0.1);
  border-style: dashed;
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-name {
  font-size: 18px;
  font-weight: bold;
  color: #ffffff;
}

.admin-role-badge {
  font-size: 10px;
  color: #fff;
  background: rgba(255, 165, 0, 0.8);
  border-radius: 10px;
  padding: 1px 6px;
}

.user-level {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 8px;
  border-radius: 8px;
  display: inline-block;
  align-self: flex-start;
}

.guest-login-btn {
  font-size: 13px;
  color: #ffffff;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 16px;
  padding: 6px 14px;
  cursor: pointer;
  flex-shrink: 0;
}

/* ─── 操作区域 ───────────────────────────── */
.action-section {
  padding: 16px;
}

.action-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 0;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.05);
}

.action-header {
  margin-bottom: 12px;
}

.action-title {
  display: block;
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
}

.action-subtitle {
  display: block;
  font-size: 12px;
  color: #666;
}

.action-buttons {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.action-button {
  flex: 1;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.15s;
}

.action-button:active {
  transform: scale(0.97);
}

.action-button.primary {
  background: linear-gradient(135deg, #854C65 0%, #A06B7F 100%);
  color: #fff;
}

.action-button.secondary {
  background: #f8f9fa;
  color: #854C65;
  border: 1px solid #e9ecef;
}

.button-icon {
  font-size: 16px;
}

.benefits-list {
  border-top: 1px solid #f0f0f0;
  padding-top: 8px;
}

.benefit-item {
  display: flex;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f5f5f5;
  gap: 8px;
}

.benefit-item:last-child {
  border-bottom: none;
}

.benefit-icon {
  font-size: 14px;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.benefit-text {
  font-size: 14px;
  color: #333;
  flex: 1;
}

.benefit-badge {
  font-size: 10px;
  color: #854C65;
  border: 1px solid rgba(133, 76, 101, 0.3);
  border-radius: 4px;
  padding: 1px 5px;
}

/* ─── 工具列表 ───────────────────────────── */
.user-details {
  padding: 0 16px;
}

.tools-section {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.05);
}

.tool-card {
  background: #fff;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
  transition: background 0.15s;
}

.tool-card:last-child {
  border-bottom: none;
}

.tool-card:active {
  background: #f8f9fa;
  transform: scale(0.99);
}

.tool-icon {
  font-size: 28px;
  margin-right: 12px;
  flex-shrink: 0;
}

.tool-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tool-title {
  font-size: 15px;
  font-weight: bold;
  color: #333;
}

.tool-desc {
  font-size: 12px;
  color: #999;
}

.tool-arrow {
  font-size: 22px;
  color: #d0d0d0;
  font-weight: 300;
}

/* ─── 退出登录 ───────────────────────────── */
.logout-section {
  padding: 16px;
}

.logout-btn {
  border-color: #ddd !important;
  color: #999 !important;
  background: transparent !important;
  font-size: 14px;
}
</style>
