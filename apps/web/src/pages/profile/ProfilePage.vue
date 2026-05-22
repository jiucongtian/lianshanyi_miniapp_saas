<template>
  <div class="profile-page">
    <van-nav-bar
      :title="profile?.name || '档案详情'"
      left-arrow
      @click-left="router.back()"
      :right-text="profile ? '编辑' : ''"
      @click-right="goEdit"
    />

    <div v-if="loading" class="loading-area">
      <van-skeleton title :row="6" />
    </div>

    <div v-else-if="profile">
      <!-- Basic info card -->
      <van-cell-group inset title="基本信息" style="margin-top: 16px">
        <van-cell title="姓名" :value="profile.name" />
        <van-cell title="性别" :value="profile.gender === 'male' ? '男' : '女'" />
        <van-cell
          title="出生日期"
          :value="`${profile.isLunar ? '农历 ' : ''}${profile.birthYear}年${profile.birthMonth}月${profile.birthDay}日 ${profile.birthHour}时`"
        />
        <van-cell v-if="profile.notes" title="备注" :value="profile.notes" />
      </van-cell-group>

      <!-- BaZi pillars -->
      <div v-if="profile.baziResult" class="bazi-section">
        <div class="section-title">八字四柱</div>
        <div class="pillars-grid">
          <BaziPillarCard
            label="年柱"
            :stem="profile.baziResult.yearPillar.stem"
            :branch="profile.baziResult.yearPillar.branch"
            :stemWuXing="profile.baziResult.yearPillar.stemWuXing"
            :branchWuXing="profile.baziResult.yearPillar.branchWuXing"
          />
          <BaziPillarCard
            label="月柱"
            :stem="profile.baziResult.monthPillar.stem"
            :branch="profile.baziResult.monthPillar.branch"
            :stemWuXing="profile.baziResult.monthPillar.stemWuXing"
            :branchWuXing="profile.baziResult.monthPillar.branchWuXing"
          />
          <BaziPillarCard
            label="日柱"
            :stem="profile.baziResult.dayPillar.stem"
            :branch="profile.baziResult.dayPillar.branch"
            :stemWuXing="profile.baziResult.dayPillar.stemWuXing"
            :branchWuXing="profile.baziResult.dayPillar.branchWuXing"
          />
          <BaziPillarCard
            label="时柱"
            :stem="profile.baziResult.hourPillar.stem"
            :branch="profile.baziResult.hourPillar.branch"
            :stemWuXing="profile.baziResult.hourPillar.stemWuXing"
            :branchWuXing="profile.baziResult.hourPillar.branchWuXing"
          />
        </div>

        <!-- WuXing summary -->
        <div class="wuxing-row" v-if="profile.baziResult.wuXingSummary">
          <div
            v-for="(count, element) in profile.baziResult.wuXingSummary"
            :key="element"
            class="wuxing-chip"
            :class="`wuxing-${elementClass(String(element))}`"
          >
            {{ element }} × {{ count }}
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="action-area">
        <van-button
          v-if="!profile.isDefault"
          block
          round
          plain
          type="primary"
          :loading="settingDefault"
          @click="setDefault"
        >
          设为默认档案
        </van-button>
        <van-tag v-else type="primary" size="large" style="display:block;text-align:center;margin:0 16px;padding:10px">
          ✓ 当前默认档案
        </van-tag>
        <van-button
          block
          round
          type="danger"
          plain
          style="margin-top: 12px"
          @click="confirmDelete"
        >
          删除档案
        </van-button>
      </div>
    </div>

    <EmptyState v-else description="档案不存在" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showDialog } from 'vant'
import { useProfileStore } from '@/stores/profile.store'
import { useAppToast, extractApiError } from '@/composables/useToast'
import BaziPillarCard from '@/components/bazi/BaziPillarCard.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import type { Profile } from '@/types'

const router = useRouter()
const route = useRoute()
const profileStore = useProfileStore()
const { success, fail } = useAppToast()

const profile = ref<Profile | null>(null)
const loading = ref(true)
const settingDefault = ref(false)

const profileId = route.params.id as string

const ELEMENT_CLASS_MAP: Record<string, string> = {
  '木': 'wood', '火': 'fire', '土': 'earth', '金': 'metal', '水': 'water',
}

function elementClass(el: string): string {
  return ELEMENT_CLASS_MAP[el] ?? 'earth'
}

function goEdit() {
  router.push(`/profiles/${profileId}/edit`)
}

async function setDefault() {
  if (!profile.value) return
  settingDefault.value = true
  try {
    await profileStore.setDefault(profileId)
    profile.value = { ...profile.value, isDefault: true }
    success('已设为默认档案')
  } catch (err) {
    fail(extractApiError(err))
  } finally {
    settingDefault.value = false
  }
}

async function confirmDelete() {
  await showDialog({
    title: '删除确认',
    message: `确定要删除档案「${profile.value?.name}」吗？此操作不可恢复。`,
    confirmButtonText: '删除',
    confirmButtonColor: '#ee0a24',
    cancelButtonText: '取消',
    showCancelButton: true,
  })
  try {
    await profileStore.deleteProfile(profileId)
    success('档案已删除')
    router.back()
  } catch (err) {
    fail(extractApiError(err))
  }
}

onMounted(async () => {
  try {
    await profileStore.fetchProfiles()
    const found = profileStore.profiles.find((p) => p.id === profileId)
    profile.value = found ?? null
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.profile-page { background: var(--color-bg); min-height: 100vh; }
.loading-area { padding: 20px; }
.bazi-section { padding: 16px; }
.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 12px;
  padding-left: 4px;
}
.pillars-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 8px;
}
.wuxing-row {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}
.wuxing-chip {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
}
.wuxing-wood  { background: var(--color-wood-light);  color: var(--color-wood); }
.wuxing-fire  { background: var(--color-fire-light);  color: var(--color-fire); }
.wuxing-earth { background: var(--color-earth-light); color: var(--color-earth); }
.wuxing-metal { background: var(--color-metal-light); color: var(--color-metal); }
.wuxing-water { background: var(--color-water-light); color: var(--color-water); }
.action-area { padding: 24px 16px; }
</style>
