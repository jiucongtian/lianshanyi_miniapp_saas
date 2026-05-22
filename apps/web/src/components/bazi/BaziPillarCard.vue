<script setup lang="ts">
import { computed } from 'vue'
import type { WuXing } from '@/types'

const props = defineProps<{
  label: '年' | '月' | '日' | '时'
  stem: string
  branch: string
  stemWuXing: WuXing
  branchWuXing: WuXing
  nayin?: string
}>()

const wuXingColorMap: Record<WuXing, string> = {
  木: '#2E7D32',
  火: '#C62828',
  土: '#F9A825',
  金: '#616161',
  水: '#1565C0',
}

const wuXingBgMap: Record<WuXing, string> = {
  木: '#E8F5E9',
  火: '#FFEBEE',
  土: '#FFFDE7',
  金: '#F5F5F5',
  水: '#E3F2FD',
}

const stemStyle = computed(() => ({
  color: wuXingColorMap[props.stemWuXing],
  backgroundColor: wuXingBgMap[props.stemWuXing],
}))

const branchStyle = computed(() => ({
  color: wuXingColorMap[props.branchWuXing],
  backgroundColor: wuXingBgMap[props.branchWuXing],
}))
</script>

<template>
  <div class="pillar-card">
    <div class="pillar-card__label">{{ label }}</div>
    <div class="pillar-card__stem" :style="stemStyle">
      <span class="pillar-card__char">{{ stem }}</span>
      <span class="pillar-card__wuxing">{{ stemWuXing }}</span>
    </div>
    <div class="pillar-card__branch" :style="branchStyle">
      <span class="pillar-card__char">{{ branch }}</span>
      <span class="pillar-card__wuxing">{{ branchWuXing }}</span>
    </div>
    <div v-if="nayin" class="pillar-card__nayin">{{ nayin }}</div>
  </div>
</template>

<style scoped>
.pillar-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 68px;
}

.pillar-card__label {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-weight: 500;
  letter-spacing: 0.5px;
}

.pillar-card__stem,
.pillar-card__branch {
  width: 60px;
  height: 60px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.pillar-card__char {
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
}

.pillar-card__wuxing {
  font-size: 10px;
  opacity: 0.7;
}

.pillar-card__nayin {
  font-size: 10px;
  color: var(--color-text-secondary);
  text-align: center;
  max-width: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
