<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { deleteAdminComment, fetchAdminComments, updateAdminCommentStatus } from '../services/adminApi';
import type { AdminComment } from '../types/admin';

const comments = ref<AdminComment[]>([]);
const total = ref(0);
const error = ref('');
const filters = reactive({ status: 'all', keyword: '', page: 1, page_size: 20 });

const load = async () => {
  error.value = '';
  try {
    const result = await fetchAdminComments(filters);
    comments.value = result.comments;
    total.value = result.total;
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败';
  }
};

const act = async (comment: AdminComment, action: 'approve' | 'hide' | 'reject' | 'restore') => {
  if ((action === 'hide' || action === 'reject') && !window.confirm(`确认处理评论 #${comment.id}？`)) return;
  error.value = '';
  try {
    await updateAdminCommentStatus(comment.id, { action, reviewNote: '管理后台处理' });
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : '操作失败';
  }
};

const remove = async (comment: AdminComment) => {
  if (!window.confirm(`确认删除评论 #${comment.id}？`)) return;
  error.value = '';
  try {
    await deleteAdminComment(comment.id);
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : '删除失败';
  }
};

onMounted(load);
</script>

<template>
  <section class="admin-page">
    <div class="admin-page-header">
      <div>
        <h1>评论管理</h1>
        <p>按状态和内容搜索评论，隐藏、恢复或删除违规评论。</p>
      </div>
      <button class="admin-button" @click="load">刷新</button>
    </div>

    <form class="admin-filter-bar" @submit.prevent="filters.page = 1; load()">
      <input v-model="filters.keyword" placeholder="搜索评论内容 / 昵称" />
      <select v-model="filters.status">
        <option value="all">全部状态</option>
        <option value="published">已发布</option>
        <option value="pending">待审核</option>
        <option value="hidden">已隐藏</option>
        <option value="rejected">已驳回</option>
      </select>
      <button class="admin-button primary">筛选</button>
    </form>

    <p v-if="error" class="admin-error">{{ error }}</p>

    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr><th>ID</th><th>记录</th><th>昵称</th><th>内容</th><th>状态</th><th>发布时间</th><th>操作</th></tr>
        </thead>
        <tbody>
          <tr v-if="!comments.length"><td colspan="7">暂无评论。</td></tr>
          <tr v-for="comment in comments" :key="comment.id">
            <td>#{{ comment.id }}</td>
            <td>#{{ comment.recordId }}</td>
            <td>{{ comment.nickname }}</td>
            <td>{{ comment.content }}</td>
            <td><span class="admin-status" :data-status="comment.status">{{ comment.status }}</span></td>
            <td>{{ comment.createdAt }}</td>
            <td>
              <div class="admin-row-actions">
                <button v-if="comment.status !== 'published'" class="admin-button small" @click="act(comment, 'approve')">批准</button>
                <button v-if="comment.status === 'published'" class="admin-button small danger" @click="act(comment, 'hide')">隐藏</button>
                <button v-if="comment.status === 'pending'" class="admin-button small danger" @click="act(comment, 'reject')">驳回</button>
                <button v-if="comment.status === 'hidden' || comment.status === 'rejected'" class="admin-button small" @click="act(comment, 'restore')">恢复</button>
                <button class="admin-button small danger" @click="remove(comment)">删除</button>
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
