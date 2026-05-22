<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useProfileStore } from '@/stores/profile.store'
import BaziPillarCard from '@/components/bazi/BaziPillarCard.vue'

const router = useRouter()
const authStore = useAuthStore()
const profileStore = useProfileStore()

onMounted(async () => {
  if (authStore.isLoggedIn) {
    if (!authStore.user) await authStore.fetchMe()
    await profileStore.fetchProfiles()
  }
})

const quickActions = [
  { label: '今日运势', icon: 'sunny-o', route: '/daily-insight' },
  { label: '抽卡解读', icon: 'apps-o', route: '/answer' },
  { label: '助学童子', icon: 'chat-o', route: '/assistant' },
]
</script>

<template>
  <div class="home-page page-container">
    <!-- Header greeting -->
    <div class="home-page__header">
      <div class="home-page__greeting">
        <span class="home-page__greeting-text">
          你好，{{ authStore.user?.nickname ?? authStore.user?.username ?? '游客' }}
        </span>
        <span class="home-page__date">{{ new Date().toLocaleDateString('zh-CN') }}</span>
      </div>
    </div>

    <!-- BaZi section -->
    <div class="home-page__section">
      <div class="home-page__section-title">我的八字</div>

      <!-- Loading skeleton -->
      <van-skeleton v-if="profileStore.loading" :row="3" />

      <!-- No profile -->
      <div
        v-else-if="!profileStore.defaultProfile"
        class="home-page__no-profile"
        @click="router.push('/profiles/add')"
      >
        <van-icon name="plus-circle-o" size="32" color="#8B4513" />
        <div class="home-page__no-profile-text">创建命盘档案，开始探索您的八字</div>
        <van-button type="primary" size="small" round>立即创建</van-button>
      </div>

      <!-- Profile bazi display -->
      <template v-else-if="profileStore.defaultProfile?.baziResult">
        <div class="home-page__profile-name">
          {{ profileStore.defaultProfile.name }}
        </div>
        <div class="home-page__bazi-pillars">
          <BaziPillarCard
            label="年"
            :stem="profileStore.defaultProfile.baziResult.yearPillar.stem"
            :branch="profileStore.defaultProfile.baziResult.yearPillar.branch"
            :stem-wu-xing="profileStore.defaultProfile.baziResult.yearPillar.stemWuXing"
            :branch-wu-xing="profileStore.defaultProfile.baziResult.yearPillar.branchWuXing"
            :nayin="profileStore.defaultProfile.baziResult.yearPillar.nayin"
          />
          <BaziPillarCard
            label="月"
            :stem="profileStore.defaultProfile.baziResult.monthPillar.stem"
            :branch="profileStore.defaultProfile.baziResult.monthPillar.branch"
            :stem-wu-xing="profileStore.defaultProfile.baziResult.monthPillar.stemWuXing"
            :branch-wu-xing="profileStore.defaultProfile.baziResult.monthPillar.branchWuXing"
            :nayin="profileStore.defaultProfile.baziResult.monthPillar.nayin"
          />
          <BaziPillarCard
            label="日"
            :stem="profileStore.defaultProfile.baziResult.dayPillar.stem"
            :branch="profileStore.defaultProfile.baziResult.dayPillar.branch"
            :stem-wu-xing="profileStore.defaultProfile.baziResult.dayPillar.stemWuXing"
            :branch-wu-xing="profileStore.defaultProfile.baziResult.dayPillar.branchWuXing"
            :nayin="profileStore.defaultProfile.baziResult.dayPillar.nayin"
          />
          <BaziPillarCard
            label="时"
            :stem="profileStore.defaultProfile.baziResult.hourPillar.stem"
            :branch="profileStore.defaultProfile.baziResult.hourPillar.branch"
            :stem-wu-xing="profileStore.defaultProfile.baziResult.hourPillar.stemWuXing"
            :branch-wu-xing="profileStore.defaultProfile.baziResult.hourPillar.branchWuXing"
            :nayin="profileStore.defaultProfile.baziResult.hourPillar.nayin"
          />
        </div>
      </template>

      <!-- Profile exists but no bazi result -->
      <div v-else class="home-page__no-bazi">
        <p>{{ profileStore.defaultProfile?.name }} · 八字计算中...</p>
      </div>
    </div>

    <!-- Quick actions -->
    <div class="home-page__section">
      <div class="home-page__section-title">快捷功能</div>
      <div class="home-page__actions">
        <div
          v-for="action in quickActions"
          :key="action.route"
          class="home-page__action-item"
          @click="router.push(action.route)"
        >
          <div class="home-page__action-icon">
            <van-icon :name="action.icon" size="28" color="#8B4513" />
          </div>
          <div class="home-page__action-label">{{ action.label }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-page {
  background: var(--color-bg);
}

.home-page__header {
  background: linear-gradient(135deg, #8b4513 0%, #d4873b 100%);
  padding: 48px 20px 24px;
  color: #fff;
}

.home-page__greeting {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.home-page__greeting-text {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 1px;
}

.home-page__date {
  font-size: 13px;
  opacity: 0.8;
}

.home-page__section {
  margin: 16px 12px;
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(139, 69, 19, 0.06);
}

.home-page__section-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: 16px;
  padding-left: 8px;
  border-left: 3px solid var(--color-primary);
}

.home-page__no-profile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px;
  cursor: pointer;
}

.home-page__no-profile-text {
  font-size: 14px;
  color: var(--color-text-secondary);
  text-align: center;
}

.home-page__profile-name {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-bottom: 12px;
}

.home-page__bazi-pillars {
  display: flex;
  justify-content: space-around;
  gap: 8px;
}

.home-page__no-bazi {
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 14px;
  padding: 16px;
}

.home-page__actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.home-page__action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 8px;
  background: var(--color-bg);
  border-radius: 12px;
  cursor: pointer;
  transition: transform 0.15s;
}

.home-page__action-item:active {
  transform: scale(0.96);
}

.home-page__action-icon {
  width: 52px;
  height: 52px;
  background: linear-gradient(135deg, #fff8f0, #fdebd0);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(139, 69, 19, 0.1);
}

.home-page__action-label {
  font-size: 13px;
  color: var(--color-text);
  font-weight: 500;
}
</style>
