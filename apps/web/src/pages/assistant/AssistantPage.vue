<template>
  <div class="assistant-container">

    <!-- 升级提示（无权限时显示） -->
    <div v-if="showUpgradeTip" class="upgrade-tip">
      <div class="back-btn" @click="router.back()">‹</div>
      <div class="upgrade-icon">🔮</div>
      <span class="upgrade-title">高级功能</span>
      <span class="upgrade-desc">助学童子是高级功能，仅限学员、高级用户及管理员使用</span>
      <button class="upgrade-btn" @click="router.push('/register')">前往升级</button>
    </div>

    <template v-else>
      <!-- 消息列表 -->
      <div class="message-list" ref="messageListRef">
        <!-- 返回按钮（Web端，浮于顶部左侧） -->
        <div class="back-btn" @click="router.back()">‹</div>

        <!-- 欢迎消息（无对话时显示） -->
        <div v-if="messages.length === 0" class="welcome-message">
          <div class="welcome-avatar">
            <div class="avatar-inner">
              <span class="avatar-icon">🧒</span>
              <span class="avatar-badge">童子</span>
            </div>
          </div>
          <span class="welcome-title">你好，我是助学童子</span>
          <span class="welcome-desc">我现在可以帮助你学习情感咨询的抽卡解答逻辑，其他功能快马加鞭开发中。</span>

          <div class="quick-suggestions">
            <div class="suggestion-chip" @click="sendQuick('抽牌')">抽牌</div>
            <div class="suggestion-chip" @click="sendQuick('咨询个人情感问题')">个人情感</div>
            <div class="suggestion-chip" @click="sendQuick('咨询双人情感解读')">双人情感</div>
          </div>
        </div>

        <!-- 消息列表 -->
        <div
          v-for="(msg, idx) in messages"
          :key="idx"
          class="chat-message"
          :class="msg.role === 'user' ? 'user-message' : 'assistant-message'"
        >
          <div v-if="msg.role === 'assistant'" class="msg-avatar">
            <span class="msg-avatar-icon">🧒</span>
          </div>
          <div class="bubble-wrap">
            <div
              v-if="msg.role === 'assistant'"
              class="bubble"
              v-html="renderMarkdown(msg.content)"
            />
            <div v-else class="bubble">{{ msg.content }}</div>
          </div>
          <div v-if="msg.role === 'user'" class="msg-avatar user-avatar">
            <span class="msg-avatar-icon">👤</span>
          </div>
        </div>

        <!-- 打字中指示器 -->
        <div v-if="isReplying" class="chat-message assistant-message">
          <div class="msg-avatar">
            <span class="msg-avatar-icon">🧒</span>
          </div>
          <div class="bubble-wrap">
            <div class="bubble typing-bubble">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>

        <div class="list-bottom"></div>
      </div>

      <!-- 输入区域 -->
      <div class="input-area">
        <div v-if="messages.length > 0" class="new-chat-btn" @click="confirmNewChat">
          <span class="btn-icon">✨</span>
        </div>
        <div class="input-wrapper">
          <textarea
            v-model="inputText"
            class="chat-input"
            placeholder="输入你想问的问题..."
            :disabled="isReplying"
            rows="1"
            @keydown.enter.exact.prevent="sendMessage"
          />
          <button
            class="send-btn"
            :class="{ active: inputText.trim() }"
            :disabled="!inputText.trim() || isReplying"
            @click="sendMessage"
          >发送</button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showDialog } from 'vant'
import { useAuthStore } from '@/stores/auth.store'
import { useAppToast, extractApiError } from '@/composables/useToast'
import * as assistantApi from '@/api/assistant.api'
import type { AssistantMessage } from '@/types'

const STORAGE_KEY = 'assistant_messages'
const CONV_KEY = 'assistant_conv_id'

const router = useRouter()
const authStore = useAuthStore()
const { fail } = useAppToast()

const inputText = ref('')
const isReplying = ref(false)
const conversationId = ref<string | undefined>(undefined)
const messageListRef = ref<HTMLElement | null>(null)
const messages = ref<AssistantMessage[]>([])

const showUpgradeTip = computed(() => {
  const type = authStore.user?.userType ?? 'guest'
  return type === 'guest' || type === 'normal'
})

// ─── Markdown renderer ────────────────────────────────────────────────────────
function renderMarkdown(text: string): string {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    .replace(/^##\s+(.+)$/gm, '<h4>$1</h4>')
    .replace(/^#\s+(.+)$/gm, '<h3>$1</h3>')
    .replace(/\n/g, '<br>')
}

// ─── Scroll ───────────────────────────────────────────────────────────────────
function scrollToBottom() {
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight
    }
  })
}

// ─── Session persistence ──────────────────────────────────────────────────────
function saveSession() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.value))
    if (conversationId.value) localStorage.setItem(CONV_KEY, conversationId.value)
  } catch { /* ignore */ }
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
  } catch { /* ignore */ }
}

