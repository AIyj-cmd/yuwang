<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { fetchAdminReports, updateAdminReportStatus } from '../services/adminApi';
import type { AdminReport } from '../types/admin';

const reports = ref<AdminReport[]>([]);
const total = ref(0);
const error = ref('');
const filters = reactive({ status: 'pending', target_type: 'all', keyword: '', page: 1, page_size: 20 });

const load = async () => {
  error.value = '';
  try {
    const result = await fetchAdminReports(filters);
    reports.value = result.reports;
    total.value = result.total;
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败';
  }
};

const updateStatus = async (report: AdminReport, status: 'reviewing' | 'resolved' | 'rejected', hideTarget = false) => {
  if (hideTarget && !window.confirm(`确认联动隐藏 ${report.targetType} #${report.targetId}？`)) return;
  error.value = '';
  try {
    await updateAdminReportStatus(report.id, {
      status,
      adminNote: status === 'rejected' ? '无效举报' : '已处理',
      hideTarget
    });
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : '操作失败';
  }
};

onMounted(load);
</script>

<template>
  <section class="admin-page">
    <div class="admin-page-header">
      <div>
        <h1>举报处理</h1>
        <p>查看待处理举报，并可联动隐藏对应内容。</p>
      </div>
      <button class="admin-button" @click="load">刷新</button>
    </div>

    <form class="admin-filter-bar" @submit.prevent="filters.page = 1; load()">
      <select v-model="filters.status">
        <option value="all">全部状态</option>
        <option value="pending">待处理</option>
        <option value="reviewing">处理中</option>
        <option value="resolved">已处理</option>
        <option value="rejected">无效举报</option>
      </select>
      <select v-model="filters.target_type">
        <option value="all">全部目标</option>
        <option value="record">record</option>
        <option value="comment">comment</option>
        <option value="user">user</option>
        <option value="group">group</option>
      </select>
      <input v-model="filters.keyword" placeholder="搜索原因 / 用户" />
      <button class="admin-button primary">筛选</button>
    </form>

    <p v-if="error" class="admin-error">{{ error }}</p>

    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr><th>ID</th><th>目标</th><th>举报人</th><th>原因</th><th>状态</th><th>时间</th><th>操作</th></tr>
        </thead>
        <tbody>
          <tr v-if="!reports.length"><td colspan="7">暂无举报。</td></tr>
          <tr v-for="report in reports" :key="report.id">
            <td>#{{ report.id }}</td>
            <td>{{ report.targetType }} #{{ report.targetId }}</td>
            <td>{{ report.nickname || report.username || report.userId }}</td>
            <td>{{ report.reason }}</td>
            <td><span class="admin-status" :data-status="report.status">{{ report.status }}</span></td>
            <td>{{ report.createdAt }}</td>
            <td>
              <div class="admin-row-actions">
                <button class="admin-button small" @click="updateStatus(report, 'reviewing')">处理中</button>
                <button class="admin-button small" @click="updateStatus(report, 'resolved')">已处理</button>
                <button class="admin-button small danger" @click="updateStatus(report, 'resolved', true)">处理并隐藏</button>
                <button class="admin-button small" @click="updateStatus(report, 'rejected')">无效</button>
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
