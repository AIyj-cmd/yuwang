<script setup lang="ts">
import { computed, ref } from 'vue';
import { BadgeCheck } from 'lucide-vue-next';
import { useAppContext } from '../../appContext';
import type { Badge } from '../../types';

const { allProfileBadges, copy, translatedBadge, unlockedBadges } = useAppContext();

const badgeFilter = ref<'all' | 'unlocked'>('unlocked');

const filteredBadges = computed(() => {
  const badges: Badge[] = allProfileBadges.value ?? [];
  return badgeFilter.value === 'unlocked'
    ? badges.filter((badge: Badge) => badge.unlocked)
    : badges;
});
</script>

<template>
  <section class="pp-section">
    <div class="pp-section-head">
      <BadgeCheck :size="15" />
      <h2>{{ copy('徽章', 'Badges') }}</h2>
      <small class="pp-section-count">{{ unlockedBadges.length }} / {{ allProfileBadges.length }}</small>
    </div>
    <div class="pp-badge-filter">
      <button :class="{ active: badgeFilter === 'unlocked' }" @click="badgeFilter = 'unlocked'">
        {{ copy('已解锁', 'Unlocked') }}
      </button>
      <button :class="{ active: badgeFilter === 'all' }" @click="badgeFilter = 'all'">
        {{ copy('全部', 'All') }}
      </button>
    </div>
    <div class="pp-badge-list">
      <div
        v-for="badge in filteredBadges"
        :key="badge.key"
        class="pp-badge-row"
        :class="{ unlocked: badge.unlocked }"
      >
        <BadgeCheck :size="14" />
        <div class="pp-badge-text">
          <strong>{{ translatedBadge(badge).label }}</strong>
          <span>{{ translatedBadge(badge).description }}</span>
        </div>
      </div>
    </div>
    <div v-if="filteredBadges.length === 0" class="pp-placeholder">
      {{ copy('暂无徽章', 'No badges yet.') }}
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
.pp-section-count {
  font-size: 11px;
  color: var(--color-ink-strong-text);
  opacity: 0.85;
  font-weight: 800;
}
.pp-badge-filter {
  display: flex;
  gap: 8px;
}
.pp-badge-filter button {
  padding: 5px 12px;
  border: 2px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}
.pp-badge-filter button.active {
  background: var(--color-primary);
  color: var(--color-primary-text);
}
.pp-badge-list {
  display: grid;
  gap: 0;
  border: 3px solid var(--color-border);
}
.pp-badge-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--color-surface);
  color: var(--color-text-muted);
  opacity: 0.5;
  border-bottom: 2px solid var(--color-border-soft);
}
.pp-badge-row:last-child {
  border-bottom: none;
}
.pp-badge-row.unlocked {
  opacity: 1;
  background: var(--color-accent);
  color: var(--color-text);
}
.pp-badge-row svg {
  flex-shrink: 0;
}
.pp-badge-text {
  display: grid;
  gap: 2px;
  min-width: 0;
}
.pp-badge-text strong {
  font-size: 13px;
  font-weight: 950;
}
.pp-badge-text span {
  font-size: 11px;
  line-height: 1.4;
  opacity: 0.8;
}
.pp-placeholder {
  padding: 24px;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 13px;
  font-weight: 700;
  border: 3px solid var(--color-border-soft);
  background: var(--color-surface-soft);
}
</style>
