<template>
  <div class="assistant-page">
    <van-nav-bar title="助学童子" left-arrow @click-left="router.back()" fixed />

    <div class="chat-container" ref="chatContainerRef">
      <!-- Profile selector -->
      <div class="profile-bar" v-if="profileStore.profiles.length > 0">
        <span class="profile-label">档案：</span>
        <van-dropdown-menu>
          <van-dropdown-item v-model="selectedProfileId" :options="profileOptions" />
        </van-dropdown-menu>
      </div>

      <!-- Message list -->
      <div class="message-list" ref="messageListRef">
        <!-- Welcome message -->
        <div class="message assistant-message" v-if="messages.length === 0">
          <div class="avatar">🤖</div>
          <div class="bubble">您好！我是助学童子，专注于八字命理解答。请问有什么可以帮助您的？</div>
        </div>

        <div
          v-for="(msg, idx) in messages"
          :key="idx"
          class="message"
          :class="msg.role === 'user' ? 'user-message' : 'assistant-message'"
        >
          <div class="avatar" v-if="msg.role === 'assistant'">🤖</div>
          <div class="bubble">{{ msg.content }}</div>
          <div class="avatar user-avatar" v-if="msg.role === 'user'">👤</div>
        </div>

        <!-- Loading indicator -->
        <div class="message assistant-message" v-if="isReplying">
          <div class="avatar">🤖</div>
          <div class="bubble typing">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>
    </div>

    <!-- Input bar -->
    <div class="input-bar">
      <van-field
        v-model="inputText"
        placeholder="请输入问题..."
        :disabled="isReplying"
        @keydown.enter.prevent="sendMessage"
        class="input-field"
        clearable
        autosize
        :rows="1"
        type="textarea"
      />
      <van-button
        type="primary"
        size="small"
        round
        :loading="isReplying"
        :disabled="!inputText.trim()"
        @click="sendMessage"
        class="send-btn"
      >
        发送
      </van-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProfileStore } from '@/stores/profile.store'
import { useAppToast, extractApiError } from '@/composables/useToast'
import * as assistantApi from '@/api/assistant.api'
import type { AssistantMessage } from '@/types'

const router = useRouter()
const profileStore = useProfileStore()
const { fail } = useAppToast()

const inputText = ref('')
const isReplying = ref(false)
const conversationId = ref<string | undefined>(undefined)
const selectedProfileId = ref<string>('')
const messageListRef = ref<HTMLElement | null>(null)

const messages = ref<AssistantMessage[]>([])

const profileOptions = computed(() => [
  { text: '不选择档案', value: '' },
  ...profileStore.profiles.map((p) => ({ text: p.name, value: p.id })),
])

function scrollToBottom() {
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight
    }
  })
}

async function sendMessage() {
  const content = inputText.value.trim()
  if (!content || isReplying.value) return

  // Add user message
  const userMsg: AssistantMessage = {
    id: Date.now().toString(),
    role: 'user',
    content,
    timestamp: new Date().toISOString(),
  }
  messages.value.push(userMsg)
  inputText.value = ''
  scrollToBottom()

  isReplying.value = true
  try {
    const apiMessages = messages.value.map((m) => ({ role: m.role, content: m.content }))
    const res = await assistantApi.chat(
      apiMessages,
      conversationId.value,
      selectedProfileId.value || undefined,
    )
    const data = res.data?.data
    if (data) {
      conversationId.value = data.conversationId
      messages.value.push({
        id: Date.now().toString(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toISOString(),
      })
    }
  } catch (err) {
    fail(extractApiError(err, '助学童子暂时无法回复，请稍后再试'))
  } finally {
    isReplying.value = false
    scrollToBottom()
  }
}

onMounted(() => {
  profileStore.fetchProfiles()
})
</script>

<style scoped>
.assistant-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--color-bg);
}

.chat-container {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding-top: 46px; /* nav-bar height */
}

.profile-bar {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background: white;
  border-bottom: 1px solid #f0e8e0;
}

.profile-label {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-right: 8px;
  white-space: nowrap;
}

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 80px;
}

.message {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.user-message {
  flex-direction: row-reverse;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  background: #f0e8e0;
  flex-shrink: 0;
}

.bubble {
  max-width: 70%;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
}

.assistant-message .bubble {
  background: white;
  border: 1px solid #f0e8e0;
  border-top-left-radius: 4px;
}

.user-message .bubble {
  background: var(--color-primary);
  color: white;
  border-top-right-radius: 4px;
}

.typing {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 14px;
}

.typing span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #bbb;
  animation: blink 1.4s infinite both;
}

.typing span:nth-child(2) { animation-delay: 0.2s; }
.typing span:nth-child(3) { animation-delay: 0.4s; }

@keyframes blink {
  0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1); }
}

.input-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-width: 480px;
  margin: 0 auto;
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 8px 12px;
  padding-bottom: calc(8px + env(safe-area-inset-bottom));
  background: white;
  border-top: 1px solid #f0e8e0;
}

.input-field {
  flex: 1;
  background: #f8f4f0;
  border-radius: 20px;
}

.send-btn {
  flex-shrink: 0;
  min-width: 64px;
}
</style>
