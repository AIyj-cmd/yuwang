<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { createAdminGuild, fetchAdminGuilds, updateAdminGuild, updateAdminGuildStatus } from '../services/adminApi';
import type { AdminEntity } from '../types/admin';

const guilds = ref<AdminEntity[]>([]);
const error = ref('');
const form = reactive({ name: '', description: '', icon: '官' });

const load = async () => {
  error.value = '';
  try {
    guilds.value = (await fetchAdminGuilds()).guilds;
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败';
  }
};

const create = async () => {
  error.value = '';
  try {
    await createAdminGuild(form);
    form.name = '';
    form.description = '';
    form.icon = '官';
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : '创建失败';
  }
};

const edit = async (guild: AdminEntity) => {
  const name = window.prompt('工会名称', guild.name);
  if (!name) return;
  const description = window.prompt('工会描述', guild.description) ?? guild.description;
  const icon = window.prompt('工会图标', guild.icon ?? '官') ?? guild.icon;
  error.value = '';
  try {
    await updateAdminGuild(guild.id, { name, description, icon });
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : '更新失败';
  }
};

const setStatus = async (guild: AdminEntity, status: 'active' | 'inactive') => {
  error.value = '';
  try {
    await updateAdminGuildStatus(guild.id, status);
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
        <h1>工会管理</h1>
        <p>新建官方工会，编辑名称、描述、图标并启用或停用。</p>
      </div>
      <button class="admin-button" @click="load">刷新</button>
    </div>

    <form class="admin-filter-bar" @submit.prevent="create">
      <input v-model="form.name" placeholder="官方工会名称" required />
      <input v-model="form.icon" placeholder="图标" maxlength="4" required />
      <input v-model="form.description" placeholder="描述，不写真实公司或部门" />
      <button class="admin-button primary">新建</button>
    </form>

    <p v-if="error" class="admin-error">{{ error }}</p>

    <div class="admin-card-grid">
      <article v-for="guild in guilds" :key="guild.id" class="admin-entity-card">
        <b>{{ guild.icon }}</b>
        <h2>{{ guild.name }}</h2>
        <p>{{ guild.description }}</p>
        <div class="admin-list-row"><span>成员</span><strong>{{ guild.memberCount }}</strong></div>
        <div class="admin-list-row"><span>贡献</span><strong>{{ guild.totalContribution?.toFixed(1) }}</strong></div>
        <div class="admin-list-row"><span>等级</span><strong>{{ guild.level }}</strong></div>
        <span class="admin-status" :data-status="guild.status">{{ guild.status }}</span>
        <div class="admin-row-actions">
          <button class="admin-button small" @click="edit(guild)">编辑</button>
          <button class="admin-button small" @click="setStatus(guild, 'active')">启用</button>
          <button class="admin-button small danger" @click="setStatus(guild, 'inactive')">停用</button>
        </div>
      </article>
    </div>
  </section>
</template>
