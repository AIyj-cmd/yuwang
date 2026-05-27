<script setup lang="ts">
/**
 * Community V2 · FilterTabs
 * 筛选 tab — 最新 / 热门 / 高分 / 传奇 / 互相关注(featureFlag 控)。
 * STYLE_GUIDE §3.6:tab 高度 28px,count 仅 active 显示,要么全图标要么全无 → 选无图标版,保持文字朴素。
 * 互相关注:disabled + 待开放 chip,不可点击。
 */
import { computed } from 'vue';

export type CommunityFilter = 'latest' | 'hot' | 'high' | 'legendary' | 'mutual';

const props = defineProps<{
  active: CommunityFilter | string;
  count?: number;
  mutualEnabled: boolean;
}>();

const emit = defineEmits<{
  (e: 'change', filter: Exclude<CommunityFilter, 'mutual'>): void;
}>();

const tabs = computed(() => [
  { key: 'latest' as const, label: '最新' },
  { key: 'hot' as const, label: '热门' },
  { key: 'high' as const, label: '高分' },
  { key: 'legendary' as const, label: '传奇' }
]);

const onClick = (key: Exclude<CommunityFilter, 'mutual'>) => {
  if (props.active === key) return;
  emit('change', key);
};
</script>

<template>
  <div class="filter-tabs" role="tablist" aria-label="社区筛选">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      type="button"
      role="tab"
      class="filter-tab"
      :class="{ active: active === tab.key }"
      :aria-selected="active === tab.key"
      @click="onClick(tab.key)"
    >
      <span>{{ tab.label }}</span>
      <span v-if="active === tab.key && typeof count === 'number'" class="count">{{ count }}</span>
    </button>
    <!-- 互相关注 · 后端 featureFlags.mutualFollowing=false 时禁用并显示待开放 -->
    <button
      type="button"
      class="filter-tab disabled"
      :disabled="!mutualEnabled"
      :title="mutualEnabled ? '' : '待开放 · 暂未开放好友/关注'"
      aria-disabled="true"
    >
      <span>互相关注</span>
      <span class="locked">待开放</span>
    </button>
  </div>
</template>

<style scoped>
.filter-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  padding: 0 var(--space-1);
}
.filter-tab {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  height: 28px;
  padding: 0 var(--space-3);
  background: var(--color-bg-card);
  /* v1.2:tab 边框统一使用 V2 柔和 token,避免主题覆盖到纯黑 */
  border: 1.5px solid var(--v2-border-card);
  border-radius: var(--radius-md);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  color: var(--color-text-secondary);
  cursor: pointer;
}
.filter-tab:hover:not(.disabled):not(.active) {
  color: var(--color-text-primary);
  background: var(--color-primary-soft);
}
.filter-tab.active {
  background: var(--color-primary);
  /* v1.2:active 强调改为柔和暖米灰,不用 strong 黑边 */
  border-color: var(--v2-border-emphasis);
  color: var(--color-text-primary);
  box-shadow: var(--v2-shadow-flat-sm);
}
.filter-tab.disabled {
  cursor: not-allowed;
  opacity: 0.72;
}
.count {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: var(--weight-bold);
}
.locked {
  font-size: 11px;
  font-weight: var(--weight-bold);
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  background: var(--color-bg-subtle);
  color: var(--color-text-tertiary);
}
</style>
