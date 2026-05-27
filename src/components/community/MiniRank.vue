<script setup lang="ts">
/**
 * Community V2 · MiniRank
 * 数据源: overview.todayTop(已脱敏,无真实 username)
 * 空数据 → 空态降级。
 */
import { useRouter } from 'vue-router';
import type { CommunityTodayTopRow } from '../../types';
import { useAppContext } from '../../appContext';
import SideDataCard from './SideDataCard.vue';
import EmptyState from './EmptyState.vue';

defineProps<{
  todayTop: CommunityTodayTopRow[];
}>();

const router = useRouter();
const { copy } = useAppContext();

const goLeaderboard = () => {
  void router.push('/leaderboard');
};
</script>

<template>
  <SideDataCard
    icon="trophy"
    :title="copy('今日排行榜', 'Today top')"
    :subtitle="copy('前 5 名 · 点击查看全榜', 'Top 5 · open full board')"
  >
    <ol v-if="todayTop.length" class="mini-rank">
      <li v-for="row in todayTop" :key="row.id" @click="goLeaderboard">
        <span class="rank-no num">{{ row.rank }}</span>
        <span class="nm">{{ row.nickname }}</span>
        <span class="sc num">{{ row.score.toFixed(1) }}</span>
      </li>
    </ol>
    <EmptyState
      v-else
      icon="trophy"
      size="sm"
      :title="copy('今天还没人上榜', 'Nobody on board today')"
      :description="copy('第一条记录就是今天的鱼王', 'First post becomes today\'s king')"
    />
  </SideDataCard>
</template>

<style scoped>
.mini-rank {
  list-style: none;
  display: grid;
  gap: var(--space-2);
  padding: 0;
  margin: 0;
}
.mini-rank li {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-3);
  padding: 7px var(--space-3);
  background: var(--color-bg-base);
  border: 1px solid var(--v2-border-card);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast);
}
.mini-rank li:hover {
  background: var(--color-primary-soft);
}
.rank-no {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-align: center;
}
.mini-rank li:nth-child(1) .rank-no {
  color: var(--color-text-primary);
  background: var(--color-primary);
  border-radius: var(--radius-sm);
}
.mini-rank li:nth-child(2) .rank-no {
  color: var(--color-text-primary);
  background: var(--color-accent-mint);
  border-radius: var(--radius-sm);
}
.mini-rank li:nth-child(3) .rank-no {
  color: var(--color-text-primary);
  background: var(--color-accent-coral);
  border-radius: var(--radius-sm);
}
.nm {
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sc {
  font-size: var(--text-sm);
  color: var(--color-text-primary);
}
</style>
