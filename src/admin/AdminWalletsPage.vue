<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { adjustAdminWallet, fetchAdminWallets } from '../services/adminApi';
import type { AdminWalletRow } from '../types/admin';

const wallets = ref<AdminWalletRow[]>([]);
const total = ref(0);
const error = ref('');
const filters = reactive({ keyword: '', page: 1, page_size: 20 });

const load = async () => {
  error.value = '';
  try {
    const result = await fetchAdminWallets(filters);
    wallets.value = result.wallets;
    total.value = result.total;
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败';
  }
};

const adjust = async (wallet: AdminWalletRow) => {
  const amountText = window.prompt('调整鱼鳞数量，可填正数或负数。手动扣除不能让余额小于 0。', '10');
  if (!amountText) return;
  const amount = Number(amountText);
  if (!Number.isInteger(amount) || amount === 0) {
    error.value = '请输入非 0 整数。';
    return;
  }
  const reason = window.prompt('调整原因，会写入鱼鳞流水和管理员操作日志。', '运营手动调整') || '';
  if (reason.trim().length < 2) {
    error.value = '请填写调整原因。';
    return;
  }
  try {
    await adjustAdminWallet(wallet.userId, { amount, reason });
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : '调整失败';
  }
};

onMounted(load);
</script>

<template>
  <section class="admin-page">
    <div class="admin-page-header">
      <div>
        <h1>鱼鳞钱包</h1>
        <p>查看用户鱼鳞余额。鱼鳞仅为站内娱乐积分，不可提现、交易、转让或兑换现金。</p>
      </div>
      <button class="admin-button" @click="load">刷新</button>
    </div>

    <form class="admin-filter-bar" @submit.prevent="filters.page = 1; load()">
      <input v-model="filters.keyword" placeholder="搜索用户名 / 昵称" />
      <button class="admin-button primary">筛选</button>
    </form>

    <p v-if="error" class="admin-error">{{ error }}</p>

    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr><th>用户</th><th>昵称</th><th>余额</th><th>累计获得</th><th>累计消费</th><th>等级</th><th>更新时间</th><th>操作</th></tr>
        </thead>
        <tbody>
          <tr v-if="!wallets.length"><td colspan="8">暂无钱包数据。</td></tr>
          <tr v-for="wallet in wallets" :key="wallet.userId">
            <td>#{{ wallet.userId }} @{{ wallet.username }}</td>
            <td>{{ wallet.displayName }}</td>
            <td>{{ wallet.balance }}</td>
            <td>{{ wallet.totalEarned }}</td>
            <td>{{ wallet.totalSpent }}</td>
            <td>{{ wallet.level }}</td>
            <td>{{ wallet.updatedAt }}</td>
            <td><button class="admin-button small" @click="adjust(wallet)">手动调整</button></td>
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