// ─── Actions ──────────────────────────────────────────────────────────────────
async function confirmNewChat() {
  try {
    await showDialog({
      title: '开启新会话',
      message: '将清除本次对话记录，确认开始新会话？',
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      showCancelButton: true,
    })
    clearSession()
  } catch { /* cancelled */ }
}

function sendQuick(text: string) {
  inputText.value = text
  sendMessage()
}

async function sendMessage() {
  const content = inputText.value.trim()
  if (!content || isReplying.value) return

  messages.value = [
    ...messages.value,
    { id: Date.now().toString(), role: 'user', content, timestamp: new Date().toISOString() },
  ]
  inputText.value = ''
  scrollToBottom()

  isReplying.value = true
  try {
    const apiMessages = messages.value.map((m) => ({ role: m.role, content: m.content }))
    const res = await assistantApi.chat(apiMessages, conversationId.value, undefined)
    const data = res.data?.data
    if (data) {
      conversationId.value = data.conversationId
      messages.value = [
        ...messages.value,
        { id: Date.now().toString(), role: 'assistant', content: data.reply, timestamp: new Date().toISOString() },
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
  loadSession()
  scrollToBottom()
})
</script>

<style scoped>
/* ─── 设计变量 ───────────────────────────────────────────────────────────────── */
/* primary: #854C65  secondary: #D4A574  accent: #E8C4A0  bg-warm: #FDF8F5 */

.assistant-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: linear-gradient(180deg, #fdf8f5 0%, #fbf7f4 100%);
  position: relative;
  overflow: hidden;
}

.assistant-container::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 200px;
  background: linear-gradient(180deg, rgba(133, 76, 101, 0.08) 0%, transparent 100%);
  pointer-events: none;
  z-index: 0;
}

/* ─── 返回按钮 ─────────────────────────────────────────────────────────────── */
.back-btn {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 100;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: #854C65;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 50%;
  cursor: pointer;
  backdrop-filter: blur(8px);
  line-height: 1;
  padding-bottom: 2px;
  box-shadow: 0 1px 6px rgba(133, 76, 101, 0.15);
}

.back-btn:active {
  opacity: 0.7;
  transform: scale(0.95);
}

/* ─── 升级提示 ─────────────────────────────────────────────────────────────── */
.upgrade-tip {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  position: relative;
}

.upgrade-icon {
  width: 90px;
  height: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 50px;
  margin-bottom: 20px;
  background: linear-gradient(145deg, #f5e6d3 0%, #e8c4a0 100%);
  border-radius: 50%;
  box-shadow: 0 10px 30px rgba(133, 76, 101, 0.15), 0 4px 12px rgba(212, 165, 116, 0.2);
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

.upgrade-title {
  display: block;
  font-size: 20px;
  font-weight: 600;
  color: #3d3040;
  margin-bottom: 10px;
  letter-spacing: 1px;
}

.upgrade-desc {
  display: block;
  font-size: 14px;
  color: #6b5b62;
  text-align: center;
  margin-bottom: 28px;
  line-height: 1.8;
  max-width: 280px;
}

.upgrade-btn {
  width: 160px;
  height: 44px;
  background: linear-gradient(135deg, #854C65 0%, #A67D94 50%, #D4A574 100%);
  color: #fff;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 2px;
  border-radius: 22px;
  border: none;
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(133, 76, 101, 0.25);
  transition: transform 0.2s, opacity 0.2s;
}

.upgrade-btn:active {
  transform: scale(0.96);
  opacity: 0.9;
}

/* ─── 消息列表 ─────────────────────────────────────────────────────────────── */
.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 56px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
  z-index: 1;
}

/* ─── 欢迎消息 ─────────────────────────────────────────────────────────────── */
.welcome-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30px 24px 40px;
  text-align: center;
  position: relative;
}

.welcome-message::before {
  content: '';
  position: absolute;
  top: 10px;
  width: 150px;
  height: 150px;
  background: radial-gradient(circle, rgba(212, 165, 116, 0.15) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}

.welcome-avatar {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #854C65 0%, #A67D94 60%, #D4A574 100%);
  border-radius: 50%;
  margin-bottom: 16px;
  position: relative;
  box-shadow: 0 8px 24px rgba(133, 76, 101, 0.2), 0 3px 8px rgba(133, 76, 101, 0.1);
}

.welcome-avatar::before {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  background: linear-gradient(145deg, rgba(212, 165, 116, 0.3) 0%, transparent 50%);
  animation: pulse-ring 2s ease-in-out infinite;
}

@keyframes pulse-ring {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.05); opacity: 0.3; }
}

.avatar-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.avatar-icon {
  font-size: 30px;
  line-height: 1;
}

.avatar-badge {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: 1px;
}

.welcome-title {
  display: block;
  font-size: 21px;
  font-weight: 600;
  color: #3d3040;
  margin-bottom: 8px;
  letter-spacing: 1px;
}

.welcome-desc {
  display: block;
  font-size: 14px;
  color: #6b5b62;
  line-height: 1.8;
  max-width: 260px;
}

.quick-suggestions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 20px;
}

