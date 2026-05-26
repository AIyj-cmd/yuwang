<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { BarChart3, Coins, Zap } from 'lucide-vue-next';
import { useAppContext } from '../../appContext';

const { copy, profile, walletData } = useAppContext();
const router = useRouter();

const userStats = computed(() => {
  if (!profile.value) return null;
  const totalRecords = profile.value.records.length;
  const totalScore = profile.value.totalScore;
  const avgScore = totalRecords > 0 ? totalScore / totalRecords : 0;
  const wallet = walletData.value;
  return { totalRecords, totalScore, avgScore, wallet };
});

const goWallet = () => router.push('/profile/wallet');
</script>

<template>
  <nav class="pp-quick-stats">
    <div class="pp-quick-item">
      <BarChart3 :size="15" />
      <strong>{{ userStats?.totalRecords ?? 0 }}</strong>
      <span>{{ copy('记录', 'Records') }}</span>
    </div>
    <div class="pp-quick-item">
      <Zap :size="15" />
      <strong>{{ (userStats?.avgScore ?? 0).toFixed(1) }}</strong>
      <span>{{ copy('平均', 'Avg') }}</span>
    </div>
    <div class="pp-quick-item pp-quick-clickable" @click="goWallet">
      <Coins :size="15" />
      <strong>{{ userStats?.wallet?.wallet.fishScaleBalance ?? 0 }}</strong>
      <span>{{ copy('鱼鳞', 'Scale') }}</span>
    </div>
  </nav>
</template>

<style scoped>
.pp-quick-stats {
  display: flex;
  align-items: center;
  gap: 0;
}
.pp-quick-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: 3px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  margin-right: -3px;
}
.pp-quick-item svg {
  color: var(--color-text-muted);
  flex-shrink: 0;
}
.pp-quick-item strong {
  font-family: var(--font-pixel);
  font-size: 15px;
  line-height: 1;
}
.pp-quick-item span {
  font-size: 11px;
  color: var(--color-text-muted);
  font-weight: 700;
}
.pp-quick-clickable {
  cursor: pointer;
}
.pp-quick-clickable:hover {
  background: var(--color-surface-soft);
}
@media (max-width: 760px) {
  .pp-quick-stats {
    flex-wrap: wrap;
    gap: 0;
  }
  .pp-quick-item {
    margin-right: 0;
    margin-bottom: -3px;
    flex: 1;
    min-width: 120px;
  }
}
</style>
