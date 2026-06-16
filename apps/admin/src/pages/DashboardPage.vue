<template>
  <div>
    <h2 class="page-title">数据看板</h2>

    <!-- Overview cards -->
    <el-row :gutter="16" style="margin-bottom: 24px">
      <el-col :span="8" v-for="card in overviewCards" :key="card.title">
        <el-card shadow="never" v-loading="overviewLoading">
          <div class="stat-card">
            <div class="stat-label">{{ card.title }}</div>
            <div class="stat-value">{{ card.total }}</div>
            <div class="stat-sub">最近 30 天：{{ card.last30d }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Usage stats -->
    <el-card style="margin-bottom: 24px">
      <template #header>
        <div class="card-header">
          <span>接口调用统计</span>
          <div>
            <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" size="small" @change="loadUsage" />
            <el-input v-model="usageAppId" placeholder="App ID 筛选" size="small" clearable style="width: 180px; margin-left: 8px" @change="loadUsage" />
          </div>
        </div>
      </template>
      <el-table :data="usageStats" v-loading="usageLoading" border size="small">
        <el-table-column label="App ID" prop="_id.appId" width="200" />
        <el-table-column label="接口路径" prop="_id.path" />
        <el-table-column label="总调用" prop="total" width="90" />
        <el-table-column label="成功" prop="success" width="80" />
        <el-table-column label="成功率" width="90">
          <template #default="{ row }">{{ row.total ? Math.round(row.success / row.total * 100) : 0 }}%</template>
        </el-table-column>
        <el-table-column label="平均耗时 (ms)" width="120">
          <template #default="{ row }">{{ Math.round(row.avgLatencyMs) }}</template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- Call logs -->
    <el-card>
      <template #header>
        <div class="card-header">
          <span>调用日志</span>
          <div>
            <el-input v-model="logAppId" placeholder="App ID 筛选" size="small" clearable style="width: 180px" @change="loadLogs" />
            <el-select v-model="logStatus" placeholder="状态码" size="small" clearable style="width: 110px; margin-left: 8px" @change="loadLogs">
              <el-option label="2xx" value="200" />
              <el-option label="4xx" value="400" />
              <el-option label="5xx" value="500" />
            </el-select>
          </div>
        </div>
      </template>
      <el-table :data="logs" v-loading="logsLoading" border size="small">
        <el-table-column label="App ID" prop="appId" width="200" />
        <el-table-column label="路径" prop="path" />
        <el-table-column label="方法" prop="method" width="70" />
        <el-table-column label="状态码" prop="statusCode" width="80" />
        <el-table-column label="耗时 (ms)" prop="latencyMs" width="100" />
        <el-table-column label="时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
      </el-table>
      <el-pagination class="pagination" v-model:current-page="logsPage" :page-size="50" :total="logsTotal" @current-change="loadLogs" layout="total, prev, pager, next" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { dashboardApi, type LogEntry, type UsageStat, type Overview } from '@/api/dashboard'

const overviewLoading = ref(false)
const overview = ref<Overview | null>(null)
const overviewCards = computed(() => [
  { title: 'API 总调用', total: overview.value?.apiCalls.total ?? '-', last30d: overview.value?.apiCalls.last30d ?? '-' },
  { title: '抽卡记录', total: overview.value?.cardDraws.total ?? '-', last30d: overview.value?.cardDraws.last30d ?? '-' },
  { title: '每日愈见', total: overview.value?.dailyInsights.total ?? '-', last30d: overview.value?.dailyInsights.last30d ?? '-' },
])

const usageLoading = ref(false)
const usageStats = ref<UsageStat[]>([])
const dateRange = ref<[Date, Date] | null>(null)
const usageAppId = ref('')

const logsLoading = ref(false)
const logs = ref<LogEntry[]>([])
const logsPage = ref(1)
const logsTotal = ref(0)
const logAppId = ref('')
const logStatus = ref('')

onMounted(() => {
  loadOverview()
  loadUsage()
  loadLogs()
})

async function loadOverview() {
  overviewLoading.value = true
  try { overview.value = await dashboardApi.overview() }
  finally { overviewLoading.value = false }
}

async function loadUsage() {
  usageLoading.value = true
  try {
    const params: Record<string, unknown> = {}
    if (usageAppId.value) params.appId = usageAppId.value
    if (dateRange.value) {
      params.from = dateRange.value[0].toISOString()
      params.to = dateRange.value[1].toISOString()
    }
    usageStats.value = await dashboardApi.usage(params)
  } finally {
    usageLoading.value = false
  }
}

async function loadLogs() {
  logsLoading.value = true
  try {
    const params: Record<string, unknown> = { page: logsPage.value, limit: 50 }
    if (logAppId.value) params.appId = logAppId.value
    if (logStatus.value) params.statusCode = parseInt(logStatus.value)
    const res = await dashboardApi.logs(params)
    logs.value = res.logs
    logsTotal.value = res.meta.total
  } finally {
    logsLoading.value = false
  }
}

function formatDate(d: string) { return new Date(d).toLocaleString('zh-CN', { hour12: false }) }
</script>

<style scoped>
.page-title { margin-bottom: 20px; }
.stat-card { text-align: center; }
.stat-label { font-size: 13px; color: #888; margin-bottom: 8px; }
.stat-value { font-size: 32px; font-weight: 700; color: #333; }
.stat-sub { font-size: 12px; color: #aaa; margin-top: 4px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.pagination { margin-top: 12px; justify-content: flex-end; }
</style>
