<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { fetchAdminDashboard } from '../services/adminApi';
import type { AdminDashboardResponse } from '../types/admin';

const data = ref<AdminDashboardResponse | null>(null);
const error = ref('');

const load = async () => {
  error.value = '';
  try {
    data.value = await fetchAdminDashboard();
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
        <h1>数据概览</h1>
        <p>站点内容、审核队列、举报和近期管理动作。</p>
      </div>
      <button type="button" class="admin-button" @click="load">刷新</button>
    </div>

    <p v-if="error" class="admin-error">{{ error }}</p>

    <div v-if="data" class="admin-stat-grid">
      <article class="admin-stat-card"><span>今日新增记录</span><strong>{{ data.summary.todayRecords }}</strong></article>
      <article class="admin-stat-card"><span>今日新增评论</span><strong>{{ data.summary.todayComments }}</strong></article>
      <article class="admin-stat-card urgent"><span>待审核记录</span><strong>{{ data.summary.pendingRecords }}</strong></article>
      <article class="admin-stat-card urgent"><span>待处理举报</span><strong>{{ data.summary.pendingReports }}</strong></article>
      <article class="admin-stat-card"><span>已隐藏内容</span><strong>{{ data.summary.hiddenContent }}</strong></article>
      <article class="admin-stat-card"><span>总记录数</span><strong>{{ data.summary.totalRecords }}</strong></article>
      <article class="admin-stat-card"><span>总用户数</span><strong>{{ data.summary.totalUsers }}</strong></article>
      <article class="admin-stat-card"><span>总互动数</span><strong>{{ data.summary.totalInteractions }}</strong></article>
    </div>

    <div v-if="data" class="admin-grid two">
      <article class="admin-panel">
        <header>
          <h2>最新待审核记录</h2>
          <RouterLink to="/admin/records">查看全部</RouterLink>
        </header>
        <div v-if="!data.latestPendingRecords.length" class="admin-empty">暂无待审核记录。</div>
        <RouterLink v-for="record in data.latestPendingRecords" :key="record.id" class="admin-list-row" :to="`/admin/records/${record.id}`">
          <span>#{{ record.id }} · {{ record.nickname }}</span>
          <strong>{{ record.score.toFixed(1) }}</strong>
        </RouterLink>
      </article>

      <article class="admin-panel">
        <header>
          <h2>最新举报</h2>
          <RouterLink to="/admin/reports">处理举报</RouterLink>
        </header>
        <div v-if="!data.latestReports.length" class="admin-empty">暂无举报。</div>
        <div v-for="report in data.latestReports" :key="report.id" class="admin-list-row">
          <span>{{ report.targetType }} #{{ report.targetId }} · {{ report.reason }}</span>
          <strong>{{ report.status }}</strong>
        </div>
      </article>

      <article class="admin-panel wide">
        <header>
          <h2>最近管理员操作</h2>
          <RouterLink to="/admin/audit-logs">查看日志</RouterLink>
        </header>
        <div v-if="!data.recentAuditLogs.length" class="admin-empty">暂无操作日志。</div>
        <div v-for="log in data.recentAuditLogs" :key="log.id" class="admin-list-row">
          <span>{{ log.action }} · {{ log.targetType }} #{{ log.targetId }}</span>
          <small>{{ log.adminUsername }} · {{ log.createdAt }}</small>
        </div>
      </article>
    </div>
  </section>
</template>
