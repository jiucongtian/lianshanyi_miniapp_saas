<template>
  <div class="add-profile-page">
    <van-nav-bar
      :title="isEdit ? '编辑档案' : '新增档案'"
      left-arrow
      @click-left="router.back()"
    />

    <van-form @submit="onSubmit" class="profile-form">
      <van-cell-group inset title="基本信息">
        <van-field
          v-model="form.name"
          name="name"
          label="姓名"
          placeholder="请输入姓名"
          maxlength="20"
          :rules="[{ required: true, message: '请输入姓名' }]"
        />

        <van-field name="gender" label="性别">
          <template #input>
            <van-radio-group v-model="form.gender" direction="horizontal">
              <van-radio name="male">男</van-radio>
              <van-radio name="female" style="margin-left: 16px">女</van-radio>
            </van-radio-group>
          </template>
        </van-field>

        <van-field name="isLunar" label="农历">
          <template #input>
            <van-switch v-model="form.isLunarDate" size="20px" />
          </template>
        </van-field>
      </van-cell-group>

      <van-cell-group inset title="出生时间">
        <!-- Birth date selector -->
        <van-field
          label="出生日期"
          :model-value="birthDateDisplay"
          readonly
          is-link
          placeholder="请选择出生日期"
          @click="showDatePicker = true"
          :rules="[{ required: true, message: '请选择出生日期' }]"
        />

        <!-- Birth hour picker -->
        <van-field
          label="出生时辰"
          :model-value="hourDisplay"
          readonly
          is-link
          placeholder="请选择出生时辰"
          @click="showHourPicker = true"
        />

        <van-field
          v-model="form.notes"
          name="notes"
          label="备注"
          placeholder="选填"
          maxlength="200"
          type="textarea"
          rows="2"
        />
      </van-cell-group>

      <div class="submit-area">
        <van-button round block type="primary" native-type="submit" :loading="loading">
          {{ isEdit ? '保存修改' : '创建档案' }}
        </van-button>
      </div>
    </van-form>

    <!-- Date picker popup -->
    <van-popup v-model:show="showDatePicker" position="bottom" round>
      <van-date-picker
        v-model="datePickerValue"
        title="选择出生日期"
        :min-date="new Date(1900, 0, 1)"
        :max-date="new Date()"
        @confirm="onDateConfirm"
        @cancel="showDatePicker = false"
      />
    </van-popup>

    <!-- Hour picker popup -->
    <van-popup v-model:show="showHourPicker" position="bottom" round>
      <van-picker
        :columns="hourColumns"
        title="选择出生时辰"
        @confirm="onHourConfirm"
        @cancel="showHourPicker = false"
      />
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useProfileStore } from '@/stores/profile.store'
import { useAppToast, extractApiError } from '@/composables/useToast'
import type { DatePickerColumnType } from 'vant'

const router = useRouter()
const route = useRoute()
const profileStore = useProfileStore()
const { success, fail } = useAppToast()

const profileId = route.params.id as string | undefined
const isEdit = computed(() => !!profileId && route.path.includes('/edit'))

const loading = ref(false)
const showDatePicker = ref(false)
const showHourPicker = ref(false)
const datePickerValue = ref<string[]>(['1990', '1', '1'])

const HOUR_NAMES = ['子时(0点)', '丑时(2点)', '寅时(4点)', '卯时(6点)', '辰时(8点)', '巳时(10点)', '午时(12点)', '未时(14点)', '申时(16点)', '酉时(18点)', '戌时(20点)', '亥时(22点)']

const hourColumns = Array.from({ length: 24 }, (_, i) => {
  const name = HOUR_NAMES[Math.floor(i / 2)] ?? `${i}时`
  return { text: `${i}时 — ${name}`, value: i }
})

const form = reactive({
  name: '',
  gender: 'male' as 'male' | 'female',
  birthYear: 1990,
  birthMonth: 1,
  birthDay: 1,
  birthHour: 6,
  isLunarDate: false,
  notes: '',
})

const birthDateDisplay = computed(() => {
  if (!form.birthYear) return ''
  const lunarPrefix = form.isLunarDate ? '农历 ' : ''
  return `${lunarPrefix}${form.birthYear}年${form.birthMonth}月${form.birthDay}日`
})

const hourDisplay = computed(() => `${form.birthHour}时`)

function onDateConfirm({ selectedValues }: { selectedValues: string[] }) {
  form.birthYear = Number(selectedValues[0])
  form.birthMonth = Number(selectedValues[1])
  form.birthDay = Number(selectedValues[2])
  datePickerValue.value = selectedValues
  showDatePicker.value = false
}

function onHourConfirm({ selectedValues }: { selectedValues: number[] }) {
  form.birthHour = Number(selectedValues[0])
  showHourPicker.value = false
}

async function onSubmit() {
  if (!form.birthYear) {
    fail('请选择出生日期')
    return
  }
  loading.value = true
  try {
    const data = {
      name: form.name,
      gender: form.gender,
      birthYear: form.birthYear,
      birthMonth: form.birthMonth,
      birthDay: form.birthDay,
      birthHour: form.birthHour,
      isLunarDate: form.isLunarDate,
      notes: form.notes || undefined,
    }

    if (isEdit.value && profileId) {
      await profileStore.updateProfile(profileId, data)
      success('档案已更新')
    } else {
      await profileStore.createProfile(data)
      success('档案已创建')
    }
    router.back()
  } catch (err) {
    fail(extractApiError(err))
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  if (isEdit.value && profileId) {
    await profileStore.fetchProfiles()
    const p = profileStore.profiles.find((x) => x.id === profileId)
    if (p) {
      form.name = p.name
      form.gender = p.gender
      form.birthYear = p.birthYear
      form.birthMonth = p.birthMonth
      form.birthDay = p.birthDay
      form.birthHour = p.birthHour
      form.isLunarDate = p.isLunar
      form.notes = p.notes ?? ''
      datePickerValue.value = [String(p.birthYear), String(p.birthMonth), String(p.birthDay)]
    }
  }
})
</script>

<style scoped>
.add-profile-page { background: var(--color-bg); min-height: 100vh; }
.profile-form { padding-bottom: 24px; }
.submit-area { padding: 24px 16px; }
</style>
