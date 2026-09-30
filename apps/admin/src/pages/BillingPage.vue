<template>
  <div class="billing-page">
    <div class="page-header">
      <div>
        <h2>AI 账单</h2>
        <p>按时间段生成 AI 调用账单；每个账期可使用独立单价，改价重算会保留旧版本。</p>
      </div>
      <el-button type="primary" :loading="exporting" @click="exportPdf">导出 PDF 对账单</el-button>
    </div>

    <el-alert type="info" :closable="false" class="notice">
      旧洞见调用按已确认的 Coze 口径，从成功调用日志生成；鉴权或生成失败不计费。历史记录与实时账单分开标记，生成前请核对预览。导出时在浏览器打印窗口选择“存储为 PDF”。
    </el-alert>

    <el-card class="section">
      <template #header>计费单价（元 / 次）</template>
      <div class="rate-list" v-loading="ratesLoading">
        <div v-for="product in products" :key="product.key" class="rate-item">
          <span class="rate-name">{{ product.label }}</span>
          <el-tag :type="rateConfigured[product.key] ? 'success' : 'warning'" size="small">
            {{ rateConfigured[product.key] ? '已配置' : '未配置' }}
          </el-tag>
          <el-input-number v-model="rateDraft[product.key]" :min="0" :max="1000000" :precision="2" :step="0.01" controls-position="right" />
          <el-button :loading="savingRate === product.key" @click="saveRate(product.key)">保存单价</el-button>
        </div>
      </div>
      <p class="hint">单价从保存后成功完成的调用开始生效；已生成的账单保留原价。0 元表示免费，未配置的调用会标为“待定价”，不计入应收金额。</p>
    </el-card>

    <el-card class="section">
      <template #header>按时间段生成 / 重算账单</template>
      <div class="period-controls">
        <el-date-picker v-model="range" type="daterange" value-format="YYYY-MM-DD" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" :clearable="false" @change="search" />
        <span class="hint">按北京时间自然日，包含结束日期；生成范围覆盖全部 App 和账户。</span>
      </div>
      <div class="rate-list">
        <div v-for="product in products" :key="product.key" class="rate-item">
          <span class="rate-name">{{ product.label }}</span>
          <el-input-number v-model="periodPriceDraft[product.key]" :min="0" :max="1000000" :precision="2" :step="0.01" controls-position="right" />
          <span>元 / 次</span>
        </div>
      </div>
      <div class="period-actions">
        <el-button :loading="previewing" @click="previewPeriod">预览本期费用</el-button>
        <el-button type="primary" :loading="generating" :disabled="!periodPreview || periodPreview.skippedCount > 0 || periodPreview.callCount === 0" @click="generatePeriod">
          {{ currentPeriod ? '按新价格重新生成' : '生成本期账单' }}
        </el-button>
        <el-tag v-if="currentPeriod" type="success">已生成 v{{ currentPeriod.activeRevision }}</el-tag>
        <el-tag v-else type="warning">此时间段尚未生成账单</el-tag>
      </div>
      <div v-if="periodPreview" class="preview-result">
        预览：{{ periodPreview.callCount }} 笔成功调用，历史 Coze {{ periodPreview.historicalCount }} 笔，应收 ¥{{ yuan(periodPreview.amountFen) }}。
        <span v-if="periodPreview.retainedCount">其中 {{ periodPreview.retainedCount }} 笔由旧账单快照保留（原日志已过期）。</span>
        <el-alert v-if="periodPreview.skippedCount" type="error" :closable="false" :title="`${periodPreview.skippedCount} 条记录缺少 App 或账户归属，已禁止生成；请先核对数据。`" />
      </div>
      <p class="hint">同一时间段可反复预览、改价并生成新版本；与已有账期重叠的不同时间段不可重复计费。实时单价不受本期定价影响。</p>
    </el-card>

    <el-card class="section">
      <template #header>筛选与汇总</template>
      <div class="filters">
        <el-input v-model="appId" placeholder="App ID" clearable @keyup.enter="search" />
        <el-input v-model="accountId" placeholder="账户 ID" clearable @keyup.enter="search" />
        <el-select v-model="selectedProduct" placeholder="全部接口" clearable @change="search">
          <el-option v-for="product in products" :key="product.key" :label="product.label" :value="product.key" />
        </el-select>
        <el-select v-if="currentPeriod" v-model="viewRevision" placeholder="账单版本" @change="load">
          <el-option v-for="revision in currentPeriod.revisions" :key="revision.number" :label="`v${revision.number} · ${formatDate(revision.generatedAt)}`" :value="revision.number" />
        </el-select>
        <el-button @click="search">查询</el-button>
      </div>
      <div class="summary-total">{{ currentPeriod ? `账单 v${viewRevision} 应收` : '实时记录应收（尚未生成本期账单）' }}：<strong>¥{{ yuan(totalFen) }}</strong></div>
      <el-table :data="summary" v-loading="loading" border size="small" empty-text="该账期暂无计费记录">
        <el-table-column label="接口" min-width="130">
          <template #default="{ row }">{{ productLabel(row._id) }}</template>
        </el-table-column>
        <el-table-column prop="total" label="记录数" width="100" />
        <el-table-column prop="charged" label="计费成功" width="110" />
        <el-table-column prop="unpriced" label="待定价" width="100" />
        <el-table-column prop="failed" label="生成失败" width="100" />
        <el-table-column label="应收金额" width="130">
          <template #default="{ row }">¥{{ yuan(row.amountFen) }}</template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card>
      <template #header>逐笔对账记录</template>
      <el-table :data="entries" v-loading="loading" border size="small" empty-text="该账期暂无记录">
        <el-table-column label="生成时间" width="175">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column prop="appId" label="App ID" min-width="215" show-overflow-tooltip />
        <el-table-column prop="accountId" label="账户 ID" min-width="210" show-overflow-tooltip />
        <el-table-column prop="accountName" label="账户" min-width="140" show-overflow-tooltip />
        <el-table-column label="接口" width="115">
          <template #default="{ row }">{{ productLabel(row.product) }}</template>
        </el-table-column>
        <el-table-column label="提供方" width="85">
          <template #default="{ row }">{{ row.provider === 'coze' ? 'Coze' : row.provider ?? '—' }}</template>
        </el-table-column>
        <el-table-column label="来源" width="130">
          <template #default="{ row }">{{ row.source === 'historical-inferred' ? '历史 Coze（确认）' : row.source === 'live' ? '实时记录' : '实时记录' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="95">
          <template #default="{ row }">{{ statusLabel(row.status) }}</template>
        </el-table-column>
        <el-table-column :label="currentPeriod ? '本期单价' : '当时单价'" width="110">
          <template #default="{ row }">{{ row.priceFen == null ? '—' : `¥${yuan(row.priceFen)}` }}</template>
        </el-table-column>
        <el-table-column label="金额" width="105">
          <template #default="{ row }">¥{{ yuan(row.amountFen) }}</template>
        </el-table-column>
        <el-table-column prop="_id" label="记录 ID" min-width="220" show-overflow-tooltip />
      </el-table>
      <el-pagination v-model:current-page="page" class="pagination" :page-size="50" :total="total" layout="total, prev, pager, next" @current-change="load" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { billingApi, type BillingEntry, type BillingPeriod, type BillingPeriodPreview, type BillingProduct, type BillingSummary, type PeriodPrices } from '@/api/billing'

