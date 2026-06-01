<script setup lang="ts">
import { Award, TrendingDown, TrendingUp } from 'lucide-vue-next';
import { useAppContext } from '../../appContext';

const { copy, walletData } = useAppContext();
</script>

<template>
  <div class="wallet-stats-grid">
    <div class="wallet-stat-card stat-earned">
      <div class="stat-card-icon">
        <TrendingUp :size="22" />
      </div>
      <div class="stat-card-body">
        <strong>{{ walletData?.wallet.fishScaleTotalEarned }}</strong>
        <span>{{ copy('累计获得', 'Total Earned') }}</span>
      </div>
    </div>

    <div class="wallet-stat-card stat-spent">
      <div class="stat-card-icon">
        <TrendingDown :size="22" />
      </div>
      <div class="stat-card-body">
        <strong>{{ walletData?.wallet.fishScaleTotalSpent }}</strong>
        <span>{{ copy('累计消费', 'Total Spent') }}</span>
      </div>
    </div>

    <div class="wallet-stat-card stat-level">
      <div class="stat-card-icon">
        <Award :size="22" />
      </div>
      <div class="stat-card-body">
        <strong>{{ walletData?.wallet.level }}</strong>
        <span>{{ copy('鱼鳞等级', 'Scale Level') }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wallet-stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}
.wallet-stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border: var(--border-normal);
  background: var(--color-surface);
  box-shadow: var(--shadow-small);
  transition: transform 0.08s steps(2, end);
}
.wallet-stat-card:hover {
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0 var(--color-border);
}
.stat-card-icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 2px solid var(--color-border);
  flex-shrink: 0;
}
.stat-earned .stat-card-icon {
  background: var(--color-accent);
  color: var(--color-text);
}
.stat-spent .stat-card-icon {
  background: var(--color-danger);
  color: var(--color-danger-text);
}
.stat-level .stat-card-icon {
  background: var(--color-primary);
  color: var(--color-primary-text);
}
.stat-card-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.stat-card-body strong {
  font-size: 20px;
  font-weight: 950;
  line-height: 1.1;
  color: var(--color-text);
}
.stat-card-body span {
  font-size: 12px;
  font-weight: 800;
  color: var(--color-text-muted);
}

@media (max-width: 720px) {
  .wallet-stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
