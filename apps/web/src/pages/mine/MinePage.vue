<template>
  <div class="mine-page">
    <div class="mine-header">
      <h2 class="page-title">我的</h2>
    </div>

    <!-- Not logged in -->
    <div v-if="!authStore.isLoggedIn" class="not-login-card">
      <van-empty image="person" description="您还未登录">
        <template #default>
          <div class="login-btns">
            <van-button round type="primary" @click="router.push('/login')">登录 / 注册</van-button>
            <van-button round plain @click="guestBrowse" style="margin-top: 12px">游客浏览</van-button>
          </div>
        </template>
      </van-empty>
    </div>

    <div v-else>
      <!-- User info card -->
      <div class="user-info-card">
        <van-image
          round
          width="64"
          height="64"
          :src="user?.avatarUrl || ''"
          fit="cover"
        >
          <template #error>
            <div class="avatar-placeholder">{{ avatarChar }}</div>
          </template>
        </van-image>
        <div class="user-detail">
          <div class="user-name">{{ user?.nickname || user?.username || user?.phone || '用户' }}</div>
          <van-tag :type="userTypeTagType" size="medium" class="user-type-tag">
            {{ userTypeLabel }}
          </van-tag>
        </div>
      </div>

      <!-- Profile list section -->
      <van-cell-group inset title="我的档案" style="margin-top: 12px">
        <van-cell
          v-for="p in profileStore.profiles.slice(0, 3)"
          :key="p.id"
          :title="p.name"
          :label="p.isDefault ? '默认档案' : ''"
          is-link
          @click="router.push(`/profiles/${p.id}`)"
        >
          <template #right-icon>
            <van-icon name="friends-o" class="cell-icon" />
          </template>
        </van-cell>
        <van-cell
          title="添加档案"
          is-link
          icon="plus"
          @click="router.push('/profiles/add')"
        />
      </van-cell-group>

      <!-- Menu -->
      <van-cell-group inset style="margin-top: 12px">
        <van-cell title="今日运势" is-link icon="calendar-o" @click="router.push('/daily-insight')" />
        <van-cell title="助学童子" is-link icon="chat-o" @click="router.push('/assistant')" />
        <van-cell title="意见反馈" is-link icon="comment-o" @click="router.push('/feedback')" />
        <van-cell title="用户协议" is-link icon="info-o" @click="router.push('/agreement')" />
        <van-cell
          v-if="authStore.isAdmin"
          title="管理后台"
          is-link
          icon="setting-o"
          @click="router.push('/admin')"
        />
      </van-cell-group>

      <!-- Logout -->
      <div class="logout-area">
        <van-button round block plain type="danger" :loading="loggingOut" @click="handleLogout">
          退出登录
        </van-button>
      </div>
    </div>
  </div>
</template>

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

const userTypeTagType = computed(() => {
  const map: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'danger'> = {
    guest: 'default', normal: 'primary', student: 'success', premium: 'warning',
  }
  return map[user.value?.userType ?? 'normal'] ?? 'primary'
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

<style scoped>
.mine-page {
  background: var(--color-bg);
  min-height: 100vh;
  padding-bottom: 80px;
}

.mine-header {
  background: var(--color-primary);
  padding: 24px 20px 16px;
}

.page-title {
  color: white;
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

.not-login-card {
  padding: 60px 20px;
}

.login-btns {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  margin-top: 16px;
}

.user-info-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 16px;
  background: white;
  margin: 0 0 4px;
}

.avatar-placeholder {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 600;
}

.user-detail { flex: 1; }

.user-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 6px;
}

.user-type-tag { }

.cell-icon { color: var(--color-text-secondary); }

.logout-area {
  padding: 32px 16px 16px;
}
</style>