const products: { key: BillingProduct; label: string }[] = [
  { key: 'card-insight', label: '智慧洞见' },
  { key: 'daily-insight', label: '每日愈见' },
  { key: 'tutor-chat', label: '助学童子' },
]
const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' })
const range = ref<[string, string]>([`${today.slice(0, 7)}-01`, today])
const appId = ref('')
const accountId = ref('')
const selectedProduct = ref<BillingProduct | ''>('')
const page = ref(1)
const total = ref(0)
const entries = ref<BillingEntry[]>([])
const summary = ref<BillingSummary[]>([])
const loading = ref(false)
const exporting = ref(false)
const ratesLoading = ref(false)
const savingRate = ref<BillingProduct | null>(null)
const rateDraft = reactive<Record<BillingProduct, number>>({ 'card-insight': 0, 'daily-insight': 0, 'tutor-chat': 0 })
const periodPriceDraft = reactive<Record<BillingProduct, number>>({ 'card-insight': 0, 'daily-insight': 0, 'tutor-chat': 0 })
const rateConfigured = reactive<Record<BillingProduct, boolean>>({ 'card-insight': false, 'daily-insight': false, 'tutor-chat': false })
const currentPeriod = ref<BillingPeriod | null>(null)
const viewRevision = ref<number | null>(null)
const periodPreview = ref<BillingPeriodPreview | null>(null)
const previewing = ref(false)
const generating = ref(false)
const totalFen = computed(() => summary.value.reduce((sum, item) => sum + item.amountFen, 0))

