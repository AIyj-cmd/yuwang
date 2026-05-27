<script setup lang="ts">
/**
 * Community V2 · MyStatsCard
 * 数据源: overview.myStats(visitor=null,登录用户=自己当周/累计)
 * 未登录:展示登录提示空态,不伪造数据。
 */
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import type { CommunityMyStats } from '../../types';
import { useAppContext } from '../../appContext';
import SideDataCard from './SideDataCard.vue';

const props = defineProps<{
  myStats: CommunityMyStats | null;
  /** overview 接口加载完毕(用来区分"还没拉"和"已经返回 null") */
  loaded: boolean;
}>();

const router = useRouter();
const { copy } = useAppContext();

const heroScore = computed(() => {
  const raw = props.myStats?.weeklyAverageScore;
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return '—';
  return Math.min(10, Math.max(0, raw)).toFixed(1);
});

const cumulative = computed(() => {
  const raw = props.myStats?.cumulativeScore;
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return '—';
  return raw.toFixed(1);
});

const fishScales = computed(() => props.myStats?.fishScales ?? '—');
const weeklyRecords = computed(() => props.myStats?.weeklyRecordCount ?? '—');
const rank = computed(() => {
  const r = props.myStats?.globalRank;
  if (r === null || r === undefined) return '—';
  return `#${r}`;
});

const goLogin = () => {
  void router.push('/profile');
};
</script>

<template>
  <SideDataCard
    icon="fish"
    :title="copy('我的摸鱼数据', 'My fish data')"
    :subtitle="copy('本周累计 · 来自审核通过记录', 'Weekly · approved records only')"
  >
    <!-- 未拉到 overview -->
    <div v-if="!loaded" class="loading-line">{{ copy('加载中…', 'Loading…') }}</div>

    <!-- 未登录:overview 返回 myStats=null -->
    <div v-else-if="myStats === null" class="visitor-cta">
      <p>{{ copy('登录后查看你的摸鱼指数与累计鱼力。', 'Sign in to see your stats.') }}</p>
      <button type="button" class="cta-btn" @click="goLogin">
        {{ copy('登录 / 注册', 'Sign in') }}
      </button>
    </div>

    <!-- 登录态:真实数据 -->
    <template v-else>
      <div class="fish-index">
        <span class="hero-num">{{ heroScore }}</span>
        <span class="unit">{{ copy('/ 10 · 本周平均', '/ 10 · Weekly avg') }}</span>
      </div>
      <div class="row"><span class="k">{{ copy('本周记录', 'Weekly records') }}</span><span class="v num">{{ weeklyRecords }}</span></div>
      <div class="row"><span class="k">{{ copy('累计鱼力', 'Cumulative') }}</span><span class="v num">{{ cumulative }}</span></div>
      <div class="row"><span class="k">{{ copy('鱼鳞钱包', 'Fish scales') }}</span><span class="v num">{{ fishScales }}</span></div>
      <div class="row"><span class="k">{{ copy('全榜名次', 'Global rank') }}</span><span class="v num">{{ rank }}</span></div>
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
.visitor-cta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) 0;
  text-align: center;
}
.visitor-cta p {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: var(--leading-normal);
}
.cta-btn {
  width: 100%;
  height: 36px;
  background: var(--color-primary);
  border: 1.5px solid var(--v2-border-emphasis);
  border-radius: var(--radius-md);
  box-shadow: var(--v2-shadow-flat-sm);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
  cursor: pointer;
}
.cta-btn:hover {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 var(--v2-shadow-color);
}
.fish-index {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  margin: var(--space-1) 0 var(--space-3);
}
.hero-num {
  font-family: var(--font-mono);
  font-size: var(--text-display);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
  line-height: 1.1;
}
.unit {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}
.row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 7px 0;
  border-top: 1px dashed var(--v2-divider);
  font-size: var(--text-sm);
}
.row:first-of-type {
  border-top: none;
}
.k {
  color: var(--color-text-secondary);
}
.v {
  font-family: var(--font-mono);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
}
</style>
