<template>
  <div>
    <div class="page-header">
      <h2 class="page-title">用户管理</h2>
      <el-input v-model="search" placeholder="搜索用户名/手机号" style="width: 220px" clearable @change="load" />
    </div>

    <el-card>
      <el-table :data="users" v-loading="loading" border stripe>
        <el-table-column label="ID" prop="_id" width="200" />
        <el-table-column label="用户名" prop="username" />
        <el-table-column label="手机号" prop="phone" />
        <el-table-column label="类型" width="130">
          <template #default="{ row }">
            <el-select v-model="row.userType" size="small" @change="(v: string) => updateType(row._id, v)">
              <el-option label="访客" value="guest" />
              <el-option label="普通" value="normal" />
              <el-option label="学生" value="student" />
              <el-option label="高级" value="premium" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="租户 ID" prop="tenantId" width="180" />
        <el-table-column label="注册时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
      </el-table>
      <el-pagination class="pagination" v-model:current-page="page" :page-size="20" :total="total" @current-change="load" layout="total, prev, pager, next" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { usersApi, type AdminUser } from '@/api/users'

const users = ref<AdminUser[]>([])
const loading = ref(false)
const page = ref(1)
const total = ref(0)
const search = ref('')

onMounted(() => load())

async function load() {
  loading.value = true
  try {
    const res = await usersApi.list({ page: page.value, limit: 20, search: search.value || undefined })
    users.value = res.users
    total.value = res.meta.total
  } finally {
    loading.value = false
  }
}

async function updateType(userId: string, userType: string) {
  try {
    await usersApi.updateType(userId, userType as AdminUser['userType'])
    ElMessage.success('用户类型已更新')
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '更新失败')
    await load()
  }
}

function formatDate(d: string) { return new Date(d).toLocaleString('zh-CN', { hour12: false }) }
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-title { margin: 0; }
.pagination { margin-top: 16px; justify-content: flex-end; }
</style>
