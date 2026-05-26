<script setup lang="ts">
import { computed } from 'vue';
import { Award } from 'lucide-vue-next';
import { TITLE_LEVELS } from '../../../shared/scoring';
import { useAppContext } from '../../appContext';

const { copy, currentProfileTitle, isCurrentLevel, profile, translatedTitle } = useAppContext();

const currentLevel = computed(() => {
  if (!profile.value) return null;
  return TITLE_LEVELS.find(level => isCurrentLevel(level)) ?? null;
});

const nextLevelInfo = computed(() => {
  if (!profile.value) return null;
  const total = profile.value.totalScore;
  return TITLE_LEVELS.find(level => level.min > total) ?? null;
});

const levelProgressPct = computed(() => {
  if (!profile.value || !currentLevel.value || !nextLevelInfo.value) return 100;
  const range = nextLevelInfo.value.min - currentLevel.value.min;
  const progress = profile.value.totalScore - currentLevel.value.min;
  return Math.min(100, Math.max(0, (progress / range) * 100));
});

const levelProgressText = computed(() => {
  if (!profile.value || !nextLevelInfo.value) return copy('已满级', 'Max Level');
  const remaining = nextLevelInfo.value.min - profile.value.totalScore;
  return copy(`距下一级还差 ${remaining.toFixed(1)} 分`, `${remaining.toFixed(1)} pts to next level`);
});
</script>

<template>
  <section class="pp-section">
    <div class="pp-section-head">
      <Award :size="15" />
      <h2>{{ copy('等级', 'Levels') }}</h2>
    </div>
    <div class="pp-level-main">
      <div class="pp-level-current">
        <strong>{{ currentProfileTitle }}</strong>
        <span v-if="nextLevelInfo">{{ levelProgressText }}</span>
        <span v-else>{{ copy('已满级', 'Max Level') }}</span>
      </div>
      <div class="pp-pixel-bar">
        <div
          v-for="n in 20"
          :key="n"
          class="pp-pixel-segment"
          :class="{ filled: n <= Math.round(levelProgressPct / 100 * 20) }"
        />
      </div>
    </div>
    <div class="pp-level-list">
      <span
        v-for="level in TITLE_LEVELS"
        :key="level.title"
        class="pp-level-tag"
        :class="{ active: isCurrentLevel(level) }"
      >
        {{ translatedTitle(level.title) }}
      </span>
    </div>
  </section>
</template>

<style scoped>
.pp-section {
  display: grid;
  gap: 14px;
}
.pp-section-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border: 3px solid var(--color-border);
  background: var(--color-ink-strong-bg);
}
.pp-section-head h2 {
  font-family: var(--font-pixel);
  font-size: 13px;
  font-weight: 900;
  margin: 0;
  color: var(--color-ink-strong-text);
  flex: 1;
  letter-spacing: 0.3px;
}
.pp-section-head svg {
  color: var(--color-ink-strong-text);
  padding: 3px;
  border: 2px solid var(--color-ink-strong-text);
  flex-shrink: 0;
}
.pp-level-main {
  display: grid;
  gap: 10px;
  padding: 16px;
  border: 3px solid var(--color-border);
  background: var(--color-surface-soft);
}
.pp-level-current {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.pp-level-current strong {
  font-family: var(--font-pixel);
  font-size: 13px;
  color: var(--color-text);
}
.pp-level-current span {
  font-size: 12px;
  color: var(--color-text-muted);
  font-weight: 700;
}
.pp-pixel-bar {
  display: flex;
  gap: 3px;
}
.pp-pixel-segment {
  flex: 1;
  height: 14px;
  border: 2px solid var(--color-border);
  background: var(--color-surface);
  transition: background 0.3s ease;
}
.pp-pixel-segment.filled {
  background: var(--color-primary);
}
.pp-level-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.pp-level-tag {
  padding: 4px 10px;
  border: 2px solid var(--color-border-soft);
  background: var(--color-surface);
  font-size: 11px;
  font-weight: 800;
  color: var(--color-text-muted);
}
.pp-level-tag.active {
  border-color: var(--color-border);
  background: var(--color-accent);
  color: var(--color-text);
}
</style>
