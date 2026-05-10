<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { fetchAdminSettings, saveAdminSettings } from '../services/adminApi';
import type { AdminSettings } from '../types/admin';

const settings = reactive<AdminSettings>({
  communityOpen: true,
  commentsOpen: true,
  groupCreationOpen: true,
  legendNominationOpen: true,
  commentMaxLength: 120,
  descriptionMaxLength: 180,
  defaultRecordStatus: 'published',
  safetyNotice: ''
});
const error = ref('');
const saved = ref(false);

const load = async () => {
  error.value = '';
  saved.value = false;
  try {
    Object.assign(settings, (await fetchAdminSettings()).settings);
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败';
  }
};

const save = async () => {
  saved.value = false;
  Object.assign(settings, (await saveAdminSettings(settings)).settings);
  saved.value = true;
};

onMounted(load);
</script>

<template>
  <section class="admin-page">
    <div class="admin-page-header">
      <div>
        <h1>站点配置</h1>
        <p>配置社区、评论、小组创建、传奇提名和基础长度限制。</p>
      </div>
      <button class="admin-button" @click="load">刷新</button>
    </div>

    <p v-if="error" class="admin-error">{{ error }}</p>
    <p v-if="saved" class="admin-success">配置已保存。</p>

    <article class="admin-panel admin-settings-panel">
      <label><input v-model="settings.communityOpen" type="checkbox" /> 开放社区广场</label>
      <label><input v-model="settings.commentsOpen" type="checkbox" /> 开放评论</label>
      <label><input v-model="settings.groupCreationOpen" type="checkbox" /> 开放小组创建</label>
      <label><input v-model="settings.legendNominationOpen" type="checkbox" /> 开放传奇提名</label>
      <label>
        <span>评论最大长度</span>
        <input v-model.number="settings.commentMaxLength" type="number" />
      </label>
      <label>
        <span>创意描述最大长度</span>
        <input v-model.number="settings.descriptionMaxLength" type="number" />
      </label>
      <label>
        <span>默认内容状态</span>
        <select v-model="settings.defaultRecordStatus">
          <option value="published">published</option>
          <option value="pending">pending</option>
        </select>
      </label>
      <label>
        <span>安全提示文案</span>
        <textarea v-model="settings.safetyNotice" rows="6" />
      </label>
      <button class="admin-button primary" @click="save">保存配置</button>
    </article>
  </section>
</template>
