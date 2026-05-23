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

const toolCards = [
  { icon: '🃏', label: '卡牌查看器', desc: '浏览六十甲子', path: '/card-browser' },
  { icon: '📖', label: '使用手册',   desc: '了解联山易',   path: '/agreement' },
  { icon: '💬', label: '反馈与建议', desc: '帮助我们改进', path: '/feedback' },
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

async function guestBrowse() {
  await authStore.loginGuest()
  router.push('/home')
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
    <!-- ─── Header ─────────────────────────────── -->
    <div class="mine-page__header">
      <!-- Background decor circles -->
      <div class="mine-page__header-deco" aria-hidden="true">
        <div class="hdeco hdeco--1"></div>
        <div class="hdeco hdeco--2"></div>
      </div>

      <template v-if="!authStore.isLoggedIn || authStore.isGuest">
        <!-- Guest / not logged in -->
        <div class="mine-page__guest">
          <div class="mine-page__avatar mine-page__avatar--guest">？</div>
          <div class="mine-page__username">游客模式</div>
          <div class="mine-page__user-type">登录解锁完整功能</div>
          <div class="mine-page__guest-btns">
            <van-button round size="small" type="primary" class="mine-page__login-btn"
              @click="router.push('/login')">登录 / 注册</van-button>
          </div>
        </div>
      </template>

      <template v-else>
        <!-- Logged in user -->
        <div class="mine-page__user-row">
          <div class="mine-page__avatar">{{ avatarChar }}</div>
          <div class="mine-page__user-info">
            <div class="mine-page__username">
              {{ user?.nickname || user?.username || user?.phone || '用户' }}
            </div>
            <div class="mine-page__user-type">{{ userTypeLabel }}</div>
          </div>
        </div>
      </template>
    </div>

    <!-- ─── Profiles section ──────────────────── -->
    <div v-if="authStore.isLoggedIn && !authStore.isGuest" class="mine-page__section">
      <div class="mine-page__section-title">我的档案</div>
      <div class="mine-page__profiles">
        <div
          v-for="p in profileStore.profiles.slice(0, 3)"
          :key="p.id"
          class="mine-page__profile-item"
          @click="router.push(`/profiles/${p.id}`)"
        >
          <div class="mine-page__profile-avatar">{{ p.name.charAt(0) }}</div>
          <div class="mine-page__profile-info">
            <div class="mine-page__profile-name">{{ p.name }}</div>
            <div class="mine-page__profile-badge" v-if="p.isDefault">默认</div>
          </div>
          <div class="mine-page__profile-arrow">›</div>
        </div>
        <div class="mine-page__profile-add" @click="router.push('/profiles/add')">
          <div class="mine-page__add-icon">＋</div>
          <div class="mine-page__add-label">添加档案</div>
        </div>
      </div>
    </div>

    <!-- ─── Tool cards ─────────────────────────── -->
    <div class="mine-page__section">
      <div class="mine-page__section-title">工具</div>
      <div class="mine-page__tools">
        <div
          v-for="tool in toolCards"
          :key="tool.path"
          class="mine-page__tool-card"
          @click="router.push(tool.path)"
        >
          <div class="mine-page__tool-icon">{{ tool.icon }}</div>
          <div class="mine-page__tool-label">{{ tool.label }}</div>
          <div class="mine-page__tool-desc">{{ tool.desc }}</div>
        </div>
      </div>
    </div>

    <!-- ─── More menu ──────────────────────────── -->
    <div class="mine-page__section">
      <div class="mine-page__menu">
        <div class="mine-page__menu-item" @click="router.push('/daily-insight')">
          <span class="mine-page__menu-icon">🌙</span>
          <span class="mine-page__menu-label">今日运势</span>
          <span class="mine-page__menu-arrow">›</span>
        </div>
        <div class="mine-page__menu-item" @click="router.push('/assistant')">
          <span class="mine-page__menu-icon">🤖</span>
          <span class="mine-page__menu-label">助学童子</span>
          <span class="mine-page__menu-arrow">›</span>
        </div>
        <div
          v-if="authStore.isAdmin"
          class="mine-page__menu-item"
          @click="router.push('/admin')"
        >
          <span class="mine-page__menu-icon">⚙️</span>
          <span class="mine-page__menu-label">管理后台</span>
          <span class="mine-page__menu-arrow">›</span>
        </div>
      </div>
    </div>

    <!-- ─── Logout ──────────────────────────────── -->
    <div v-if="authStore.isLoggedIn && !authStore.isGuest" class="mine-page__logout">
      <van-button round block plain :loading="loggingOut" @click="handleLogout"
        class="mine-page__logout-btn">
        退出登录
      </van-button>
    </div>

    <!-- ─── Background ─────────────────────────── -->
    <div class="mine-page__bg" aria-hidden="true">
      <div v-for="i in 5" :key="i" :class="`mp-trail mp-trail--${i}`"></div>
    </div>
  </div>
</template>

<style scoped>
.mine-page {
  background: linear-gradient(160deg, #1a0a00 0%, #3d1a00 40%, #6b3412 100%);
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  padding-bottom: 100px;
}

/* ─── Header ─────────────────────────────── */
.mine-page__header {
  position: relative;
  padding: 40px 20px 28px;
  overflow: hidden;
  z-index: 2;
}

.mine-page__header-deco {
  position: absolute;
  top: -40px;
  right: -40px;
  pointer-events: none;
}

.hdeco {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(255, 210, 122, 0.1);
}

.hdeco--1 { width: 140px; height: 140px; top: 0; right: 0; }
.hdeco--2 { width: 200px; height: 200px; top: -30px; right: -30px; }

/* Guest layout */
.mine-page__guest {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.mine-page__guest-btns {
  margin-top: 8px;
}

.mine-page__login-btn :deep(.van-button--primary) {
  background: linear-gradient(135deg, #b86b1e 0%, #e89c40 100%);
  border: none;
  padding: 0 32px;
}

/* Logged-in layout */
.mine-page__user-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.mine-page__avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #b86b1e 0%, #e89c40 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 4px 16px rgba(184, 107, 30, 0.4);
}

.mine-page__avatar--guest {
  background: rgba(255, 210, 122, 0.15);
  border: 1.5px dashed rgba(255, 210, 122, 0.4);
  color: rgba(255, 210, 122, 0.6);
}

.mine-page__user-info { flex: 1; }

.mine-page__username {
  font-size: 20px;
  font-weight: 700;
  color: #ffd27a;
  letter-spacing: 1px;
}

.mine-page__user-type {
  font-size: 13px;
  color: rgba(255, 210, 122, 0.55);
  margin-top: 4px;
}

/* ─── Sections ───────────────────────────── */
.mine-page__section {
  margin: 0 16px 16px;
  position: relative;
  z-index: 2;
}

.mine-page__section-title {
  font-size: 13px;
  color: rgba(255, 210, 122, 0.5);
  letter-spacing: 1px;
  margin-bottom: 10px;
  padding-left: 4px;
}

/* ─── Profiles ───────────────────────────── */
.mine-page__profiles {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 210, 122, 0.12);
  border-radius: 16px;
  overflow: hidden;
}

.mine-page__profile-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255, 210, 122, 0.07);
  cursor: pointer;
  transition: background 0.15s;
}

.mine-page__profile-item:active {
  background: rgba(255, 255, 255, 0.05);
}

.mine-page__profile-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #8b4513 0%, #c9933a 100%);
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.mine-page__profile-info { flex: 1; }

.mine-page__profile-name {
  font-size: 15px;
  color: rgba(255, 220, 170, 0.9);
  font-weight: 600;
}

.mine-page__profile-badge {
  display: inline-block;
  font-size: 10px;
  color: #ffd27a;
  border: 1px solid rgba(255, 210, 122, 0.4);
  border-radius: 4px;
  padding: 1px 5px;
  margin-top: 3px;
}

.mine-page__profile-arrow {
  color: rgba(255, 210, 122, 0.4);
  font-size: 20px;
}

.mine-page__profile-add {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
  transition: background 0.15s;
}

.mine-page__profile-add:active {
  background: rgba(255, 255, 255, 0.05);
}

.mine-page__add-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1.5px dashed rgba(255, 210, 122, 0.3);
  color: rgba(255, 210, 122, 0.5);
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.mine-page__add-label {
  font-size: 14px;
  color: rgba(255, 210, 122, 0.5);
}

/* ─── Tool cards grid ─────────────────────── */
.mine-page__tools {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.mine-page__tool-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 210, 122, 0.12);
  border-radius: 14px;
  padding: 16px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: background 0.15s, transform 0.15s;
}

