<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { fetchAdminRecords, updateAdminRecordStatus } from '../services/adminApi';
import type { AdminRecord } from '../types/admin';

const records = ref<AdminRecord[]>([]);
const total = ref(0);
const loading = ref(false);
const error = ref('');
const filters = reactive({
  status: 'all',
  keyword: '',
  date_from: '',
  date_to: '',
  min_score: '',
  max_score: '',
  page: 1,
  page_size: 20
});

const load = async () => {
  loading.value = true;
  error.value = '';
  try {
    const result = await fetchAdminRecords({
      ...filters,
      min_score: filters.min_score || undefined,
      max_score: filters.max_score || undefined
    });
    records.value = result.records;
    total.value = result.total;
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败';
  } finally {
    loading.value = false;
  }
};

const act = async (record: AdminRecord, action: 'approve' | 'hide' | 'reject' | 'restore') => {
  const dangerous = action === 'hide' || action === 'reject';
  if (dangerous && !window.confirm(`确认要${action === 'hide' ? '隐藏' : '驳回'}记录 #${record.id}？`)) return;
  await updateAdminRecordStatus(record.id, {
    action,
    reviewNote: action === 'approve' || action === 'restore' ? '管理后台审核通过' : '管理后台处理',
    hiddenReason: action === 'hide' ? '管理员隐藏' : ''
  });
  await load();
};

onMounted(load);
</script>

<template>
  <section class="admin-page">
    <div class="admin-page-header">
      <div>
        <h1>摸鱼记录管理</h1>
        <p>筛选、查看详情并执行批准、隐藏、驳回和恢复。</p>
      </div>
      <button type="button" class="admin-button" @click="load">刷新</button>
    </div>

    <form class="admin-filter-bar" @submit.prevent="filters.page = 1; load()">
      <input v-model="filters.keyword" placeholder="搜索昵称 / 内容" />
      <select v-model="filters.status">
        <option value="all">全部状态</option>
        <option value="published">已发布</option>
        <option value="pending">待审核</option>
        <option value="hidden">已隐藏</option>
        <option value="rejected">已驳回</option>
      </select>
      <input v-model="filters.date_from" type="date" />
      <input v-model="filters.date_to" type="date" />
      <input v-model="filters.min_score" type="number" placeholder="最低分" />
      <input v-model="filters.max_score" type="number" placeholder="最高分" />
      <button class="admin-button primary" type="submit">筛选</button>
    </form>

    <p v-if="error" class="admin-error">{{ error }}</p>

    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>昵称</th>
            <th>摸鱼事项</th>
            <th>分数</th>
            <th>评分版本</th>
            <th>状态</th>
            <th>举报</th>
            <th>发布时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!loading && !records.length">
            <td colspan="9">暂无记录。</td>
          </tr>
          <tr v-for="record in records" :key="record.id">
            <td>#{{ record.id }}</td>
            <td>{{ record.nickname }}</td>
            <td>{{ record.activityText }}</td>
            <td>{{ record.score.toFixed(1) }}</td>
            <td>{{ record.scoreVersion }}</td>
            <td><span class="admin-status" :data-status="record.status">{{ record.status }}</span></td>
            <td>{{ record.reportCount }}</td>
            <td>{{ record.createdAt }}</td>
            <td>
              <div class="admin-row-actions">
                <RouterLink class="admin-button small" :to="`/admin/records/${record.id}`">详情</RouterLink>
                <button v-if="record.status !== 'published'" class="admin-button small" type="button" @click="act(record, 'approve')">批准</button>
                <button v-if="record.status === 'published'" class="admin-button small danger" type="button" @click="act(record, 'hide')">隐藏</button>
                <button v-if="record.status === 'pending'" class="admin-button small danger" type="button" @click="act(record, 'reject')">驳回</button>
                <button v-if="record.status === 'hidden' || record.status === 'rejected'" class="admin-button small" type="button" @click="act(record, 'restore')">恢复</button>
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
