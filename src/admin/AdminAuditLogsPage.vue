<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { fetchAdminAuditLogs } from '../services/adminApi';
import type { AdminAuditLog } from '../types/admin';

const logs = ref<AdminAuditLog[]>([]);
const total = ref(0);
const error = ref('');
const filters = reactive({ action: '', page: 1, page_size: 30 });

const load = async () => {
  error.value = '';
  try {
    const result = await fetchAdminAuditLogs(filters);
    logs.value = result.logs;
    total.value = result.total;
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败';
  }
};

onMounted(load);
</script>

<template>
  <section class="admin-page">
    <div class="admin-page-header">
      <div>
        <h1>管理员操作日志</h1>
        <p>记录登录、退出、审核、隐藏、恢复、配置和敏感词变更。</p>
      </div>
      <button class="admin-button" @click="load">刷新</button>
    </div>

    <form class="admin-filter-bar" @submit.prevent="filters.page = 1; load()">
      <input v-model="filters.action" placeholder="筛选 action" />
      <button class="admin-button primary">筛选</button>
    </form>

    <p v-if="error" class="admin-error">{{ error }}</p>

    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr><th>ID</th><th>管理员</th><th>动作</th><th>目标</th><th>IP</th><th>时间</th></tr>
        </thead>
        <tbody>
          <tr v-if="!logs.length"><td colspan="6">暂无日志。</td></tr>
          <tr v-for="log in logs" :key="log.id">
            <td>#{{ log.id }}</td>
            <td>{{ log.adminUsername }}</td>
            <td>{{ log.action }}</td>
            <td>{{ log.targetType }} #{{ log.targetId }}</td>
            <td>{{ log.ip }}</td>
            <td>{{ log.createdAt }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="admin-pagination">
      <span>共 {{ total }} 条</span>
      <button class="admin-button small" :disabled="filters.page <= 1" @click="filters.page--; load()">上一页</button>
      <span>第 {{ filters.page }} 页</span>
      <button class="admin-button small" :disabled="filters.page * filters.page_size >= total" @click="filters.page++; load()">下一页</button>
    </div>
  </section>
</template>
