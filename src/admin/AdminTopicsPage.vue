<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { fetchAdminTopicRecords, fetchAdminTopics, updateAdminTopic, updateAdminTopicStatus } from '../services/adminApi';
import type { AdminRecord, AdminTopic } from '../types/admin';

const topics = ref<AdminTopic[]>([]);
const selectedTopic = ref<AdminTopic | null>(null);
const selectedRecords = ref<AdminRecord[]>([]);
const total = ref(0);
const error = ref('');
const filters = reactive({
  keyword: '',
  status: 'all',
  page: 1,
  page_size: 30
});

const load = async () => {
  error.value = '';
  try {
    const response = await fetchAdminTopics(filters);
    topics.value = response.topics;
    total.value = response.total;
  } catch (err) {
    error.value = err instanceof Error ? err.message : '话题加载失败';
  }
};

const search = async () => {
  filters.page = 1;
  await load();
};

const edit = async (topic: AdminTopic) => {
  const name = window.prompt('话题名称', topic.name);
  if (!name) return;
  error.value = '';
  try {
    await updateAdminTopic(topic.id, { name });
    await load();
    if (selectedTopic.value?.id === topic.id) await showRecords(topic);
  } catch (err) {
    error.value = err instanceof Error ? err.message : '操作失败';
  }
};

const setStatus = async (topic: AdminTopic, status: 'active' | 'hidden') => {
  error.value = '';
  try {
    await updateAdminTopicStatus(topic.id, status);
    await load();
    if (selectedTopic.value?.id === topic.id) await showRecords(topic);
  } catch (err) {
    error.value = err instanceof Error ? err.message : '操作失败';
  }
};

const showRecords = async (topic: AdminTopic) => {
  error.value = '';
  try {
    const response = await fetchAdminTopicRecords(topic.id);
    selectedTopic.value = response.topic;
    selectedRecords.value = response.records;
  } catch (err) {
    error.value = err instanceof Error ? err.message : '话题记录加载失败';
  }
};

onMounted(load);
</script>

<template>
  <section class="admin-page">
    <div class="admin-page-header">
      <div>
        <h1>话题管理</h1>
        <p>查看使用次数、隐藏或恢复话题，并检查某个话题下的记录。隐藏话题不会删除记录。</p>
      </div>
      <button class="admin-button" @click="load">刷新</button>
    </div>

    <form class="admin-filter-bar" @submit.prevent="search">
      <input v-model="filters.keyword" placeholder="搜索话题名称或 slug" />
      <select v-model="filters.status">
        <option value="all">全部状态</option>
        <option value="active">active</option>
        <option value="hidden">hidden</option>
      </select>
      <button class="admin-button primary">搜索</button>
    </form>

    <p v-if="error" class="admin-error">{{ error }}</p>

    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>话题</th>
            <th>Slug</th>
            <th>使用次数</th>
            <th>状态</th>
            <th>更新时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="topic in topics" :key="topic.id">
            <td>{{ topic.id }}</td>
            <td>#{{ topic.name }}</td>
            <td>{{ topic.slug }}</td>
            <td>{{ topic.usageCount }}</td>
            <td><span class="admin-status" :data-status="topic.status">{{ topic.status }}</span></td>
            <td>{{ topic.updatedAt || topic.createdAt }}</td>
            <td>
              <div class="admin-row-actions">
                <button class="admin-button small" type="button" @click="showRecords(topic)">查看记录</button>
                <button class="admin-button small" type="button" @click="edit(topic)">编辑</button>
                <button class="admin-button small" type="button" @click="setStatus(topic, 'active')">恢复</button>
                <button class="admin-button small danger" type="button" @click="setStatus(topic, 'hidden')">隐藏</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="admin-pagination">
      <span>共 {{ total }} 个话题</span>
    </div>

    <section v-if="selectedTopic" class="admin-panel wide">
      <header>
        <div>
          <h2>#{{ selectedTopic.name }}</h2>
          <p>{{ selectedRecords.length }} 条最近记录，话题状态：{{ selectedTopic.status }}</p>
        </div>
      </header>
      <div v-if="selectedRecords.length" class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>昵称</th>
              <th>事项</th>
              <th>分数</th>
              <th>状态</th>
              <th>创建时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="record in selectedRecords" :key="record.id">
              <td>{{ record.id }}</td>
              <td>{{ record.nickname }}</td>
              <td>{{ record.activityText }}</td>
              <td>{{ record.score.toFixed(1) }}</td>
              <td><span class="admin-status" :data-status="record.status">{{ record.status }}</span></td>
              <td>{{ record.createdAt }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="admin-empty">这个话题下面还没有鱼游过。</div>
    </section>
  </section>
</template>
