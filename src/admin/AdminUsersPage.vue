<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { fetchAdminUsers, updateAdminUserStatus } from '../services/adminApi';
import type { AdminUserRow } from '../types/admin';

const users = ref<AdminUserRow[]>([]);
const total = ref(0);
const error = ref('');
const filters = reactive({ keyword: '', page: 1, page_size: 20 });

const load = async () => {
  error.value = '';
  try {
    const result = await fetchAdminUsers(filters);
    users.value = result.users;
    total.value = result.total;
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败';
  }
};

const setStatus = async (user: AdminUserRow, status: 'active' | 'muted' | 'banned') => {
  const banReason = status === 'banned' ? window.prompt('封禁原因（不要记录真实身份信息）', user.banReason || '违规内容处理') || '' : '';
  if (status === 'banned' && !window.confirm(`确认封禁 ${user.displayName}？`)) return;
  await updateAdminUserStatus(user.id, {
    status,
    banReason,
    muteUntil: status === 'muted' ? new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString() : ''
  });
  await load();
};

onMounted(load);
</script>

<template>
  <section class="admin-page">
    <div class="admin-page-header">
      <div>
        <h1>用户 / 昵称管理</h1>
        <p>轻量管理账号状态，不收集真实公司、部门、客户或地理位置。</p>
      </div>
      <button class="admin-button" @click="load">刷新</button>
    </div>

    <form class="admin-filter-bar" @submit.prevent="filters.page = 1; load()">
      <input v-model="filters.keyword" placeholder="搜索用户名 / 昵称" />
      <button class="admin-button primary">筛选</button>
    </form>

    <p v-if="error" class="admin-error">{{ error }}</p>

    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr><th>ID</th><th>用户名</th><th>昵称</th><th>状态</th><th>提交数</th><th>总分</th><th>举报数</th><th>操作</th></tr>
        </thead>
        <tbody>
          <tr v-if="!users.length"><td colspan="8">暂无用户。</td></tr>
          <tr v-for="user in users" :key="user.id">
            <td>#{{ user.id }}</td>
            <td>@{{ user.username }}</td>
            <td>{{ user.displayName }} <span v-if="user.isAdmin" class="admin-chip">前台 admin</span></td>
            <td><span class="admin-status" :data-status="user.status">{{ user.status }}</span></td>
            <td>{{ user.recordCount }}</td>
            <td>{{ user.totalScore.toFixed(1) }}</td>
            <td>{{ user.reportCount }}</td>
            <td>
              <div class="admin-row-actions">
                <button class="admin-button small" @click="setStatus(user, 'active')">解除</button>
                <button class="admin-button small" @click="setStatus(user, 'muted')">禁言</button>
                <button class="admin-button small danger" @click="setStatus(user, 'banned')">封禁</button>
              </div>
            </td>
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
