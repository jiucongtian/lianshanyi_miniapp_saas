<!--
  DEPRECATED: 此页面已被独立的 apps/admin 管理后台取代（http://localhost:5174）。
  入口已下线，此文件保留以避免路由报错，后续版本清理。
-->
<template>
  <div class="admin-page">
    <van-nav-bar title="管理后台" left-arrow @click-left="router.back()" />

    <van-tabs v-model:active="activeTab" sticky offset-top="46px">
      <!-- User Management Tab -->
      <van-tab title="用户管理" name="users">
        <div class="tab-content">
          <van-search
            v-model="userSearch"
            placeholder="搜索手机号或用户名"
            @search="loadUsers(true)"
            shape="round"
          />

          <van-list
            v-model:loading="userLoading"
            :finished="userFinished"
            finished-text="没有更多用户了"
            @load="loadUsers(false)"
          >
            <van-cell
              v-for="u in users"
              :key="u.id"
              :title="u.username || u.phone || '匿名用户'"
              :label="`注册于 ${formatDate(u.createdAt)}`"
            >
              <template #right-icon>
                <div class="user-actions">
                  <van-tag :type="typeTagType(u.userType)" size="medium">
                    {{ typeLabel(u.userType) }}
                  </van-tag>
                  <van-button
                    size="mini"
                    plain
                    type="primary"
                    style="margin-left: 8px"
                    @click="openTypeSheet(u)"
                  >
                    修改
                  </van-button>
                </div>
              </template>
            </van-cell>
          </van-list>
        </div>
      </van-tab>

      <!-- Feedback Management Tab -->
      <van-tab title="反馈管理" name="feedbacks">
        <div class="tab-content">
          <van-tabs v-model:active="feedbackStatus" @change="loadFeedbacks(true)" size="small">
            <van-tab title="待处理" name="pending" />
            <van-tab title="已处理" name="reviewed" />
            <van-tab title="全部" name="" />
          </van-tabs>

          <van-list
            v-model:loading="feedbackLoading"
            :finished="feedbackFinished"
            finished-text="没有更多反馈了"
            @load="loadFeedbacks(false)"
          >
            <van-cell
              v-for="f in feedbacks"
              :key="f.id"
              :label="`${formatDate(f.createdAt)} · ${f.contact || '未留联系方式'}`"
              is-link
              @click="openFeedback(f)"
            >
              <template #title>
                <div class="feedback-title">
                  <van-tag :type="statusTagType(f.status)" size="mini" style="margin-right: 6px">
                    {{ statusLabel(f.status) }}
                  </van-tag>
                  {{ f.content.slice(0, 30) }}{{ f.content.length > 30 ? '…' : '' }}
                </div>
              </template>
            </van-cell>
          </van-list>
        </div>
      </van-tab>
    </van-tabs>

    <!-- User type action sheet -->
    <van-action-sheet
      v-model:show="showTypeSheet"
      :actions="typeActions"
      cancel-text="取消"
      @select="onTypeSelect"
    />

    <!-- Feedback detail dialog -->
    <van-dialog
      v-model:show="showFeedbackDialog"
      :title="'反馈详情'"
      show-cancel-button
      confirm-button-text="回复"
      @confirm="submitReply"
    >
      <div class="feedback-detail" v-if="selectedFeedback">
        <p class="feedback-content">{{ selectedFeedback.content }}</p>
        <van-field
          v-model="replyText"
          type="textarea"
          rows="3"
          placeholder="请输入回复内容..."
          :border="false"
        />
      </div>
    </van-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppToast, extractApiError } from '@/composables/useToast'
import * as userApi from '@/api/user.api'
import * as feedbackApi from '@/api/feedback.api'
import type { User, Feedback } from '@/types'

const router = useRouter()
const { success, fail } = useAppToast()

const activeTab = ref('users')

// ─── User management ────────────────────────────────────────────────────────
const users = ref<User[]>([])
const userSearch = ref('')
const userLoading = ref(false)
const userFinished = ref(false)
const userPage = ref(1)
const selectedUser = ref<User | null>(null)
const showTypeSheet = ref(false)

const typeActions = [
  { name: '普通用户', subname: 'normal', value: 'normal' },
  { name: '学员', subname: 'student', value: 'student' },
  { name: '高级会员', subname: 'premium', value: 'premium' },
]

function typeLabel(type: string): string {
  const map: Record<string, string> = { guest: '游客', normal: '普通', student: '学员', premium: '高级' }
  return map[type] ?? type
}

