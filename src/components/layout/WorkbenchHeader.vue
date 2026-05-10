<script setup lang="ts">
/**
 * WorkbenchHeader
 * -----------------------------------------------------------------
 * Standard page top banner: pixel icon + title + one-line copy,
 * plus an optional right-aligned status summary (today / total /
 * top score / fish scale balance, ...).
 *
 * Consumers pass stats via the `stats` prop as an array of
 * { label, value, accent? } objects. Additional status nodes
 * can be injected via the `actions` slot.
 */
import type { Component } from 'vue';

export interface WorkbenchStat {
  label: string;
  value: string | number;
  accent?: 'primary' | 'mint' | 'danger' | 'muted';
}

defineProps<{
  icon?: Component;
  title: string;
  subtitle?: string;
  stats?: WorkbenchStat[];
}>();
</script>

<template>
  <header class="workbench-header">
    <div class="workbench-header__intro">
      <div v-if="icon" class="workbench-header__mark">
        <component :is="icon" :size="22" />
      </div>
      <div class="workbench-header__text">
        <h1 class="workbench-header__title">{{ title }}</h1>
        <p v-if="subtitle" class="workbench-header__subtitle">{{ subtitle }}</p>
      </div>
    </div>
    <div v-if="(stats && stats.length) || $slots.actions" class="workbench-header__aside">
      <div v-if="stats && stats.length" class="workbench-header__stats">
        <div v-for="(stat, index) in stats" :key="`${stat.label}-${index}`" class="workbench-header__stat" :data-accent="stat.accent ?? 'primary'">
          <span>{{ stat.label }}</span>
          <strong>{{ stat.value }}</strong>
        </div>
      </div>
      <div v-if="$slots.actions" class="workbench-header__actions">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>

<style scoped>
.workbench-header {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  border: 3px solid #18202a;
  background: linear-gradient(135deg, #ffe66d 0%, #ffd84a 60%, #ffc331 100%);
  box-shadow: 6px 6px 0 #18202a;
}

.workbench-header__intro {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.workbench-header__mark {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  flex: 0 0 auto;
  border: 3px solid #18202a;
  background: #18202a;
  color: #ffe66d;
  box-shadow: 3px 3px 0 #ffffff;
}

.workbench-header__text {
  min-width: 0;
}

.workbench-header__title {
  margin: 0;
  font-size: clamp(18px, 2vw, 22px);
  font-weight: 950;
  letter-spacing: 0;
  line-height: 1.15;
  color: #18202a;
}

.workbench-header__subtitle {
  margin: 4px 0 0;
  color: #2f3b4a;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.5;
}

.workbench-header__aside {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.workbench-header__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.workbench-header__stat {
  display: grid;
  gap: 2px;
  min-width: 108px;
  padding: 8px 12px;
  border: 2px solid #18202a;
  background: #fffefc;
  box-shadow: 3px 3px 0 #18202a;
}

.workbench-header__stat span {
  color: #536172;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0;
  text-transform: uppercase;
}

.workbench-header__stat strong {
  font-size: 20px;
  font-weight: 950;
  line-height: 1.1;
  color: #18202a;
}

.workbench-header__stat[data-accent='mint'] {
  background: #d8fff4;
}

.workbench-header__stat[data-accent='danger'] {
  background: #ffe4e6;
}

.workbench-header__stat[data-accent='muted'] {
  background: #f7fafc;
}

.workbench-header__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

@media (max-width: 720px) {
  .workbench-header {
    padding: 14px;
  }

  .workbench-header__stat {
    min-width: 96px;
    padding: 7px 10px;
  }

  .workbench-header__stat strong {
    font-size: 17px;
  }
}
</style>
