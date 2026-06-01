<script setup lang="ts">
import PixelIcon from '../community/PixelIcon.vue';
import { useAppContext } from '../../appContext';
import type { GuildRankingRow } from '../../types';

defineProps<{
  ranking: GuildRankingRow[];
}>();

const ctx = useAppContext();
const copy = ctx.copy as (zh: string, en: string) => string;

function rankBg(rank: number): string {
  if (rank === 1) return 'var(--color-primary)';
  if (rank === 2) return 'var(--color-accent-mint)';
  if (rank === 3) return 'var(--color-accent-coral)';
  return 'var(--color-bg-subtle)';
}

function rankColor(rank: number): string {
  if (rank <= 3) return 'var(--color-text-primary)';
  return 'var(--color-text-secondary)';
}
</script>

<template>
  <div class="gd-column-card">
    <h2 class="gd-section-title">
      <PixelIcon name="crown" :size="16" />
      {{ copy('贡献榜', 'Contribution board') }}
    </h2>

    <div v-if="ranking.length" class="gd-ranking-list">
      <div
        v-for="row in ranking"
        :key="row.userId"
        class="gd-ranking-row"
      >
        <span
          class="gd-rank-badge"
          :style="{ background: rankBg(row.rank), color: rankColor(row.rank) }"
        >{{ row.rank }}</span>
        <span class="gd-rank-name">{{ row.nickname || row.username }}</span>
        <span class="gd-rank-score">{{ row.contribution.toLocaleString() }}</span>
      </div>
    </div>

    <div v-else class="gd-empty-inline">{{ copy('还没有可展示的贡献记录', 'No contributions to show yet') }}</div>
  </div>
</template>

<style scoped>
.gd-column-card {
  background: var(--color-bg-card);
  border: var(--border-default);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-flat-sm);
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.gd-section-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-md);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
}

.gd-ranking-list {
  display: flex;
  flex-direction: column;
}

.gd-ranking-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  height: 48px;
  border-bottom: 1px solid var(--color-divider);
}
.gd-ranking-row:last-child {
  border-bottom: none;
}

.gd-rank-badge {
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xs);
  font-weight: var(--weight-bold);
  flex-shrink: 0;
}

.gd-rank-name {
  flex: 1;
  font-size: var(--text-base);
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gd-rank-score {
  font-family: var(--font-mono);
  font-size: var(--text-base);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
  flex-shrink: 0;
}

.gd-empty-inline {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-align: center;
  padding: var(--space-6) 0;
}
</style>
