<script setup lang="ts">
/**
 * Community V2 · TitleBadge
 * 称号徽章 — 卡片右上角视觉锚点。
 * 上下两行:称号文字 + 单条 Fish Power Score (0-10)。
 *
 * 配色按称号 fallback:
 *   - 含"传奇"   → coral
 *   - 含"老学徒/常驻/小鱼"等 → mint
 *   - 其他       → primary (默认)
 */
import { computed } from 'vue';

const props = defineProps<{
  title: string;
  /** Single-record Fish Power Score, expected [0, 10]. Backend authoritative. */
  score: number | null | undefined;
}>();

const variant = computed<'coral' | 'mint' | 'primary'>(() => {
  const t = props.title ?? '';
  if (t.includes('传奇')) return 'coral';
  if (t.includes('老学徒') || t.includes('常驻') || t.includes('小鱼')) return 'mint';
  return 'primary';
});

const displayScore = computed(() => {
  const raw = props.score;
  if (raw === null || raw === undefined || !Number.isFinite(raw)) return '—';
  // Clamp display to [0, 10] for safety; backend already clamps.
  const clamped = Math.min(10, Math.max(0, raw));
  return clamped.toFixed(1);
});
</script>

<template>
  <div class="title-badge" :data-variant="variant">
    <span class="title-text">{{ title }}</span>
    <span class="title-score">{{ displayScore }}</span>
  </div>
</template>

<style scoped>
.title-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  min-width: 80px;
  padding: 7px 8px;
  /*
   * v1.2 软化:小面积像素徽章保留轻微强调感,
   * 但边框从黑色 strong 改为柔和暖米灰,避免大批量出现在卡片右上时拉垮整体。
   */
  border: 1.5px solid var(--v2-border-emphasis);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
  box-shadow: var(--v2-shadow-flat-sm);
  text-align: center;
}
.title-badge[data-variant='primary'] {
  background: var(--color-primary);
}
/* primary / mint / coral 变体落在亮色主色或固定浅彩 pill 上,文字需用恒深的
 * primary-text(各主题恒定);默认变体(themed surface-soft 底)文字仍跟随主题。 */
.title-badge[data-variant='primary'] .title-text,
.title-badge[data-variant='primary'] .title-score,
.title-badge[data-variant='mint'] .title-text,
.title-badge[data-variant='mint'] .title-score,
.title-badge[data-variant='coral'] .title-text,
.title-badge[data-variant='coral'] .title-score {
  color: var(--color-primary-text);
}
.title-badge[data-variant='mint'] {
  background: var(--color-accent-mint);
}
.title-badge[data-variant='coral'] {
  background: var(--color-accent-coral);
}
.title-text {
  font-size: var(--text-xs);
  font-weight: var(--weight-bold);
  line-height: var(--leading-tight);
  color: var(--color-text-primary);
}
.title-score {
  font-family: var(--font-mono);
  font-size: var(--text-md);
  font-weight: var(--weight-bold);
  line-height: 1;
  color: var(--color-text-primary);
}

@media (max-width: 720px) {
  .title-badge {
    min-width: 72px;
    padding: var(--space-1) var(--space-2);
  }
}
</style>
