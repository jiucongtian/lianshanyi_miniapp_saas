<template>
  <div class="billing-page">
    <div class="page-header">
      <div>
        <h2>AI 账单</h2>
        <p>逐笔记录成功生成的 AI 调用，并按调用当时的单价核算。鉴权失败与参数错误不会进入账单。</p>
      </div>
      <el-button type="primary" :loading="exporting" @click="exportPdf">导出 PDF 对账单</el-button>
    </div>

    <el-alert type="info" :closable="false" class="notice">
      历史调用日志只有次数与状态，没有当时的提供方和单价；新账单上线前的调用不会自动补收。导出时请在浏览器打印窗口选择“存储为 PDF”。
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
      <template #header>筛选与汇总</template>
      <div class="filters">
        <el-date-picker v-model="month" type="month" placeholder="选择账期" format="YYYY 年 MM 月" @change="search" />
        <el-input v-model="appId" placeholder="App ID" clearable @keyup.enter="search" />
        <el-input v-model="accountId" placeholder="账户 ID" clearable @keyup.enter="search" />
        <el-select v-model="selectedProduct" placeholder="全部接口" clearable @change="search">
          <el-option v-for="product in products" :key="product.key" :label="product.label" :value="product.key" />
        </el-select>
        <el-button @click="search">查询</el-button>
      </div>
      <div class="summary-total">本期应收：<strong>¥{{ yuan(totalFen) }}</strong></div>
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
          <template #default="{ row }">{{ row.provider ?? '—' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="95">
          <template #default="{ row }">{{ statusLabel(row.status) }}</template>
        </el-table-column>
        <el-table-column label="当时单价" width="110">
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
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { billingApi, type BillingEntry, type BillingProduct, type BillingSummary } from '@/api/billing'

const products: { key: BillingProduct; label: string }[] = [
  { key: 'card-insight', label: '智慧洞见' },
  { key: 'daily-insight', label: '每日愈见' },
  { key: 'tutor-chat', label: '助学童子' },
]
const month = ref<Date | null>(new Date())
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
const rateConfigured = reactive<Record<BillingProduct, boolean>>({ 'card-insight': false, 'daily-insight': false, 'tutor-chat': false })
const totalFen = computed(() => summary.value.reduce((sum, item) => sum + item.amountFen, 0))

function productLabel(product: BillingProduct): string { return products.find((p) => p.key === product)?.label ?? product }
function statusLabel(status: string): string {
  return ({ pending: '待核查', charged: '已计费', free: '免费', unpriced: '待定价', failed: '生成失败' } as Record<string, string>)[status] ?? status
}
function yuan(fen: number): string { return (fen / 100).toFixed(2) }
function formatDate(value: string): string {
  return new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })
}
function filters(): Record<string, unknown> {
  const params: Record<string, unknown> = {}
  if (month.value) {
    const year = month.value.getFullYear()
    const m = month.value.getMonth()
    params.from = new Date(Date.UTC(year, m, 1) - 8 * 3600_000).toISOString()
    params.to = new Date(Date.UTC(year, m + 1, 1) - 8 * 3600_000).toISOString()
  }
  if (appId.value.trim()) params.appId = appId.value.trim()
  if (accountId.value.trim()) params.accountId = accountId.value.trim()
  if (selectedProduct.value) params.product = selectedProduct.value
  return params
}
async function loadRates() {
  ratesLoading.value = true
  try {
    for (const rate of await billingApi.rates()) {
      rateDraft[rate.product] = rate.priceFen / 100
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
    const params = filters()
    const [details, stats] = await Promise.all([
      billingApi.entries({ ...params, page: page.value, limit: 50 }),
      billingApi.summary(params),
    ])
    entries.value = details.items
    total.value = details.meta.total
    summary.value = stats
  } finally { loading.value = false }
}
function search() { page.value = 1; void load() }

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char)
}

