<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useAppToast } from '@/composables/useToast'

const router = useRouter()
const authStore = useAuthStore()
const { success } = useAppToast()

const loggingOut = ref(false)

const user = computed(() => authStore.user)
const isGuest = computed(() => !authStore.isLoggedIn || authStore.isGuest)

const userTypeText = computed(() => {
  const map: Record<string, string> = {
    guest: '临时用户',
    normal: '普通用户',
    student: '学员',
    premium: '高级会员',
  }
  return map[user.value?.userType ?? 'guest'] ?? '普通用户'
})

const avatarChar = computed(() => {
  const name = user.value?.nickname || user.value?.username || '用'
  return name.charAt(0)
})

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
  }
})
</script>

<template>
  <div class="mine-container">
    <!-- 右上角设置按钮 -->
    <div class="settings-button" @click="router.push('/feedback')">
      <span class="settings-icon">⚙️</span>
    </div>

    <!-- 用户信息头部 -->
    <div class="user-header">
      <div class="user-avatar">
        <span class="avatar-char">{{ isGuest ? '?' : avatarChar }}</span>
      </div>
      <div class="user-info">
        <div class="user-name-row">
          <span class="user-name">
            {{ isGuest ? '未注册用户' : (user?.nickname || user?.username || '用户') }}
          </span>
          <span v-if="authStore.isAdmin" class="admin-role-badge">管理员</span>
        </div>
        <span class="user-level">{{ isGuest ? '临时用户' : userTypeText }}</span>
      </div>
    </div>

    <!-- 操作按钮区域 -->
    <div class="action-section">
      <!-- 游客/未注册用户显示注册引导 -->
      <div v-if="isGuest" class="action-card">
        <div class="action-header">
          <span class="action-title">升级账户</span>
          <span class="action-subtitle">注册后解锁更多功能</span>
        </div>
        <div class="action-buttons">
          <div class="action-button primary" @click="router.push('/register')">
            <span class="button-icon">📝</span>
            <span class="button-text">立即注册</span>
          </div>
        </div>
        <div class="benefits-list">
          <div class="benefit-item">
            <span class="benefit-icon">📋</span>
            <span class="benefit-text">创建50个档案</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 用户详细信息 -->
    <div class="user-details">
      <!-- 基本信息（已登录用户） -->
      <div v-if="!isGuest" class="detail-section">
        <span class="section-title">基本信息</span>
        <div class="detail-item">
          <span class="detail-label">手机号</span>
          <span class="detail-value">{{ user?.phone || '未绑定' }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">账号类型</span>
          <span class="detail-value">{{ userTypeText }}</span>
        </div>
      </div>

      <!-- 工具区域 -->
      <div class="tools-section">
        <div v-if="!isGuest" class="tool-card" @click="router.push('/assistant')">
          <div class="tool-icon">🧙</div>
          <div class="tool-info">
            <span class="tool-title">助学童子</span>
            <span class="tool-desc">智能问答助手</span>
          </div>
          <div class="tool-arrow">›</div>
        </div>

        <div class="tool-card" @click="router.push('/card-browser')">
          <div class="tool-icon">🃏</div>
          <div class="tool-info">
            <span class="tool-title">卡牌查看器</span>
            <span class="tool-desc">输入1-60查看对应卡牌</span>
          </div>
          <div class="tool-arrow">›</div>
        </div>

        <div class="tool-card" @click="router.push('/agreement')">
          <div class="tool-icon">📖</div>
          <div class="tool-info">
            <span class="tool-title">使用手册</span>
            <span class="tool-desc">查看使用说明</span>
          </div>
          <div class="tool-arrow">›</div>
        </div>

        <div class="tool-card" @click="router.push('/feedback')">
          <div class="tool-icon">💬</div>
          <div class="tool-info">
            <span class="tool-title">反馈与建议</span>
            <span class="tool-desc">告诉我们您的想法</span>
          </div>
          <div class="tool-arrow">›</div>
        </div>

        <div v-if="authStore.isAdmin" class="tool-card" @click="router.push('/admin')">
          <div class="tool-icon">⚙️</div>
          <div class="tool-info">
            <span class="tool-title">系统管理</span>
            <span class="tool-desc">后台管理</span>
          </div>
          <div class="tool-arrow">›</div>
        </div>
      </div>
    </div>

    <!-- 退出登录 -->
    <div v-if="!isGuest" class="logout-section">
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
.mine-container {
  background-color: #f5f5f5;
  min-height: 100vh;
  padding-bottom: 20px;
  position: relative;
}

/* ─── 右上角设置按钮 ──────────────────────── */
.settings-button {
  position: fixed;
  top: 0;
  right: 0;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  cursor: pointer;
  transition: opacity 0.2s;
}

.settings-button:active {
  opacity: 0.7;
  transform: scale(0.95);
}

.settings-icon {
  font-size: 22px;
}

/* ─── 用户信息头部 ───────────────────────── */
.user-header {
  background: linear-gradient(135deg, #854C65 0%, #A06B7F 100%);
  padding: 48px 16px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
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
  flex-shrink: 0;
}

.avatar-char {
  font-size: 24px;
  font-weight: bold;
  color: #ffffff;
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
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
  padding: 2px 8px;
}

.user-level {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 10px;
  border-radius: 8px;
  display: inline-block;
  align-self: flex-start;
}

/* ─── 操作区域 ───────────────────────────── */
.action-section {
  padding: 16px;
}

.action-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
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

.button-icon {
  font-size: 16px;
}

.button-text {
  font-size: 14px;
  color: #fff;
}

.benefits-list {
  border-top: 1px solid #f0f0f0;
  padding-top: 8px;
}

.benefit-item {
  display: flex;
  align-items: center;
  padding: 6px 0;
  gap: 8px;
}

.benefit-icon {
  font-size: 14px;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.benefit-text {
  font-size: 13px;
  color: #666;
}

/* ─── 用户详情 ───────────────────────────── */
.user-details {
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ─── 基本信息卡 ─────────────────────────── */
.detail-section {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.05);
}

.section-title {
  display: block;
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-label {
  font-size: 14px;
  color: #666;
}

.detail-value {
  font-size: 14px;
  color: #333;
}

/* ─── 工具区域 ───────────────────────────── */
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
  color: #ccc;
  font-weight: 300;
}

/* ─── 退出登录 ───────────────────────────── */
.logout-section {
  padding: 16px;
  margin-top: 4px;
}

.logout-btn {
  border-color: #ddd !important;
  color: #999 !important;
  background: transparent !important;
  font-size: 14px;
}
</style>
