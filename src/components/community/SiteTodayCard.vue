<script setup lang="ts">
/**
 * Community V2 · SiteTodayCard
 * 数据源: overview.siteToday
 *
 * 冷启动降级规则(STYLE_GUIDE §4):
 *   - 单项 ≥ 5:正常显示当日数据
 *   - 单项 < 5:切换到 fallback 行,展示累计 + 柔和底色
 *   - 同一行不允许同时展示"正常态"和"fallback 态"(互斥)
 */
import { computed } from 'vue';
import type { CommunitySiteToday } from '../../types';
import { useAppContext } from '../../appContext';
import SideDataCard from './SideDataCard.vue';

const props = defineProps<{
  siteToday: CommunitySiteToday | null;
}>();

const { copy } = useAppContext();
const THRESHOLD = 5;

type Row = {
  key: 'records' | 'active' | 'likes';
  label: string;
  todayValue: number;
  totalValue: number;
  totalLabel: string;
};

const rows = computed<Row[]>(() => {
  const s = props.siteToday;
  if (!s) return [];
  return [
    {
      key: 'records',
      label: copy('今日新增', 'Today posts'),
      todayValue: s.todayRecords,
      totalValue: s.totalRecords,
      totalLabel: copy('累计', 'Total')
    },
    {
      key: 'active',
      label: copy('今日活跃', 'Today active'),
      todayValue: s.todayActiveUsers,
      totalValue: s.totalUsers,
      totalLabel: copy('累计用户', 'Total users')
    },
    {
      key: 'likes',
      label: copy('今日点赞', 'Today likes'),
      todayValue: s.todayLikes,
      totalValue: s.totalLikes,
      totalLabel: copy('累计点赞', 'Total likes')
    }
  ];
});

const isFallback = (value: number) => value < THRESHOLD;
</script>

<template>
  <SideDataCard
    icon="globe"
    :title="copy('今日全站', 'Site today')"
    :subtitle="copy('实时统计 · 冷启动期展示累计', 'Live · cold-start shows cumulative')"
  >
    <div v-if="!siteToday" class="loading-line">{{ copy('加载中…', 'Loading…') }}</div>
    <template v-else>
      <template v-for="row in rows" :key="row.key">
        <!-- 正常态:今日 ≥ 5 -->
        <div v-if="!isFallback(row.todayValue)" class="row normal">
          <span class="k">{{ row.label }}</span>
          <span class="v num">{{ row.todayValue }}</span>
        </div>
        <!-- 冷启动 fallback 态:今日 < 5 -->
        <div v-else class="row fallback">
          <span class="k">
            {{ row.totalLabel }}
            <span class="hint">{{ copy('· 今日偏少', '· low today') }}</span>
          </span>
          <span class="v num">{{ row.totalValue }}</span>
        </div>
      </template>
    </template>
  </SideDataCard>
</template>

<style scoped>
.loading-line {
  padding: var(--space-3) 0;
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  text-align: center;
}
.row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: var(--text-sm);
}
.row.normal {
  padding: 7px 0;
  border-top: 1px dashed var(--v2-divider);
}
.row.normal:first-child {
  border-top: none;
}
.row.fallback {
  margin: var(--space-1) calc(-1 * var(--space-2));
  padding: 6px var(--space-2);
  background: var(--color-bg-base);
  border-radius: var(--radius-md);
}
.row.fallback + .row.fallback {
  margin-top: var(--space-1);
}
.k {
  color: var(--color-text-secondary);
}
.row.fallback .k {
  color: var(--color-text-secondary);
  font-size: var(--text-xs);
}
.hint {
  color: var(--color-text-tertiary);
}
.v {
  font-family: var(--font-mono);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
}
.row.fallback .v {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}
</style>
