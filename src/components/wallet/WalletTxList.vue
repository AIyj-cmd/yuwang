<script setup lang="ts">
import { computed } from 'vue';
import { ArrowDownLeft, ArrowUpRight, Coins, History, Zap } from 'lucide-vue-next';
import { PxCard, PxTag } from '@mmt817/pixel-ui';
import { useAppContext } from '../../appContext';

const { copy, currentUser, locale, walletData, walletTransactions } = useAppContext();

const transactions = computed(() => walletTransactions.value?.transactions ?? walletData.value?.recentTransactions ?? []);
const totalCount = computed(() => walletTransactions.value?.total ?? transactions.value.length);

const formatDate = (dateString: string) => {
  const d = new Date(dateString);
  if (locale.value === 'en-US') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const txTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    reward: locale.value === 'en-US' ? 'Reward' : '奖励',
    spend: locale.value === 'en-US' ? 'Spend' : '消费',
    earn: locale.value === 'en-US' ? 'Earn' : '赚取',
    bonus: locale.value === 'en-US' ? 'Bonus' : '加成',
    checkin: locale.value === 'en-US' ? 'Check-in' : '签到',
    challenge: locale.value === 'en-US' ? 'Challenge' : '挑战',
    nomination: locale.value === 'en-US' ? 'Nomination' : '提名',
    default: locale.value === 'en-US' ? 'Transaction' : '交易'
  };
  return map[type] || map.default;
};

const txIcon = (type: string, amount: number) => {
  if (amount > 0) return ArrowUpRight;
  if (amount < 0) return ArrowDownLeft;
  return Zap;
};
</script>

<template>
  <PxCard v-if="currentUser" class="wallet-tx-card">
    <template #header>
      <div class="panel-title between">
        <span><History :size="18" /> {{ copy('最近流水', 'Recent Transactions') }}</span>
        <small v-if="walletData">{{ totalCount }} {{ copy('条', 'items') }}</small>
      </div>
    </template>

    <div v-if="!walletData" class="wallet-loading-state compact">
      <span v-for="n in 3" :key="`txsk-${n}`" class="wallet-skeleton" />
    </div>

    <div v-else-if="transactions.length" class="wallet-tx-list">
      <article
        v-for="tx in transactions"
        :key="tx.id"
        class="wallet-tx-item"
        :class="{ income: tx.amount > 0, expense: tx.amount < 0 }"
      >
        <div class="tx-badge">
          <component :is="txIcon(tx.type, tx.amount)" :size="16" />
        </div>
        <div class="tx-info">
          <div class="tx-main">
            <strong>{{ tx.reason || txTypeLabel(tx.type) }}</strong>
            <PxTag
              size="small"
              :type="tx.amount > 0 ? 'success' : tx.amount < 0 ? 'danger' : 'info'"
              effect="light"
              class="tx-type-tag"
            >
              {{ txTypeLabel(tx.type) }}
            </PxTag>
          </div>
          <small class="tx-meta">
            {{ formatDate(tx.createdAt) }} · {{ copy('余额', 'Bal') }} {{ tx.balanceAfter }}
          </small>
        </div>
        <div class="tx-amount">
          <strong :class="tx.amount >= 0 ? 'scale-plus' : 'scale-minus'">
            {{ tx.amount > 0 ? '+' : '' }}{{ tx.amount }}
          </strong>
        </div>
      </article>
    </div>

    <div v-else class="wallet-empty-list">
      <Coins :size="32" />
      <span>{{ copy('还没有鱼鳞流水，先提交一条匿名记录。', 'No Fish Scale transactions yet. Submit an anonymous record first.') }}</span>
    </div>
  </PxCard>
</template>

<style scoped>
.wallet-tx-card {
  --px-card-header-padding: 12px 14px;
  --px-card-body-padding: 12px 14px;
}
.wallet-loading-state {
  display: grid;
  gap: 10px;
  padding: 8px 0;
}
.wallet-loading-state.compact {
  padding: 4px 0;
}
.wallet-skeleton {
  display: block;
  height: 52px;
  border: 2px solid var(--color-border-soft);
  background: linear-gradient(90deg, var(--color-surface-soft) 25%, var(--color-disabled) 50%, var(--color-surface-soft) 75%);
  background-size: 200% 100%;
  animation: wallet-skeleton-shimmer 1.2s infinite;
}
@keyframes wallet-skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.wallet-tx-list {
  display: grid;
  gap: 8px;
}
.wallet-tx-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 2px solid var(--color-border-soft);
  background: var(--color-surface-soft);
  transition: border-color 0.12s ease, background 0.12s ease;
}
.wallet-tx-item:hover {
  border-color: var(--color-border);
  background: var(--color-surface);
}
.wallet-tx-item.income {
  border-left: 4px solid var(--color-success-text);
}
.wallet-tx-item.expense {
  border-left: 4px solid var(--color-danger-text);
}
.tx-badge {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 2px solid var(--color-border);
  background: var(--color-surface);
  flex-shrink: 0;
}
.income .tx-badge {
  background: var(--color-accent);
  color: var(--color-success-text);
}
.expense .tx-badge {
  background: var(--color-danger);
  color: var(--color-danger-text);
}
.tx-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.tx-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.tx-main strong {
  font-size: 14px;
  font-weight: 900;
  color: var(--color-text);
  word-break: break-word;
}
.tx-type-tag {
  font-weight: 800;
}
.tx-meta {
  font-size: 11px;
  font-weight: 800;
  color: var(--color-text-muted);
}
.tx-amount {
  flex-shrink: 0;
  text-align: right;
}
.tx-amount strong {
  font-size: 16px;
  font-weight: 950;
}
.wallet-empty-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 32px 20px;
  text-align: center;
  color: var(--color-text-muted);
  border: 2px dashed var(--color-border-soft);
  background: var(--color-surface-soft);
}
.wallet-empty-list span {
  font-size: 13px;
  font-weight: 700;
  max-width: 320px;
}

@media (max-width: 720px) {
  .wallet-tx-item {
    grid-template-columns: auto 1fr;
    grid-template-rows: auto auto;
    gap: 8px 10px;
  }
  .tx-amount {
    grid-column: 2;
    grid-row: 2;
    text-align: left;
  }
  .tx-badge {
    grid-row: 1 / 3;
    align-self: center;
  }
}
</style>