function productLabel(product: BillingProduct): string { return products.find((p) => p.key === product)?.label ?? product }
function statusLabel(status: string): string {
  return ({ pending: '待核查', charged: '已计费', free: '免费', unpriced: '待定价', failed: '生成失败' } as Record<string, string>)[status] ?? status
}
function yuan(fen: number): string { return (fen / 100).toFixed(2) }
function formatDate(value: string): string {
  return new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })
}
function addOneDay(date: string): string {
  return new Date(new Date(`${date}T00:00:00Z`).getTime() + 86400_000).toISOString().slice(0, 10)
}
function periodBounds(): { from: string; to: string } {
  if (!range.value?.[0] || !range.value?.[1]) throw new Error('请先选择完整时间段')
  return {
    from: new Date(`${range.value[0]}T00:00:00+08:00`).toISOString(),
    to: new Date(`${addOneDay(range.value[1])}T00:00:00+08:00`).toISOString(),
  }
}
function detailFilters(): Record<string, unknown> {
  const params: Record<string, unknown> = {}
  if (appId.value.trim()) params.appId = appId.value.trim()
  if (accountId.value.trim()) params.accountId = accountId.value.trim()
  if (selectedProduct.value) params.product = selectedProduct.value
  return params
}
function pricesFen(): PeriodPrices {
  const result = {} as PeriodPrices
  for (const product of products) {
    const value = periodPriceDraft[product.key]
    if (!Number.isFinite(value) || value < 0) throw new Error(`${product.label}单价格式无效`)
    result[product.key] = Math.round(value * 100)
  }
  return result
}
async function loadRates() {
  ratesLoading.value = true
  try {
    for (const rate of await billingApi.rates()) {
      rateDraft[rate.product] = rate.priceFen / 100
      periodPriceDraft[rate.product] = rate.priceFen / 100
      rateConfigured[rate.product] = true
    }
  } finally { ratesLoading.value = false }
}
async function saveRate(product: BillingProduct) {
  const price = rateDraft[product]
  if (!Number.isFinite(price) || price < 0) {
    ElMessage.warning('请输入有效的非负单价')
    return
  }
  savingRate.value = product
  try {
    const priceFen = Math.round(price * 100)
    await billingApi.setRate(product, priceFen)
    rateConfigured[product] = true
    ElMessage.success(`${productLabel(product)}单价已保存，后续成功调用按新价格计费`)
  } finally { savingRate.value = null }
}
async function load() {
  loading.value = true
  try {
    const bounds = periodBounds()
    const period = await billingApi.period(bounds.from, bounds.to)
    if (period?._id !== currentPeriod.value?._id) {
      viewRevision.value = period?.activeRevision ?? null
      if (period) for (const product of products) {
        periodPriceDraft[product.key] = period.revisions.at(-1)!.pricesFen[product.key] / 100
      }
    }
    currentPeriod.value = period
    const params = detailFilters()
    const [details, stats] = period
      ? await Promise.all([
          billingApi.periodEntries(period._id, { ...params, revision: viewRevision.value, page: page.value, limit: 50 }),
          billingApi.periodSummary(period._id, { ...params, revision: viewRevision.value }),
        ])
      : await Promise.all([
          billingApi.entries({ ...bounds, ...params, page: page.value, limit: 50 }),
          billingApi.summary({ ...bounds, ...params }),
        ])
    entries.value = details.items
    total.value = details.meta.total
    summary.value = stats
  } finally { loading.value = false }
}
function search() { page.value = 1; void load() }

async function previewPeriod() {
  previewing.value = true
  try {
    const { from, to } = periodBounds()
    periodPreview.value = await billingApi.previewPeriod(from, to, pricesFen())
  } catch (error) { ElMessage.error(error instanceof Error ? error.message : '预览失败') }
  finally { previewing.value = false }
}

async function generatePeriod() {
  if (!periodPreview.value) return
  const expectedFingerprint = periodPreview.value.fingerprint
  const { from, to } = periodBounds()
  const prices = pricesFen()
  try {
    await ElMessageBox.confirm(
      `确认按所选价格生成 ${range.value[0]} 至 ${range.value[1]} 的账单吗？共 ${periodPreview.value.callCount} 笔，应收 ¥${yuan(periodPreview.value.amountFen)}。重算会新增版本并保留旧版。`,
      '确认账单金额', { type: 'warning', confirmButtonText: '确认生成' },
    )
  } catch { return }
  generating.value = true
  try {
    const period = await billingApi.generatePeriod(from, to, prices, expectedFingerprint)
    viewRevision.value = period.activeRevision
    currentPeriod.value = period
    periodPreview.value = null
    await load()
    ElMessage.success(`账单 v${period.activeRevision} 已生成`)
  } finally { generating.value = false }
}

watch(() => [range.value?.[0], range.value?.[1], ...products.map((product) => periodPriceDraft[product.key])], () => { periodPreview.value = null })

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char)
}

