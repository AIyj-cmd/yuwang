<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { fetchAdminTransactions } from '../services/adminApi';
import type { AdminFishScaleTransaction } from '../types/admin';

const transactions = ref<AdminFishScaleTransaction[]>([]);
const total = ref(0);
const error = ref('');
const filters = reactive({ keyword: '', type: '', page: 1, page_size: 30 });

const load = async () => {
  error.value = '';
  try {
    const result = await fetchAdminTransactions(filters);
    transactions.value = result.transactions;
    total.value = result.total;
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
        <h1>鱼鳞流水</h1>
        <p>所有鱼鳞获得、消费和管理员调整都会写入流水；前端不能直接提交余额变化。</p>
      </div>
      <button class="admin-button" @click="load">刷新</button>
    </div>

    <form class="admin-filter-bar" @submit.prevent="filters.page = 1; load()">
      <input v-model="filters.keyword" placeholder="搜索用户 / 原因 / 关联对象" />
      <select v-model="filters.type">
        <option value="">全部类型</option>
        <option value="earn_submission">提交奖励</option>
        <option value="earn_interaction">互动奖励</option>
        <option value="spend">站内消费</option>
        <option value="admin_adjustment">管理员调整</option>
      </select>
      <button class="admin-button primary">筛选</button>
    </form>

    <p v-if="error" class="admin-error">{{ error }}</p>

    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr><th>ID</th><th>用户</th><th>变动</th><th>类型</th><th>原因</th><th>关联</th><th>余额</th><th>时间</th></tr>
        </thead>
        <tbody>
          <tr v-if="!transactions.length"><td colspan="8">暂无鱼鳞流水。</td></tr>
          <tr v-for="transaction in transactions" :key="transaction.id">
            <td>#{{ transaction.id }}</td>
            <td>@{{ transaction.username }}<br />{{ transaction.displayName }}</td>
            <td :class="transaction.amount >= 0 ? 'admin-positive' : 'admin-negative'">{{ transaction.amount > 0 ? '+' : '' }}{{ transaction.amount }}</td>
            <td>{{ transaction.type }}</td>
            <td>{{ transaction.reason }}</td>
            <td>{{ transaction.relatedType }} <span v-if="transaction.relatedId">#{{ transaction.relatedId }}</span></td>
            <td>{{ transaction.balanceAfter }}</td>
            <td>{{ transaction.createdAt }}</td>
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
