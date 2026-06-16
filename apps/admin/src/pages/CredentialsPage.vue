<template>
  <div>
    <div class="page-header">
      <h2 class="page-title">凭据管理</h2>
      <el-button type="primary" icon="Plus" @click="showCreate = true">生成凭据</el-button>
    </div>

    <el-card>
      <el-table :data="credentials" v-loading="loading" border stripe>
        <el-table-column label="App ID" prop="appId" width="200" />
        <el-table-column label="备注" prop="remark" />
        <el-table-column label="租户 ID" prop="tenantId" width="180" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
              {{ row.status === 'active' ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="限流 (req/min)" prop="rateLimit" width="130" />
        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openEdit(row)">编辑</el-button>
            <el-button size="small" type="warning" @click="rotate(row.appId)">轮换密钥</el-button>
            <el-button
              size="small"
              :type="row.status === 'active' ? 'danger' : 'success'"
              @click="toggleStatus(row)"
            >
              {{ row.status === 'active' ? '禁用' : '启用' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        class="pagination"
        v-model:current-page="page"
        :page-size="20"
        :total="total"
        @current-change="load"
        layout="total, prev, pager, next"
      />
    </el-card>

    <!-- Create dialog -->
    <el-dialog v-model="showCreate" title="生成凭据" width="460px">
      <el-form :model="createForm" label-width="90px">
        <el-form-item label="租户 ID" required>
          <el-input v-model="createForm.tenantId" placeholder="输入租户 ID" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="createForm.remark" placeholder="如：测试联调方" />
        </el-form-item>
        <el-form-item label="限流 (rpm)">
          <el-input-number v-model="createForm.rateLimit" :min="1" :max="10000" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreate = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="handleCreate">生成</el-button>
      </template>
    </el-dialog>

    <!-- Secret reveal dialog (one-time) -->
    <el-dialog v-model="showSecret" title="凭据已生成（Secret 仅显示一次）" width="500px" :close-on-click-modal="false">
      <el-alert type="warning" :closable="false" style="margin-bottom: 16px">
        请立即复制 App Secret，关闭后无法再次查看。
      </el-alert>
      <el-descriptions border :column="1">
        <el-descriptions-item label="App ID">
          <el-text>{{ newCred?.appId }}</el-text>
          <el-button size="small" link @click="copy(newCred?.appId)">复制</el-button>
        </el-descriptions-item>
        <el-descriptions-item label="App Secret">
          <el-text>{{ newCred?.appSecret }}</el-text>
          <el-button size="small" link @click="copy(newCred?.appSecret)">复制</el-button>
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button type="primary" @click="showSecret = false">已复制，关闭</el-button>
      </template>
    </el-dialog>

    <!-- Edit dialog -->
    <el-dialog v-model="showEdit" title="编辑凭据" width="460px">
      <el-form :model="editForm" label-width="90px">
        <el-form-item label="备注">
          <el-input v-model="editForm.remark" />
        </el-form-item>
        <el-form-item label="限流 (rpm)">
          <el-input-number v-model="editForm.rateLimit" :min="1" :max="10000" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEdit = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleEdit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { credentialsApi, type Credential, type CreateCredentialResult } from '@/api/credentials'

const credentials = ref<Credential[]>([])
const loading = ref(false)
const page = ref(1)
const total = ref(0)

const showCreate = ref(false)
const creating = ref(false)
const createForm = reactive({ tenantId: '', remark: '', rateLimit: 60 })

const showSecret = ref(false)
const newCred = ref<CreateCredentialResult | null>(null)

const showEdit = ref(false)
const saving = ref(false)
const editForm = reactive({ appId: '', remark: '', rateLimit: 60 })

onMounted(() => load())

async function load() {
  loading.value = true
  try {
    const res = await credentialsApi.list({ page: page.value, limit: 20 })
    credentials.value = res.credentials
    total.value = res.meta.total
  } finally {
    loading.value = false
  }
}

async function handleCreate() {
  if (!createForm.tenantId.trim()) { ElMessage.warning('请输入租户 ID'); return }
  creating.value = true
  try {
    const result = await credentialsApi.create(createForm)
    newCred.value = result
    showCreate.value = false
    showSecret.value = true
    Object.assign(createForm, { tenantId: '', remark: '', rateLimit: 60 })
    await load()
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '创建失败')
  } finally {
    creating.value = false
  }
}

function openEdit(row: Credential) {
  Object.assign(editForm, { appId: row.appId, remark: row.remark ?? '', rateLimit: row.rateLimit })
  showEdit.value = true
}

async function handleEdit() {
  saving.value = true
  try {
    await credentialsApi.update(editForm.appId, { remark: editForm.remark, rateLimit: editForm.rateLimit })
    ElMessage.success('保存成功')
    showEdit.value = false
    await load()
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    saving.value = false
  }
}

async function rotate(appId: string) {
  await ElMessageBox.confirm('轮换后旧 Secret 立即失效，确认继续？', '确认轮换', { type: 'warning' })
  try {
    const res = await credentialsApi.rotateSecret(appId)
    newCred.value = { ...(credentials.value.find(c => c.appId === appId) as Credential), appSecret: res.appSecret }
    showSecret.value = true
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '轮换失败')
  }
}

async function toggleStatus(row: Credential) {
  const next = row.status === 'active' ? 'disabled' : 'active'
  try {
    await credentialsApi.setStatus(row.appId, next)
    row.status = next
    ElMessage.success(next === 'active' ? '已启用' : '已禁用')
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '操作失败')
  }
}

function copy(text?: string) {
  if (!text) return
  navigator.clipboard.writeText(text)
  ElMessage.success('已复制')
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('zh-CN', { hour12: false })
}
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-title { margin: 0; }
.pagination { margin-top: 16px; justify-content: flex-end; }
</style>