async function exportPdf() {
  const printWindow = window.open('', '_blank')
  if (!printWindow) { ElMessage.warning('请允许浏览器打开打印窗口'); return }
  exporting.value = true
  try {
    const bounds = periodBounds()
    const statement = currentPeriod.value
      ? await billingApi.periodStatement(currentPeriod.value._id, { ...detailFilters(), revision: viewRevision.value })
      : await billingApi.statement({ ...bounds, ...detailFilters() })
    const statementTotal = statement.summary.reduce((sum, row) => sum + row.amountFen, 0)
    const period = `${range.value[0]} 至 ${range.value[1]}${currentPeriod.value ? ` · v${viewRevision.value}` : ' · 未生成账单'}`
    const summaryRows = statement.summary.map((row) => `<tr><td>${escapeHtml(productLabel(row._id))}</td><td>${row.total}</td><td>${row.charged}</td><td>¥${yuan(row.amountFen)}</td></tr>`).join('')
    const detailRows = statement.items.map((row) => `<tr><td>${escapeHtml(formatDate(row.createdAt))}</td><td>${escapeHtml(row.appId)}</td><td>${escapeHtml(row.accountName)}</td><td>${escapeHtml(productLabel(row.product))}</td><td>${escapeHtml(statusLabel(row.status))}</td><td>¥${yuan(row.amountFen)}</td><td class="id">${escapeHtml(row._id)}</td></tr>`).join('')
    printWindow.document.open()
    printWindow.document.write(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>AI 调用对账单 - ${escapeHtml(period)}</title><style>
      @page{size:A4 landscape;margin:13mm}body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;color:#222;font-size:10px}
      h1{font-size:22px;margin:0 0 8px}h2{font-size:14px;margin:24px 0 8px}.meta{color:#666;margin-bottom:12px}.total{font-size:16px;font-weight:bold}
      table{border-collapse:collapse;width:100%;table-layout:fixed}th,td{border:1px solid #ddd;padding:5px 6px;overflow-wrap:anywhere;text-align:left}
      th{background:#f1f5f9}tr{break-inside:avoid}.id{font-size:8px}.note{margin-top:18px;color:#666}
      </style></head><body><h1>AI 调用对账单</h1><div class="meta">账期：${escapeHtml(period)} · App ID：${escapeHtml(appId.value || '全部')} · 账户 ID：${escapeHtml(accountId.value || '全部')} · 导出时间：${escapeHtml(formatDate(new Date().toISOString()))}（北京时间）</div>
      <div class="total">应收合计：¥${yuan(statementTotal)}　｜　逐笔记录：${statement.total}</div><h2>接口汇总</h2>
      <table><thead><tr><th>接口</th><th>记录</th><th>已计费</th><th>金额</th></tr></thead><tbody>${summaryRows || '<tr><td colspan="4">暂无记录</td></tr>'}</tbody></table>
      <h2>调用明细</h2><table><thead><tr><th>时间（北京）</th><th>App ID</th><th>账户</th><th>接口</th><th>状态</th><th>金额</th><th>记录 ID</th></tr></thead><tbody>${detailRows || '<tr><td colspan="7">暂无记录</td></tr>'}</tbody></table>
      <p class="note">历史 Coze 归属依据运营方确认，旧日志未逐笔记录提供方；鉴权失败、生成失败与 mock 调用不计费。此文档为调用对账单，并非税务发票。</p></body></html>`)
    printWindow.addEventListener('load', () => { printWindow.focus(); printWindow.print() }, { once: true })
    printWindow.document.close()
  } catch (err) {
    printWindow.close()
    ElMessage.error(err instanceof Error ? err.message : '导出失败')
  } finally { exporting.value = false }
}

onMounted(async () => { await loadRates(); await load() })
</script>

<style scoped>
.page-header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:16px}
.page-header h2{margin:0 0 8px}.page-header p,.hint{color:#77808c;font-size:13px;margin:0}
.notice,.section{margin-bottom:18px}.rate-list{display:flex;flex-wrap:wrap;gap:18px}.rate-item{display:flex;align-items:center;gap:10px}
.rate-name{min-width:72px;font-weight:600}.hint{margin-top:16px}.filters{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:18px}
.filters .el-input,.filters .el-select{width:190px}.summary-total{font-size:18px;margin-bottom:15px}.summary-total strong{color:#d35400}
.pagination{margin-top:14px;justify-content:flex-end}
.period-controls,.period-actions{display:flex;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px}
.period-actions{margin-top:16px}.preview-result{margin:12px 0;line-height:2}.preview-result .el-alert{margin-top:8px}
</style>
