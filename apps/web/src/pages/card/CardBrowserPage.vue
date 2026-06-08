<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']

interface CardInfo {
  number: number
  cardName: string
  imagePath: string
}

const cardNumber = ref('')
const cardInfo = ref<CardInfo | null>(null)
const error = ref('')
const showPreview = ref(false)

function getCardInfo(num: number): CardInfo {
  const stem = STEMS[(num - 1) % 10]!
  const branch = BRANCHES[(num - 1) % 12]!
  return {
    number: num,
    cardName: stem + branch,
    imagePath: `/cards/${String(num).padStart(2, '0')}.png`,
  }
}

function onViewCard() {
  if (!cardNumber.value) {
    error.value = '请输入卡牌编号'
    return
  }
  const num = parseInt(cardNumber.value)
  if (isNaN(num) || num < 1 || num > 60) {
    error.value = '请输入1-60之间的数字'
    return
  }
  error.value = ''
  cardInfo.value = getCardInfo(num)
}

function onClear() {
  cardNumber.value = ''
  cardInfo.value = null
  error.value = ''
  showPreview.value = false
}

function onCardImageTap() {
  if (cardInfo.value) showPreview.value = true
}

function onClosePreview() {
  showPreview.value = false
}

function onInputKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') onViewCard()
}
</script>

<template>
  <div class="card-viewer-page">
    <!-- 导航栏 -->
    <van-nav-bar
      title="卡牌查看器"
      left-arrow
      @click-left="router.back()"
    />

    <div class="card-viewer-container">
      <!-- 页面标题 -->
      <div class="page-header">
        <span class="page-subtitle">输入1-60的数字查看对应卡牌</span>
      </div>

      <!-- 输入区域 -->
      <div class="input-section">
        <div class="input-wrapper">
          <input
            v-model="cardNumber"
            class="card-input"
            type="number"
            placeholder="请输入1-60的数字"
            maxlength="2"
            @keydown="onInputKeydown"
          />
          <div class="input-actions">
            <button v-if="cardNumber" class="action-btn clear-btn" @click="onClear">
              <span class="btn-text">清空</span>
            </button>
            <button class="action-btn view-btn" @click="onViewCard">
              <span class="btn-text">查看</span>
            </button>
          </div>
        </div>

        <!-- 错误提示 -->
        <div v-if="error" class="error-message">
          <span class="error-text">{{ error }}</span>
        </div>
      </div>

      <!-- 卡牌显示区域 -->
      <div v-if="cardInfo" class="card-display-section">
        <div class="card-info">
          <span class="card-info-text card-info-number">卡牌编号：{{ cardInfo.number }}</span>
          <span class="card-info-text">干支：{{ cardInfo.cardName }}</span>
        </div>

        <div class="card-image-wrapper" @click="onCardImageTap">
          <img
            class="card-image"
            :src="cardInfo.imagePath"
            :alt="cardInfo.cardName"
          />
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="!cardInfo" class="empty-state">
        <div class="empty-icon">🃏</div>
        <span class="empty-text">请输入卡牌编号查看</span>
      </div>
    </div>

    <!-- 全屏图片预览 -->
    <div v-if="showPreview" class="preview-overlay" @click="onClosePreview">
      <img
        :src="cardInfo?.imagePath"
        class="preview-image"
        :alt="cardInfo?.cardName"
        @click.stop
      />
    </div>
  </div>
</template>

<style scoped>
.card-viewer-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.card-viewer-page :deep(.van-nav-bar) {
  background: transparent;
}

.card-viewer-container {
  padding: 20px 16px;
  box-sizing: border-box;
}

/* ─── 页面标题 ───────────────────────────── */
.page-header {
  text-align: center;
  margin-bottom: 30px;
}

.page-subtitle {
  display: block;
  font-size: 14px;
  color: #666;
}

/* ─── 输入区域 ───────────────────────────── */
.input-section {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-input {
  width: 100%;
  height: 44px;
  background: #f5f5f5;
  border-radius: 8px;
  padding: 0 12px;
  font-size: 16px;
  color: #333;
  border: none;
  outline: none;
  box-sizing: border-box;
}

.card-input::placeholder {
  color: #bbb;
  font-size: 14px;
}

.input-actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  flex: 1;
  height: 40px;
  border-radius: 8px;
  border: none;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity 0.2s;
}

.action-btn:active {
  opacity: 0.8;
}

.clear-btn {
  background: #f5f5f5;
  color: #666;
}

.view-btn {
  background: linear-gradient(135deg, #854C65 0%, #A06B7F 100%);
  color: #fff;
}

.btn-text {
  font-size: 16px;
}

.error-message {
  margin-top: 12px;
  padding: 8px 12px;
  background: #fff2f0;
  border-radius: 6px;
  border-left: 3px solid #ff4d4f;
}

.error-text {
  font-size: 13px;
  color: #ff4d4f;
}

/* ─── 卡牌显示区域 ───────────────────────── */
.card-display-section {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.card-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.card-info-text {
  font-size: 14px;
  color: #666;
}

.card-info-number {
  font-size: 16px;
  font-weight: bold;
  color: #333;
}

.card-image-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  cursor: pointer;
}

.card-image {
  max-width: 100%;
  max-height: 300px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  object-fit: contain;
}

/* ─── 空状态 ─────────────────────────────── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
}

.empty-icon {
  font-size: 60px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  font-size: 14px;
  color: #999;
}

/* ─── 全屏预览 ───────────────────────────── */
.preview-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.preview-image {
  max-width: 80vw;
  max-height: 85vh;
  object-fit: contain;
  border-radius: 8px;
}
</style>
