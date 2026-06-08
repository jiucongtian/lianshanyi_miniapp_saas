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
          <div class="avatar">🧒</div>
          <div class="bubble-wrap">
            <div class="bubble">你好，我是助学童子，专注于八字命理解答～</div>
          </div>
        </div>

        <div
          v-for="(msg, idx) in messages"
          :key="idx"
          class="message"
          :class="msg.role === 'user' ? 'user-message' : 'assistant-message'"
        >
          <div class="avatar" v-if="msg.role === 'assistant'">🧒</div>
          <div class="bubble-wrap">
            <!-- assistant messages render markdown; user messages are plain text -->
            <div
              class="bubble"
              v-if="msg.role === 'assistant'"
              v-html="renderMarkdown(msg.content)"
            />
            <div class="bubble" v-else>{{ msg.content }}</div>
            <div class="msg-time">{{ formatTime(msg.timestamp) }}</div>
          </div>
          <div class="avatar user-avatar" v-if="msg.role === 'user'">👤</div>
        </div>

        <!-- Loading indicator -->
        <div class="message assistant-message" v-if="isReplying">
          <div class="avatar">🧒</div>
          <div class="bubble-wrap">
            <div class="bubble typing">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick suggestion chips (only shown when no messages yet) -->
      <div class="quick-chips" v-if="messages.length === 0 && !isReplying">
        <button
          v-for="chip in quickSuggestions"
          :key="chip"
          class="chip"
          @click="sendQuick(chip)"
        >{{ chip }}</button>
      </div>
    </div>

    <!-- Input bar -->
    <div class="input-bar">
      <button class="new-chat-btn" v-if="messages.length > 0" @click="confirmNewChat" title="开启新会话">✨</button>
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
import { showDialog } from 'vant'
import { useProfileStore } from '@/stores/profile.store'
import { useAppToast, extractApiError } from '@/composables/useToast'
import * as assistantApi from '@/api/assistant.api'
import type { AssistantMessage } from '@/types'

const STORAGE_KEY = 'assistant_messages'
const CONV_KEY = 'assistant_conv_id'

const router = useRouter()
const profileStore = useProfileStore()
const { fail } = useAppToast()

const inputText = ref('')
const isReplying = ref(false)
const conversationId = ref<string | undefined>(undefined)
const selectedProfileId = ref<string>('')
const messageListRef = ref<HTMLElement | null>(null)

const messages = ref<AssistantMessage[]>([])

const quickSuggestions = ['抽牌占卜', '个人情感', '双人情感']

const profileOptions = computed(() => [
  { text: '不选择档案', value: '' },
  ...profileStore.profiles.map((p) => ({ text: p.name, value: p.id })),
])

// ─── Markdown renderer (lightweight, no external deps) ──────────────────────
function renderMarkdown(text: string): string {
  if (!text) return ''
  let html = text
    // Escape HTML entities first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Bold **text**
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic *text*
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Unordered list items (lines starting with - or •)
    .replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>')
    // Ordered list items
    .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
    // Wrap consecutive <li> blocks in <ul>
    .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
    // Headers ## or #
    .replace(/^##\s+(.+)$/gm, '<h4>$1</h4>')
    .replace(/^#\s+(.+)$/gm, '<h3>$1</h3>')
    // Newlines → <br>
    .replace(/\n/g, '<br>')
  return html
}

// ─── Time formatter ──────────────────────────────────────────────────────────
function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    const h = String(d.getHours()).padStart(2, '0')
    const m = String(d.getMinutes()).padStart(2, '0')
    return `${h}:${m}`
  } catch {
    return ''
  }
}

// ─── Scroll helpers ──────────────────────────────────────────────────────────
function scrollToBottom() {
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight
    }
  })
}

// ─── LocalStorage persistence ─────────────────────────────────────────────
function saveSession() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.value))
    if (conversationId.value) {
      localStorage.setItem(CONV_KEY, conversationId.value)
    }
  } catch {
    // storage full or unavailable — ignore
  }
}

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) messages.value = JSON.parse(raw) as AssistantMessage[]
    const convId = localStorage.getItem(CONV_KEY)
    if (convId) conversationId.value = convId
  } catch {
    messages.value = []
  }
}

function clearSession() {
  messages.value = []
  conversationId.value = undefined
  try {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(CONV_KEY)
  } catch {
    // ignore
  }
}

// ─── New chat ──────────────────────────────────────────────────────────────
async function confirmNewChat() {
  await showDialog({
    title: '开启新会话',
    message: '将清除本次对话记录，确认开始新会话？',
    confirmButtonText: '确认',
    cancelButtonText: '取消',
  })
  clearSession()
}

// ─── Quick suggestion ─────────────────────────────────────────────────────
function sendQuick(text: string) {
  inputText.value = text
  sendMessage()
}

// ─── Send message ──────────────────────────────────────────────────────────
async function sendMessage() {
  const content = inputText.value.trim()
  if (!content || isReplying.value) return

  const userMsg: AssistantMessage = {
    id: Date.now().toString(),
    role: 'user',
    content,
    timestamp: new Date().toISOString(),
  }
  messages.value = [...messages.value, userMsg]
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
      messages.value = [
        ...messages.value,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: data.reply,
          timestamp: new Date().toISOString(),
        },
      ]
      saveSession()
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
  loadSession()
  scrollToBottom()
})
</script>

<style scoped>
.assistant-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: linear-gradient(180deg, #fdf8f5 0%, #fbf7f4 100%);
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
  background: linear-gradient(135deg, #f5ede8, #eddee0);
  flex-shrink: 0;
}

.bubble-wrap {
  display: flex;
  flex-direction: column;
  max-width: 70%;
}

.user-message .bubble-wrap {
  align-items: flex-end;
}

.bubble {
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

/* Markdown styles inside assistant bubble */
.assistant-message .bubble :deep(strong) { font-weight: 700; }
.assistant-message .bubble :deep(em) { font-style: italic; }
.assistant-message .bubble :deep(h3) { font-size: 15px; font-weight: 700; margin: 6px 0 4px; }
.assistant-message .bubble :deep(h4) { font-size: 14px; font-weight: 600; margin: 6px 0 4px; }
.assistant-message .bubble :deep(ul) {
  margin: 4px 0;
  padding-left: 16px;
  list-style: disc;
}
.assistant-message .bubble :deep(li) { margin: 2px 0; }

.user-message .bubble {
  background: var(--color-primary);
  color: white;
  border-top-right-radius: 4px;
}

.msg-time {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.35);
  margin-top: 3px;
  padding: 0 2px;
}

.user-message .msg-time {
  text-align: right;
  color: rgba(0, 0, 0, 0.3);
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

/* ─── Quick suggestion chips ───────────────── */
.quick-chips {
  display: flex;
  gap: 10px;
  padding: 0 16px 16px;
  flex-wrap: wrap;
  justify-content: center;
}

.chip {
  padding: 8px 18px;
  background: white;
  border: 1.5px solid var(--color-primary);
  border-radius: 20px;
  color: var(--color-primary);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.chip:active {
  background: var(--color-primary);
  color: white;
}

/* ─── Input bar ─────────────────────────────── */
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

.new-chat-btn {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border: none;
  background: #f5ede8;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.new-chat-btn:active {
  background: #eddee0;
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