function typeTagType(type: string): 'default' | 'primary' | 'success' | 'warning' {
  const map: Record<string, 'default' | 'primary' | 'success' | 'warning'> = {
    guest: 'default', normal: 'primary', student: 'success', premium: 'warning',
  }
  return map[type] ?? 'primary'
}

async function loadUsers(reset = false) {
  if (reset) { users.value = []; userPage.value = 1; userFinished.value = false }
  if (userFinished.value) return
  userLoading.value = true
  try {
    const res = await userApi.listUsers(userPage.value, 20, userSearch.value || undefined)
    const data = res.data?.data?.users ?? []
    const total = res.data?.meta?.total ?? 0
    users.value.push(...data)
    userPage.value++
    if (users.value.length >= total) userFinished.value = true
  } catch (err) {
    fail(extractApiError(err))
  } finally {
    userLoading.value = false
  }
}

function openTypeSheet(user: User) {
  selectedUser.value = user
  showTypeSheet.value = true
}

async function onTypeSelect(action: { value: string }) {
  if (!selectedUser.value) return
  try {
    await userApi.updateUserType(selectedUser.value.id, action.value)
    const idx = users.value.findIndex((u) => u.id === selectedUser.value!.id)
    if (idx !== -1) users.value[idx] = { ...users.value[idx], userType: action.value }
    success('用户类型已更新')
  } catch (err) {
    fail(extractApiError(err))
  }
}

// ─── Feedback management ─────────────────────────────────────────────────────
const feedbacks = ref<Feedback[]>([])
const feedbackStatus = ref('pending')
const feedbackLoading = ref(false)
const feedbackFinished = ref(false)
const feedbackPage = ref(1)
const selectedFeedback = ref<Feedback | null>(null)
const showFeedbackDialog = ref(false)
const replyText = ref('')

function statusLabel(status: string): string {
  const map: Record<string, string> = { pending: '待处理', reviewed: '已回复', resolved: '已解决' }
  return map[status] ?? status
}

function statusTagType(status: string): 'warning' | 'success' | 'default' {
  const map: Record<string, 'warning' | 'success' | 'default'> = {
    pending: 'warning', reviewed: 'success', resolved: 'default',
  }
  return map[status] ?? 'default'
}

async function loadFeedbacks(reset = false) {
  if (reset) { feedbacks.value = []; feedbackPage.value = 1; feedbackFinished.value = false }
  if (feedbackFinished.value) return
  feedbackLoading.value = true
  try {
    const res = await feedbackApi.listFeedbacks(feedbackPage.value, 20, feedbackStatus.value || undefined)
    const data = res.data?.data?.feedbacks ?? []
    const total = res.data?.meta?.total ?? 0
    feedbacks.value.push(...data)
    feedbackPage.value++
    if (feedbacks.value.length >= total) feedbackFinished.value = true
  } catch (err) {
    fail(extractApiError(err))
  } finally {
    feedbackLoading.value = false
  }
}

function openFeedback(f: Feedback) {
  selectedFeedback.value = f
  replyText.value = ''
  showFeedbackDialog.value = true
}

async function submitReply() {
  if (!selectedFeedback.value || !replyText.value.trim()) {
    fail('请输入回复内容')
    return
  }
  try {
    await feedbackApi.replyFeedback(selectedFeedback.value.id, replyText.value.trim())
    const idx = feedbacks.value.findIndex((f) => f.id === selectedFeedback.value!.id)
    if (idx !== -1) feedbacks.value[idx] = { ...feedbacks.value[idx], status: 'replied', reply: replyText.value }
    success('回复已发送')
  } catch (err) {
    fail(extractApiError(err))
  }
}

function formatDate(dateStr: string): string {
  return dateStr?.slice(0, 10) ?? ''
}

onMounted(() => {
  loadUsers(true)
  loadFeedbacks(true)
})
</script>

<style scoped>
.admin-page { background: var(--color-bg); min-height: 100vh; }
.tab-content { padding-bottom: 40px; }
.user-actions { display: flex; align-items: center; }
.feedback-title { display: flex; align-items: center; font-size: 14px; }
.feedback-detail { padding: 16px; }
.feedback-content {
  font-size: 14px;
  line-height: 1.6;
  color: var(--color-text);
  margin-bottom: 12px;
  white-space: pre-wrap;
}
</style>
