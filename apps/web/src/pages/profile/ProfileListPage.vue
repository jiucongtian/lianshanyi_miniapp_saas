<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showDialog } from 'vant'
import { useProfileStore } from '@/stores/profile.store'
import { useAuthStore } from '@/stores/auth.store'
import { useAppToast, extractApiError } from '@/composables/useToast'

const router = useRouter()
const profileStore = useProfileStore()
const authStore = useAuthStore()
const { success, fail } = useAppToast()

const loading = computed(() => profileStore.loading)
const profileList = computed(() => profileStore.profiles)
const currentProfileId = computed(() => profileStore.defaultProfile?.id ?? null)
const usedProfiles = computed(() => profileList.value.length)
const canCreateMore = computed(() => usedProfiles.value < 10)

function onProfileTap(id: string) {
  profileStore.setDefault(id)
  router.back()
}

function onEditProfile(id: string) {
  router.push(`/profiles/${id}/edit`)
}

async function onDeleteProfile(id: string) {
  const target = profileList.value.find((p) => p.id === id)
  if (!target) return
  try {
    await showDialog({
      title: '删除确认',
      message: `确定要删除档案「${target.name}」吗？此操作不可恢复。`,
      confirmButtonText: '删除',
      confirmButtonColor: '#ee0a24',
      cancelButtonText: '取消',
      showCancelButton: true,
    })
    await profileStore.deleteProfile(id)
    success('档案已删除')
  } catch (err: unknown) {
    if (err === 'cancel') return
    fail(extractApiError(err))
  }
}

function onAddProfile() {
  if (!canCreateMore.value) return
  router.push('/profiles/add')
}

onMounted(async () => {
  if (authStore.isLoggedIn && !authStore.isGuest) {
    await profileStore.fetchProfiles()
  }
})
</script>

<template>
  <div class="profile-container">
    <!-- 页面头部 -->
    <div class="header">
      <div class="header-content">
        <div class="title-section">
          <span class="page-title">我的牌库</span>
          <span class="page-subtitle">{{ usedProfiles }}个</span>
        </div>
        <div
          class="add-button"
          :class="canCreateMore ? 'enabled' : 'disabled'"
          @click="onAddProfile"
        >
          <span class="add-icon">+</span>
          <span class="add-text">{{ canCreateMore ? '添加' : '已满' }}</span>
        </div>
      </div>
    </div>

    <!-- 牌库列表 -->
    <div class="profile-list">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <span class="loading-text">加载中...</span>
      </div>

      <!-- 牌库项列表 -->
      <div v-else-if="profileList.length > 0" class="profile-items">
        <div
          v-for="item in profileList"
          :key="item.id"
          class="profile-item"
          :class="{ selected: item.id === currentProfileId }"
        >
          <div class="profile-card">
            <div class="profile-info" @click="onProfileTap(item.id)">
              <div class="profile-header">
                <span class="profile-name">{{ item.name }}</span>
                <div
                  class="gender-badge"
                  :class="item.gender === 'male' ? 'gender-male' : 'gender-female'"
                >
                  <span class="gender-text">{{ item.gender === 'male' ? '男' : '女' }}</span>
                </div>
              </div>
            </div>
            <div class="profile-actions">
              <div class="action-button edit-button" @click.stop="onEditProfile(item.id)">
                <span class="action-icon">✏️</span>
              </div>
              <div class="action-button delete-button" @click.stop="onDeleteProfile(item.id)">
                <span class="action-icon">🗑️</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-container">
        <div class="empty-content">
          <div class="empty-icon">📋</div>
          <span class="empty-title">还没有牌库</span>
          <span class="empty-desc">创建您的第一个生命智慧牌库</span>
          <div class="empty-button" @click="onAddProfile">
            <span class="button-text">立即创建</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-container {
  background-color: #f5f5f5;
  min-height: 100vh;
}

.header {
  background: linear-gradient(135deg, #854C65 0%, #A06B7F 100%);
  padding: 48px 16px 16px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
}

.title-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  font-size: 20px;
  font-weight: bold;
}

.page-subtitle {
  font-size: 13px;
  opacity: 0.8;
}

.add-button {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  backdrop-filter: blur(5px);
  cursor: pointer;
  transition: opacity 0.2s;
}

.add-button.disabled {
  opacity: 0.5;
}

.add-icon {
  font-size: 16px;
  font-weight: bold;
}

.add-text {
  font-size: 14px;
}

.profile-list {
  padding: 12px 16px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 0;
  gap: 12px;
}

.loading-spinner {
  width: 30px;
  height: 30px;
  border: 2px solid #e0e0e0;
  border-top: 2px solid #854C65;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  font-size: 14px;
  color: #666;
}

.profile-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.profile-item.selected .profile-card {
  border: 1.5px solid #854C65;
  box-shadow: 0 3px 12px rgba(133, 76, 101, 0.25);
  background: linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%);
  transform: translateY(-1px);
}

.profile-card {
  background: white;
  border-radius: 12px;
  padding: 12px 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

.profile-card:active {
  transform: scale(0.99);
}

.profile-info {
  flex: 1;
  cursor: pointer;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.profile-name {
  font-size: 16px;
  font-weight: bold;
  color: #333;
}

.gender-badge {
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 11px;
}

.gender-male {
  background: #e3f2fd;
  color: #1976d2;
}

.gender-female {
  background: #fce4ec;
  color: #c2185b;
}

.gender-text {
  font-size: 11px;
}

.profile-actions {
  display: flex;
  flex-direction: row;
  gap: 6px;
  margin-left: 8px;
}

.action-button {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s;
}

.action-button:active {
  transform: scale(0.9);
}

.edit-button {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  border: 1px solid #1976d2;
}

.delete-button {
  background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
  border: 1px solid #d32f2f;
}

.action-icon {
  font-size: 14px;
}

.empty-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.empty-content {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.empty-icon {
  font-size: 60px;
  opacity: 0.6;
  margin-bottom: 8px;
}

.empty-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.empty-desc {
  font-size: 14px;
  color: #666;
  margin-bottom: 16px;
}

.empty-button {
  background: linear-gradient(135deg, #854C65 0%, #A06B7F 100%);
  color: white;
  padding: 12px 24px;
  border-radius: 16px;
  cursor: pointer;
  transition: transform 0.2s;
}

.empty-button:active {
  transform: scale(0.97);
}

.button-text {
  font-size: 15px;
  font-weight: bold;
  color: white;
}
</style>