async function exportPdf() {
  const printWindow = window.open('', '_blank')
  if (!printWindow) { ElMessage.warning('请允许浏览器打开打印窗口'); return }
  exporting.value = true
  try {
    const statement = await billingApi.statement(filters())
    const statementTotal = statement.summary.reduce((sum, row) => sum + row.amountFen, 0)
    const period = month.value ? `${month.value.getFullYear()} 年 ${String(month.value.getMonth() + 1).padStart(2, '0')} 月` : '全部账期'
    const summaryRows = statement.summary.map((row) => `<tr><td>${escapeHtml(productLabel(row._id))}</td><td>${row.total}</td><td>${row.charged}</td><td>${row.unpriced}</td><td>${row.failed}</td><td>¥${yuan(row.amountFen)}</td></tr>`).join('')
    const detailRows = statement.items.map((row) => `<tr><td>${escapeHtml(formatDate(row.createdAt))}</td><td>${escapeHtml(row.appId)}</td><td>${escapeHtml(row.accountName)}</td><td>${escapeHtml(row.accountId)}</td><td>${escapeHtml(productLabel(row.product))}</td><td>${escapeHtml(statusLabel(row.status))}</td><td>${row.priceFen == null ? '—' : `¥${yuan(row.priceFen)}`}</td><td>¥${yuan(row.amountFen)}</td><td class="id">${escapeHtml(row._id)}</td></tr>`).join('')
    printWindow.document.open()
    printWindow.document.write(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>AI 调用对账单 - ${escapeHtml(period)}</title><style>
      @page{size:A4 landscape;margin:13mm}body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;color:#222;font-size:10px}
      h1{font-size:22px;margin:0 0 8px}h2{font-size:14px;margin:24px 0 8px}.meta{color:#666;margin-bottom:12px}.total{font-size:16px;font-weight:bold}
      table{border-collapse:collapse;width:100%;table-layout:fixed}th,td{border:1px solid #ddd;padding:5px 6px;overflow-wrap:anywhere;text-align:left}
      th{background:#f1f5f9}tr{break-inside:avoid}.id{font-size:8px}.note{margin-top:18px;color:#666}
      </style></head><body><h1>AI 调用对账单</h1><div class="meta">账期：${escapeHtml(period)} · App ID：${escapeHtml(appId.value || '全部')} · 账户 ID：${escapeHtml(accountId.value || '全部')} · 导出时间：${escapeHtml(formatDate(new Date().toISOString()))}（北京时间）</div>
      <div class="total">应收合计：¥${yuan(statementTotal)}　｜　逐笔记录：${statement.total}</div><h2>接口汇总</h2>
      <table><thead><tr><th>接口</th><th>记录</th><th>已计费</th><th>待定价</th><th>失败</th><th>金额</th></tr></thead><tbody>${summaryRows || '<tr><td colspan="6">暂无记录</td></tr>'}</tbody></table>
      <h2>调用明细</h2><table><thead><tr><th>时间（北京）</th><th>App ID</th><th>账户</th><th>账户 ID</th><th>接口</th><th>状态</th><th>当时单价</th><th>金额</th><th>记录 ID</th></tr></thead><tbody>${detailRows || '<tr><td colspan="9">暂无记录</td></tr>'}</tbody></table>
      <p class="note">仅成功的 Coze 调用按当时已配置单价计费；mock、失败及未定价记录金额为零。此文档为调用对账单，并非税务发票。</p></body></html>`)
    printWindow.addEventListener('load', () => { printWindow.focus(); printWindow.print() }, { once: true })
    printWindow.document.close()
  } catch (err) {
    printWindow.close()
    ElMessage.error(err instanceof Error ? err.message : '导出失败')
  } finally { exporting.value = false }
}

onMounted(() => { void loadRates(); void load() })
</script>

<style scoped>
.page-header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:16px}
.page-header h2{margin:0 0 8px}.page-header p,.hint{color:#77808c;font-size:13px;margin:0}
.notice,.section{margin-bottom:18px}.rate-list{display:flex;flex-wrap:wrap;gap:18px}.rate-item{display:flex;align-items:center;gap:10px}
.rate-name{min-width:72px;font-weight:600}.hint{margin-top:16px}.filters{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:18px}
.filters .el-input,.filters .el-select{width:190px}.summary-total{font-size:18px;margin-bottom:15px}.summary-total strong{color:#d35400}
.pagination{margin-top:14px;justify-content:flex-end}
</style>