.mine-page__tool-card:active {
  background: rgba(255, 255, 255, 0.08);
  transform: scale(0.96);
}

.mine-page__tool-icon {
  font-size: 28px;
}

.mine-page__tool-label {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 220, 170, 0.9);
  text-align: center;
}

.mine-page__tool-desc {
  font-size: 11px;
  color: rgba(255, 210, 122, 0.4);
  text-align: center;
}

/* ─── More menu ──────────────────────────── */
.mine-page__menu {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 210, 122, 0.12);
  border-radius: 16px;
  overflow: hidden;
}

.mine-page__menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px 16px;
  border-bottom: 1px solid rgba(255, 210, 122, 0.07);
  cursor: pointer;
  transition: background 0.15s;
}

.mine-page__menu-item:last-child {
  border-bottom: none;
}

.mine-page__menu-item:active {
  background: rgba(255, 255, 255, 0.05);
}

.mine-page__menu-icon {
  font-size: 20px;
  width: 24px;
  text-align: center;
}

.mine-page__menu-label {
  flex: 1;
  font-size: 15px;
  color: rgba(255, 220, 170, 0.85);
}

.mine-page__menu-arrow {
  color: rgba(255, 210, 122, 0.4);
  font-size: 20px;
}

/* ─── Logout ──────────────────────────────── */
.mine-page__logout {
  padding: 4px 16px;
  position: relative;
  z-index: 2;
}

.mine-page__logout-btn {
  border-color: rgba(255, 210, 122, 0.3) !important;
  color: rgba(255, 210, 122, 0.6) !important;
  background: transparent !important;
}

/* ─── Background trails ──────────────────── */
.mine-page__bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}

.mp-trail {
  position: absolute;
  width: 1px;
  border-radius: 1px;
  background: linear-gradient(to bottom, transparent, rgba(255, 210, 122, 0.18), transparent);
  animation: trail-fall linear infinite;
  opacity: 0;
}

.mp-trail--1 { height: 55px; left: 7%;  animation-duration: 9s;   animation-delay: 0s; }
.mp-trail--2 { height: 40px; left: 30%; animation-duration: 12s;  animation-delay: 1.5s; }
.mp-trail--3 { height: 65px; left: 58%; animation-duration: 7.5s; animation-delay: 3s; }
.mp-trail--4 { height: 50px; left: 78%; animation-duration: 10s;  animation-delay: 0.8s; }
.mp-trail--5 { height: 45px; left: 92%; animation-duration: 8s;   animation-delay: 2.2s; }

@keyframes trail-fall {
  0%   { top: -8%;  opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 0.5; }
  100% { top: 108%; opacity: 0; }
}
</style>
