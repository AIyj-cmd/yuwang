<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { fetchAdminGroups, updateAdminGroupStatus } from '../services/adminApi';
import type { AdminEntity } from '../types/admin';

const groups = ref<AdminEntity[]>([]);
const error = ref('');

const load = async () => {
  error.value = '';
  try {
    groups.value = (await fetchAdminGroups()).groups;
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败';
  }
};

const setStatus = async (group: AdminEntity, status: 'active' | 'hidden') => {
  if (status === 'hidden' && !window.confirm(`确认隐藏小组「${group.name}」？`)) return;
  error.value = '';
  try {
    await updateAdminGroupStatus(group.id, status);
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
        <h1>小组管理</h1>
        <p>查看公开和邀请码小组，隐藏违规小组，不展示或收集真实公司部门信息。</p>
      </div>
      <button class="admin-button" @click="load">刷新</button>
    </div>

    <p v-if="error" class="admin-error">{{ error }}</p>

    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr><th>ID</th><th>名称</th><th>可见性</th><th>状态</th><th>成员</th><th>创建者</th><th>创建时间</th><th>操作</th></tr>
        </thead>
        <tbody>
          <tr v-if="!groups.length"><td colspan="8">暂无小组。</td></tr>
          <tr v-for="group in groups" :key="group.id">
            <td>#{{ group.id }}</td>
            <td>{{ group.name }}</td>
            <td>{{ group.visibility }}</td>
            <td><span class="admin-status" :data-status="group.status">{{ group.status }}</span></td>
            <td>{{ group.memberCount }}</td>
            <td>{{ group.ownerNickname || group.ownerUsername }}</td>
            <td>{{ group.createdAt }}</td>
            <td>
              <div class="admin-row-actions">
                <button class="admin-button small" @click="setStatus(group, 'active')">恢复</button>
                <button class="admin-button small danger" @click="setStatus(group, 'hidden')">隐藏</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
