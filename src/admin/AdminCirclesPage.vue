<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { createAdminCircle, fetchAdminCircles, updateAdminCircle, updateAdminCircleStatus } from '../services/adminApi';
import type { AdminEntity } from '../types/admin';

const circles = ref<AdminEntity[]>([]);
const error = ref('');
const form = reactive({ name: '', description: '', icon: '圈' });

const load = async () => {
  error.value = '';
  try {
    circles.value = (await fetchAdminCircles()).circles;
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败';
  }
};

const create = async () => {
  error.value = '';
  try {
    await createAdminCircle(form);
    form.name = '';
    form.description = '';
    form.icon = '圈';
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : '创建失败';
  }
};

const edit = async (circle: AdminEntity) => {
  const name = window.prompt('圈子名称', circle.name);
  if (!name) return;
  const description = window.prompt('圈子描述', circle.description) ?? circle.description;
  const icon = window.prompt('圈子图标', circle.icon ?? '圈') ?? circle.icon;
  error.value = '';
  try {
    await updateAdminCircle(circle.id, { name, description, icon });
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : '更新失败';
  }
};

const setStatus = async (circle: AdminEntity, status: 'active' | 'inactive') => {
  error.value = '';
  try {
    await updateAdminCircleStatus(circle.id, status);
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
        <h1>圈子管理</h1>
        <p>管理主题圈子、记录数量和成员规模。</p>
      </div>
      <button class="admin-button" @click="load">刷新</button>
    </div>

    <form class="admin-filter-bar" @submit.prevent="create">
      <input v-model="form.name" placeholder="官方圈子名称" required />
      <input v-model="form.icon" placeholder="图标" maxlength="4" required />
      <input v-model="form.description" placeholder="描述，不写真实公司或客户" />
      <button class="admin-button primary">新建</button>
    </form>

    <p v-if="error" class="admin-error">{{ error }}</p>

    <div class="admin-card-grid">
      <article v-for="circle in circles" :key="circle.id" class="admin-entity-card">
        <b>{{ circle.icon }}</b>
        <h2>{{ circle.name }}</h2>
        <p>{{ circle.description }}</p>
        <div class="admin-list-row"><span>成员</span><strong>{{ circle.memberCount }}</strong></div>
        <div class="admin-list-row"><span>记录</span><strong>{{ circle.recordCount }}</strong></div>
        <span class="admin-status" :data-status="circle.status">{{ circle.status }}</span>
        <div class="admin-row-actions">
          <button class="admin-button small" @click="edit(circle)">编辑</button>
          <button class="admin-button small" @click="setStatus(circle, 'active')">启用</button>
          <button class="admin-button small danger" @click="setStatus(circle, 'inactive')">停用</button>
        </div>
      </article>
    </div>
  </section>
</template>