.suggestion-chip {
  padding: 8px 14px;
  background: linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(253,248,245,0.9) 100%);
  border-radius: 16px;
  font-size: 13px;
  color: #6b5b62;
  border: 1px solid rgba(133, 76, 101, 0.1);
  box-shadow: 0 2px 6px rgba(133, 76, 101, 0.06), inset 0 1px 2px rgba(255,255,255,0.8);
  cursor: pointer;
  transition: all 0.2s ease;
}

.suggestion-chip:active {
  transform: scale(0.96);
  background: linear-gradient(145deg, rgba(133,76,101,0.08) 0%, rgba(133,76,101,0.04) 100%);
}

/* ─── 消息气泡 ─────────────────────────────────────────────────────────────── */
.chat-message {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.user-message {
  flex-direction: row-reverse;
}

.msg-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f5ede8, #eddee0);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.user-avatar {
  background: linear-gradient(135deg, rgba(133, 76, 101, 0.15), rgba(166, 125, 148, 0.1));
}

.msg-avatar-icon {
  font-size: 18px;
  line-height: 1;
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
  border: 1px solid rgba(133, 76, 101, 0.1);
  border-top-left-radius: 4px;
  color: #3d3040;
  box-shadow: 0 1px 4px rgba(133, 76, 101, 0.06);
}

.assistant-message .bubble :deep(strong) { font-weight: 700; }
.assistant-message .bubble :deep(em) { font-style: italic; }
.assistant-message .bubble :deep(h3) { font-size: 15px; font-weight: 700; margin: 6px 0 4px; }
.assistant-message .bubble :deep(h4) { font-size: 14px; font-weight: 600; margin: 6px 0 4px; }
.assistant-message .bubble :deep(ul) { margin: 4px 0; padding-left: 16px; list-style: disc; }
.assistant-message .bubble :deep(li) { margin: 2px 0; }

.user-message .bubble {
  background: linear-gradient(135deg, #854C65 0%, #A06B7F 100%);
  color: white;
  border-top-right-radius: 4px;
}

/* ─── 打字指示器 ───────────────────────────────────────────────────────────── */
.typing-bubble {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 14px;
}

.typing-bubble span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #bbb;
  animation: blink 1.4s infinite both;
}

.typing-bubble span:nth-child(2) { animation-delay: 0.2s; }
.typing-bubble span:nth-child(3) { animation-delay: 0.4s; }

@keyframes blink {
  0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1); }
}

.list-bottom {
  height: 16px;
  flex-shrink: 0;
}

/* ─── 输入区域 ─────────────────────────────────────────────────────────────── */
.input-area {
  display: flex;
  align-items: flex-end;
  padding: 6px 12px;
  padding-bottom: calc(6px + env(safe-area-inset-bottom));
  background: linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(253,248,245,0.98) 100%);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  position: relative;
  flex-shrink: 0;
  z-index: 10;
}

.input-area::before {
  content: '';
  position: absolute;
  top: 0;
  left: 20px;
  right: 20px;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, rgba(133, 76, 101, 0.1) 50%, transparent 100%);
}

.new-chat-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(145deg, rgba(212,165,116,0.15) 0%, rgba(133,76,101,0.08) 100%);
  margin-right: 6px;
  flex-shrink: 0;
  cursor: pointer;
  transition: all 0.2s;
}

.new-chat-btn:active {
  transform: scale(0.92);
  background: linear-gradient(145deg, rgba(212,165,116,0.25) 0%, rgba(133,76,101,0.15) 100%);
}

.btn-icon {
  font-size: 16px;
}

.input-wrapper {
  flex: 1;
  display: flex;
  align-items: flex-end;
  gap: 8px;
  background: rgba(245, 240, 236, 0.8);
  border-radius: 20px;
  padding: 6px 6px 6px 14px;
  border: 1px solid rgba(133, 76, 101, 0.08);
}

.chat-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 15px;
  color: #3d3040;
  resize: none;
  max-height: 100px;
  line-height: 1.5;
  padding: 0;
  font-family: inherit;
}

.chat-input::placeholder {
  color: #9b8b92;
  font-size: 14px;
}

.send-btn {
  flex-shrink: 0;
  height: 32px;
  padding: 0 14px;
  border-radius: 16px;
  border: none;
  background: rgba(133, 76, 101, 0.15);
  color: #9b8b92;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.send-btn.active {
  background: linear-gradient(135deg, #854C65 0%, #A06B7F 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(133, 76, 101, 0.25);
}

.send-btn:disabled {
  cursor: default;
}
</style>
